import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSummary,
  comparePeers,
  cachedSummary,
  clearPresentationCache,
} from "../js/jazz/analytics/summary/rules.js";
import {
  buildHierarchy,
  dataRevision,
  refResolves,
  reconciliation,
} from "../js/jazz/analytics/hierarchy.js";
import {
  renderInsight,
  renderTemplate,
} from "../js/jazz/analytics/summary/templates.js";
import { compileDrill } from "../js/jazz/analytics/drills.js";
import {
  assessment,
  supportedParent,
  screenshot113,
  query,
  now,
} from "./summary-fixtures.mjs";
test("S01 reconciles 113 retained rows, 112 ratings and 110 independent diagnostic questions", () => {
  const r = reconciliation(screenshot113(), now);
  assert.equal(r.retained, 113);
  assert.equal(r.nonSkipped, 112);
  assert.equal(r.diagnostic, 110);
  assert.equal(r.exclusions.retry, 2);
  assert.equal(r.exclusions.skipped, 1);
});
test("S02 supported multi-root parent takes precedence over a sparse exact child", () => {
  const rows = supportedParent();
  const sparse = assessment(999, {
    grade: "missed",
    config: { hintLevel: "off" },
  });
  rows.push(sparse);
  const m = buildSummary(rows, query, undefined, now);
  const focus = m.recommendations[0];
  // The incompatible hint stratum prevents a broad claim; its sufficiently supported fixed-root strata remain available.
  assert.ok(
    m.cells.some(
      (c) =>
        c.level === "quality-degree" && c.contextState === "mixed-descriptive",
    ),
  );
  assert.equal(focus.certainty, "supported");
  assert.equal(focus.params.n, 50);
  assert.equal(focus.evidenceRefIds.length, 2);
  const clean = buildSummary(supportedParent(), query, undefined, now),
    lead = clean.recommendations[0];
  assert.equal(lead.certainty, "supported");
  assert.equal(
    clean.cells.find((c) => c.id === lead.cellId).level,
    "quality-degree",
  );
  assert.equal(clean.cells.find((c) => c.id === lead.cellId).denominator, 50);
  assert.ok(!focus || focus.params.n !== 1);
});
test("0/1 and 1/1 are coverage, not weakness or strength; tentative gates are explicit", () => {
  for (const grade of ["missed", "correct"]) {
    const m = buildSummary([assessment(0, { grade })], query, undefined, now);
    assert.equal(m.recommendations[0].category, "coverage");
    assert.ok(
      !m.candidates.some(
        (i) => i.category === "weakness" || i.category === "relative-strength",
      ),
    );
  }
  const m = buildSummary(
    [assessment(1, { grade: "missed" }), assessment(2, { grade: "missed" })],
    query,
    undefined,
    now,
  );
  assert.equal(m.recommendations[0].certainty, "tentative");
});
test("parents deduplicate question IDs, preserve item exposures and ignore ordering", () => {
  const row = assessment(0, {
    mode: "m3",
    config: { commonMode: "recognize", span: 5 },
  });
  row.record.targets.push(row.record.targets[0]);
  row.record.chords.push(row.record.chords[0]);
  row.record.selectedDegrees.push(row.record.selectedDegrees[0]);
  row.record.analytics = {
    answerOptions: row.record.targets.map(() => [
      "1",
      "b3",
      "3",
      "5",
      "b7",
      "9",
    ]),
  };
  const q = { ...query, mode: "m3", subtask: "recognize", source: "automatic" };
  const a = buildSummary([row], q, undefined, now),
    b = buildSummary([row, structuredClone(row)].reverse(), q, undefined, now);
  assert.ok(a.cells.some((c) => c.descriptiveItemCount > c.denominator));
  assert.deepEqual(
    a.cells.map((c) => [c.id, c.numerator, c.denominator]),
    b.cells.map((c) => [c.id, c.numerator, c.denominator]),
  );
});
test("root diversity and dominance gates do not inherit total n as transfer evidence", () => {
  for (const counts of [[50], [40, 5, 5], [20, 15, 15]]) {
    const rows = counts.flatMap((n, r) =>
      Array.from({ length: n }, (_, i) =>
        assessment(counts.slice(0, r).reduce((a, b) => a + b, 0) + i, {
          root: ["D", "G", "C"][r],
        }),
      ),
    );
    const c = buildSummary(rows, query, undefined, now).cells.find(
      (c) => c.level === "quality-degree",
    );
    assert.equal(
      c.generalization,
      counts[0] === 20 ? "observed-roots" : "not-established",
    );
  }
});
test("fixed-root supported pattern stays fixed-root and sparse child cannot replace it", () => {
  const rows = Array.from({ length: 50 }, (_, i) => assessment(i));
  const m = buildSummary(rows, query, undefined, now);
  const i = m.recommendations[0];
  assert.equal(i.certainty, "supported");
  assert.equal(
    m.cells.find((c) => c.id === i.cellId).level,
    "root-quality-degree",
  );
  assert.match(renderInsight(i), /At D/);
});
test("whole sequences/runs/phrases never create per-target correctness", () => {
  for (const [mode, config] of [
    ["m3", { commonMode: "produce" }],
    ["m5", { runMode: "continuous" }],
    ["m6", {}],
  ]) {
    const row = assessment(0, { mode, config });
    const m = buildSummary(
      [row],
      { ...query, mode, subtask: row.subtask },
      undefined,
      now,
    );
    assert.ok(
      m.cells
        .filter((c) => c.level === "quality-degree")
        .every((c) => c.denominator === null),
    );
    assert.ok(
      m.cells.some((c) => c.level === "mode-specific" && c.denominator === 1),
    );
  }
});
test("unknown identity has no independent count and valid outcomes survive missing timing", () => {
  const e = assessment(0);
  e.questionId = null;
  e.capabilities.identity = false;
  const m = buildSummary([e], query, undefined, now);
  assert.equal(m.cells[0].independentQuestionCount, null);
  assert.equal(m.recommendations[0].category, "coverage");
  const normal = buildSummary(supportedParent(), query, undefined, now);
  assert.equal(normal.recommendations[0].certainty, "supported");
});
test("numeric facts have reproducible evidence sets and deletion invalidates citations", () => {
  const rows = supportedParent(),
    m = buildSummary(rows, query, undefined, now),
    insight = m.statements[0],
    ref = m.refs.get(insight.evidenceRefIds[0]);
  assert.equal(ref.diagnosticQuestionIds.length, insight.params.n);
  assert.equal(refResolves(ref, rows, query), true);
  assert.equal(refResolves(ref, rows.slice(1), query), false);
  const shuffled = buildSummary([...rows].reverse(), query, undefined, now);
  assert.deepEqual(m.statements, shuffled.statements);
});
test("English and zh-Hant preserve canonical notes and semantic IDs; templates reject missing params", () => {
  const m = buildSummary(supportedParent(), query, undefined, now),
    i = m.statements[0];
  assert.match(renderInsight(i, "en"), /self-rated/);
  assert.match(renderInsight(i, "zh-Hant"), /自評/);
  assert.match(renderInsight(i, "zh-Hant"), /11/);
  assert.doesNotMatch(renderInsight(i, "zh-Hant"), /undefined|Across/);
  assert.equal(renderTemplate("m1", { focus: "x" }), null);
  assert.equal(
    renderTemplate("coverage", { focus: "b3", n: 0, extra: "bad" }),
    null,
  );
  for (const id of [
    "m1",
    "m2",
    "m3-recognize",
    "m3-produce",
    "m4",
    "m5-step",
    "m5-run",
    "m6-whole",
    "m6-stage",
    "m7-mapping",
    "m7-self",
  ])
    for (const locale of ["en", "zh-Hant"])
      assert.equal(
        typeof renderTemplate(
          id,
          { focus: "b3 / maj7", scope: "root:D", k: 5, n: 10, noncorrect: 5 },
          locale,
        ),
        "string",
      );
});
test("directional confusion requires actual choices, enough expected-row sample and preserves diagonal", () => {
  const rows = Array.from({ length: 32 }, (_, i) =>
    assessment(i, {
      mode: "m2",
      degree: "9",
      grade: i < 8 ? "missed" : "correct",
      root: ["D", "G", "C"][i % 3],
    }),
  );
  rows.forEach((e, i) => {
    e.record.selectedDegrees = [i < 8 ? "11" : "9"];
    e.record.analytics = {
      answerOptions: [["1", "b3", "5", "b7", "9", "11", "13"]],
    };
  });
  const m = buildSummary(
    rows,
    { ...query, mode: "m2", source: "automatic", subtask: "visible" },
    undefined,
    now,
  );
  const confusion = m.statements.find((i) => i.category === "confusion");
  assert.ok(confusion);
  assert.equal(confusion.params.errors, 8);
  assert.equal(confusion.params.n, 32);
  assert.equal(confusion.params.selected, "11");
});
test("unmatched hint mix and missing answer-choice identity veto relative comparison", () => {
  const left = supportedParent(),
    right = supportedParent().map((e, i) =>
      assessment(i + 100, {
        degree: "b7",
        grade: "correct",
        root: e.record.chords[0].slice(0, -2),
        config: { hintLevel: "notes" },
      }),
    );
  const m = buildSummary([...left, ...right], query, undefined, now);
  assert.ok(!m.statements.some((i) => i.templateId === "relative"));
  const unknown = Array.from({ length: 50 }, (_, i) =>
    assessment(i, { mode: "m2" }),
  );
  assert.ok(
    buildSummary(unknown, { ...query, mode: "m2" }, undefined, now).cells.every(
      (c) => c.contextState === "unknown",
    ),
  );
});
test("root-spanning focus previews preserve 7/3 actual targets and root provenance", () => {
  const m = buildSummary(supportedParent(), query, undefined, now),
    c = m.cells.find((c) => c.id === m.recommendations[0].cellId),
    result = compileDrill({ ...c, rows: c.rows }, "insights/m1");
  assert.ok(result.supported);
  assert.equal(
    result.plan.questions.filter((q) => q.targets[0].degree === "11").length,
    7,
  );
  assert.equal(
    new Set(result.plan.questions.map((q) => q.targets[0].chord.root)).size,
    5,
  );
});
test("cache invalidates by revision, filters, timezone and local date without source writes", () => {
  clearPresentationCache();
  const rows = supportedParent(),
    revision = dataRevision(rows),
    a = cachedSummary(rows, query, revision, now);
  assert.equal(cachedSummary(rows, query, revision, now), a);
  assert.notEqual(
    cachedSummary(rows, { ...query, timezone: "UTC" }, revision, now),
    a,
  );
  assert.notEqual(cachedSummary(rows, query, revision, now + 86400000), a);
  assert.notEqual(
    cachedSummary(rows.slice(1), query, dataRevision(rows.slice(1)), now),
    a,
  );
});
test("matched peer comparison has separate reproducible samples and source-qualified wording", () => {
  const left = supportedParent(),
    right = left.map((e, i) =>
      assessment(i + 100, {
        degree: "b7",
        grade: i < 46 ? "correct" : "missed",
        root: e.record.chords[0].replace(/m7$/, ""),
      }),
    );
  const m = buildSummary([...left, ...right], query, undefined, now),
    i = m.candidates.find((i) => i.templateId === "relative");
  assert.ok(i);
  assert.equal(i.params.k, 46);
  assert.equal(i.params.otherK, 25);
  assert.equal(i.evidenceRefIds.length, 2);
  assert.notEqual(i.evidenceRefIds[0], i.evidenceRefIds[1]);
  assert.match(renderInsight(i), /self-rated/);
});
test("a supported fixed-root comparison names that root rather than implying transfer", () => {
  const left = Array.from({ length: 50 }, (_, i) => assessment(i)),
    right = Array.from({ length: 50 }, (_, i) =>
      assessment(i + 100, { degree: "b7", grade: "correct" }),
    );
  const m = buildSummary([...left, ...right], query, undefined, now),
    i = m.candidates.find((i) => i.templateId === "relative");
  assert.ok(i);
  assert.match(renderInsight(i), /At D/);
});
test("a requested contrast outside the actual response UI cannot silently change the task", () => {
  const e = assessment(0, {
    mode: "m2",
    degree: "9",
    config: { recognitionPool: "9" },
  });
  e.record.selectedDegrees = ["b3"];
  const result = compileDrill(
    {
      id: "invalid-choices",
      label: "9",
      quality: "m7",
      degree: "9",
      rows: [e],
      focus: { component: "degree", selected: "nonexistent" },
    },
    "insights/m2",
  );
  assert.equal(result.supported, false);
  assert.match(result.unsupportedReason, /choice/i);
});
test("stable legacy templates do not invent independent trials or progression accuracy", () => {
  for (const locale of ["en", "zh-Hant"]) {
    for (const focus of ["Degree", "Interval", "Chord Quality"])
      assert.ok(renderTemplate("legacy", { focus, k: 1, n: 3 }, locale));
    assert.ok(renderTemplate("legacy-progression", {}, locale));
    assert.ok(renderTemplate("drone", {}, locale));
  }
});
test("period statements cite separate windows and never reuse the current IDs for prior evidence", () => {
  const base = assessment(0, { mode: "m2" }),
    rows = [];
  for (const previous of [false, true])
    for (let i = 0; i < 100; i++) {
      const e = structuredClone(base);
      e.id = (previous ? "prior:" : "current:") + i;
      e.questionId = e.id;
      e.sessionId = e.id.slice(0, e.id.indexOf(":")) + ":s" + (i % 5);
      e.createdAt = new Date(
        now - (previous ? 30 + (i % 5) : i % 5) * 86400000 - 1000,
      ).toISOString();
      e.record.grade = i < (previous ? 50 : 85) ? "correct" : "missed";
      e.record.selectedDegrees = [
        e.record.grade === "correct" ? e.record.targets[0] : "13",
      ];
      rows.push(e);
    }
  const q = { ...query, mode: "m2", subtask: "visible", source: "automatic" },
    m = buildSummary(
      rows.filter((e) => e.id.startsWith("current:")),
      q,
      dataRevision(rows),
      now,
      rows,
    ),
    i = m.candidates.find((i) => i.category === "comparable-trend");
  assert.ok(i);
  assert.equal(i.params.k, 85);
  assert.equal(i.params.priorK, 50);
  const [current, prior] = i.evidenceRefIds.map((id) => m.refs.get(id));
  assert.notEqual(current.id, prior.id);
  assert.equal(current.diagnosticQuestionIds.length, 100);
  assert.equal(prior.diagnosticQuestionIds.length, 100);
  assert.ok(
    current.diagnosticQuestionIds.every((id) => id.startsWith("current:")),
  );
  assert.ok(prior.diagnosticQuestionIds.every((id) => id.startsWith("prior:")));
  assert.notEqual(
    current.querySnapshot.startInclusive,
    prior.querySnapshot.startInclusive,
  );
});
test("a diagnostic parent cannot double-count repeated answer items as independent sequences", () => {
  const e = assessment(0, {
    mode: "m3",
    config: { commonMode: "recognize", span: 5 },
  });
  e.record.targets = ["b3", "b3", "b3", "b3", "b3"];
  e.record.chords = Array(5).fill("Dm7");
  e.record.selectedDegrees = ["b3", "b3", "b3", "b3", "9"];
  e.record.analytics = { answerOptions: Array(5).fill(["b3", "9"]) };
  const { cells } = buildHierarchy(
      [e],
      { ...query, mode: "m3", subtask: "recognize" },
      dataRevision([e]),
      now,
    ),
    parent = cells.find((c) => c.level === "degree");
  assert.equal(parent.descriptiveItemCount, 5);
  assert.equal(parent.denominator, 1);
  assert.equal(parent.numerator, 1);
});
