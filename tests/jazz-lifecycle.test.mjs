import test from "node:test";
import assert from "node:assert/strict";
import {
  defaults,
  validateConfig,
  saveSession,
  loadSessions,
} from "../js/jazz/model.js";
import {
  canonicalizeConfig,
  createSession,
  sessionQuestion,
  rememberConfig,
  flowKeys,
  missedQuestions,
} from "../js/jazz/lifecycle.js";
import { guides } from "../js/jazz/theory.js";
const store = () => {
  const data = new Map();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
  };
};
test("multi-quality landmark pools select each chord's own third or seventh", () => {
  const session = createSession(
    {
      ...defaults,
      count: 20,
      qualityPool: ["maj7", "m7", "7"],
      degreePool: ["b3", "3", "b7", "maj7"],
    },
    [],
    "wizard",
  );
  for (const question of session.questions) {
    const target = question.targets[0];
    assert.ok(
      guides(target.chord).includes(target.degree),
      `${target.chord.symbol}: ${target.degree}`,
    );
  }
  assert.throws(
    () =>
      validateConfig({ ...defaults, qualityPool: ["m7"], degreePool: ["3"] }),
    /compatible degree/,
  );
});

test("Recent deduplicates semantic snapshots while named presets remain independent", () => {
  const storage = store();
  const config = {
    ...defaults,
    rootOrder: "random",
    roots: "C D",
    qualityPool: ["maj7", "m7"],
    degreePool: ["3", "b7"],
  };
  rememberConfig(storage, config, [], "wizard");
  rememberConfig(
    storage,
    { ...config, roots: "D C", qualityPool: ["m7", "maj7"], volume: 0.1 },
    [],
    "recent",
  );
  const recent = JSON.parse(storage.getItem(flowKeys.recent));
  assert.equal(recent.length, 1);
  assert.equal(recent[0].useCount, 2);
  assert.equal(storage.getItem(flowKeys.presets), null);
  assert.notEqual(
    canonicalizeConfig(config),
    canonicalizeConfig({ ...config, degreePool: ["9"] }),
  );
});
test("question seeds survive reload, preserve actual targets and never mutate config input", () => {
  const config = {
    ...defaults,
    rootOrder: "random",
    roots: "C D Eb",
    qualityPool: ["maj7", "m7", "7"],
    degreePool: ["b3", "3", "b7", "maj7"],
  };
  const before = structuredClone(config),
    session = createSession(config, [], "wizard");
  assert.deepEqual(config, before);
  const questions = structuredClone(session.questions);
  session.questions = [];
  for (let i = 0; i < 10; i++)
    assert.deepEqual(sessionQuestion(session, i), questions[i]);
  config.degreePool.push("9");
  assert.notDeepEqual(session.config.degreePool, config.degreePool);
  const storage = store();
  saveSession(storage, session);
  assert.deepEqual(sessionQuestion(loadSessions(storage)[0], 3), questions[3]);
});
test("custom progression and missed-question snapshots do not depend on later edits", () => {
  const custom = {
    id: "custom-test",
    name: "Saved",
    chords: ["Dm7", "G7"],
    beats: [2, 4],
    targets: ["b7", "3"],
    kind: "custom",
  };
  const session = createSession(
    { ...defaults, mode: "m4", progression: custom.id },
    [custom],
    "saved",
  );
  custom.chords[0] = "Cmaj7";
  assert.equal(session.customSnapshot[0].chords[0], "Dm7");
  session.records = [
    { questionIndex: 1, grade: "missed" },
    { questionIndex: 1, grade: "correct", referenceAssisted: true },
  ];
  assert.deepEqual(missedQuestions(session), [session.questions[1]]);
});
test("empty pools and invalid timing fail before a session is created", () => {
  assert.throws(
    () => validateConfig({ ...defaults, qualityPool: [] }),
    /qualityPool/,
  );
  assert.throws(
    () => validateConfig({ ...defaults, degreePool: [] }),
    /degreePool/,
  );
  assert.throws(
    () => validateConfig({ ...defaults, progressionPool: ["deleted"] }),
    /unavailable/,
  );
  assert.throws(
    () => validateConfig({ ...defaults, prepareSeconds: NaN }),
    /countdown/,
  );
  assert.throws(
    () => validateConfig({ ...defaults, replayLimit: 2 }),
    /replay/,
  );
});
test("selected roots constrain the fifths cycle in the new multi-select flow", () => {
  const config = {
    ...defaults,
    rootOrder: "fifths",
    roots: "F C D G",
    qualityPool: ["m7"],
    degreePool: ["b3"],
  };
  const session = createSession(config, [], "wizard");
  assert.deepEqual(
    session.questions.slice(0, 5).map((q) => q.targets[0].chord.root),
    ["C", "G", "D", "F", "C"],
  );
});
