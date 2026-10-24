import test from "node:test";
import assert from "node:assert/strict";
import { QuestionLifecycle } from "../js/v2/question.js";
import { primaryPresets, attempt, stream } from "../js/v2/model.js";

function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function playback() {
  const readiness = deferred(),
    completion = deferred();
  return {
    ready: readiness.promise,
    completed: completion.promise,
    readyMs: 40,
    durationMs: 2600,
    activeVoices: 1,
    makeReady: () => readiness.resolve(true),
    end: (reason = "completed") => completion.resolve(reason),
    cancel() {
      readiness.resolve(false);
      completion.resolve("cancelled");
    },
    fadeOut() {
      completion.resolve("faded");
      return completion.promise;
    },
  };
}

function practice(overrides = {}) {
  const config = { ...structuredClone(primaryPresets[0].config), ...overrides };
  const record = attempt(
    config, stream(config, "question-test")(), "session", "fresh",
  );
  const plans = [], calls = [], errors = [];
  let advances = 0, saves = 0, present = true;
  const audio = {
    async ready() {},
    playSingle(...args) {
      calls.push({ kind: "question", args });
      const plan = playback();
      plans.push(plan);
      return plan;
    },
    playReference(...args) {
      calls.push({ kind: "reference", args });
      const plan = playback();
      plans.push(plan);
      return plan;
    },
    stop() {
      plans.forEach((plan) => plan.cancel());
    },
  };
  const question = new QuestionLifecycle(record, audio, {
    save: () => saves++,
    change() {},
    advance: () => advances++,
    error: (error) => errors.push(error),
    present: () => present,
  });
  return {
    question, record, plans, calls, errors, audio,
    get advances() { return advances; },
    get saves() { return saves; },
    hide() { present = false; },
  };
}

async function start(p) {
  const pending = p.question.act({ type: "start" });
  await Promise.resolve();
  p.plans.at(-1)?.makeReady();
  await pending;
}

async function reference(p, action = { type: "done" }) {
  const pending = p.question.act(action);
  await Promise.resolve();
  p.plans.at(-1).makeReady();
  await pending;
}

const settled = () => new Promise((resolve) => setImmediate(resolve));

function firstEvidence(record) {
  return [record.firstAnswer, record.firstCorrect, record.firstResponseMs,
    record.timingVersion, record.timingValidity, record.replaysBeforeFirst];
}

test("question lifecycle waits for both M1 grading and natural reference completion", async () => {
  const p = practice();
  await start(p);
  const done = p.question.act({ type: "done" });
  await Promise.resolve();
  p.plans.at(-1).makeReady();
  await done;
  await p.question.act({ type: "rate", correct: true });
  assert.equal(p.advances, 0);
  assert.equal(p.record.gradingSource, "self");
  assert.equal(p.record.firstCorrect, true);
  p.plans.at(-1).end();
  await Promise.resolve();
  assert.equal(p.advances, 1);
  await p.question.act({ type: "next" });
  assert.equal(p.advances, 1, "a departed question cannot advance twice");
});

test("M1 completion before grading still requires a wrong degree or Unknown", async () => {
  const p = practice({ context: false });
  await start(p);
  assert.equal(p.calls.length, 0, "context-off audiation is ready without audio");
  await reference(p);
  p.plans.at(-1).end();
  await settled();
  assert.equal(p.advances, 0);
  await p.question.act({ type: "incorrect" });
  assert.equal(p.question.view.choosingWrong, true);
  assert.equal(p.record.firstCorrect, null);
  await assert.rejects(p.question.act({ type: "rate", correct: false, wrong: p.record.target.degree }));
  await p.question.act({ type: "rate", correct: false, wrong: "unknown" });
  await settled();
  assert.equal(p.record.imaginedWrongDegree, "unknown");
  assert.equal(p.advances, 1);
});

test("M2 correct confirms for one second, then fades without a second reference", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const p = practice({ exercise: "m2" });
  await start(p);
  await p.question.act({ type: "answer", degree: p.record.target.degree });
  assert.equal(p.question.view.feedback, "Correct");
  t.mock.timers.tick(999);
  await settled();
  assert.equal(p.advances, 0);
  t.mock.timers.tick(1);
  await settled();
  assert.equal(p.advances, 1);
  assert.deepEqual(p.calls.map((c) => c.kind), ["question"]);
});

test("M2 retries cannot replace first evidence and only a correct retry advances", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const p = practice({ exercise: "m2" });
  await start(p);
  const wrong = p.record.target.options.find((d) => d !== p.record.target.degree);
  await p.question.act({ type: "answer", degree: wrong });
  const original = firstEvidence(p.record);
  t.mock.timers.tick(1500);
  await settled();
  assert.equal(p.advances, 0);
  assert.equal(p.question.view.resolved, false);
  await reference(p, { type: "listen" });
  assert.equal(p.record.replaysAfterFirst, 1);
  await p.question.act({ type: "answer", degree: p.record.target.degree });
  assert.deepEqual(firstEvidence(p.record), original);
  assert.equal(p.record.retryCount, 1);
  t.mock.timers.tick(1000);
  await settled();
  assert.equal(p.advances, 1);
});

