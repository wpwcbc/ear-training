import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(15000);
const url = `${process.env.BASE_URL || "http://127.0.0.1:4173"}/jazz-ear-lab-v2/`;
const screenshots = process.env.V2_SCREENSHOTS ? resolve(".impeccable/review") : null;
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const button = (name) => page.getByRole("button", { name, exact: true });
const latest = () => page.evaluate(() => JSON.parse(localStorage.getItem("jazzEarLab:v2:sessions")).at(-1));
const presets = () => page.evaluate(() => JSON.parse(localStorage.getItem("jazzEarLab:v2:presets")));
async function route(hash) {
  await page.evaluate((hash) => location.hash = hash, hash);
  await page.waitForURL(new RegExp("#" + hash + "$"));
}
async function capture(name) {
  await page.evaluate(() => scrollTo(0, 0));
  await page.mouse.move(0, 0);
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, name + " page overflow");
  if (screenshots) {
    await mkdir(screenshots, { recursive: true });
    await page.screenshot({ path: resolve(screenshots, name + ".png"), fullPage: true, animations: "disabled" });
  }
  if (process.env.QUALITY_AXE_PATH) {
    await page.addScriptTag({ content: await readFile(process.env.QUALITY_AXE_PATH, "utf8") });
    const violations = await page.evaluate(async () => (await axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    })).violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })));
    assert.deepEqual(violations, [], name);
  }
}
async function seed() {
  await page.goto(url);
  await page.evaluate(async () => {
    const { primaryPresets, stream, attempt, answer, keys } = await import("/js/v2/model.js");
    const c = { ...primaryPresets[1].config, roots: ["C", "G"], qualities: ["7"], targetMode: "exact", targets: ["3", "b7"], autoAdvance: false, count: 0 };
    const s = { id: "split-desk-evidence", presetId: "m2-general", config: c, startedAt: "2026-10-23T10:00:00.000Z", endedAt: "2026-10-23T10:20:00.000Z", attempts: [] };
    let invalid = 0;
    for (const degree of c.targets) {
      const generate = stream({ ...c, roots: ["G"], targets: [degree] }, degree);
      for (let i = 0; i < 21; i++) {
        const a = attempt(c, generate(), s.id, "previously-seen");
        if (i < 20) {
          const correct = i < (degree === "3" ? 16 : 12);
          answer(a, correct ? degree : a.target.options.find((d) => d !== degree), correct ? 2400 : 100);
          a.timingValidity = correct && invalid++ < 4 ? "interrupted" : "valid";
          if (i < (degree === "3" ? 3 : 5)) a.replaysBeforeFirst = 1;
        } else a.replaysBeforeFirst = 2;
        s.attempts.push(a);
      }
    }
    const other = structuredClone(s);
    other.id = "separate-timing-policy";
    other.attempts = [structuredClone(s.attempts[0])];
    Object.assign(other.attempts[0], { id: "other-evidence", sessionId: other.id, timingVersion: "v2-older-policy" });
    localStorage.setItem(keys.sessions, JSON.stringify([other, s]));
    localStorage.setItem(keys.presets, JSON.stringify(primaryPresets.map((p) => ({ ...p, config: { ...c, exercise: p.config.exercise, count: 20 } }))));
    localStorage.setItem(keys.last, JSON.stringify("m2-general"));
  });
  await page.reload();
}
try {
  await seed();
  const source = (await presets()).find((p) => p.id === "m2-general");
  const history = await page.evaluate(() => localStorage.getItem("jazzEarLab:v2:sessions"));
  await capture("home-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture("home-mobile");
  await route("insights");
  assert.equal(await page.locator(".metric-number").textContent(), "70%");
  assert.equal(await page.locator(".assessment-count").textContent(), "28 / 40 assessed");
  assert.equal(await page.locator(".unassessed").textContent(), "2 unassessed");
  assert.deepEqual(await page.locator(".supporting-metric strong").allTextContents(), ["8 / 40", "2.40 s"]);
  assert.match(await page.locator(".supporting-metric small").textContent(), /n=24 /);
  assert.equal(await page.locator(".pattern-row").count(), 2);
  assert.deepEqual(await page.locator(".pattern-row strong").allTextContents(), ["60%", "80%"]);
  assert.equal(await page.locator(".insight-detail").getAttribute("open"), null);
  await page.getByLabel("Root", { exact: true }).focus();
  await page.getByLabel("Root", { exact: true }).selectOption("G");
  assert.equal(await page.getByLabel("Root", { exact: true }).evaluate((el) => document.activeElement === el), true, "filter keeps keyboard focus");
  const primaryFocus = await page.locator(".pattern-row").first().getByRole("button", { name: "Customize focus" }).boundingBox();
  assert.ok(primaryFocus.y + primaryFocus.height <= 844, "primary focus action is inside the mobile first viewport: " + JSON.stringify(primaryFocus));
  assert.ok((await page.locator(".insight-scope > details > summary").boundingBox()).height >= 44);
  await capture("insights-mobile");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await capture("insights-desktop");
  await page.locator(".pattern-row").first().getByRole("button", { name: "Customize focus" }).click();
  await page.waitForURL(/#configure$/);
  const focused = (await presets()).at(-1);
  assert.deepEqual(focused.config.roots, ["G"]);
  assert.deepEqual(focused.config.qualities, ["7"]);
  assert.deepEqual(focused.config.targets, ["b7"]);
  assert.deepEqual((await presets()).find((p) => p.id === source.id), source);
  assert.equal(await page.evaluate(() => localStorage.getItem("jazzEarLab:v2:sessions")), history);
  await route("insights");
  await page.getByLabel("Root", { exact: true }).selectOption("All selected roots");
  await page.locator(".pattern-row").first().getByRole("button", { name: "Customize focus" }).click();
  await page.waitForURL(/#configure$/);
  assert.deepEqual((await presets()).at(-1).config.roots, ["C", "G"], "no filter retains original Root Pool");
  await route("insights");
  await page.getByLabel("Comparable practice conditions").selectOption({ index: 0 });
  assert.equal(await page.locator(".assessment-count").textContent(), "1 / 1 assessed", "timing cohorts stay separate");
  assert.equal(await page.locator(".pattern-row").count(), 0, "sparse data is not a weakness ranking");
  await route("home");
  await page.locator('[data-preset-id="m2-general"]').getByRole("button", { name: "Customize" }).click();
  await capture("harmony-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture("harmony-mobile");
  const lastQuality = page.getByRole("group", { name: "Chord qualities", exact: true }).getByRole("checkbox").last();
  await lastQuality.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const lastQualityBox = await lastQuality.boundingBox();
  const footerBox = await page.locator(".config-actions").boundingBox();
  assert.ok(lastQualityBox.y >= 0 && lastQualityBox.y + lastQualityBox.height < footerBox.y, "last quality is reachable above the fixed mobile footer");
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await button("Target degrees").click();
  await capture("targets-mobile");
  await page.getByRole("group", { name: "Target degrees", exact: true }).getByRole("checkbox", { name: "b13", exact: true }).check();
  assert.match(await page.locator("#config-status").textContent(), /Changes saved/);
  await button("Practice").click();
  assert.match(await page.locator("#config-status").textContent(), /Changes saved/);
  await page.getByLabel("Questions (0 = Unlimited)", { exact: true }).fill("201");
  await page.getByLabel("Questions (0 = Unlimited)", { exact: true }).blur();
  await button("Start practice").click();
  await page.locator("#error").waitFor({ state: "visible" });
  assert.match(page.url(), /#configure$/, "invalid settings cannot start a session");
  assert.equal((await presets()).find((p) => p.id === source.id).config.count, 20, "invalid draft cannot overwrite saved settings");
  await capture("invalid-settings-mobile");
  await page.getByLabel("Questions (0 = Unlimited)", { exact: true }).fill("20");
  await page.getByLabel("Questions (0 = Unlimited)", { exact: true }).blur();
  await capture("settings-mobile");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await capture("settings-desktop");
  await button("Start practice").click();
  await page.waitForFunction(() => document.querySelector(".answers button:enabled"));
  await capture("desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture("mobile");
  const a = (await latest()).attempts[0];
  await button(a.target.options.find((d) => d !== a.target.degree)).click();
  await button(a.target.degree).click();
  assert.equal(await page.locator("#feedback").textContent(), "Correct on retry");
  assert.equal((await latest()).attempts[0].firstCorrect, false);
  assert.equal((await latest()).attempts[0].retryCount, 1);
  await page.getByRole("link", { name: "Insights", exact: true }).click();
  await page.waitForURL(/#insights$/);
  assert.ok((await latest()).endedAt, "destination navigation ends and saves session");
  const ended = await latest();
  await page.waitForTimeout(1200);
  assert.deepEqual(await latest(), ended, "no late playback/progression mutation");
  await route("results/" + ended.id);
  await capture("results-mobile");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await capture("results-desktop");
  await route("home");
  await page.locator('[data-preset-id="m1-general"]').getByRole("button", { name: "Start", exact: true }).click();
  await button("Done").waitFor({ state: "visible" });
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent === "Done" && !b.disabled));
  await capture("m1-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture("m1-mobile");
  await button("Done").click();
  await button("Incorrect").waitFor({ state: "visible" });
  assert.equal(await page.locator("#feedback").textContent(), "Rate your response");
  assert.equal(await page.locator(".target-degree").textContent(), (await latest()).attempts[0].target.degree);
  assert.equal(await button("Correct").isDisabled(), false, "grading is available during reference");
  assert.equal(await button("Correct").getAttribute("class"), await button("Incorrect").getAttribute("class"));
  await capture("m1-grade-mobile");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await capture("m1-grade-desktop");
  await button("Incorrect").click();
  const wrong = page.locator("#wrong-degree");
  const originalSelect = await wrong.elementHandle();
  assert.equal(await wrong.locator(`option[value="${(await latest()).attempts[0].target.degree}"]`).count(), 0);
  await page.waitForFunction(() => document.querySelector(".playback-status")?.textContent === "");
  assert.equal(await originalSelect.evaluate((node) => node.isConnected), true, "audio tail does not replace an active native selector");
  await wrong.selectOption("unknown");
  await button("Stop").click();
  assert.equal((await latest()).attempts[0].imaginedWrongDegree, "unknown");
  assert.equal((await latest()).attempts[0].firstCorrect, false);
  assert.match(await page.locator(".confusions").textContent(), /Unknown imagined degree: 1/);
  if (screenshots) {
    await route("home");
    await page.evaluate(async () => {
      const { keys } = await import("/js/v2/model.js");
      const presets = JSON.parse(localStorage.getItem(keys.presets));
      const preset = presets.find((p) => p.id === "m2-general");
      Object.assign(preset.config, { roots: ["C"], targets: ["3", "b7"] });
      localStorage.setItem(keys.presets, JSON.stringify(presets));
    });
    await page.reload();
    await page.setViewportSize({ width: 1077, height: 422 });
    await page.locator('[data-preset-id="m2-general"]').getByRole("button", { name: "Start", exact: true }).click();
    for (let i = 0; i < 3; i++) {
      await page.waitForFunction(() => document.querySelector(".answers button:enabled"));
      await button((await latest()).attempts.at(-1).target.degree).click();
      await button("Next").click();
    }
    await page.waitForFunction(() => document.querySelector(".answers button:enabled") && document.querySelector(".playback-status")?.textContent === "");
    await page.mouse.move(0, 0);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: resolve(screenshots, "hero-repro.png"), animations: "disabled" });
    await button("Stop").click();
  }
  assert.deepEqual(errors, []);
  console.log("Split Desk passed: scope-aligned metrics, separate timing cohorts, root-filter focus, source isolation, autosave/invalid drafts, responsive states, immutable retries, direct navigation, M1 reference-time grading and stable native controls.");
} catch (error) {
  console.error({ url: page.url(), errors, page: await page.locator("body").innerText() });
  throw error;
} finally {
  await browser.close();
}
