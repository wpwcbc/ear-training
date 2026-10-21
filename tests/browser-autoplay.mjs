import assert from "node:assert/strict";
import { labURL, ready } from "./browser-support.mjs";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
// Exercise real user-gesture unlocking without an autoplay-policy override.
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(12000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
async function setup(extra = {}, failAudio = false) {
  await page.goto(labURL + "#/home");
  await page.evaluate(async (extra) => {
    const { defaults } = await import("/js/jazz/model.js");
    localStorage.setItem(
      "jazzEarLab:v1:wizardDraft",
      JSON.stringify({
        schemaVersion: 1,
        config: {
          ...defaults,
          mode: "m1",
          root: "D",
          quality: "m7",
          degree: "9",
          bpm: 240,
          beats: 1,
          count: 5,
          ...extra,
        },
        customs: [],
        maxStep: 4,
      }),
    );
  }, extra);
  await page.goto(labURL + "#/setup/5");
  await page.reload();
  await page.evaluate(async (failAudio) => {
    const { AudioEngine } = await import("/js/jazz/audio.js");
    const original = AudioEngine.prototype.play;
    window.calls = [];
    window.restoreAudio = AudioEngine.prototype.ready;
    AudioEngine.prototype.play = function (targets, config, melody, ...rest) {
      window.engine = this;
      window.calls.push({ chords: targets.map((t) => t.chord.symbol), melody });
      return original.call(this, targets, config, melody, ...rest);
    };
    if (failAudio)
      AudioEngine.prototype.ready = async function () {
        throw new Error("Audio blocked; retry Play context.");
      };
  }, failAudio);
  assert.equal(await page.evaluate(() => window.calls.length), 0);
}
try {
  await setup();
  await page.locator("#wizard-next").click();
  await page.waitForURL(/#\/session\/[^/]+$/);
  await ready(page);
  assert.deepEqual(await page.evaluate(() => window.calls), [
    { chords: ["Dm7"], melody: false },
  ]);
  assert.equal(await page.locator("#answer").isVisible(), false);
  assert.equal(await page.locator("#replay").isVisible(), true);
  assert.equal(await page.locator("#start").isVisible(), false);
  await page.locator("#replay").click();
  await ready(page);
  assert.equal(await page.evaluate(() => window.calls.length), 2);
  await page.locator("#reveal").click();
  await page.locator("[data-grade=correct]").click();
  await page.locator("#next").click();
  await ready(page);
  assert.deepEqual(await page.evaluate(() => window.calls.at(-1)), {
    chords: ["Dm7"],
    melody: false,
  });
  assert.equal(await page.evaluate(() => window.calls.length), 4);
  assert.equal(await page.locator("#answer").isVisible(), false);
  await page.addInitScript(() => {
    const OriginalContext = window.AudioContext;
    window.createdAudioContexts = 0;
    window.AudioContext = class extends OriginalContext {
      constructor(...args) {
        super(...args);
        window.createdAudioContexts++;
      }
    };
  });
  await page.reload();
  assert.equal(await page.locator("#start").isVisible(), false);
  // A reload restores progress without automatically starting audio.
  assert.equal(await page.evaluate(() => window.createdAudioContexts), 0);
  await page.locator("#session-exit").click();
  await page.evaluate(async () => {
    const { AudioEngine } = await import("/js/jazz/audio.js");
    const play = AudioEngine.prototype.play;
    window.calls = [];
    AudioEngine.prototype.play = function (...args) {
      window.calls.push(args[0].map((t) => t.chord.symbol));
      return play.apply(this, args);
    };
  });
  await page
    .locator("#configuration-list")
    .getByRole("button", { name: "Practice", exact: true })
    .click();
  await page.waitForURL(/#\/session\/[^/]+$/);
  await ready(page);
  assert.deepEqual(await page.evaluate(() => window.calls), [["Dm7"]]);
  await setup({}, true);
  await page.locator("#wizard-next").click();
  await page.waitForURL(/#\/session\/[^/]+$/);
  await page
    .locator("#flow-status")
    .filter({ hasText: "Audio blocked" })
    .waitFor();
  assert.equal(await page.locator("#start").isVisible(), true);
  assert.equal(await page.evaluate(() => window.calls.length), 0);
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("jazzEarLab:v1:sessions")).at(-1)
          .records.length,
    ),
    0,
  );
  await page.evaluate(async () => {
    const { AudioEngine } = await import("/js/jazz/audio.js");
    AudioEngine.prototype.ready = window.restoreAudio;
  });
  await page.locator("#start").click();
  await ready(page);
  assert.equal(await page.evaluate(() => window.calls.length), 1);
  await setup({ prepareSeconds: 2 });
  await page.locator("#wizard-next").click();
  await page.waitForURL(/#\/session\/[^/]+$/);
  await page
    .locator("#session-prepare")
    .filter({ hasText: "Prepare" })
    .waitFor();
  assert.equal(await page.evaluate(() => window.calls.length), 0);
  await page.locator("#session-exit").click();
  await page.waitForTimeout(2200);
  assert.equal(await page.evaluate(() => window.calls.length), 0);
  assert.deepEqual(errors, []);
  console.log(
    "M1 autoplay checks passed with default browser policy: first question, Recent, Next, manual replay, audio-failure retry and countdown cancellation.",
  );
} finally {
  await browser.close();
}
