import type { AggregateCell, Insight } from "./types.js";

const order = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
export function composeEditorial(
  candidates: Insight[],
  cells: AggregateCell[],
  overview: boolean,
) {
  const index = new Map(cells.map((c) => [c.id, c]));
  const positive = (i: Insight) =>
    i.category === "relative-strength" || i.category === "tentative-positive";
  const difficulty = (i: Insight) =>
    [
      "weakness",
      "confusion",
      "specific-difficulty",
      "descriptive-peer",
    ].includes(i.category);
  const rank = (i: Insight) =>
    i.certainty === "supported"
      ? difficulty(i)
        ? 0
        : positive(i)
          ? 3
          : 2
      : i.category === "tentative-positive"
        ? 5
        : i.certainty === "tentative"
          ? 4
          : i.category === "descriptive-peer"
            ? 5
            : 6;
  const sort = (a: Insight, b: Insight) => {
    if (
      a.category === "descriptive-peer" &&
      b.category === "descriptive-peer"
    ) {
      const min = (i: Insight) =>
        Math.min(Number(i.params.n), Number(i.params.otherN));
      const gap = (i: Insight) =>
        Math.abs(
          Number(i.params.k) / Number(i.params.n) -
            Number(i.params.otherK) / Number(i.params.otherN),
        );
      return min(b) - min(a) || gap(b) - gap(a) || order(a.id, b.id);
    }
    const x = index.get(a.cellId)!,
      y = index.get(b.cellId)!;
    const n = (c: AggregateCell) => c.denominator ?? 0;
    const rate = (c: AggregateCell) => (c.numerator ?? 0) / (n(c) || 1);
    return (
      rank(a) - rank(b) ||
      (positive(a) && positive(b)
        ? n(y) - n(x) || rate(y) - rate(x)
        : a.certainty === "tentative" && b.certainty === "tentative"
          ? Number(!!x.stratum) - Number(!!y.stratum) ||
            n(y) - (y.numerator ?? 0) - (n(x) - (x.numerator ?? 0)) ||
            n(y) - n(x) ||
            rate(x) - rate(y)
          : n(y) - n(x)) ||
      order(a.id, b.id)
    );
  };
  const visible = candidates.filter((i) => !i.suppressedBy).sort(sort);
  const statements: Insight[] = [];
  const add = (i: Insight) => {
    if (statements.length >= 3 || statements.includes(i)) return;
    if (
      statements.some(
        (j) =>
          j.mode === i.mode &&
          j.subtask === i.subtask &&
          j.source === i.source &&
          (j.cellId === i.cellId ||
            (positive(j) && positive(i)) ||
            (difficulty(j) && difficulty(i)) ||
            (j.category === "coverage" && i.category === "coverage")),
      )
    )
      return;
    statements.push(i);
  };
  if (overview) {
    const modes = new Set<string>();
    for (const i of visible)
      if (!modes.has(i.mode)) {
        add(i);
        modes.add(i.mode);
      }
  }
  visible.forEach(add);
  // Action priority is independent of narrative order. A positive sample is never a weakness drill.
  const recommendations: Insight[] = [];
  const actions = visible
    .filter(
      (i) =>
        (difficulty(i) && i.category !== "descriptive-peer") ||
        i.category === "coverage",
    )
    .sort(
      (a, b) =>
        Number(a.category === "coverage") - Number(b.category === "coverage") ||
        sort(a, b),
    );
  for (const i of actions)
    if (
      index.get(i.cellId)?.level !== "degree" &&
      recommendations.length < 3 &&
      !recommendations.some((j) =>
        overview
          ? j.mode === i.mode
          : j.cellId === i.cellId ||
            (index.get(j.cellId)?.quality === index.get(i.cellId)?.quality &&
              index.get(j.cellId)?.degree === index.get(i.cellId)?.degree),
      )
    )
      recommendations.push(i);
  for (let n = 0; n < statements.length; n++) {
    const i = statements[n];
    if (i.certainty !== "tentative" || !difficulty(i)) continue;
    const pair = visible.find(
      (j) =>
        j.category === "descriptive-peer" &&
        j.mode === i.mode &&
        j.subtask === i.subtask &&
        j.source === i.source &&
        (j.params.focus === i.params.focus ||
          j.params.other === i.params.focus),
    );
    if (pair) statements[n] = { ...pair, actionId: i.id };
  }
  return { statements, recommendations };
}
