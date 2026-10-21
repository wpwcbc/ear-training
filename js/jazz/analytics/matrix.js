import { quantile } from "./policy.js";
import { registry } from "./summary/registry.js";
import { degrees as canonicalDegrees } from "../theory.js";
export function renderAggregateMatrix(parent, cells, metric, inspect) {
    const partitions = new Map();
    for (const c of cells.filter((c) => !c.stratum &&
        (c.level === "quality-degree" || c.level === "mode-specific"))) {
        const expected = registry(c).degreeUse === "outcome" ? "quality-degree" : "mode-specific";
        if (c.level !== expected)
            continue;
        const key = [c.mode, c.subtask, c.source, c.grain, c.metricId].join(" · ");
        const group = partitions.get(key) ?? [];
        group.push(c);
        partitions.set(key, group);
    }
    for (const [key, group] of partitions) {
        const section = document.createElement("section"), heading = document.createElement("h3"), toggle = document.createElement("button");
        heading.textContent =
            key +
                " · " +
                (group[0].level === "quality-degree"
                    ? "Chord quality × degree"
                    : "Assessed contexts");
        toggle.type = "button";
        toggle.textContent = "Table view";
        toggle.setAttribute("aria-pressed", "false");
        const wrap = document.createElement("div");
        wrap.className = "table-scroll aggregate-matrix";
        wrap.setAttribute("role", "region");
        wrap.setAttribute("aria-label", heading.textContent);
        wrap.tabIndex = 0;
        toggle.onclick = () => {
            const plain = wrap.classList.toggle("matrix-table-view");
            toggle.setAttribute("aria-pressed", String(plain));
            toggle.textContent = plain ? "Heatmap view" : "Table view";
        };
        section.append(heading, toggle, wrap);
        const table = document.createElement("table"), caption = document.createElement("caption");
        caption.textContent =
            "Diagnostic first-question sample; independent questions and item exposures are different counts. Scroll for all columns.";
        table.append(caption);
        const head = document.createElement("thead"), body = document.createElement("tbody"), header = document.createElement("tr");
        const isGrid = group[0].level === "quality-degree";
        const columns = isGrid
            ? [...new Set(group.map((c) => c.degree))].sort((a, b) => canonicalDegrees.indexOf(a) -
                canonicalDegrees.indexOf(b) || a.localeCompare(b))
            : ["Recorded outcome"];
        for (const text of [isGrid ? "Quality / degree" : "Context", ...columns]) {
            const th = document.createElement("th");
            th.scope = "col";
            th.textContent = text;
            header.append(th);
        }
        head.append(header);
        const labels = isGrid
            ? [...new Set(group.map((c) => c.quality))].sort()
            : group.map((c) => c.id);
        let page = 0;
        const count = document.createElement("p"), prev = document.createElement("button"), next = document.createElement("button");
        prev.type = next.type = "button";
        prev.textContent = "Previous contexts";
        next.textContent = "Next contexts";
        const draw = () => {
            body.replaceChildren();
            count.textContent =
                labels.length +
                    " contexts · page " +
                    (page + 1) +
                    "/" +
                    Math.ceil(labels.length / 12);
            prev.disabled = page === 0;
            next.disabled = (page + 1) * 12 >= labels.length;
            for (const label of isGrid
                ? labels
                : labels.slice(page * 12, (page + 1) * 12)) {
                const tr = document.createElement("tr"), th = document.createElement("th");
                th.scope = "row";
                th.textContent = isGrid
                    ? label
                    : group.find((c) => c.id === label).label;
                tr.append(th);
                for (const degree of columns) {
                    const td = document.createElement("td"), c = group.find((c) => isGrid
                        ? c.quality === label && c.degree === degree
                        : c.id === label);
                    if (!c) {
                        td.textContent = "No observations";
                        tr.append(td);
                        continue;
                    }
                    const b = document.createElement("button");
                    b.type = "button";
                    b.dataset.cellId = c.id;
                    b.className = "matrix-value";
                    let text;
                    if (metric === "time") {
                        const times = c.sample
                            .filter((o) => o.row.record.targets.length === 1 &&
                            o.row.capabilities.timing &&
                            (o.row.source === "self" || o.outcome === "correct"))
                            .map((o) => o.row.record.analytics.activeMs)
                            .filter((n) => Number.isFinite(n) && n >= 0);
                        const median = quantile(times, 0.5);
                        text =
                            median === null
                                ? "Not recorded at this grain"
                                : (median / 1000).toFixed(2) + "s · valid n=" + times.length;
                    }
                    else if (metric === "sample")
                        text =
                            (c.independentQuestionCount ?? "Unknown") +
                                " independent questions · " +
                                c.descriptiveItemCount +
                                " item exposures";
                    else
                        text =
                            c.denominator === null
                                ? "Not applicable · coverage only"
                                : c.independentQuestionCount === null
                                    ? "Unknown question identity"
                                    : c.denominator === 0
                                        ? "No eligible diagnostic observations"
                                        : c.source === "self"
                                            ? c.selfRatings.correct +
                                                " correct / " +
                                                c.selfRatings.close +
                                                " close / " +
                                                c.selfRatings.missed +
                                                " missed · " +
                                                c.denominator +
                                                " questions"
                                            : c.numerator +
                                                "/" +
                                                c.denominator +
                                                " correct · " +
                                                c.descriptiveItemCount +
                                                " items";
                    b.textContent = text + " · " + c.reliability;
                    b.dataset.reliability = c.reliability;
                    b.setAttribute("aria-label", c.label + " · " + c.source + " · " + b.textContent);
                    b.onclick = () => inspect(c);
                    td.append(b);
                    tr.append(td);
                }
                body.append(tr);
            }
        };
        draw();
        if (!isGrid && labels.length > 12) {
            prev.onclick = () => {
                page--;
                draw();
            };
            next.onclick = () => {
                page++;
                draw();
            };
            section.insertBefore(count, wrap);
            section.append(prev, next);
        }
        table.append(head, body);
        wrap.append(table);
        parent.append(section);
        if (group[0].level === "quality-degree") {
            const strip = document.createElement("div");
            strip.className = "degree-strip";
            const degrees = cells.filter((c) => c.level === "degree" &&
                c.mode === group[0].mode &&
                c.subtask === group[0].subtask &&
                c.source === group[0].source);
            strip.append(document.createTextNode("Across practised contexts: "));
            for (const c of degrees) {
                const b = document.createElement("button");
                b.type = "button";
                b.textContent =
                    c.degree +
                        " · " +
                        (c.denominator === null
                            ? "coverage"
                            : c.numerator + "/" + c.denominator) +
                        " · " +
                        (c.qualityGuard?.supported
                            ? "Supported across qualities"
                            : "Descriptive only");
                b.onclick = () => inspect(c);
                b.dataset.cellId = c.id;
                strip.append(b);
            }
            parent.append(strip);
        }
    }
}
