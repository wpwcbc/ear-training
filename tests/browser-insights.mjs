import assert from "node:assert/strict";
import { configure, ready, navigate, labURL } from "./browser-support.mjs";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
page.setDefaultTimeout(15000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  await configure(page, {
    mode: "m1",
    degreePool: ["b3", "9"],
    qualityPool: ["m7"],
  });
  await ready(page);
  await page.locator("#reveal").click();
  await page.locator("[data-grade=missed]").click();
  await navigate(page, "insights/m1");
  await page.locator(".aggregate-matrix table").first().waitFor();
  const first = await page.evaluate(async () => {
    const r = await import("/js/jazz/analytics/repository.js");
    await r.flush();
    return r.readAll("assessments");
  });
  assert.equal(first.length, 1);
  assert.equal(first[0].version, "standard");
  assert.equal(first[0].assistance, "none");
  assert.ok(first[0].record.analytics.activeMs >= 0);
  await page.reload();
  await page.locator(".aggregate-matrix table").first().waitFor();
  assert.equal(
    await page.evaluate(async () => {
      const r = await import("/js/jazz/analytics/repository.js");
      return (await r.readAll("assessments")).length;
    }),
    1,
  );
  const savedBefore = await page.evaluate(() =>
    localStorage.getItem("jazzEarLab:v1:savedPresets"),
  );
  // A lone miss is coverage, not an automatic weakness. Explicit cell review
  // remains available with the original 7/3 focused generator.
  await page.locator(".aggregate-matrix [data-cell-id]").first().click();
  await page
    .locator("#selected-cell")
    .getByRole("button", { name: "Inspect", exact: true })
    .first()
    .click();
  await page
    .locator("#selected-cell")
    .getByRole("button", { name: "Practise 10", exact: true })
    .first()
    .click();
  await page.waitForURL(/#\/session\/[^/]+$/);
  const drill = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("jazzEarLab:v1:sessions")).at(-1),
  );
  assert.equal(await page.locator("dialog[open]").count(), 0);
  assert.notEqual(drill.id, first[0].sessionId);
  assert.equal(drill.questions.length, 10);
  assert.ok(drill.insightPlanId);
  assert.match(drill.insightOrigin, /^insights\/m1\?cell=/);
  const focus = first[0].record.targets[0];
  assert.equal(
    drill.questions.filter((q) => q.targets[0].degree === focus).length,
    7,
  );
  assert.equal(
    await page.evaluate(() =>
      localStorage.getItem("jazzEarLab:v1:savedPresets"),
    ),
    savedBefore,
  );
  await ready(page);
  await page.locator("#reveal").click();
  await page.locator("[data-grade=correct]").click();
  await navigate(page, "insights/m1");
  await page.locator(".aggregate-matrix table").first().waitFor();
  const stored = await page.evaluate(async () => {
    const r = await import("/js/jazz/analytics/repository.js");
    await r.flush();
    return r.readAll("assessments");
  });
  assert.equal(stored.filter((e) => e.exposure === "targeted").length, 1);
  await configure(page, { mode: "m7", bassTask: "hear-play" });
  await ready(page);
  const position = await page.evaluate(async () => {
    const s = JSON.parse(localStorage.getItem("jazzEarLab:v1:sessions")).at(-1),
      { bassPositions } = await import("/js/jazz/bass.js");
    return bassPositions(
      s.questions[0].targets[0].midi,
      s.config.fretLow,
      s.config.fretHigh,
    )[0];
  });
  await page
    .getByRole("button", {
      name: `${position.string} string, fret ${position.fret}`,
      exact: true,
    })
    .click();
  await page.locator("#lock-position").click();
  await page.locator("#reveal").click();
  await page.locator("[data-grade=close]").click();
  await navigate(page, "insights/m7?task=hear-play");
  await page
    .getByRole("heading", { name: "Visual mapping", exact: true })
    .waitFor();
  assert.match(
    await page.locator("#analytics-content").innerText(),
    /Exact MIDI/,
  );
  await configure(page, { mode: "m4", revealMode: "manual" });
  await ready(page);
  await page.locator("#ready-declared").click();
  await page.locator("#reveal").click();
  await page.locator("[data-grade=correct]").click();
  await navigate(page, "insights/m4");
  await page.locator(".aggregate-matrix table").first().waitFor();
  await page.getByText("Transition readiness", { exact: true }).click();
  assert.match(
    await page.locator("#analytics-content").innerText(),
    /Declared/,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: process.env.TEMP + "/jazz-insights-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.evaluate(async (evidence) => {
    const r = await import("/js/jazz/analytics/repository.js");
    const prior = structuredClone(evidence);
    prior.id = "synthetic-prior";
    prior.sessionId = "synthetic-prior";
    prior.questionId = "synthetic-prior:q0";
    prior.createdAt = new Date(Date.now() - 30 * 86400000).toISOString();
    prior.record.timestamp = prior.createdAt;
    await r.put("assessments", prior);
  }, first[0]);
  await navigate(page, "insights/m1");
  await page.locator(".insight-trend table").first().waitFor();
  assert.equal(
    await page.locator(".insight-trend canvas:visible").count(),
    0,
    "Sparse days use a daily table, not a misleading chart",
  );
  await page.screenshot({
    path: process.env.TEMP + "/jazz-insights-trends.png",
    fullPage: true,
  });
  await navigate(page, "insights");
  await page.locator(".insight-mode-grid").waitFor();
  await page.screenshot({
    path: process.env.TEMP + "/jazz-insights-desktop.png",
    fullPage: true,
  });
  const backup = await page.evaluate(async () => {
    const r = await import("/js/jazz/analytics/repository.js");
    await r.flush();
    return r.exportData();
  });
  const backupData = JSON.parse(backup);
  assert.equal(backupData.version, 1);
  assert.ok(backupData.events.length > backupData.assessments.length);
  const result = await page.evaluate(async (text) => {
    const r = await import("/js/jazz/analytics/repository.js"),
      { loadSessions } = await import("/js/jazz/model.js");
    const original = localStorage.getItem("jazzEarLab:v1:sessions");
    await r.clearInsights();
    const cleared = await r.reconcile(loadSessions(localStorage));
    await r.importData(text);
    await r.importData(text);
    const restored = await r.readAll("assessments");
    localStorage.setItem("jazzEarLab:v1:sessions", "[]");
    await r.reconcile([]);
    const retained = await r.readAll("assessments");
    localStorage.setItem("jazzEarLab:v1:sessions", original);
    let failed = false;
    try {
      await r.importData('{"version":99}');
    } catch {
      failed = true;
    }
    return {
      cleared: cleared.length,
      restored: restored.length,
      retained: retained.length,
      preserved: original === localStorage.getItem("jazzEarLab:v1:sessions"),
      failed,
    };
  }, backup);
  assert.equal(result.cleared, 0);
  assert.equal(result.restored, backupData.assessments.length);
  assert.equal(result.retained, result.restored);
  assert.equal(result.preserved, true);
  assert.equal(result.failed, true);
  assert.deepEqual(errors, []);
  console.log(
    "Insights browser checks passed: capture, reload identity, 7/3 drill, preset isolation, M4 readiness, bass lock, responsive pages, backup and retention.",
  );
} finally {
  await browser.close();
}
