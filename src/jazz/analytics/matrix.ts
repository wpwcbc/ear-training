import { parseChord } from "../theory.js";
import type { Evidence } from "./types.js";
import { quantile } from "./policy.js";
export function renderMatrix(
  parent: HTMLElement,
  rows: Evidence[],
  metric: string,
  inspect: (rows: Evidence[], index: number) => void,
) {
  type Item = { row: Evidence; index: number };
  const groups = new Map<string, Item[]>(),
    qualities = new Set<string>(),
    degrees = new Set<string>();
  for (const row of rows.filter((e) => e.record.grade !== "skipped"))
    row.record.targets.forEach((degree, index) => {
      const quality = parseChord(row.record.chords[index]).quality,
        key = JSON.stringify([quality, degree]),
        items = groups.get(key) ?? [];
      items.push({ row, index });
      groups.set(key, items);
      qualities.add(quality);
      degrees.add(degree);
    });
  if (!groups.size) return;
  const heading = document.createElement("h3");
  heading.textContent = `${rows[0]?.source === "self" ? "Self-assessment" : rows[0]?.source === "visual" ? "Visual mapping" : "Automatic answers"} · Chord quality × degree`;
  parent.append(heading);
  const wrap = document.createElement("div");
  wrap.className = "table-scroll";
  const table = document.createElement("table"),
    head = document.createElement("thead"),
    header = document.createElement("tr");
  for (const text of ["Quality / degree", ...degrees]) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = text;
    header.append(th);
  }
  head.append(header);
  table.append(head);
  const body = document.createElement("tbody");
  for (const quality of qualities) {
    const tr = document.createElement("tr"),
      label = document.createElement("th");
    label.scope = "row";
    label.textContent = quality;
    tr.append(label);
    for (const degree of degrees) {
      const td = document.createElement("td"),
        items = groups.get(JSON.stringify([quality, degree]));
      if (!items) {
        td.textContent = "No evidence";
        tr.append(td);
        continue;
      }
      const questions = new Set(items.map((i) => i.row.questionId ?? i.row.id))
        .size;
      const parentOnly = items.some(
        (i) =>
          i.row.record.targets.length > 1 &&
          (i.row.source === "self" ||
            !Array.isArray(i.row.record.selectedDegrees)),
      );
      let text = `${questions} questions / ${items.length} exposures`;
      if (metric === "time") {
        const times = parentOnly
          ? []
          : items
              .filter(
                (i) =>
                  i.row.record.targets.length === 1 &&
                  i.row.capabilities.timing,
              )
              .map((i) => i.row.record.analytics!.activeMs!)
              .filter((n) => Number.isFinite(n) && n >= 0);
        const median = quantile(times, 0.5);
        text =
          median === null
            ? "Time unavailable at this grain"
            : `${(median / 1000).toFixed(1)}s median / n=${times.length}`;
      } else if (metric !== "sample" && !parentOnly) {
        const correct = items.filter((i) =>
          i.row.source === "self"
            ? i.row.record.grade === "correct"
            : i.row.record.selectedDegrees
              ? i.row.record.selectedDegrees[i.index] === degree &&
                (!i.row.record.selectedQualities ||
                  i.row.record.selectedQualities[i.index] === quality)
              : i.row.record.grade === "correct",
        ).length;
        const close = items.filter(
          (i) => i.row.record.grade === "close",
        ).length;
        text = items.every((i) => i.row.source === "self")
          ? `${correct} correct / ${close} close / ${items.length - correct - close} missed`
          : `${correct}/${items.length} answer items correct · ${questions} questions`;
      } else if (parentOnly && metric === "outcome") text += " · coverage only";
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = text;
      button.className = "matrix-value";
      button.setAttribute("aria-label", quality + " / " + degree + ": " + text);
      button.onclick = () =>
        inspect(
          [...new Map(items.map((i) => [i.row.id, i.row])).values()],
          items[0].index,
        );
      td.append(button);
      tr.append(td);
    }
    body.append(tr);
  }
  table.append(body);
  wrap.append(table);
  parent.append(wrap);
  const note = document.createElement("p");
  note.textContent =
    "Descriptive results within the selected scope. Multiple items from one sequence are correlated; whole-run self-ratings provide coverage only. Exact context evidence follows.";
  parent.append(note);
}
