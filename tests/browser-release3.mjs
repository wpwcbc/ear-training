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
  await page.evaluate(() =>
    localStorage.setItem("eartrain:questionHistory", "old-history"),
  );
  await configure(page, { mode: "m2", recognitionPool: "9" });
  await ready(page);
  const options = await page.locator("#choices option").allTextContents();
  assert.equal(new Set(options).size, options.length);
  await page.locator("#choices select").selectOption("3");
  await page.locator("#reveal").click();
  assert.match(await page.locator("#answer").innerText(), /E = 9/);
  await page.locator("#retry").click();
  await ready(page);
  await page.locator("#choices select").selectOption("9");
  await page.locator("#reveal").click();
  assert.match(await page.locator("#status").innerText(), /Correct/);
  await navigate(page, "insights/m2");
  await page
    .getByText("Recognition components and confusions", { exact: true })
    .click();
  await page.locator("#confusions table").waitFor();
  assert.match(
    await page.locator("#confusions").innerText(),
    /9\s+m7: 3\s+1\/1/,
  );
  await configure(page, { mode: "m3", commonMode: "produce", span: 2 });
  await ready(page);
  const production = await page.evaluate(() => window.audioCalls.at(-1));
  assert.equal(production.melody, false);
  assert.equal(production.options.seed, true);
  assert.equal(production.chords.length, 2);
  assert.equal(new Set(production.midis).size, 1);
  await page.locator("#reveal").click();
  await page.locator("[data-grade=close]").click();
  await configure(page, {
    mode: "m4",
    revealMode: "timed",
    predictionSeconds: 1.5,
  });
  await ready(page);
  await page.locator("#pause").click();
  const calls = await page.evaluate(() => window.audioCalls.length);
  await page.waitForTimeout(1700);
  assert.equal(await page.evaluate(() => window.audioCalls.length), calls);
  await page.locator("#pause").click();
  await page.locator("#answer").waitFor({ state: "visible" });
  assert.deepEqual(await page.evaluate(() => window.audioCalls.at(-1).chords), [
    "G7",
  ]);
  await page.locator("#retry").click();
  await ready(page);
  await navigate(page, "home");
  const afterExit = await page.evaluate(() => window.audioCalls.length);
  await page.waitForTimeout(1700);
  assert.equal(await page.evaluate(() => window.audioCalls.length), afterExit);
  await page.locator("#start-practicing").click();
  await page
    .getByRole("button", { name: "Anticipate Next Chord Tone", exact: true })
    .click();
  await page.locator("#custom-editor summary").click();
  await page.locator("#custom-name").fill("Modal shift");
  await page.locator("#custom-score").fill("Dm7 1\nG7 2\nCmaj7 3\nEb7 2");
  await page.locator("#custom-save").click();
  assert.match(await page.locator("#custom-status").innerText(), /saved/);
  const customId = await page.locator("#progression").inputValue();
  assert.match(customId, /^custom-/);
  const custom = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("jazzEarLab:v1:progressions")),
  );
  await configure(
    page,
    { mode: "m5", progression: customId, repeats: 2, countIn: 4 },
    custom,
  );
  await ready(page);
  assert.equal(
    await page.evaluate(() => window.audioCalls.at(-1).options.countIn),
    4,
  );
  await page.locator("#reveal").click();
  assert.deepEqual(
    await page.evaluate(() => window.audioCalls.at(-1).beats),
    [2],
  );
  await page.locator("[data-grade=correct]").click();
  await page.locator("#next").click();
  await page.locator("#reveal").click();
  assert.deepEqual(
    await page.evaluate(() => window.audioCalls.at(-1).beats),
    [3],
  );
  await page.reload();
  assert.equal(await page.locator("#progression").inputValue(), customId);
  await navigate(page, "insights/m5");
  await page.locator("#skill-stats table").waitFor();
  assert.match(await page.locator("#skill-stats").innerText(), /transition/);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem("eartrain:questionHistory")),
    "old-history",
  );
  assert.deepEqual(errors, []);
  console.log(
    "Release 3 browser checks passed through routed sessions: recognition/retry/confusions, common-tone production, timed reveal pause/exit cancellation, custom editor/durations, persistence and insights.",
  );
} finally {
  await browser.close();
}
