import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
page.setDefaultTimeout(10000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const waitContext = () =>
  page.waitForFunction(() => !document.getElementById("reveal").disabled);
async function fill(id, value) {
  await page.locator("#" + id).fill(value);
  await page.locator("#" + id).dispatchEvent("change");
}
async function installSpy() {
  await page.evaluate(async () => {
    const { AudioEngine } = await import("/js/jazz/audio.js");
    const play = AudioEngine.prototype.play;
    window.audioCalls = [];
    window.audioStops = 0;
    AudioEngine.prototype.play = function (
      targets,
      config,
      melody,
      melodyOnly,
      options,
    ) {
      window.audioCalls.push({
        chords: targets.map((t) => t.chord.symbol),
        midis: targets.map((t) => t.midi),
        beats: targets.map((t) => t.beats),
        melody,
        options,
      });
      return play.call(this, targets, config, melody, melodyOnly, options);
    };
    const stop = AudioEngine.prototype.stop;
    AudioEngine.prototype.stop = function () {
      window.audioStops++;
      return stop.call(this);
    };
  });
}
try {
  await page.goto("http://127.0.0.1:4173/jazz-ear-lab/");
  await page.evaluate(() =>
    localStorage.setItem("eartrain:questionHistory", "old-history"),
  );
  await installSpy();
  await page.getByText("Practice settings", { exact: true }).click();
  await page.getByText("Audio and display", { exact: true }).click();
  await fill("bpm", "240");
  await fill("beats", "1");
  await page.locator("#mode").selectOption("m2");
  await fill("recognitionPool", "9");
  await page.locator("#start").click();
  await waitContext();
  assert.equal(await page.locator("#degree-setting").isVisible(), false);
  assert.equal(await page.locator("#answer").isVisible(), false);
  assert.match(await page.locator("#prompt").innerText(), /chord degree/);
  const options = await page.locator("#choices option").allTextContents();
  assert.equal(new Set(options).size, options.length);
  await page.locator("#choices select").selectOption("3");
  await page.locator("#reveal").click();
  assert.match(await page.locator("#answer").innerText(), /E = 9/);
  assert.match(await page.locator("#status").innerText(), /Compare/);
  await page.locator("#retry").click();
  await waitContext();
  await page.locator("#choices select").selectOption("9");
  await page.locator("#reveal").click();
  assert.match(await page.locator("#status").innerText(), /Correct/);
  await page.locator("#insights-tab").click();
  assert.match(await page.locator("#confusions").innerText(), /9\s+3\s+1/);
  assert.match(await page.locator("#skill-stats").innerText(), /Recognition/);
  await page.locator("#free-tab").click();
  await page.locator("#mode").selectOption("m3");
  await page.locator("#commonMode").selectOption("produce");
  await page.locator("#span").selectOption("2");
  await page.locator("#start").click();
  await waitContext();
  const production = await page.evaluate(() => window.audioCalls.at(-1));
  assert.equal(production.melody, false);
  assert.equal(production.options.seed, true);
  assert.equal(production.chords.length, 2);
  assert.equal(new Set(production.midis).size, 1);
  assert.equal(await page.locator("#choices").isVisible(), false);
  await page.locator("#reveal").click();
  assert.equal(await page.locator("#grading").isVisible(), true);
  await page.locator("[data-grade=close]").click();
  await page.locator("#mode").selectOption("m4");
  await page.locator("#revealMode").selectOption("timed");
  await fill("predictionSeconds", "1.5");
  await page.locator("#start").click();
  await waitContext();
  await page.waitForFunction(
    () => document.getElementById("countdown").textContent.length > 0,
  );
  await page.locator("#pause").click();
  const callCount = await page.evaluate(() => window.audioCalls.length);
  await page.waitForTimeout(1700);
  assert.equal(await page.evaluate(() => window.audioCalls.length), callCount);
  await page.locator("#pause").click();
  await page.locator("#answer").waitFor({ state: "visible" });
  assert.equal(
    (await page.evaluate(() => window.audioCalls.at(-1))).chords[0],
    "G7",
  );
  await page.locator("#retry").click();
  await waitContext();
  // A configuration change during a pending timed reveal cancels the old reveal.
  await page.locator("#mode").selectOption("m5");
  const afterChange = await page.evaluate(() => window.audioCalls.length);
  await page.waitForTimeout(1700);
  assert.equal(
    await page.evaluate(() => window.audioCalls.length),
    afterChange,
  );
  await page.locator("#revealMode").selectOption("manual");
  await page.locator("#span").selectOption("0");
  await page.locator("#custom-editor summary").click();
  await page.locator("#custom-name").fill("Modal shift");
  await page.locator("#custom-score").fill("Dm7 1\nG7 2\nCmaj7 3\nEb7 2");
  await page.locator("#custom-save").click();
  assert.match(await page.locator("#custom-status").innerText(), /saved/);
  const customId = await page.locator("#progression").inputValue();
  assert.match(customId, /^custom-/);
  await page.locator("#repeats").fill("2");
  await page.locator("#repeats").dispatchEvent("change");
  await page.locator("#countIn").selectOption("4");
  await page.locator("#start").click();
  await waitContext();
  const initial = await page.evaluate(() => window.audioCalls.at(-1));
  assert.equal(initial.options.countIn, 4);
  assert.deepEqual(initial.chords, ["Dm7"]);
  await page.locator("#reveal").click();
  assert.deepEqual(
    (await page.evaluate(() => window.audioCalls.at(-1))).beats,
    [2],
  );
  assert.match(await page.locator("#answer").innerText(), /G7/);
  await page.locator("[data-grade=correct]").click();
  await page.locator("#next").click();
  assert.equal(await page.locator("#answer").isVisible(), false);
  await page.locator("#reveal").click();
  assert.deepEqual(
    (await page.evaluate(() => window.audioCalls.at(-1))).beats,
    [3],
  );
  await page.reload();
  assert.equal(await page.locator("#mode").inputValue(), "m5");
  await page.getByText("Practice settings", { exact: true }).click();
  assert.equal(await page.locator("#progression").inputValue(), customId);
  assert.equal(await page.locator("#repeats").inputValue(), "2");
  await page.locator("#history-tab").click();
  assert.match(
    await page.locator("#history-summary").innerText(),
    /Self-assessment: 1 correct/,
  );
  await page.locator("#insights-tab").click();
  await page.locator("#insight-group").selectOption("progression");
  assert.match(await page.locator("#skill-stats").innerText(), /Modal shift/);
  await page.screenshot({
    path: join(tmpdir(), "jazz-ear-lab-insights.png"),
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
    path: join(tmpdir(), "jazz-ear-lab-insights-mobile.png"),
    fullPage: true,
  });
  await page.locator("#free-tab").click();
  await page.screenshot({
    path: join(tmpdir(), "jazz-ear-lab-release3-mobile.png"),
    fullPage: true,
  });
  await page.locator("#custom-editor summary").click();
  await page.locator("#custom-delete").click();
  assert.equal(
    await page.locator('#progression option[value="' + customId + '"]').count(),
    0,
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem("eartrain:questionHistory")),
    "old-history",
  );
  assert.deepEqual(errors, []);
  console.log(
    "Release 3 browser checks passed: M2 grading/confusions/retry, M3 production, timed reveal pause/cancellation, M5 custom durations/count-in, persisted progressions, split insights, mobile overflow and deletion.",
  );
} finally {
  await browser.close();
}
