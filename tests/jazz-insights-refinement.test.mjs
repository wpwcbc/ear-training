import test from "node:test";
import assert from "node:assert/strict";
import {
  assessment,
  supportedParent,
  query,
  now,
} from "./summary-fixtures.mjs";
import { buildSummary } from "../js/jazz/analytics/summary/rules.js";
import { comparisonFamily } from "../js/jazz/analytics/hierarchy.js";
import { confusionGrids, legacyGrid } from "../js/jazz/analytics/grids.js";
import {
  responseOptions,
  captureChoicePolicy,
} from "../js/jazz/recognition.js";
import { parseChord } from "../js/jazz/theory.js";
import { validateConfig } from "../js/jazz/model.js";
import { cells } from "../js/jazz/analytics/metrics.js";
import { compileDrill } from "../js/jazz/analytics/drills.js";

test("fixed distractors are canonical for every quality, not silently dropped", () => {
  const e = substituted(0, "9");
  assert.throws(
    () =>
      validateConfig(
        {
          ...e.config,
          responseDistractors: "1 b3 5",
          qualityPool: ["m7", "7"],
        },
        [],
      ),
    /every selected quality/,
  );
  assert.throws(
    () =>
      validateConfig(
        {
          ...e.config,
          degreePool: undefined,
          recognitionPool: "b3",
          quality: "7",
          qualityPool: ["7"],
          responseDistractors: "1 #9 5",
        },
        [],
      ),
    /Canonical target/,
  );
});

test("fixed-choice focused drills preserve substitution but reject turning a distractor into a target", () => {
  const e = assessment(0, {
    mode: "m2",
    degree: "9",
    grade: "correct",
    config: {
      responseDistractors: "1 5 b7",
      degreePool: ["9", "11"],
      recognitionPool: "9 11",
    },
  });
  const cell = cells([e])[0],
    result = compileDrill(cell, "insights/m2");
  assert.equal(result.supported, true, result.unsupportedReason);
  assert.deepEqual(
    new Set(result.plan.questions.map((q) => q.targets[0].degree)),
    new Set(["9", "11"]),
  );
  const blocked = compileDrill(
    { ...cell, focus: { component: "degree", selected: "5" } },
    "insights/m2",
  );
  assert.equal(blocked.supported, false);
  assert.match(blocked.unsupportedReason, /fixed distractor/);
});
function twoQualities(secondCount = 50, secondGrade) {
  const a = supportedParent(),
    b = Array.from({ length: secondCount }, (_, i) =>
      assessment(i + 100, {
        quality: "7",
        grade: secondGrade ?? (i % 2 ? "missed" : "correct"),
        root: ["D", "G", "C", "F", "A"][Math.floor(i / 10) % 5],
      }),
    );
  return [...a, ...b];
}
test("L1 cross-quality wording requires two supported balanced strata", () => {
  const m = buildSummary(twoQualities(), query, undefined, now),
    degree = m.cells.find((c) => c.level === "degree");
  assert.equal(degree.qualityGuard.supported, true);
  assert.ok(m.statements.some((i) => i.templateId === "cross-quality"));
  assert.equal(degree.denominator, 100);
  assert.equal(
    m.recommendations.some((i) => i.cellId === degree.id),
    false,
  );
});
test("quality dominance, sparse strata and reversals veto broad statements, not raw evidence", () => {
  for (const rows of [
    twoQualities(10),
    twoQualities(50, "correct"),
    twoQualities(5),
  ]) {
    const m = buildSummary(rows, query, undefined, now),
      c = m.cells.find((c) => c.level === "degree");
    assert.equal(c.qualityGuard.supported, false);
    assert.ok(c.denominator > 50);
    assert.ok(!m.statements.some((i) => i.templateId === "cross-quality"));
  }
});
test("other settings remain part of cross-quality comparability", () => {
  const rows = twoQualities();
  for (const e of rows.slice(50))
    e.config = { ...e.config, hintLevel: "minimal" };
  assert.equal(
    buildSummary(rows, query, undefined, now).cells.find(
      (c) => c.level === "degree",
    ).qualityGuard.supported,
    false,
  );
});
function substituted(i, degree) {
  const e = assessment(i, {
    mode: "m2",
    degree,
    config: {
      responseDistractors: "1 5 b7",
      degreePool: [degree],
      recognitionPool: degree,
    },
  });
  const options = [
    responseOptions(parseChord(e.record.chords[0]), degree, e.config),
  ];
  e.record.analytics = {
    answerOptions: options,
    choicePolicy: captureChoicePolicy(e.config, options),
  };
  e.version = "standard";
  return e;
}
test("declared tested-label substitution matches policy/count/distractors, without rewriting leaf cohorts", () => {
  const a = substituted(0, "9"),
    b = substituted(1, "11");
  assert.notEqual(a.cohortKey, b.cohortKey);
  assert.notDeepEqual(
    a.record.analytics.answerOptions,
    b.record.analytics.answerOptions,
  );
  assert.equal(comparisonFamily(a, true), comparisonFamily(b, true));
  const changed = structuredClone(b);
  changed.record.analytics.answerOptions[0].push("13");
  assert.equal(comparisonFamily(changed, true), "unknown");
  for (const key of ["counts", "distractors"]) {
    const malformed = structuredClone(a);
    delete malformed.record.analytics.choicePolicy[key];
    assert.equal(comparisonFamily(malformed, true), "unknown");
  }
  delete b.record.analytics.choicePolicy;
  assert.equal(comparisonFamily(b, true), "unknown");
});

