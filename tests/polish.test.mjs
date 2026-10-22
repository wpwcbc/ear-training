import test from "node:test";
import assert from "node:assert/strict";
import {
  currentUI,
  asOf,
  refinementQuery,
  unknownIdentity,
} from "./refinement-fixtures.mjs";
import {
  compileSuggestedDiagnostic,
  compileMatchedBaseline,
} from "../js/jazz/analytics/drills.js";
import { buildSummary } from "../js/jazz/analytics/summary/rules.js";
import { dataRevision } from "../js/jazz/analytics/hierarchy.js";
import { rateBucket } from "../js/jazz/analytics/matrix.js";
import { renderInsight } from "../js/jazz/analytics/summary/templates.js";

const rows = currentUI();
const focus = {
  id: "fixture-third",
  label: "7 / 3",
  quality: "7",
  degree: "3",
  rows: rows.filter(
    (e) =>
      e.record.chords[0].endsWith("7") &&
      e.config.quality === "7" &&
      e.record.targets[0] === "3",
  ),
};
test("H01 rate buckets use raw boundaries and reject invalid values", () => {
  assert.deepEqual(
    [0, 0.499, 0.5, 0.699, 0.7, 0.849, 0.85, 0.949, 0.95, 1].map(rateBucket),
    [0, 0, 1, 1, 2, 2, 3, 3, 4, 4],
  );
  assert.deepEqual([null, NaN, -1, 1.1].map(rateBucket), [
    null,
    null,
    null,
    null,
  ]);
});
test("D01-D05 mixed history compiles deterministic validated 7/3 snapshots with independent profile", () => {
  const original = JSON.stringify(focus);
  const revision = dataRevision(rows);
  const result = compileSuggestedDiagnostic(focus, "insights/m1", revision, {
    contrast: "b7",
  });
  assert.equal(result.supported, true, result.unsupportedReason);
  const p = result.plan;
  assert.equal(p.baselineKind, "new-profile");
  assert.equal(p.questions.length, 10);
  assert.equal(
    p.questions.filter((q) => q.targets[0].degree === "3").length,
    7,
  );
  assert.equal(
    p.questions.filter((q) => q.targets[0].degree === "b7").length,
    3,
  );
  for (const q of p.questions) {
    assert.equal(q.targets[0].chord.quality, "7");
    assert.ok(["C", "D", "F", "G"].includes(q.targets[0].chord.root));
    assert.ok(q.targets[0].midi >= 48 && q.targets[0].midi <= 72);
    assert.equal(q.presentation.root, q.targets[0].chord.root);
  }
  assert.deepEqual(
    p.schedule
      .filter((s) => s.role === "contrast")
      .map((s) => s.root)
      .sort(),
    ["C", "D", "F"],
  );
  assert.equal(p.config.bpm, 72);
  assert.equal(p.config.context, "full");
  assert.deepEqual(
    compileSuggestedDiagnostic(
      { ...focus, rows: [...focus.rows].reverse() },
      "insights/m1",
      revision,
      { contrast: "b7" },
    ).plan,
    p,
  );
  assert.notEqual(
    compileSuggestedDiagnostic(focus, "insights/m1", revision, {
      contrast: "b7",
      variationIndex: 1,
    }).plan.seed,
    p.seed,
  );
  assert.equal(JSON.stringify(focus), original);
  assert.equal(
    compileSuggestedDiagnostic(
      { ...focus, rows: focus.rows.map((e) => ({ ...e, config: {} })) },
      "insights/m1",
      revision,
      { contrast: "b7" },
    ).supported,
    true,
  );
  assert.equal(
    compileMatchedBaseline(
      { ...focus, rows: focus.rows.map((e) => ({ ...e, config: {} })) },
      "insights/m1",
      revision,
    ),
    null,
  );
});
test("D09-D14 invalid range and contrast reject entire plan; custom roots remain explicit", () => {
  assert.equal(
    compileSuggestedDiagnostic(focus, "x", "r", { contrast: "b3" }).supported,
    false,
  );
  assert.equal(
    compileSuggestedDiagnostic(focus, "x", "r", {
      contrast: "b7",
      config: { low: 60, high: 60 },
    }).supported,
    false,
  );
  const p = compileSuggestedDiagnostic(focus, "x", "r", {
    contrast: "b7",
    roots: ["D"],
  }).plan;
  assert.ok(p.questions.every((q) => q.targets[0].chord.root === "D"));
});
test("N02 N04-N11 retained ledger and observation-first summaries preserve membership", () => {
  const model = buildSummary(rows, refinementQuery, undefined, asOf);
  const r = model.reconciliation;
  assert.equal(r.diagnosticIds.length, 110);
  assert.equal(
    r.diagnosticIds.length + Object.values(r.excludedIds).flat().length,
    113,
  );
  assert.equal(
    new Set([...r.diagnosticIds, ...Object.values(r.excludedIds).flat()]).size,
    113,
  );
  for (const i of model.statements) {
    assert.doesNotMatch(renderInsight(i), /^Tentative/);
    assert.doesNotMatch(renderInsight(i, "zh-Hant"), /correct/);
  }
  assert.equal(model.recommendations[0].params.focus, "7 / 3");
  const mixed = buildSummary(
    [...rows, ...unknownIdentity()],
    refinementQuery,
    undefined,
    asOf,
  );
  assert.ok(mixed.cells.some((c) => c.independentQuestionCount === null));
});
test("N10 known and unknown identities in one cell preserve only the known diagnostic sample", () => {
  const unknown = structuredClone(focus.rows[0]);
  unknown.id = "unknown-same-cell";
  unknown.questionId = null;
  unknown.capabilities.identity = false;
  const model = buildSummary(
    [...focus.rows, unknown],
    refinementQuery,
    undefined,
    asOf,
  );
  const c = model.cells.find(
    (c) =>
      c.level === "quality-degree" &&
      !c.stratum &&
      c.quality === "7" &&
      c.degree === "3",
  );
  assert.equal(c.denominator, 13);
  assert.equal(c.independentQuestionCount, 13);
  assert.equal(c.rows.length, 14);
});
