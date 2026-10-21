import { comparisonFamily } from "../hierarchy.js";
import { summaryPolicy as p } from "./policy.js";
import { policy } from "../policy.js";
import type { AggregateCell } from "./types.js";
export interface QualityGuard {
  supported: boolean;
  qualities: { quality: string; n: number; k: number; supported: boolean }[];
  reasons: string[];
}
export function qualityGeneralization(
  cell: AggregateCell,
  children: AggregateCell[],
): QualityGuard {
  const counts = new Map<string, { n: number; k: number }>();
  for (const o of cell.sample) {
    const entry = counts.get(o.quality) ?? { n: 0, k: 0 };
    entry.n++;
    if (o.outcome === "correct") entry.k++;
    counts.set(o.quality, entry);
  }
  const qualities = [...counts]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([quality, s]) => ({
      ...s,
      quality,
      supported: children.some(
        (c) =>
          !c.stratum &&
          c.level === "quality-degree" &&
          c.quality === quality &&
          c.degree === cell.degree &&
          c.mode === cell.mode &&
          c.subtask === cell.subtask &&
          c.source === cell.source &&
          c.metricId === cell.metricId &&
          c.reliability === "sufficient" &&
          !c.stale &&
          c.contextState === "matched" &&
          c.generalization === "observed-roots",
      ),
    }));
  const reasons: string[] = [];
  if (qualities.filter((q) => q.supported).length < p.crossQualityMinimum)
    reasons.push(
      "At least two quality strata need sufficient compatible root coverage.",
    );
  if (qualities.some((q) => !q.supported))
    reasons.push(
      "Some practised quality strata are not sufficiently supported.",
    );
  if (qualities.some((q) => q.n / (cell.denominator || 1) > p.maxQualityShare))
    reasons.push(
      "One quality contributes more than 70% of diagnostic questions.",
    );
  const cache = new Map<string, string>();
  const families = new Set(
    cell.sample.map((o) => {
      let family = cache.get(o.row.cohortKey);
      if (!family) {
        family = comparisonFamily(o.row, false, true);
        cache.set(o.row.cohortKey, family);
      }
      return family;
    }),
  );
  if (families.has("unknown") || families.size !== 1)
    reasons.push(
      "Other practice settings or response choices differ across qualities.",
    );
  const aggregateRate = (cell.numerator ?? 0) / (cell.denominator || 1);
  if (
    qualities.some(
      (q) =>
        q.n >= 5 &&
        (q.k / q.n - policy.target) * (aggregateRate - policy.target) < 0,
    )
  )
    reasons.push(
      "Results vary by quality; a stratum reverses the aggregate target direction.",
    );
  if (
    cell.reliability !== "sufficient" ||
    cell.stale ||
    cell.generalization !== "observed-roots"
  )
    reasons.push(
      "The parent sample must pass sufficiency, freshness and observed-root gates.",
    );
  return { supported: !reasons.length, qualities, reasons };
}
