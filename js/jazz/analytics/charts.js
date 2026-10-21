import { aggregate, eligible, independent } from "./metrics.js";
import { dayKey } from "./policy.js";
export function renderTrend(parent, rows, timezone, now = Date.now()) {
    const sample = independent(rows.filter((e) => eligible(e, now) && Date.parse(e.createdAt) >= now - 56 * 86400000));
    const groups = new Map();
    for (const row of sample) {
        const day = dayKey(row.createdAt, timezone), group = groups.get(day) ?? [];
        group.push(row);
        groups.set(day, group);
    }
    if (groups.size < 2)
        return;
    const points = [...groups]
        .map(([day, items]) => ({
        day,
        time: Math.min(...items.map((e) => Date.parse(e.createdAt))),
        stats: aggregate(items, timezone, now),
    }))
        .sort((a, b) => a.time - b.time);
    const figure = document.createElement("figure"), caption = document.createElement("figcaption");
    caption.textContent = `${rows[0].record.chords.join(" / ")} · ${rows[0].record.targets.join(" / ")} · ${rows[0].subtask} · ${rows[0].config.bpm} BPM · ${rows[0].config.hintLevel} hints`;
    figure.append(caption);
    figure.className = "insight-trend";
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 320;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Comparable daily outcomes and active decision time. Daily counts and values follow in the table.");
    const ctx = canvas.getContext("2d");
    if (!ctx)
        return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 900, 320);
    ctx.font = "14px Segoe UI";
    ctx.fillStyle = "#253a32";
    ctx.fillText(rows[0].source === "visual"
        ? "Exact visual mapping / committed positions"
        : rows[0].source === "self"
            ? "Self-rated correct / submitted ratings"
            : "Exact recognition / submitted answers", 20, 25);
    ctx.fillText("Active decision median (seconds), valid new capture only", 20, 177);
    const first = now - 56 * 86400000, x = (time) => 90 + ((time - first) / (56 * 86400000)) * 780;
    ctx.strokeStyle = "#cbd4d0";
    for (const top of [40, 192]) {
        ctx.strokeRect(90, top, 780, 90);
    }
    const maxTime = Math.max(1, ...points.map((p) => (p.stats.median ?? 0) / 1000));
    for (const p of points) {
        if (p.stats.eligibleCount) {
            ctx.fillStyle =
                p.stats.label === "Enough to guide practice" ? "#24745a" : "#68756f";
            ctx.fillRect(x(p.time) - 3, 130 - (90 * p.stats.correct) / p.stats.eligibleCount, 6, (90 * p.stats.correct) / p.stats.eligibleCount);
            ctx.beginPath();
            ctx.arc(x(p.time), 130 - (90 * p.stats.correct) / p.stats.eligibleCount, 3, 0, 2 * Math.PI);
            ctx.fill();
        }
        if (p.stats.median !== null) {
            ctx.fillStyle = "#9a5a28";
            ctx.fillRect(x(p.time) - 3, 282 - (90 * (p.stats.median / 1000)) / maxTime, 6, (90 * (p.stats.median / 1000)) / maxTime);
        }
    }
    ctx.fillStyle = "#53635e";
    ctx.fillText("100%", 32, 50);
    ctx.fillText("0%", 50, 132);
    ctx.fillText(maxTime.toFixed(1) + "s", 32, 202);
    ctx.fillText("0s", 50, 284);
    ctx.fillText(dayKey(new Date(first).toISOString(), timezone), 90, 307);
    ctx.fillText(dayKey(new Date(now).toISOString(), timezone), 770, 307);
    figure.append(canvas);
    const details = document.createElement("details"), summary = document.createElement("summary");
    summary.textContent = "Daily values and sample sizes (no-data days are gaps)";
    details.append(summary);
    const wrap = document.createElement("div");
    wrap.className = "table-scroll";
    const table = document.createElement("table"), head = document.createElement("thead"), header = document.createElement("tr");
    for (const label of [
        "Local day",
        "Correct / questions",
        "Decision median",
        "Valid timing n",
    ]) {
        const th = document.createElement("th");
        th.scope = "col";
        th.textContent = label;
        header.append(th);
    }
    head.append(header);
    table.append(head);
    const body = document.createElement("tbody");
    for (const p of points) {
        const tr = document.createElement("tr");
        for (const text of [
            p.day,
            `${p.stats.correct}/${p.stats.eligibleCount}`,
            p.stats.median === null
                ? "Unavailable"
                : (p.stats.median / 1000).toFixed(1) + "s",
            String(p.stats.timingCount),
        ]) {
            const td = document.createElement("td");
            td.textContent = text;
            tr.append(td);
        }
        body.append(tr);
    }
    table.append(body);
    wrap.append(table);
    details.append(wrap);
    figure.append(details);
    parent.append(figure);
}
