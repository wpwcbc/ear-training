import assert from "node:assert/strict";
import { configure, ready, navigate, labURL } from "./browser-support.mjs";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
page.setDefaultTimeout(20000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const session = () =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("jazzEarLab:v1:sessions")).at(-1),
  );
async function startFocus(route) {
  await openFocus(route);
  await page
    .locator("#selected-cell")
    .getByRole("button", { name: "Practise 10", exact: true })
    .first()
    .click();
  await page.waitForURL(/#\/session\/[^/]+$/);
  return session();
}
async function openFocus(route) {
  await navigate(page, route);
  await page.locator(".aggregate-matrix [data-cell-id]").first().click();
  await page
    .locator("#selected-cell")
    .getByRole("button", { name: "Inspect", exact: true })
    .first()
    .click();
  await page
    .locator("#selected-cell")
    .getByText("Adjust focus", { exact: true })
    .click();
}
try {
  await configure(page, {
    mode: "m2",
    showChords: false,
    recognitionQualities: "7",
    degreePool: ["9"],
  });
  await ready(page);
  await page.locator("#choices select").nth(0).selectOption("m7");
  await page.locator("#choices select").nth(1).selectOption("9");
  await page.locator("#reveal").click();
  const quality = await startFocus("insights/m2?task=hidden");
  assert.equal(
    quality.questions.filter((q) => q.targets[0].chord.quality === "7").length,
    5,
  );
  assert.equal(
    quality.questions.filter((q) => q.targets[0].chord.quality === "m7").length,
    5,
  );
  await configure(page, { mode: "m3", commonMode: "produce", span: 3 });
  await ready(page);
  await page.locator("#reveal").click();
  await page.locator("#trouble-steps input").nth(2).check();
  await page.locator("[data-grade=close]").click();
  const held = await startFocus("insights/m3?task=produce");
  assert.ok(Number.isInteger(held.config.heldMidi));
  assert.ok(
    held.questions.every(
      (q) =>
        q.targets.length === 2 &&
        q.targets.every((t) => t.midi === held.config.heldMidi),
    ),
  );
  await configure(page, { mode: "m4", revealMode: "manual" });
  await ready(page);
  await page.locator("#reveal").click();
  await page.locator("[data-grade=missed]").click();
  const transition = await startFocus("insights/m4");
  assert.equal(transition.source, "exact-review");
  assert.equal(
    transition.questions.filter((q) => q.focus?.kind === "transition").length,
    7,
  );
  await configure(page, {
    mode: "m5",
    runMode: "continuous",
    targetPattern: "two",
    bpm: 240,
    beats: 1,
    gapBeats: 1,
  });
  await page.locator("#grading").waitFor({ state: "visible" });
  await page.locator("#trouble-steps input").nth(2).check();
  await page.locator("[data-grade=close]").click();
  const section = await startFocus("insights/m5?task=continuous-two");
  assert.equal(section.config.runMode, "continuous");
  assert.equal(
    section.questions.filter((q) => q.focus?.kind === "section").length,
    7,
  );
  await configure(page, { mode: "m6", phraseId: "landmarks", bpm: 240 });
  await page.waitForFunction(
    () => !document.getElementById("phrase-step").disabled,
  );
  await page.locator("#phrase-step").click();
  await page
    .locator("#stage-ratings button")
    .filter({ hasText: "correct" })
    .click();
  const stageBeforeGrade = await page.evaluate(async () => {
    const r = await import("/js/jazz/analytics/repository.js");
    await r.flush();
    return (await r.readAll("assessments")).filter(
      (e) => e.mode === "m6" && e.subtask === "stage-sing",
    );
  });
  assert.equal(stageBeforeGrade.length, 1);
  assert.equal((await session()).records.length, 0);
  await page.locator("#phrase-step").click();
  await page.locator("#phrase-marks button").first().click();
  await page.locator("#phrase-step").click();
  await ready(page);
  await page.locator("#reveal").click();
  await page.locator("[data-grade=close]").click();
  await openFocus("insights/m6");
  await page
    .getByLabel("Stage focus", { exact: true })
    .first()
    .selectOption("bass");
  await page
    .locator("#selected-cell")
    .getByRole("button", { name: "Practise 10", exact: true })
    .first()
    .click();
  await page.waitForURL(/#\/session\/[^/]+$/);
  assert.equal((await session()).config.phraseFocus, "bass");
  await page.locator("#start").click();
  await page.waitForFunction(
    () => !document.getElementById("phrase-step").disabled,
  );
  assert.match(await page.locator("#prompt").innerText(), /Listen/);
  await page.locator("#phrase-step").click();
  await page.locator("#bass-panel").waitFor({ state: "visible" });
  assert.match(await page.locator("#prompt").innerText(), /bass/);
  await page.locator("#phrase-step").click();
  await page.locator("[data-grade=correct]").click();
  assert.equal((await session()).records[0].config.phraseFocus, "bass");
  await configure(page, { mode: "m7", bassTask: "hear-play" });
  await ready(page);
  await page.locator("#reveal").click();
  await page.locator("[data-grade=missed]").click();
  await openFocus("insights/m7?task=hear-play");
  const position = page.getByLabel("Position focus", { exact: true }).first();
  await position.waitFor();
  const options = await position
    .locator("option")
    .evaluateAll((options) => options.map((o) => o.value).filter(Boolean));
  assert.ok(options.length >= 2);
  await position.selectOption(options[1]);
  await page
    .locator("#selected-cell")
    .getByRole("button", { name: "Practise 10", exact: true })
    .first()
    .click();
  await page.waitForURL(/#\/session\/[^/]+$/);
  const mapping = await session();
  assert.ok(mapping.config.bassString);
  await page.locator("#start").click();
  await ready(page);
  const required = JSON.parse(options[1]);
  await page
    .getByRole("button", {
      name: `${required.string} string, fret ${required.fret}`,
      exact: true,
    })
    .click();
  await page.locator("#lock-position").click();
  const mappingBeforeGrade = await page.evaluate(async () => {
    const r = await import("/js/jazz/analytics/repository.js");
    await r.flush();
    const current = JSON.parse(
      localStorage.getItem("jazzEarLab:v1:sessions"),
    ).at(-1);
    return (await r.readAll("assessments")).filter(
      (e) => e.sessionId === current.id && e.source === "visual",
    );
  });
  assert.equal(mappingBeforeGrade.length, 1);
  assert.equal((await session()).records.length, 0);
  await page.locator("#reveal").click();
  await page.locator("[data-grade=correct]").click();
  assert.equal(
    (await session()).records[0].analytics.position.midi,
    required.midi,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await navigate(page, "insights/m6?task=stage-sing");
  await page.locator(".aggregate-matrix table").first().waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: process.env.TEMP + "/jazz-insights-completion-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "Advanced Insights browser checks passed: quality pair, held MIDI, exact transitions, trouble sections, independently persisted stages, focus execution and string/fret mapping.",
  );
} finally {
  await browser.close();
}
