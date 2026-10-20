import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  headless: true,
  channel: "msedge",
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.goto("http://127.0.0.1:4173/jazz-ear-lab/");
  await page.evaluate(async () => {
    localStorage.setItem("eartrain:questionHistory", "preserve-me");
    window.audioCalls = [];
    const { AudioEngine } = await import("/js/jazz/audio.js");
    const original = AudioEngine.prototype.play;
    AudioEngine.prototype.play = function (targets, ...rest) {
      window.audioCalls.push(targets.map((t) => t.chord.symbol));
      return original.call(this, targets, ...rest);
    };
  });
  await page.getByText("Practice settings", { exact: true }).click();
  await page.getByText("Audio and display", { exact: true }).click();
  await page.locator("#bpm").fill("240");
  await page.locator("#bpm").dispatchEvent("change");
  await page.locator("#beats").fill("1");
  await page.locator("#beats").dispatchEvent("change");
  await page.locator("#start").click();
  await page.waitForFunction(() => !document.getElementById("reveal").disabled);
  assert.equal(await page.locator("#answer").isVisible(), false);
  await page.locator("#reveal").click();
  assert.match(await page.locator("#answer").innerText(), /E = 9/);
  await page.locator("[data-grade=correct]").click();
  await page.locator("#mode").selectOption("m3");
  await page.locator("#start").click();
  await page.waitForFunction(() => !document.getElementById("reveal").disabled);
  for (const [i, degree] of ["b3", "b7", "11"].entries())
    await page.locator("#choices select").nth(i).selectOption(degree);
  await page.locator("#reveal").click();
  assert.match(await page.locator("#status").innerText(), /Correct/);
  await page.locator("#mode").selectOption("m4");
  await page.locator("#progression").selectOption("major-c");
  await page.evaluate(() => (window.audioCalls = []));
  await page.locator("#start").click();
  await page.waitForFunction(() => !document.getElementById("reveal").disabled);
  assert.deepEqual(await page.evaluate(() => window.audioCalls), [["Dm7"]]);
  assert.equal(await page.locator("#answer").isVisible(), false);
  await page.locator("#pause").click();
  assert.equal(await page.locator("#reveal").isDisabled(), true);
  await page.locator("#pause").click();
  await page.locator("#reveal").click();
  assert.deepEqual(await page.evaluate(() => window.audioCalls), [
    ["Dm7"],
    ["G7"],
  ]);
  assert.match(await page.locator("#answer").innerText(), /B = 3/);
  await page.locator("[data-grade=close]").click();
  await page.locator("#next").click();
  assert.deepEqual(await page.evaluate(() => window.audioCalls), [
    ["Dm7"],
    ["G7"],
  ]);
  await page.locator("#replay").click();
  await page.waitForFunction(() => !document.getElementById("reveal").disabled);
  assert.deepEqual(await page.evaluate(() => window.audioCalls), [
    ["Dm7"],
    ["G7"],
    ["G7"],
  ]);
  await page.screenshot({
    path: join(tmpdir(), "jazz-ear-lab-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: join(tmpdir(), "jazz-ear-lab-mobile.png"),
    fullPage: true,
  });
  await page.reload();
  assert.equal(await page.locator("#mode").inputValue(), "m4");
  assert.equal(
    await page.evaluate(() => localStorage.getItem("eartrain:questionHistory")),
    "preserve-me",
  );
  await page.locator("#history-tab").click();
  assert.match(
    await page.locator("#history-summary").innerText(),
    /Self-assessment/,
  );
  await page.locator("#path-tab").click();
  assert.equal(
    await page.locator("#path-list button:not([disabled])").count(),
    7,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Browser checks passed: M1 reveal, M3 grading, M4 audio order, pause/resume, replay, persistence, unlocked path, desktop/mobile overflow.",
  );
  console.log(
    "Screenshots:",
    join(tmpdir(), "jazz-ear-lab-desktop.png"),
    join(tmpdir(), "jazz-ear-lab-mobile.png"),
  );
} finally {
  await browser.close();
}
