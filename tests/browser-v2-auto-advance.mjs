import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(10000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const url = `${process.env.BASE_URL || "http://127.0.0.1:4173"}/jazz-ear-lab-v2/`;
const latest = () =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("jazzEarLab:v2:sessions") || "[]").at(-1),
  );
async function seed(overrides = {}) {
  await page.goto(url);
  await page.evaluate(async (overrides) => {
    const { builtins, keys } = await import("/js/v2/model.js");
    const config = {
      ...builtins[0].config,
      roots: ["G"],
      qualities: ["7"],
      targetMode: "exact",
      targets: ["b3"],
      count: 2,
      ...overrides,
    };
    delete config.autoAdvance;
    if ("autoAdvance" in overrides) config.autoAdvance = overrides.autoAdvance;
    localStorage.setItem(
      keys.presets,
      JSON.stringify([{ ...builtins[0], config }]),
    );
    if (!localStorage.getItem(keys.sessions))
      localStorage.setItem(keys.sessions, "[]");
  }, overrides);
  await page.reload();
}
async function customize() {
  await page
    .locator('[data-preset-id="recognition-guides"]')
    .getByRole("button", { name: "Customize", exact: true })
    .click();
  await page.getByRole("button", { name: "Practice", exact: true }).click();
}
async function start() {
  await page.evaluate(async () => {
    if (window.audioInstrumented) return;
    window.audioInstrumented = true;
    const { AudioEngine } = await import("/js/jazz/audio.js");
    const play = AudioEngine.prototype.playSingle;
    window.audioTrace = [];
    window.playbacks = [];
    AudioEngine.prototype.playSingle = function (...args) {
      const previousVoices = window.playbacks.reduce(
        (n, p) => n + p.activeVoices,
        0,
      );
      const playback = Reflect.apply(play, this, args);
      const trace = { at: performance.now(), previousVoices, fades: [] };
      window.audioTrace.push(trace);
      window.playbacks.push(playback);
      playback.completed.then((end) => {
        trace.end = end;
        trace.endedAt = performance.now();
      });
      const fade = playback.fadeOut;
      playback.fadeOut = (...args) => {
        trace.fades.push({
          at: performance.now(),
          voices: playback.activeVoices,
        });
        if (window.holdFade) {
          const gate = new Promise((resolve) => {
            window.releaseFade = resolve;
          });
          return Promise.all([Reflect.apply(fade, playback, args), gate]).then(
            ([end]) => end,
          );
        }
        return Reflect.apply(fade, playback, args);
      };
      return playback;
    };
  });
  await page
    .locator('[data-preset-id="recognition-guides"]')
    .getByRole("button", { name: "Start", exact: true })
    .click();
  await ready();
}
async function ready() {
  await page.waitForFunction(() =>
    document.querySelector(".answers button:enabled"),
  );
}
async function correct() {
  const degree = (await latest()).attempts.at(-1).target.degree;
  await page.getByRole("button", { name: degree, exact: true }).click();
}
try {
  await seed();
  const history = await page.evaluate(() =>
    localStorage.getItem("jazzEarLab:v2:sessions"),
  );
  await customize();
  const autoAdvanceLabel = await page
    .getByLabel("Auto Advance", { exact: true })
    .locator("..")
    .boundingBox();
  assert.ok(autoAdvanceLabel.height >= 44, "Auto Advance label has a 44px hit area");
  assert.equal(
    await page.getByLabel("Auto Advance", { exact: true }).isChecked(),
    true,
  );
  await page.getByLabel("Auto Advance", { exact: true }).uncheck();
  await page.reload();
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  assert.equal(
    await page.getByLabel("Auto Advance", { exact: true }).isChecked(),
    false,
  );
  await page.getByLabel("Auto Advance", { exact: true }).check();
  await page.reload();
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  assert.equal(
    await page.getByLabel("Auto Advance", { exact: true }).isChecked(),
    true,
  );
  await page.getByLabel("Auto Advance", { exact: true }).uncheck();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("jazzEarLab:v2:sessions")),
    history,
  );
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Restore Default", exact: true })
    .click();
  assert.equal(
    await page.getByLabel("Auto Advance", { exact: true }).isChecked(),
    true,
  );
  await page.screenshot({
    path: `${process.env.TEMP || "."}/eartrain-ticket2-settings-desktop.png`,
  });

  await seed();
  await start();
  await correct();
  await page
    .locator("#feedback")
    .filter({ hasText: /^Correct$/ })
    .waitFor();
  const confirmationAt = await page.evaluate(() => performance.now());
  await page.screenshot({
    path: `${process.env.TEMP || "."}/eartrain-ticket2-correct-desktop.png`,
  });
  const locked = (await latest()).attempts[0];
  assert.equal(locked.firstCorrect, true);
  assert.equal(locked.replaysBeforeFirst, 0);
  await page.waitForTimeout(500);
  assert.equal((await latest()).attempts.length, 1, "Correct is not skipped");
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("jazzEarLab:v2:sessions")).at(-1).attempts
        .length === 2,
  );
  await ready();
  const trace = await page.evaluate(() => window.audioTrace);
  assert.equal(
    trace.length,
    2,
    "only the two question playbacks, no reference",
  );
  assert.equal(trace[0].end, "faded");
  assert.ok(
    trace[0].fades[0].voices > 0,
    "answer while outgoing audio is active",
  );
  assert.ok(
    trace[1].at - confirmationAt >= 850 && trace[1].at - confirmationAt < 1800,
  );
  assert.equal(
    trace[1].previousVoices,
    0,
    "fade completes before the next chord",
  );
  assert.deepEqual((await latest()).attempts[0], locked);
  assert.equal(
    await page.evaluate(
      () => document.activeElement.closest(".answers") !== null,
    ),
    true,
  );
  await correct();
  await page
    .locator("#feedback")
    .filter({ hasText: /^Correct$/ })
    .waitFor();
  await page.waitForTimeout(500);
  assert.match(page.url(), /#practice$/);
  await page.waitForURL(/#results\//);
  assert.equal(
    (await latest()).attempts.length,
    2,
    "fixed count has no extra question",
  );

  await seed({ count: 0 });
  await start();
  await page.getByRole("button", { name: /^Replay(?: context| reference)?$/ }).click();
  await ready();
  await page.getByRole("button", { name: "5", exact: true }).click();
  const wrong = (await latest()).attempts[0];
  assert.equal(wrong.firstAnswer, "5");
  assert.equal(wrong.firstCorrect, false);
  assert.equal(wrong.replaysBeforeFirst, 1);
  await page.waitForTimeout(1400);
  assert.equal(
    (await latest()).attempts.length,
    1,
    "incorrect never auto-advances",
  );
  assert.equal(await page.locator("#feedback").textContent(), "Incorrect");
  assert.doesNotMatch(
    await page.locator(".question").textContent(),
    /Answer:|b3/,
  );
  assert.equal(
    await page.getByRole("button", { name: "Next", exact: true }).count(),
    0,
  );
  await page.getByRole("button", { name: /^Replay(?: context| reference)?$/ }).click();
  await ready();
  await correct();
  const retry = (await latest()).attempts[0];
  for (const field of [
    "firstAnswer",
    "firstCorrect",
    "firstResponseMs",
    "replaysBeforeFirst",
  ])
    assert.equal(retry[field], wrong[field], field);
  assert.equal(retry.replaysAfterFirst, 1);
  assert.equal(retry.retryCount, 1);
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("jazzEarLab:v2:sessions")).at(-1).attempts
        .length === 2,
  );
  await ready();
  await correct();
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("jazzEarLab:v2:sessions")).at(-1).attempts
        .length === 3,
  );
  await ready();
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await page.waitForURL(/#results\//);
  assert.equal(
    (await latest()).attempts.length,
    2,
    "Unlimited continues until Stop, untouched question excluded",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await seed({ count: 1, autoAdvance: false });
  await start();
  await page.getByRole("button", { name: "5", exact: true }).click();
  await correct();
  const manual = (await latest()).attempts[0];
  await page.waitForTimeout(1400);
  assert.match(page.url(), /#practice$/);
  await page.getByRole("button", { name: /^Replay(?: context| reference)?$/ }).click();
  await page.waitForFunction(() =>
    [...document.querySelectorAll("button")].some(
      (b) => b.textContent === "Finish session" && !b.disabled,
    ),
  );
  assert.equal((await latest()).attempts[0].replaysAfterFirst, 1);
  assert.equal(
    (await latest()).attempts[0].firstResponseMs,
    manual.firstResponseMs,
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
    false,
  );
  await page.screenshot({
    path: `${process.env.TEMP || "."}/eartrain-ticket2-manual-mobile.png`,
  });
  await page
    .getByRole("button", { name: "Finish session", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await page.waitForURL(/#results\//);
  assert.equal((await latest()).attempts.length, 1);

  // Each new playback/manual action invalidates the outgoing confirmation.
  for (const action of ["Next", "Replay", "Stop", "navigation", "visibility"]) {
    await seed({ count: 0 });
    await start();
    await correct();
    if (action === "navigation") {
      await page.getByRole("link", { name: "Insights", exact: true }).click();
    } else if (action === "visibility") {
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", {
          configurable: true,
          value: true,
        });
        document.dispatchEvent(new Event("visibilitychange"));
        delete document.hidden;
      });
    } else {
      await page.getByRole("button", { name: action === "Replay" ? /^Replay(?: context| reference)?$/ : action, exact: true }).click();
    }
    if (action === "Next") await ready();
    const settled = await latest();
    await page.waitForTimeout(1500);
    assert.equal(
      (await latest()).attempts.length,
      settled.attempts.length,
      action,
    );
    if (["Stop", "navigation"].includes(action)) {
      assert.equal(
        await page.evaluate(() =>
          window.playbacks.every((p) => p.activeVoices === 0),
        ),
        true,
      );
      await page.goto(url);
      await start();
      const newer = await latest();
      await page.waitForTimeout(1200);
      assert.deepEqual(
        await latest(),
        newer,
        "old timer cannot mutate a new session",
      );
    }
  }

  await seed({ count: 0 });
  await start();
  await page.evaluate(() => {
    window.holdFade = true;
  });
  await correct();
  await page.waitForFunction(() => !!window.releaseFade);
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await page.waitForURL(/#results\//);
  await page.getByRole("link", { name: "Practice", exact: true }).click();
  await page.evaluate(() => {
    window.holdFade = false;
  });
  await start();
  const pendingFadeSession = await latest();
  await page.evaluate(() => window.releaseFade());
  await page.waitForTimeout(300);
  assert.deepEqual(
    await latest(),
    pendingFadeSession,
    "stale awaited fade cannot advance new session",
  );

  await seed({ count: 0 });
  await start();
  await page.evaluate(() => {
    const answer = [...document.querySelectorAll(".answers button")].find(
      (b) => b.textContent === "b3",
    );
    answer.click();
    answer.click();
  });
  assert.equal(
    (await latest()).attempts[0].retryCount,
    0,
    "double correct is not a retry",
  );
  await page.evaluate(() => {
    const next = [...document.querySelectorAll("button")].find(
      (b) => b.textContent === "Next",
    );
    next.click();
    next.click();
  });
  await ready();
  await page.waitForTimeout(1400);
  assert.equal(
    (await latest()).attempts.length,
    2,
    "double Next and cancelled timer advance only once",
  );

  await correct();
  await page.evaluate(async () => {
    const { AudioEngine } = await import("/js/jazz/audio.js");
    const play = AudioEngine.prototype.playSingle;
    AudioEngine.prototype.playSingle = function (...args) {
      AudioEngine.prototype.playSingle = play;
      throw new Error("Simulated playback failure");
    };
  });
  const faulted = (await latest()).attempts[1];
  await page.getByRole("button", { name: /^Replay(?: context| reference)?$/ }).click();
  await page
    .locator("#feedback")
    .filter({ hasText: /Audio unavailable/ })
    .waitFor();
  await page.waitForTimeout(1400);
  assert.deepEqual(
    (await latest()).attempts[1],
    faulted,
    "failed replay leaves locked evidence intact",
  );
  assert.equal(
    (await latest()).attempts.length,
    2,
    "failed restart cancels auto-next",
  );
  await page.getByRole("button", { name: "Retry audio", exact: true }).click();
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("jazzEarLab:v2:sessions")).at(-1).attempts
        .length === 3,
  );
  assert.equal(
    (await latest()).attempts[1].firstResponseMs,
    faulted.firstResponseMs,
  );
  await ready();
  assert.equal(
    (await latest()).attempts.length,
    3,
    "manual recovery remains available",
  );
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  assert.deepEqual(errors, []);
  console.log(
    "V2 Auto Advance: persistence, correct/fade, immutable retry, wrong stability, manual Finish, fixed/Unlimited, cancellation, rapid clicks, fault recovery and mobile passed",
  );
} finally {
  await browser.close();
}
