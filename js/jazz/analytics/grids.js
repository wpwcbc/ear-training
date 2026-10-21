import { parseChord } from "../theory.js";
import { eligible } from "./metrics.js";
export function confusionGrids(rows, now = Date.now()) {
    const groups = new Map();
    const ordered = [...rows].sort((a, b) => (a.record.chordStep ?? 0) - (b.record.chordStep ?? 0) ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id.localeCompare(b.id));
    for (const e of ordered) {
        if (e.source !== "automatic" ||
            !e.capabilities.identity ||
            !eligible(e, now) ||
            !e.questionId)
            continue;
        e.record.targets.forEach((expected, index) => {
            const quality = parseChord(e.record.chords[index]).quality, degree = e.record.selectedDegrees?.[index], chosenQuality = e.record.selectedQualities?.[index];
            const components = [
                [
                    "degree",
                    quality + ": " + expected,
                    degree === undefined
                        ? undefined
                        : quality + ": " + (degree || "(No selection)"),
                ],
            ];
            if (!e.config.showChords)
                components.push([
                    "quality",
                    quality,
                    chosenQuality === undefined
                        ? undefined
                        : chosenQuality || "(No selection)",
                ], [
                    "joint",
                    quality + ": " + expected,
                    degree === undefined || chosenQuality === undefined
                        ? undefined
                        : (chosenQuality || "(No selection)") +
                            ": " +
                            (degree || "(No selection)"),
                ]);
            for (const [component, row, column] of components) {
                if (column === undefined)
                    continue;
                const groupKey = [e.mode, e.subtask, e.source, e.grain, component].join(" · "), g = groups.get(groupKey) ?? {
                    cells: new Map(),
                    totals: new Map(),
                    seen: new Set(),
                };
                const identity = JSON.stringify([e.questionId, row]);
                if (g.seen.has(identity))
                    continue;
                g.seen.add(identity);
                g.totals.set(row, (g.totals.get(row) ?? 0) + 1);
                const key = JSON.stringify([row, column]), cell = g.cells.get(key) ?? {
                    row,
                    column,
                    k: 0,
                    n: 0,
                    items: 0,
                    evidence: [],
                    sourceIndices: [],
                };
                cell.k++;
                cell.items++;
                cell.evidence.push(e);
                cell.sourceIndices.push(index);
                g.cells.set(key, cell);
                groups.set(groupKey, g);
            }
        });
    }
    return [...groups]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([title, g]) => ({
        title,
        description: "Fresh known-unassisted first answers; one item per expected label per independent question/sequence. Correct diagonals are included. Missing labels are shown only when explicitly committed.",
        unit: "expected-row questions",
        cells: [...g.cells.values()].map((c) => ({
            ...c,
            n: g.totals.get(c.row),
        })),
    }));
}
export function legacyGrid(source, rows, facets = {}) {
    if (!["degree", "interval", "chord-quality"].includes(source))
        return null;
    const cells = new Map();
    rows.forEach((r, index) => {
        if (!Number.isInteger(r.attempts) || Number(r.attempts) < 1)
            return;
        if (facets.inversion &&
            facets.inversion !== "all" &&
            String(r.chordInversion ?? "Unknown") !== facets.inversion)
            return;
        if (facets.playback &&
            facets.playback !== "all" &&
            String(r.playbackMode ?? "Unknown") !== facets.playback)
            return;
        const row = String(r.chordQuality ?? "Unknown"), column = String(source === "degree"
            ? (r.upperDegree ?? "Unknown")
            : source === "interval"
                ? (r.intervalLabel ?? "Unknown")
                : (r.chordVoicing ?? "Unknown")), key = JSON.stringify([row, column]);
        const cell = cells.get(key) ?? {
            row,
            column,
            k: 0,
            n: 0,
            items: 0,
            evidence: [],
            sourceIndices: [],
        };
        cell.n++;
        cell.items++;
        if (r.attempts === 1)
            cell.k++;
        cell.sourceIndices.push(index);
        cells.set(key, cell);
    });
    return {
        title: source + " · retained solved rows",
        description: "First-try success among retained solved rows only. Unfinished questions are excluded; independent question identity and roots are not recorded. No confidence interval or dated trend.",
        unit: "retained solved rows",
        rowLabel: "Quality",
        columnLabel: source === "degree"
            ? "Upper degree"
            : source === "interval"
                ? "Interval"
                : "Voicing",
        cells: [...cells.values()],
    };
}
export function renderGrid(parent, grid, inspect) {
    const section = document.createElement("section"), heading = document.createElement("h4"), description = document.createElement("p"), toggle = document.createElement("button"), wrap = document.createElement("div"), table = document.createElement("table"), caption = document.createElement("caption"), head = document.createElement("thead"), body = document.createElement("tbody");
    section.className = "diagnostic-grid";
    heading.textContent = grid.title;
    description.textContent = grid.description;
    toggle.type = "button";
    toggle.textContent = "Table view";
    toggle.setAttribute("aria-pressed", "false");
    wrap.className = "table-scroll aggregate-matrix";
    wrap.tabIndex = 0;
    wrap.setAttribute("role", "region");
    wrap.setAttribute("aria-label", grid.title);
    caption.textContent =
        (grid.rowLabel ?? "Expected") +
            " rows / " +
            (grid.columnLabel ?? "Selected") +
            " columns · " +
            grid.unit;
    table.append(caption);
    const rowNames = [...new Set(grid.cells.map((c) => c.row))].sort(), columnNames = [
        ...new Set(grid.cells.flatMap((c) => [
            c.column,
            ...(grid.unit === "expected-row questions" ? [c.row] : []),
        ])),
    ].sort(), lookup = new Map(grid.cells.map((c) => [JSON.stringify([c.row, c.column]), c]));
    const header = document.createElement("tr");
    for (const text of [
        (grid.rowLabel ?? "Expected") + " / " + (grid.columnLabel ?? "Selected"),
        ...columnNames,
    ]) {
        const th = document.createElement("th");
        th.scope = "col";
        th.textContent = text;
        header.append(th);
    }
    head.append(header);
    let page = 0;
    const count = document.createElement("p"), previous = document.createElement("button"), next = document.createElement("button");
    previous.type = next.type = "button";
    previous.textContent = "Previous rows";
    next.textContent = "Next rows";
    const draw = () => {
        body.replaceChildren();
        count.textContent =
            rowNames.length +
                " rows · page " +
                (page + 1) +
                "/" +
                Math.max(1, Math.ceil(rowNames.length / 12));
        previous.disabled = page === 0;
        next.disabled = (page + 1) * 12 >= rowNames.length;
        for (const row of rowNames.slice(page * 12, (page + 1) * 12)) {
            const tr = document.createElement("tr"), th = document.createElement("th");
            th.scope = "row";
            th.textContent = row;
            tr.append(th);
            const total = grid.cells.find((c) => c.row === row).n;
            for (const column of columnNames) {
                const td = document.createElement("td"), cell = lookup.get(JSON.stringify([row, column]));
                if (!cell) {
                    td.textContent =
                        grid.unit === "expected-row questions"
                            ? "0/" + total + " (0%)"
                            : "No observations";
                }
                else {
                    const b = document.createElement("button");
                    b.type = "button";
                    b.className = "matrix-value";
                    b.style.setProperty("--cell-share", String(cell.k / cell.n));
                    b.textContent =
                        cell.k +
                            "/" +
                            cell.n +
                            " (" +
                            Math.round((cell.k / cell.n) * 100) +
                            "%)";
                    b.setAttribute("aria-label", row + " → " + column + ": " + b.textContent + " " + grid.unit);
                    b.onclick = () => inspect(cell);
                    if (row === column && grid.unit === "expected-row questions")
                        b.append(document.createTextNode(" · Correct"));
                    td.append(b);
                }
                tr.append(td);
            }
            body.append(tr);
        }
    };
    toggle.onclick = () => {
        const plain = wrap.classList.toggle("matrix-table-view");
        toggle.textContent = plain ? "Heatmap view" : "Table view";
        toggle.setAttribute("aria-pressed", String(plain));
    };
    previous.onclick = () => {
        page--;
        draw();
    };
    next.onclick = () => {
        page++;
        draw();
    };
    draw();
    table.append(head, body);
    wrap.append(table);
    section.append(heading, description, toggle, wrap);
    if (rowNames.length > 12)
        section.append(count, previous, next);
    parent.append(section);
}
