import test from "node:test";
import assert from "node:assert/strict";
import {
  defaults,
  generate,
  isRecognition,
  validateConfig,
  loadProgressions,
  keys,
  recommendation,
} from "../js/jazz/model.js";
import {
  parseChord,
  targetPc,
  pitchClass,
  recognitionDegrees,
} from "../js/jazz/theory.js";
import { progressionBank, parseProgression } from "../js/jazz/progressions.js";
import { playbackPlan } from "../js/jazz/audio.js";
import { skillStats, confusions } from "../js/jazz/insights.js";

test("recognition options have exactly one spelling per pitch class, including dominant #9", () => {
  for (const symbol of ["Dm7", "G7", "Cmaj7", "Bm7b5"]) {
    const chord = parseChord(symbol),
      options = recognitionDegrees(chord);
    assert.equal(options.length, 12);
    assert.equal(new Set(options.map((d) => targetPc(chord, d))).size, 12);
    for (let i = 0; i < 20; i++) {
      const question = generate(
        { ...defaults, mode: "m2", root: chord.root, quality: chord.quality },
        i,
      );
      assert.ok(options.includes(question.targets[0].degree));
    }
  }
  const question = generate(
    {
      ...defaults,
      mode: "m2",
      root: "G",
      quality: "7",
      recognitionPool: "b3 #9",
    },
    0,
  );
  assert.equal(question.targets[0].degree, "#9");
  assert.equal(question.targets[0].name, "A#");
  assert.throws(() =>
    generate({ ...defaults, mode: "m2", recognitionPool: "" }, 0),
  );
});

test("every curated progression resolves local chord degrees without a global key", () => {
  for (const progression of progressionBank)
    for (const path of ["guided", "nearest"]) {
      const question = generate(
        { ...defaults, mode: "m5", progression: progression.id, path },
        0,
      );
      assert.equal(question.targets.length, progression.chords.length);
      question.targets.forEach((target) => {
        assert.equal(target.midi % 12, targetPc(target.chord, target.degree));
        assert.equal(pitchClass(target.name), target.midi % 12);
        assert.ok(target.beats >= 1 && target.beats <= 16);
      });
    }
});

test("M3 production shares the fixed melody but is self-assessed", () => {
  const config = { ...defaults, mode: "m3", commonMode: "produce", span: 2 };
  assert.equal(isRecognition(config), false);
  const targets = generate(config, 0).targets;
  assert.equal(targets.length, 2);
  assert.equal(new Set(targets.map((t) => t.midi)).size, 1);
  assert.equal(isRecognition({ ...config, commonMode: "recognize" }), true);
});

test("voice-leading constraints generate common tones, steps and real leaps", () => {
  for (const path of ["common", "stepwise", "leap"]) {
    const targets = generate({ ...defaults, mode: "m4", path }, 0).targets;
    targets.slice(1).forEach((target, i) => {
      const distance = Math.abs(target.midi - targets[i].midi);
      assert.ok(
        path === "common"
          ? distance === 0
          : path === "stepwise"
            ? distance <= 2
            : distance >= 3,
      );
    });
  }
});

test("custom progression validates symbols and harmonic rhythm, preserving saved durations", () => {
  const custom = parseProgression(
    "Dm7 2\nG7 2\nCmaj7 8",
    "My ii-V-I",
    "custom-test",
  );
  assert.deepEqual(custom.beats, [2, 2, 8]);
  const targets = generate(
    {
      ...defaults,
      mode: "m5",
      progression: custom.id,
      repeats: 2,
      path: "nearest",
    },
    0,
    [custom],
  ).targets;
  assert.deepEqual(
    targets.map((t) => t.beats),
    [2, 2, 8, 2, 2, 8],
  );
  assert.throws(() =>
    parseProgression("Dm7 0\nG7 4", "Invalid", "custom-invalid"),
  );
  assert.throws(() =>
    parseProgression("NotAChord 4\nG7 4", "Invalid", "custom-invalid"),
  );
  assert.throws(() =>
    parseProgression("Dm7 2.5\nG7 4", "Invalid", "custom-invalid"),
  );
  assert.throws(() => parseProgression("Dm7 4", "Invalid", "custom-invalid"));
  const storage = {
    getItem: () =>
      JSON.stringify([
        custom,
        { id: "custom-bad", chords: ["???"], beats: [1] },
      ]),
  };
  assert.deepEqual(loadProgressions(storage), [custom]);
});

