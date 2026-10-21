import assert from "node:assert/strict";
import { configure, ready, navigate, labURL } from "./browser-support.mjs";
import { assessment, supportedParent, now } from "./summary-fixtures.mjs";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
page.setDefaultTimeout(20000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
async function replace(rows) {
  await page.evaluate(async (rows) => {
    const r = await import("/js/jazz/analytics/repository.js");
    await r.clearInsights();
    for (const row of rows) await r.put("assessments", row);
  }, rows);
}
try {
  await configure(page, {
    mode: "m2",
    degreePool: ["9"],
    recognitionPool: "9",
    responseDistractors: "1 5 b7",
  });
  await ready(page);
  const options = await page
    .locator("#choices select option")
    .evaluateAll((items) => items.map((i) => i.value).filter(Boolean));
  assert.deepEqual(new Set(options), new Set(["1", "5", "b7", "9"]));
  await page.locator("#choices select").selectOption("9");
  await page.locator("#reveal").click();
  await page.waitForFunction(async () => {
    const r = await import("/js/jazz/analytics/repository.js");
    await r.flush();
    return (await r.readAll("assessments")).some(
      (e) =>
        e.record.analytics?.choicePolicy?.kind === "tested-label-substitution",
    );
  });
  const capture = await page.evaluate(async () => {
    const r = await import("/js/jazz/analytics/repository.js");
    return (await r.readAll("assessments")).find(
      (e) => e.record.analytics?.choicePolicy,
    )?.record.analytics;
  });
  assert.equal(capture.choicePolicy.version, "recognition-choice-family-1");
  assert.equal(capture.choicePolicy.counts[0], 4);
  assert.deepEqual(capture.choicePolicy.distractors, ["1", "5", "b7"]);
  await page.clock.setFixedTime(new Date(now));
  await replace([
    ...supportedParent(),
    ...Array.from({ length: 50 }, (_, i) =>
      assessment(i + 100, {
        quality: "7",
        root: ["D", "G", "C", "F", "A"][Math.floor(i / 10)],
      }),
    ),
  ]);
  await navigate(page, "insights/m1?days=all");
  await page.locator(".degree-strip summary").click();
  await page.locator(".degree-strip button").waitFor();
  assert.match(
    await page.locator(".degree-strip").innerText(),
    /Supported strata/,
  );
  await page.locator(".degree-strip button").focus();
  await page.keyboard.press("Enter");
  assert.match(
    await page.locator("#selected-cell").innerText(),
    /Practised quality/,
  );
  await page.locator("#selected-cell").press("Escape");
  await page.locator(".mixed-history summary").click();
  const mixed = page.locator('.insight-trend[data-comparison="mixed"]').first();
  await mixed.getByText("Daily dot plot", { exact: true }).click();
  await mixed.locator("canvas").waitFor();
  assert.match(
    await mixed.locator("figcaption").innerText(),
    /not evidence of improvement/,
  );
  assert.match(
    await mixed.locator("table").innerText(),
    /Mixed settings; descriptive only/,
  );
  assert.doesNotMatch(await mixed.locator("table").innerText(), /Wilson/);
  const a = assessment(0, { mode: "m2", degree: "9", grade: "correct" });
  const b = assessment(1, { mode: "m2", degree: "9", grade: "missed" });
  b.record.selectedDegrees = ["11"];
  await replace([a, b]);
  await navigate(page, "insights/m2?days=all");
  await page
    .getByText("Recognition components and confusions", { exact: true })
    .click();
  const grid = page.locator("#confusion-matrices .diagnostic-grid").first();
  await grid.locator("table").waitFor();
  assert.match(await grid.innerText(), /1\/2 \(50%\).*Correct/s);
  const numbers = await grid.locator("tbody").innerText();
  const heat = await grid
    .locator(".matrix-value")
    .first()
    .evaluate((e) => getComputedStyle(e).backgroundColor);
  await grid.getByRole("button", { name: "Table view", exact: true }).click();
  const plain = await grid
    .locator(".matrix-value")
    .first()
    .evaluate((e) => getComputedStyle(e).backgroundColor);
  assert.notEqual(heat, plain);
  assert.equal(await grid.locator("tbody").innerText(), numbers);
  await grid.locator(".matrix-value").first().focus();
  await page.keyboard.press("Enter");
  await page.locator(".insight-evidence-panel").waitFor();
  await page.locator(".insight-evidence-panel").press("Escape");
  await page.evaluate(() =>
    localStorage.setItem(
      "eartrain:chordQuality:questionHistory",
      JSON.stringify([
        {
          chordQuality: "m6m7b5",
          chordVoicing: "closed",
          chordInversion: 0,
          playbackMode: "stacked",
          attempts: 1,
        },
        {
          chordQuality: "m6m7b5",
          chordVoicing: "closed",
          chordInversion: 1,
          playbackMode: "arpeggiated",
          attempts: 3,
        },
      ]),
    ),
  );
  await navigate(page, "insights/legacy");
  const legacy = page.locator(".diagnostic-grid").filter({
    has: page.getByRole("heading", {
      name: "chord-quality · retained solved rows",
      exact: true,
    }),
  });
  await legacy.waitFor();
  assert.match(await legacy.innerText(), /m6m7b5/);
  assert.match(await legacy.innerText(), /1\/2 \(50%\)/);
  await page.getByLabel("Legacy Inversion", { exact: true }).selectOption("1");
  await page.waitForURL(/cq-inversion=1/);
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".diagnostic-grid")].some((e) =>
      e.textContent.includes("0/1 (0%)"),
    ),
  );
  assert.match(await legacy.innerText(), /0\/1 \(0%\)/);
  await legacy.locator(".matrix-value").click();
  assert.match(
    await page.locator("#analytics-content").innerText(),
    /eartrain:chordQuality:questionHistory\[1\]/,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Insights refinement browser checks passed: actual M2 choices/capture, supported L1, mixed descriptive trends, confusion table/heatmap/evidence and filtered legacy provenance.",
  );
} finally {
  await browser.close();
}
