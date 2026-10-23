import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { labURL, navigate, configure, ready } from "./browser-support.mjs";
import { currentUI, asOf } from "./refinement-fixtures.mjs";

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(10000);
const folder = join(tmpdir(), "eartrain-quality");
await mkdir(folder, { recursive: true });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const audit = process.argv.includes("--audit");
const findings = [];
const axeSource = process.env.QUALITY_AXE_PATH
  ? await readFile(process.env.QUALITY_AXE_PATH, "utf8")
  : null;
async function theme(value) {
  if ((await page.locator("html").getAttribute("data-theme")) !== value)
    await page.locator("#app-theme").click();
}
async function inspect(name) {
  if (axeSource) {
    await page.addScriptTag({ content: axeSource });
    const result = await page.evaluate(() =>
      axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
      }),
    );
    findings.push({
      name,
      violations: result.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    });
  }
  findings.push({
    name,
    overflow: await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
  });
  if (process.env.QUALITY_SCREENSHOTS) {
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: join(folder, name + ".png"),
      fullPage: true,
    });
  }
}
try {
  await page.goto(labURL);
  await page.locator("#mode-library article").first().waitFor();
  await theme("light");
  await inspect("home-light");
  await page.locator("#app-theme").click();
  await inspect("home-dark");
  await page.locator("#start-practicing").click();
  await page.locator("#exercise-list button").first().waitFor();
  await inspect("exercise-dark");
  await page.locator("#wizard-next").click();
  await page.waitForURL(/setup\/2$/);
  await inspect("harmony-dark");
  findings.push({
    name: "route-focus",
    active: await page.evaluate(() => ({
      id: document.activeElement.id,
      visible: document.activeElement.checkVisibility(),
    })),
  });
  if (!audit)
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      "wizard-section-title",
    );
  await navigate(page, "home");
  await page.evaluate(async () => {
    const { defaults } = await import("/js/jazz/model.js");
    localStorage.setItem(
      "jazzEarLab:v1:savedPresets",
      JSON.stringify([
        {
          id: "long-name",
          name: "UnbrokenPresetName".repeat(15).slice(0, 80),
          config: defaults,
          customs: [],
          favorite: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          useCount: 0,
        },
      ]),
    );
  });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.locator('[data-dashboard="saved"]').click();
  await inspect("saved-long-mobile-dark");
  await page.locator("#app-theme").click();
  await inspect("saved-long-mobile-light");
  findings.push({
    name: "small-targets",
    targets: await page
      .locator(
        "main button, main summary, main input, main select, main label.check",
      )
      .evaluateAll((elements) =>
        elements
          .filter((e) => e.checkVisibility() && !e.disabled)
          .map((e) => ({
            name: e.textContent.trim().slice(0, 45),
            tag: e.tagName,
            width: e.getBoundingClientRect().width,
            height: e.getBoundingClientRect().height,
          }))
          .filter((e) => e.width < 44 || e.height < 44),
      ),
  });
  if (!audit)
    assert.deepEqual(
      findings.find((f) => f.name === "small-targets").targets,
      [],
    );
  await page.locator(".config-item .row-menu > summary").focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  assert.match(
    await page.evaluate(() => document.activeElement.textContent),
    /Edit & Practice/,
  );
  await page.keyboard.press("Escape");
  assert.equal(
    await page.evaluate(() =>
      document.activeElement.matches(".row-menu > summary"),
    ),
    true,
  );
  await navigate(page, "home");
  await page.locator("#mode-library button").first().click();
  await page.waitForURL(/setup\/2$/);
  findings.push({
    name: "mode-route-focus",
    active: await page.evaluate(() => ({
      id: document.activeElement.id,
      visible: document.activeElement.checkVisibility(),
    })),
  });
  if (!audit)
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      "wizard-section-title",
    );
  const storedDraft = await page.evaluate(() =>
    localStorage.getItem("jazzEarLab:v1:wizardDraft"),
  );
  await page.evaluate(() => {
    window.originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "jazzEarLab:v1:wizardDraft")
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      return window.originalSetItem.call(this, key, value);
    };
  });
  const root = page.locator('#pool-fields input[value="D"]');
  const checked = await root.isChecked();
  await root.setChecked(!checked);
  findings.push({
    name: "draft-quota",
    message: await page.locator("#flow-status").textContent(),
    nextDisabled: await page.locator("#wizard-next").isDisabled(),
  });
  if (!audit) {
    assert.match(
      await page.locator("#flow-status").textContent(),
      /storage is full.*Save Draft/,
    );
    assert.equal(
      await page.locator("#flow-status").getAttribute("role"),
      "alert",
    );
    assert.equal(await page.locator("#wizard-next").isDisabled(), false);
    assert.equal(await root.isChecked(), !checked);
    assert.equal(
      await page.evaluate(() =>
        localStorage.getItem("jazzEarLab:v1:wizardDraft"),
      ),
      storedDraft,
    );
    await page.locator("#save-draft").click();
    assert.doesNotMatch(
      await page.locator("#flow-status").textContent(),
      /^Draft saved/,
    );
    const selectedRoots = page
      .locator("#pool-fields fieldset")
      .first()
      .locator("input:checked");
    while (await selectedRoots.count()) await selectedRoots.first().uncheck();
    assert.equal(await page.locator("#wizard-next").isDisabled(), true);
    await page.locator('#pool-fields input[value="C"]').check();
    assert.equal(await page.locator("#wizard-next").isDisabled(), false);
    await inspect("draft-error-mobile-light");
    await page.locator("#app-theme").click();
    await inspect("draft-error-mobile-dark");
    const noticeStyle = await page
      .locator("#flow-status")
      .evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          fontSize: style.fontSize,
          borderLeftWidth: style.borderLeftWidth,
          borderTopWidth: style.borderTopWidth,
        };
      });
    assert.deepEqual(noticeStyle, {
      fontSize: "14px",
      borderLeftWidth: "1px",
      borderTopWidth: "1px",
    });
    const noticeBox = await page.locator("#flow-status").boundingBox();
    assert.ok(noticeBox.y >= 0 && noticeBox.y + noticeBox.height <= 844);
    const stepLabelsFit = await page
      .locator(".wizard-stepper button")
      .evaluateAll((buttons) => {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        return buttons.every((button) => {
          const style = getComputedStyle(button);
          context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          const width =
            button.clientWidth -
            parseFloat(style.paddingLeft) -
            parseFloat(style.paddingRight);
          return button.firstChild.textContent
            .split(/\s+/)
            .every((word) => context.measureText(word).width <= width);
        });
      });
    assert.equal(
      stepLabelsFit,
      true,
      "Step labels must fit without splitting words at 320px",
    );
  }
  await page.locator("#wizard-back").click();
  await page.waitForURL(/setup\/1$/);
  if (!audit)
    assert.match(
      await page.locator("#flow-status").textContent(),
      /storage is full/,
    );
  if (!audit) {
    await navigate(page, "home");
    await page.locator("#start-practicing").click();
    await page.waitForURL(/setup\/1$/);
    await page.locator("#wizard-next").click();
    await page.waitForURL(/setup\/2$/);
    assert.equal(
      await page
        .locator("#pool-fields fieldset")
        .first()
        .locator("input:checked")
        .count(),
      1,
      "Returning to setup must not replace unsaved input with the stale stored draft",
    );
    await page.locator("#wizard-back").click();
    await page.waitForURL(/setup\/1$/);
  }
  await page.evaluate(() => {
    Storage.prototype.setItem = window.originalSetItem;
  });
  if (!audit) {
    await page.locator("#save-draft").click();
    assert.equal(
      await page.locator("#flow-status").textContent(),
      "Draft saved.",
    );
    assert.equal(
      await page.locator("#flow-status").getAttribute("role"),
      "status",
    );
    await page.reload();
    await page.locator("#exercise-list button").first().waitFor();
    await page.locator("#wizard-next").click();
    await page.waitForURL(/setup\/2$/);
    assert.equal(
      await page.locator('#pool-fields input[value="C"]').isChecked(),
      true,
    );
    assert.equal(
      await page
        .locator("#pool-fields fieldset")
        .first()
        .locator("input:checked")
        .count(),
      1,
    );
    await page.evaluate(() => {
      window.originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === "jazzEarLab:v1:wizardDraft")
          throw new DOMException("Blocked", "SecurityError");
        return window.originalSetItem.call(this, key, value);
      };
    });
    await page.locator("#save-draft").click();
    assert.match(
      await page.locator("#flow-status").textContent(),
      /storage is blocked.*Save Draft/,
    );
    await page.evaluate(() => {
      Storage.prototype.setItem = window.originalSetItem;
    });
    await page.locator("#save-draft").click();
  }
  await page.clock.setFixedTime(new Date(asOf));
  await page.evaluate(async (rows) => {
    const r = await import("/js/jazz/analytics/repository.js");
    for (const row of rows) await r.put("assessments", row);
  }, currentUI());
  await theme("light");
  await navigate(page, "insights/m1?days=28");
  await inspect("insights-mobile-light");
  await page.locator("#app-theme").click();
  await inspect("insights-mobile-dark");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await inspect("insights-desktop-dark");
  await navigate(page, "insights/data");
  await inspect("data-dark");
  await navigate(page, "history");
  await inspect("history-empty-dark");
  if (!audit) {
    assert.equal(
      await page.evaluate(() => document.activeElement.textContent),
      "Practice sessions",
    );
    await configure(page, {
      mode: "m1",
      degree: "9",
      beats: 1,
      bpm: 240,
      countIn: 0,
      count: 5,
    });
    await ready(page);
    await inspect("session-desktop-dark");
    await page.setViewportSize({ width: 320, height: 844 });
    await page.locator("#app-theme").click();
    await inspect("session-mobile-light");
    await page.emulateMedia({
      forcedColors: "active",
      reducedMotion: "reduce",
    });
    await page.locator("#pause").focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.id), "pause");
    const focus = await page
      .locator("#pause")
      .evaluate((element) => getComputedStyle(element).outlineStyle);
    assert.notEqual(focus, "none");
    findings.push({
      name: "forced-color-icon",
      colors: await page.locator("#pause").evaluate((element) => ({
        background: getComputedStyle(element, "::before").backgroundColor,
        surface: getComputedStyle(element).backgroundColor,
        foreground: getComputedStyle(element).color,
      })),
    });
    const iconColors = findings.find(
      (item) => item.name === "forced-color-icon",
    ).colors;
    assert.notEqual(
      iconColors.background,
      iconColors.surface,
      "Forced-color mask icons must not disappear into the button surface",
    );
    await inspect("session-mobile-forced-colors");
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () => document.getElementById("phase").textContent === "PAUSED",
    );
    await page.keyboard.press("Enter");
    await ready(page);
    await page.locator("#session-exit").click();
    await page.waitForURL(/#\/home$/);
  }
  await writeFile(
    join(folder, audit ? "audit-before.json" : "verification.json"),
    JSON.stringify({ findings, errors }, null, 2),
  );
  if (!audit) {
    assert.deepEqual(errors, []);
    assert.deepEqual(
      findings.filter((f) => f.overflow || f.violations?.length),
      [],
    );
  }
  if (audit) console.log(JSON.stringify({ findings, errors }, null, 2));
  else
    console.log(
      JSON.stringify(
        {
          states: findings.filter((f) => "overflow" in f).length,
          axeStates: findings.filter((f) => "violations" in f).length,
          axe: axeSource
            ? "WCAG A/AA sampled states clear"
            : "Not run; set QUALITY_AXE_PATH to axe.min.js",
          checks:
            "draft quota/security failure and retry, preserved input/reload, validation during failure, route focus, 44px disclosures, long names, native menu keyboard, session pause/resume, reduced motion and forced-color focus",
          errors,
        },
        null,
        2,
      ),
    );
} finally {
  await browser.close();
}
