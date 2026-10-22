import assert from "node:assert/strict";
import { currentUI, asOf, unknownIdentity } from "./refinement-fixtures.mjs";
import { navigate, openSummaryEvidence } from "./browser-support.mjs";
export async function checkRefinement(page) {
  await page.clock.setFixedTime(new Date(asOf));
  const seed = async (rows) =>
    page.evaluate(async (rows) => {
      const r = await import("/js/jazz/analytics/repository.js");
      await r.clearInsights();
      for (const e of rows) await r.put("assessments", e);
    }, rows);
  const stored = () =>
    page.evaluate(async () => {
      const r = await import("/js/jazz/analytics/repository.js");
      return JSON.stringify(
        (await r.readAll("assessments")).sort((a, b) => (a.id < b.id ? -1 : 1)),
      );
    });
  await seed(currentUI());
  const source = await stored();
  await navigate(page, "insights/m1?days=28");
  await page.locator(".aggregate-matrix").waitFor();
  const contrast = await page
    .locator(".aggregate-matrix [data-cell-id]")
    .evaluateAll((nodes) => {
      const luminance = (color) => {
        const rgb = color
          .match(/[\d.]+/g)
          .slice(0, 3)
          .map(Number)
          .map((x) => x / 255)
          .map((x) =>
            x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4,
          );
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
      };
      const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      return nodes.map((node) => {
        const s = getComputedStyle(node),
          bg = luminance(s.backgroundColor);
        return {
          text: ratio(luminance(s.color), bg),
          boundary: ratio(luminance(s.borderColor), bg),
        };
      });
    });
  assert.ok(
    contrast.every((c) => c.text >= 4.5 && c.boundary >= 3),
    "Matrix text and interactive boundaries meet contrast floors",
  );
  assert.match(
    await page.locator(".smart-summary").textContent(),
    /positive observed result.*20\/20/s,
  );
  assert.match(
    await page.locator(".smart-summary").textContent(),
    /10\/13.*12\/13|12\/13.*10\/13/s,
  );
  assert.match(
    await page.locator(".insight-kpis").innerText(),
    /101 correct.*0 close.*11 missed.*110.*2/s,
  );
  assert.match(
    await page.locator(".insight-scope").innerText(),
    /2026-09-25.*2026-10-22.*Asia\/Hong_Kong.*Mixed settings/,
  );
  assert.equal(await page.locator("#analytics-content pre").count(), 0);
  assert.equal(
    await page.getByRole("button", { name: /Export|Clear/ }).count(),
    0,
  );
  const daily = page.locator('.insight-trend[data-comparison="mixed"]').first();
  assert.equal(await daily.locator("canvas").count(), 0);
  assert.match(
    await daily.locator("table").innerText(),
    /23\/29.*79.3%.*76\/81.*93.8%/s,
  );
  const cell = page
    .locator(".aggregate-matrix [data-cell-id]")
    .filter({ has: page.locator("strong", { hasText: "77%" }) })
    .first();
  await cell.focus();
  assert.equal(await page.locator(".matrix-tooltip:visible").count(), 1);
  const tooltipBox = await page
    .locator(".matrix-tooltip:visible")
    .boundingBox();
  assert.ok(
    tooltipBox.y >= 0 &&
      tooltipBox.y + tooltipBox.height <=
        (await page.evaluate(() => innerHeight)),
    "Tooltip escapes the local scroll clip and stays in the viewport",
  );
  await cell.press("Escape");
  assert.equal(await page.locator(".matrix-tooltip:visible").count(), 0);
  const id = await cell.getAttribute("data-cell-id");
  await cell.press("Enter");
  await page.locator("#selected-cell").waitFor();
  const panel = page.locator("#selected-cell");
  assert.equal(await panel.evaluate((e) => e.tagName), "SECTION");
  assert.match(await panel.innerText(), /10 correct \/ 0 close \/ 3 missed/);
  const summary = await page.locator(".smart-summary").textContent();
  await page
    .getByRole("button", { name: "Table view", exact: true })
    .first()
    .click();
  assert.equal(
    await page
      .locator(`.aggregate-matrix [data-cell-id="${id}"]`)
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(await page.locator("#selected-cell").count(), 1);
  await page.getByLabel("Matrix table sort").selectOption("rate-asc");
  assert.match(
    await page.locator(".matrix-table-view thead").innerText(),
    /Correct \/ n.*Days \/ sessions/s,
  );
  const root = await panel
    .getByLabel("Root drilldown")
    .locator("option")
    .nth(1)
    .getAttribute("value");
  await panel.getByLabel("Root drilldown").selectOption(root);
  await page.waitForFunction(() =>
    document
      .getElementById("selected-cell")
      ?.textContent.includes("Detail scope: root"),
  );
  assert.equal(await page.locator(".smart-summary").textContent(), summary);
  await panel
    .getByRole("button", { name: "View Evidence", exact: true })
    .click();
  const modal = page.locator(".insight-evidence-panel");
  await modal.waitFor();
  assert.equal(await modal.evaluate((e) => e.matches(":modal")), true);
  assert.equal(await modal.locator("pre").count(), 0);
  await modal.press("Escape");
  assert.equal(await panel.isVisible(), true);
  await panel
    .getByRole("button", { name: "Apply root to page", exact: true })
    .click();
  await page.waitForURL(/root=/);
  await page.goBack();
  await panel.waitFor();
  assert.equal(await panel.getByLabel("Root drilldown").inputValue(), root);
  await panel.getByRole("button", { name: "Close cell", exact: true }).click();
  await page.waitForFunction(() => !document.getElementById("selected-cell"));
  assert.equal(
    await page
      .locator(`.aggregate-matrix [data-cell-id="${id}"]`)
      .evaluate((e) => document.activeElement === e),
    true,
  );
  await page
    .getByRole("button", { name: "Heatmap view", exact: true })
    .first()
    .click();
  for (const [width, height] of [
    [1440, 1000],
    [1920, 1080],
    [390, 844],
    [320, 740],
  ]) {
    await page.setViewportSize({ width, height });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    assert.ok(
      (await page.locator("#analytics-content").boundingBox()).width <= 1200,
    );
    const size = await page
      .locator(".aggregate-matrix [data-cell-id]")
      .first()
      .boundingBox();
    assert.ok(size.height >= 88);
    const wrap = page.locator(".aggregate-matrix").first();
    await wrap.evaluate((e) => {
      e.scrollLeft = e.scrollWidth;
    });
    assert.ok(
      await wrap.evaluate(
        (e) => e.scrollLeft + e.clientWidth >= e.scrollWidth - 2,
      ),
    );
    await wrap.evaluate((e) => {
      e.scrollLeft = 0;
    });
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: process.env.TEMP + `/jazz-refinement-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator(`.aggregate-matrix [data-cell-id="${id}"]`).click();
  await panel.waitFor();
  await page.screenshot({
    path: process.env.TEMP + "/jazz-refinement-cell-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await panel.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: process.env.TEMP + "/jazz-refinement-cell-mobile.png",
    fullPage: true,
  });
  await panel.getByRole("button", { name: "Close cell", exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  assert.equal(await stored(), source);
  await page
    .getByRole("link", { name: "Settings · Data & Diagnostics", exact: true })
    .click();
  await page
    .getByRole("heading", {
      name: "Settings · Data & Diagnostics",
      exact: true,
    })
    .waitFor();
  assert.match(
    await page.locator(".insight-health").innerText(),
    /113 imported\/captured assessments/,
  );
  const exported = await page.evaluate(async () => {
    const r = await import("/js/jazz/analytics/repository.js");
    return r.exportData();
  });
  await page.getByLabel("Import Insights backup").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(exported),
  });
  const confirm = page.getByRole("dialog", {
    name: "Import preview",
    exact: true,
  });
  await confirm.waitFor();
  assert.match(
    await confirm.innerText(),
    /0 new records.*overlapping IDs retained unchanged/,
  );
  assert.equal(
    await confirm
      .getByRole("button", { name: "Cancel", exact: true })
      .evaluate((e) => document.activeElement === e),
    true,
  );
  await confirm.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.equal(await stored(), source);
  await page.getByLabel("Import Insights backup").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(exported),
  });
  await confirm.waitFor();
  await Promise.all([
    page.waitForEvent("load"),
    confirm
      .getByRole("button", { name: "Confirm additive import", exact: true })
      .click(),
  ]);
  await page
    .getByRole("heading", {
      name: "Settings · Data & Diagnostics",
      exact: true,
    })
    .waitFor();
  assert.equal(await stored(), source);
  await page.getByLabel("Import Insights backup").setInputFiles({
    name: "corrupt.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
  await page
    .getByRole("alert")
    .filter({ hasText: "Import rejected" })
    .waitFor();
  assert.equal(await stored(), source);
  await page
    .getByRole("button", { name: "Clear Insights evidence", exact: true })
    .click();
  const deletion = page.getByRole("dialog", {
    name: "Clear Insights confirmation",
    exact: true,
  });
  await deletion.waitFor();
  assert.match(
    await deletion.innerText(),
    /113 captured\/imported assessments/,
  );
  assert.equal(
    await deletion
      .getByRole("button", { name: "Cancel", exact: true })
      .evaluate((e) => document.activeElement === e),
    true,
  );
  await deletion.press("Escape");
  await deletion.waitFor({ state: "detached" });
  assert.equal(
    await page
      .getByRole("button", { name: "Clear Insights evidence", exact: true })
      .evaluate((e) => document.activeElement === e),
    true,
    "Deletion cancellation restores the invoking control",
  );
  assert.equal(await stored(), source);
  await page
    .getByRole("button", { name: "Clear derived cache", exact: true })
    .click();
  assert.equal(await stored(), source);
  await navigate(page, "insights?days=28&focus=m1");
  await page.locator(".insight-mode-grid").waitFor();
  assert.equal(await page.locator(".insight-mode-grid > article").count(), 7);
  assert.equal(
    await page.locator(".insight-focused-mode .insight-decision").count(),
    0,
  );
  await seed(unknownIdentity());
  await navigate(page, "insights/m1?days=all");
  assert.match(await page.locator(".insight-kpis").innerText(), /Unavailable/);
  await page.locator(".aggregate-matrix").waitFor();
  assert.match(
    await page.locator(".aggregate-matrix").innerText(),
    /\?.*Identity unknown/s,
  );
  assert.equal(
    await page
      .locator(".aggregate-matrix [data-cell-id]")
      .first()
      .locator("strong")
      .innerText(),
    "?",
  );
  await page.evaluate(async () => {
    const r = await import("/js/jazz/analytics/repository.js");
    await r.clearInsights();
  });
  await openSummaryEvidence(page);
  await page
    .locator(".smart-summary")
    .getByRole("button", { name: /View Evidence/ })
    .first()
    .click();
  await page.locator(".insight-evidence-panel").waitFor();
  assert.match(
    await page.locator(".insight-evidence-panel").innerText(),
    /Evidence changed; refresh summary/,
  );
  assert.equal(await page.locator(".insight-evidence-panel table").count(), 0);
  await page.locator(".insight-evidence-panel").press("Escape");
  await seed(currentUI());
  await navigate(page, "insights/m1?days=28");
  await page.locator(".insight-focus-queue").waitFor();
  const action = page.locator(".insight-focus-queue > .insight-recommendation");
  assert.equal(
    await action.getByLabel("Practice setting scope", { exact: true }).count(),
    0,
  );
  await action
    .getByRole("button", {
      name: "Start Suggested Diagnostic · 10",
      exact: true,
    })
    .waitFor();
  const presets = await page.evaluate(() =>
    localStorage.getItem("jazzEarLab:v1:savedPresets"),
  );
  const count = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("jazzEarLab:v1:sessions") ?? "[]").length,
  );
  await action
    .getByRole("button", {
      name: "Start Suggested Diagnostic · 10",
      exact: true,
    })
    .evaluate((e) => {
      e.click();
      e.click();
    });
  await page.waitForURL(/#\/session\//);
  const session = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("jazzEarLab:v1:sessions")).at(-1),
  );
  assert.equal(session.questions.length, 10);
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("jazzEarLab:v1:sessions")).length,
    ),
    count + 1,
  );
  assert.equal(
    await page.evaluate(() =>
      localStorage.getItem("jazzEarLab:v1:savedPresets"),
    ),
    presets,
  );
  console.log(
    "Refinement S1 UI checks passed: exact two-day ledger, compact/table parity, inline local scope, nested evidence, settings cancel/import validation, mobile screenshots and one validated mixed-scope launch.",
  );
}