test("audio timeline schedules count-in, seed, gaps, repeats and custom beats exactly", () => {
  const custom = parseProgression("Dm7 2\nG7 4", "Two chords", "custom-two");
  const config = { ...defaults, mode: "m3", bpm: 120, progression: custom.id };
  const targets = generate(config, 0, [custom]).targets;
  const plan = playbackPlan(targets, config, {
    countIn: 4,
    seed: true,
    gapBeats: 2,
    repeats: 2,
  });
  assert.deepEqual(
    plan.events.map((e) => [e.index, e.start, e.duration]),
    [
      [0, 2.5, 1],
      [1, 4.5, 2],
      [0, 7.5, 1],
      [1, 9.5, 2],
    ],
  );
  assert.equal(plan.duration, 11.54);
});

test("configuration rejects non-finite timing, invalid ranges and unsafe hidden shell cues", () => {
  for (const [key, value] of [
    ["bpm", NaN],
    ["predictionSeconds", Infinity],
    ["countIn", -1],
    ["repeats", 100],
    ["gapBeats", 8],
    ["low", NaN],
  ])
    assert.throws(() => validateConfig({ ...defaults, [key]: value }));
  assert.throws(() =>
    validateConfig({ ...defaults, showChords: false, context: "shell" }),
  );
  assert.equal(
    validateConfig({
      ...defaults,
      mode: "m3",
      showChords: false,
      context: "shell",
    }).context,
    "full",
  );
});

const base = {
  timestamp: new Date().toISOString(),
  mode: "m2",
  config: { ...defaults, mode: "m2", root: "G", quality: "7" },
  chords: ["G7"],
  targets: ["3"],
  actualNotes: ["B"],
  progressionId: "single",
  responseLatency: 2,
  replayCount: 1,
  grade: "missed",
  gradingSource: "automatic",
  selectedDegrees: ["b7"],
};
test("weakness stats keep self-assessment and recognition separate, with actual confusions", () => {
  const self = {
    ...base,
    gradingSource: "self",
    grade: "close",
    selectedDegrees: undefined,
  };
  const sessions = [{ records: [base, self] }];
  const stats = skillStats(sessions, "degree");
  assert.equal(stats.length, 2);
  assert.equal(stats.find((s) => s.source === "automatic").missed, 1);
  assert.equal(stats.find((s) => s.source === "self").close, 1);
  assert.deepEqual(confusions([base, self]), [
    { expected: "3", selected: "b7", count: 1 },
  ]);
  assert.equal(recommendation(sessions).mode, "m1"); // Unknown historical exposure cannot establish a weakness.
});

test("legacy records without selected answers still contribute without invented confusion pairs", () => {
  const legacy = { ...base, selectedDegrees: undefined };
  assert.deepEqual(confusions([legacy]), []);
  assert.equal(skillStats([{ records: [legacy] }], "quality")[0].label, "7");
  assert.equal(keys.sessions, "jazzEarLab:v1:sessions");
});
test("reference-assisted retries stay saved but do not inflate recognition or mastery stats", () => {
  const assisted = {
    ...base,
    grade: "correct",
    referenceAssisted: true,
    selectedDegrees: ["3"],
  };
  const stats = skillStats([{ records: [base, assisted] }], "degree");
  assert.equal(stats[0].count, 1);
  assert.equal(stats[0].correct, 0);
  assert.deepEqual(confusions([assisted]), []);
  assert.equal(recommendation([{ records: [assisted] }]).mode, "m1");
});
