import assert from "node:assert/strict";
import { seedM1Preset } from "./m1-preset.mjs";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(10000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.addInitScript(() => {
  const Native = window.AudioContext;
  window.AudioContext = class extends Native {
    constructor(...args) {
      super(...args);
      window.testAudio = this;
    }
  };
});
const url = `${process.env.BASE_URL || "http://127.0.0.1:4173"}/jazz-ear-lab-v2/`;
const latest = () =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("jazzEarLab:v2:sessions") || "[]").at(-1),
  );
async function start(overrides = {}, failure = null) {
  await page.goto(url);
  await seedM1Preset(page, { count: 1, ...overrides });
  await page.evaluate(async (failure) => {
    const { AudioEngine } = await import("/js/jazz/audio.js");
    window.trace = [];
    window.plans = [];
    window.failAudio = failure;
    for (const method of ["playSingle", "playReference"]) {
      const original = AudioEngine.prototype[method];
      AudioEngine.prototype[method] = function (...args) {
        if (window.failAudio === method) {
          window.failAudio = null;
          throw new Error("Injected audio fault");
        }
        const item = {
          method,
          at: performance.now(),
          midi: args[1],
          context: typeof args[3] === "boolean" ? args[3] : null,
          options: args[4],
        };
        const plan = Reflect.apply(original, this, args);
        window.trace.push(item);
        window.plans.push(plan);
        plan.ready.then((ready) => {
          item.ready = ready;
          item.readyAt = performance.now();
        });
        plan.completed.then((end) => {
          item.end = end;
          item.endedAt = performance.now();
        });
        return plan;
      };
    }
  }, failure);
  await page
    .locator('[data-preset-id="recognition-guides"]')
    .getByRole("button", { name: "Start", exact: true })
    .click();
  await page.getByRole("button", { name: /^Done -/ }).waitFor();
}
async function done() {
  await page.getByRole("button", { name: /^Done -/ }).click();
}
try {
  await start();
  await page.waitForFunction(() =>
    [...document.querySelectorAll("button")].some(
      (b) => b.textContent.startsWith("Done -") && !b.disabled,
    ),
  );
  const initial = await page.evaluate(() => window.trace[0]);
  assert.ok(
    initial.readyAt - initial.at < 600,
    "Done is ready at onset, not the old 900ms boundary",
  );
  assert.equal(initial.midi, null);
  assert.equal(
    initial.options.excludeTarget,
    (await latest()).attempts[0].target.midi,
  );
  assert.equal(await page.locator(".question h2").textContent(), "G7");
  assert.equal(await page.evaluate(() => window.plans[0].activeVoices), 3);
  await done();
  await page.getByRole("button", { name: "Correct", exact: true }).waitFor();
  const live = await page.evaluate(() => window.trace);
  assert.deepEqual(
    live.map((p) => p.method),
    ["playSingle", "playReference"],
    "live reference does not restart the chord",
  );
  assert.equal(
    live[1].end,
    undefined,
    "rating is available before the reference tail ends",
  );
  const locked = (await latest()).attempts[0];
  assert.equal(locked.timingValidity, "valid");
  assert.ok(locked.firstResponseMs >= 0 && locked.firstResponseMs < 1200);
  assert.equal(locked.replaysBeforeFirst, 0);
  assert.equal(locked.replaysAfterFirst, 0);
  await page.getByRole("button", { name: "Correct", exact: true }).click();
  await page.evaluate(() => window.testAudio.suspend());
  await page.waitForTimeout(2800);
  assert.match(
    page.url(),
    /#practice$/,
    "final M1 result must wait for actual reference completion",
  );
  assert.equal(
    (await latest()).attempts[0].firstResponseMs,
    locked.firstResponseMs,
  );
  await page.evaluate(() => window.testAudio.resume());
  await page.waitForURL(/#results\//);
  assert.equal((await latest()).attempts.length, 1);
  assert.equal((await latest()).attempts[0].firstCorrect, true);

  // The same stored M1 evidence must stay intact and outside new-onset cohorts.
  const oldSession = await latest();
  oldSession.id = "old-m1-history";
  oldSession.attempts[0].timingVersion = "v2-answer-ready-1";
  oldSession.attempts[0].exposure = "previously-seen";
  await page.evaluate(
    (old) =>
      localStorage.setItem("jazzEarLab:v2:sessions", JSON.stringify([old])),
    oldSession,
  );
  await start();
  await done();
  await page.getByRole("button", { name: "Correct", exact: true }).click();
  await page.waitForURL(/#results\//);
  const currentAttempt = (await latest()).attempts[0];
  assert.equal(currentAttempt.timingVersion, "v2-m1-chord-onset-2");
  const history = await page.evaluate(async () => {
    const { cohort, keys } = await import("/js/v2/model.js");
    const sessions = JSON.parse(localStorage.getItem(keys.sessions));
    return {
      old: sessions[0],
      cohorts: sessions.map((s) => cohort(s.attempts[0])),
    };
  });
  assert.deepEqual(
    history.old,
    oldSession,
    "old timing values and policy are never rewritten",
  );
  assert.notEqual(history.cohorts[0], history.cohorts[1]);
  await page.goto(`${url}#insights`);
  assert.equal(
    await page
      .getByLabel("Comparable practice conditions")
      .locator("option")
      .count(),
    2,
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await start({ context: false, method: "sung", autoAdvance: false });
  assert.equal(
    await page.evaluate(() => window.trace.length),
    0,
    "context-off is visually ready without question audio",
  );
  await done();
  await page.getByRole("button", { name: "Correct", exact: true }).click();
  const contextOff = (await latest()).attempts[0];
  assert.equal(contextOff.responseMethod, "sung");
  assert.equal(contextOff.gradingSource, "self");
  assert.equal(contextOff.replaysAfterFirst, 0);
  const fresh = await page.evaluate(() => window.trace);
  assert.deepEqual(
    fresh.map((p) => p.method),
    ["playSingle", "playReference"],
  );
  assert.equal(
    fresh[0].context,
    true,
    "reference restores harmony with context off",
  );
  assert.equal(fresh[0].options.fullReference, true);
  await page.waitForFunction(() => window.trace.at(-1).end === "completed");
  assert.match(
    page.url(),
    /#practice$/,
    "manual M1 stays resolved after reference completion",
  );
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await page.waitForFunction(() => window.trace.at(-1).ready === true);
  assert.equal((await latest()).attempts[0].replaysAfterFirst, 1);
  assert.equal(
    (await latest()).attempts[0].firstResponseMs,
    contextOff.firstResponseMs,
  );
  await page
    .getByRole("button", { name: "Finish session", exact: true })
    .click();
  await page.waitForURL(/#results\//);

  await start({ method: "played", count: 2, autoAdvance: false });
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await page.waitForFunction(() => window.trace.at(-1).end === "completed");
  await done();
  await page.getByRole("button", { name: "Correct", exact: true }).waitFor();
  const postTail = await page.evaluate(() => window.trace);
  assert.equal(postTail.at(-1).method, "playReference");
  assert.equal(
    postTail.at(-2).options.fullReference,
    true,
    "post-tail Done starts full harmony rather than an isolated target",
  );
  assert.equal((await latest()).attempts[0].responseMethod, "played");
  assert.equal((await latest()).attempts[0].replaysBeforeFirst, 1);
  assert.equal((await latest()).attempts[0].replaysAfterFirst, 0);
  await page.getByRole("button", { name: "Stop", exact: true }).click();

  for (const failure of ["playSingle", "playReference"]) {
    await start(
      { autoAdvance: false },
      failure === "playSingle" ? failure : null,
    );
    let response;
    if (failure === "playReference") {
      await page.evaluate(() => {
        window.failAudio = "playReference";
      });
      await done();
      response = (await latest()).attempts[0].firstResponseMs;
    }
    await page
      .getByRole("status")
      .filter({ hasText: /Audio unavailable/ })
      .waitFor();
    assert.equal(
      await page.getByRole("button", { name: "Correct", exact: true }).count(),
      0,
    );
    await page
      .getByRole("button", { name: "Retry audio", exact: true })
      .click();
    if (failure === "playSingle") await done();
    await page.getByRole("button", { name: "Correct", exact: true }).click();
    const recovered = (await latest()).attempts[0];
    assert.equal(
      recovered.replaysAfterFirst,
      0,
      "retrying an unavailable mandatory reference is not a review replay",
    );
    if (failure === "playSingle") {
      assert.equal(recovered.timingValidity, "interrupted");
      assert.equal(recovered.firstResponseMs, null);
    } else {
      assert.equal(
        recovered.firstResponseMs,
        response,
        "failed reference/retry cannot remeasure Done",
      );
      assert.equal(recovered.timingValidity, "valid");
    }
    await page.getByRole("button", { name: "Stop", exact: true }).click();
  }
  assert.deepEqual(errors, []);
  console.log(
    "M1 onset, withholding, live reference, early rating, completion and evidence passed.",
  );
} finally {
  await browser.close();
}