test("M2 Reveal exposes the answer during its full reference and preserves first evidence", async () => {
  const p = practice({ exercise: "m2", context: false });
  await start(p);
  await p.question.act({ type: "answer", degree: p.record.target.options.find((d) => d !== p.record.target.degree) });
  const original = firstEvidence(p.record);
  await reference(p, { type: "reveal" });
  assert.equal(p.question.view.resolved, true);
  assert.equal(p.record.revealedReference, true);
  assert.equal(p.record.replaysAfterFirst, 0, "mandatory first reference is not a replay");
  assert.deepEqual(firstEvidence(p.record), original);
  assert.equal(p.advances, 0);
  p.plans.at(-1).end();
  await settled();
  assert.equal(p.advances, 1);
});

test("manual mode retains resolved questions until Next for both exercises", async () => {
  for (const exercise of ["m1", "m2"]) {
    const p = practice({ exercise, autoAdvance: false });
    await start(p);
    if (exercise === "m1") {
      await reference(p);
      await p.question.act({ type: "rate", correct: true });
    } else await p.question.act({ type: "answer", degree: p.record.target.degree });
    p.plans.at(-1).end();
    await settled();
    assert.equal(p.advances, 0);
    await p.question.act({ type: "next" });
    await p.question.act({ type: "next" });
    assert.equal(p.advances, 1);
  }
});

test("disposing a question rejects late audio availability without scheduling voices", async () => {
  const p = practice();
  const gate = deferred();
  p.audio.ready = () => gate.promise;
  const pending = p.question.act({ type: "start" });
  p.question.dispose();
  gate.resolve();
  await pending;
  assert.equal(p.calls.length, 0);
  assert.equal(p.record.timingValidity, "unavailable");
  assert.equal(p.saves, 0);
});

test("late successful reference readiness cannot alter a disposed question", async () => {
  const p = practice({ exercise: "m2" });
  await start(p);
  await p.question.act({ type: "answer", degree: p.record.target.options.find((d) => d !== p.record.target.degree) });
  const gate = deferred();
  p.audio.playReference = () => ({ ...playback(), ready: gate.promise, cancel() {} });
  const revealing = p.question.act({ type: "reveal" });
  await Promise.resolve();
  p.question.dispose();
  const before = structuredClone(p.record), saves = p.saves;
  gate.resolve(true);
  await revealing;
  assert.deepEqual(p.record, before);
  assert.equal(p.saves, saves);
  assert.equal(p.advances, 0);
});

test("departure between reference readiness and resolution cannot publish a stale result", async () => {
  const p = practice({ exercise: "m2" });
  await start(p);
  await p.question.act({ type: "answer", degree: p.record.target.options.find((d) => d !== p.record.target.degree) });
  const revealing = p.question.act({ type: "reveal" });
  await Promise.resolve();
  p.plans.at(-1).makeReady();
  await Promise.resolve();
  p.question.dispose();
  const view = p.question.view, saves = p.saves;
  await revealing;
  assert.deepEqual(p.question.view, view);
  assert.equal(p.saves, saves);
});

test("interrupted mandatory M1 reference recovers without rewriting Done or counting a replay", async () => {
  const p = practice();
  await start(p);
  p.audio.ready = async () => { throw new Error("suspended"); };
  await p.question.act({ type: "done" });
  const latency = p.record.firstResponseMs;
  assert.equal(p.question.view.busy, false);
  assert.equal(p.question.view.ready, false);
  assert.equal(p.errors.length, 1);
  p.audio.ready = async () => {};
  await reference(p, { type: "listen" });
  assert.equal(p.record.firstResponseMs, latency);
  assert.equal(p.record.replaysAfterFirst, 0);
  p.plans.at(-1).end();
  await reference(p, { type: "listen" });
  assert.equal(p.record.replaysAfterFirst, 1, "already-heard reference retry is additional listening");
  p.question.dispose();
});

test("hidden and pagehide cancellation preserve graded evidence and reject delayed progression", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  for (const reason of ["hidden", "pagehide"]) {
    const p = practice({ exercise: "m2" });
    await start(p);
    await p.question.act({ type: "answer", degree: p.record.target.degree });
    const original = firstEvidence(p.record);
    p.question.interrupt(reason);
    t.mock.timers.tick(2000);
    await settled();
    assert.equal(p.advances, 0);
    assert.deepEqual(firstEvidence(p.record), original);
    assert.equal(p.question.view.ready, false);
    await reference(p, { type: "listen" });
    p.plans.at(-1).end();
    await settled();
    assert.equal(p.advances, 1);
  }
});

test("pagehide before submission invalidates timing even after audio Retry", async () => {
  const p = practice({ exercise: "m2" });
  await start(p);
  p.question.interrupt("pagehide");
  await reference(p, { type: "listen" });
  await p.question.act({ type: "answer", degree: p.record.target.options.find((d) => d !== p.record.target.degree) });
  assert.equal(p.record.timingValidity, "interrupted");
  assert.equal(p.record.firstResponseMs, null);
  assert.equal(p.record.replaysBeforeFirst, 1);
  p.question.dispose();
});

test("leaving practice blocks a pending advance even before the browser event is delivered", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const p = practice({ exercise: "m2" });
  await start(p);
  await p.question.act({ type: "answer", degree: p.record.target.degree });
  p.hide();
  t.mock.timers.tick(1000);
  await settled();
  assert.equal(p.advances, 0);
  p.question.dispose();
});
