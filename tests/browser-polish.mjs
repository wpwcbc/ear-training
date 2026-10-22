import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { currentUI, asOf } from "./refinement-fixtures.mjs";
import { labURL, navigate, ready } from "./browser-support.mjs";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  timezoneId: "Asia/Hong_Kong",
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.clock.setFixedTime(new Date(asOf));
  await page.goto(labURL + "#/insights");
  await page.locator(".smart-summary").waitFor();
  await page.evaluate(async (rows) => {
    const r = await import("/js/jazz/analytics/repository.js");
    for (const e of rows) await r.put("assessments", e);
  }, currentUI());
  await navigate(page, "insights/m1?days=28");
  await page.locator(".aggregate-matrix").waitFor();
  const summary = await page.locator(".smart-summary").innerText();
  assert.match(summary, /101 of 112/);
  assert.match(summary, /10\/13.*12\/13/s);
  assert.match(summary, /positive observed result.*20\/20/s);
  assert.doesNotMatch(summary, /Tentative;/);
  const primary = page.locator(
    ".insight-focus-queue > .insight-recommendation .suggested-diagnostic",
  );
  assert.match(await primary.innerText(), /7 × 3 \+ 3 × ♭7/);
  const start = primary.locator(".suggested-start");
  assert.ok(await start.isEnabled());
  await mkdir("tests/fixtures/insights-polish", { recursive: true });
  for (const [width, height] of [
    [1440, 1000],
    [1920, 1080],
    [1280, 900],
    [1024, 900],
    [768, 900],
    [390, 844],
    [320, 740],
  ]) {
    await page.setViewportSize({ width, height });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `overflow ${width}`,
    );
    await page.screenshot({
      path: `tests/fixtures/insights-polish/m1-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .locator(".aggregate-matrix button")
    .filter({ has: page.locator("strong", { hasText: "77%" }) })
    .first()
    .click();
  await page.locator("#selected-cell .suggested-start").waitFor();
  await page.screenshot({
    path: "tests/fixtures/insights-polish/detail.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Table view", exact: true })
    .first()
    .click();
  await page.screenshot({
    path: "tests/fixtures/insights-polish/table.png",
    fullPage: true,
  });
  await navigate(page, "insights/m1?days=28&lang=zh-Hant");
  await page.locator(".suggested-start").first().waitFor();
  assert.doesNotMatch(
    await page.locator(".smart-summary").innerText(),
    /\bcorrect\b/,
  );
  assert.match(
    await page.locator(".insight-trend thead").first().innerText(),
    /本地日期.*正確.*比例/s,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "tests/fixtures/insights-polish/zh-Hant.png",
    fullPage: true,
  });
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.emulateMedia({
    forcedColors: "none",
    reducedMotion: "no-preference",
  });
  await navigate(page, "insights/m1?days=28");
  await start.waitFor();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await primary.getByRole("button", { name: "Customize", exact: true }).click();
  await primary.getByLabel("Lowest MIDI", { exact: true }).fill("60");
  await primary.getByLabel("Highest MIDI", { exact: true }).fill("60");
  await primary
    .getByRole("button", {
      name: "Validate customized diagnostic",
      exact: true,
    })
    .click();
  await primary.getByRole("alert").waitFor();
  assert.equal(await primary.locator(".suggested-start").count(), 0);
  assert.equal(
    await page.locator(".diagnostic-strip button").isDisabled(),
    true,
  );
  await page.screenshot({
    path: "tests/fixtures/insights-polish/error.png",
    fullPage: true,
  });
  await navigate(page, "insights/m1?days=28&metric=outcome");
  await start.waitFor();
  const planned = await primary.getAttribute("data-plan-id");
  const originalSource = await page.evaluate(async () => {
    const r = await import("/js/jazz/analytics/repository.js");
    return JSON.stringify(await r.readAll("assessments"));
  });
  await page.evaluate(() => {
    window.restoreStorage = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "jazzEarLab:v1:sessions")
        throw new Error("Diagnostic save failure fixture");
      return window.restoreStorage.call(this, key, value);
    };
  });
  await start.click();
  await primary.getByRole("alert").waitFor();
  assert.match(page.url(), /#\/insights/);
  await page.evaluate(() => {
    Storage.prototype.setItem = window.restoreStorage;
  });
  await start.evaluate((e) => {
    e.click();
    e.click();
  });
  await page.waitForURL(/#\/session\//);
  const launch = await page.evaluate(async () => {
    const r = await import("/js/jazz/analytics/repository.js");
    return {
      sessions: JSON.parse(localStorage.getItem("jazzEarLab:v1:sessions")),
      plans: await r.readAll("drillPlans"),
    };
  });
  assert.equal(launch.sessions.length, 1);
  const session = launch.sessions[0],
    plan = launch.plans.find((p) => p.id === planned);
  assert.deepEqual(session.questions, plan.questions);
  assert.equal(typeof plan.originScrollY, "number");
  assert.equal(
    session.questions.filter((q) => q.targets[0].degree === "3").length,
    7,
  );
  assert.equal(
    session.questions.filter((q) => q.targets[0].degree === "b7").length,
    3,
  );
  for (let i = 0; i < 10; i++) {
    await ready(page);
    await page.locator("#reveal").click();
    await page.locator("[data-grade=correct]").click();
    await page.locator("#next").click();
  }
  await page.waitForURL(/\/summary$/);
  await page
    .getByRole("button", { name: "Repeat diagnostic", exact: true })
    .waitFor();
  assert.match(
    await page.locator("#summary-view").innerText(),
    /10 diagnostic questions completed/,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Matched check", exact: true })
      .count(),
    0,
  );
  await page
    .getByRole("button", { name: "Return to this insight", exact: true })
    .click();
  await page.locator(".smart-summary").waitFor();
  await page.waitForFunction(
    (expected) => Math.abs(scrollY - expected) <= 1,
    plan.originScrollY,
  );
  const after = await page.evaluate(async () => {
    const r = await import("/js/jazz/analytics/repository.js");
    return r.readAll("assessments");
  });
  assert.equal(after.filter((e) => e.exposure === "targeted").length, 10);
  assert.equal(
    JSON.stringify(after.filter((e) => e.exposure !== "targeted")),
    originalSource,
  );
  assert.match(await page.locator(".insight-kpis").innerText(), /110/);
  assert.deepEqual(errors, []);
  console.log(
    "October22 polish: preview/launch parity, exact 7/3, one session, seven viewport screenshots passed.",
  );
} catch (error) {
  console.error(await page.locator("#summary-view").innerText());
  console.error(
    await page.evaluate(async () => {
      const r = await import("/js/jazz/analytics/repository.js");
      return {
        sessions: JSON.parse(
          localStorage.getItem("jazzEarLab:v1:sessions") || "[]",
        ).map((s) => ({
          id: s.id,
          source: s.source,
          plan: s.insightPlanId,
          origin: s.insightOrigin,
        })),
        plans: (await r.readAll("drillPlans")).map((p) => p.id),
      };
    }),
  );
  throw error;
} finally {
  await browser.close();
}
