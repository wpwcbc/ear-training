import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(15000);
const url = `${process.env.BASE_URL || "http://127.0.0.1:4173"}/jazz-ear-lab-v2/`;
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const folder = join(tmpdir(), "eartrain-v2-homepage");
const presets = () =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("jazzEarLab:v2:presets") || "[]"),
  );
const latest = () =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("jazzEarLab:v2:sessions") || "[]").at(-1),
  );
const config = async (id) => (await presets()).find((p) => p.id === id).config;
const entry = (id) => page.locator(`[data-preset-id="${id}"]`);
async function home() {
  await page.evaluate(() => {
    location.hash = "home";
  });
  await page.getByRole("heading", { name: "Practice", exact: true }).waitFor();
}
async function step(name) {
  await page
    .getByRole("navigation", { name: "Configuration steps" })
    .getByRole("button", { name, exact: true })
    .click();
}
async function pool(name, values) {
  const group = page.getByRole("group", { name, exact: true });
  for (const value of values)
    await group.getByRole("checkbox", { name: value, exact: true }).check();
  for (const input of await group.getByRole("checkbox").all()) {
    if (!values.includes(await input.inputValue())) await input.uncheck();
  }
}
async function capture(name) {
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
    false,
    name,
  );
  if (process.env.V2_SCREENSHOTS) {
    await mkdir(folder, { recursive: true });
    await page.screenshot({
      path: join(folder, name + ".png"),
      fullPage: true,
    });
  }
  if (process.env.QUALITY_AXE_PATH) {
    await page.addScriptTag({
      content: await readFile(process.env.QUALITY_AXE_PATH, "utf8"),
    });
    assert.deepEqual(
      await page.evaluate(async () =>
        (
          await axe.run(document, {
            runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
          })
        ).violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        })),
      ),
      [],
      name,
    );
  }
}
async function spyAudio() {
  await page.evaluate(async () => {
    const { AudioEngine } = await import("/js/jazz/audio.js");
    const play = AudioEngine.prototype.playSingle;
    const reference = AudioEngine.prototype.playReference;
    window.calls = [];
    AudioEngine.prototype.playSingle = function (...args) {
      const [, midi, , context] = args;
      window.calls.push({ midi, context });
      return Reflect.apply(play, this, args);
    };
    AudioEngine.prototype.playReference = function (...args) {
      window.calls.push({ midi: args[1], context: true });
      return Reflect.apply(reference, this, args);
    };
  });
}
try {
  await page.goto(url);
  assert.deepEqual(await page.locator(".exercises h2").allTextContents(), [
    "Single Chord · Degree Audiation",
    "Single Chord · Degree Recognition",
  ]);
  for (const id of ["m1-general", "m2-general"]) {
    assert.deepEqual(await entry(id).getByRole("button").allTextContents(), [
      "Start",
      "Customize",
    ]);
    assert.equal(await entry(id).locator("p, .badge").count(), 0);
  }
  assert.equal(
    await page.locator(".saved-presets [data-preset-id]").count(),
    2,
  );
  await capture("home-desktop");
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
    );
    if (width === 390) await capture("home-mobile");
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const id of ["m1-general", "m2-general"]) {
    await entry(id).getByRole("button", { name: "Start", exact: true }).click();
    await page.waitForURL(/#practice$/);
    const original = (await latest()).config;
    assert.deepEqual(original.targets, ["Root", "Third", "Fifth", "Seventh"]);
    assert.equal(original.roots.length, 12);
    assert.deepEqual(original.qualities, ["maj7", "m7", "7"]);
    await page.getByRole("button", { name: "Stop", exact: true }).click();
    await home();
    await entry(id)
      .getByRole("button", { name: "Customize", exact: true })
      .click();
    await step("Harmony");
    await pool("Roots", ["F#", "Bb"]);
    assert.deepEqual(await config(id), { ...original, roots: ["F#", "Bb"] });
    await step("Target degrees");
    await page.getByLabel("Degree selection").selectOption("exact");
    await pool("Target degrees", ["b9", "#11", "b13", "#5"]);
    const targetConfig = await config(id);
    assert.deepEqual(targetConfig.roots, ["F#", "Bb"]);
    assert.deepEqual(targetConfig.qualities, original.qualities);
    assert.deepEqual(
      new Set(targetConfig.targets),
      new Set(["b9", "#11", "b13", "#5"]),
    );
    await step("Harmony");
    await pool("Chord qualities", ["7alt", "m7b5"]);
    const harmonyConfig = await config(id);
    assert.deepEqual(harmonyConfig.roots, targetConfig.roots);
    assert.deepEqual(harmonyConfig.targets, targetConfig.targets);
    assert.deepEqual(harmonyConfig.qualities, ["m7b5", "7alt"]);
    await step("Practice");
    assert.equal(await page.getByLabel(/^Exercise/).count(), 0);
    assert.equal(
      await page.getByRole("button", { name: "Rename", exact: true }).count(),
      0,
    );
    await page
      .getByLabel("Questions (0 = Unlimited)", { exact: true })
      .fill("1");
    await page.getByLabel("Questions (0 = Unlimited)", { exact: true }).blur();
    await page
      .getByLabel("Audible chord context")
      .setChecked(id === "m1-general");
    const saved = await config(id);
    await page.reload();
    assert.deepEqual(await config(id), saved);
    await spyAudio();
    await page
      .getByRole("button", { name: "Start practice", exact: true })
      .click();
    const s = await latest();
    const target = s.attempts[0].target;
    assert.ok(saved.targets.includes(target.degree));
    assert.ok(saved.roots.includes(target.chord.root));
    assert.ok(saved.qualities.includes(target.chord.quality));
    if (id === "m1-general") {
      const done = page.getByRole("button", {
        name: "Done",
        exact: true,
      });
      await page.waitForFunction(() =>
        [...document.querySelectorAll("button")].some(
          (b) => b.textContent === "Done" && !b.disabled,
        ),
      );
      assert.deepEqual(await page.evaluate(() => window.calls), [
        { midi: null, context: true },
      ]);
      await capture("m1-general");
      await done.click();
      await page.getByRole("button", { name: "Correct", exact: true }).click();
      assert.equal((await latest()).attempts[0].gradingSource, "self");
      assert.equal(
        (await page.evaluate(() => window.calls)).at(-1).midi,
        target.midi,
      );
    } else {
      await page.waitForFunction(() =>
        document.querySelector(".answers button:not(:disabled)"),
      );
      assert.equal(await page.locator(".answers button").count(), 12);
      assert.deepEqual(await page.evaluate(() => window.calls), [
        { midi: target.midi, context: false },
      ]);
      await capture("m2-general");
      await page
        .getByRole("button", { name: target.degree, exact: true })
        .click();
      assert.equal((await latest()).attempts[0].gradingSource, "automatic");
    }
    await page.waitForURL(/#results\//);
    const beforeFocus = await presets();
    await page.evaluate(() => {
      location.hash = "insights";
    });
    await page.locator(".insight-detail > summary").click();
    await page
      .getByRole("button", { name: "Customize focus", exact: true })
      .first()
      .click();
    await page.waitForURL(/#configure$/);
    const afterFocus = await presets();
    for (const p of beforeFocus)
      assert.deepEqual(
        afterFocus.find((v) => v.id === p.id),
        p,
      );
    assert.equal(afterFocus.length, beforeFocus.length + 1);
    const focus = afterFocus.at(-1);
    assert.match(focus.name, /^Focus:/);
    assert.equal(focus.config.targetMode, "exact");
    assert.equal(focus.config.targets.length, 1);
    await home();
    await entry(focus.id).waitFor();
    await page.evaluate(() => {
      location.hash = "insights";
    });
    await page.locator(".insight-detail > summary").click();
    await page
      .getByRole("button", { name: "Customize focus", exact: true })
      .first()
      .click();
    assert.equal(
      (await presets()).length,
      afterFocus.length,
      "Repeated focus action reuses the saved preset",
    );
    await home();
    await entry(id)
      .getByRole("button", { name: "Customize", exact: true })
      .click();
    await page.getByText("Preset actions", { exact: true }).click();
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "Restore Default", exact: true })
      .click();
    assert.deepEqual(await config(id), original);
    await home();
  }
  // A stopped session must not receive feedback from a late audio failure.
  await page.evaluate(async () => {
    const { AudioEngine } = await import("/js/jazz/audio.js");
    AudioEngine.prototype.ready = () =>
      new Promise((_, reject) => {
        window.rejectReady = reject;
      });
  });
  await entry("m2-general")
    .getByRole("button", { name: "Start", exact: true })
    .click();
  await page.waitForFunction(() => !!window.rejectReady);
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await page.waitForURL(/#results\//);
  const stopped = await latest();
  await page.evaluate(() =>
    window.rejectReady(new Error("Stale audio failure")),
  );
  await page.waitForTimeout(100);
  assert.equal(await page.locator("#error").isVisible(), false);
  assert.deepEqual(await latest(), stopped);
  const completed = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("jazzEarLab:v2:sessions")).find((s) =>
      s.attempts.some((a) => a.firstCorrect !== null),
    ),
  );
  await page.evaluate((id) => {
    location.hash = "results/" + id;
  }, completed.id);
  await page.getByText("Question review", { exact: true }).click();
  await page.evaluate(() => {
    window.rejectReady = null;
  });
  await page
    .getByRole("button", { name: "Replay reference", exact: true })
    .first()
    .click();
  await page.waitForFunction(() => !!window.rejectReady);
  await home();
  await page.evaluate(() =>
    window.rejectReady(new Error("Stale reference failure")),
  );
  await page.waitForTimeout(100);
  assert.equal(await page.locator("#error").isVisible(), false);
  assert.deepEqual(
    await page.evaluate(
      (id) =>
        JSON.parse(localStorage.getItem("jazzEarLab:v2:sessions")).find(
          (s) => s.id === id,
        ),
      completed.id,
    ),
    completed,
  );
  assert.equal(
    await page
      .getByRole("link", { name: "Practice", exact: true })
      .getAttribute("aria-current"),
    "page",
  );
  await home();
  assert.deepEqual(errors, []);
  console.log(
    "V2 homepage passed: minimal M1/M2 entries, general defaults, independent pools, altered/extended targets, autosave/reload/restore, isolated saved focus, async cancellation, responsive and accessibility checks.",
  );
} finally {
  await browser.close();
}
