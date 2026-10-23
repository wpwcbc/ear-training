import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(10000);
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
    JSON.parse(localStorage.getItem("jazzEarLab:v2:sessions")).at(-1),
  );
async function start(interruption = null) {
  await page.goto(url);
  await page.evaluate(async () => {
    const { builtins, keys } = await import("/js/v2/model.js");
    localStorage.setItem(
      keys.presets,
      JSON.stringify([
        {
          ...builtins[0],
          config: {
            ...builtins[0].config,
            roots: ["G"],
            qualities: ["7"],
            targetMode: "exact",
            targets: ["b3"],
            autoAdvance: true,
            count: 0,
          },
        },
      ]),
    );
  });
  await page.reload();
  await page.evaluate(async (interruption) => {
    if (!interruption) return;
    const { AudioEngine } = await import("/js/jazz/audio.js");
    const original = AudioEngine.prototype.playSingle;
    AudioEngine.prototype.playSingle = function (...args) {
      const plan = Reflect.apply(original, this, args);
      void window.testAudio[interruption]();
      AudioEngine.prototype.playSingle = original;
      return plan;
    };
  }, interruption);
  await page
    .locator('[data-preset-id="recognition-guides"]')
    .getByRole("button", { name: "Start", exact: true })
    .click();
  if (!interruption)
    await page.waitForFunction(() =>
      document.querySelector(".answers button:enabled"),
    );
}
try {
  for (const interruption of ["suspend", "close"]) {
    await start(interruption);
    await page.getByRole("button", { name: "Retry audio", exact: true }).click();
    await page.waitForFunction(() =>
      document.querySelector(".answers button:enabled"),
    );
    assert.equal(await page.locator("#feedback").textContent(), "Your turn");
    await page.getByRole("button", { name: "b3", exact: true }).click();
    const recovered = (await latest()).attempts[0];
    assert.equal(recovered.timingValidity, "interrupted");
    assert.equal(recovered.firstResponseMs, null);
    assert.equal(
      recovered.replaysBeforeFirst,
      0,
      "never-ready playback is not a replay",
    );
    assert.equal(await page.evaluate(() => window.testAudio.state), "running");
    await page.getByRole("button", { name: "Stop", exact: true }).click();
  }

  await start();
  await page.evaluate(() => window.testAudio.suspend());
  await page
    .getByRole("status")
    .filter({ hasText: /Audio unavailable/ })
    .waitFor();
  await page.getByRole("button", { name: "Retry audio", exact: true }).click();
  await page.waitForFunction(() =>
    document.querySelector(".answers button:enabled"),
  );
  await page.getByRole("button", { name: "b3", exact: true }).click();
  assert.equal((await latest()).attempts[0].timingValidity, "interrupted");
  assert.equal((await latest()).attempts[0].firstResponseMs, null);
  assert.equal((await latest()).attempts[0].replaysBeforeFirst, 1);
  await page.getByRole("button", { name: "Stop", exact: true }).click();

  await start();
  await page.getByRole("button", { name: "b3", exact: true }).click();
  const beforeInterruption = (await latest()).attempts[0];
  await page.evaluate(() => window.testAudio.suspend());
  await page.getByRole("button", { name: "Retry audio", exact: true }).waitFor();
  await page.waitForTimeout(1400);
  assert.equal(
    (await latest()).attempts.length,
    1,
    "interruption cancels fast advance",
  );
  await page.getByRole("button", { name: "Retry audio", exact: true }).click();
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("jazzEarLab:v2:sessions")).at(-1)
        .attempts.length === 2,
  );
  const recoveredFirst = (await latest()).attempts[0];
  assert.equal(recoveredFirst.replaysAfterFirst, 1);
  for (const key of [
    "firstAnswer",
    "firstCorrect",
    "firstResponseMs",
    "timingValidity",
    "replaysBeforeFirst",
  ])
    assert.deepEqual(recoveredFirst[key], beforeInterruption[key]);
  await page.getByRole("button", { name: "Stop", exact: true }).click();

  await start();
  await page.evaluate(() => {
    const wrong = [...document.querySelectorAll(".answers button")].find(
      (b) => b.textContent === "5",
    );
    wrong.click();
    wrong.click();
  });
  assert.equal(
    (await latest()).attempts[0].retryCount,
    0,
    "queued clicks on a removed answer are not educational retries",
  );
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await start();
  await page.getByRole("button", { name: "b3", exact: true }).click();
  const first = (await latest()).attempts[0];
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await page.waitForTimeout(1400);
  assert.equal(
    (await latest()).attempts.length,
    1,
    "Replay cancels the old fast confirmation transition",
  );
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("jazzEarLab:v2:sessions")).at(-1).attempts
        .length === 2,
  );
  const replayed = (await latest()).attempts[0];
  assert.equal(replayed.replaysAfterFirst, 1);
  for (const key of [
    "firstAnswer",
    "firstCorrect",
    "firstResponseMs",
    "retryCount",
    "replaysBeforeFirst",
  ])
    assert.deepEqual(replayed[key], first[key]);
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  const stopped = await latest();
  await page.waitForTimeout(2800);
  assert.deepEqual(
    await latest(),
    stopped,
    "stopped session cannot receive a stale transition",
  );
  console.log(
    "V2 lifecycle passed: pre/post-ready interruption, suspended/closed recovery through Retry, locked evidence, stale actions, Replay completion gating and Stop cancellation.",
  );
} finally {
  await browser.close();
}
