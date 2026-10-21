import { parseChord } from "../theory.js";
import { policy, wilson, evidenceLabel, dayKey, quantile, timestamp, compareId, } from "./policy.js";
export function eligible(e, now = Date.now()) {
    const date = timestamp(e.createdAt);
    return (e.record.grade !== "skipped" &&
        e.assistance === "none" &&
        e.attemptOrdinal === 1 &&
        e.exposure === "fresh" &&
        Number.isFinite(date) &&
        date <= now);
}
export function independent(rows) {
    const seen = new Set();
    return [...rows]
        .sort((a, b) => timestamp(a.createdAt) - timestamp(b.createdAt) ||
        compareId(a.id, b.id))
        .filter((e) => {
        const key = e.questionId ?? e.id;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
export function aggregate(rows, timezone = "UTC", now = Date.now()) {
    const submitted = rows.filter((e) => e.record.grade !== "skipped");
    const sample = independent(rows.filter((e) => eligible(e, now) && e.capabilities.identity));
    const correct = sample.filter((e) => e.record.grade === "correct").length;
    const sessions = new Set(sample.map((e) => e.sessionId)).size;
    const days = new Set(sample.map((e) => dayKey(e.createdAt, timezone))).size;
    const interval = wilson(correct, sample.length), label = evidenceLabel(sample.length, correct, sessions, days);
    const last = Math.max(0, ...sample.map((e) => Date.parse(e.createdAt)));
    const stale = !!last && now - last > policy.days * 86400000;
    const timingSample = sample.filter((e) => e.capabilities.timing &&
        typeof e.record.analytics?.activeMs === "number" &&
        Number.isFinite(e.record.analytics.activeMs) &&
        e.record.analytics.activeMs >= 0 &&
        !(e.mode === "m5" && e.config.runMode === "continuous") &&
        (e.mode !== "m6" || e.grain === "phrase-stage") &&
        (e.source === "self" || e.record.grade === "correct"));
    const times = timingSample.map((e) => e.record.analytics.activeMs);
    return {
        metricId: rows[0]?.source === "visual"
            ? "visual-mapping-exactness"
            : rows[0]?.source === "automatic"
                ? "first-exact-recognition"
                : "self-rating-consistency",
        definitionVersion: policy.version,
        unit: rows[0]?.grain ?? "answer",
        eligibleCount: sample.length,
        correct,
        sessions,
        days,
        interval,
        label,
        stale,
        first: sample[0]?.createdAt,
        last: last ? new Date(last).toISOString() : null,
        cohortKey: rows[0]?.cohortKey,
        capabilities: rows[0]?.capabilities,
        excluded: {
            skipped: rows.filter((e) => e.record.grade === "skipped").length,
            assistance: rows.filter((e) => e.assistance !== "none").length,
            review: rows.filter((e) => e.exposure !== "fresh").length,
            identity: rows.filter((e) => !e.questionId).length,
        },
        ratings: {
            correct: submitted.filter((e) => e.record.grade === "correct").length,
            close: submitted.filter((e) => e.record.grade === "close").length,
            missed: submitted.filter((e) => e.record.grade === "missed").length,
        },
        submitted: submitted.length,
        descriptive: rows.length,
        timingCount: times.length,
        timingSessions: new Set(timingSample.map((e) => e.sessionId)).size,
        timingDays: new Set(timingSample.map((e) => dayKey(e.createdAt, timezone)))
            .size,
        median: quantile(times, 0.5),
        p75: quantile(times, 0.75),
        replayCount: sample.filter((e) => (e.record.analytics?.contextReplays ?? 0) > 0).length,
        sample,
    };
}
export function cells(rows) {
    const groups = new Map();
    for (const e of rows) {
        // Whole-activity self-ratings stay at their parent grain. Target coverage is separate.
        const single = e.record.targets.length === 1;
        const quality = single ? parseChord(e.record.chords[0]).quality : undefined;
        const degree = single ? e.record.targets[0] : undefined;
        const label = single
            ? `${e.record.chords[0]} / ${degree}`
            : `${e.record.progressionId} / ${e.grain}`;
        const id = e.mode +
            ":" +
            e.subtask +
            ":" +
            e.source +
            ":" +
            e.cohortKey +
            ":" +
            label;
        const cell = groups.get(id) ?? { id, label, rows: [], quality, degree };
        cell.rows.push(e);
        groups.set(id, cell);
    }
    return [...groups.values()];
}
export function priorities(rows, timezone, now = Date.now(), baselineRows = rows) {
    const trends = new Map(matchedTrends(baselineRows, timezone, now).map((t) => [t.key, t]));
    return cells(rows.filter((e) => Date.parse(e.createdAt) >= now - policy.days * 86400000))
        .map((cell) => {
        const stats = aggregate(cell.rows, timezone, now), rate = stats.eligibleCount ? stats.correct / stats.eligibleCount : null;
        const category = stats.stale
            ? "Recheck stale evidence"
            : rate === null
                ? "Collect evidence"
                : stats.label === "Enough to guide practice" &&
                    stats.interval[1] < policy.target
                    ? cell.rows[0].source === "self"
                        ? "Frequently self-rated close/missed"
                        : cell.rows[0].source === "visual"
                            ? "Visual mapping priority"
                            : "Recognition priority"
                    : rate < policy.target
                        ? "Possible difficulty"
                        : trends
                            .get(cell.rows[0].cohortKey)
                            ?.speedLabel.startsWith("Correct but slower")
                            ? "Correct but slow"
                            : stats.label === "Enough to guide practice" &&
                                stats.replayCount / stats.eligibleCount >
                                    policy.replayThreshold
                                ? "Replay-dependent"
                                : "Collect broader evidence";
        const rank = category === "Recognition priority" ||
            category === "Visual mapping priority" ||
            category === "Frequently self-rated close/missed"
            ? 0
            : category === "Possible difficulty"
                ? 1
                : category === "Correct but slow"
                    ? 2
                    : category === "Replay-dependent"
                        ? 3
                        : 4;
        return { ...cell, stats, category, rank };
    })
        .sort((a, b) => a.rank - b.rank ||
        a.stats.correct / (a.stats.eligibleCount || 1) -
            b.stats.correct / (b.stats.eligibleCount || 1) ||
        b.stats.eligibleCount - a.stats.eligibleCount ||
        a.id.localeCompare(b.id));
}
export function components(rows) {
    let degree = 0, degreeN = 0, quality = 0, qualityN = 0, conditional = 0, conditionalN = 0;
    const confusion = new Map();
    const rowTotals = new Map();
    for (const e of rows.filter((e) => e.source === "automatic" && e.record.grade !== "skipped")) {
        e.record.targets.forEach((target, i) => {
            const q = parseChord(e.record.chords[i]).quality, chosen = Array.isArray(e.record.selectedDegrees)
                ? e.record.selectedDegrees[i]
                : undefined, chosenQ = Array.isArray(e.record.selectedQualities)
                ? e.record.selectedQualities[i]
                : undefined;
            if (chosen) {
                degreeN++;
                if (chosen === target)
                    degree++;
            }
            if (!e.config.showChords && chosenQ) {
                qualityN++;
                if (chosenQ === q)
                    quality++;
                if (chosenQ === q && chosen) {
                    conditionalN++;
                    if (chosen === target)
                        conditional++;
                }
            }
            for (const [component, expected, selected] of [
                ["degree", q + ": " + target, chosen ? q + ": " + chosen : undefined],
                ["quality", q, !e.config.showChords ? chosenQ : undefined],
                [
                    "joint",
                    q + ": " + target,
                    chosen && chosenQ ? chosenQ + ": " + chosen : undefined,
                ],
            ]) {
                if (!selected || !component || !expected)
                    continue;
                const prefix = e.mode + ":" + e.subtask + ":" + component + ":" + expected;
                rowTotals.set(prefix, (rowTotals.get(prefix) ?? 0) + 1);
                const id = prefix + ":" + selected, entry = confusion.get(id) ?? {
                    expected,
                    selected,
                    component,
                    count: 0,
                    denominator: 0,
                };
                entry.count++;
                confusion.set(id, entry);
            }
        });
    }
    for (const [key, row] of confusion)
        row.denominator =
            rowTotals.get(key.slice(0, key.lastIndexOf(":" + row.selected))) ??
                row.count;
    return {
        degree,
        degreeN,
        quality,
        qualityN,
        conditional,
        conditionalN,
        confusion: [...confusion.values()],
    };
}
export function markScore(expected, selected) {
    const a = new Set(expected), b = new Set(selected), hits = [...b].filter((n) => a.has(n)).length;
    return {
        hits,
        selected: b.size,
        expected: a.size,
        precision: b.size ? hits / b.size : null,
        recall: a.size ? hits / a.size : null,
    };
}
export function assistedRecovery(rows) {
    const groups = new Map();
    for (const e of rows.filter((e) => e.source === "automatic" && e.questionId && e.record.grade !== "skipped")) {
        const key = e.questionId + ":" + (e.record.chordStep ?? 0), group = groups.get(key) ?? [];
        group.push(e);
        groups.set(key, group);
    }
    let eligibleCount = 0, recovered = 0;
    for (const group of groups.values()) {
        group.sort((a, b) => a.attemptOrdinal - b.attemptOrdinal ||
            Date.parse(a.createdAt) - Date.parse(b.createdAt));
        const first = group[0], follow = group.filter((e) => e.attemptOrdinal > 1 && e.assistance === "reference");
        if (first.attemptOrdinal !== 1 ||
            first.record.grade === "correct" ||
            first.assistance !== "none" ||
            !follow.length)
            continue;
        eligibleCount++;
        if (follow.some((e) => e.record.grade === "correct"))
            recovered++;
    }
    return { eligibleCount, recovered };
}
export function matchedTrends(rows, timezone, now = Date.now()) {
    const span = policy.days * 86400000, groups = new Map();
    for (const e of rows) {
        if (!eligible(e, now))
            continue;
        const group = groups.get(e.cohortKey) ?? [];
        group.push(e);
        groups.set(e.cohortKey, group);
    }
    return [...groups]
        .sort(([a], [b]) => a.localeCompare(b))
        .flatMap(([key, cohort]) => {
        const currentRows = [], priorRows = [];
        for (const e of cohort) {
            const date = timestamp(e.createdAt);
            if (date >= now - span)
                currentRows.push(e);
            else if (date >= now - 2 * span)
                priorRows.push(e);
        }
        if (!currentRows.length || !priorRows.length)
            return [];
        const current = aggregate(currentRows, timezone, now);
        const prior = aggregate(priorRows, timezone, now);
        if (!current.eligibleCount || !prior.eligibleCount)
            return [];
        const delta = current.correct / current.eligibleCount -
            prior.correct / prior.eligibleCount;
        const supported = current.label === "Enough to guide practice" &&
            prior.label === "Enough to guide practice";
        const separated = current.interval[0] > prior.interval[1] ||
            prior.interval[0] > current.interval[1];
        const timingSupported = [current, prior].every((s) => s.timingCount >= policy.timingMinimum &&
            s.timingSessions >= 3 &&
            s.timingDays >= 3);
        const timingChange = current.median !== null && prior.median !== null && prior.median > 0
            ? (current.median - prior.median) / prior.median
            : null;
        const speedLabel = !timingSupported
            ? "Descriptive time only; more comparable timing evidence needed"
            : timingChange !== null && timingChange <= -0.2
                ? delta < 0
                    ? "Faster with lower outcome rate: trade-off"
                    : "Faster recorded decisions; descriptive signal"
                : timingChange !== null &&
                    timingChange > 0.25 &&
                    current.correct / current.eligibleCount >= policy.target
                    ? "Correct but slower than this personal baseline"
                    : "No supported speed signal";
        return [
            {
                key,
                current,
                prior,
                delta,
                timingSupported,
                timingChange,
                speedLabel,
                label: supported && separated && Math.abs(delta) >= 0.1
                    ? "Clear change in recorded performance"
                    : "Directional / uncertain",
            },
        ];
    });
}
