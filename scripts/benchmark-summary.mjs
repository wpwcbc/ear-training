import { performance } from "node:perf_hooks";
import { assessment, query, now } from "../tests/summary-fixtures.mjs";
import {
  buildSummary,
  cachedSummary,
  clearPresentationCache,
} from "../js/jazz/analytics/summary/rules.js";
import { dataRevision } from "../js/jazz/analytics/hierarchy.js";
const base = assessment(0),
  rows = Array.from({ length: 10000 }, (_, i) => ({
    ...base,
    id: "bench:" + i,
    questionId: "bench:q" + i,
    sessionId: "bench:s" + (i % 5),
    createdAt: new Date(now - (i % 5) * 86400000).toISOString(),
    record: { ...base.record, grade: i % 2 ? "correct" : "missed" },
  }));
const times = [];
for (let i = 0; i < 3; i++) {
  const start = performance.now();
  const revision = dataRevision(rows);
  buildSummary(rows, query, revision, now);
  times.push(performance.now() - start);
}
const revision = dataRevision(rows);
clearPresentationCache();
cachedSummary(rows, query, revision, now);
const cached = [];
for (let i = 0; i < 30; i++) {
  const start = performance.now();
  cachedSummary(rows, query, revision, now);
  cached.push(performance.now() - start);
}
const p95 = (a) => [...a].sort((a, b) => a - b)[Math.ceil(a.length * 0.95) - 1];
console.log(
  JSON.stringify(
    {
      runtime: process.version,
      assessments: rows.length,
      uncachedMs: times,
      uncachedP95: p95(times),
      cachedP95: p95(cached),
      budgets: { uncached: 500, cached: 100 },
      note: "Synthetic CPU selector benchmark; not a physical-device audio or full-page render benchmark.",
    },
    null,
    2,
  ),
);
