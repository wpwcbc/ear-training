import assert from "node:assert/strict";
import { labURL, navigate } from "./browser-support.mjs";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
page.setDefaultTimeout(15000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.route("**/*", (route) => {
  const url = route.request().url();
  if (!url.startsWith("http://127.0.0.1:4173") && /tone/i.test(url))
    return route.fulfill({ contentType: "application/javascript", body: "" });
  return route.continue();
});
await page.addInitScript(() => {
  class Synth {
    constructor() {
      this.volume = { value: 0 };
    }
    toDestination() {
      return this;
    }
    triggerAttackRelease() {}
    triggerAttack() {}
    triggerRelease() {}
    releaseAll() {}
    dispose() {}
    set() {}
    connect() {
      return this;
    }
  }
  window.Tone = {
    Synth,
    PolySynth: Synth,
    start: async () => {},
    now: () => performance.now() / 1000,
  };
});
const sourcePaths = {
  degree: "degree-trainer",
  interval: "interval-trainer",
  "chord-quality": "chord-quality",
  "progression-id": "progression-id",
};
const degreeConfig = {
  keyCenter: "C",
  progression: [
    {
      chordDegree: "1",
      quality: "maj7",
      allowedUpperDegrees: ["1", "3", "5"],
      questions: 2,
    },
  ],
  minRootNote: "C2",
  minRootMidi: 36,
  loopTimes: 1,
  loopKeyShift: 0,
};
try {
  for (const source of Object.keys(sourcePaths)) {
    await page.goto("http://127.0.0.1:4173/" + sourcePaths[source] + "/");
    const initial = await page.evaluate(
      async ({ source, degreeConfig }) => {
        const audio = await import("/js/" + source + "/audio.js"),
          test = await import("/js/" + source + "/test.js"),
          { state } = await import("/js/" + source + "/state.js");
        await audio.ensureAudioReady();
        if (source === "degree" || source === "interval")
          test.startTest(
            {
              ...degreeConfig,
              ...(source === "interval" ? { intervalMode: "harmonic" } : {}),
            },
            "mode1",
          );
        else if (source === "chord-quality")
          test.startTest({
            totalQuestions: 2,
            minRootNote: "C2",
            minRootMidi: 36,
            enabledQualities: ["maj7", "m7"],
            enabledVoicings: ["closed"],
            enabledInversions: [0],
            playbackMode: "stacked",
          });
        else
          test.startTest({
            keyCenter: "C",
            mode: "major",
            minRootNote: "C2",
            minRootMidi: 36,
            substitutions: {
              secondaryMajorIIV: false,
              secondaryMinorIIVb9: false,
              tritoneSubs: false,
              backdoor: false,
              borrowed: false,
            },
          });
        return structuredClone(state.currentQuestion);
      },
      { source, degreeConfig },
    );
    await page.waitForFunction(async (source) => {
      const { readAll, flush } =
        await import("/js/jazz/analytics/repository.js");
      await flush();
      return (await readAll("events")).some(
        (e) =>
          e.source === source && e.type === "legacy_response_window_opened",
      );
    }, source);
    const ui = await page.evaluate(async (source) => {
      const { dom } = await import("/js/" + source + "/dom.js"),
        { state } = await import("/js/" + source + "/state.js"),
        q = state.currentQuestion;
      if (source === "progression-id")
        return {
          degreeA: dom.elDegreeSelectA.id,
          qualityA: dom.elQualitySelectA.id,
          degreeB: dom.elDegreeSelectB.id,
          qualityB: dom.elQualitySelectB.id,
          submit: dom.btnSubmitAnswer.id,
        };
      const buttons = Array.from(dom.elAnswers.querySelectorAll("button")).map(
          (b) => b.textContent,
        ),
        correct =
          source === "degree"
            ? q.correctUpperDegree
            : source === "interval"
              ? q.intervalLabel
              : (
                  await import("/js/chord-quality/options.js")
                ).QUALITY_OPTIONS.find((o) => o.id === q.quality).label;
      return { correct, wrong: buttons.find((text) => text !== correct) };
    }, source);
    if (source === "progression-id") {
      await page
        .locator("#" + ui.degreeA)
        .selectOption(initial.progression[1].degree);
      await page
        .locator("#" + ui.degreeB)
        .selectOption(initial.progression[2].degree);
      await page
        .locator("#" + ui.qualityA)
        .selectOption(initial.progression[1].quality);
      const wrong = await page
        .locator("#" + ui.qualityB + " option")
        .evaluateAll(
          (options, correct) => options.find((o) => o.value !== correct).value,
          initial.progression[2].quality,
        );
      await page.locator("#" + ui.qualityB).selectOption(wrong);
      await page.locator("#" + ui.submit).click();
    } else
      await page.getByRole("button", { name: ui.wrong, exact: true }).click();
    const wrong = await page.evaluate(async (source) => {
      const r = await import("/js/jazz/analytics/repository.js");
      await r.flush();
      return (await r.readAll("events"))
        .filter((e) => e.source === source && e.trial)
        .map((e) => e.trial);
    }, source);
    assert.equal(wrong.length, 1);
    assert.equal(wrong[0].correct, false);
    assert.ok(wrong[0].responseActiveMs >= 0);
    assert.ok(wrong[0].question);
    assert.ok(wrong[0].config);
    if (source === "progression-id") {
      assert.equal(wrong[0].components.length, 2);
      assert.equal(wrong[0].components[0].quality, true);
      assert.equal(wrong[0].components[1].quality, false);
      await page
        .locator("#" + ui.qualityB)
        .selectOption(initial.progression[2].quality);
      await page.locator("#" + ui.submit).click();
    } else
      await page.getByRole("button", { name: ui.correct, exact: true }).click();
    const trials = await page.evaluate(async (source) => {
      const r = await import("/js/jazz/analytics/repository.js");
      await r.flush();
      return (await r.readAll("events"))
        .filter((e) => e.source === source && e.trial)
        .map((e) => e.trial)
        .sort((a, b) => a.ordinal - b.ordinal);
    }, source);
    assert.equal(trials.length, 2);
    assert.equal(trials[1].correct, true);
    assert.equal(trials[0].questionId, trials[1].questionId);
    assert.equal(trials[1].ordinal, 2);
    await page.evaluate(
      async (source) => (await import("/js/" + source + "/test.js")).stopTest(),
      source,
    );
    await page.waitForTimeout(650);
    assert.equal(
      await page.evaluate(
        async (source) =>
          (await import("/js/" + source + "/state.js")).state.currentQuestion,
        source,
      ),
      null,
    );
  }
  await page.goto("http://127.0.0.1:4173/drone/");
  await page.evaluate(async () => {
    const audio = await import("/js/drone/audio.js"),
      { state } = await import("/js/drone/state.js"),
      setup = await import("/js/drone/setup.js"),
      exercise = await import("/js/drone/exercise.js");
    await audio.ensureAudioReady();
    state.playbackMode = "ambience";
    state.ambienceMode = "steady";
    exercise.startDrone(setup.readMode1Config(), "mode1");
  });
  await page.waitForTimeout(120);
  await page.evaluate(async () =>
    (await import("/js/drone/exercise.js")).stopDrone(),
  );
  await page.goto(labURL + "#/insights/legacy");
  await page
    .getByText("New recorded trials", { exact: true })
    .first()
    .waitFor();
  assert.match(
    await page.locator("#analytics-content").innerText(),
    /0\/1 \(0%\)/,
  );
  assert.match(
    await page.locator("#analytics-content").innerText(),
    /foreground playback/,
  );
  const launch = await page.evaluate(async () => {
    const r = await import("/js/jazz/analytics/repository.js"),
      { prepareLegacyLaunch } = await import("/js/analytics/legacy.js");
    await r.flush();
    const events = await r.readAll("events");
    const trial = events.find((e) => e.source === "degree" && e.trial).trial;
    return { url: prepareLegacyLaunch(trial, true), question: trial.question };
  });
  await page.goto(new URL(launch.url, labURL).href);
  await page
    .getByRole("button", { name: "Start focused practice", exact: true })
    .click();
  const exact = await page.evaluate(async () => {
    const { state } = await import("/js/degree/state.js");
    return {
      question: state.currentQuestion,
      count: state.questionQueue.length,
    };
  });
  assert.equal(exact.count, 10);
  assert.equal(exact.question.upperNote, launch.question.upperNote);
  assert.deepEqual(exact.question.chordNotes, launch.question.chordNotes);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(labURL + "#/insights/legacy");
  await page
    .getByText("New recorded trials", { exact: true })
    .first()
    .waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: process.env.TEMP + "/jazz-legacy-insights-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "Legacy Insights browser checks passed: all four sources, wrong/retry capture, one joint progression denominator, scheduled timing, Drone activity and source-specific exact review.",
  );
} finally {
  await browser.close();
}
