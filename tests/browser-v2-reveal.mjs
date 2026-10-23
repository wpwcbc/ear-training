import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(15000);
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
async function start(autoAdvance, count) {
  await page.goto(url);
  await page.evaluate(
    async ({ autoAdvance, count }) => {
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
              context: false,
              autoAdvance,
              count,
            },
          },
        ]),
      );
    },
    { autoAdvance, count },
  );
  await page.reload();
  await page.evaluate(async () => {
    const { AudioEngine } = await import("/js/jazz/audio.js");
    const play = AudioEngine.prototype.playSingle;
    window.trace = [];
    AudioEngine.prototype.playSingle = function (...args) {
      const plan = Reflect.apply(play, this, args);
      const item = { context: args[3], midi: args[1] };
      plan.completed.then((end) => {
        item.end = end;
      });
      window.trace.push(item);
      return plan;
    };
  });
  await page
    .locator('[data-preset-id="recognition-guides"]')
    .getByRole("button", { name: "Start", exact: true })
    .click();
  await page.waitForFunction(() =>
    document.querySelector(".answers button:enabled"),
  );
  await page.getByRole("button", { name: "5", exact: true }).click();
  assert.equal(await page.locator("#feedback").textContent(), "Incorrect");
  assert.doesNotMatch(
    await page.locator(".question").textContent(),
    /b3|Answer:/,
  );
}
try {
  await start(true, 2);
  await page.waitForTimeout(1200);
  assert.equal(
    (await latest()).attempts.length,
    1,
    "incorrect does not advance",
  );
  const first = (await latest()).attempts[0];
  await page
    .getByRole("button", { name: "Reveal Answer", exact: true })
    .click();
  await page.waitForFunction(() => window.trace.length === 2);
  assert.equal(
    (await page.evaluate(() => window.trace))[1].context,
    true,
    "Reveal has harmony even with question context off",
  );
  await page
    .locator(".question p")
    .filter({ hasText: /^Answer: b3$/ })
    .waitFor();
  assert.equal(
    (await page.evaluate(() => window.trace))[1].end,
    undefined,
    "Reveal displays the answer while its reference is still sounding",
  );
  const revealing = (await latest()).attempts[0];
  for (const key of ["firstAnswer", "firstCorrect", "firstResponseMs"])
    assert.deepEqual(revealing[key], first[key]);
  await page.waitForTimeout(300);
  assert.equal(
    (await latest()).attempts.length,
    1,
    "the answer is visible but advancement waits for natural audio completion",
  );
  assert.equal((await page.evaluate(() => window.trace))[1].end, undefined);
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("jazzEarLab:v2:sessions")).at(-1).attempts
        .length === 2,
  );
  const after = (await latest()).attempts[0];
  assert.equal(after.revealedReference, true);
  assert.equal(
    after.replaysAfterFirst,
    0,
    "mandatory first reference is not a replay",
  );
  for (const key of [
    "firstAnswer",
    "firstCorrect",
    "firstResponseMs",
    "retryCount",
    "replaysBeforeFirst",
  ])
    assert.deepEqual(after[key], first[key]);
  assert.equal((await page.evaluate(() => window.trace))[1].end, "completed");
  await page.getByRole("button", { name: "Stop", exact: true }).click();

  for (const phase of ["before-ready", "after-ready"]) {
    await start(true, 2);
    const locked = (await latest()).attempts[0];
    if (phase === "before-ready")
      await page.evaluate(async () => {
        const { AudioEngine } = await import("/js/jazz/audio.js");
        const original = AudioEngine.prototype.playReference;
        AudioEngine.prototype.playReference = function (...args) {
          const plan = Reflect.apply(original, this, args);
          void window.testAudio.suspend();
          AudioEngine.prototype.playReference = original;
          return plan;
        };
      });
    await page
      .getByRole("button", { name: "Reveal Answer", exact: true })
      .click();
    if (phase === "after-ready") {
      await page
        .locator(".question p")
        .filter({ hasText: /^Answer: b3$/ })
        .waitFor();
      await page.evaluate(() => window.testAudio.close());
    }
    await page
      .locator("#feedback")
      .filter({ hasText: /Audio unavailable/ })
      .waitFor();
    await page.waitForTimeout(2800);
    assert.equal(
      (await latest()).attempts.length,
      1,
      "interrupted Reveal never advances",
    );
    await page.getByRole("button", { name: "Retry audio", exact: true }).click();
    await page
      .locator(".question p")
      .filter({ hasText: /^Answer: b3$/ })
      .waitFor();
    assert.equal((await page.evaluate(() => window.trace)).at(-1).end, undefined);
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem("jazzEarLab:v2:sessions")).at(-1)
          .attempts.length === 2,
    );
    const recovered = (await latest()).attempts[0];
    for (const key of [
      "firstAnswer",
      "firstCorrect",
      "firstResponseMs",
      "timingValidity",
      "replaysBeforeFirst",
    ])
      assert.deepEqual(recovered[key], locked[key]);
    assert.equal(
      recovered.replaysAfterFirst,
      phase === "before-ready" ? 0 : 1,
      "only a previously available reference makes recovery a review replay",
    );
    await page.getByRole("button", { name: "Stop", exact: true }).click();
  }

  await start(false, 1);
  await page
    .getByRole("button", { name: "Reveal Answer", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Finish session", exact: true })
    .waitFor();
  await page.waitForTimeout(1200);
  assert.match(page.url(), /#practice$/);
  const manual = (await latest()).attempts[0];
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
  await page
    .getByRole("button", { name: "Finish session", exact: true })
    .click();
  await page.waitForURL(/#results\//);
  console.log(
    "V2 Reveal passed: no early answer/advance, harmonic reference, real completion gate, immutable evidence, mandatory-reference attribution and manual review.",
  );
} finally {
  await browser.close();
}
