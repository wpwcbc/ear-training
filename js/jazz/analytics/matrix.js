import { allowedTargetDegrees, qualities } from "../theory.js";
const canonicalDegrees = ["1", "b3", "3", "5", "b7", "maj7", "9", "11", "13"];
import { quantile } from "./policy.js";
import { registry } from "./summary/registry.js";
import { focusName, degreeName, localizeLabels, } from "./display.js";
let activeTooltip = null;
if (typeof document !== "undefined")
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && activeTooltip) {
            activeTooltip.hidden = true;
            activeTooltip = null;
        }
    });
function el(tag, text) {
    const node = document.createElement(tag);
    if (text !== undefined)
        node.textContent = text;
    return node;
}
function rate(c) {
    return c.independentQuestionCount === null ||
        c.numerator === null ||
        c.denominator === null ||
        !Number.isInteger(c.numerator) ||
        !Number.isInteger(c.denominator) ||
        c.numerator < 0 ||
        c.numerator > c.denominator
        ? null
        : c.denominator
            ? c.numerator / c.denominator
            : null;
}
export function rateBucket(value) {
    if (value === null || !Number.isFinite(value) || value < 0 || value > 1)
        return null;
    return value < 0.5
        ? 0
        : value < 0.7
            ? 1
            : value < 0.85
                ? 2
                : value < 0.95
                    ? 3
                    : 4;
}
function value(c, metric) {
    if (c.denominator !== null &&
        c.denominator > 0 &&
        rate(c) === null &&
        c.independentQuestionCount !== null)
        return "!";
    if (c.independentQuestionCount === null)
        return "?";
    if (c.denominator === null && metric === "outcome")
        return "N/A";
    if (metric === "sample")
        return String(c.independentQuestionCount);
    if (metric === "time") {
        const times = c.sample
            .filter((o) => o.row.record.targets.length === 1 &&
            o.row.capabilities.timing &&
            (o.row.source === "self" || o.outcome === "correct"))
            .map((o) => o.row.record.analytics.activeMs)
            .filter((n) => Number.isFinite(n) && n >= 0);
        const median = quantile(times, 0.5);
        return median === null ? "N/A" : (median / 1000).toFixed(2) + "s";
    }
    return rate(c) === null ? "\u2014" : Math.round(rate(c) * 100) + "%";
}
function cellButton(c, metric, inspect, selected, locale = "en") {
    const t = (en, zh) => (locale === "zh-Hant" ? zh : en);
    const b = el("button");
    b.type = "button";
    b.className = "matrix-value";
    b.dataset.cellId = c.id;
    b.dataset.reliability = c.reliability;
    b.dataset.stale = String(c.stale);
    b.setAttribute("aria-pressed", String(c.id === selected));
    const label = c.independentQuestionCount === null
        ? t("Identity unknown", "題目身分不明")
        : c.denominator === null
            ? registry(c).degreeUse === "outcome"
                ? t("Not recorded", "未有記錄")
                : t("Not applicable", "不適用")
            : c.denominator === 0
                ? t("No data", "沒有資料")
                : rate(c) === null
                    ? t("Results unavailable", "結果無法使用")
                    : c.reliability === "early"
                        ? t("Early", "初步")
                        : c.reliability === "building"
                            ? t("Building", "累積中")
                            : t("Sufficient", "足夠");
    const unknown = c.rows.filter((e) => !e.questionId || !e.capabilities.identity).length;
    b.dataset.state =
        c.independentQuestionCount === null
            ? "identity-unknown"
            : c.denominator === null
                ? "not-applicable"
                : "value";
    b.append(el("strong", value(c, metric)), el("span", c.independentQuestionCount === null
        ? "n unavailable"
        : c.denominator === null
            ? c.descriptiveItemCount + " item exposures"
            : "n=" + c.denominator), el("small", label +
        (c.stale ? " · stale" : "") +
        (unknown && c.independentQuestionCount !== null ? " + unknown" : "")));
    const source = c.source === "self"
        ? "Self-rated"
        : c.source === "visual"
            ? "Visual mapping"
            : "Recognition";
    const scope = c.queryScope
        ? JSON.parse(c.queryScope)
        : null;
    const exact = `${focusName(c.label, locale)} · ${source} correct · ${c.grain} · ${c.numerator ?? "N/A"}/${c.denominator ?? "N/A"} · ${c.sessions} sessions / ${c.localDays} days · ${c.contextState} · ${label} · roots ${c.roots.map((r) => r.root).join(", ") || "unknown"}${scope ? " · " + (scope.startInclusive ?? "All retained") + " to " + (scope.endExclusive ?? "snapshot") + " · " + scope.timezone : ""}`;
    b.setAttribute("aria-label", exact +
        " · " +
        value(c, metric) +
        " · " +
        (c.denominator ?? "unavailable") +
        " independent questions · Open details");
    if (metric === "outcome" && rate(c) !== null) {
        b.dataset.rateBucket = String(rateBucket(rate(c)));
        b.style.setProperty("--outcome-color", `var(--ji-rate-${rateBucket(rate(c))})`);
    }
    b.onclick = () => inspect(c);
    const tooltip = el("span", exact);
    tooltip.className = "matrix-tooltip";
    tooltip.id = "tooltip-" + c.id;
    tooltip.setAttribute("role", "tooltip");
    tooltip.hidden = true;
    b.setAttribute("aria-describedby", tooltip.id);
    b.onmouseenter = b.onfocus = () => {
        if (activeTooltip && activeTooltip !== tooltip)
            activeTooltip.hidden = true;
        activeTooltip = tooltip;
        tooltip.hidden = false;
        const anchor = b.getBoundingClientRect(), box = tooltip.getBoundingClientRect();
        tooltip.style.left =
            Math.max(8, Math.min(anchor.left, innerWidth - box.width - 8)) + "px";
        const below = anchor.bottom + 4;
        const above = anchor.top - box.height - 4;
        tooltip.style.top =
            (below + box.height <= innerHeight - 8 ? below : Math.max(8, above)) +
                "px";
    };
    const leave = () => setTimeout(() => {
        if (!b.matches(":hover") &&
            !tooltip.matches(":hover") &&
            document.activeElement !== b)
            tooltip.hidden = true;
    }, 80);
    b.onmouseleave = leave;
    b.onblur = () => {
        if (!tooltip.matches(":hover"))
            tooltip.hidden = true;
    };
    tooltip.onmouseleave = leave;
    b.onkeydown = (e) => {
        if (e.key === "Escape")
            tooltip.hidden = true;
    };
    return { b, tooltip };
}
export function renderAggregateMatrix(parent, cells, metric, inspect, options = {}) {
    const locale = options.locale ?? "en";
    const t = (en, zh) => (locale === "zh-Hant" ? zh : en);
    const partitions = new Map();
    for (const c of cells.filter((c) => !c.stratum &&
        c.level ===
            (registry(c).degreeUse === "outcome"
                ? "quality-degree"
                : "mode-specific"))) {
        const key = [c.mode, c.subtask, c.source, c.grain, c.metricId].join(" · "), list = partitions.get(key) ?? [];
        list.push(c);
        partitions.set(key, list);
    }
    for (const [key, group] of partitions) {
        const section = el("section"), grid = group[0].level === "quality-degree";
        section.dataset.partition = key;
        section.append(el("h3", (grid
            ? t("Chord quality × degree", "和弦品質 × 音級")
            : t("Assessed contexts", "已評分情境")) +
            " · " +
            (group[0].source === "self"
                ? "Self-assessed"
                : group[0].source === "visual"
                    ? "Visual mapping"
                    : "Recognition")));
        const toolbar = el("div"), toggle = el("button", "Table view"), sort = el("select"), label = el("label", "Sort");
        toolbar.className = "matrix-toolbar";
        toggle.type = "button";
        toggle.setAttribute("aria-pressed", "false");
        sort.setAttribute("aria-label", "Matrix table sort");
        for (const [v, t] of [
            ["canonical", "Musical order"],
            ["rate-desc", "Rate: high to low"],
            ["rate-asc", "Rate: low to high"],
            ["n-desc", "Sample: high to low"],
            ["n-asc", "Sample: low to high"],
        ])
            sort.add(new Option(t, v));
        label.append(sort);
        label.hidden = true;
        toolbar.append(toggle, label);
        const wrap = el("div");
        wrap.className = "table-scroll aggregate-matrix";
        wrap.tabIndex = 0;
        wrap.setAttribute("role", "region");
        wrap.setAttribute("aria-label", key + " · matrix");
        const store = "insights:matrix:" + key;
        let plain = sessionStorage.getItem(store) === "table", page = 0;
        const qualityOrder = (a, b) => qualities.indexOf(a) - qualities.indexOf(b);
        const degreeOrder = (a, b) => canonicalDegrees.indexOf(a) -
            canonicalDegrees.indexOf(b);
        const canonical = (a, b) => qualityOrder(a.quality ?? "", b.quality ?? "") ||
            degreeOrder(a.degree ?? "", b.degree ?? "") ||
            (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
        const rowQualities = [...new Set(group.map((c) => c.quality))].sort(qualityOrder);
        const scopedDegrees = new Set(group.flatMap((c) => c.rows.flatMap((e) => [
            ...(e.config.degreePool ?? []),
            e.config.degree,
            ...e.record.targets,
        ])));
        const columns = grid
            ? canonicalDegrees.filter((d) => scopedDegrees.has(d) &&
                rowQualities.some((q) => allowedTargetDegrees({
                    root: "C",
                    quality: q,
                    symbol: "C" + q,
                }).includes(d)))
            : ["Recorded outcome"];
        const prev = el("button", "Previous contexts"), next = el("button", "Next contexts"), count = el("p");
        prev.type = next.type = "button";
        const pagination = el("div");
        pagination.className = "matrix-toolbar";
        pagination.append(count, prev, next);
        const draw = () => {
            wrap.replaceChildren();
            toggle.textContent = plain
                ? t("Heatmap view", "熱圖")
                : t("Table view", "表格");
            toggle.setAttribute("aria-pressed", String(plain));
            label.hidden = !plain;
            wrap.classList.toggle("matrix-table-view", plain);
            const table = el("table"), head = el("thead"), body = el("tbody"), header = el("tr");
            table.append(el("caption", group[0].mode === "m1"
                ? t("M1 · Self-assessed production · diagnostic first-question sample", "M1 · 自評唱奏 · 診斷首次作答樣本")
                : group[0].mode.toUpperCase() +
                    " · " +
                    group[0].subtask +
                    " · " +
                    group[0].grain +
                    " · diagnostic first-question sample"));
            const headings = plain
                ? [
                    "Quality / context",
                    "Degree",
                    "Metric",
                    "Correct / n",
                    "Grades: correct / close / missed",
                    "Evidence",
                    "Days / sessions",
                    "Settings",
                    "Details",
                ]
                : [grid ? "Quality / degree" : "Context", ...columns.map(degreeName)];
            headings.forEach((t) => {
                const th = el("th", t);
                th.scope = "col";
                header.append(th);
            });
            head.append(header);
            if (plain) {
                const sorted = [...group].sort((a, b) => {
                    if (sort.value === "canonical")
                        return canonical(a, b);
                    const x = sort.value.startsWith("rate")
                        ? rate(a)
                        : a.independentQuestionCount === null
                            ? null
                            : a.denominator, y = sort.value.startsWith("rate")
                        ? rate(b)
                        : b.independentQuestionCount === null
                            ? null
                            : b.denominator;
                    return x === null
                        ? y === null
                            ? canonical(a, b)
                            : 1
                        : y === null
                            ? -1
                            : (sort.value.endsWith("asc") ? x - y : y - x) || canonical(a, b);
                });
                for (const c of sorted) {
                    const tr = el("tr");
                    for (const t of [
                        c.quality ?? c.label,
                        c.degree ?? "N/A",
                        value(c, metric),
                        rate(c) === null ? "N/A" : c.numerator + "/" + c.denominator,
                        c.selfRatings.correct +
                            " / " +
                            c.selfRatings.close +
                            " / " +
                            c.selfRatings.missed,
                        c.reliability + (c.stale ? " · stale" : ""),
                        c.localDays + " / " + c.sessions,
                        c.contextState,
                    ])
                        tr.append(el("td", t));
                    const td = el("td"), { b, tooltip } = cellButton(c, metric, inspect, options.selected, locale);
                    b.replaceChildren(document.createTextNode(t("Details", "詳情")));
                    td.append(b, tooltip);
                    tr.append(td);
                    body.append(tr);
                }
            }
            else {
                const labels = grid
                    ? rowQualities
                    : group.slice(page * 12, (page + 1) * 12).map((c) => c.id);
                for (const label of labels) {
                    const tr = el("tr"), th = el("th", grid ? label : group.find((c) => c.id === label).label);
                    th.scope = "row";
                    tr.append(th);
                    for (const degree of columns) {
                        const td = el("td"), c = group.find((c) => grid
                            ? c.quality === label && c.degree === degree
                            : c.id === label);
                        if (c) {
                            const { b, tooltip } = cellButton(c, metric, inspect, options.selected, locale);
                            td.append(b, tooltip);
                        }
                        else if (!allowedTargetDegrees({
                            root: "C",
                            quality: label,
                            symbol: "C" + label,
                        }).includes(degree))
                            td.append(el("span", "N/A"));
                        else {
                            const b = el("button", "\u2014");
                            b.type = "button";
                            b.className = "matrix-value matrix-missing";
                            b.append(el("small", t("No data", "沒有資料")));
                            b.append(el("small", "n=0"));
                            b.setAttribute("aria-label", label + " / " + degree + " · No data");
                            b.onclick = () => options.missing?.(label, degree);
                            td.append(b);
                        }
                        tr.append(td);
                    }
                    body.append(tr);
                }
            }
            prev.disabled = page === 0;
            next.disabled = (page + 1) * 12 >= group.length;
            count.textContent =
                "Page " + (page + 1) + " / " + Math.ceil(group.length / 12);
            pagination.hidden = grid || plain || group.length <= 12;
            table.append(head, body);
            wrap.append(table);
            localizeLabels(section, locale);
        };
        toggle.onclick = () => {
            plain = !plain;
            sessionStorage.setItem(store, plain ? "table" : "heatmap");
            draw();
            toggle.focus();
        };
        sort.onchange = draw;
        prev.onclick = () => {
            page--;
            draw();
        };
        next.onclick = () => {
            page++;
            draw();
        };
        draw();
        const legend = el("p", t(`${group[0].source === "self" ? "Observed self-rated correct rate" : "Observed correct rate"} · <50%, 50–<70%, 70–<85%, 85–<95%, 95–100%. Color shows recorded outcomes, not certainty or mastery. Buckets use exact values before rounding.`, "觀察到的正確率 · <50%、50–<70%、70–<85%、85–<95%、95–100%。顏色代表記錄結果，並非把握程度或熟練程度；色階按未四捨五入的數值判定。"));
        legend.className = "matrix-legend";
        section.append(toolbar, wrap, pagination, legend);
        parent.append(section);
        if (grid) {
            const marginal = el("details");
            marginal.className = "degree-strip";
            marginal.append(el("summary", "Degree totals · descriptive across practised qualities"));
            const table = el("table"), tr = el("tr"), head = el("thead"), body = el("tbody");
            for (const t of [
                "Degree",
                "Correct / n",
                "Observed %",
                "Evidence",
                "Breakdown",
            ]) {
                const th = el("th", t);
                th.scope = "col";
                tr.append(th);
            }
            head.append(tr);
            for (const c of cells
                .filter((c) => c.level === "degree" &&
                c.mode === group[0].mode &&
                c.subtask === group[0].subtask &&
                c.source === group[0].source)
                .sort((a, b) => (b.denominator ?? 0) - (a.denominator ?? 0) ||
                degreeOrder(a.degree, b.degree))) {
                const row = el("tr");
                [
                    c.degree,
                    rate(c) === null ? "Unknown" : c.numerator + "/" + c.denominator,
                    value(c, "outcome"),
                    c.qualityGuard?.supported ? "Supported strata" : "Descriptive only",
                ].forEach((t) => row.append(el("td", t)));
                const td = el("td"), b = el("button", "Details");
                b.type = "button";
                b.dataset.cellId = c.id;
                b.onclick = () => inspect(c);
                td.append(b);
                row.append(td);
                body.append(row);
            }
            table.append(head, body);
            const scroll = el("div");
            scroll.className = "table-scroll";
            scroll.append(table);
            marginal.append(scroll);
            parent.append(marginal);
        }
    }
}
