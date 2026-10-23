import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
async function start(overrides = {}) {
  await page.goto(url);
  await page.evaluate(async (overrides) => {
    const { builtins, keys } = await import("/js/v2/model.js");
    localStorage.setItem(
      keys.presets,
      JSON.stringify([
        {
          ...builtins[0],
          config: {
            ...builtins[0].config,
            exercise: "m1",
            roots: ["G"],
            qualities: ["7"],
            targetMode: "exact",
            targets: ["3"],
            count: 2,
            ...overrides,
          },
        },
      ]),
    );
  }, overrides);
  await page.reload();
  await page.evaluate(async () => {
    const { AudioEngine } = await import("/js/jazz/audio.js");
    const original = AudioEngine.prototype.playReference;
    window.references = [];
    AudioEngine.prototype.playReference = function (...args) {
      const plan = Reflect.apply(original, this, args);
      const trace = {};
      window.references.push(trace);
      plan.ready.then((ready) => {
        trace.ready = ready;
      });
      plan.completed.then((end) => {
        trace.end = end;
      });
      return plan;
    };
  });
  await page
    .locator('[data-preset-id="recognition-guides"]')
    .getByRole("button", { name: "Start", exact: true })
    .click();
  await page.getByRole("button", { name: /^Done -/ }).click();
  await page.getByRole("button", { name: "Correct", exact: true }).waitFor();
}
async function waitReference() {
  await page.waitForFunction(
    () => window.references.at(-1)?.end === "completed",
  );
}
try {
  await start();
  assert.equal(
    await page.locator("#wrong-degree").count(),
    0,
    "no confusion chooser before Incorrect",
  );
  const locked = (await latest()).attempts[0];
  assert.equal(locked.firstCorrect, null);
  assert.equal(await page.evaluate(() => window.references[0].end), undefined);
  await page.evaluate(() => {
    window.staleCorrect = [...document.querySelectorAll("button")].find(
      (b) => b.textContent === "Correct",
    );
  });
  await page.getByRole("button", { name: "Incorrect", exact: true }).click();
  const chooser = page.getByLabel(/^Which degree did you imagine\?/);
  await chooser.waitFor();
  await page.evaluate(() => window.staleCorrect.click());
  await chooser.selectOption("");
  assert.equal(
    (await latest()).attempts[0].firstCorrect,
    null,
    "Incorrect alone is ungraded",
  );
  assert.equal(
    await page.getByRole("button", { name: /^(Next|Finish session)$/ }).count(),
    0,
  );
  assert.equal(
    await chooser.locator('option[value="3"]').count(),
    0,
    "target cannot be reported as a confusion",
  );
  await chooser.selectOption("5");
  const graded = (await latest()).attempts[0];
  assert.equal(graded.firstCorrect, false);
  assert.equal(graded.imaginedWrongDegree, "5");
  assert.equal(graded.firstResponseMs, locked.firstResponseMs);
  assert.equal(graded.replaysAfterFirst, 0);
  await page
    .getByRole("status")
    .filter({ hasText: /^Self-rated Incorrect$/ })
    .waitFor();
  await page.evaluate(() => window.testAudio.suspend());
  await page.waitForTimeout(2800);
  assert.equal(
    (await latest()).attempts.length,
    1,
    "grade alone cannot skip the natural reference tail",
  );
  await page.evaluate(() => window.testAudio.resume());
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("jazzEarLab:v2:sessions")).at(-1).attempts
        .length === 2,
  );
  await page.waitForFunction(() =>
    document.activeElement.textContent.startsWith("Done -"),
  );
  assert.deepEqual((await latest()).attempts[0], graded);
  assert.equal(
    await page.evaluate(() =>
      document.activeElement.textContent.startsWith("Done -"),
    ),
    true,
  );
  await page.keyboard.press("Enter");
  await page.waitForFunction(
    () => document.activeElement.textContent === "Correct",
  );
  assert.equal(
    await page.locator("#wrong-degree").count(),
    0,
    "chooser state resets for the next question",
  );
  await page.keyboard.press("Enter");
  await page
    .getByRole("status")
    .filter({ hasText: /^Self-rated Correct$/ })
    .waitFor();
  assert.equal((await latest()).attempts[1].firstCorrect, true);
  await page.waitForURL(/#results\//);
  assert.equal((await latest()).attempts.length, 2);
  assert.deepEqual((await latest()).attempts[0], graded);

  // Tail first: audio alone cannot grade, and Unknown is an explicit choice.
  await page.setViewportSize({ width: 390, height: 844 });
  await start({ count: 1 });
  await waitReference();
  const lateLocked = (await latest()).attempts[0];
  assert.match(page.url(), /#practice$/);
  assert.equal(lateLocked.firstCorrect, null);
  assert.equal(
    await page.evaluate(() => document.activeElement.textContent === "Correct"),
    true,
  );
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(
      () => document.activeElement.textContent === "Incorrect",
    ),
    true,
  );
  await page.keyboard.press("Enter");
  await page.waitForFunction(
    () => document.activeElement.id === "wrong-degree",
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
    false,
  );
  if (process.env.V2_SCREENSHOTS)
    await page.screenshot({
      path: `${process.env.TEMP}/eartrain-v2-m1-chooser-mobile.png`,
      fullPage: true,
    });
  if (process.env.QUALITY_AXE_PATH) {
    await page.addScriptTag({
      content: await readFile(process.env.QUALITY_AXE_PATH, "utf8"),
    });
    assert.deepEqual(
      await page.evaluate(async () =>
        (
          await axe.run(document, {
            runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
          })
        ).violations.map((v) => v.id),
      ),
      [],
    );
  }
  assert.equal((await latest()).attempts[0].firstCorrect, null);
  assert.equal(
    await page.getByRole("button", { name: /^(Next|Finish session)$/ }).count(),
    0,
  );
  await page.waitForTimeout(300);
  assert.match(
    page.url(),
    /#practice$/,
    "completed reference plus Incorrect alone still waits for choice",
  );
  await page.keyboard.press("End");
  await page.keyboard.press("Tab");
  await page.waitForURL(/#results\//);
  const unknown = (await latest()).attempts[0];
  assert.equal(unknown.firstCorrect, false);
  assert.equal(unknown.imaginedWrongDegree, "unknown");
  assert.equal(unknown.firstResponseMs, lateLocked.firstResponseMs);
  assert.equal(unknown.replaysAfterFirst, 0);
  assert.equal((await latest()).attempts.length, 1);

  // Manual resolution stays reviewable and old controls cannot grade later questions.
  await start({ count: 2, autoAdvance: false, method: "played" });
  const manualLocked = (await latest()).attempts[0];
  await page.evaluate(() => {
    window.oldCorrect = [...document.querySelectorAll("button")].find(
      (b) => b.textContent === "Correct",
    );
    window.oldIncorrect = [...document.querySelectorAll("button")].find(
      (b) => b.textContent === "Incorrect",
    );
    window.oldCorrect.click();
    window.oldCorrect.click();
    window.oldIncorrect.click();
  });
  await waitReference();
  assert.equal((await latest()).attempts[0].firstCorrect, true);
  assert.equal((await latest()).attempts[0].responseMethod, "played");
  assert.equal(
    (await latest()).attempts[0].firstResponseMs,
    manualLocked.firstResponseMs,
  );
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await waitReference();
  const reviewed = (await latest()).attempts[0];
  assert.equal(reviewed.replaysAfterFirst, 1);
  assert.equal(reviewed.replaysBeforeFirst, 0);
  assert.equal(reviewed.firstResponseMs, manualLocked.firstResponseMs);
  assert.equal((await latest()).attempts.length, 1);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: /^Done -/ }).click();
  await page.getByRole("button", { name: "Incorrect", exact: true }).waitFor();
  await page.evaluate(() => {
    window.oldCorrect.click();
    window.oldIncorrect.click();
  });
  assert.equal(
    (await latest()).attempts[1].firstCorrect,
    null,
    "detached first-question controls cannot grade this question",
  );
  assert.equal(await page.locator("#wrong-degree").count(), 0);
  await page.evaluate(() => {
    const incorrect = [...document.querySelectorAll("button")].find(
      (b) => b.textContent === "Incorrect",
    );
    incorrect.click();
    incorrect.click();
  });
  const manualChooser = page.getByLabel(/^Which degree did you imagine\?/);
  await manualChooser.selectOption("unknown");
  await waitReference();
  assert.equal((await latest()).attempts[1].imaginedWrongDegree, "unknown");
  assert.equal((await latest()).attempts.length, 2);
  assert.match(
    page.url(),
    /#practice$/,
    "Auto Advance off never finishes automatically",
  );
  await page
    .getByRole("button", { name: "Finish session", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await page.waitForURL(/#results\//);
  assert.deepEqual((await latest()).attempts[0], reviewed);

  await start({ count: 0 });
  for (let ordinal = 1; ordinal <= 2; ordinal++) {
    await page.getByRole("button", { name: "Correct", exact: true }).click();
    await page.waitForFunction(
      (n) =>
        JSON.parse(localStorage.getItem("jazzEarLab:v2:sessions")).at(-1)
          .attempts.length ===
        n + 1,
      ordinal,
    );
    await page.getByRole("button", { name: /^Done -/ }).waitFor();
    if (ordinal === 1) {
      await page.getByRole("button", { name: /^Done -/ }).click();
      await page
        .getByRole("button", { name: "Correct", exact: true })
        .waitFor();
    }
  }
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await page.waitForURL(/#results\//);
  assert.equal(
    (await latest()).attempts.length,
    2,
    "Unlimited stops explicitly without storing the untouched next question",
  );
  assert.deepEqual(errors, []);
  console.log(
    "M1 grading passed: conditional choice, both completion orderings, fixed counts, manual review, locked evidence, stale actions and keyboard focus.",
  );
} finally {
  await browser.close();
}
