import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { labURL, navigate, ready } from "./browser-support.mjs";
import { currentUI, asOf } from "./refinement-fixtures.mjs";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  timezoneId: "Asia/Hong_Kong",
});
page.setDefaultTimeout(15000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const screenshots = join(tmpdir(), "eartrain-critique-fixes");
await mkdir(screenshots, { recursive: true });
async function capture(name) {
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
    false,
    name + " must not overflow",
  );
  if (process.env.CRITIQUE_SCREENSHOTS)
    await page.screenshot({
      path: join(screenshots, name + ".png"),
      fullPage: true,
    });
}
const evidence = () =>
  page.evaluate(async () => {
    const { readAll } = await import("/js/jazz/analytics/repository.js");
    return JSON.stringify(await readAll("assessments"));
  });
try {
  await page.goto(labURL + "#/home");
  await page.locator("#mode-library").waitFor();
  assert.equal(await page.locator("#configuration-list article").count(), 0);
  assert.equal(
    await page.locator("#dashboard-recent").getAttribute("aria-selected"),
    "true",
  );
  for (const selector of [
    "#app-nav-toggle",
    "#app-theme",
    "#mode-library button",
  ]) {
    const box = await page.locator(selector).first().boundingBox();
    assert.ok(
      box.width >= 44 && box.height >= 44,
      selector + " needs a 44px hit area",
    );
  }
  await capture("home-mobile");
  await page.getByRole("button", { name: "Browse quick starts" }).click();
  assert.equal(await page.locator(".quick-start").count(), 3);
  assert.equal(
    await page.locator("#dashboard-suggested").getAttribute("aria-selected"),
    "true",
  );
  await page.locator("#dashboard-recent").click();
  assert.equal(await page.locator("#configuration-list article").count(), 0);
  await page.locator("#start-practicing").click();
  const description = page
    .locator("#exercise-list .exercise-description")
    .first();
  const choice = page.locator("#exercise-list .exercise-choice").first();
  assert.ok((await choice.boundingBox()).height >= 100);
  await capture("exercise-choice-mobile");
  await description.click();
  await page.waitForURL(/#\/setup\/2$/);
  const qualities = page.getByRole("group", {
    name: "Chord Qualities",
    exact: true,
  });
  assert.equal(await qualities.locator("input:visible").count(), 4);
  const advanced = qualities.locator(".advanced-qualities");
  assert.equal(await advanced.evaluate((e) => e.open), false);
  await capture("harmony-common-mobile");
  await advanced.locator("summary").click();
  assert.equal(await qualities.locator("input:visible").count(), 19);
  await qualities.locator("input[value=mmaj7]").check();
  await advanced.locator("summary").click();
  assert.match(await advanced.locator("summary").innerText(), /1 selected/);
  await qualities.locator("input[value='7']").uncheck();
  assert.ok(
    await page.evaluate(() =>
      JSON.parse(
        localStorage.getItem("jazzEarLab:v1:wizardDraft"),
      ).config.qualityPool.includes("mmaj7"),
    ),
    "Hidden advanced selections must survive common-quality edits",
  );
  await page.reload();
  assert.equal(
    await advanced.evaluate((e) => e.open),
    true,
    "An existing advanced selection must be visible on return",
  );
  assert.equal(await qualities.locator("input[value=mmaj7]").isChecked(), true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await capture("harmony-selected-advanced-desktop");
  await page.clock.setFixedTime(new Date(asOf));
  await page.evaluate(async (rows) => {
    const { put } = await import("/js/jazz/analytics/repository.js");
    for (const row of rows) await put("assessments", row);
  }, currentUI());
  const original = await evidence();
  await navigate(page, "insights/m1?days=28");
  await page.locator(".aggregate-matrix").waitFor();
  const full = page.locator(".summary-evidence");
  assert.equal(await full.evaluate((e) => e.open), false);
  assert.match(
    await page.locator(".smart-summary").textContent(),
    /101 of 112/,
  );
  assert.match(
    await page.locator(".diagnostic-overview").innerText(),
    /10\/13/,
  );
  assert.match(
    await page.locator(".diagnostic-caveat").innerText(),
    /not measured singing accuracy/,
  );
  assert.equal(
    await page.locator(".diagnostic-overview").getAttribute("data-grain"),
    "answer",
  );
  assert.equal(
    await page.locator(".insight-cell-detail").count(),
    0,
    "Unselected details must not consume matrix width",
  );
  const matrix = page.locator(".aggregate-matrix").first();
  const nav = page.locator(".matrix-navigation").first();
  await capture("insights-desktop-light");
  for (const theme of ["light", "dark"]) {
    if ((await page.locator("html").getAttribute("data-theme")) !== theme)
      await page.locator("#app-theme").click();
    await page.waitForTimeout(200);
    for (const width of [1920, 1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
      const box = await page.locator(".diagnostic-strip button").boundingBox();
      assert.ok(
        box.y >= 0 && box.y + box.height <= (width < 768 ? 844 : 1000),
        "The suggested action must be in the first viewport at " + width,
      );
      await capture("insights-" + theme + "-" + width);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await nav.waitFor({ state: "visible" });
  assert.equal(
    await nav
      .locator("button")
      .first()
      .evaluate((e) => getComputedStyle(e).fontSize),
    "0px",
    "Column navigation must use labelled arrow icons, not clipped text",
  );
  await nav.getByRole("button", { name: "Next columns", exact: true }).click();
  await page.waitForFunction(
    () => document.querySelector(".aggregate-matrix").scrollLeft > 0,
  );
  await matrix.evaluate((e) => {
    e.scrollLeft = e.scrollWidth;
  });
  await page.waitForFunction(
    () =>
      document.querySelector(".matrix-navigation button:last-child").disabled,
  );
  assert.match(await nav.locator(".matrix-column-range").innerText(), /13/);
  await nav
    .getByRole("button", { name: "Previous columns", exact: true })
    .click();
  await full.locator(":scope > summary").click();
  assert.match(await full.innerText(), /101 of 112.*10\/13.*12\/13.*20\/20/s);
  await full
    .getByRole("button", { name: /View Evidence/ })
    .first()
    .click();
  await page.locator(".insight-evidence-panel").waitFor();
  await page.locator(".insight-evidence-panel").press("Escape");
  await full.locator(":scope > summary").click();
  await matrix.locator(".matrix-value[data-cell-id]").first().click();
  await page.locator("#selected-cell").waitFor();
  await page.locator("#selected-cell").press("Escape");
  await page.waitForFunction(() => !document.getElementById("selected-cell"));
  assert.equal(await page.locator(".insight-cell-detail").count(), 0);
  await page
    .getByRole("button", { name: "Table view", exact: true })
    .first()
    .click();
  await page.getByLabel("Matrix table sort").selectOption("rate-asc");
  assert.match(await page.locator(".matrix-table-view").innerText(), /10\/13/);
  assert.equal(
    await evidence(),
    original,
    "Presentation changes must preserve the source evidence",
  );
  await navigate(page, "insights/m1?days=28&lang=zh-Hant");
  await page.locator(".summary-evidence").waitFor();
  assert.match(await page.locator(".smart-summary > h3").innerText(), /建議/);
  assert.match(await page.locator(".diagnostic-caveat").innerText(), /自評/);
  await capture("insights-mobile-zh");
  await page.evaluate(() => {
    window.originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "jazzEarLab:v1:sessions")
        throw new Error("Diagnostic save failure fixture");
      return window.originalSetItem.call(this, key, value);
    };
  });
  await page.locator(".diagnostic-strip button").click();
  await page
    .locator(".diagnostic-strip .forwarded-error[role=alert]")
    .waitFor();
  assert.match(
    await page.locator(".diagnostic-strip .forwarded-error").innerText(),
    /Diagnostic save failure fixture/,
  );
  assert.match(page.url(), /#\/insights/);
  await page.evaluate(() => {
    Storage.prototype.setItem = window.originalSetItem;
  });
  await page.locator(".diagnostic-strip button").click();
  await page.waitForURL(/#\/session\/[^/]+$/);
  await ready(page);
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("jazzEarLab:v1:sessions")).length,
    ),
    1,
    "The leading action launches one validated session",
  );
  assert.equal(await evidence(), original);
  await page.locator("#session-exit").click();
  assert.deepEqual(errors, []);
  console.log(
    "Critique fixes passed: clean Recent/Quick starts, full-card selection, 44px targets, complete/preserved advanced qualities, action-first bilingual Insights, evidence disclosure, matrix navigation/detail/table and unchanged source data. Screenshots: " +
      screenshots,
  );
} finally {
  await browser.close();
}
