import assert from "node:assert/strict";
import { configure, ready, navigate, labURL } from "./browser-support.mjs";
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
try {
  await page.goto(labURL);
  await configure(page, {
    mode: "m5",
    runMode: "continuous",
    targetPattern: "two",
    span: 2,
    beats: 4,
    countIn: 4,
    gapBeats: 1,
  });
  await page.waitForFunction(
    () => window.engine && window.engine.position > 0.1,
  );
  assert.equal(await page.locator("#reveal").isDisabled(), true);
  assert.equal(await page.locator("#run-reference").innerText(), "");
  await page.locator("#pause").click();
  const at = await page.evaluate(() => window.engine.position);
  await page.waitForTimeout(400);
  assert.ok(
    Math.abs((await page.evaluate(() => window.engine.position)) - at) < 0.03,
  );
  await page.locator("#pause").click();
  await page.locator("#grading").waitFor({ state: "visible" });
  await page.locator("[data-grade=correct]").click();
  const record = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("jazzEarLab:v1:sessions")).at(-1)
        .records[0],
  );
  assert.equal(record.targets.length, 4);
  await configure(page, { mode: "m6" });
  await page.waitForFunction(
    () => !document.getElementById("phrase-step").disabled,
  );
  assert.equal(await page.locator("#phrase-score canvas").count(), 0);
  await page.locator("#phrase-step").click();
  await page.locator("#phrase-step").click();
  await page.locator("#phrase-marks button").first().click();
  await page.locator("#phrase-step").click();
  await ready(page);
  assert.deepEqual(await page.evaluate(() => window.audioCalls.at(-1).chords), [
    "Dm7",
  ]);
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
  await page.locator("#phrase-step").click();
  assert.equal(await page.locator("#fretboard button").count(), 52);
  await page.locator("[data-grade=close]").click();
  await page.locator("#phrase-step").click();
  await page.locator("#phrase-step").click();
  await page.waitForFunction(
    () => document.getElementById("variation").value === "rhythm",
  );
  await configure(page, { mode: "m7" });
  await page.waitForFunction(
    () => !document.getElementById("bass-stage").disabled,
  );
  assert.equal(await page.locator("#reveal").isDisabled(), true);
  await page.locator("#bass-stage").click();
  await ready(page);
  assert.equal(await page.locator("#fretboard .target").count(), 0);
  await page.locator("#fretboard button").first().click();
  await page.locator("#reveal").click();
  assert.ok((await page.locator("#fretboard .target").count()) > 0);
  await page.locator("[data-grade=correct]").click();
  await page.locator("#favorite").click();
  const midi = await page.evaluate(() => window.audioCalls.at(-1).midis[0]);
  await navigate(page, "review");
  await page
    .locator("#review-list")
    .getByRole("button", { name: "Practice", exact: true })
    .click();
  await page.waitForURL(/#\/session\/[^/]+$/);
  await page.locator("#start").click();
  await page.waitForFunction(
    () => !document.getElementById("bass-stage").disabled,
  );
  assert.equal(
    await page.evaluate(() => window.audioCalls.at(-1).midis[0]),
    midi,
  );
  await configure(page, {
    mode: "m2",
    root: "G",
    showChords: false,
    recognitionQualities: "7",
    recognitionPool: "b7",
  });
  await ready(page);
  await page.locator("#choices select").nth(0).selectOption("maj7");
  await page.locator("#choices select").nth(1).selectOption("b7");
  await page.locator("#reveal").click();
  assert.match(await page.locator("#status").innerText(), /Compare/);
  await navigate(page, "insights");
  await page.locator(".insight-mode-grid").waitFor();
  const stats = await page.locator(".insight-mode-grid").innerText();
  assert.match(stats, /M5/);
  assert.match(stats, /M6/);
  assert.match(stats, /M7/);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Release 4 browser checks passed through routed sessions: continuous audio-clock pause/two targets, phrase stages/notation/variation, bass mapping, exact review replay and separate mode statistics.",
  );
} finally {
  await browser.close();
}
