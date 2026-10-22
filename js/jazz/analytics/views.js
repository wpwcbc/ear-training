import { defaults, loadSessions, } from "../model.js";
import { commandIcon, icon } from "../ui.js";
import { degreeName, qualityName, focusName, localizeLabels, } from "./display.js";
import { renderTrend } from "./charts.js";
import { resolveWindow, inWindow, } from "./windows.js";
import { reconcile, readAll, exportData, importData, previewImport, clearInsights, persistenceError, put, } from "./repository.js";
import { task, hash } from "./types.js";
import { aggregate, components, cells, matchedTrends, markScore, assistedRecovery, } from "./metrics.js";
import { compileDrill, compileDiagnostic, compileSuggestedDiagnostic, compileMatchedBaseline, } from "./drills.js";
import { legacyData } from "./adapters.js";
import { policy, dayKey } from "./policy.js";
import { legacySummary, prepareLegacyLaunch, } from "../../analytics/legacy.js";
import { bassPositions } from "../bass.js";
import { parseChord } from "../theory.js";
import { defaultFocusIndex } from "./focused.js";
import { validateScheduled } from "./focused.js";
import { renderAggregateMatrix } from "./matrix.js";
import { confusionGrids, legacyGrid, renderGrid } from "./grids.js";
import { modeContext, makeCell, comparisonFamily, dataRevision, } from "./hierarchy.js";
import { computeSummary, clearSummaryCache } from "./summary/client.js";
import { summaryPolicy } from "./summary/policy.js";
import { renderInsight, renderTemplate, } from "./summary/templates.js";
const names = {
    m1: "Hear a Chord Degree",
    m2: "Identify a Chord Degree",
    m3: "Same Note, New Chord",
    m4: "Anticipate Next Chord Tone",
    m5: "Follow a Progression",
    m6: "Bebop Phrase Lab",
    m7: "Ear to Bass",
};
let lastRuleDiagnostics = null;
const renderRequests = new WeakMap();
const node = (tag, text) => {
    const n = document.createElement(tag);
    if (text)
        n.textContent = text;
    return n;
};
function presentInspection(panel) {
    const close = panel.querySelector("[data-dismiss]") ??
        panel.querySelector(":scope > button");
    panel.prepend(close);
    panel.setAttribute("aria-modal", "true");
    panel.addEventListener("cancel", (event) => {
        event.preventDefault();
        close.click();
    });
    panel.addEventListener("click", (event) => {
        if (event.target === panel &&
            event.clientX < panel.getBoundingClientRect().left)
            close.click();
    });
    panel.addEventListener("keydown", (event) => {
        if (event.key !== "Tab")
            return;
        const controls = Array.from(panel.querySelectorAll("button,input,select,textarea,a[href],summary,[tabindex='0']")).filter((e) => !e.matches(":disabled,[hidden]") && e.getClientRects().length > 0);
        const first = controls[0], last = controls[controls.length - 1];
        if (document.activeElement === panel ||
            (event.shiftKey
                ? document.activeElement === first
                : document.activeElement === last)) {
            event.preventDefault();
            (event.shiftKey ? last : first)?.focus();
        }
    });
    panel.showModal();
    panel.focus();
}
function link(text, href) {
    const a = node("a", text);
    a.href = href;
    return a;
}
function button(text, action) {
    const b = node("button", text);
    b.type = "button";
    if (text.startsWith("Close "))
        b.dataset.dismiss = "true";
    commandIcon(b);
    if (text.startsWith("Practise"))
        icon(b, "play");
    if (text.startsWith("Close "))
        icon(b, "x", true);
    const failed = (error) => {
        const p = node("p", String(error));
        p.setAttribute("role", "alert");
        b.after(p);
    };
    b.onclick = () => {
        if (b.disabled)
            return;
        try {
            const result = action();
            if (result &&
                typeof result.then === "function") {
                b.disabled = true;
                Promise.resolve(result)
                    .catch(failed)
                    .finally(() => {
                    b.disabled = false;
                });
            }
        }
        catch (error) {
            failed(error);
        }
    };
    return b;
}
function table(parent, headers, rows, id) {
    if (rows.length > 25) {
        const region = node("div");
        if (id)
            region.id = id;
        paginatedTable(region, headers, rows, (r) => r, 25, "Rows");
        parent.append(region);
        return;
    }
    const wrap = node("div");
    wrap.className = "table-scroll";
    wrap.tabIndex = 0;
    wrap.setAttribute("role", "region");
    wrap.setAttribute("aria-label", headers.join(" / "));
    if (id)
        wrap.id = id;
    if (!rows.length) {
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
function retainedDays(rows, timezone, now) {
    return new Set(rows
        .filter((e) => Number.isFinite(Date.parse(e.createdAt)) &&
        Date.parse(e.createdAt) <= now)
        .map((e) => dayKey(e.createdAt, timezone))).size;
}
function metric(parent, label, value) {
    const item = node("div");
    item.append(node("span", label), node("strong", value));
    parent.append(item);
}
function summaryParagraph(text) {
    const paragraph = node("p");
    const zh = text.includes("。");
    const boundary = text.indexOf(zh ? "。" : ". ");
    if (boundary < 0)
        paragraph.textContent = text;
    else {
        const end = boundary + 1;
        const lead = node("strong", text.slice(0, end));
        lead.className = "summary-lead";
        paragraph.append(lead, document.createTextNode(" " + text.slice(end).trim()));
    }
    return paragraph;
}
export async function renderAnalytics(host, route, actions, workspaceMode) {
    const request = (renderRequests.get(host) ?? 0) + 1;
    renderRequests.set(host, request);
    host.dataset.route = route;
    host.replaceChildren(node("p", "Loading local evidence..."));
    let evidence;
    try {
        evidence = await reconcile(loadSessions(localStorage));
    }
    catch (error) {
        host.replaceChildren(node("h2", "Insights"), node("p", "Local evidence unavailable: " +
            String(error) +
            ". Original data preserved."));
        return;
    }
    if (host.dataset.route !== route || renderRequests.get(host) !== request)
        return;
    host.replaceChildren();
    host.classList.add("analytics", "jazz-insights");
    const [path, search = ""] = route.split("?"), params = new URLSearchParams(search);
    let mode = path.split("/")[1] ?? "";
    if (mode === "data" || mode === "settings") {
        host.append(link("Return to Insights", sessionStorage.getItem("insights:return") ?? "#/insights"), node("h2", "Settings · Data & Diagnostics"));
        await health(host, evidence);
        return;
    }
    if (workspaceMode)
        mode = workspaceMode;
    const warnings = [];
    if (mode && mode !== "legacy" && !names[mode]) {
        mode = "";
        warnings.push("Unknown mode; showing Overview.");
    }
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", now = Date.now();
    const nav = node("nav");
    nav.className = "insight-nav";
    nav.setAttribute("aria-label", "Insight sources");
    const overviewLink = link("Overview", "#/insights");
    if (!mode)
        overviewLink.setAttribute("aria-current", "page");
    const exerciseLabel = node("label", "Exercise"), exerciseSelect = node("select");
    exerciseSelect.setAttribute("aria-label", "Insights exercise");
    exerciseSelect.add(new Option("All exercises", ""));
    for (const [id, label] of Object.entries(names))
        exerciseSelect.add(new Option(label + " · " + id.toUpperCase(), id));
    exerciseSelect.add(new Option("Legacy trainers", "legacy"));
    exerciseSelect.value = mode;
    exerciseSelect.onchange = () => {
        const retained = new URLSearchParams();
        for (const key of ["days", "lang"])
            if (params.has(key))
                retained.set(key, params.get(key));
        location.hash =
            "#/insights" +
                (exerciseSelect.value ? "/" + exerciseSelect.value : "") +
                (retained.size ? "?" + retained.toString() : "");
    };
    exerciseLabel.append(exerciseSelect);
    nav.append(overviewLink, exerciseLabel);
    const dataLink = link("Data & Diagnostics", "#/insights/data");
    icon(dataLink, "sliders-horizontal", true);
    nav.append(dataLink);
    host.append(nav, node("h2", mode === "legacy"
        ? "Legacy practice"
        : (names[mode] ?? "What to practise next")));
    if (mode === "legacy") {
        await renderLegacy(host);
        host.append(link("Settings · Data & Diagnostics", "#/insights/data"));
        return;
    }
    const header = node("div"), advanced = node("details"), filters = node("div");
    header.className = "insight-primary";
    advanced.className = "insight-advanced";
    filters.className = "insight-filters";
    advanced.append(node("summary", "Filters"), filters);
    icon(advanced.querySelector("summary"), "sliders-horizontal");
    const change = () => {
        location.hash = "#/" + path + "?" + params.toString();
    };
    let activeAdvanced = 0;
    const filter = (key, label, options, fallback, container = filters) => {
        let value = params.get(key) ?? fallback;
        if (!options.some((o) => o[0] === value)) {
            value = fallback;
            warnings.push("Unsupported " + label + "; using " + fallback + ".");
        }
        if (container === filters && key !== "lang" && value !== fallback)
            activeAdvanced++;
        const l = node("label", label), select = node("select");
        select.setAttribute("aria-label", label);
        options.forEach(([v, t]) => select.add(new Option(t, v)));
        select.value = value;
        select.onchange = () => {
            params.set(key, select.value);
            if (key !== "lang") {
                params.delete("cell");
                params.delete("cellRoot");
                params.delete("missingQuality");
                params.delete("missingDegree");
            }
            change();
        };
        l.append(select);
        container.append(l);
        return value;
    };
    const days = filter("days", "Period", [
        ["28", "Last 28 days"],
        ["7", "Last 7 days"],
        ["all", "All retained"],
    ], "28", header);
    const tasks = {
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
    const subtask = tasks[mode]
        ? filter("task", "Task", tasks[mode].map((t) => [
            t,
            {
                visible: "Chord symbols shown",
                hidden: "Chord quality by ear",
                recognize: "Identify roles",
                produce: "Sing the held note",
                manual: "Manual reveal",
                timed: "Timed prediction",
                "step-one": "Step by step · one target",
                "step-two": "Step by step · two targets",
                "step-line": "Step by step · guide-tone line",
                "continuous-one": "Continuous · one target",
                "continuous-two": "Continuous · two targets",
                "continuous-line": "Continuous · guide-tone line",
                "whole-activity": "Complete phrase activity",
                "stage-sing": "Phrase sing-back",
                "stage-mark": "Target marking",
                "stage-predict": "Phrase prediction",
                "stage-bass": "Phrase bass mapping",
                "stage-vary": "Phrase variation",
                "sing-play": "Sing then map",
                "hear-play": "Listen then map",
                "next-beat": "Map on the next beat",
            }[t] ?? t,
        ]), tasks[mode][0], header)
        : "";
    const exposure = filter("exposure", "Practice", [
        ["fresh", "Fresh practice"],
        ["targeted", "Targeted practice"],
        ["exact-review", "Exact review"],
        ["all", "All practice"],
    ], "fresh");
    const assistance = filter("assistance", "Assistance", [
        ["none", "Known unassisted"],
        ["reference", "Reference-assisted"],
        ["unknown", "Unknown assistance"],
        ["all", "All assistance"],
    ], "none");
    const source = filter("source", "Assessment", [
        ["all", "Separate sources"],
        ["automatic", "Recognition"],
        ["self", "Self-assessed"],
        ["visual", "Visual mapping"],
    ], "all");
    const version = filter("version", "Data version", [
        ["all", "All versions"],
        ["standard", "New capture"],
        ["historical", "Historical v1"],
    ], "all");
    const locale = filter("lang", "Summary language", [
        ["en", "English"],
        ["zh-Hant", "繁體中文"],
    ], navigator.language.startsWith("zh") ? "zh-Hant" : "en");
    host.lang = locale;
    const matrixMetric = filter("metric", "Context metric", [
        ["outcome", "Outcomes"],
        ["sample", "Question / exposure counts"],
        ["time", "Median active time"],
    ], "outcome");
    const window = resolveWindow(now, timezone, days === "all" ? null : Number(days));
    const start = window.startInclusive;
    const scoped = evidence.filter((e) => (!mode || e.mode === mode) && (!subtask || e.subtask === subtask));
    let rows = scoped.filter((e) => (exposure === "all" || e.exposure === exposure) &&
        (assistance === "all" || e.assistance === assistance) &&
        (source === "all" || e.source === source) &&
        (version === "all" || e.version === version) &&
        (inWindow(e.createdAt, window) ||
            (days === "all" && !Number.isFinite(Date.parse(e.createdAt)))));
    const contextFilters = {};
    const keys = [
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
        keys.push(["fretNames", "Fret note names"], ["bassString", "Required string"]);
    if (mode === "m6")
        keys.push(["variation", "Phrase variation"], ["transpose", "Transpose"]);
    for (const [key, label] of mode ? keys : []) {
        const values = [
            ...new Set(scoped.map((e) => String(e.config[key] ?? "unknown"))),
        ].sort();
        const chosen = filter("context-" + key, label, [["all", "All"], ...values.map((v) => [v, v])], "all");
        if (chosen !== "all") {
            contextFilters[key] = [chosen];
            rows = rows.filter((e) => String(e.config[key] ?? "unknown") === chosen);
        }
    }
    for (const [key, label, values] of mode
        ? [
            [
                "root",
                "Presented root",
                scoped.flatMap((e) => e.record.chords.map((c) => parseChord(c).root)),
            ],
            ["quality", "Presented chord", scoped.flatMap((e) => e.record.chords)],
            ["degree", "Presented degree", scoped.flatMap((e) => e.record.targets)],
        ]
        : []) {
        const chosen = filter(key, label, [
            ["all", "All"],
            ...[...new Set(values)].sort().map((v) => [v, v]),
        ], "all");
        if (chosen !== "all") {
            contextFilters[key] = [chosen];
            rows = rows.filter((e) => key === "root"
                ? e.record.chords.some((c) => parseChord(c).root === chosen)
                : key === "quality"
                    ? e.record.chords.includes(chosen)
                    : e.record.targets.includes(chosen));
        }
    }
    const allowedParams = new Set([
        "days",
        "task",
        "exposure",
        "assistance",
        "source",
        "version",
        "lang",
        "metric",
        "root",
        "quality",
        "degree",
        "cell",
        "cellRoot",
        "level",
        "focus",
        "missingQuality",
        "missingDegree",
        ...keys.map(([k]) => "context-" + k),
    ]);
    params.forEach((_, key) => {
        if (!allowedParams.has(key))
            warnings.push("Unknown filter " + key + " ignored.");
    });
    if (params.has("level") &&
        ![
            "degree",
            "quality-degree",
            "root-quality-degree",
            "mode-specific",
        ].includes(params.get("level")))
        warnings.push("Unsupported aggregation level; using the selected cell's actual level.");
    filters.append(link("Reset filters", "#/" + path));
    advanced.querySelector("summary").textContent = activeAdvanced
        ? "Filters (" + activeAdvanced + ")"
        : "Filters";
    const chips = node("p", exposure +
        " · " +
        (assistance === "none" ? "Known unassisted" : assistance) +
        " · " +
        (days === "all" ? "All retained" : days + " days") +
        (params.get("root") && params.get("root") !== "all"
            ? " · Root: " + params.get("root")
            : ""));
    chips.className = "insight-scope";
    chips.append(document.createTextNode(" · " +
        (start
            ? dayKey(start, timezone) +
                " – " +
                dayKey(new Date(Date.parse(window.endExclusive) - 1).toISOString(), timezone)
            : "Valid retained dates") +
        " · " +
        timezone +
        (new Set(rows.map((e) => comparisonFamily(e))).size > 1
            ? " · Mixed settings"
            : "")));
    header.append(advanced);
    host.append(header, chips);
    if (warnings.length)
        host.append(node("p", warnings.join(" ")));
    const methodology = node("details");
    methodology.className = "insight-methodology";
    methodology.append(node("summary", "About these results"), node("p", timezone + " · retained browser data · " + summaryPolicy.version));
    const query = {
        mode,
        subtask,
        source,
        metricId: matrixMetric,
        startInclusive: start,
        endExclusive: window.endExclusive,
        timezone,
        exposure,
        assistance,
        dataVersions: version === "all" ? ["standard", "historical"] : [version],
        contextFilters,
    };
    // The revision covers all retained authority, including prior-period comparison evidence.
    const progress = node("p", "Preparing local summary and evidence…");
    progress.setAttribute("role", "status");
    host.append(progress);
    let model;
    try {
        model = await computeSummary(rows, query, now, evidence);
    }
    catch (error) {
        progress.textContent = String(error);
        return;
    }
    if (host.dataset.route !== route || renderRequests.get(host) !== request)
        return;
    progress.remove();
    const revision = model.revision;
    lastRuleDiagnostics = {
        query: model.query,
        revision: model.revision,
        candidates: model.candidates.map((i) => ({
            id: i.id,
            category: i.category,
            certainty: i.certainty,
            params: i.params,
            refs: i.evidenceRefIds,
            suppressedBy: i.suppressedBy,
            reason: i.suppressionReason,
        })),
        comparisons: model.comparisons,
    };
    const announce = node("p", rows.length + " selected assessments");
    announce.className = "sr-only";
    announce.setAttribute("role", "status");
    host.append(announce);
    const openEvidence = async (refId, related = [], invoker) => {
        const origin = invoker ?? document.activeElement;
        const current = await readAll("assessments");
        if (host.dataset.route !== route || renderRequests.get(host) !== request)
            return;
        const ref = model.refs.get(refId), panel = node("dialog");
        panel.className = "insight-evidence-panel";
        host.querySelectorAll(".insight-evidence-panel").forEach((p) => p.remove());
        panel.setAttribute("role", "dialog");
        panel.setAttribute("aria-label", "Evidence reference");
        panel.tabIndex = -1;
        panel.append(node("h3", "Evidence reference"));
        for (const id of related.filter((id) => id !== refId))
            panel.append(button("View comparison sample", () => openEvidence(id, [refId], origin)));
        panel.append(button("Close evidence", () => {
            panel.remove();
            origin?.focus();
        }));
        if (!ref ||
            ref.dataRevision !== revision ||
            dataRevision(current) !== revision) {
            panel.append(node("p", "Evidence changed; refresh summary."));
        }
        else {
            const cited = current.filter((e) => ref.assessmentIds.includes(e.id));
            if (cited.length !== ref.assessmentIds.length)
                panel.append(node("p", "Evidence changed; refresh summary."));
            else {
                panel.append(node("p", ref.id +
                    " · " +
                    ref.metricId +
                    " · " +
                    ref.definitionVersion +
                    " · " +
                    ref.policyVersion), node("p", ref.assessmentIds.length +
                    " assessments → " +
                    ref.diagnosticQuestionIds.length +
                    " diagnostic questions. Exclusions below are exclusive within each stage."));
                panel.append(node("p", "Scope: " +
                    ref.querySnapshot.mode.toUpperCase() +
                    " / " +
                    ref.querySnapshot.subtask +
                    " · " +
                    ref.querySnapshot.source +
                    " · " +
                    ref.querySnapshot.timezone));
                table(panel, ["Exclusion reason", "Count"], Object.entries(ref.exclusions).map(([k, v]) => [k, String(v)]));
                evidenceTable(panel, cited, actions, true);
                panel.append(link("Data & Diagnostics", "#/insights/data"));
            }
        }
        const close = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                panel.remove();
                origin?.focus();
            }
        };
        panel.addEventListener("keydown", close);
        host.append(panel);
        presentInspection(panel);
        panel.scrollIntoView({ block: "nearest" });
    };
    const summary = node("section");
    summary.className = "smart-summary";
    summary.setAttribute("aria-label", "Smart Insights Summary");
    summary.append(node("h3", locale === "zh-Hant" ? "練習重點" : "What stands out"), node("p", locale === "zh-Hant"
        ? "根據保留的練習結果，以固定規則整理。"
        : "Scripted from your retained practice results."));
    if (rows.length) {
        const sources = new Set(rows.map((e) => e.source));
        summary.append(node("p", sources.size > 1
            ? "Separate assessment sources"
            : sources.has("self")
                ? locale === "zh-Hant"
                    ? "自評唱奏"
                    : "Self-assessed production"
                : sources.has("visual")
                    ? "Visual mapping, not physical playing"
                    : "Submitted recognition answers"));
        summary.lastElementChild.classList.add("insight-source");
    }
    if (!rows.length) {
        summary.append(node("p", scoped.length
            ? scoped.length +
                " retained assessments are outside the active selection. This is not zero accuracy."
            : "No recorded outcomes for this task."));
        summary.append(scoped.length
            ? link("Reset filters", "#/" + path)
            : button("Configure diagnostic set", () => actions.customize({ ...defaults, mode: (mode || "m1"), count: 10 }, [])));
    }
    else {
        if (mode === "m1") {
            const retainedSelf = rows.filter((e) => e.source === "self");
            const stats = aggregate(retainedSelf, timezone, now);
            const rated = stats.ratings.correct + stats.ratings.close + stats.ratings.missed;
            const days = retainedDays(retainedSelf, timezone, now);
            if (rated)
                summary.append(node("p", locale === "zh-Hant"
                    ? `${rated < 5 ? `你有 ${rated} 次已評分答案可供查看。` : stats.ratings.correct / rated >= 0.8 ? "你保留的 M1 評分大多是正確。" : "你保留的 M1 評分包含以下結果。"}${rated} 次已評分答案中，你自評 ${stats.ratings.correct} 次正確、${stats.ratings.close} 次接近、${stats.ratings.missed} 次未達標。這些是 ${days} 個日曆日、所選設定下的自評，不能視為量度的歌唱準確率或穩定表現。`
                    : `${rated < 5 ? `You have ${rated} rated answers to review.` : stats.ratings.correct / rated >= 0.8 ? "Your retained M1 ratings are mostly correct." : "Your retained M1 ratings include the following outcomes."} You rated ${stats.ratings.correct} of ${rated} answers correct, ${stats.ratings.close} close and ${stats.ratings.missed} missed. These are self-ratings across ${days} calendar days under the selected settings; they do not establish measured singing accuracy or a stable pattern.`));
            if (rated) {
                const citation = button(locale === "zh-Hant" ? "查看評分對應" : "View rating reconciliation", () => {
                    const ledger = host.querySelector(".insight-reconciliation");
                    if (ledger) {
                        ledger.open = true;
                        ledger.scrollIntoView({ block: "nearest" });
                        ledger.querySelector("summary")?.focus();
                    }
                });
                citation.className = "insight-citation";
                summary.lastElementChild.append(document.createTextNode(" "), citation);
            }
        }
        for (const [index, insight] of model.statements
            .slice(0, mode === "m1" ? 2 : 3)
            .entries()) {
            const statement = node("div");
            statement.className = "insight-statement";
            statement.dataset.candidateId = insight.id;
            statement.dataset.actionId = insight.actionId ?? insight.id;
            statement.append(summaryParagraph(renderInsight(insight, locale) ?? "Evidence unavailable."));
            const citation = button((locale === "zh-Hant" ? "查看證據" : "View Evidence") +
                " [E" +
                (index + 1) +
                "]", () => openEvidence(insight.evidenceRefIds[0], insight.evidenceRefIds));
            citation.classList.add("insight-citation");
            statement.append(citation);
            summary.append(statement);
        }
    }
    const decision = node("section");
    decision.className = "insight-decision";
    decision.setAttribute("aria-label", "Practice summary and next action");
    decision.append(summary);
    const queue = node("section");
    queue.className = "insight-focus-queue";
    queue.append(node("h3", locale === "zh-Hant" ? "下一步練習" : "Practise next"));
    const headings = {
        supported: "Supported priorities",
        tentative: "Worth checking",
        coverage: "Collect more evidence",
        descriptive: "Collect more evidence",
    };
    const moreActions = node("details");
    moreActions.className = "insight-more-actions";
    moreActions.append(node("summary", "More practice options"));
    for (const insight of workspaceMode
        ? model.recommendations.slice(0, 1)
        : model.recommendations) {
        const c = model.cells.find((c) => c.id === insight.cellId);
        if (!c)
            continue;
        const wrapper = node("div");
        wrapper.className = "insight-recommendation";
        wrapper.dataset.actionId = insight.id;
        wrapper.dataset.certainty = insight.certainty;
        wrapper.append(node("h4", headings[insight.certainty]));
        const sampleRows = c.sample.length
            ? [...new Map(c.sample.map((o) => [o.row.id, o.row])).values()]
            : c.rows;
        const cell = {
            id: c.id,
            label: c.label,
            quality: c.quality,
            degree: c.degree,
            rows: sampleRows,
            category: headings[insight.certainty],
            diagnosticStats: {
                correct: c.numerator ?? 0,
                eligibleCount: c.denominator ?? 0,
                sessions: c.sessions,
                days: c.localDays,
                label: c.reliability,
            },
            metricLabel: c.metricId,
            focus: insight.category === "confusion"
                ? {
                    component: insight.params.component,
                    selected: String(insight.params.selected),
                }
                : c.mode === "m3" && c.subtask === "recognize"
                    ? { targetIndex: Math.max(1, c.sample[0]?.index ?? 1) }
                    : undefined,
        };
        if (insight.category === "coverage" && c.mode !== "m1") {
            const card = node("article");
            card.className = "insight-focus";
            card.append(node("h3", c.mode.toUpperCase() + " · " + c.label), node("p", c.reliability +
                " · " +
                (c.independentQuestionCount ?? "Unknown") +
                " independent questions"));
            const plan = compileDiagnostic(c.rows[0].config, route, c.rows);
            if (plan) {
                const planDetail = node("details");
                planDetail.append(node("summary", "Practice plan"), node("p", plan.reason));
                card.append(button("Practise 10", () => launchPlan(plan, route, actions)), planDetail);
            }
            else
                card.append(button("Customize", () => actions.customize(c.rows[0].config, c.rows[0].session.customSnapshot ?? [])));
            card.append(button("View Evidence", () => openEvidence(c.evidenceRefId)));
            wrapper.append(card);
        }
        else {
            focus(wrapper, cell, route, actions, timezone, true, suggestedOptions(cell));
            wrapper
                .querySelector("article")
                ?.append(button("View Evidence", () => openEvidence(c.evidenceRefId)));
        }
        const card = wrapper.querySelector("article");
        card
            ?.querySelectorAll(":scope > details")
            .forEach((detail) => card.append(detail));
        if (queue.querySelector(".insight-recommendation"))
            moreActions.append(wrapper);
        else
            queue.append(wrapper);
    }
    if (moreActions.children.length > 1)
        queue.append(moreActions);
    const primaryStart = queue.querySelector(".suggested-start");
    if (primaryStart) {
        const strip = node("div");
        strip.className = "diagnostic-strip";
        strip.append(node("span", locale === "zh-Hant"
            ? "建議診斷 · 7 題焦點＋3 題對照"
            : "Suggested Diagnostic · 7 focus + 3 contrast"), button(primaryStart.textContent, () => queue
            .querySelector(":scope > .insight-recommendation .suggested-start")
            ?.click()));
        summary.append(strip);
    }
    host.append(decision);
    function suggestedOptions(cell, local = false) {
        const n = cell.diagnosticStats?.eligibleCount ?? 0;
        const k = cell.diagnosticStats?.correct ?? 0;
        const peer = model.cells
            .filter((c) => !c.stratum &&
            c.level === "quality-degree" &&
            c.mode === "m1" &&
            !c.stale &&
            c.contextState !== "unknown" &&
            c.independentQuestionCount !== null &&
            c.source === cell.rows[0]?.source &&
            c.subtask === cell.rows[0]?.subtask &&
            c.grain === cell.rows[0]?.grain &&
            c.quality === cell.quality &&
            c.degree !== cell.degree &&
            (c.denominator ?? 0) >= 10 &&
            n >= 10 &&
            Math.abs(c.numerator / c.denominator - k / n) >= 0.1)
            .sort((a, b) => b.denominator - a.denominator || (a.id < b.id ? -1 : 1))[0];
        const root = (local ? params.get("cellRoot") : null) ?? params.get("root");
        return {
            revision,
            contrast: peer?.degree,
            roots: root && root !== "all" ? [root] : undefined,
            locale,
            evidenceRefIds: [
                model.cells.find((c) => c.id === cell.id)?.evidenceRefId,
                peer?.evidenceRefId,
            ].filter((id) => !!id),
        };
    }
    if (!mode) {
        host.append(node("h3", "Mode status"));
        const grid = node("div");
        grid.className = "insight-mode-grid";
        for (const [id, title] of Object.entries(names)) {
            const group = rows.filter((e) => e.mode === id), status = node("article");
            status.append(node("h4", id.toUpperCase() + " · " + title));
            for (const s of ["self", "automatic", "visual"]) {
                const r = group.filter((e) => e.source === s);
                if (r.length)
                    status.append(node("p", s +
                        ": " +
                        aggregate(r, timezone, now).eligibleCount +
                        " eligible questions · " +
                        r.length +
                        " assessments"));
            }
            if (!group.length)
                status.append(node("p", "No recorded outcomes"));
            status.append(link("Details", "#/insights/" + id));
            grid.append(status);
        }
        host.append(grid, node("h3", "Explore evidence"), link("Legacy trainers and Drone", "#/insights/legacy"));
        const changes = model.statements
            .filter((i) => i.category === "comparable-trend")
            .slice(0, 2);
        for (const i of changes)
            host.append(button(i.mode.toUpperCase() + " · Comparable change", () => openEvidence(i.evidenceRefIds[0])));
        const available = Object.keys(names).filter((id) => rows.some((e) => e.mode === id));
        if (available.length) {
            const recent = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))[0]?.mode;
            const retainedFocus = params.get("focus") ?? sessionStorage.getItem("insights:focused-mode");
            const focused = available.includes(retainedFocus ?? "")
                ? retainedFocus
                : (model.recommendations[0]?.mode ?? recent ?? available[0]);
            sessionStorage.setItem("insights:focused-mode", focused);
            host.append(link("Open " + names[focused], "#/insights/" + focused), queue);
        }
        else
            host.append(button("Start a diagnostic set", () => actions.customize({ ...defaults, count: 10 }, [])));
    }
    else if (rows.length) {
        methodology.append(node("p", mode === "m2" || (mode === "m3" && subtask === "recognize")
            ? "Recognition measures submitted choices, not singing or instrument performance."
            : "Production is self-assessed. Reference notes are generated targets, not measured singing or playing."));
        for (const s of ["self", "automatic", "visual"]) {
            const group = rows.filter((e) => e.source === s);
            if (!group.length)
                continue;
            const stats = aggregate(group, timezone, now), strip = node("div");
            strip.className = "insight-kpis";
            metric(strip, s === "self"
                ? "Retained self-ratings: correct / close / missed"
                : s === "visual"
                    ? "Visual mapping: exact MIDI"
                    : "Retained exact answers", s === "self"
                ? locale === "zh-Hant"
                    ? `${stats.ratings.correct} 正確 · ${stats.ratings.close} 接近 · ${stats.ratings.missed} 未達標`
                    : stats.ratings.correct +
                        " correct · " +
                        stats.ratings.close +
                        " close · " +
                        stats.ratings.missed +
                        " missed"
                : rate(stats.ratings.correct, stats.submitted));
            metric(strip, "Independent fresh questions", group.some((e) => e.questionId && e.capabilities.identity)
                ? new Intl.NumberFormat(locale).format(stats.eligibleCount)
                : locale === "zh-Hant"
                    ? "無法確定"
                    : "Unavailable");
            metric(strip, "Dated local days", new Intl.NumberFormat(locale).format(retainedDays(group, timezone, now)));
            if (stats.median !== null)
                metric(strip, mode === "m6"
                    ? "Stage active-time median"
                    : "Recorded response / readiness median", (stats.median / 1000).toFixed(1) + "s · valid n=" + stats.timingCount);
            host.append(strip);
            host.append(node("p", locale === "zh-Hant"
                ? `保留 ${group.length} 筆評分紀錄，其中 ${stats.ratings.correct + stats.ratings.close + stats.ratings.missed} 次已評分結果。下方診斷樣本另行按條件選取。`
                : `${group.length} retained assessments · ${stats.ratings.correct + stats.ratings.close + stats.ratings.missed} rated outcomes. The diagnostic sample is selected separately below.`));
        }
        const ledger = node("details");
        ledger.className = "insight-reconciliation";
        ledger.append(node("summary", "How these counts reconcile"));
        const counts = model.reconciliation;
        ledger.append(node("p", counts.retained +
            " retained rows → " +
            counts.normalized +
            " normalized assessments → " +
            counts.nonSkipped +
            " non-skipped ratings → " +
            counts.eligible +
            " eligible observations → " +
            (counts.diagnostic ?? "unknown") +
            " independent diagnostic questions at their task/source grain."));
        table(ledger, ["Exclusive exclusion stage", "Count", "Assessment IDs"], Object.entries(counts.exclusions).map(([k, v]) => [
            k,
            String(v),
            (counts.excludedIds[k] ?? []).join(", "),
        ]));
        const members = node("details");
        members.append(node("summary", "Diagnostic representative IDs"), node("p", counts.diagnosticIds.join(", ")));
        ledger.append(members);
        host.append(ledger, node("h3", locale === "zh-Hant"
            ? "探索和弦品質 × 音級"
            : "Explore quality × degree"));
        const workspace = node("div");
        workspace.className = "insight-workspace";
        const matrixHost = node("section");
        matrixHost.id = "skill-stats";
        renderAggregateMatrix(matrixHost, model.cells, matrixMetric, (cell) => {
            params.set("cell", cell.id);
            params.set("level", cell.level);
            params.delete("cellRoot");
            params.delete("missingQuality");
            params.delete("missingDegree");
            change();
        }, {
            selected: params.get("cell") ?? undefined,
            locale,
            missing: (quality, degree) => {
                params.delete("cell");
                params.set("missingQuality", quality);
                params.set("missingDegree", degree);
                change();
            },
        });
        workspace.append(matrixHost);
        host.append(workspace);
        const selected = model.cells.find((c) => c.id === params.get("cell"));
        if (selected) {
            const localRoot = params.get("cellRoot"), observations = selected.observations.filter((o) => !localRoot || localRoot === "all" || o.root === localRoot);
            const local = observations.length && localRoot && localRoot !== "all"
                ? makeCell(observations, selected.level, selected.id + ":local:" + localRoot, {
                    ...query,
                    contextFilters: { ...query.contextFilters, root: [localRoot] },
                }, revision, now)
                : null;
            if (local)
                model.refs.set(local.ref.id, local.ref);
            const viewed = local?.cell ?? selected;
            const panel = node("section");
            panel.id = "selected-cell";
            panel.className = "insight-cell-detail";
            panel.setAttribute("role", "region");
            panel.setAttribute("aria-label", "Cell details: " + selected.label);
            panel.tabIndex = -1;
            panel.append(node("h3", mode.toUpperCase() + " → " + focusName(selected.label, locale)), button("Close cell", () => {
                const id = selected.id;
                params.delete("cell");
                params.delete("level");
                params.delete("cellRoot");
                sessionStorage.setItem("insights:focus", id);
                change();
            }));
            panel.append(node("p", (viewed.source === "self"
                ? "Self-rated correct: "
                : "Recorded correct: ") +
                (viewed.independentQuestionCount === null
                    ? "Identity unknown"
                    : viewed.denominator === null
                        ? "Not applicable at this grain"
                        : rate(viewed.numerator ?? 0, viewed.denominator)) +
                (viewed.independentQuestionCount === null
                    ? " · Retained ratings are available in Evidence; no diagnostic rate is reported."
                    : " · " +
                        viewed.selfRatings.correct +
                        " correct / " +
                        viewed.selfRatings.close +
                        " close / " +
                        viewed.selfRatings.missed +
                        " missed")), node("p", local
                ? "Detail scope: root " +
                    localRoot +
                    " only; page matrix and summary unchanged."
                : "Detail scope: all observed roots"), node("p", viewed.grain +
                " · " +
                (days === "all" ? "All retained" : days + " days") +
                " · " +
                timezone), node("p", viewed.reliability +
                " · " +
                viewed.contextState +
                " · " +
                viewed.rows.length +
                " assessments · " +
                (viewed.independentQuestionCount ?? "Unknown") +
                " independent questions · " +
                viewed.sessions +
                " sessions / " +
                viewed.localDays +
                " days"));
            const gates = node("details");
            panel.append(node("p", `${viewed.rows.length} retained assessments · ${viewed.independentQuestionCount ?? "unavailable"} known independent questions · ${viewed.rows.filter((e) => !e.questionId || !e.capabilities.identity).length} identity-unknown assessments excluded.`));
            gates.append(node("summary", "Evidence gates"));
            table(gates, ["Gate", "Observed / required"], [
                [
                    "Diagnostic questions",
                    (viewed.denominator ?? "N/A") + " / " + policy.minimum,
                ],
                ["Sessions", viewed.sessions + " / " + policy.sessions],
                ["Local days", viewed.localDays + " / " + policy.daysMinimum],
                [
                    "Wilson 95% width",
                    viewed.wilson95
                        ? ((viewed.wilson95[1] - viewed.wilson95[0]) * 100).toFixed(1) +
                            " pp / ≤ " +
                            policy.width * 100 +
                            " pp"
                        : "Unavailable",
                ],
                ["Generalization", viewed.generalization],
                ["Settings", viewed.contextState],
            ]);
            viewed.capabilityReasons.forEach((r) => gates.append(node("p", r)));
            panel.append(gates);
            if (selected.qualityGuard)
                table(panel, [
                    "Practised quality",
                    "Correct / diagnostic questions",
                    "Supported stratum",
                ], selected.qualityGuard.qualities.map((q) => [
                    q.quality,
                    q.k + "/" + q.n,
                    q.supported ? "Yes" : "No",
                ]));
            panel.append(button("View Evidence", () => openEvidence(viewed.evidenceRefId)));
            table(panel, ["Observed root", "Correct / n", "Sessions / days"], selected.roots.map((r) => {
                const built = makeCell(selected.observations.filter((o) => o.root === r.root), selected.level, selected.id + ":detail:" + r.root, query, revision, now).cell;
                return [
                    r.root,
                    built.independentQuestionCount === null
                        ? "Identity unknown"
                        : built.denominator === null
                            ? "Coverage only"
                            : built.numerator + "/" + built.denominator,
                    built.sessions + " / " + built.localDays,
                ];
            }));
            const rootLabel = node("label", "Root drilldown"), root = node("select");
            root.setAttribute("aria-label", "Root drilldown");
            root.add(new Option("All observed roots", "all"));
            selected.roots.forEach((r) => root.add(new Option(r.root, r.root)));
            root.value = params.get("cellRoot") ?? "all";
            if (!root.value)
                root.value = "all";
            root.onchange = () => {
                params.set("cellRoot", root.value);
                change();
            };
            rootLabel.append(root);
            panel.append(rootLabel);
            panel.append(button("Apply root to page", () => {
                if (root.value === "all")
                    params.delete("root");
                else
                    params.set("root", root.value);
                params.delete("cell");
                params.delete("cellRoot");
                change();
            }));
            const sessions = node("details");
            sessions.append(node("summary", "Contributing sessions and settings"));
            const sessionGroups = new Map();
            viewed.rows.forEach((e) => {
                const list = sessionGroups.get(e.sessionId) ?? [];
                list.push(e);
                sessionGroups.set(e.sessionId, list);
            });
            table(sessions, ["Session", "Assessments", "Settings"], [...sessionGroups].map(([id, group]) => [
                id,
                String(group.length),
                group[0].config.bpm +
                    " BPM · " +
                    group[0].config.context +
                    " · roots " +
                    group[0].config.roots +
                    " · " +
                    group[0].assistance,
            ]));
            panel.append(sessions);
            const subset = selected.rows.filter((e) => root.value === "all" ||
                e.record.chords.some((c) => parseChord(c).root === root.value));
            const exact = cells(subset);
            if (mode === "m1" && selected.quality && selected.degree) {
                const cell = {
                    id: selected.id,
                    label: selected.label,
                    quality: selected.quality,
                    degree: selected.degree,
                    rows: subset,
                    diagnosticStats: {
                        correct: viewed.numerator ?? 0,
                        eligibleCount: viewed.denominator ?? 0,
                        sessions: viewed.sessions,
                        days: viewed.localDays,
                        label: viewed.reliability,
                    },
                };
                focus(panel, cell, route, actions, timezone, false, suggestedOptions(cell, true));
            }
            if (selected.independentQuestionCount !== null)
                paginatedTable(panel, [
                    "Exact context",
                    "Outcome counts",
                    "Independent questions",
                    "Action",
                ], exact, (cell) => {
                    const s = aggregate(cell.rows, timezone, now);
                    return [
                        cell.label,
                        s.ratings.correct +
                            " correct / " +
                            s.ratings.close +
                            " close / " +
                            s.ratings.missed +
                            " missed",
                        String(s.eligibleCount),
                        button("Inspect", () => {
                            const region = node("section");
                            focus(region, cell, route, actions, timezone, false, suggestedOptions(cell));
                            panel.append(region);
                        }),
                    ];
                }, 12, "Exact contexts");
            panel.addEventListener("keydown", (e) => {
                if (e.key === "Escape") {
                    e.preventDefault();
                    params.delete("cell");
                    params.delete("cellRoot");
                    sessionStorage.setItem("insights:focus", selected.id);
                    change();
                }
            });
            workspace.append(panel);
            panel.focus({ preventScroll: true });
        }
        else if (params.has("cell"))
            host.append(node("p", "Selected cell is unavailable after the evidence or filters changed. Select a matrix cell again."));
        if (!selected) {
            const panel = node("section");
            panel.className = "insight-cell-detail insight-cell-empty";
            const quality = params.get("missingQuality"), degree = params.get("missingDegree");
            panel.append(node("h3", quality && degree ? quality + " / " + degree : "Cell details"), node("p", quality && degree
                ? "No eligible diagnostic observations in this selection. This is missing coverage, not zero accuracy."
                : "Select an observed context."));
            if (quality && degree)
                panel.append(button("Customize diagnostic set", () => actions.customize({
                    ...defaults,
                    mode: mode,
                    quality: quality,
                    qualityPool: [quality],
                    degree,
                    degreePool: [degree],
                    count: 10,
                }, [])));
            if (quality && degree && mode === "m1")
                focus(panel, {
                    id: "coverage",
                    label: quality + " · " + degree,
                    quality,
                    degree,
                    rows: [],
                }, route, actions, timezone, false, {
                    revision,
                    locale,
                    roots: params.get("root") ? [params.get("root")] : undefined,
                });
            workspace.append(panel);
        }
        if (model.recommendations.length)
            host.append(queue);
        if (mode === "m2" || (mode === "m3" && subtask === "recognize")) {
            const detail = node("details");
            detail.append(node("summary", "Recognition components and confusions"));
            const c = components(rows);
            const selectedQuestions = new Set(rows.map((e) => e.questionId));
            const recovery = assistedRecovery(evidence.filter((e) => e.mode === mode &&
                e.subtask === subtask &&
                selectedQuestions.has(e.questionId)));
            if (recovery.eligibleCount)
                detail.append(node("p", "Reference-assisted recovery: " +
                    rate(recovery.recovered, recovery.eligibleCount) +
                    ". Separate from first answers."));
            table(detail, ["Component", "Descriptive answer items"], [
                ["Degree", rate(c.degree, c.degreeN)],
                ["Quality (hidden chords)", rate(c.quality, c.qualityN)],
                ["Degree when quality correct", rate(c.conditional, c.conditionalN)],
            ]);
            table(detail, ["Component", "Expected", "Selected", "Expected-row rate"], c.confusion.map((c) => [
                c.component,
                c.expected,
                c.selected,
                rate(c.count, c.denominator),
            ]), "confusions");
            const matrices = node("div");
            matrices.id = "confusion-matrices";
            for (const grid of confusionGrids(rows, now))
                renderGrid(matrices, grid, (cell) => {
                    const region = node("dialog");
                    const origin = document.activeElement;
                    const close = () => {
                        region.remove();
                        origin?.focus();
                    };
                    region.className = "insight-evidence-panel";
                    region.setAttribute("aria-label", "Confusion evidence: " + cell.row + " to " + cell.column);
                    region.tabIndex = -1;
                    region.append(button("Close evidence", close));
                    region.addEventListener("keydown", (e) => {
                        if (e.key === "Escape") {
                            e.preventDefault();
                            close();
                        }
                    });
                    region.append(node("h4", cell.row +
                        " → " +
                        cell.column +
                        " · " +
                        cell.k +
                        "/" +
                        cell.n +
                        " expected-row questions"));
                    evidenceTable(region, cell.evidence, actions, true);
                    matrices.append(region);
                    presentInspection(region);
                    region.scrollIntoView({ block: "nearest" });
                });
            detail.append(matrices);
            host.append(detail);
        }
        if (mode === "m6") {
            const detail = node("details");
            detail.append(node("summary", "Phrase stages"));
            table(detail, ["Phrase", "Selected targets", "Precision", "Recall"], rows
                .filter((e) => e.capabilities.marks)
                .map((e) => {
                const m = e.record.analytics.marks, s = markScore(m.expected, m.selected);
                return [
                    e.config.phraseId,
                    String(s.hits),
                    s.precision === null ? "Not recorded" : rate(s.hits, s.selected),
                    rate(s.hits, s.expected),
                ];
            }));
            if (!rows.some((e) => e.grain === "phrase-stage"))
                detail.append(node("p", "Whole-activity ratings cannot locate stage difficulty."));
            host.append(detail);
        }
        if (mode === "m7") {
            host.append(node("h3", "Visual mapping"));
            table(host, ["Position", "Pitch class", "Exact MIDI"], rows
                .filter((e) => e.source === "visual" && e.capabilities.position)
                .map((e) => {
                const p = e.record.analytics.position;
                return [
                    p.string + " string / fret " + p.fret,
                    p.midi % 12 === p.expectedMidi % 12 ? "Match" : "Mismatch",
                    p.midi === p.expectedMidi ? "Match" : "Mismatch",
                ];
            }));
        }
        if (mode === "m4") {
            const detail = node("details");
            detail.append(node("summary", "Transition readiness"));
            table(detail, ["Source → destination", "Ready before reference"], rows.map((e) => [
                modeContext(e),
                e.record.analytics?.ready
                    ? "Declared"
                    : e.version === "historical"
                        ? "Not recorded"
                        : "Not confirmed",
            ]));
            host.append(detail);
        }
        const reported = rows.filter((e) => e.record.analytics?.difficultyTags?.length ||
            e.record.analytics?.troubleSteps?.length);
        if (reported.length) {
            const detail = node("details");
            detail.append(node("summary", "User-reported difficulty"));
            paginatedTable(detail, ["Context", "You reported"], reported, (e) => [
                modeContext(e),
                [
                    ...(e.record.analytics?.difficultyTags ?? []),
                    ...(e.record.analytics?.troubleSteps ?? []).map((n) => "Trouble position " + n),
                ].join(", "),
            ], 12, "Reported observations");
            host.append(detail);
        }
        if (mode === "m5" && subtask.startsWith("continuous")) {
            const events = await readAll("events");
            if (host.dataset.route !== route)
                return;
            const starts = events.filter((e) => {
                const config = e.payload?.config, origin = e.payload?.source, kind = origin?.includes("review")
                    ? "exact-review"
                    : origin?.startsWith("insight:")
                        ? "targeted"
                        : "fresh";
                return (e.type === "performance_started" &&
                    config?.mode === "m5" &&
                    config.runMode + "-" + config.targetPattern === subtask &&
                    (exposure === "all" || kind === exposure) &&
                    (assistance === "all" || e.payload?.assistance === assistance) &&
                    (!start || e.occurredAt >= start) &&
                    Date.parse(e.occurredAt) <= now &&
                    keys.every(([k]) => !contextFilters[k] ||
                        contextFilters[k].includes(String(config[k] ?? "unknown"))));
            });
            const done = new Set(events
                .filter((e) => e.type === "performance_completed")
                .map((e) => e.payload?.runId)), stopped = new Set(events
                .filter((e) => e.type === "performance_interrupted")
                .map((e) => e.payload?.runId));
            const complete = starts.filter((e) => done.has(e.payload?.runId)).length, interrupted = starts.filter((e) => !done.has(e.payload?.runId) && stopped.has(e.payload?.runId)).length;
            const detail = node("details");
            detail.append(node("summary", "Playback run completion"), node("p", complete +
                " completed / " +
                interrupted +
                " interrupted / " +
                (starts.length - complete - interrupted) +
                " unresolved. Playback activity only; not note or rhythm accuracy."));
            host.append(detail);
        }
        renderComparisons(host, rows, evidence, timezone, now, window);
        evidenceTable(host, rows, actions);
    }
    host.append(methodology, link("Settings · Data & Diagnostics", "#/insights/data"));
    if (!workspaceMode)
        sessionStorage.setItem("insights:return", "#/" + route);
    localizeLabels(host, locale);
    const focusId = sessionStorage.getItem("insights:focus");
    if (focusId) {
        host
            .querySelector('[data-cell-id="' + focusId + '"]')
            ?.focus();
        sessionStorage.removeItem("insights:focus");
    }
    const savedScroll = sessionStorage.getItem("insights:scroll:" + route);
    if (savedScroll !== null) {
        sessionStorage.removeItem("insights:scroll:" + route);
        requestAnimationFrame(() => {
            if (host.dataset.route === route && renderRequests.get(host) === request)
                scrollTo(0, Number(savedScroll) || 0);
        });
    }
}
function renderComparisons(host, rows, evidence, timezone, now, window) {
    const keys = new Set(rows.map((e) => e.cohortKey)), history = evidence.filter((e) => keys.has(e.cohortKey)), trends = matchedTrends(history, timezone, now);
    host.append(node("h3", host.lang === "zh-Hant" ? "近期結果" : "Recent results"));
    const dailySeries = new Map();
    for (const e of rows) {
        const key = [
            e.mode,
            e.subtask,
            e.source,
            e.grain,
            e.record.analytics?.timingVersion ?? "historical-seconds",
        ].join(" · "), group = dailySeries.get(key) ?? [];
        group.push(e);
        dailySeries.set(key, group);
    }
    for (const [key, group] of dailySeries) {
        const section = node("section");
        section.setAttribute("aria-label", key + " · recent results");
        renderTrend(section, group, timezone, now, new Set(group.map((e) => e.cohortKey)).size > 1, window, host.lang);
        host.append(section);
    }
    host.append(node("h3", "Comparable periods"));
    const stamp = (time) => new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone,
        dateStyle: "medium",
        timeStyle: "short",
    }).format(time);
    const span = policy.days * 86400000;
    const comparisonWindow = node("details");
    comparisonWindow.append(node("summary", "Comparison window boundaries"), node("p", "Existing v2 rolling windows, separate from the calendar display filter: prior [" +
        stamp(now - 2 * span) +
        ", " +
        stamp(now - span) +
        "); current [" +
        stamp(now - span) +
        ", " +
        stamp(now) +
        "]. " +
        timezone +
        ". Each side is resolved from its own evidence IDs."));
    host.append(comparisonWindow);
    if (!trends.length) {
        host.append(node("p", "Outcome results are available. No matched prior period is available for this selection."));
        const why = node("details");
        why.append(node("summary", "Why?"));
        const span = policy.days * 86400000, eligibleCurrent = aggregate(history.filter((e) => Date.parse(e.createdAt) >= now - span), timezone, now), prior = aggregate(history.filter((e) => Date.parse(e.createdAt) >= now - 2 * span &&
            Date.parse(e.createdAt) < now - span), timezone, now);
        why.append(node("p", eligibleCurrent.eligibleCount +
            " current / " +
            prior.eligibleCount +
            " prior eligible questions. Exact task, settings, exposure and measurement versions must match. Targeted/review and unknown-assistance results do not enter the fresh baseline."));
        host.append(why);
    }
    else {
        host.append(node("p", "Exact matched cohorts; outcomes and timing have separate samples. Unmatched practice is excluded."));
        trends.slice(0, 2).forEach((t) => renderTrend(host, history.filter((e) => e.cohortKey === t.key), timezone, now, false, window, host.lang));
        table(host, ["Prior / current questions", "Outcome change", "Timing interpretation"], trends.map((t) => [
            rate(t.prior.correct, t.prior.eligibleCount) +
                " → " +
                rate(t.current.correct, t.current.eligibleCount),
            (t.delta * 100).toFixed(1) + " pp · " + t.label,
            t.speedLabel,
        ]));
    }
    if (!rows.some((e) => e.capabilities.timing))
        host.append(node("p", "Standardized timing not recorded for these results."));
    if (keys.size > 1) {
        const detail = node("details");
        detail.className = "mixed-history";
        detail.append(node("summary", "Mixed practice history (descriptive)"), node("p", "Practice mix changed. These observations are not matched comparisons and do not establish improvement. Sources, tasks, assessment units and timing definitions stay separate."));
        const series = new Map();
        for (const e of rows) {
            const key = [
                e.mode,
                e.subtask,
                e.source,
                e.grain,
                e.record.analytics?.timingVersion ?? "historical-seconds",
            ].join(" · ");
            const group = series.get(key) ?? [];
            group.push(e);
            series.set(key, group);
        }
        const label = node("label", "Descriptive series"), select = node("select"), chart = node("div");
        select.setAttribute("aria-label", "Descriptive series");
        [...series.keys()].sort().forEach((k) => select.add(new Option(k, k)));
        const draw = () => {
            chart.replaceChildren();
            const group = series.get(select.value) ?? [];
            renderTrend(chart, group, timezone, now, true, window, host.lang);
            if (!chart.children.length)
                chart.append(node("p", "At least two recorded days are needed for this descriptive series."));
        };
        select.onchange = draw;
        label.append(select);
        detail.append(label, chart);
        let rendered = false;
        detail.ontoggle = () => {
            if (detail.open && !rendered) {
                rendered = true;
                draw();
            }
        };
        host.append(detail);
    }
}
let launchingPlan = false;
async function launchPlan(plan, route, actions) {
    if (launchingPlan)
        return;
    launchingPlan = true;
    try {
        if (plan.evidenceRevision &&
            dataRevision(await readAll("assessments")) !==
                plan.evidenceRevision)
            throw new Error("Results changed. Refresh this insight before starting a new diagnostic.");
        if (plan.questions.length !== 10)
            throw new Error("The plan must contain ten validated tasks.");
        plan.questions.forEach((q) => validateScheduled(q, { ...plan.config, ...q.presentation }));
        if (location.hash !== "#/" + route)
            throw new Error("The selection changed. Start the diagnostic shown in the current insight.");
        plan = { ...plan, originScrollY: scrollY };
        await put("drillPlans", plan);
        if (location.hash !== "#/" + route)
            throw new Error("The selection changed. Start the diagnostic shown in the current insight.");
        sessionStorage.setItem("insights:scroll:" + plan.originRoute, String(scrollY));
        await actions.start(plan.config, plan.customSnapshots, plan.selectionPolicy === "matched"
            ? "matched-check:" + plan.id
            : "insight:" + plan.id, plan.questions, plan);
    }
    finally {
        launchingPlan = false;
    }
}
function paginatedTable(parent, headers, items, row, size, label) {
    const section = node("section"), controls = node("div"), search = node("input"), sort = node("select"), content = node("div"), status = node("p");
    section.className = "insight-paged";
    search.type = "search";
    search.placeholder = "Search " + label.toLowerCase();
    search.setAttribute("aria-label", "Search " + label.toLowerCase());
    sort.setAttribute("aria-label", "Sort " + label.toLowerCase());
    sort.add(new Option("Original order", "original"));
    sort.add(new Option("Reverse order", "reverse"));
    let page = 0;
    const prev = button("Previous", () => {
        page--;
        draw();
    }), next = button("Next", () => {
        page++;
        draw();
    });
    function draw() {
        let filtered = search.value
            ? items.filter((item) => {
                const e = item;
                const text = e.record
                    ? [
                        e.id,
                        e.createdAt,
                        e.mode,
                        e.subtask,
                        e.record.chords,
                        e.record.targets,
                        e.record.grade,
                    ]
                    : (e.label ?? item);
                return JSON.stringify(text)
                    .toLowerCase()
                    .includes(search.value.toLowerCase());
            })
            : items;
        if (sort.value === "reverse")
            filtered = filtered.slice().reverse();
        const pages = Math.max(1, Math.ceil(filtered.length / size));
        page = Math.max(0, Math.min(page, pages - 1));
        status.textContent =
            filtered.length +
                " of " +
                items.length +
                " " +
                label.toLowerCase() +
                " · page " +
                (page + 1) +
                "/" +
                pages;
        prev.disabled = page === 0;
        next.disabled = page === pages - 1;
        content.replaceChildren();
        table(content, headers, filtered.slice(page * size, (page + 1) * size).map(row));
    }
    search.oninput = () => {
        page = 0;
        draw();
    };
    sort.onchange = () => {
        page = 0;
        draw();
    };
    controls.append(search, sort, prev, next);
    section.append(status, controls, content);
    parent.append(section);
    draw();
}
function focus(parent, cell, route, actions, timezone, compact = false, suggested) {
    if ((cell.rows[0]?.mode === "m1" || (!cell.rows.length && suggested)) &&
        cell.quality &&
        cell.degree) {
        const box = node("article");
        box.className = "insight-focus suggested-diagnostic";
        const zh = suggested?.locale === "zh-Hant";
        box.append(node("h3", zh ? "建議診斷" : "Suggested Diagnostic"));
        const result = compileSuggestedDiagnostic(cell, route, suggested?.revision ?? "", suggested);
        if (result.plan) {
            const plan = result.plan;
            const preview = node("p", `M1 · ${qualityName(plan.config.quality, suggested?.locale)} · 7 × ${degreeName(plan.config.degree)} + 3 × ${degreeName(plan.config.degreePool[1])} · ${plan.config.roots} · MIDI ${plan.config.low}–${plan.config.high} · ${zh ? "完整和弦背景 · 完整提示 · 手動揭示" : "full context · full hints · manual reveal"} · ${plan.config.bpm} BPM`);
            box.dataset.planId = plan.id;
            box.append(preview, node("p", zh
                ? "新的診斷設定，並非與歷史紀錄作同條件比較。"
                : "New diagnostic settings; not a matched comparison with your history."));
            const start = button(zh ? "開始建議診斷 · 10 題" : "Start Suggested Diagnostic · 10", () => launchPlan(plan, route, actions));
            start.classList.add("suggested-start");
            const edit = node("div");
            edit.hidden = true;
            const fields = [
                ["low", zh ? "最低 MIDI" : "Lowest MIDI", String(plan.config.low)],
                ["high", zh ? "最高 MIDI" : "Highest MIDI", String(plan.config.high)],
                ["bpm", "BPM", String(plan.config.bpm)],
                ["roots", zh ? "根音" : "Roots", plan.config.roots],
            ];
            const inputs = new Map();
            for (const [key, title, value] of fields) {
                const label = node("label", title), input = node("input");
                input.type = key === "roots" ? "text" : "number";
                input.value = value;
                input.setAttribute("aria-label", title);
                inputs.set(key, input);
                label.append(input);
                edit.append(label);
            }
            edit.append(button(zh ? "驗證自訂診斷" : "Validate customized diagnostic", () => {
                const host = box.closest(".jazz-insights");
                const low = Number(inputs.get("low").value), high = Number(inputs.get("high").value);
                const replacement = node("div");
                focus(replacement, cell, route, actions, timezone, compact, {
                    revision: suggested?.revision ?? "",
                    evidenceRefIds: suggested?.evidenceRefIds,
                    locale: suggested?.locale ?? "en",
                    contrast: plan.config.degreePool[1],
                    roots: inputs
                        .get("roots")
                        .value.trim()
                        .split(/[\s,]+/)
                        .filter(Boolean),
                    config: {
                        ...plan.config,
                        low,
                        high,
                        vocalLow: low,
                        vocalHigh: high,
                        bpm: Number(inputs.get("bpm").value),
                    },
                });
                box.replaceWith(...Array.from(replacement.children));
                if (host) {
                    const proxy = host.querySelector(".diagnostic-strip button");
                    const ready = !!host.querySelector(".insight-focus-queue > .insight-recommendation .suggested-start");
                    if (proxy)
                        proxy.disabled = !ready;
                    host
                        .querySelector(".diagnostic-strip .diagnostic-status")
                        ?.remove();
                    if (!ready) {
                        const reason = node("span", zh
                            ? "請修正下方診斷設定。"
                            : "Correct the diagnostic settings below.");
                        reason.className = "diagnostic-status";
                        host.querySelector(".diagnostic-strip")?.append(reason);
                    }
                }
            }));
            box.append(start, button(zh ? "自訂" : "Customize", () => {
                edit.hidden = !edit.hidden;
                if (!edit.hidden)
                    inputs.get("low").focus();
            }), edit);
            if (suggested?.config)
                box.append(node("p", zh ? "自訂診斷設定" : "Customized diagnostic settings"));
            const snapshots = node("details");
            snapshots.append(node("summary", zh ? "已驗證的十題" : "Validated question schedule"));
            table(snapshots, ["#", zh ? "根音" : "Root", zh ? "音級" : "Degree", "MIDI"], plan.questions.map((q, i) => [
                String(i + 1),
                q.targets[0].chord.root,
                degreeName(q.targets[0].degree),
                String(q.targets[0].midi),
            ]));
            box.append(snapshots);
        }
        else {
            const error = node("p", result.unsupportedReason);
            error.setAttribute("role", "alert");
            box.append(error, button(zh ? "自訂" : "Customize", () => actions.customize({
                ...defaults,
                ...suggested?.config,
                mode: "m1",
                quality: cell.quality,
                qualityPool: [cell.quality],
                degree: cell.degree,
                degreePool: [cell.degree, suggested?.contrast ?? "1"],
                roots: suggested?.roots?.join(" ") ?? "C D F G",
            }, [])));
        }
        const historical = node("details");
        historical.append(node("summary", zh ? "選用：配對歷史基準" : "Optional: match a historical baseline"));
        const groups = new Map();
        cell.rows.forEach((e) => groups.set(e.cohortKey, [...(groups.get(e.cohortKey) ?? []), e]));
        const plans = [...groups]
            .sort(([a], [b]) => (a < b ? -1 : 1))
            .map(([, rows]) => compileMatchedBaseline({ ...cell, rows }, route, suggested?.revision ?? ""))
            .filter((p) => !!p);
        if (plans.length) {
            const choice = node("select");
            choice.setAttribute("aria-label", zh ? "歷史基準" : "Historical baseline");
            choice.add(new Option(zh ? "選擇歷史設定" : "Choose historical settings", ""));
            plans.forEach((p, i) => choice.add(new Option(`${p.config.roots} · ${p.config.bpm} BPM · ${p.config.context} · MIDI ${p.config.low}–${p.config.high} · ${p.config.hintLevel} hints · ${p.evidenceAssessmentIds.length} assessments`, String(i))));
            const selected = node("div");
            choice.onchange = () => {
                selected.replaceChildren();
                if (choice.value === "")
                    return;
                const plan = plans[Number(choice.value)];
                selected.append(node("p", plan.reason), button(zh ? "開始同條件檢查" : "Start Matched check", () => launchPlan(plan, route, actions)));
            };
            historical.append(choice, selected);
        }
        else
            historical.append(node("p", zh
                ? "這項選擇沒有可重現的歷史基準。你仍可開始建議診斷。"
                : "No reproducible historical baseline for this selection. You can still start the Suggested Diagnostic."));
        box.append(historical);
        parent.append(box);
        return;
    }
    const scopes = new Map();
    for (const e of cell.rows) {
        const key = comparisonFamily(e);
        const list = scopes.get(key) ?? [];
        list.push(e);
        scopes.set(key, list);
    }
    if (scopes.size > 1) {
        const box = node("article"), label = node("label", "Practice setting scope"), select = node("select"), preview = node("div");
        box.className = "insight-focus";
        box.append(node("h3", cell.label), node("p", "Mixed historical settings. Select an actual setting scope before compiling a plan; the aggregate is not one reproducible configuration."));
        select.setAttribute("aria-label", "Practice setting scope");
        select.add(new Option("Choose settings", ""));
        [...scopes]
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .forEach(([key, group]) => {
            const e = group[0];
            select.add(new Option(e.config.bpm +
                " BPM · " +
                e.config.context +
                " · roots " +
                e.config.roots +
                " · " +
                group.length +
                " assessments · " +
                key.slice(-8), key));
        });
        select.onchange = () => {
            preview.replaceChildren();
            const rows = scopes.get(select.value);
            if (rows)
                focus(preview, { ...cell, rows, diagnosticStats: undefined }, route, actions, timezone, compact);
        };
        label.append(select);
        box.append(label, preview, button("Customize", () => actions.customize(cell.rows[0].config, cell.rows[0].session.customSnapshot ?? [])));
        parent.append(box);
        return;
    }
    const box = node("article");
    box.className = "insight-focus";
    const stats = cell.diagnosticStats ?? aggregate(cell.rows, timezone), rank = cell.category ?? "Selected evidence; not an automatic difficulty claim";
    box.append(node("h3", `${cell.rows[0].mode.toUpperCase()} · ${cell.label}`), node("p", compact
        ? `${stats.label} · ${stats.correct}/${stats.eligibleCount} independent questions · ${stats.sessions} sessions / ${stats.days} days.`
        : `${rank} · ${stats.label}. ${stats.correct}/${stats.eligibleCount} independent fresh questions; ${stats.sessions} sessions / ${stats.days} days.`));
    const result = compileDrill(cell, route);
    const extra = compact ? node("details") : box;
    if (compact) {
        extra.className = "insight-card-details";
        extra.append(node("summary", "Details and settings"));
    }
    const e = cell.rows[0];
    box.append(node("p", `${e.source === "self" ? "Self-assessed production" : e.source === "visual" ? "Visual mapping" : "Automatic answers"}${compact ? "" : " · " + (cell.metricLabel ?? e.grain)}`));
    const settings = node("details");
    settings.append(node("summary", "Adjust focus"));
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
            focus(replacement, next, route, actions, timezone, compact);
            box.replaceWith(...Array.from(replacement.children));
        };
        label.append(select);
        settings.append(label);
    }
    if (result.plan) {
        const plan = result.plan;
        if (cell.category === "Replay-dependent") {
            plan.config.replayLimit = 1;
            plan.reason += " · one-context-replay experiment";
            plan.changedDifficulty.push("Context replay limit: one");
        }
        box.append(node("p", compact ? "10 questions · targeted practice" : plan.reason), button("Practise 10", () => launchPlan(plan, route, actions)));
        const preview = node("details");
        preview.append(node("summary", "Scheduled targets and settings"));
        if (compact)
            preview.append(node("p", plan.reason));
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
        extra.append(preview);
    }
    else
        box.append(node("p", result.unsupportedReason));
    settings.append(button("Customize", () => actions.customize(cell.rows[0].config, cell.rows[0].session.customSnapshot ?? [])));
    extra.append(settings);
    const detail = node("details");
    detail.append(node("summary", "Evidence and exclusions"));
    evidenceTable(detail, cell.rows, actions);
    extra.append(detail);
    if (compact)
        box.append(extra);
    parent.append(box);
}
function evidenceTable(parent, rows, actions, opened = false) {
    const details = node("details");
    details.open = opened;
    details.append(node("summary", "Evidence table (" + rows.length + ")"));
    paginatedTable(details, [
        "Date / session",
        "Actual material",
        "Outcome / source / unit",
        "Exposure / assistance",
        "Timing",
        "Review",
    ], [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)), (e) => [
        e.createdAt +
            " / " +
            e.sessionId +
            " · assessment " +
            e.id +
            " · question " +
            (e.questionId ?? "unknown"),
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
        e.record.grade + " / " + e.source + " / " + e.grain,
        e.exposure + " / " + e.assistance,
        e.version === "historical"
            ? "Legacy recorded response time: " +
                (Number.isFinite(e.record.responseLatency)
                    ? e.record.responseLatency.toFixed(1) + "s"
                    : "Not recorded")
            : e.capabilities.timing
                ? (e.record.analytics.activeMs / 1000).toFixed(2) +
                    "s · " +
                    e.record.analytics.timingVersion
                : "Not recorded / interrupted",
        e.challenge
            ? button("Exact review", () => actions.start({ ...e.config, count: 1 }, e.session.customSnapshot ?? [], "exact-review", [e.challenge]))
            : "Snapshot unavailable",
    ], 25, "Assessments");
    parent.append(details);
}
async function renderLegacy(host) {
    const routeToken = host.dataset.route;
    const imports = await readAll("imports");
    const data = imports.find((i) => i.id === "historical-v1")?.legacy ??
        legacyData(localStorage);
    const language = new URLSearchParams((routeToken ?? "").split("?")[1] ?? "").get("lang") ===
        "zh-Hant"
        ? "zh-Hant"
        : "en";
    const events = await readAll("events");
    if (host.dataset.route !== routeToken)
        return;
    host.append(node("p", "All retained legacy records at import. Undated solved questions are separate from Jazz evidence; abandoned and incorrect submissions were not retained."));
    for (const legacy of data) {
        const section = node("section");
        section.append(node("h3", legacy.title));
        const summary = node("section");
        summary.className = "smart-summary";
        summary.append(node("h4", "Smart Insights Summary"), node("p", "Rule-based summary · all retained solved history"));
        const firstTry = legacy.rows.filter((r) => r.attempts === 1).length;
        const text = legacy.id === "progression-id"
            ? renderTemplate("legacy-progression", {}, language)
            : legacy.rows.length
                ? renderTemplate("legacy", { focus: legacy.title, k: firstTry, n: legacy.rows.length }, language)
                : language === "zh-Hant"
                    ? "沒有已保存的答題結果。"
                    : "No retained solved outcomes.";
        summary.append(node("p", text ?? "Evidence unavailable."));
        if (legacy.rows.length)
            summary.append(button("View Evidence", () => {
                const panel = node("details");
                panel.open = true;
                panel.append(node("summary", legacy.title + " · import evidence"));
                let originals = [];
                try {
                    const raw = JSON.parse(legacy.rawQuestions ?? "[]");
                    if (Array.isArray(raw))
                        originals = raw;
                }
                catch { }
                const refs = originals.flatMap((r, index) => r &&
                    typeof r === "object" &&
                    Number.isInteger(r.attempts) &&
                    Number(r.attempts) >= 1
                    ? [
                        {
                            id: "historical-v1:" + legacy.id + ":" + index,
                            sourceKey: legacy.key,
                            rawIndex: index,
                        },
                    ]
                    : []);
                panel.append(node("pre", JSON.stringify({
                    schemaVersion: 1,
                    importBatch: "historical-v1",
                    source: legacy.key,
                    assessmentRefs: refs,
                    independentQuestionCount: null,
                    sourceRevision: hash(legacy.rawQuestions),
                    limitations: [
                        "undated solved-only rows",
                        "stable adapter provenance is not independent question identity",
                    ],
                }, null, 2)));
                summary.append(panel);
            }));
        section.append(summary);
        if (legacy.error)
            section.append(node("p", legacy.error + " · Original storage preserved."));
        section.append(node("p", legacy.id === "progression-id"
            ? "Chord exposure rows share a joint progression response. Independent accuracy and confidence are unavailable."
            : `First-try success among retained solved questions: ${rate(legacy.rows.filter((r) => r.attempts === 1).length, legacy.rows.length)}.`));
        const matrixHost = node("div"), facetControls = node("div"), routeParams = new URLSearchParams((routeToken ?? "").split("?")[1] ?? "");
        let inversion = routeParams.get("cq-inversion") ?? "all", playback = routeParams.get("cq-playback") ?? "all";
        if (legacy.id === "chord-quality")
            for (const [key, label, values] of [
                [
                    "cq-inversion",
                    "Inversion",
                    legacy.rows.map((r) => String(r.chordInversion ?? "Unknown")),
                ],
                [
                    "cq-playback",
                    "Playback",
                    legacy.rows.map((r) => String(r.playbackMode ?? "Unknown")),
                ],
            ]) {
                const l = node("label", label), select = node("select");
                select.setAttribute("aria-label", "Legacy " + label);
                select.add(new Option("All", "all"));
                [...new Set(values)]
                    .sort()
                    .forEach((v) => select.add(new Option(v, v)));
                select.value = routeParams.get(key) ?? "all";
                if (!select.value)
                    select.value = "all";
                if (key === "cq-inversion")
                    inversion = select.value;
                else
                    playback = select.value;
                select.onchange = () => {
                    routeParams.set(key, select.value);
                    location.hash = "#/insights/legacy?" + routeParams.toString();
                };
                l.append(select);
                facetControls.append(l);
            }
        facetControls.className = "insight-filters";
        section.append(facetControls, matrixHost);
        const grid = legacyGrid(legacy.id, legacy.rows, { inversion, playback });
        if (grid?.cells.length)
            renderGrid(matrixHost, grid, (cell) => {
                const panel = node("details");
                panel.open = true;
                panel.append(node("summary", cell.row + " / " + cell.column + " · retained solved evidence"));
                let rawIndices = [];
                try {
                    const raw = JSON.parse(legacy.rawQuestions ?? "[]");
                    if (Array.isArray(raw))
                        rawIndices = raw.flatMap((r, index) => r && Number.isInteger(r.attempts) && r.attempts >= 1
                            ? [index]
                            : []);
                }
                catch { }
                paginatedTable(panel, [
                    "Import source index",
                    "Material",
                    "Attempts",
                    "Recorded time-to-solve",
                ], cell.sourceIndices, (index) => {
                    const r = legacy.rows[index];
                    return [
                        rawIndices[index] === undefined
                            ? "Unknown provenance"
                            : legacy.key + "[" + rawIndices[index] + "]",
                        cell.row + " / " + cell.column,
                        String(r.attempts),
                        Number.isFinite(r.timeSeconds)
                            ? String(r.timeSeconds) + "s"
                            : "Not recorded",
                    ];
                }, 25, "Solved rows");
                matrixHost.append(panel);
            });
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
    details.open = true;
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
        a.download =
            "jazz-insights-v1-" + new Date().toISOString().slice(0, 10) + ".json";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }));
    details.append(button("Clear derived cache", () => {
        clearSummaryCache();
        lastRuleDiagnostics = null;
        const status = node("p", "Derived cache cleared. Practice history and saved presets are unchanged.");
        status.setAttribute("role", "status");
        details.append(status);
    }));
    const upload = node("input");
    upload.type = "file";
    upload.accept = ".json";
    upload.setAttribute("aria-label", "Import Insights backup");
    upload.onchange = async () => {
        try {
            if (!upload.files?.[0])
                return;
            const text = await upload.files[0].text(), preview = await previewImport(text);
            const dialog = node("dialog");
            dialog.className = "insight-data-confirm";
            dialog.setAttribute("aria-label", "Import preview");
            dialog.append(node("h3", "Import preview"), node("p", preview.accepted +
                " new records · " +
                preview.overlap +
                " overlapping IDs retained unchanged · " +
                preview.quarantined +
                " quarantined in backup"));
            table(dialog, ["Store", "New", "Overlapping"], preview.rows.map((r) => [
                r.store,
                String(r.accepted),
                String(r.overlap),
            ]));
            const origin = document.activeElement;
            const cancel = button("Cancel", () => {
                dialog.close();
                dialog.remove();
                upload.value = "";
                origin?.focus();
            });
            cancel.autofocus = true;
            dialog.append(cancel, button("Confirm additive import", async () => {
                await importData(text);
                location.reload();
            }));
            dialog.addEventListener("cancel", () => {
                upload.value = "";
                setTimeout(() => {
                    dialog.remove();
                    origin?.focus();
                }, 0);
            });
            details.append(dialog);
            dialog.showModal();
            cancel.focus();
        }
        catch (error) {
            const status = node("p", "Import rejected: " +
                String(error) +
                ". Existing records are unchanged.");
            status.setAttribute("role", "alert");
            details.append(status);
        }
    };
    details.append(upload);
    details.append(button("Clear Insights evidence", async () => {
        const origin = document.activeElement;
        const snapshot = JSON.parse(await exportData());
        const dialog = node("dialog");
        dialog.className = "insight-data-confirm";
        dialog.setAttribute("aria-label", "Clear Insights confirmation");
        dialog.append(node("h3", "Clear Insights evidence?"), node("p", evidence.length +
            " captured/imported assessments, analytics events and pending analytics will be deleted. Original trainer history, Saved presets and legacy storage are not deleted."));
        table(dialog, ["Insights store / scope", "Records"], Object.entries(snapshot)
            .filter(([, value]) => Array.isArray(value))
            .map(([key, value]) => [key, String(value.length)]));
        const cancel = button("Cancel", () => {
            dialog.close();
            dialog.remove();
            origin?.focus();
        });
        cancel.autofocus = true;
        dialog.append(cancel, button("Export before deleting", async () => {
            const url = URL.createObjectURL(new Blob([await exportData()], { type: "application/json" }));
            const a = link("Download", url);
            a.download =
                "jazz-insights-v1-" +
                    new Date().toISOString().slice(0, 10) +
                    ".json";
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }), button("Confirm clear Insights", async () => {
            await clearInsights();
            location.reload();
        }));
        dialog.addEventListener("cancel", () => setTimeout(() => {
            dialog.remove();
            origin?.focus();
        }, 0));
        details.append(dialog);
        dialog.showModal();
        cancel.focus();
    }));
    const diagnostic = node("details");
    diagnostic.append(node("summary", "Developer diagnostics"), node("pre", JSON.stringify({
        policy: summaryPolicy.version,
        basePolicy: policy.version,
        scope: "All retained Insights evidence; last rendered query below has its own scope",
        assessments: evidence.length,
        imports,
        metadata,
        lastRenderedQuery: lastRuleDiagnostics,
    }, null, 2)));
    details.append(diagnostic);
    host.append(details);
}
