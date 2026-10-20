import type { Session, RecordEntry, Mode } from "./model.js";
import { parseChord } from "./theory.js";
export type Grouping = "quality" | "degree" | "progression";
export interface SkillStats {
  mode: Mode;
  label: string;
  source: "self" | "automatic";
  count: number;
  correct: number;
  close: number;
  missed: number;
  time: number;
  replays: number;
}
export function skillStats(
  sessions: Session[],
  grouping: Grouping,
): SkillStats[] {
  const groups = new Map<string, SkillStats>();
  sessions
    .flatMap((s) => s.records)
    .filter((r) => r.grade !== "skipped" && !r.referenceAssisted)
    .forEach((record) => {
      const labels =
        grouping === "progression"
          ? [record.progressionId]
          : record.targets.map((degree, i) =>
              grouping === "degree"
                ? degree
                : parseChord(record.chords[i]).quality,
            );
      labels.forEach((label, i) => {
        const id = record.mode + ":" + record.gradingSource + ":" + label;
        const stats = groups.get(id) ?? {
          label,
          mode: record.mode,
          source: record.gradingSource,
          count: 0,
          correct: 0,
          close: 0,
          missed: 0,
          time: 0,
          replays: 0,
        };
        stats.count++;
        const grade =
          record.gradingSource === "automatic" &&
          record.selectedDegrees &&
          grouping !== "progression"
            ? record.selectedDegrees[i] === record.targets[i] &&
              (!record.selectedQualities ||
                record.selectedQualities[i] ===
                  parseChord(record.chords[i]).quality)
              ? "correct"
              : "missed"
            : record.grade;
        if (grade === "correct") stats.correct++;
        else if (grade === "close") stats.close++;
        else stats.missed++;
        stats.time += record.responseLatency;
        stats.replays += record.replayCount;
        groups.set(id, stats);
      });
    });
  return [...groups.values()].sort(
    (a, b) =>
      a.source.localeCompare(b.source) ||
      b.missed / b.count - a.missed / a.count ||
      a.label.localeCompare(b.label),
  );
}
export function confusions(
  records: RecordEntry[],
): { expected: string; selected: string; count: number }[] {
  const counts = new Map<
    string,
    { expected: string; selected: string; count: number }
  >();
  records
    .filter(
      (r) =>
        r.gradingSource === "automatic" &&
        r.grade !== "skipped" &&
        !r.referenceAssisted,
    )
    .forEach((record) => {
      record.selectedDegrees?.forEach((choice, i) => {
        let expected = record.targets[i],
          selected = choice;
        const quality = parseChord(record.chords[i]).quality;
        if (
          record.selectedQualities &&
          record.selectedQualities[i] !== quality
        ) {
          expected = quality + ": " + expected;
          selected = record.selectedQualities[i] + ": " + selected;
        }
        if (!selected || !expected || selected === expected) return;
        const key = JSON.stringify([expected, selected]);
        const row = counts.get(key) ?? { expected, selected, count: 0 };
        row.count++;
        counts.set(key, row);
      });
    });
  return [...counts.values()].sort((a, b) => b.count - a.count);
}
