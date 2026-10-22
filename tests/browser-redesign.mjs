import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { configure, ready, navigate, labURL } from "./browser-support.mjs";
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
  viewport: { width: 1440, height: 1000 },
  timezoneId: "Asia/Hong_Kong",
});
const errors = [],
  failedAssets = [],
  overflows = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("response", (response) => {
  if (response.status() >= 400 && /\.(svg|js|css)$/.test(response.url()))
    failedAssets.push(response.url());
});
const folder = join(tmpdir(), "eartrain-redesign");
await mkdir(folder, { recursive: true });
async function capture(name) {
  await page.evaluate(() => document.fonts.ready);
  if (
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    )
  ) {
    overflows.push([
      name,
      await page.evaluate(() =>
        Array.from(document.querySelectorAll("main *"))
          .filter(
            (e) =>
              e.getBoundingClientRect().right > innerWidth + 1 &&
              getComputedStyle(e).position !== "absolute",
          )
          .slice(0, 8)
          .map((e) => [e.tagName, e.id, e.className]),
      ),
    ]);
  }
  if (
    process.env.REDESIGN_SCREENSHOTS &&
    !(
      process.env.REDESIGN_SCREENSHOTS === "remaining" &&
      /^(home|wizard|drawer|history)/.test(name)
    )
  )
    await page.screenshot({
      path: join(folder, name + ".png"),
      fullPage: true,
    });
}
async function theme(value) {
  if ((await page.locator("html").getAttribute("data-theme")) !== value)
    await page.locator("#app-theme").click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), value);
  await page.waitForTimeout(200);
}
async function contrast() {
  const failures = await page.evaluate(() => {
    const rgb = (color) => color.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0];
    const luminance = (values) =>
      values
        .slice(0, 3)
        .map((v) => v / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
        .reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0);
    return Array.from(
      document.querySelectorAll(
        ".app-nav-link, .mode-card p, .mode-card small, .dashboard-tabs button, .insight-citation, .suggested-start, .insight-recommendation button",
      ),
    )
      .filter((e) => e.checkVisibility() && !e.disabled)
      .map((e) => {
        let parent = e;
        while (
          parent.parentElement &&
          rgb(getComputedStyle(parent).backgroundColor)[3] === 0
        )
          parent = parent.parentElement;
        const foreground = luminance(rgb(getComputedStyle(e).color));
        const background = luminance(
          rgb(getComputedStyle(parent).backgroundColor),
        );
        return {
          name: e.textContent.trim().slice(0, 65),
          ratio:
            (Math.max(foreground, background) + 0.05) /
            (Math.min(foreground, background) + 0.05),
        };
      })
      .filter((e) => e.ratio < 4.5);
  });
  assert.deepEqual(failures, [], "Text contrast: " + JSON.stringify(failures));
}
try {
  await page.goto(labURL);
  await page.locator("#mode-library article").first().waitFor();
  assert.equal(await page.locator("#mode-library article").count(), 7);
  const before = await page.evaluate(() => ({ ...localStorage }));
  await theme("light");
  await contrast();
  await capture("home-desktop-light");
  await theme("dark");
  await contrast();
  await capture("home-desktop-dark");
  assert.deepEqual(
    await page.evaluate(() =>
      Object.fromEntries(
        Object.entries(localStorage).filter(([k]) => k !== "earTrain:ui:theme"),
      ),
    ),
    Object.fromEntries(
      Object.entries(before).filter(([k]) => k !== "earTrain:ui:theme"),
    ),
  );
  await page.reload();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  for (const width of [1920, 1280, 1024, 768, 640, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await capture("home-" + width);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#app-nav-toggle").click();
  assert.equal(
    await page.locator("#app-sidebar").evaluate((e) => e.inert),
    false,
  );
  await capture("drawer-mobile");
  await page.keyboard.press("Escape");
  assert.equal(
    await page.locator("#app-sidebar").evaluate((e) => e.inert),
    true,
  );
  assert.equal(
    await page
      .locator("#app-nav-toggle")
      .evaluate((e) => e === document.activeElement),
    true,
  );
  await page.locator("#app-nav-toggle").click();
  await page.locator(".app-sidebar a").last().focus();
  await page.keyboard.press("Tab");
  assert.equal(
    await page
      .locator(".app-brand")
      .evaluate((e) => e === document.activeElement),
    true,
  );
  await page.locator(".app-navigation [data-route=history]").click();
  await page.locator("#history-view").waitFor();
  assert.equal(
    await page.locator("#app-nav-toggle").getAttribute("aria-expanded"),
    "false",
  );
  await capture("history-mobile");
  await navigate(page, "home");
  for (let i = 0; i < 7; i++) {
    await page.locator("#mode-library button").nth(i).click();
    await page.waitForURL(/#\/setup\/2$/);
    assert.equal(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("jazzEarLab:v1:wizardDraft")).config
            .mode,
      ),
      "m" + (i + 1),
    );
    await navigate(page, "home");
  }
  await page.locator("#mode-library button").first().click();
  await page.waitForURL(/#\/setup\/2$/);
  await capture("wizard-mobile-dark");
  await theme("light");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await capture("wizard-desktop-light");
  await configure(page, { mode: "m1", degree: "9", beats: 1, bpm: 240 });
  await ready(page);
  assert.equal(await page.locator(".app-sidebar").isVisible(), false);
  const state = await page.evaluate(() =>
    localStorage.getItem("jazzEarLab:v1:sessions"),
  );
  await theme("dark");
  assert.equal(
    await page.evaluate(() => localStorage.getItem("jazzEarLab:v1:sessions")),
    state,
  );
  await capture("session-desktop-dark");
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await capture("session-" + width);
  }
  await page.locator("#replay").click();
  await ready(page);
  assert.ok(await page.evaluate(() => window.audioCalls.length >= 2));
  await page.locator("#reveal").click();
  await page.locator("[data-grade=correct]").click();
  await page.locator("#next").click();
  await ready(page);
  await page.locator("#session-exit").click();
  await page.clock.setFixedTime(new Date(asOf));
  await page.evaluate(async (rows) => {
    const r = await import("/js/jazz/analytics/repository.js");
    for (const row of rows) await r.put("assessments", row);
  }, currentUI());
  await navigate(page, "insights/m1?days=28");
  await page.locator(".aggregate-matrix").waitFor();
  assert.match(await page.locator(".smart-summary").textContent(), /101 of 112/);
  for (const value of ["light", "dark"]) {
    await theme(value);
    await contrast();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await capture("insights-desktop-" + value);
    await page.setViewportSize({ width: 390, height: 844 });
    await capture("insights-mobile-" + value);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator(".matrix-value[data-rate-bucket]").first().click();
  await page.locator(".insight-cell-detail").waitFor();
  await capture("insights-detail-dark");
  for (const path of [
    "",
    "degree-trainer/",
    "interval-trainer/",
    "chord-quality/",
    "progression-id/",
    "drone/",
    "heatmap/",
  ]) {
    await page.goto(new URL("../" + path, labURL).href);
    await page.locator(".app-shell").waitFor();
    assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await capture((path.replaceAll("/", "") || "root") + "-" + width);
    }
  }
  assert.deepEqual(overflows, [], JSON.stringify(overflows));
  assert.deepEqual(errors, []);
  assert.deepEqual(failedAssets, []);
  console.log(
    "Redesign passed: seven modes, theme isolation/persistence, shared routes, drawer keyboard, audio replay/advance, unchanged analytics fixture, 320-1920px layouts. Screenshots: " +
      folder,
  );
} finally {
  await browser.close();
}
