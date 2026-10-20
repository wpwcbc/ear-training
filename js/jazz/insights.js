import { parseChord } from "./theory.js";
export function skillStats(sessions, grouping) {
    const groups = new Map();
    sessions
        .flatMap((s) => s.records)
        .filter((r) => r.grade !== "skipped" && !r.referenceAssisted)
        .forEach((record) => {
        const labels = grouping === "progression"
            ? [record.progressionId]
            : record.targets.map((degree, i) => grouping === "degree"
                ? degree
                : parseChord(record.chords[i]).quality);
        labels.forEach((label, i) => {
            const id = record.gradingSource + ":" + label;
            const stats = groups.get(id) ?? {
                label,
                source: record.gradingSource,
                count: 0,
                correct: 0,
                close: 0,
                missed: 0,
                time: 0,
                replays: 0,
            };
            stats.count++;
            const grade = record.gradingSource === "automatic" &&
                record.selectedDegrees &&
                grouping !== "progression"
                ? record.selectedDegrees[i] === record.targets[i]
                    ? "correct"
                    : "missed"
                : record.grade;
            if (grade === "correct")
                stats.correct++;
            else if (grade === "close")
                stats.close++;
            else
                stats.missed++;
            stats.time += record.responseLatency;
            stats.replays += record.replayCount;
            groups.set(id, stats);
        });
    });
    return [...groups.values()].sort((a, b) => a.source.localeCompare(b.source) ||
        b.missed / b.count - a.missed / a.count ||
        a.label.localeCompare(b.label));
}
export function confusions(records) {
    const counts = new Map();
    records
        .filter((r) => r.gradingSource === "automatic" &&
        r.grade !== "skipped" &&
        !r.referenceAssisted)
        .forEach((record) => {
        record.selectedDegrees?.forEach((selected, i) => {
            const expected = record.targets[i];
            if (!selected || !expected || selected === expected)
                return;
            const key = JSON.stringify([expected, selected]);
            const row = counts.get(key) ?? { expected, selected, count: 0 };
            row.count++;
            counts.set(key, row);
        });
    });
    return [...counts.values()].sort((a, b) => b.count - a.count);
}
