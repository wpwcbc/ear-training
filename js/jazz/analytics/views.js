import { defaults, loadSessions, } from "../model.js";
import { commandIcon, icon } from "../ui.js";
import { renderTrend } from "./charts.js";
import { renderMatrix } from "./matrix.js";
import { reconcile, readAll, exportData, importData, clearInsights, persistenceError, put, } from "./repository.js";
import { task } from "./types.js";
import { aggregate, components, cells, priorities, matchedTrends, markScore, assistedRecovery, } from "./metrics.js";
import { compileDrill, compileDiagnostic } from "./drills.js";
import { legacyData } from "./adapters.js";
import { policy } from "./policy.js";
import { legacySummary, prepareLegacyLaunch, } from "../../analytics/legacy.js";
import { bassPositions } from "../bass.js";
import { parseChord } from "../theory.js";
import { defaultFocusIndex } from "./focused.js";
const names = {
    m1: "Hear a Chord Degree",
    m2: "Identify a Chord Degree",
    m3: "Same Note, New Chord",
    m4: "Anticipate Next Chord Tone",
    m5: "Follow a Progression",
    m6: "Bebop Phrase Lab",
    m7: "Ear to Bass",
};
const node = (tag, text) => {
    const n = document.createElement(tag);
    if (text)
        n.textContent = text;
    return n;
};
function link(text, href) {
    const a = node("a", text);
    a.href = href;
    return a;
}
function button(text, action) {
    const b = node("button", text);
    b.type = "button";
    commandIcon(b);
    if (text.startsWith("Practise"))
        icon(b, "play");
    b.onclick = () => {
        Promise.resolve()
            .then(action)
            .catch((error) => {
            const p = node("p", String(error));
            p.setAttribute("role", "alert");
            b.after(p);
        });
    };
    return b;
}
function table(parent, headers, rows, id) {
    const wrap = node("div");
    wrap.className = "table-scroll";
    if (id)
        wrap.id = id;
    if (!rows.length) {
        wrap.append(node("p", "No eligible observations for these filters."));
        parent.append(wrap);
        return;
    }
    const t = node("table"), head = node("thead"), tr = node("tr");
    headers.forEach((h) => {
        const th = node("th", h);
        th.scope = "col";
        tr.append(th);
    });
    head.append(tr);
    t.append(head);
    const body = node("tbody");
    rows.forEach((r) => {
        const tr = node("tr");
        r.forEach((value) => {
            const td = node("td");
            td.append(value);
            tr.append(td);
        });
        body.append(tr);
    });
    t.append(body);
    wrap.append(t);
    parent.append(wrap);
}
const rate = (k, n) => n ? `${k}/${n} (${Math.round((100 * k) / n)}%)` : "No eligible answers";
function metric(parent, label, value) {
    const item = node("div");
    item.append(node("span", label), node("strong", value));
    parent.append(item);
}
export async function renderAnalytics(host, route, actions) {
    const token = route;
    host.dataset.route = token;
    host.replaceChildren(node("p", "Loading local evidence..."));
    let evidence;
    try {
        evidence = await reconcile(loadSessions(localStorage));
    }
    catch (error) {
        host.replaceChildren(node("h2", "Insights"), node("p", `Local evidence unavailable: ${String(error)}. Existing data has not been changed.`));
        return;
    }
    if (host.dataset.route !== token)
        return;
    host.replaceChildren();
    host.classList.add("analytics");
    const [path, query = ""] = route.split("?"), mode = path.split("/")[1] ?? "", params = new URLSearchParams(query);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const nav = node("nav");
    nav.className = "insight-nav";
    nav.setAttribute("aria-label", "Insight sources");
    nav.append(link("Overview", "#/insights"));
    for (const m of Object.keys(names))
        nav.append(link(m.toUpperCase(), "#/insights/" + m));
    nav.append(link("Legacy", "#/insights/legacy"));
    Array.from(nav.querySelectorAll("a")).forEach((a) => {
        if (a.hash === "#/" + path)
            a.setAttribute("aria-current", "page");
    });
    host.append(nav);
    host.append(node("h2", mode === "legacy"
        ? "Legacy practice"
        : (names[mode] ?? "What to practise next")));
    if (mode === "legacy") {
        await renderLegacy(host);
        await health(host, evidence);
        return;
    }
    const filters = node("div");
    filters.className = "insight-filters";
    const filter = (name, label, options, fallback, container = filters) => {
        const l = node("label", label), s = node("select");
        s.setAttribute("aria-label", label);
        options.forEach(([value, text]) => s.add(new Option(text, value)));
        s.value = params.get(name) ?? fallback;
        s.onchange = () => {
            params.set(name, s.value);
            location.hash = "#/" + path + "?" + params.toString();
        };
        l.append(s);
        container.append(l);
        return s.value;
    };
    const days = filter("days", "Period", [
        ["28", "Last 28 days"],
        ["7", "Last 7 days"],
        ["all", "All retained"],
    ], "28");
    const exposure = filter("exposure", "Practice", [
        ["fresh", "Fresh practice"],
        ["targeted", "Targeted practice"],
        ["exact-review", "Exact review"],
        ["all", "All practice"],
    ], "fresh");
    const assistance = filter("assistance", "Assistance", [
        ["none", "Known unassisted"],
        ["reference", "Reference-assisted"],
        ["unknown", "Unknown exposure"],
        ["all", "All assistance"],
    ], "none");
    const version = filter("version", "Data version", [
        ["all", "All versions"],
        ["standard", "New capture"],
        ["historical", "Historical v1"],
    ], "all");
    const source = filter("source", "Assessment", [
        ["all", "Separate sources"],
        ["automatic", "Recognition"],
        ["self", "Self-assessed"],
        ["visual", "Visual mapping"],
    ], "all");
    const taskOptions = {
        m2: ["visible", "hidden"],
        m3: ["recognize", "produce"],
        m4: ["manual", "timed"],
        m5: [
            "step-one",
            "step-two",
            "step-line",
            "continuous-one",
            "continuous-two",
            "continuous-line",
        ],
        m6: [
            "whole-activity",
            "stage-sing",
            "stage-mark",
            "stage-predict",
            "stage-bass",
            "stage-vary",
        ],
        m7: ["sing-play", "hear-play", "next-beat"],
    };
    const subtask = taskOptions[mode]
        ? filter("task", "Task", taskOptions[mode].map((t) => [t, t]), taskOptions[mode][0])
        : "";
    filters.append(link("Reset", "#/" + path));
    host.append(filters, node("p", `${timezone} · retained browser data · policy ${policy.version}`));
    const now = Date.now();
    let rows = evidence.filter((e) => (!mode || e.mode === mode) &&
        (!subtask || e.subtask === subtask) &&
        (exposure === "all" || e.exposure === exposure) &&
        (assistance === "all" || e.assistance === assistance) &&
        (version === "all" || e.version === version) &&
        (source === "all" || e.source === source) &&
        Number.isFinite(Date.parse(e.createdAt)) &&
        Date.parse(e.createdAt) <= now &&
        (days === "all" ||
            Date.parse(e.createdAt) >= now - Number(days) * 86400000));
    const contextDetails = node("details"), contextControls = node("div");
    contextControls.className = "insight-filters";
    contextDetails.append(node("summary", "Context filters"), contextControls);
    const contextSettings = [
        ["context", "Harmonic context"],
        ["hintLevel", "Hints"],
        ["timbre", "Timbre"],
        ["bpm", "Tempo"],
        ["inversion", "Inversion"],
        ["showChords", "Chord symbols"],
        ["showProgression", "Chart visibility"],
        ["rangePreset", "Register"],
    ];
    if (mode === "m7")
        contextSettings.push(["fretNames", "Fret note names"], ["bassString", "Required string"]);
    if (mode === "m6")
        contextSettings.push(["variation", "Phrase variation"], ["transpose", "Transpose"]);
    if (mode) {
        for (const [key, label] of contextSettings) {
            const values = [
                ...new Set(rows.map((e) => String(e.config[key] ?? "unknown"))),
            ].sort();
            const selected = filter("context-" + key, label, [["all", "All"], ...values.map((v) => [v, v])], "all", contextControls);
            if (selected !== "all")
                rows = rows.filter((e) => String(e.config[key] ?? "unknown") === selected);
        }
        host.append(contextDetails);
    }
    if (mode) {
        const facet = (key, label, values) => filter(key, label, [
            ["all", "All"],
            ...[...new Set(values)].sort().map((v) => [v, v]),
        ], "all");
        const root = facet("root", "Presented root", rows.flatMap((e) => e.record.chords.map((c) => c.match(/^[A-G][b#]?/)?.[0] ?? "Unknown")));
        const quality = facet("quality", "Presented chord", rows.flatMap((e) => e.record.chords));
        const degree = facet("degree", "Presented degree", rows.flatMap((e) => e.record.targets));
        rows = rows.filter((e) => (root === "all" ||
            e.record.chords.some((c) => c.match(/^[A-G][b#]?/)?.[0] === root)) &&
            (quality === "all" || e.record.chords.includes(quality)) &&
            (degree === "all" || e.record.targets.includes(degree)));
    }
    if (!mode) {
        const queue = priorities(rows, timezone, now, evidence), selected = new Set();
        const section = node("section");
        section.className = "insight-focus-queue";
        section.append(node("h3", "Suggested focus"));
        for (const cell of queue) {
            if (selected.has(cell.rows[0].mode) || selected.size === 3)
                continue;
            selected.add(cell.rows[0].mode);
            focus(section, cell, route, actions, timezone);
        }
        if (!selected.size)
            section.append(node("p", "Not enough practice data to identify a difficulty. Start a diagnostic set or inspect historical evidence."));
        host.append(section);
        const grid = node("div");
        grid.className = "insight-mode-grid";
        for (const [id, title] of Object.entries(names)) {
            const subset = rows.filter((e) => e.mode === id), card = node("article");
            card.append(node("h3", id.toUpperCase() + " · " + title), node("p", subset.length
                ? `${subset.length} retained assessments · ${id === "m2" ? "Recognition" : id === "m3" ? "Recognition and self-ratings shown separately" : "Self-assessed production"}`
                : "Not enough practice data"), link("Details", "#/insights/" + id));
            if (!subset.length) {
                const plan = compileDiagnostic({ ...defaults, mode: id, count: 10 }, route);
                if (plan)
                    card.append(node("p", plan.reason), button("Practise 10", async () => {
                        await put("drillPlans", plan);
                        await actions.start(plan.config, plan.customSnapshots, "insight:" + plan.id, plan.questions, plan);
                    }));
                card.append(button("Configure diagnostic set", () => actions.customize({ ...defaults, mode: id, count: 10 }, [])));
            }
            if (subset.length && ["m1", "m2", "m7"].includes(id)) {
                const plan = compileDiagnostic(subset[subset.length - 1].config, route, subset);
                if (plan) {
                    const details = node("details");
                    details.append(node("summary", "Check under-practised targets"), node("p", plan.reason), button("Practise 10", async () => {
                        await put("drillPlans", plan);
                        await actions.start(plan.config, plan.customSnapshots, "insight:" + plan.id, plan.questions, plan);
                    }));
                    card.append(details);
                }
            }
            grid.append(card);
        }
        host.append(grid);
        host.append(node("h3", "Check unexplored areas"), node("p", "Coverage describes the material you selected, not all jazz skills. Unpractised modes and roots need new observations, not a zero score."));
    }
    else {
        host.append(node("p", mode === "m2" || (mode === "m3" && subtask === "recognize")
            ? "Recognition outcomes describe submitted choices, not singing or instrument performance."
            : "Production is self-assessed. Reference notes are generated targets, not measured singing or playing."));
        for (const grading of ["automatic", "self", "visual"]) {
            const group = rows.filter((e) => e.source === grading);
            if (!group.length)
                continue;
            const stats = aggregate(group, timezone), strip = node("div");
            strip.className = "insight-kpis";
            metric(strip, grading === "visual"
                ? "Visual mapping: exact MIDI"
                : grading === "self"
                    ? "Self-ratings: correct / close / missed"
                    : "Submitted exact answers", grading === "self"
                ? `${stats.ratings.correct} / ${stats.ratings.close} / ${stats.ratings.missed}`
                : rate(stats.ratings.correct, stats.submitted));
            metric(strip, "Independent fresh questions", String(stats.eligibleCount));
            metric(strip, grading === "visual"
                ? "Correct mapping decision median"
                : mode === "m6"
                    ? "Stage active-time median"
                    : "Correct response / readiness median", stats.median === null
                ? "Unavailable"
                : `${(stats.median / 1000).toFixed(1)}s · n=${stats.timingCount}`);
            metric(strip, "Context replay before response", rate(stats.replayCount, stats.sample.filter((e) => e.version === "standard").length));
            host.append(strip);
            host.append(node("p", `${stats.label}${stats.stale ? " · Stale evidence" : ""} · ${stats.sessions} sessions / ${stats.days} local days. ${stats.excluded.skipped} recorded skips. Historical response time uses the old lifecycle and is excluded from standardized timing.`));
            if (new Set(group.map((e) => e.cohortKey)).size > 1)
                host.append(node("p", "Mixed practice settings: totals are descriptive. Inspect a context below for a comparable evidence sample."));
            if (stats.interval && new Set(group.map((e) => e.cohortKey)).size === 1) {
                const p = node("p", `Estimated range for these practice results: ${Math.round(stats.interval[0] * 100)}–${Math.round(stats.interval[1] * 100)}%. Repeated practice is correlated; this is not a population ability estimate.`);
                p.title = "Estimated range for these practice results";
                host.append(p);
            }
            if (grading === "automatic" && ["m2", "m3"].includes(mode)) {
                const c = components(group);
                const recovery = assistedRecovery(evidence.filter((e) => e.mode === mode &&
                    e.subtask === subtask &&
                    group.some((r) => r.questionId === e.questionId)));
                host.append(node("p", `Assisted recovery: ${rate(recovery.recovered, recovery.eligibleCount)} initially unsuccessful questions with a reference-assisted follow-up. Separate from first-attempt results; follow-up selection is not random.`));
                table(host, ["Component", "Answer items"], [
                    ["Degree", rate(c.degree, c.degreeN)],
                    ["Quality (hidden chords)", rate(c.quality, c.qualityN)],
                    [
                        "Degree when quality correct",
                        rate(c.conditional, c.conditionalN),
                    ],
                ]);
                host.append(node("h3", "Recognition confusions"));
                table(host, ["Component", "Expected", "Selected", "Row rate"], c.confusion.map((c) => [
                    c.component,
                    c.expected,
                    c.selected,
                    rate(c.count, c.denominator),
                ]), "confusions");
            }
        }
        if (!rows.length)
            host.append(node("p", "No eligible observations for these filters. Unknown exposure is available under Assistance; it is not treated as unassisted."));
        host.append(node("h3", "Context and evidence"));
        const matrixMetric = filter("metric", "Context metric", [
            ["outcome", "Outcomes"],
            ["time", "Median active time"],
            ["sample", "Question / exposure counts"],
        ], "outcome", contextControls);
        for (const grading of ["automatic", "self", "visual"])
            renderMatrix(host, rows.filter((e) => e.source === grading), matrixMetric, (selected, index) => {
                const section = node("section");
                cells(selected)
                    .slice(0, 5)
                    .forEach((cell) => focus(section, { ...cell, focus: { targetIndex: Math.max(1, index) } }, route, actions, timezone));
                host.append(section);
                section.scrollIntoView({ block: "nearest" });
            });
        const contexts = cells(rows);
        table(host, [
            "Presented context",
            "Assessment source",
            "Assessment unit",
            "Recorded outcomes",
            "Independent evidence",
            "Details",
        ], contexts.map((cell) => {
            const s = aggregate(cell.rows, timezone);
            return [
                cell.label,
                cell.rows[0].source === "self"
                    ? "Self-assessment"
                    : cell.rows[0].source === "visual"
                        ? "Visual mapping"
                        : "Automatic answers",
                cell.rows[0].grain,
                `${s.ratings.correct} correct / ${s.ratings.close} close / ${s.ratings.missed} missed`,
                `${s.eligibleCount} questions · ${s.label}`,
                button("Inspect", () => {
                    const detail = node("section");
                    focus(detail, cell, route, actions, timezone);
                    host.append(detail);
                    detail.scrollIntoView({ block: "nearest" });
                }),
            ];
        }), "skill-stats");
        if (["m3", "m5", "m6"].includes(mode))
            host.append(node("p", "Whole-sequence/run ratings are counted once. Their target notes are coverage only, not independently graded notes."));
        if (["m3", "m5", "m6"].includes(mode)) {
            const coverage = new Map();
            for (const e of rows)
                e.record.targets.forEach((degree, i) => {
                    const label = e.record.chords[i] + " / " + degree, entry = coverage.get(label) ?? {
                        exposures: 0,
                        questions: new Set(),
                        correct: 0,
                        answered: 0,
                    };
                    entry.exposures++;
                    entry.questions.add(e.questionId ?? e.id);
                    if (e.source === "automatic" && e.record.selectedDegrees?.[i]) {
                        entry.answered++;
                        if (e.record.selectedDegrees[i] === degree &&
                            (!e.record.selectedQualities ||
                                e.record.selectedQualities[i] ===
                                    parseChord(e.record.chords[i]).quality))
                            entry.correct++;
                    }
                    coverage.set(label, entry);
                });
            table(host, [
                "Presented role",
                "Coverage exposures",
                "Questions represented",
                "Recognition item results",
            ], [...coverage].map(([label, c]) => [
                label,
                String(c.exposures),
                String(c.questions.size),
                c.answered
                    ? rate(c.correct, c.answered)
                    : "Coverage only; parent self-rating",
            ]));
        }
        if (mode === "m1")
            table(host, ["Presented context", "Self-reported difficulty"], rows
                .filter((e) => e.record.analytics?.difficultyTags?.length)
                .map((e) => [
                e.record.chords.join(" / ") + " / " + e.record.targets.join(" / "),
                e.record.analytics.difficultyTags.join(", "),
            ]));
        if (mode === "m3")
            table(host, [
                "Change",
                "Held reference MIDI",
                "Role transition",
                "Destination result",
                "Practice",
            ], rows.flatMap((e) => (e.challenge?.targets ?? []).flatMap((target, i) => {
                if (!i)
                    return [];
                const from = e.challenge.targets[i - 1], result = e.source === "self"
                    ? "Coverage only"
                    : e.record.selectedDegrees?.[i] === target.degree &&
                        (!e.record.selectedQualities ||
                            e.record.selectedQualities[i] === target.chord.quality)
                        ? "Correct item"
                        : "Missed item";
                return [
                    [
                        `${i}: ${from.chord.symbol} → ${target.chord.symbol}`,
                        String(target.midi),
                        from.degree + " → " + target.degree,
                        result,
                        button("Role-pair details", () => {
                            const section = node("section");
                            focus(section, { ...cells([e])[0], focus: { targetIndex: i } }, route, actions, timezone);
                            host.append(section);
                            section.scrollIntoView({ block: "nearest" });
                        }),
                    ],
                ];
            })));
        if (mode === "m4") {
            table(host, [
                "Source → destination",
                "Motion",
                "Prediction window",
                "Ready before reference",
            ], rows.map((e) => {
                const step = e.record.chordStep, targets = e.challenge?.targets, from = step === undefined ? undefined : targets?.[step - 1], to = step === undefined ? undefined : targets?.[step];
                return [
                    from && to
                        ? `${from.chord.symbol}/${from.degree} → ${to.chord.symbol}/${to.degree}`
                        : "Snapshot unavailable",
                    from && to ? `${to.midi - from.midi} semitones` : "Unavailable",
                    e.config.predictionUnit === "beats"
                        ? `${e.config.predictionBeats} beats`
                        : `${e.config.predictionSeconds}s`,
                    e.record.analytics?.ready
                        ? "Declared"
                        : e.version === "historical"
                            ? "Unavailable"
                            : "Not confirmed",
                ];
            }));
        }
        host.append(node("h3", "Practice priorities"));
        if (mode === "m5" &&
            subtask.startsWith("continuous") &&
            (source === "all" || source === "self")) {
            const events = await readAll("events");
            if (host.dataset.route !== route)
                return;
            const starts = events.filter((e) => {
                const origin = e.payload?.source, kind = origin?.includes("review")
                    ? "exact-review"
                    : origin?.startsWith("insight:")
                        ? "targeted"
                        : "fresh";
                return (e.type === "performance_started" &&
                    e.payload?.config?.mode === "m5" &&
                    `${e.payload.config.runMode}-${e.payload.config.targetPattern}` ===
                        subtask &&
                    (exposure === "all" || kind === exposure) &&
                    (assistance === "all" || e.payload.assistance === assistance) &&
                    contextSettings.every(([key]) => !params.get("context-" + key) ||
                        params.get("context-" + key) === "all" ||
                        String(e.payload?.config?.[key] ?? "unknown") ===
                            params.get("context-" + key)) &&
                    Date.parse(e.occurredAt) <= now &&
                    (days === "all" ||
                        Date.parse(e.occurredAt) >= now - Number(days) * 86400000));
            });
            const completed = new Set(events
                .filter((e) => e.type === "performance_completed")
                .map((e) => e.payload?.runId)), interrupted = new Set(events
                .filter((e) => e.type === "performance_interrupted")
                .map((e) => e.payload?.runId));
            const done = starts.filter((e) => completed.has(e.payload?.runId)).length, stopped = starts.filter((e) => interrupted.has(e.payload?.runId) &&
                !completed.has(e.payload?.runId)).length;
            host.append(node("p", `Playback run completion: ${rate(done, done + stopped)} terminal run attempts; ${stopped} interrupted, ${starts.length - done - stopped} unresolved. This records playback completion, not note or rhythm accuracy.`));
        }
        priorities(rows, timezone, now, evidence)
            .slice(0, 3)
            .forEach((cell) => focus(host, cell, route, actions, timezone));
        if (mode === "m6") {
            host.append(node("h3", "Phrase stages"), node("p", "Historical data supports overall activity ratings only. Stage visits are not stage mastery."));
            table(host, ["Phrase", "Selected targets", "Precision", "Recall"], rows
                .filter((e) => e.capabilities.marks)
                .map((e) => {
                const m = e.record.analytics.marks, s = markScore(m.expected, m.selected);
                return [
                    e.config.phraseId,
                    `${s.hits} correct selected`,
                    s.precision === null ? "Unavailable" : rate(s.hits, s.selected),
                    rate(s.hits, s.expected),
                ];
            }));
            table(host, ["Phrase", "Stage", "Self-rating"], rows.flatMap((e) => (e.record.analytics?.stageRatings ?? []).map((r) => [
                e.config.phraseId,
                { 1: "Sing back", 3: "Predict", 5: "Bass transfer" }[r.stage] ?? String(r.stage),
                r.grade,
            ])));
        }
        if (mode === "m7") {
            host.append(node("h3", "Visual mapping"), node("p", "A locked diagram position measures visual mapping, separately from the physical self-rating. Old MIDI selections have unknown exposure."));
            table(host, ["Position", "Pitch class", "Exact MIDI"], rows
                .filter((e) => e.capabilities.position &&
                (e.source === "visual" ||
                    !rows.some((v) => v.source === "visual" && v.questionId === e.questionId)))
                .map((e) => {
                const p = e.record.analytics.position;
                return [
                    `${p.string} string / fret ${p.fret}`,
                    p.midi % 12 === p.expectedMidi % 12 ? "Match" : "Mismatch",
                    p.midi === p.expectedMidi ? "Match" : "Mismatch",
                ];
            }));
        }
        host.append(node("h3", "Comparable periods"));
        const trends = matchedTrends(evidence.filter((e) => e.mode === mode && rows.some((row) => row.cohortKey === e.cohortKey)), timezone);
        const currentMatched = trends.reduce((n, t) => n + t.current.eligibleCount, 0), priorMatched = trends.reduce((n, t) => n + t.prior.eligibleCount, 0);
        host.append(node("p", `Matched coverage: ${currentMatched} current and ${priorMatched} prior independent questions across ${trends.length} comparable cohorts. Unmatched cohorts are excluded.`));
        trends.slice(0, 2).forEach((trend) => renderTrend(host, evidence.filter((e) => e.cohortKey === trend.key), timezone));
        table(host, ["Previous 28 days", "Current 28 days", "Difference", "Interpretation"], trends.map((t) => [
            rate(t.prior.correct, t.prior.eligibleCount),
            rate(t.current.correct, t.current.eligibleCount),
            `${(t.delta * 100).toFixed(1)} percentage points`,
            t.label,
        ]));
        host.append(node("p", "Only matching task, settings, measurement version and fresh-practice cohorts are compared. Targeted and exact-review practice do not improve this baseline. Unmatched settings are not evidence of improvement."));
        table(host, [
            "Previous median / valid n",
            "Current median / valid n",
            "Recorded decision time",
        ], trends.map((t) => [
            t.prior.median === null
                ? "Unavailable"
                : `${(t.prior.median / 1000).toFixed(1)}s / ${t.prior.timingCount}`,
            t.current.median === null
                ? "Unavailable"
                : `${(t.current.median / 1000).toFixed(1)}s / ${t.current.timingCount}`,
            t.speedLabel,
        ]));
        evidenceTable(host, rows, actions);
    }
    await health(host, evidence);
}
function focus(parent, cell, route, actions, timezone) {
    const box = node("article");
    box.className = "insight-focus";
    const stats = aggregate(cell.rows, timezone), rank = priorities(cell.rows, timezone)[0];
    box.append(node("h3", `${cell.rows[0].mode.toUpperCase()} · ${cell.label}`), node("p", `${cell.category ?? rank?.category ?? "Historical context"} · ${stats.label}. ${stats.correct}/${stats.eligibleCount} independent fresh questions; ${stats.sessions} sessions / ${stats.days} days.`));
    const result = compileDrill(cell, route);
    const e = cell.rows[0];
    box.append(node("p", `${e.source === "self" ? "Self-assessed production" : e.source === "visual" ? "Visual mapping" : "Automatic answers"} · ${e.grain}`));
    if (e.challenge && ["m3", "m4", "m5", "m6", "m7"].includes(e.mode)) {
        const label = node("label", e.mode === "m6"
            ? "Stage focus"
            : e.mode === "m7"
                ? "Position focus"
                : "Change focus"), select = node("select");
        select.setAttribute("aria-label", label.textContent);
        if (e.mode === "m6") {
            for (const stage of ["sing", "mark", "predict", "bass", "vary"])
                select.add(new Option(stage, stage));
            select.value = cell.focus?.stage ?? e.config.phraseFocus ?? "sing";
        }
        else if (e.mode === "m7") {
            select.add(new Option("Current task", ""));
            for (const p of bassPositions(e.challenge.targets[0].midi, e.config.fretLow, e.config.fretHigh))
                select.add(new Option(`${p.string} string / fret ${p.fret}${e.record.analytics?.position?.string === p.string && e.record.analytics.position.fret === p.fret ? " (last committed)" : ""}`, JSON.stringify(p)));
            select.value = cell.focus?.position
                ? JSON.stringify(cell.focus.position)
                : "";
        }
        else {
            e.challenge.targets.forEach((t, i) => {
                if (i)
                    select.add(new Option(`${i}: ${e.challenge.targets[i - 1].chord.symbol} → ${t.chord.symbol}`, String(i)));
            });
            select.value = String(cell.focus?.targetIndex ?? defaultFocusIndex(e));
            if (!select.value)
                select.value = "1";
        }
        select.onchange = () => {
            const next = {
                ...cell,
                focus: e.mode === "m6"
                    ? { stage: select.value }
                    : e.mode === "m7"
                        ? select.value
                            ? { position: JSON.parse(select.value) }
                            : {}
                        : { targetIndex: Number(select.value) },
            };
            const replacement = node("div");
            focus(replacement, next, route, actions, timezone);
            box.replaceWith(...Array.from(replacement.children));
        };
        label.append(select);
        box.append(label);
    }
    if (result.plan) {
        const plan = result.plan;
        if (cell.category === "Replay-dependent") {
            plan.config.replayLimit = 1;
            plan.reason += " · one-context-replay experiment";
            plan.changedDifficulty.push("Context replay limit: one");
        }
        box.append(node("p", plan.reason), button("Practise 10", async () => {
            await put("drillPlans", plan);
            await actions.start(plan.config, plan.customSnapshots, "insight:" + plan.id, plan.questions, plan);
        }));
        const preview = node("details");
        preview.append(node("summary", "Scheduled targets and settings"));
        table(preview, ["Question", "Actual targets", "Task / tempo / repeats"], plan.questions.map((q, i) => {
            const config = { ...plan.config, ...q.presentation };
            return [
                String(i + 1),
                q.targets
                    .map((t) => `${t.chord.symbol}/${t.degree} · MIDI ${t.midi}${t.secondDegree ? " + " + t.secondDegree + " · MIDI " + t.secondMidi : ""}`)
                    .join(" → "),
                `${task(config)} / ${config.bpm} BPM / ${config.repeats}`,
            ];
        }));
        box.append(preview);
    }
    else
        box.append(node("p", result.unsupportedReason));
    box.append(button("Customize", () => actions.customize(cell.rows[0].config, cell.rows[0].session.customSnapshot ?? [])));
    const detail = node("details");
    detail.append(node("summary", "Evidence and exclusions"));
    evidenceTable(detail, cell.rows, actions);
    box.append(detail);
    parent.append(box);
}
function evidenceTable(parent, rows, actions) {
    const details = node("details");
    details.append(node("summary", `Evidence table (${rows.length})`));
    table(details, [
        "Date / session",
        "Actual material",
        "Outcome / source",
        "Exposure",
        "Timing",
        "Review",
    ], [...rows]
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
        a.id.localeCompare(b.id))
        .map((e) => [
        `${e.createdAt} / ${e.sessionId.slice(0, 8)}`,
        e.record.chords
            .map((c, i) => c +
            "/" +
            e.record.targets[i] +
            " = " +
            (e.record.actualNotes?.[i] ?? "reference unavailable") +
            (e.record.actualMidis?.[i] !== undefined
                ? " (MIDI " + e.record.actualMidis[i] + ")"
                : ""))
            .join(" → "),
        `${e.record.grade} / ${e.source} / ${e.grain}`,
        `${e.exposure} / ${e.assistance}`,
        e.version === "historical"
            ? `Legacy recorded response time: ${Number.isFinite(e.record.responseLatency) ? e.record.responseLatency.toFixed(1) + "s" : "unavailable"}`
            : e.record.analytics?.activeMs == null
                ? "Unavailable / interrupted"
                : `${(e.record.analytics.activeMs / 1000).toFixed(1)}s active decision`,
        e.challenge
            ? button("Exact review", () => actions.start({ ...e.config, count: 1 }, e.session.customSnapshot ?? [], "exact-review", [e.challenge]))
            : "Snapshot unavailable",
    ]));
    parent.append(details);
}
async function renderLegacy(host) {
    const routeToken = host.dataset.route;
    const imports = await readAll("imports");
    const data = imports.find((i) => i.id === "historical-v1")?.legacy ??
        legacyData(localStorage);
    const events = await readAll("events");
    if (host.dataset.route !== routeToken)
        return;
    host.append(node("p", "All retained legacy records at import. Undated solved questions are separate from Jazz evidence; abandoned and incorrect submissions were not retained."));
    for (const legacy of data) {
        const section = node("section");
        section.append(node("h3", legacy.title));
        if (legacy.error)
            section.append(node("p", legacy.error + " · Original storage preserved."));
        section.append(node("p", legacy.id === "progression-id"
            ? "Chord exposure rows share a joint progression response. Independent accuracy and confidence are unavailable."
            : `First-try success among retained solved questions: ${rate(legacy.rows.filter((r) => r.attempts === 1).length, legacy.rows.length)}.`));
        table(section, ["Retained material", "Attempts", "Recorded time-to-solve"], legacy.rows.map((r) => [
            String(r.upperDegree ?? r.intervalLabel ?? r.chordDegree ?? "/") +
                " / " +
                String(r.chordQuality ?? "/"),
            String(r.attempts),
            Number.isFinite(r.timeSeconds)
                ? String(r.timeSeconds) + "s"
                : "Unavailable",
        ]));
        table(section, ["Test date", "Title", "Recorded average (settings may differ)"], legacy.tests.map((t) => [
            String(t.datetime ?? "Unknown"),
            String(t.progressionName ?? "Unknown"),
            String(t.avgTimeSeconds ?? "Unavailable") + "s",
        ]));
        const directory = legacy.id === "degree"
            ? "degree-trainer"
            : legacy.id === "interval"
                ? "interval-trainer"
                : legacy.id;
        section.append(link("Configure drill", `../${directory}/`));
        const live = legacySummary(events, legacy.id);
        section.append(node("h3", "New recorded trials"), node("p", `First committed answer, fresh practice: ${rate(live.correct, live.count)}. ${live.unresolved} presented questions without a committed answer; ${live.trials.filter((t) => t.exposure === "exact-review").length} exact-review attempts shown separately. Settings may differ.`));
        table(section, ["Expected", "Selected", "First-answer confusions"], live.confusions.map((c) => [c.expected, c.selected, String(c.count)]));
        table(section, [
            "Date / task",
            "Attempt / exposure",
            "Expected → selected",
            "Result",
            "Active decision time",
            "Practice",
        ], live.trials
            .slice()
            .sort((a, b) => Date.parse(b.committedAt) - Date.parse(a.committedAt))
            .map((trial) => {
            const controls = node("div");
            controls.append(button("Same settings", () => {
                location.href = prepareLegacyLaunch(trial, false);
            }), button("Exact review", () => {
                location.href = prepareLegacyLaunch(trial, true);
            }));
            return [
                trial.committedAt + " / " + trial.task,
                `${trial.ordinal} / ${trial.exposure}`,
                trial.expected.map((i) => Object.values(i).join(" ")).join(" / ") +
                    " → " +
                    trial.selected.map((i) => Object.values(i).join(" ")).join(" / "),
                trial.correct ? "Correct" : "Missed",
                trial.responseActiveMs === null
                    ? "Unavailable / interrupted"
                    : (trial.responseActiveMs / 1000).toFixed(1) + "s",
                controls,
            ];
        }));
        host.append(section);
    }
    host.append(node("h3", "Drone"));
    const activity = events.filter((e) => e.type === "drone_activity_segment");
    const valid = activity.filter((e) => Number.isFinite(e.payload?.activeMs) && e.payload.activeMs >= 0);
    host.append(node("p", valid.length
        ? `${(valid.reduce((n, e) => n + e.payload.activeMs, 0) / 60000).toFixed(1)} minutes of foreground playback across ${valid.length} context segments. Activity only; no graded outcome.`
        : "Practice activity not recorded yet."));
    table(host, ["Date", "Foreground playback", "Context"], valid.map((e) => {
        const context = e.payload.context;
        return [
            e.occurredAt,
            (e.payload.activeMs / 1000).toFixed(1) + "s",
            [context?.event?.quality, ...(context?.chord?.notes ?? [])]
                .filter(Boolean)
                .join(" / ") || "Recorded playback context",
        ];
    }));
}
async function health(host, evidence) {
    const routeToken = host.dataset.route;
    const details = node("details");
    details.className = "insight-health";
    details.append(node("summary", "Data quality and local backup"));
    const imports = await readAll("imports"), metadata = await readAll("metadata");
    if (host.dataset.route !== routeToken)
        return;
    details.append(node("p", `${evidence.length} imported/captured assessments; ${imports.reduce((n, i) => n + (i.quarantined ?? 0), 0)} quarantined. ${evidence.filter((e) => e.assistance === "unknown").length} unknown assistance; ${evidence.filter((e) => e.capabilities.timing).length} standard timing. Last save: ${metadata.find((m) => m.id === "last-save")?.at ?? "Unavailable"}.`), node("p", "Old Jazz history retains 100 sessions; new evidence is not automatically pruned. Legacy import is a one-time snapshot; undated rows have no calendar trend."));
    if (persistenceError)
        details.append(node("p", persistenceError));
    for (const item of imports)
        if (item.sourceError)
            details.append(node("p", `Historical source could not be parsed: ${item.sourceError}. Original bytes retained in the backup.`));
    const validDates = evidence
        .map((e) => Date.parse(e.createdAt))
        .filter((n) => Number.isFinite(n) && n <= Date.now())
        .sort((a, b) => a - b);
    details.append(node("p", `${evidence.filter((e) => !Number.isFinite(Date.parse(e.createdAt)) || Date.parse(e.createdAt) > Date.now()).length} invalid/future dates excluded from calendar views. ${imports.flatMap((i) => i.legacy ?? []).reduce((n, l) => n + l.rows.length, 0)} undated legacy solved rows. Retained date span: ${validDates.length ? new Date(validDates[0]).toISOString() + " to " + new Date(validDates[validDates.length - 1]).toISOString() : "unavailable"}.`));
    details.append(button("Export local evidence", async () => {
        const url = URL.createObjectURL(new Blob([await exportData()], { type: "application/json" }));
        const a = link("Download", url);
        a.download = "jazz-insights.json";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }));
    const upload = node("input");
    upload.type = "file";
    upload.accept = ".json";
    upload.setAttribute("aria-label", "Import Insights backup");
    upload.onchange = async () => {
        try {
            if (upload.files?.[0])
                await importData(await upload.files[0].text());
            location.reload();
        }
        catch (error) {
            details.append(node("p", String(error)));
        }
    };
    details.append(upload);
    details.append(button("Clear Insights evidence", async () => {
        if (confirm("Clear the Insights database and pending analytics only? Original practice history, saved presets and legacy storage remain intact. Export first to keep a backup.")) {
            await clearInsights();
            location.reload();
        }
    }));
    host.append(details);
}
