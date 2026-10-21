import test from "node:test";
import assert from "node:assert/strict";
import { defaults, generate } from "../js/jazz/model.js";
import { normalize } from "../js/jazz/analytics/adapters.js";
import { cells, priorities } from "../js/jazz/analytics/metrics.js";
import {
  compileDrill,
  compileDiagnostic,
} from "../js/jazz/analytics/drills.js";
import { validateScheduled } from "../js/jazz/analytics/focused.js";
import { bassPositions } from "../js/jazz/bass.js";
import { legacySummary } from "../js/analytics/legacy.js";
const now = Date.parse("2026-10-21T12:00:00Z");
function fixture(settings) {
  const config = { ...defaults, ...settings },
    question = generate(config, 0, [], () => 0.1);
  const step = ["m4", "m5"].includes(config.mode) ? 1 : 0;
  const targets = (
    config.mode === "m4" || (config.mode === "m5" && config.runMode === "step")
      ? question.targets.slice(step, step + 1)
      : question.targets
  ).flatMap((t) => [
    t,
    ...(t.secondDegree
      ? [{ ...t, degree: t.secondDegree, midi: t.secondMidi }]
      : []),
  ]);
  const record = {
    questionIndex: 0,
    chordStep: step,
    timestamp: new Date(now - 1000).toISOString(),
    mode: config.mode,
    config,
    chords: targets.map((t) => t.chord.symbol),
    targets: targets.map((t) => t.degree),
    actualNotes: targets.map((t) => t.name),
    actualMidis: targets.map((t) => t.midi),
    progressionId: question.progressionId,
    responseLatency: 5,
    gradingSource: config.mode === "m2" ? "automatic" : "self",
    grade: "missed",
    replayCount: 0,
    referenceAssisted: false,
  };
  const session = {
    id: "fixture",
    timestamp: record.timestamp,
    mode: config.mode,
    config,
    questionCount: 10,
    completedCount: 1,
    totalTime: 5,
    records: [record],
    questions: [question],
  };
  return {
    config,
    question,
    record,
    session,
    cell: () => cells([normalize(session, record, 0)])[0],
  };
}
test("Hidden-quality confusion allocates five actual expected qualities each", () => {
  const f = fixture({
    mode: "m2",
    showChords: false,
    recognitionQualities: "m7",
    degreePool: ["9"],
  });
  f.record.selectedDegrees = ["9"];
  f.record.selectedQualities = ["7"];
  const before = JSON.stringify(f.session),
    result = compileDrill(f.cell(), "insights/m2?task=hidden");
  assert.equal(result.supported, true);
  assert.equal(
    result.plan.questions.filter((q) => q.targets[0].chord.quality === "m7")
      .length,
    5,
  );
  assert.equal(
    result.plan.questions.filter((q) => q.targets[0].chord.quality === "7")
      .length,
    5,
  );
  assert.ok(result.plan.questions.every((q) => q.targets[0].degree === "9"));
  assert.equal(JSON.stringify(f.session), before);
});
test("M4 focus preserves source, destination, motion and prediction window", () => {
  const f = fixture({ mode: "m4", predictionSeconds: 2.5, path: "nearest" }),
    r = compileDrill(f.cell(), "insights/m4");
  assert.equal(r.supported, true);
  assert.equal(r.plan.selectionPolicy, "exact-review");
  const pair = f.question.targets.slice(0, 2);
  assert.equal(
    r.plan.questions.filter((q) => q.targets.length === 2).length,
    7,
  );
  r.plan.questions
    .filter((q) => q.targets.length === 2)
    .forEach((q) => assert.deepEqual(q.targets, pair));
  assert.equal(r.plan.config.predictionSeconds, 2.5);
});
test("M5 selected section keeps run mode and pair targets with full-progression contrasts", () => {
  const f = fixture({
      mode: "m5",
      runMode: "continuous",
      targetPattern: "two",
    }),
    cell = f.cell();
  cell.focus = { targetIndex: 2 };
  const r = compileDrill(cell, "insights/m5?task=continuous-two");
  assert.equal(r.supported, true);
  assert.equal(r.plan.config.runMode, "continuous");
  assert.equal(r.plan.config.targetPattern, "two");
  assert.equal(
    r.plan.questions.filter((q) => q.focus?.kind === "section").length,
    7,
  );
  r.plan.questions.forEach((q) => validateScheduled(q, r.plan.config));
});
test("Phrase-stage focus keeps full listening context and exactly three explicit rhythm contrasts", () => {
  const f = fixture({ mode: "m6", phraseId: "landmarks" }),
    cell = f.cell();
  cell.focus = { stage: "bass" };
  const r = compileDrill(cell, "insights/m6");
  assert.equal(r.supported, true);
  assert.equal(r.plan.config.phraseFocus, "bass");
  assert.ok(
    r.plan.questions.every((q) => q.phrase && q.focus.stage === "bass"),
  );
  assert.equal(
    r.plan.questions.filter((q) => q.presentation?.variation === "rhythm")
      .length,
    3,
  );
});
test("Mapping focus schedules the same MIDI at an alternate valid string/fret", () => {
  const f = fixture({ mode: "m7" }),
    cell = f.cell(),
    positions = bassPositions(f.question.targets[0].midi, 0, 12);
  assert.ok(positions.length >= 2);
  cell.focus = { position: positions[1] };
  const r = compileDrill(cell, "insights/m7");
  assert.equal(r.supported, true);
  assert.equal(r.plan.config.bassString, positions[1].string);
  assert.equal(r.plan.config.fretNames, false);
  assert.ok(
    r.plan.questions.every((q) => q.targets[0].midi === positions[1].midi),
  );
  assert.equal(generate(r.plan.config, 0).targets[0].midi, positions[1].midi);
});
test("All seven modes have deterministic balanced diagnostic sessions", () => {
  for (const mode of ["m1", "m2", "m3", "m4", "m5", "m6", "m7"]) {
    const config = { ...defaults, mode },
      plan = compileDiagnostic(config, "insights");
    assert.ok(plan, mode);
    assert.equal(plan.questions.length, 10);
    plan.questions.forEach((q) =>
      validateScheduled(q, { ...plan.config, ...q.presentation }),
    );
    assert.deepEqual(
      plan.questions,
      compileDiagnostic(config, "insights").questions,
    );
  }
});
test("Missing snapshots and corrupt fixed-pitch material fail with an explicit reason", () => {
  const f = fixture({ mode: "m3" }),
    cell = f.cell();
  delete cell.rows[0].challenge;
  assert.equal(compileDrill(cell, "insights/m3").supported, false);
  const invalid = structuredClone(f.question);
  invalid.targets[1].midi++;
  assert.throws(() => validateScheduled(invalid, f.config));
});
test("Sufficient matched timing can rank correct-but-slow without a universal time threshold", () => {
  const f = fixture({ mode: "m2" }),
    base = f.cell().rows[0],
    rows = [];
  for (const period of ["current", "prior"])
    for (let i = 0; i < 50; i++) {
      const e = structuredClone(base);
      e.id = period + i;
      e.questionId = period + i;
      e.sessionId = period + (i % 3);
      e.createdAt = new Date(
        now - ((period === "current" ? 1 : 29) + (i % 3)) * 86400000,
      ).toISOString();
      e.record.grade = "correct";
      e.capabilities.timing = true;
      e.record.analytics = { activeMs: period === "current" ? 10000 : 4000 };
      rows.push(e);
    }
  assert.equal(
    priorities(
      rows.filter((e) => e.id.startsWith("current")),
      "UTC",
      now,
      rows,
    )[0].category,
    "Correct but slow",
  );
  assert.notEqual(
    priorities(
      rows.filter((e) => e.id.startsWith("current")),
      "UTC",
      now,
    )[0].category,
    "Correct but slow",
  );
});
test("New Progression ID first answers use one joint denominator and retain item components", () => {
  const trial = {
    source: "progression-id",
    sessionId: "s",
    questionId: "q",
    config: {},
    task: "joint",
    question: {},
    expected: [
      { degree: "2", quality: "m7" },
      { degree: "5", quality: "7" },
    ],
    selected: [
      { degree: "2", quality: "m7" },
      { degree: "5", quality: "maj7" },
    ],
    correct: false,
    ordinal: 1,
    exposure: "fresh",
    components: [
      { degree: true, quality: true },
      { degree: true, quality: false },
    ],
  };
  const events = [
    {
      source: "progression-id",
      type: "legacy_question_presented",
      questionId: "q",
    },
    { source: "progression-id", type: "legacy_answer_committed", trial },
    {
      source: "progression-id",
      type: "legacy_answer_committed",
      trial: { ...trial, ordinal: 2, correct: true },
    },
  ];
  const s = legacySummary(events, "progression-id");
  assert.equal(s.count, 1);
  assert.equal(s.correct, 0);
  assert.equal(s.trials.length, 2);
  assert.equal(s.confusions.length, 1);
  assert.equal(legacySummary(events, "degree").count, 0);
});
test("Diagnostic scopes honor selected roots, blind qualities and limited target pools", () => {
  const config = {
    ...defaults,
    mode: "m2",
    showChords: false,
    roots: "F G",
    rootOrder: "random",
    root: "D",
    recognitionQualities: "7",
    degreePool: ["3", "9"],
  };
  const plan = compileDiagnostic(config, "insights");
  assert.ok(plan);
  assert.ok(
    plan.questions.every(
      (q) =>
        q.targets[0].chord.root === "F" && q.targets[0].chord.quality === "7",
    ),
  );
  assert.equal(
    plan.questions.filter((q) => q.targets[0].degree === "3").length,
    5,
  );
  assert.equal(
    plan.questions.filter((q) => q.targets[0].degree === "9").length,
    5,
  );
});
