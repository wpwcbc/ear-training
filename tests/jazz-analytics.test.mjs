import test from "node:test";
import assert from "node:assert/strict";
import { defaults, generate } from "../js/jazz/model.js";
import { normalize, legacyData } from "../js/jazz/analytics/adapters.js";
import { wilson, evidenceLabel, dayKey } from "../js/jazz/analytics/policy.js";
import {
  aggregate,
  components,
  cells,
  markScore,
  matchedTrends,
  priorities,
} from "../js/jazz/analytics/metrics.js";
import {
  compileDrill,
  compileDiagnostic,
} from "../js/jazz/analytics/drills.js";
import { analyticsCohortKey } from "../js/jazz/analytics/types.js";
const now = Date.parse("2026-10-21T12:00:00Z");
function fixture(overrides = {}, id = "s1") {
  const config = { ...defaults, ...overrides },
    question = generate(config, 0, [], () => 0.1);
  const record = {
    questionIndex: 0,
    chordStep: config.mode === "m4" ? 1 : 0,
    timestamp: new Date(now - 1000).toISOString(),
    mode: config.mode,
    config,
    chords: question.targets.map((t) => t.chord.symbol),
    targets: question.targets.map((t) => t.degree),
    actualNotes: question.targets.map((t) => t.name),
    actualMidis: question.targets.map((t) => t.midi),
    progressionId: question.progressionId,
    responseLatency: 5,
    gradingSource:
      config.mode === "m2" ||
      (config.mode === "m3" && config.commonMode === "recognize")
        ? "automatic"
        : "self",
    grade: "correct",
    replayCount: 0,
    referenceAssisted: false,
  };
  const session = {
    id,
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
    record,
    session,
    question,
    row: () => normalize(session, record, 0),
  };
}
test("Wilson and cross-day gates use the actual interval width", () => {
  assert.equal(wilson(0, 0), null);
  assert.equal(evidenceLabel(1, 1, 1, 1), "Early signal");
  assert.equal(evidenceLabel(30, 30, 1, 1), "Building evidence");
  assert.equal(evidenceLabel(30, 15, 3, 3), "Building evidence");
  const interval = wilson(25, 50);
  assert.ok(Math.abs(interval[0] - 0.366) < 0.001);
  assert.ok(Math.abs(interval[1] - 0.634) < 0.001);
  assert.equal(evidenceLabel(50, 25, 3, 3), "Enough to guide practice");
});
test("Hidden quality errors do not become degree errors", () => {
  const f = fixture({ mode: "m2", showChords: false });
  f.record.selectedDegrees = [f.record.targets[0]];
  f.record.selectedQualities = ["wrong"];
  f.record.grade = "missed";
  const c = components([f.row()]);
  assert.equal(c.degree, 1);
  assert.equal(c.quality, 0);
  assert.equal(c.qualityN, 1);
  assert.equal(c.conditionalN, 0);
  f.record.config.showChords = true;
  assert.equal(components([f.row()]).qualityN, 0);
});
test("M3 recognition separates one sequence from five answer items", () => {
  const f = fixture({ mode: "m3", span: 5 });
  f.record.selectedDegrees = [...f.record.targets];
  f.record.selectedDegrees[0] = "wrong";
  f.record.grade = "missed";
  assert.equal(components([f.row()]).degreeN, f.record.targets.length);
  assert.equal(aggregate([f.row()], "UTC", now).eligibleCount, 1);
  assert.equal(aggregate([f.row(), f.row()], "UTC", now).eligibleCount, 1);
});
test("Production sequences and two-target steps retain parent grades", () => {
  const f = fixture({ mode: "m3", commonMode: "produce" });
  f.record.grade = "missed";
  const rows = [f.row()];
  assert.equal(cells(rows).length, 1);
  assert.equal(aggregate(rows, "UTC", now).ratings.missed, 1);
  assert.equal(rows[0].grain, "sequence");
});
test("Retry recovery cannot replace a wrong first answer", () => {
  const f = fixture({ mode: "m2" });
  f.record.grade = "missed";
  const first = f.row();
  f.record.grade = "correct";
  f.record.referenceAssisted = true;
  const retry = f.row();
  retry.id += "retry";
  const a = aggregate([first, retry], "UTC", now);
  assert.equal(a.eligibleCount, 1);
  assert.equal(a.correct, 0);
});
test("Unknown exposure and missing snapshot identity cannot claim confidence", () => {
  const f = fixture();
  delete f.record.referenceAssisted;
  assert.equal(f.row().assistance, "unknown");
  assert.equal(aggregate([f.row()], "UTC", now).eligibleCount, 0);
  f.record.referenceAssisted = false;
  f.session.questions = [];
  assert.equal(f.row().questionId, null);
  assert.equal(aggregate([f.row()], "UTC", now).eligibleCount, 0);
});
test("Snapshot alignment rejects mismatched historical targets", () => {
  const f = fixture();
  f.record.targets = ["b7"];
  assert.equal(f.row().challenge, undefined);
});
test("Phrase marking handles empty selections and duplicate indices", () => {
  assert.deepEqual(markScore([0, 4, 8], [0, 2, 8]), {
    hits: 2,
    selected: 3,
    expected: 3,
    precision: 2 / 3,
    recall: 2 / 3,
  });
  assert.equal(markScore([0, 4, 8], []).precision, null);
  assert.equal(markScore([0, 4, 8], []).recall, 0);
  assert.equal(markScore([0], [0, 0]).selected, 1);
});
test("Legacy solved-only data retains rows and parse failures", () => {
  const storage = {
    getItem: (key) =>
      key === "eartrain:questionHistory"
        ? JSON.stringify(
            [1, 2, 4].map((attempts) => ({ attempts, timeSeconds: 2 })),
          )
        : null,
  };
  const data = legacyData(storage)[0];
  assert.equal(data.rows.length, 3);
  assert.equal(data.rows.filter((r) => r.attempts === 1).length, 1);
  assert.ok(legacyData({ getItem: () => "{bad" })[0].error);
});
test("Timezone bucketing uses explicit midnight and DST boundaries", () => {
  assert.notEqual(
    dayKey("2026-10-21T20:00:00Z", "UTC"),
    dayKey("2026-10-21T20:00:00Z", "Asia/Hong_Kong"),
  );
  assert.equal(
    dayKey("2026-11-01T05:30:00Z", "America/New_York"),
    dayKey("2026-11-01T06:30:00Z", "America/New_York"),
  );
});
test("Future dates are excluded without erasing untimed outcomes", () => {
  const f = fixture();
  f.record.responseLatency = NaN;
  assert.equal(aggregate([f.row()], "UTC", now).correct, 1);
  f.record.timestamp = new Date(now + 86400000).toISOString();
  assert.equal(aggregate([f.row()], "UTC", now).eligibleCount, 0);
});
test("Cohorts separate difficulty, timing and exposure but ignore volume/count", () => {
  const key = (c) => analyticsCohortKey(c, [], "self", "fresh", "v1");
  assert.equal(key(defaults), key({ ...defaults, count: 20, volume: 0.1 }));
  assert.notEqual(key(defaults), key({ ...defaults, hintLevel: "minimal" }));
  assert.notEqual(
    key(defaults),
    analyticsCohortKey(defaults, [], "self", "exact-review", "v1"),
  );
});
test("Focused drill validates exact 7/3 allocation and does not mutate inherited pools", () => {
  const f = fixture({ degreePool: ["b3", "9"], qualityPool: ["m7"] });
  const before = JSON.stringify(f.session);
  const result = compileDrill(cells([f.row()])[0], "insights/m1?root=D");
  assert.equal(result.supported, true);
  const degree = f.record.targets[0];
  assert.equal(
    result.plan.questions.filter((q) => q.targets[0].degree === degree).length,
    7,
  );
  assert.equal(result.plan.questions.length, 10);
  assert.equal(JSON.stringify(f.session), before);
  assert.deepEqual(
    result.plan.questions,
    compileDrill(cells([f.row()])[0], "insights/m1").plan.questions,
  );
});
test("Unsupported sequence focus gives a reason rather than broad substitution", () => {
  const f = fixture({ mode: "m3" }),
    result = compileDrill(cells([f.row()])[0], "insights/m3");
  assert.equal(result.supported, false);
  assert.ok(result.unsupportedReason);
});
test("Sparse observations do not claim a confirmed weakness or matched improvement", () => {
  const f = fixture();
  f.record.grade = "missed";
  const rows = [f.row()];
  assert.equal(priorities(rows, "UTC", now)[0].category, "Possible difficulty");
  assert.equal(matchedTrends(rows, "UTC", now).length, 0);
});
test("Diagnostic sets balance five compatible cells without changing the source config", () => {
  const before = JSON.stringify(defaults),
    plan = compileDiagnostic(defaults, "insights");
  assert.ok(plan);
  assert.equal(plan.questions.length, 10);
  const counts = new Map();
  for (const question of plan.questions) {
    const d = question.targets[0].degree;
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  assert.equal(counts.size, 5);
  assert.deepEqual([...counts.values()], [2, 2, 2, 2, 2]);
  assert.equal(JSON.stringify(defaults), before);
});
test("Observed M2 degree confusion schedules balanced expected labels", () => {
  const f = fixture({ mode: "m2", degreePool: ["9"], recognitionPool: "9" });
  f.record.selectedDegrees = ["b3"];
  f.record.grade = "missed";
  const result = compileDrill(cells([f.row()])[0], "insights/m2");
  assert.equal(result.supported, true);
  assert.equal(
    result.plan.questions.filter((q) => q.targets[0].degree === "9").length,
    5,
  );
  assert.equal(
    result.plan.questions.filter((q) => q.targets[0].degree === "b3").length,
    5,
  );
});
test("Faster decisions with lower recognition accuracy are labelled as a trade-off", () => {
  const f = fixture({ mode: "m2" }),
    base = f.row(),
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
      e.record.grade =
        i < (period === "current" ? 40 : 49) ? "correct" : "missed";
      e.capabilities.timing = true;
      e.record.analytics = { activeMs: period === "current" ? 5000 : 10000 };
      rows.push(e);
    }
  const trend = matchedTrends(rows, "UTC", now)[0];
  assert.equal(trend.timingSupported, true);
  assert.match(trend.speedLabel, /trade-off/);
});
