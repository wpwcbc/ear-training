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
const url = "http://127.0.0.1:4173/jazz-ear-lab/";
const sessions = () =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("jazzEarLab:v1:sessions") || "[]"),
  );
const ready = () =>
  page.waitForFunction(() => !document.getElementById("reveal").disabled);
async function fastPlayback() {
  await page.locator("#compact-bpm").fill("240");
  await page.locator("#compact-bpm").dispatchEvent("change");
}
async function instrumentAudio() {
  await page.evaluate(async () => {
    const { AudioEngine } = await import("/js/jazz/audio.js");
    if (window.calls) return;
    window.calls = [];
    const play = AudioEngine.prototype.play;
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
}
async function presetConfig(config) {
  await page.goto(url + "#/home");
  await page.evaluate(async (config) => {
    const { defaults } = await import("/js/jazz/model.js");
    localStorage.setItem(
      "jazzEarLab:v1:wizardDraft",
      JSON.stringify({
        schemaVersion: 1,
        config: { ...defaults, bpm: 240, beats: 1, count: 5, ...config },
        customs: [],
        step: 4,
        maxStep: 4,
      }),
    );
  }, config);
  await page.goto(url + "#/setup/5");
  await page.reload();
  await page.locator("#wizard-next").click();
  await page.waitForURL(/#\/session\/[^/]+$/);
  await instrumentAudio();
  assert.equal(await page.locator("#answer").isVisible(), false);
  assert.equal(await page.evaluate(() => window.calls.length), 0);
  await page.locator("#start").click();
}
try {
  await page.goto(url);
  await instrumentAudio();
  await page.evaluate(() =>
    localStorage.setItem("eartrain:questionHistory", "keep-old"),
  );
  assert.equal(await page.locator("#dashboard-view").isVisible(), true);
  assert.equal(await page.locator("#configuration-list article").count(), 3);
  await page.locator("#start-practicing").click();
  await page
    .getByRole("button", { name: "Hear a Chord Degree", exact: true })
    .click();
  assert.match(page.url(), /setup\/2/);
  await page
    .getByRole("group", { name: "Chord Qualities", exact: true })
    .locator("input[value='7']")
    .uncheck();
  await page.locator("#wizard-next").click();
  await page.locator("#wizard-next").click();
  await page.locator("#bpm").fill("240");
  await page.locator("#bpm").dispatchEvent("change");
  await page.locator("#beats").fill("1");
  await page.locator("#beats").dispatchEvent("change");
  await page.locator("#count").selectOption("5");
  await page.getByRole("button", { name: "2. Harmony" }).click();
  await page.waitForURL(/setup\/2$/).catch(async (error) => {
    console.log(await page.locator("#flow-status").innerText(), errors);
    throw error;
  });
  await page.getByRole("group", { name: "Chord Roots", exact: true }).waitFor();
  assert.equal(await page.locator("#bpm").inputValue(), "240");
  const rootBoxes = page
    .getByRole("group", { name: "Chord Roots", exact: true })
    .locator("input:checked");
  while (await rootBoxes.count()) await rootBoxes.first().uncheck();
  assert.equal(
    await page.locator("#wizard-next").isDisabled(),
    true,
    JSON.stringify({
      url: page.url(),
      validation: await page.locator("#wizard-validation").textContent(),
      roots: await page.locator("#roots").inputValue(),
    }),
  );
  await page
    .getByRole("group", { name: "Chord Roots", exact: true })
    .locator("input[value='D']")
    .check();
  await page.locator("#wizard-next").click();
  await page.locator("#wizard-next").click();
  await page.locator("#wizard-next").click();
  await page.screenshot({
    path: join(tmpdir(), "jazz-ux-wizard.png"),
    fullPage: true,
  });
  page.once("dialog", (dialog) => dialog.accept("My guide tones"));
  await page.locator("#wizard-save-preset").click();
  await page.locator("#wizard-next").click();
  await page.waitForURL(/#\/session\/[^/]+$/);
  assert.equal(await page.locator(".lab-tabs").isVisible(), false);
  assert.equal(await page.locator("#settings").isVisible(), false);
  assert.equal(await page.evaluate(() => window.calls.length), 0);
  const firstId = (await sessions()).at(-1).id;
  await page.locator("#start").click();
  await ready();
  assert.equal(await page.locator("#answer").isVisible(), false);
  await page.screenshot({
    path: join(tmpdir(), "jazz-ux-session.png"),
    fullPage: true,
  });
  for (let i = 0; i < 3; i++) {
    await ready();
    await page.locator("#reveal").click();
    await page.locator("[data-grade=correct]").click();
    await page.locator("#next").click();
  }
  await ready();
  const fourth = (await sessions()).at(-1).questions[3];
  await page.reload();
  await instrumentAudio();
  assert.match(await page.locator("#session-progress").innerText(), /4/);
  assert.deepEqual((await sessions()).at(-1).questions[3], fourth);
  assert.equal((await sessions()).at(-1).records.length, 3);
  await page.locator("#replay").click();
  await ready();
  for (let i = 0; i < 2; i++) {
    await ready();
    await page.locator("#reveal").click();
    await page.locator("[data-grade=missed]").click();
    await page.locator("#next").click();
  }
  await page.waitForURL(/summary$/);
  assert.equal((await sessions()).at(-1).status, "completed");
  assert.match(
    await page.locator("#summary-content").innerText(),
    /Self-assessed/,
  );
  assert.doesNotMatch(
    await page.locator("#summary-content").innerText(),
    /% accuracy/,
  );
  await page.screenshot({
    path: join(tmpdir(), "jazz-ux-summary.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Review Missed", exact: true })
    .click();
  await page.waitForURL(/#\/session\/[^/]+$/);
  assert.equal((await sessions()).at(-1).questionCount, 2);
  await page.locator("#session-exit").click();
  await page
    .locator("#configuration-list")
    .getByRole("button", { name: "Practice", exact: true })
    .last()
    .click();
  await page.waitForURL(/#\/session\/[^/]+$/);
  assert.notEqual((await sessions()).at(-1).id, firstId);
  await page.locator("#session-exit").click();
  await page.locator("[data-dashboard=saved]").click();
  assert.match(
    await page.locator("#configuration-list").innerText(),
    /My guide tones/,
  );
  const savedConfig = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("jazzEarLab:v1:savedPresets"))[0].config,
  );
  await page
    .getByRole("button", { name: "Edit & Practice", exact: true })
    .click();
  await page.getByRole("button", { name: "3. Targets", exact: false }).click();
  await page
    .getByRole("group", { name: "Target Degrees", exact: true })
    .locator("input[value='9']")
    .check();
  assert.deepEqual(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("jazzEarLab:v1:savedPresets"))[0]
          .config,
    ),
    savedConfig,
  );
  await page.locator("#free-tab").click();
  await page.locator("[data-dashboard=saved]").click();
  page.once("dialog", (dialog) => dialog.accept("Renamed"));
  await page.getByRole("button", { name: "Rename", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  assert.deepEqual(
    (await sessions()).find((s) => s.id === firstId).config.qualityPool,
    savedConfig.qualityPool,
  );

  await presetConfig({
    mode: "m4",
    progression: "major-c",
    degreePool: ["b3", "3", "b7", "maj7"],
    path: "nearest",
    span: 3,
  });
  await ready();
  assert.deepEqual(
    await page.evaluate(() => window.calls.at(-1).map((t) => t.chord)),
    ["Dm7"],
  );
  await page.locator("#reveal").click();
  assert.equal(
    await page
      .locator("#reference-tools")
      .getByRole("button", { name: /Cmaj7/ })
      .count(),
    0,
  );
  await page.locator("[data-grade=correct]").click();
  await page.locator("#next").click();
  assert.equal((await sessions()).at(-1).completedCount, 0);
  await page.locator("#reveal").click();
  await page.locator("[data-grade=close]").click();
  await page.locator("#next").click();
  assert.equal((await sessions()).at(-1).completedCount, 1);

  await presetConfig({
    mode: "m2",
    root: "G",
    quality: "7",
    qualityPool: ["7"],
    degreePool: ["b7"],
    showChords: false,
    recognitionQualities: "7",
  });
  await ready();
  await page.locator("#choices select").nth(0).selectOption("7");
  await page.locator("#choices select").nth(1).selectOption("b7");
  await page.locator("#reveal").click();
  assert.equal((await sessions()).at(-1).records[0].grade, "correct");
  await page.locator("#session-end").click();
  await page.waitForURL(/summary$/);
  assert.match(
    await page.locator("#summary-content").innerText(),
    /100% accuracy/,
  );

  await presetConfig({
    mode: "m3",
    progression: "major-f",
    commonMode: "produce",
  });
  await ready();
  assert.equal(
    new Set((await sessions()).at(-1).questions[0].targets.map((t) => t.midi))
      .size,
    1,
  );
  await presetConfig({
    mode: "m5",
    runMode: "continuous",
    targetPattern: "two",
    span: 2,
    beats: 4,
    gapBeats: 1,
    metronome: true,
  });
  await page.waitForFunction(
    () => window.engine && window.engine.position > 0.1,
  );
  await page.locator("#pause").click();
  const pausedAt = await page.evaluate(() => window.engine.position);
  await page.waitForTimeout(400);
  assert.ok(
    Math.abs((await page.evaluate(() => window.engine.position)) - pausedAt) <
      0.03,
  );
  await page.locator("#pause").click();
  await page.locator("#grading").waitFor({ state: "visible" });
  assert.equal(
    await page.evaluate(() =>
      window.calls.at(-1).every((t) => Number.isFinite(t.second)),
    ),
    true,
  );

  await presetConfig({ mode: "m6" });
  await page.waitForFunction(
    () => !document.getElementById("phrase-step").disabled,
  );
  assert.equal(await page.locator("#phrase-score canvas").count(), 0);
  await page.locator("#phrase-step").click();
  await page.locator("#phrase-step").click();
  await page.locator("#phrase-marks button").first().click();
  await page.locator("#phrase-step").click();
  await ready();
  assert.deepEqual(
    await page.evaluate(() => window.calls.at(-1).map((t) => t.chord)),
    ["Dm7"],
  );
  await page.locator("#reveal").click();
  assert.equal(await page.locator("#phrase-score canvas").count(), 1);
  const ink = await page.locator("#phrase-score canvas").evaluate((canvas) => {
    const data = canvas
      .getContext("2d")
      .getImageData(0, 0, canvas.width, canvas.height).data;
    let n = 0;
    for (let i = 0; i < data.length; i += 4)
      if (data[i] < 180 && data[i + 1] < 180 && data[i + 2] < 180) n++;
    return n;
  });
  assert.ok(ink > 1000);
  await presetConfig({ mode: "m7" });
  await page.waitForFunction(
    () => !document.getElementById("bass-stage").disabled,
  );
  assert.equal(await page.locator("#reveal").isDisabled(), true);
  await page.locator("#bass-stage").click();
  await ready();
  assert.equal(await page.locator("#fretboard .target").count(), 0);
  await page.locator("#reveal").click();
  assert.ok(await page.locator("#fretboard .target").count());
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: join(tmpdir(), "jazz-ux-mobile-session.png"),
    fullPage: true,
  });
  await page.locator("#session-exit").click();
  await page.screenshot({
    path: join(tmpdir(), "jazz-ux-dashboard.png"),
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.locator("#history-tab").click();
  await page
    .locator("#history-list select[aria-label=Status]")
    .selectOption("completed");
  assert.equal(await page.locator("#history-list article").count(), 2);
  await presetConfig({ mode: "m1", autoAdvance: true, replayLimit: 1 });
  await ready();
  await page.keyboard.press("n");
  assert.equal((await sessions()).at(-1).progress.index, 0);
  await page.locator("#replay").click();
  await ready();
  const callsBeforeLimit = await page.evaluate(() => window.calls.length);
  await page.locator("#replay").click();
  assert.equal(
    await page.evaluate(() => window.calls.length),
    callsBeforeLimit,
  );
  await page.locator("#reveal").click();
  await page.locator("[data-grade=correct]").click();
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("jazzEarLab:v1:sessions")).at(-1).progress
        .index === 1,
  );
  await page.locator("#session-exit").click();
  await presetConfig({ mode: "m1", prepareSeconds: 2 });
  assert.equal(await page.evaluate(() => window.calls.length), 0);
  await page.locator("#session-exit").click();
  await page.waitForTimeout(2200);
  assert.equal(await page.evaluate(() => window.calls.length), 0);
  await presetConfig({ mode: "m1" });
  await ready();
  await page.locator("#pause").click();
  const pausedTime = (await sessions()).at(-1).totalTime;
  await page.waitForTimeout(600);
  await page.locator("#session-exit").click();
  assert.ok(Math.abs((await sessions()).at(-1).totalTime - pausedTime) < 0.15);
  assert.equal(
    await page.evaluate(() => localStorage.getItem("eartrain:questionHistory")),
    "keep-old",
  );
  assert.deepEqual(errors, []);
  console.log(
    "UX flow browser checks passed: wizard, pools, presets, recent, dedicated routes, reload/resume, immutable history, summaries, all seven modes, anticipation withholding, managed pause, notation, bass and mobile layout.",
  );
} finally {
  await browser.close();
}
