import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { labURL, ready, navigate } from "./browser-support.mjs";
import { supportedParent, now } from "./summary-fixtures.mjs";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
page.setDefaultTimeout(20000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const noOverflow = async () =>
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
const screenshot = (name) =>
  page.screenshot({ path: path.join(os.tmpdir(), "jazz-ux-" + name + ".png") });
try {
  await page.goto(labURL + "#/home");
  await page.locator(".quick-start").first().waitFor();
  assert.equal(await page.locator(".lab-tabs button:visible").count(), 4);
  assert.equal(await page.locator("#dashboard-overview").isVisible(), false);
  await screenshot("home-desktop");
  await page
    .locator(".quick-start")
    .first()
    .getByRole("button", { name: "Practice", exact: true })
    .click();
  await page.waitForURL(/#\/session\/[^/]+$/);
  assert.equal(await page.locator("#wizard-view").isVisible(), false);
  await page.getByText("Playing context", { exact: true }).waitFor();
  await ready(page);
  assert.equal(await page.locator("#session-state").innerText(), "Your turn");
  await page.locator("#replay").click();
  await page.getByText("Playing context", { exact: true }).waitFor();
  await ready(page);
  const prompt = await page.locator("#instruction").boundingBox(),
    dock = await page.locator(".practice-dock").boundingBox();
  assert.ok(
    dock.y - (prompt.y + prompt.height) < 200,
    "Desktop controls stay close to the current task",
  );
  const menu = page.locator("#session-menu");
  await menu.locator("summary").focus();
  await page.keyboard.press("Space");
  assert.equal(await menu.evaluate((e) => e.open), true);
  await page.keyboard.press("Escape");
  assert.equal(await menu.evaluate((e) => e.open), false);
  assert.equal(
    await menu.locator("summary").evaluate((e) => e === document.activeElement),
    true,
  );
  await page.locator("#pause").click();
  assert.equal(await page.locator("#session-state").innerText(), "Paused");
  await page.locator("#pause").click();
  await screenshot("session-desktop");
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await noOverflow();
    const exit = await page.locator("#session-exit").boundingBox(),
      trigger = await menu.locator("summary").boundingBox();
    assert.equal(
      Math.round(exit.y),
      Math.round(trigger.y),
      "Session actions remain on one header row",
    );
    assert.ok(trigger.width >= 44 && trigger.height >= 44);
    const reveal = await page.locator("#reveal").boundingBox();
    assert.ok(reveal.y + reveal.height <= 844);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await screenshot("session-mobile");
  await page.locator("#reveal").click();
  await menu.locator("summary").click();
  await page.locator("#favorite").click();
  assert.equal(await menu.evaluate((e) => e.open), false);
  assert.equal(
    await menu.locator("summary").evaluate((e) => e === document.activeElement),
    true,
  );
  await page.locator("[data-grade=correct]").click();
  await page.locator("#next").focus();
  await page.keyboard.press("n");
  await ready(page);
  assert.match(await page.locator("#session-progress").innerText(), /2/);
  await page.locator("#session-exit").click();
  await page
    .locator("#resume-list")
    .getByRole("button", { name: "Resume", exact: true })
    .waitFor();
  await navigate(page, "suggested");
  assert.equal(await page.locator("#dashboard-view").isVisible(), true);
  assert.equal(
    await page
      .locator("[data-dashboard=suggested]")
      .getAttribute("aria-selected"),
    "true",
  );
  await page.locator("#free-tab").focus();
  await page.keyboard.press("ArrowRight");
  await page.waitForURL(/#\/history$/);

  await page.clock.setFixedTime(new Date(now));
  await page.evaluate(async (rows) => {
    const r = await import("/js/jazz/analytics/repository.js");
    await r.clearInsights();
    for (const row of rows) await r.put("assessments", row);
  }, supportedParent());
  const preserved = await page.evaluate(() => ({
    sessions: localStorage.getItem("jazzEarLab:v1:sessions"),
    presets: localStorage.getItem("jazzEarLab:v1:savedPresets"),
  }));
  await page.setViewportSize({ width: 1366, height: 900 });
  await navigate(page, "insights/m1?days=all");
  await page.locator(".aggregate-matrix").waitFor();
  const primary = page
    .locator(".insight-focus-queue")
    .getByRole("button", {
      name: "Start Suggested Diagnostic · 10",
      exact: true,
    })
    .first();
  assert.ok(
    (await primary.boundingBox()).y >
      (await page.locator("#skill-stats").boundingBox()).y,
    "Targeted practice follows the matrix",
  );
  assert.ok(
    (await page.locator("#skill-stats").boundingBox()).y >
      (await page.locator(".insight-kpis").boundingBox()).y,
    "Aggregate evidence follows the reconciled KPI strip",
  );
  assert.equal(
    await page.locator(".insight-methodology").evaluate((e) => e.open),
    false,
  );
  assert.equal(
    await page
      .getByLabel("Insights exercise", { exact: true })
      .locator("option")
      .count(),
    9,
  );
  await screenshot("insights-desktop");
  await page.locator(".aggregate-matrix [data-cell-id]").first().click();
  const cell = page.locator("#selected-cell");
  await cell.waitFor();
  assert.equal(await cell.evaluate((e) => e.tagName), "SECTION");
  let leftInlinePanel = false;
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press("Tab");
    leftInlinePanel ||= await page.evaluate(
      () => !document.activeElement?.closest("#selected-cell"),
    );
  }
  assert.ok(
    leftInlinePanel,
    "The inline panel never traps normal Tab navigation",
  );
  await cell
    .getByRole("button", { name: "View Evidence", exact: true })
    .first()
    .click();
  const evidence = page.locator(".insight-evidence-panel");
  await evidence.waitFor();
  await evidence.press("Escape");
  assert.equal(await cell.isVisible(), true);
  await cell.press("Escape");
  await page.waitForFunction(() => !document.getElementById("selected-cell"));
  await page.waitForFunction(
    () => !!document.activeElement?.matches("[data-cell-id]"),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow();
  await page.evaluate(() => scrollTo(0, 0));
  assert.ok(
    await primary.count(),
    "Practice remains available after the matrix on mobile",
  );
  await screenshot("insights-mobile");
  await page.locator(".aggregate-matrix [data-cell-id]").first().click();
  await page.locator("#selected-cell").waitFor();
  await noOverflow();
  await screenshot("cell-mobile");
  await page.goBack();
  await page.waitForFunction(() => !document.getElementById("selected-cell"));
  assert.equal(await page.locator("dialog[open]").count(), 0);
  await page
    .getByLabel("Insights exercise", { exact: true })
    .selectOption("m2");
  await page.waitForURL(/#\/insights\/m2\?days=all$/);
  assert.equal(
    await page.getByLabel("Period", { exact: true }).inputValue(),
    "all",
  );
  assert.deepEqual(
    await page.evaluate(() => ({
      sessions: localStorage.getItem("jazzEarLab:v1:sessions"),
      presets: localStorage.getItem("jazzEarLab:v1:savedPresets"),
    })),
    preserved,
  );
  assert.deepEqual(errors, []);
  console.log(
    "UX refinement browser checks passed: quick starts, audio state, mobile controls, keyboard menus, canonical Insights order, inline nonmodal details and nested modal evidence without source mutation.",
  );
} finally {
  await browser.close();
}
