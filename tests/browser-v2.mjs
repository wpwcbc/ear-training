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
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const url = `${process.env.BASE_URL || "http://127.0.0.1:4173"}/jazz-ear-lab-v2/`,
  folder = join(tmpdir(), "eartrain-v2");
await mkdir(folder, { recursive: true });
const sessions = () =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("jazzEarLab:v2:sessions") || "[]"),
  );
const latest = async () => (await sessions()).at(-1);
async function seed(config) {
  await page.goto(url);
  await page.evaluate(async (config) => {
    const { builtins, keys } = await import("/js/v2/model.js");
    localStorage.setItem(
      keys.presets,
      JSON.stringify([
        { ...builtins[0], config: { ...builtins[0].config, ...config } },
      ]),
    );
    localStorage.setItem(keys.last, JSON.stringify(builtins[0].id));
  }, config);
  await page.reload();
  await page.evaluate(async () => {
    const { AudioEngine } = await import("/js/jazz/audio.js");
    const play = AudioEngine.prototype.playSingle;
    const reference = AudioEngine.prototype.playReference;
    window.calls = [];
    window.playbacks = [];
    AudioEngine.prototype.playSingle = function (...args) {
      const [, midi, , context] = args;
      window.calls.push({ midi, context });
      if (window.failAudio) {
        window.failAudio = false;
        throw new Error("Simulated audio failure");
      }
      const playback = Reflect.apply(play, this, args);
      window.playbacks.push(playback);
      window.lastPlan = {
        readyMs: playback.readyMs,
        durationMs: playback.durationMs,
      };
      if (window.holdReady) {
        const gate = new Promise((resolve) => {
          window.releaseReady = resolve;
        });
        return {
          ...playback,
          ready: Promise.all([playback.ready, gate]).then(([ready]) => ready),
        };
      }
      if (window.holdCompletion) {
        const gate = new Promise((resolve) => {
          window.releaseCompletion = resolve;
        });
        return {
          ...playback,
          completed: Promise.all([playback.completed, gate]).then(
            ([end]) => end,
          ),
        };
      }
      return playback;
    };
    AudioEngine.prototype.playReference = function (...args) {
      window.calls.push({ midi: args[1], context: true });
      if (window.failAudio) {
        window.failAudio = false;
        throw new Error("Simulated reference failure");
      }
      return Reflect.apply(reference, this, args);
    };
  });
}
async function start(exercise = "M2") {
  await page
    .locator('[data-preset-id="recognition-guides"]')
    .getByRole("button", { name: "Start", exact: true })
    .click();
  await page.waitForURL(/#practice$/);
}
async function ready() {
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll("button")].some(
        (b) =>
          (b.textContent.startsWith("Replay") || b.textContent.startsWith("Done")) &&
          !b.disabled,
      ) &&
      !document.querySelector(".answers button:disabled") &&
      ![...document.querySelectorAll("button")].some(
        (b) => b.textContent.startsWith("Done") && b.disabled,
      ),
  );
}
async function capture(name) {
  if (process.env.V2_SCREENSHOTS)
    await page.screenshot({
      path: join(folder, name + ".png"),
      fullPage: true,
    });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
    false,
    name,
  );
  if (process.env.QUALITY_AXE_PATH) {
    await page.addScriptTag({
      content: await readFile(process.env.QUALITY_AXE_PATH, "utf8"),
    });
    const v = await page.evaluate(async () =>
      (
        await axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
        })
      ).violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    );
    assert.deepEqual(v, [], name);
  }
}
try {
  await page.goto(url);
  await page.evaluate(() =>
    localStorage.setItem("jazzEarLab:v1:test-sentinel", "unchanged"),
  );
  const legacy = await page.evaluate(async () => {
    const { defaults, saveSession } = await import("/js/jazz/model.js");
    const { createSession } = await import("/js/jazz/lifecycle.js");
    const s = createSession(
      { ...defaults, count: 5 },
      [],
      "v2-isolation-smoke",
    );
    saveSession(localStorage, s);
    return {
      id: s.id,
      records: Object.fromEntries(
        Object.entries(localStorage).filter(([key]) =>
          key.startsWith("jazzEarLab:v1:"),
        ),
      ),
    };
  });
  await capture("home-desktop");
  await seed({
    count: 2,
    autoAdvance: false,
    roots: ["G"],
    qualities: ["7"],
    targetMode: "exact",
    targets: ["b3"],
  });
  await page.evaluate(() => {
    window.holdReady = true;
  });
  await start();
  await page.waitForTimeout(250);
  assert.equal(
    await page.locator(".answers button:enabled").count(),
    0,
    "answers wait for playback readiness, not a UI timeout",
  );
  await page.evaluate(() => {
    window.holdReady = false;
    window.releaseReady();
  });
  await ready();
  const plan = await page.evaluate(() => window.lastPlan);
  assert.equal(plan.readyMs, 120, "M2 keeps its first-target timing boundary");
  assert.ok(
    plan.durationMs >= 2000 && plan.durationMs <= 3000,
    "V2 piano-like playback includes a natural 2-3 second tail",
  );
  assert.equal(await page.locator(".answers button").count(), 12);
  const q = (await latest()).attempts[0].target;
  assert.equal(q.degree, "b3");
  assert.equal(q.options.includes("#9"), false);
  await page.waitForTimeout(60);
  await page.getByRole("button", { name: /^Replay(?: context| reference)?$/ }).click();
  await ready();
  assert.deepEqual(
    await page.evaluate(async () => ({
      end: await window.playbacks[0].completed,
      voices: window.playbacks[0].activeVoices,
    })),
    { end: "cancelled", voices: 0 },
  );
  await page.getByRole("button", { name: "5", exact: true }).click();
  assert.equal(await page.locator("#feedback").textContent(), "Incorrect");
  assert.doesNotMatch(
    await page.locator(".question").textContent(),
    /Answer:|b3/,
  );
  const first = (await latest()).attempts[0];
  assert.equal(first.firstCorrect, false);
  assert.equal(first.timingVersion, "v2-answer-ready-1");
  assert.equal(first.replaysBeforeFirst, 1);
  assert.ok(first.firstResponseMs >= 60);
  await capture("m2-wrong-desktop");
  await page.getByRole("button", { name: q.degree, exact: true }).click();
  const retried = (await latest()).attempts[0];
  assert.equal(retried.firstAnswer, first.firstAnswer);
  assert.equal(retried.firstResponseMs, first.firstResponseMs);
  assert.equal(retried.firstCorrect, false);
  assert.equal(retried.retryCount, 1);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await ready();
  await page.getByRole("button", { name: "b3", exact: true }).click();
  await page
    .getByRole("button", { name: "Finish session", exact: true })
    .click();
  await page.waitForURL(/#results\//);
  assert.match(
    await page.locator("main").textContent(),
    /First-answer Accuracy[\s\S]*1 \/ 2 assessed/,
  );
  assert.match(await page.locator("main").textContent(), /b3 → 5/);
  await capture("results-desktop");
  await page.reload();
  assert.equal((await latest()).attempts[0].firstCorrect, false);
  await page.locator(".question-review > summary").click();
  const recorded = (await latest()).attempts[0];
  await page
    .getByRole("button", { name: "Replay reference", exact: true })
    .first()
    .click();
  const reviewed = (await latest()).attempts[0];
  assert.equal(reviewed.replaysAfterFirst, recorded.replaysAfterFirst + 1);
  assert.equal(reviewed.firstResponseMs, recorded.firstResponseMs);
  assert.equal(reviewed.firstCorrect, false);
  await seed({
    exercise: "m2",
    count: 0,
    context: true,
    roots: ["G"],
    qualities: ["7"],
    targetMode: "exact",
    targets: ["b3"],
  });
  await start();
  await ready();
  await page.getByRole("button", { name: "5", exact: true }).click();
  await page.evaluate(() => {
    window.holdCompletion = true;
  });
  await page
    .getByRole("button", { name: "Reveal Answer", exact: true })
    .click();
  await page.waitForFunction(() => !!window.releaseCompletion);
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await page.waitForURL(/#results\//);
  assert.equal(
    await page.evaluate(() =>
      window.playbacks.every((p) => p.activeVoices === 0),
    ),
    true,
  );
  await page.getByRole("link", { name: "Practice", exact: true }).click();
  await page.evaluate(() => {
    window.holdCompletion = false;
  });
  await start();
  await ready();
  const newerQuestion = await latest();
  await page.evaluate(() => window.releaseCompletion());
  await page.waitForTimeout(100);
  assert.equal(
    await page.locator(".answers button:enabled").count(),
    12,
    "stopped Reveal completion cannot resolve a newer question",
  );
  assert.deepEqual(await latest(), newerQuestion);
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await page.waitForURL(/#results\//);
  for (const method of ["imagined", "sung", "played"]) {
    await seed({
      exercise: "m1",
      count: 1,
      method,
      context: method !== "imagined",
      roots: ["C"],
      qualities: ["maj7"],
      targets: ["Third"],
      targetMode: "functional",
    });
    await start("M1");
    await ready();
    const calls = await page.evaluate(() => window.calls);
    assert.ok(calls.every((c) => c.midi === null));
    if (method === "imagined") assert.equal(calls.length, 0);
    else assert.equal(calls[0].context, true);
    if (method === "sung") await page.evaluate(() => (window.failAudio = true));
    if (method === "imagined")
      await page.evaluate(() => {
        window.holdCompletion = true;
      });
    await page
      .getByRole("button", { name: "Done", exact: true })
      .click();
    if (method === "sung") {
      await page.waitForFunction(() =>
        document
          .getElementById("feedback")
          .textContent.includes("Audio unavailable"),
      );
      const before = (await latest()).attempts[0];
      assert.equal(before.timingValidity, "valid");
      await page
        .getByRole("button", { name: "Retry audio", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Correct", exact: true })
        .waitFor();
      assert.equal(
        (await latest()).attempts[0].firstResponseMs,
        before.firstResponseMs,
      );
    }
    await page.getByRole("button", { name: "Correct", exact: true }).waitFor();
    await page.waitForFunction(
      () =>
        !document.querySelector("#wrong-degree")?.disabled &&
        ![...document.querySelectorAll("button")].find(
          (b) => b.textContent === "Correct",
        )?.disabled,
    );
    assert.ok(
      (await page.evaluate(() => window.calls)).some((c) => c.midi !== null),
    );
    assert.equal(
      await page
        .getByRole("button", { name: /^Replay(?: context| reference)?$/ })
        .isVisible(),
      true,
    );
    if (method === "played") await capture("m1-reference-desktop");
    if (method !== "played") {
      assert.equal(await page.locator("#wrong-degree").count(), 0);
      await page
        .getByRole("button", { name: "Incorrect", exact: true })
        .click();
      assert.equal((await latest()).attempts[0].firstCorrect, null);
      await page.locator("#wrong-degree").selectOption("unknown");
    } else
      await page.getByRole("button", { name: "Correct", exact: true }).click();
    if (method === "imagined") {
      await page.waitForTimeout(2800);
      assert.match(
        page.url(),
        /#practice$/,
        "grading cannot bypass reference completion",
      );
      await page.evaluate(() => {
        window.holdCompletion = false;
        window.releaseCompletion();
      });
    }
    await page.waitForURL(/#results\//);
    const a = (await latest()).attempts[0];
    assert.equal(a.responseMethod, method);
    assert.equal(a.gradingSource, "self");
    assert.equal(
      a.imaginedWrongDegree,
      method === "played" ? undefined : "unknown",
    );
    assert.ok(a.firstResponseMs >= 0);
    assert.match(
      await page.locator("main").textContent(),
      /Self-rated Accuracy/,
    );
  }
  await seed({ exercise: "m2", count: 0, autoAdvance: false });
  await start();
  await ready();
  await page.getByRole("button", { name: "5", exact: true }).click();
  if (
    await page
      .getByRole("button", { name: "Reveal Answer", exact: true })
      .count()
  ) {
    await page
      .getByRole("button", { name: "Reveal Answer", exact: true })
      .click();
    await page.getByRole("button", { name: "Next", exact: true }).waitFor();
  }
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await ready();
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await page.waitForURL(/#results\//);
  assert.equal((await latest()).attempts.length, 1);
  await seed({ exercise: "m2", count: 1 });
  await page.evaluate(() => (window.failAudio = true));
  await start();
  await page.waitForFunction(() =>
    document
      .getElementById("feedback")
      .textContent.includes("Audio unavailable"),
  );
  assert.equal(await page.locator(".answers button:enabled").count(), 0);
  await page.getByRole("button", { name: "Retry audio", exact: true }).click();
  await ready();
  await page
    .getByRole("button", {
      name: (await latest()).attempts[0].target.degree,
      exact: true,
    })
    .click();
  await page.waitForURL(/#results\//);
  assert.equal((await latest()).attempts[0].firstResponseMs, null);
  await seed({ exercise: "m2", count: 1 });
  await start();
  await ready();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    delete document.hidden;
  });
  await page.getByRole("button", { name: "Retry audio", exact: true }).click();
  await ready();
  await page
    .getByRole("button", {
      name: (await latest()).attempts[0].target.degree,
      exact: true,
    })
    .click();
  await page.waitForURL(/#results\//);
  assert.equal((await latest()).attempts[0].timingValidity, "interrupted");
  await page.goto(url);
  await page
    .locator('[data-preset-id="recognition-guides"]')
    .getByRole("button", { name: "Customize", exact: true })
    .click();
  for (const name of ["Practice", "Targets", "Harmony"]) {
    await page.getByRole("button", { name, exact: true }).click();
    assert.equal(
      await page
        .getByRole("button", { name: "Start practice", exact: true })
        .isVisible(),
      true,
    );
  }
  const rootInputs = page
    .getByRole("group", { name: "Roots", exact: true })
    .locator("input:checked");
  while ((await rootInputs.count()) > 1) await rootInputs.first().uncheck();
  const old = await page.evaluate(() =>
    localStorage.getItem("jazzEarLab:v2:presets"),
  );
  await rootInputs.first().uncheck();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("jazzEarLab:v2:presets")),
    old,
  );
  assert.match(
    await page.locator("#config-status").textContent(),
    /Last valid saved preset unchanged/,
  );
  await page
    .getByRole("group", { name: "Roots", exact: true })
    .getByLabel("C", { exact: true })
    .check();
  await page.reload();
  assert.equal(
    await page
      .getByRole("group", { name: "Roots", exact: true })
      .locator("input:checked")
      .count(),
    1,
  );
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Restore Default", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("group", { name: "Roots", exact: true })
      .locator("input:checked")
      .count(),
    12,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await capture("wizard-mobile");
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  assert.equal(
    await page.getByLabel("Response method (self-assessed)").count(),
    0,
  );
  await page.evaluate(() => {
    window.setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k.startsWith("jazzEarLab:v2:")) throw new Error("quota");
      return window.setItem.call(this, k, v);
    };
  });
  await page.getByLabel("Questions (0 = Unlimited)").fill("1");
  await page.getByLabel("Questions (0 = Unlimited)").dispatchEvent("change");
  assert.match(await page.locator("#config-status").textContent(), /Not saved/);
  await page.evaluate(() => (Storage.prototype.setItem = window.setItem));
  await page.getByRole("button", { name: "Retry saving", exact: true }).click();
  assert.equal(await page.locator("#error").isVisible(), false);
  await page
    .getByRole("button", { name: "Start practice", exact: true })
    .click();
  await ready();
  await capture("m2-mobile");
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await page.goto(url);
  page.once("dialog", (d) => d.accept("My V2 preset"));
  await page.getByRole("button", { name: "New preset", exact: true }).click();
  await page.waitForURL(/#configure$/);
  page.once("dialog", (d) => d.accept("Renamed V2 preset"));
  await page.getByRole("button", { name: "Rename", exact: true }).click();
  assert.match(await page.locator("h1").textContent(), /Renamed V2 preset/);
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Delete preset", exact: true })
    .click();
  await page.waitForURL(/#home$/);
  assert.doesNotMatch(
    await page.locator("main").textContent(),
    /Renamed V2 preset/,
  );
  for (const name of ["Harmony", "Targets", "Practice"]) {
    await page.goto(url);
    await page
      .locator('[data-preset-id="recognition-guides"]')
      .getByRole("button", { name: "Customize", exact: true })
      .click();
    await page.getByRole("button", { name, exact: true }).click();
    await page
      .getByRole("button", { name: "Start practice", exact: true })
      .click();
    await ready();
    await page.getByRole("button", { name: "Stop", exact: true }).click();
    await page.waitForURL(/#results\//);
  }
  await page.getByRole("link", { name: "Insights", exact: true }).click();
  await capture("insights-mobile");
  assert.match(
    await page.locator("main").textContent(),
    /Not enough comparable data/,
  );
  assert.deepEqual(
    await page.evaluate(() =>
      Object.fromEntries(
        Object.entries(localStorage).filter(([key]) =>
          key.startsWith("jazzEarLab:v1:"),
        ),
      ),
    ),
    legacy.records,
  );
  await page.goto(new URL("/jazz-ear-lab/#/history", url).href);
  await page.locator("#history-list .history-row").first().waitFor();
  assert.equal(
    await page.evaluate(
      async (id) =>
        (await import("/js/jazz/model.js"))
          .loadSessions(localStorage)
          .some((s) => s.id === id),
      legacy.id,
    ),
    true,
  );
  assert.equal(
    await page.evaluate(() =>
      localStorage.getItem("jazzEarLab:v1:test-sentinel"),
    ),
    "unchanged",
  );
  assert.deepEqual(errors, []);
  console.log(
    "V2 passed: exact/functional M1/M2, immutable first answers/retries, replay/timing, all methods, binary/Unknown self-ratings, fixed/unlimited, error recovery, nonlinear autosave/restore, mobile, source isolation and Insights.",
  );
} finally {
  await browser.close();
}