test("declared M2 substitutions support matched peer evidence without pooling exact leaves", () => {
  const rows = Array.from({ length: 100 }, (_, i) => {
    const degree = i < 50 ? "9" : "11";
    const e = assessment(i, {
      mode: "m2",
      degree,
      root: ["D", "G", "C", "F", "A"][i % 5],
      grade:
        i < 50
          ? i % 50 < 46
            ? "correct"
            : "missed"
          : i % 2
            ? "correct"
            : "missed",
      config: {
        responseDistractors: "1 5 b7",
        degreePool: [degree],
        recognitionPool: degree,
      },
    });
    const options = [
      responseOptions(parseChord(e.record.chords[0]), degree, e.config),
    ];
    e.record.analytics = {
      answerOptions: options,
      choicePolicy: captureChoicePolicy(e.config, options),
    };
    e.version = "standard";
    return e;
  });
  const m = buildSummary(
    rows,
    { ...query, mode: "m2", subtask: "visible", source: "automatic" },
    undefined,
    now,
  );
  assert.ok(
    m.comparisons.some(
      (c) =>
        c.kind === "peer" &&
        c.compatible &&
        c.familyVersion === "tested-label-substitution-1",
    ),
  );
  assert.ok(m.statements.some((s) => s.category === "relative-strength"));
  assert.notEqual(rows[0].cohortKey, rows[50].cohortKey);
});
test("response generation and captured policy agree, while target and distractor pools remain distinct", () => {
  const e = substituted(0, "9");
  assert.deepEqual(
    new Set(e.record.analytics.answerOptions[0]),
    new Set(["1", "5", "b7", "9"]),
  );
  assert.equal(validateConfig(e.config, []).responseDistractors, "1 5 b7");
  assert.throws(
    () => validateConfig({ ...e.config, responseDistractors: "1 5 9" }, []),
    /separate/,
  );
});
test("confusion grids include correct diagonals, explicit zero cells and row-normalized samples", () => {
  const a = assessment(0, { mode: "m2", degree: "9", grade: "correct" }),
    b = assessment(1, { mode: "m2", degree: "9", grade: "missed" });
  b.record.selectedDegrees = ["11"];
  const grid = confusionGrids([a, b], now)[0];
  assert.equal(grid.cells.length, 2);
  assert.ok(grid.cells.every((c) => c.n === 2));
  assert.equal(grid.cells.find((c) => c.row === c.column).k, 1);
  assert.equal(grid.cells.find((c) => c.column.endsWith("11")).k, 1);
});
test("retries, assistance and unknown identity do not populate fresh confusion confidence", () => {
  const a = assessment(0, { mode: "m2" }),
    b = assessment(1, { mode: "m2" }),
    c = assessment(2, { mode: "m2" });
  a.attemptOrdinal = 2;
  b.assistance = "reference";
  c.questionId = null;
  assert.deepEqual(confusionGrids([a, b, c], now), []);
});
test("legacy quality/voicing and source-specific axes retain combined labels and unknowns", () => {
  const rows = [
    {
      chordQuality: "m6m7b5",
      chordVoicing: "closed",
      chordInversion: 0,
      playbackMode: "stacked",
      attempts: 1,
    },
    {
      chordQuality: "m6m7b5",
      chordVoicing: "closed",
      chordInversion: 1,
      playbackMode: "arpeggiated",
      attempts: 3,
    },
  ];
  const full = legacyGrid("chord-quality", rows);
  assert.equal(full.cells[0].row, "m6m7b5");
  assert.equal(full.cells[0].k, 1);
  assert.equal(full.cells[0].n, 2);
  assert.equal(
    legacyGrid("chord-quality", rows, { inversion: "1" }).cells[0].k,
    0,
  );
  assert.equal(legacyGrid("progression-id", rows), null);
  assert.equal(
    legacyGrid("degree", [
      { chordQuality: "m7", upperDegree: "b3", attempts: 2 },
    ]).columnLabel,
    "Upper degree",
  );
});
