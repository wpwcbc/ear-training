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
page.setDefaultTimeout(12000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
async function fill(id, value) {
  await page.locator("#" + id).fill(value);
  await page.locator("#" + id).dispatchEvent("change");
}
const ready = () =>
  page.waitForFunction(() => !document.getElementById("reveal").disabled);
try {
  await page.goto("http://127.0.0.1:4173/jazz-ear-lab/");
  await page.evaluate(async () => {
    localStorage.setItem("eartrain:questionHistory", "keep-old");
    const { AudioEngine } = await import("/js/jazz/audio.js");
    const play = AudioEngine.prototype.play;
    window.calls = [];
    AudioEngine.prototype.play = function (targets, ...args) {
      window.engine = this;
      window.calls.push(
        targets.map((t) => ({
          chord: t.chord.symbol,
          midi: t.midi,
          second: t.secondMidi,
        })),
      );
      return play.call(this, targets, ...args);
    };
  });
  await page.getByText("Practice settings", { exact: true }).click();
  await page.getByText("Audio and display", { exact: true }).click();
  await fill("bpm", "240");
  await fill("beats", "4");
  await page.locator("#countIn").selectOption("4");
  await page.locator("#mode").selectOption("m5");
  await page.locator("#span").selectOption("2");
  await page.locator("#runMode").selectOption("continuous");
  await page.locator("#targetPattern").selectOption("two");
  await fill("gapBeats", "1");
  await page.locator("#start").click();
  await page.waitForFunction(
    () => window.engine && window.engine.position > 0.1,
  );
  assert.equal(await page.locator("#reveal").isDisabled(), true);
  assert.equal(await page.locator("#answer").isVisible(), false);
  assert.equal(await page.locator("#run-reference").innerText(), "");
  assert.equal(
    await page.evaluate(() =>
      window.calls.at(-1).every((t) => Number.isFinite(t.second)),
    ),
    true,
  );
  await page.locator("#pause").click();
  const pausedAt = await page.evaluate(() => window.engine.position);
  await page.waitForTimeout(600);
  assert.ok(
    Math.abs((await page.evaluate(() => window.engine.position)) - pausedAt) <
      0.03,
  );
  await page.locator("#pause").click();
  await page.locator("#grading").waitFor({ state: "visible" });
  assert.match(await page.locator("#answer").innerText(), /Dm7.*G7/);
  await page.locator("[data-grade=correct]").click();
  const performance = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("jazzEarLab:v1:sessions")).at(-1)
        .records[0],
  );
  assert.equal(performance.targets.length, 4);
  await page.locator("#mode").selectOption("m6");
  await page.locator("#phraseId").selectOption("landmarks");
  await page.locator("#start").click();
  await page.waitForFunction(
    () => !document.getElementById("phrase-step").disabled,
  );
  assert.equal(await page.locator("#phrase-score canvas").count(), 0);
  await page.locator("#phrase-step").click();
  assert.match(await page.locator("#prompt").innerText(), /Sing/);
  await page.locator("#phrase-step").click();
  assert.match(await page.locator("#prompt").innerText(), /Mark/);
  await page.locator("#phrase-marks button").first().click();
  assert.equal(
    await page
      .locator("#phrase-marks button")
      .first()
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.locator("#phrase-step").click();
  assert.match(await page.locator("#prompt").innerText(), /Predict/);
  await ready();
  assert.equal(await page.locator("#phrase-score canvas").count(), 0);
  assert.deepEqual(
    await page.evaluate(() => window.calls.at(-1).map((t) => t.chord)),
    ["Dm7"],
  );
  await page.locator("#reveal").click();
  assert.equal(await page.locator("#phrase-score canvas").count(), 1);
  const pixels = await page
    .locator("#phrase-score canvas")
    .evaluate((canvas) => {
      const data = canvas
        .getContext("2d")
        .getImageData(0, 0, canvas.width, canvas.height).data;
      let ink = 0;
      for (let i = 0; i < data.length; i += 4)
        if (data[i] < 180 && data[i + 1] < 180 && data[i + 2] < 180) ink++;
      return ink;
    });
  assert.ok(pixels > 1000);
  await page.locator("#phrase-step").click();
  assert.equal(await page.locator("#fretboard button").count(), 52);
  await page.locator("[data-grade=close]").click();
  await page.screenshot({
    path: join(tmpdir(), "jazz-ear-lab-phrase-desktop.png"),
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
    path: join(tmpdir(), "jazz-ear-lab-phrase-mobile.png"),
    fullPage: true,
  });
  await page.locator("#phrase-step").click();
  await page.locator("#phrase-step").click();
  await page.waitForFunction(
    () => !document.getElementById("phrase-step").disabled,
  );
  assert.equal(await page.locator("#variation").inputValue(), "rhythm");
  await page.locator("#mode").selectOption("m7");
  await fill("beats", "1");
  await page.locator("#countIn").selectOption("0");
  await page.locator("#start").click();
  await page.waitForFunction(
    () => !document.getElementById("bass-stage").disabled,
  );
  assert.equal(await page.locator("#reveal").isDisabled(), true);
  await page.locator("#bass-stage").click();
  assert.equal(await page.locator("#fretboard button").count(), 52);
  assert.equal(await page.locator("#fretboard .target").count(), 0);
  await page.locator("#fretboard button").first().click();
  await page.locator("#reveal").click();
  assert.ok((await page.locator("#fretboard .target").count()) > 0);
  await page.locator("[data-grade=correct]").click();
  await page.locator("#favorite").click();
  const bassMidi = await page.evaluate(() => window.calls.at(-1)[0].midi);
  await page.locator("#review-tab").click();
  assert.equal(await page.locator("#review-list article").count(), 1);
  await page
    .locator("#review-list")
    .getByRole("button", { name: "Practice", exact: true })
    .click();
  await page.waitForFunction(
    () => !document.getElementById("bass-stage").disabled,
  );
  assert.equal(
    await page.evaluate(() => window.calls.at(-1)[0].midi),
    bassMidi,
  );
  await page.locator("#mode").selectOption("m2");
  await page.locator("#showChords").uncheck();
  await fill("recognitionQualities", "7");
  await page.locator("#root").selectOption("G");
  await fill("recognitionPool", "b7");
  await page.locator("#start").click();
  await ready();
  assert.equal(await page.locator("#choices select").count(), 2);
  await page.locator("#choices select").nth(0).selectOption("maj7");
  await page.locator("#choices select").nth(1).selectOption("b7");
  await page.locator("#reveal").click();
  assert.match(await page.locator("#status").innerText(), /Compare/);
  await page.locator("#insights-tab").click();
  assert.match(await page.locator("#skill-stats").innerText(), /M5/);
  assert.match(await page.locator("#skill-stats").innerText(), /M6/);
  assert.match(await page.locator("#skill-stats").innerText(), /M7/);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.reload();
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("jazzEarLab:v1:favorites")).length,
    ),
    1,
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem("eartrain:questionHistory")),
    "keep-old",
  );
  assert.deepEqual(errors, []);
  console.log(
    "Release 4 browser checks passed: continuous/two-target timing and audio-clock pause, M6 hidden score/mark/predict/score/bass/variation, nonblank notation canvas, M7 mapping/self-grade, exact saved-review replay, blind quality grading, separate mode statistics and mobile layout.",
  );
} finally {
  await browser.close();
}
