import { hash, stable } from "../types.js";
import { buildHierarchy, dataRevision, reconciliation, makeCell, comparisonFamily, } from "../hierarchy.js";
import { matchedTrends } from "../metrics.js";
import { markScore } from "../metrics.js";
import { policy, compareId } from "../policy.js";
import { summaryPolicy as p } from "./policy.js";
import { registry } from "./registry.js";
import { renderInsight } from "./templates.js";
import { qualityGeneralization } from "./generalization.js";
import { composeEditorial } from "./editorial.js";
export function supported(c) {
    return (c.reliability === "sufficient" &&
        !c.stale &&
        (c.level === "degree"
            ? c.qualityGuard?.supported === true
            : c.contextState === "matched") &&
        c.denominator !== null &&
        (c.level === "mode-specific" || c.generalization !== "not-established"));
}
function scope(c) {
    return c.generalization === "observed-roots"
        ? `observed-roots:${c.roots.length}`
        : c.generalization === "root-specific"
            ? `root:${c.roots[0]?.root ?? "unknown"}`
            : `limited:${c.roots.map((r) => r.root).join(", ") || "unknown"}`;
}
function fact(c, category, certainty, templateId, params, refs = [c.evidenceRefId]) {
    const semanticKey = stable([
        c.mode,
        c.subtask,
        c.source,
        c.metricId,
        c.id,
        c.queryScope,
        category,
        params,
    ]);
    return {
        schemaVersion: 1,
        id: "insight-" + hash(semanticKey),
        category,
        certainty,
        mode: c.mode,
        subtask: c.subtask,
        source: c.source,
        metricId: c.metricId,
        cellId: c.id,
        templateId,
        templateVersion: 1,
        params,
        evidenceRefIds: c.aggregateEvidenceRefId
            ? [...refs, c.aggregateEvidenceRefId]
            : refs,
        semanticKey,
    };
}
const questionSets = new WeakMap();
function contains(parent, child) {
    if (!(parent.mode === child.mode &&
        parent.subtask === child.subtask &&
        parent.source === child.source &&
        parent.metricId === child.metricId &&
        parent.quality === child.quality &&
        parent.degree === child.degree))
        return false;
    let questions = questionSets.get(parent);
    if (!questions) {
        questions = new Set(parent.sample.map((o) => o.row.questionId));
        questionSets.set(parent, questions);
    }
    return child.sample.every((o) => questions.has(o.row.questionId));
}
export function comparePeers(a, b, query, revision, now) {
    const familyVersion = [...a.sample, ...b.sample].some((o) => o.row.mode === "m2" && Boolean(o.row.config.responseDistractors?.trim()))
        ? "tested-label-substitution-1"
        : "exact-choices-1";
    const key = (o) => stable([o.root, comparisonFamily(o.row, true)]);
    const leftMap = new Map(), rightMap = new Map();
    for (const [cell, map] of [
        [a, leftMap],
        [b, rightMap],
    ])
        for (const o of cell.sample) {
            const k = key(o), group = map.get(k) ?? [];
            group.push(o);
            map.set(k, group);
        }
    const shared = [...leftMap.keys()]
        .filter((k) => rightMap.has(k) && !k.includes('"unknown"'))
        .sort();
    if (!shared.length)
        return {
            comparison: {
                id: "comparison-" + hash([a.id, b.id]),
                familyVersion,
                kind: "peer",
                leftEvidenceRefId: a.evidenceRefId,
                rightEvidenceRefId: b.evidenceRefId,
                matchedShareLeft: 0,
                matchedShareRight: 0,
                sharedStrata: [],
                hasReversal: false,
                compatible: false,
                vetoReasons: ["No shared known context strata."],
            },
            left: null,
            right: null,
            delta: 0,
        };
    const left = makeCell(shared.flatMap((k) => leftMap.get(k)), a.level, a.id + ":matched:" + b.id, query, revision, now), right = makeCell(shared.flatMap((k) => rightMap.get(k)), b.level, b.id + ":matched:" + a.id, query, revision, now);
    const l = left.cell, r = right.cell, n = l.denominator ?? 0, m = r.denominator ?? 0;
    const shareL = n / (a.denominator || 1), shareR = m / (b.denominator || 1), delta = n && m ? l.numerator / n - r.numerator / m : 0;
    const reasons = [];
    let reversal = false;
    if (shareL < p.minMatchedShare || shareR < p.minMatchedShare)
        reasons.push("Fewer than 50% of either side survives matching.");
    const roots = new Set(shared.map((k) => JSON.parse(k)[0]));
    if (roots.size < p.rootMinimum &&
        !(roots.size === 1 &&
            a.level === "root-quality-degree" &&
            b.level === "root-quality-degree"))
        reasons.push("Not enough shared roots.");
    for (const k of shared) {
        const x = leftMap.get(k), y = rightMap.get(k);
        if (Math.abs(x.length / (n || 1) - y.length / (m || 1)) >
            p.maxStratumShareDifference)
            reasons.push("Matched context shares differ by more than 20 percentage points.");
        const d = x.filter((o) => o.outcome === "correct").length / x.length -
            y.filter((o) => o.outcome === "correct").length / y.length;
        if (x.length >= 5 && y.length >= 5 && d * delta < 0)
            reversal = true;
    }
    if (reversal)
        reasons.push("Results vary by context; direction reverses.");
    // Multiple matched strata may be described, but a general claim still needs compatible settings.
    if (!supported(l) || !supported(r))
        reasons.push("Both matched sides need sufficient compatible evidence.");
    const comparison = {
        id: "comparison-" + hash([a.id, b.id, shared]),
        familyVersion,
        kind: "peer",
        leftEvidenceRefId: left.ref.id,
        rightEvidenceRefId: right.ref.id,
        matchedShareLeft: shareL,
        matchedShareRight: shareR,
        sharedStrata: shared,
        hasReversal: reversal,
        compatible: !reasons.length,
        vetoReasons: [...new Set(reasons)],
    };
    return { comparison, left, right, delta };
}
export function buildSummary(rows, query, revision = dataRevision(rows), now = Date.now(), history = rows) {
    const { cells, refs } = buildHierarchy(rows, query, revision, now), candidates = [], comparisons = [];
    const cellIndex = new Map(cells.map((c) => [c.id, c]));
    for (const c of cells.filter((c) => c.level === "degree" && c.denominator !== null)) {
        c.qualityGuard = qualityGeneralization(c, cells);
        c.capabilityReasons.push(...c.qualityGuard.reasons);
        c.label = c.degree + " across practised qualities";
    }
    const relevant = cells.filter((c) => (c.level === "degree" && c.qualityGuard?.supported) ||
        c.level === "quality-degree" ||
        c.level === "root-quality-degree" ||
        c.level === "mode-specific");
    for (const c of relevant) {
        if (c.denominator === null)
            continue;
        const n = c.denominator, k = c.numerator ?? 0, noncorrect = n - k;
        const params = {
            focus: c.label,
            scope: scope(c),
            k,
            n,
            noncorrect,
            ...(c.level === "degree"
                ? {
                    sourceLabel: c.source === "self"
                        ? "self-rated"
                        : c.source === "visual"
                            ? "visually mapped"
                            : "recorded",
                }
                : {}),
            ...(c.mode === "m2"
                ? {
                    component: c.metricId === "joint-recognition"
                        ? "joint degree and quality"
                        : "degree",
                }
                : {}),
        };
        if (c.mode === "m6" && c.subtask === "stage-mark") {
            const marked = c.sample.filter((o) => o.row.capabilities.marks), scores = marked.map((o) => markScore(o.row.record.analytics.marks.expected, o.row.record.analytics.marks.selected));
            const hits = scores.reduce((n, s) => n + s.hits, 0), selected = scores.reduce((n, s) => n + s.selected, 0), expected = scores.reduce((n, s) => n + s.expected, 0);
            if (selected && expected)
                candidates.push(fact(c, "specific-difficulty", "descriptive", "marks", {
                    focus: c.label,
                    hits,
                    selected,
                    expected,
                    phrases: marked.length,
                }));
        }
        if (supported(c) && c.wilson95[1] < policy.target)
            candidates.push(fact(c, c.level === "root-quality-degree" || c.level === "mode-specific"
                ? "specific-difficulty"
                : "weakness", "supported", c.level === "degree" ? "cross-quality" : registry(c).templateId, params));
        else if (!c.stratum &&
            c.independentQuestionCount !== null &&
            c.contextState !== "unknown" &&
            !c.stale &&
            n &&
            (n >= 5 || noncorrect >= 2) &&
            k / n < policy.target)
            candidates.push(fact(c, "specific-difficulty", "tentative", "tentative-difficulty", {
                focus: c.label,
                k,
                n,
                days: c.localDays,
                roots: c.roots.map((r) => r.root).join(", "),
                context: c.contextState,
                sourceLabel: c.source === "self"
                    ? "self-rated"
                    : c.source === "visual"
                        ? "visually mapped"
                        : "recorded",
            }));
        if (supported(c) && c.wilson95[0] >= policy.target)
            candidates.push(fact(c, "relative-strength", "supported", "stable", {
                ...params,
                sourceLabel: c.source === "self"
                    ? "self-rated"
                    : c.source === "visual"
                        ? "visually mapped"
                        : "recorded",
            }));
        if (c.source === "automatic" && supported(c)) {
            for (const component of ["degree", "quality"]) {
                if (component === "quality" && c.subtask !== "hidden")
                    continue;
                const expected = component === "degree" ? c.degree : c.quality;
                if (!expected)
                    continue;
                const counts = new Map();
                let denominator = 0;
                for (const o of c.sample) {
                    const selected = component === "degree"
                        ? o.row.record.selectedDegrees?.[o.index]
                        : o.row.record.selectedQualities?.[o.index];
                    if (selected) {
                        denominator++;
                        if (selected !== expected)
                            counts.set(selected, (counts.get(selected) ?? 0) + 1);
                    }
                }
                for (const [selected, errors] of [...counts].sort(([a], [b]) => a.localeCompare(b)))
                    if (errors >= p.minConfusionErrors &&
                        errors / denominator >= p.minConfusionRowRate &&
                        denominator === n)
                        candidates.push(fact(c, "confusion", "supported", "confusion", {
                            focus: c.label,
                            expected,
                            selected,
                            errors,
                            n: denominator,
                            component,
                            scope: scope(c),
                        }));
            }
        }
    }
    for (const c of relevant.filter((c) => !c.stratum &&
        c.level !== "degree" &&
        c.level !== "root-quality-degree" &&
        c.independentQuestionCount !== null &&
        !c.stale &&
        c.contextState !== "unknown" &&
        (c.denominator ?? 0) >= 10 &&
        c.numerator / c.denominator >= policy.target &&
        !supported(c))) {
        candidates.push(fact(c, "tentative-positive", "tentative", "tentative-positive", {
            focus: c.label,
            k: c.numerator,
            n: c.denominator,
            days: c.localDays,
            roots: c.roots.map((r) => r.root).join(", "),
            context: c.contextState,
            sourceLabel: c.source === "self"
                ? "self-rated"
                : c.source === "visual"
                    ? "visually mapped"
                    : "recorded",
        }));
    }
    // Prefer sufficient parents. Sparse exact children remain available only in drilldown.
    for (const i of candidates.filter((i) => i.certainty === "supported" &&
        ["weakness", "specific-difficulty"].includes(i.category))) {
        const parent = cellIndex.get(i.cellId);
        if (parent.level !== "quality-degree")
            continue;
        const child = candidates
            .filter((j) => j.certainty === "supported" && j.category === "specific-difficulty")
            .find((j) => {
            const c = cellIndex.get(j.cellId);
            return (c.level === "root-quality-degree" &&
                contains(parent, c) &&
                c.numerator / c.denominator <
                    parent.numerator / parent.denominator - 0.1);
        });
        if (child) {
            i.suppressedBy = child.id;
            i.suppressionReason =
                "A sufficient root-specific child adds material context.";
        }
    }
    for (const i of candidates) {
        if (i.suppressedBy)
            continue;
        const c = cellIndex.get(i.cellId);
        const replacement = candidates.find((j) => j.id !== i.id &&
            !j.suppressedBy &&
            j.certainty === "supported" &&
            j.category !== "relative-strength" &&
            j.category !== "comparable-trend" &&
            contains(cellIndex.get(j.cellId), c) &&
            ((cellIndex.get(j.cellId).level === "quality-degree" &&
                c.level === "root-quality-degree") ||
                (j.category === "confusion" &&
                    i.category !== "confusion" &&
                    j.cellId === i.cellId)));
        if (replacement) {
            i.suppressedBy = replacement.id;
            i.suppressionReason =
                "Supported parent or directional confusion explains this focus.";
        }
    }
    const parents = cells.filter((c) => (c.level === "quality-degree" || c.level === "root-quality-degree") &&
        c.denominator &&
        c.reliability === "sufficient" &&
        !c.stale);
    for (let i = 0; i < parents.length; i++)
        for (let j = i + 1; j < parents.length; j++) {
            const a = parents[i], b = parents[j];
            if (a.mode !== b.mode ||
                a.subtask !== b.subtask ||
                a.source !== b.source ||
                a.level !== b.level ||
                (a.level === "root-quality-degree" &&
                    a.roots[0]?.root !== b.roots[0]?.root) ||
                a.quality !== b.quality ||
                a.degree === b.degree ||
                a.metricId !== b.metricId)
                continue;
            const result = comparePeers(a, b, query, revision, now);
            comparisons.push(result.comparison);
            if (!result.left ||
                !result.right ||
                !result.comparison.compatible ||
                Math.abs(result.delta) * 100 < p.minRelativeDifferencePp)
                continue;
            const l = result.left.cell, r = result.right.cell;
            if (!(l.wilson95[0] > r.wilson95[1] || r.wilson95[0] > l.wilson95[1]))
                continue;
            refs.set(result.left.ref.id, result.left.ref);
            refs.set(result.right.ref.id, result.right.ref);
            const better = result.delta > 0 ? l : r, worse = result.delta > 0 ? r : l, below = better.numerator / better.denominator < policy.target;
            const insight = fact(better, "relative-strength", "supported", "relative", {
                focus: better.label,
                other: worse.label,
                k: better.numerator,
                n: better.denominator,
                otherK: worse.numerator,
                otherN: worse.denominator,
                scope: scope(better),
                sourceLabel: better.source === "self"
                    ? "self-rated"
                    : better.source === "visual"
                        ? "visually mapped"
                        : "recorded",
                qualification: below
                    ? "Less difficult in this comparison; both still show room for practice."
                    : "",
            }, [better.evidenceRefId, worse.evidenceRefId]);
            insight.cellId = result.delta > 0 ? a.id : b.id;
            insight.comparisonId = result.comparison.id;
            candidates.push(insight);
        }
    const selectedCohorts = new Set(rows.map((e) => e.cohortKey));
    const descriptiveParents = cells.filter((c) => !c.stratum &&
        c.level === "quality-degree" &&
        !c.stale &&
        c.independentQuestionCount !== null &&
        c.contextState !== "unknown" &&
        (c.denominator ?? 0) >= 10);
    const descriptivePairs = [];
    for (let i = 0; i < descriptiveParents.length; i++)
        for (let j = i + 1; j < descriptiveParents.length; j++) {
            const a = descriptiveParents[i], b = descriptiveParents[j];
            const gap = Math.abs(a.numerator / a.denominator - b.numerator / b.denominator);
            if (a.mode === b.mode &&
                a.subtask === b.subtask &&
                a.source === b.source &&
                a.grain === b.grain &&
                a.metricId === b.metricId &&
                a.quality === b.quality &&
                gap >= 0.1 &&
                !candidates.some((c) => c.category === "relative-strength" &&
                    c.certainty === "supported" &&
                    [a.id, b.id].includes(c.cellId)))
                descriptivePairs.push({ a, b, gap });
        }
    descriptivePairs.sort((x, y) => Math.min(y.a.denominator, y.b.denominator) -
        Math.min(x.a.denominator, x.b.denominator) ||
        y.gap - x.gap ||
        compareId([x.a.id, x.b.id].sort().join(), [y.a.id, y.b.id].sort().join()));
    for (const { a, b } of descriptivePairs) {
        const result = comparePeers(a, b, query, revision, now);
        // A descriptive pair cites original samples, never the failed matched subsets.
        const descriptiveComparison = {
            ...result.comparison,
            id: "descriptive-comparison-" + hash([a.id, b.id, query]),
            familyVersion: "descriptive-peer-1",
            compatible: false,
            leftEvidenceRefId: a.evidenceRefId,
            rightEvidenceRefId: b.evidenceRefId,
            vetoReasons: [
                ...result.comparison.vetoReasons,
                "Descriptive contrast only; no supported peer conclusion.",
            ],
        };
        comparisons.push(descriptiveComparison);
        candidates.push(fact(a, "descriptive-peer", "descriptive", "descriptive-peer", {
            focus: a.label,
            other: b.label,
            k: a.numerator,
            n: a.denominator,
            otherK: b.numerator,
            otherN: b.denominator,
            sourceLabel: a.source === "self"
                ? "self-rated"
                : a.source === "visual"
                    ? "visually mapped"
                    : "recorded",
        }, [a.evidenceRefId, b.evidenceRefId]));
        candidates[candidates.length - 1].comparisonId = descriptiveComparison.id;
    }
    for (const trend of matchedTrends(history.filter((e) => selectedCohorts.has(e.cohortKey)), query.timezone, now)) {
        const c = relevant.find((c) => c.rows.some((e) => e.cohortKey === trend.key));
        if (!c)
            continue;
        const span = policy.days * 86400000;
        const sets = [
            history.filter((e) => e.cohortKey === trend.key && Date.parse(e.createdAt) >= now - span),
            history.filter((e) => e.cohortKey === trend.key &&
                Date.parse(e.createdAt) >= now - 2 * span &&
                Date.parse(e.createdAt) < now - span),
        ];
        const built = sets.map((set, index) => buildHierarchy(set, {
            ...query,
            startInclusive: new Date(now - (index ? 2 : 1) * span).toISOString(),
            endExclusive: new Date(index ? now - span : now).toISOString(),
        }, revision, now));
        const pair = built.map((b) => b.cells.find((x) => x.level === c.level));
        if (pair.some((x) => !x))
            continue;
        for (const b of built)
            for (const [id, ref] of b.refs)
                refs.set(id, ref);
        const refsIds = pair.map((x) => x.evidenceRefId), trade = trend.timingSupported &&
            trend.timingChange !== null &&
            trend.timingChange <= -0.2 &&
            trend.delta < 0;
        const context = sets[0][0];
        const trendFocus = context.mode.toUpperCase() +
            " · " +
            context.record.chords.join(" → ") +
            " / " +
            context.record.targets.join(" → ") +
            " / " +
            context.subtask;
        if (trade || trend.label === "Clear change in recorded performance")
            candidates.push(fact(c, "comparable-trend", "supported", trade ? "tradeoff" : "trend", trade
                ? {
                    focus: trendFocus,
                    priorSeconds: (trend.prior.median / 1000).toFixed(2),
                    seconds: (trend.current.median / 1000).toFixed(2),
                    priorK: trend.prior.correct,
                    priorN: trend.prior.eligibleCount,
                    k: trend.current.correct,
                    n: trend.current.eligibleCount,
                }
                : {
                    focus: trendFocus,
                    k: trend.current.correct,
                    n: trend.current.eligibleCount,
                    priorK: trend.prior.correct,
                    priorN: trend.prior.eligibleCount,
                    pp: (trend.delta * 100).toFixed(1),
                    period: "current vs previous 28 days",
                    sourceLabel: c.source === "self" ? "self-rated" : "recorded",
                }, refsIds));
    }
    // One coverage fact per mode/task/source, not an inventory of sparse cells.
    const partitions = new Map();
    for (const c of relevant.filter((c) => c.level !== "root-quality-degree")) {
        const key = stable([c.mode, c.subtask, c.source, c.grain]);
        const list = partitions.get(key) ?? [];
        list.push(c);
        partitions.set(key, list);
    }
    for (const group of partitions.values()) {
        const c = [...group].sort((a, b) => (b.denominator ?? 0) - (a.denominator ?? 0) || a.id.localeCompare(b.id))[0];
        if (candidates.some((i) => !i.suppressedBy &&
            i.mode === c.mode &&
            i.subtask === c.subtask &&
            i.source === c.source))
            continue;
        candidates.push(fact(c, "coverage", "coverage", c.independentQuestionCount === null || !c.denominator
            ? "coverage-unknown"
            : "coverage", c.independentQuestionCount === null || !c.denominator
            ? {
                focus: c.mode.toUpperCase() + " / " + c.subtask,
                rows: c.rows.length,
            }
            : { focus: c.label, n: c.denominator }));
    }
    const editorial = composeEditorial(candidates.filter((i) => renderInsight(i) !== null), cells, !query.mode);
    return {
        revision,
        query,
        cells,
        refs,
        candidates,
        comparisons,
        statements: editorial.statements,
        recommendations: editorial.recommendations,
        reconciliation: reconciliation(rows, now),
    };
}
const cache = new Map();
export function cachedSummary(rows, query, revision, now = Date.now(), history = rows) {
    const key = stable([
        revision,
        query,
        p.version,
        policy.version,
        "insights-schedule-1",
        now,
        new Date(now).toISOString().slice(0, 10),
        Intl.DateTimeFormat("en-CA", {
            timeZone: query.timezone,
            dateStyle: "short",
        }).format(new Date(now)),
    ]);
    const previous = cache.get(key);
    if (previous)
        return previous;
    const model = buildSummary(rows, query, revision, now, history);
    if (cache.size >= 8)
        cache.delete(cache.keys().next().value);
    cache.set(key, model);
    return model;
}
export function clearPresentationCache() {
    cache.clear();
}
