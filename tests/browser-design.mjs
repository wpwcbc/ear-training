import assert from "node:assert/strict";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { configure, ready, labURL } from "./browser-support.mjs";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const noOverflow = async () =>
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
try {
  await page.goto(labURL);
  const svg = await page.request.get(labURL + "icons/play.svg");
  assert.equal(svg.status(), 200);
  assert.match(svg.headers()["content-type"], /svg/);
  const pixels = await page.evaluate(async () => {
    const image = new Image();
    image.src = "icons/play.svg";
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 24;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    return Array.from(ctx.getImageData(0, 0, 24, 24).data).filter(
      (v, i) => i % 4 === 3 && v > 0,
    ).length;
  });
  assert.ok(pixels > 10);
  await page.evaluate(async () => {
    const { defaults } = await import("/js/jazz/model.js");
    const { rememberConfig } = await import("/js/jazz/lifecycle.js");
    for (const root of ["C", "D", "E", "F", "G", "A", "B"])
      rememberConfig(
        localStorage,
        { ...defaults, root, quality: "maj7", degree: "3" },
        [],
        "wizard",
      );
  });
  await page.reload();
  assert.equal(await page.locator("#configuration-list article").count(), 5);
  await page.getByRole("button", { name: "Show all 7 configurations" }).click();
  assert.equal(await page.locator("#configuration-list article").count(), 7);
  await page.getByRole("button", { name: "Show fewer configurations" }).click();
  assert.equal(await page.locator("#configuration-list article").count(), 5);
  const menu = page.locator("#configuration-list .row-menu").first();
  await menu.locator("summary").focus();
  await page.keyboard.press("Space");
  assert.equal(await menu.getAttribute("open"), "");
  await page.keyboard.press("Escape");
  assert.equal(await menu.getAttribute("open"), null);
  await menu.locator("summary").click();
  await page.locator("h1").click();
  assert.equal(await menu.getAttribute("open"), null);
  await page.locator("[data-dashboard=recent]").focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(
    await page.locator("[data-dashboard=saved]").getAttribute("aria-selected"),
    "true",
  );
  await page.keyboard.press("ArrowLeft");
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await noOverflow();
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: join(tmpdir(), "jazz-design-recent.png"),
    fullPage: true,
  });
  await page.locator("#start-practicing").click();
  await page
    .getByRole("button", { name: "Hear a Chord Degree", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".advanced-qualities > summary").click();
  await page
    .getByRole("group", { name: "Chord Qualities", exact: true })
    .locator("input[value=m]")
    .scrollIntoViewIfNeeded();
  const option = await page
    .getByRole("group", { name: "Chord Qualities", exact: true })
    .locator("input[value=m]")
    .boundingBox();
  const footer = await page.locator(".wizard-footer").boundingBox();
  assert.ok(
    option.y + option.height <= footer.y,
    "Scrollable settings must not overlap the fixed action bar",
  );
  await noOverflow();
  await page.screenshot({
    path: join(tmpdir(), "jazz-design-wizard-mobile.png"),
    fullPage: true,
  });
  await configure(page, { mode: "m1", degree: "9" });
  await ready(page);
  assert.equal(
    await page.locator("#session-view .session-phases .active").innerText(),
    "Imagine",
  );
  assert.match(await page.locator("#pause").getAttribute("title"), /Pause/);
  await page.locator("#reveal").click();
  const grade = await page.locator("#grading").boundingBox();
  const actions = await page.locator(".practice-dock .actions").boundingBox();
  assert.ok(grade.y + grade.height <= actions.y);
  await page.locator("[data-grade=correct]").click();
  assert.equal(
    await page.locator("#session-view .session-phases .active").innerText(),
    "Assess",
  );
  await noOverflow();
  await page.screenshot({
    path: join(tmpdir(), "jazz-design-session-mobile.png"),
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "Design checks passed: Lucide assets render, five-item Recent, keyboard/dismissible menus and tabs, 320-1440px layouts, scrollable wizard without footer overlap and phase/grade action hierarchy.",
  );
} finally {
  await browser.close();
}
