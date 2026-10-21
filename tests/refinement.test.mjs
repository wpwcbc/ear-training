import test from "node:test";
import assert from "node:assert/strict";
import {
  currentUI,
  asOf,
  refinementQuery,
  fixtureLedger,
  unknownIdentity,
  rootImbalanced,
} from "./refinement-fixtures.mjs";
import { assessment } from "./summary-fixtures.mjs";
import { readFileSync } from "node:fs";
import {
  buildSummary,
  supported,
  cachedSummary,
} from "../js/jazz/analytics/summary/rules.js";
import { aggregate } from "../js/jazz/analytics/metrics.js";
import { renderInsight } from "../js/jazz/analytics/summary/templates.js";
import {
  resolveWindow,
  inWindow,
  dailyResults,
  trendDensity,
  midnight,
} from "../js/jazz/analytics/windows.js";
import { dayKey } from "../js/jazz/analytics/policy.js";

test("S1 synthetic ledger reconciles 113 retained,112 rated,110 diagnostics,99 correct and two local days", () => {
  const rows = currentUI(),
    before = JSON.stringify(rows),
    stats = aggregate(rows, "Asia/Hong_Kong", asOf);
  assert.equal(rows.length, 113);
  assert.deepEqual(stats.ratings, { correct: 101, close: 0, missed: 11 });
  assert.equal(stats.eligibleCount, 110);
  assert.equal(stats.correct, 99);
  const daily = dailyResults(rows, resolveWindow(asOf, "Asia/Hong_Kong", 28));
  assert.deepEqual(
    daily.map((p) => [p.day, p.stats.correct, p.stats.eligibleCount]),
    [
      ["2026-10-20", 23, 29],
      ["2026-10-21", 76, 81],
    ],
  );
  assert.equal(fixtureLedger().records.length, 113);
  assert.equal(JSON.stringify(rows), before);
  assert.deepEqual(
    JSON.parse(
      readFileSync(
        new URL("./fixtures/current-ui-m1-ledger.json", import.meta.url),
      ),
    ),
    fixtureLedger(),
  );
});
test("S1 complementary positive and difficulty retain exact refs and independent action priority", () => {
  const rows = currentUI(),
    model = buildSummary(rows, refinementQuery, undefined, asOf);
  const positive = model.statements.find(
    (i) => i.category === "tentative-positive",
  );
  assert.ok(positive);
  assert.equal(positive.params.k, 20);
  assert.equal(positive.params.n, 20);
  assert.match(renderInsight(positive), /self-rated/);
  assert.match(renderInsight(positive, "zh-Hant"), /自評/);
  assert.ok(
    model.statements.some(
      (i) =>
        i.category === "descriptive-peer" ||
        (i.certainty === "tentative" && i.category === "specific-difficulty"),
    ),
  );
  assert.ok(model.recommendations.length);
  assert.notEqual(model.recommendations[0].cellId, positive.cellId);
  assert.equal(
    model.statements.find((i) => i.category === "descriptive-peer").actionId,
    model.recommendations[0].id,
  );
  assert.ok(model.candidates.some((i) => i.category === "descriptive-peer"));
  assert.match(
    model.statements.map((i) => renderInsight(i)).join(" "),
    /10\/13.*12\/13|12\/13.*10\/13/s,
  );
  assert.equal(
    model.statements.some((i) => i.certainty === "supported"),
    false,
  );
  for (const i of model.statements)
    for (const id of i.evidenceRefIds) {
      const ref = model.refs.get(id);
      assert.ok(ref);
      assert.ok(ref.assessmentIds.every((id) => rows.some((e) => e.id === id)));
    }
  const reordered = buildSummary(
    [...rows].reverse(),
    refinementQuery,
    undefined,
    asOf,
  );
  assert.deepEqual(
    reordered.statements.map((i) => i.id),
    model.statements.map((i) => i.id),
  );
});
test("unknown identities and imbalanced roots never become supported positives", () => {
  assert.equal(
    buildSummary(
      unknownIdentity(),
      refinementQuery,
      undefined,
      asOf,
    ).statements.some((i) => i.category === "tentative-positive"),
    false,
  );
  const model = buildSummary(
    rootImbalanced(),
    refinementQuery,
    undefined,
    asOf,
  );
  assert.equal(
    model.cells
      .filter((c) => c.level === "quality-degree" && !c.stratum)
      .some(supported),
    false,
  );
});
test("explicit Hong Kong window includes Sep25 through Oct22 and excludes future instants", () => {
  const w = resolveWindow(asOf, "Asia/Hong_Kong", 28);
  assert.equal(w.startInclusive, "2026-09-24T16:00:00.000Z");
  assert.equal(w.endExclusive, "2026-10-22T16:00:00.000Z");
  assert.ok(inWindow(w.startInclusive, w));
  assert.equal(inWindow("2026-09-24T15:59:59.999Z", w), false);
  assert.equal(inWindow(w.endExclusive, w), false);
  assert.equal(inWindow("2026-10-22T04:00:00.001Z", w), false);
  const dst = resolveWindow(
    Date.parse("2026-03-08T17:00Z"),
    "America/New_York",
    1,
  );
  assert.equal(dst.startInclusive, "2026-03-08T05:00:00.000Z");
  assert.equal(dst.endExclusive, "2026-03-09T04:00:00.000Z");
  const next = resolveWindow(
    Date.parse("2026-10-22T16:00:00Z"),
    "Asia/Hong_Kong",
    1,
  );
  assert.equal(next.startInclusive, "2026-10-22T16:00:00.000Z");
});
test("display density does not imply statistical support", () => {
  assert.deepEqual(
    [
      [],
      [100],
      [29, 81],
      [5, 5, 5],
      Array(6).fill(5),
      Array(7).fill(5),
      Array(7).fill(1),
    ].map(trendDensity),
    ["empty", "single", "table", "table", "table", "chart", "table"],
  );
});
test("snapshot cache excludes future outcomes until their actual as-of boundary", () => {
  const future = assessment(990, {
    grade: "correct",
    createdAt: new Date(asOf + 3600000).toISOString(),
  });
  const before = cachedSummary(
    [future],
    refinementQuery,
    "as-of-regression",
    asOf,
    [future],
  );
  const after = cachedSummary(
    [future],
    refinementQuery,
    "as-of-regression",
    asOf + 7200000,
    [future],
  );
  assert.equal(before.reconciliation.diagnostic, 0);
  assert.equal(after.reconciliation.diagnostic, 1);
});
test("midnight DST gaps and fall-back days resolve real calendar instants", () => {
  const gap = midnight("2018-11-04", "America/Sao_Paulo");
  assert.equal(
    dayKey(new Date(gap).toISOString(), "America/Sao_Paulo"),
    "2018-11-04",
  );
  assert.equal(
    dayKey(new Date(gap - 1).toISOString(), "America/Sao_Paulo"),
    "2018-11-03",
  );
  const fall = resolveWindow(
    Date.parse("2026-11-01T17:00Z"),
    "America/New_York",
    1,
  );
  assert.equal(
    Date.parse(fall.endExclusive) - Date.parse(fall.startInclusive),
    25 * 3600000,
  );
});
test("query windows have distinct semantic identities without relaxing one-day sufficiency", () => {
  const rows = Array.from({ length: 100 }, (_, i) =>
    assessment(i, { grade: "correct", createdAt: "2026-10-21T04:00:00Z" }),
  );
  const all = buildSummary(rows, refinementQuery, undefined, asOf),
    period = buildSummary(
      rows,
      { ...refinementQuery, startInclusive: "2026-09-24T16:00:00Z" },
      undefined,
      asOf,
    );
  assert.equal(all.statements[0].category, "tentative-positive");
  assert.equal(all.statements[0].certainty, "tentative");
  assert.equal(all.recommendations.length, 0);
  assert.notEqual(all.statements[0].id, period.statements[0].id);
  const unknown = structuredClone(rows[0]);
  unknown.capabilities.identity = false;
  assert.equal(
    buildSummary([unknown], refinementQuery, undefined, asOf).cells[0]
      .independentQuestionCount,
    null,
  );
});
test("a sufficient specific child replaces a parent only when it adds material context", () => {
  const rows = Array.from({ length: 90 }, (_, i) =>
    assessment(i, {
      root: i < 50 ? "D" : ["G", "C", "F", "A"][Math.floor((i - 50) / 10)],
      grade: i < 50 ? "missed" : "correct",
    }),
  );
  const model = buildSummary(rows, refinementQuery, undefined, asOf),
    lead = model.statements[0],
    cell = model.cells.find((c) => c.id === lead.cellId);
  assert.equal(lead.certainty, "supported");
  assert.equal(cell.level, "root-quality-degree");
  assert.equal(cell.roots[0].root, "D");
  assert.ok(model.candidates.some((i) => i.suppressedBy === lead.id));
});
