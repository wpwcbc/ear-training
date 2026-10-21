import assert from "node:assert/strict";
import { navigate, labURL } from "./browser-support.mjs";
import {
  screenshot113,
  supportedParent,
  assessment,
  now,
} from "./summary-fixtures.mjs";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
page.setDefaultTimeout(20000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.clock.setFixedTime(new Date(now));
  await page.goto(labURL + "#/insights");
  await page.locator(".smart-summary").waitFor();
  const original = await page.evaluate(() => ({
    sessions: localStorage.getItem("jazzEarLab:v1:sessions"),
    presets: localStorage.getItem("jazzEarLab:v1:savedPresets"),
  }));
  await page.evaluate(async (rows) => {
    const r = await import("/js/jazz/analytics/repository.js");
    for (const e of rows) await r.put("assessments", e);
  }, screenshot113());
  await navigate(page, "insights/m1?days=all");
  await page.locator("#skill-stats table").waitFor();
  await page.getByText("How these counts reconcile", { exact: true }).click();
  assert.match(
    await page.locator("#analytics-content").innerText(),
    /113 retained rows.*112 non-skipped ratings.*110 independent diagnostic questions/,
  );
  assert.equal(
    await page.locator(".insight-advanced").evaluate((e) => e.open),
    false,
  );
  assert.ok((await page.locator(".insight-recommendation").count()) <= 3);
  assert.ok(
    await page.evaluate(
      () =>
        document.querySelector(".smart-summary").getBoundingClientRect().top <
        document.getElementById("skill-stats").getBoundingClientRect().top,
    ),
  );
  assert.equal(
    await page
      .getByText("Standardized timing not recorded for these results.", {
        exact: true,
      })
      .count(),
    1,
  );
  assert.equal(
    await page
      .getByText(
        "Outcome results are available. No matched prior period is available for this selection.",
        { exact: true },
      )
      .count(),
    1,
  );
  assert.equal(await page.locator(".insight-trend canvas").count(), 0);
  // Citation values resolve to actual IDs; reference export is not a remote service.
  await page
    .locator(".smart-summary")
    .getByRole("button", { name: /View Evidence/ })
    .first()
    .click();
  assert.ok(await page.locator(".insight-evidence-panel").count());
  await page.locator(".insight-evidence-panel").press("Escape");
  assert.equal(await page.locator(".insight-evidence-panel").count(), 0);
  await page.locator(".aggregate-matrix [data-cell-id]").first().focus();
  await page.keyboard.press("Enter");
  await page.locator("#selected-cell").waitFor();
  assert.ok((await page.locator("#selected-cell tbody tr").count()) <= 17);
  await page.locator("#selected-cell").press("Escape");
  await page.waitForFunction(() => !document.getElementById("selected-cell"));
  // Fully supported parent beats all sparse children and remains at most three actions.
  await page.evaluate(async (rows) => {
    const r = await import("/js/jazz/analytics/repository.js");
    await r.clearInsights();
    for (const e of rows) await r.put("assessments", e);
  }, supportedParent());
  await page.reload();
  await page.locator(".insight-recommendation").waitFor();
  assert.equal(
    await page
      .locator(".insight-recommendation")
      .first()
      .getAttribute("data-certainty"),
    "supported",
  );
  assert.match(await page.locator(".smart-summary").innerText(), /25\/50/);
  // Route-preserved selection and locale change facts without changing evidence identity.
  await page.locator(".insight-advanced summary").click();
  await page
    .getByLabel("Summary language", { exact: true })
    .selectOption("zh-Hant");
  await page.locator(".smart-summary").waitFor();
  assert.match(await page.locator(".smart-summary").innerText(), /自評/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: process.env.TEMP + "/jazz-smart-summary-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "";
  });
  await page.setViewportSize({ width: 1366, height: 900 });
  await navigate(page, "insights?days=all&lang=zh-Hant");
  await page.locator(".insight-mode-grid").waitFor();
  assert.equal(await page.locator(".insight-mode-grid article").count(), 7);
  assert.ok((await page.locator(".insight-recommendation").count()) <= 3);
  await page.screenshot({
    path: process.env.TEMP + "/jazz-smart-summary-desktop.png",
    fullPage: true,
  });
  const preserved = await page.evaluate(() => ({
    sessions: localStorage.getItem("jazzEarLab:v1:sessions"),
    presets: localStorage.getItem("jazzEarLab:v1:savedPresets"),
  }));
  assert.deepEqual(preserved, original);
  const manyContexts = Array.from({ length: 300 }, (_, i) =>
    assessment(i, {
      config: { bpm: 40 + (i % 201), inversion: Math.floor(i / 201) },
    }),
  );
  await page.evaluate(async (rows) => {
    const r = await import("/js/jazz/analytics/repository.js");
    await r.clearInsights();
    for (const e of rows) await r.put("assessments", e);
  }, manyContexts);
  await navigate(page, "insights/m1?days=all");
  await page.locator("#skill-stats table").waitFor();
  assert.equal(await page.locator("#skill-stats tbody tr").count(), 1);
  await page.locator(".aggregate-matrix [data-cell-id]").first().click();
  await page.locator("#selected-cell").waitFor();
  const contexts = page.locator("#selected-cell .insight-paged");
  assert.match(await contexts.innerText(), /300 of 300 exact contexts/);
  assert.equal(await contexts.locator("tbody tr").count(), 12);
  await contexts.getByRole("button", { name: "Next", exact: true }).click();
  assert.match(await contexts.innerText(), /page 2\/25/);
  await contexts.getByRole("searchbox").fill("nonexistent");
  assert.match(await contexts.innerText(), /0 of 300/);
  await page
    .locator("#selected-cell")
    .getByRole("button", { name: "Close cell", exact: true })
    .click();
  await page.getByText("Evidence table (300)", { exact: true }).click();
  const assessments = page
    .locator("#analytics-content > details")
    .filter({ has: page.getByText("Evidence table (300)", { exact: true }) });
  assert.equal(await assessments.locator("tbody tr").count(), 25);
  const workerCheck = await page.evaluate(async (base) => {
    const { computeSummary } =
      await import("/js/jazz/analytics/summary/client.js");
    const history = Array.from({ length: 10000 }, (_, i) => ({
      ...base,
      id: "bench:" + i,
      questionId: "bench:q" + i,
      sessionId: "bench:s" + (i % 5),
      createdAt: new Date(Date.now() - (i % 5) * 86400000).toISOString(),
      record: { ...base.record, grade: i % 2 ? "correct" : "missed" },
    }));
    const q = {
      mode: "m1",
      subtask: "produce",
      source: "self",
      metricId: "outcome",
      startInclusive: null,
      endExclusive: new Date().toISOString(),
      timezone: "Asia/Hong_Kong",
      exposure: "fresh",
      assistance: "none",
      dataVersions: ["standard", "historical"],
      contextFilters: {},
    };
    let ticks = 0;
    const timer = setInterval(() => ticks++, 20),
      start = performance.now();
    const model = await computeSummary(history, q, Date.now(), history);
    clearInterval(timer);
    return {
      ticks,
      elapsedMs: Math.round(performance.now() - start),
      n: model.reconciliation.diagnostic,
    };
  }, assessment(0));
  assert.equal(workerCheck.n, 10000);
  assert.ok(workerCheck.ticks > 2);
  console.log("10k background-worker responsiveness:", workerCheck);
  assert.deepEqual(errors, []);
  console.log(
    "Smart Summary browser checks passed: reconciliation, cautious priorities, citations, matrix drilldown/keyboard, locale, compact overview, unavailable capabilities, mobile and source preservation.",
  );
} finally {
  await browser.close();
}
