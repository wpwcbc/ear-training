import { aggregate, eligible, independent } from "./metrics.js";
import { dayKey } from "./policy.js";
export function renderTrend(parent, rows, timezone, now = Date.now(), mixed = false) {
    const sample = independent(rows.filter((e) => eligible(e, now) && Date.parse(e.createdAt) >= now - 56 * 86400000));
    const groups = new Map();
    for (const e of sample) {
        const day = dayKey(e.createdAt, timezone), list = groups.get(day) ?? [];
        list.push(e);
        groups.set(day, list);
    }
    const points = [...groups]
        .map(([day, items]) => ({
        day,
        time: Math.min(...items.map((e) => Date.parse(e.createdAt))),
        stats: aggregate(items, timezone, now),
    }))
        .sort((a, b) => a.time - b.time);
    if (points.length < 2)
        return;
    const hasTime = points.some((p) => p.stats.median !== null);
    for (const metric of hasTime ? ["outcome", "timing"] : ["outcome"]) {
        const figure = document.createElement("figure"), caption = document.createElement("figcaption"), canvas = document.createElement("canvas");
        figure.className = "insight-trend";
        figure.dataset.metric = metric;
        figure.dataset.comparison = mixed ? "mixed" : "matched";
        caption.textContent =
            (metric === "outcome"
                ? rows[0].source === "self"
                    ? "Self-rated correct"
                    : "Recorded exact outcomes"
                : "Recorded active response / readiness median and p75 (seconds)") +
                " · " +
                rows[0].grain +
                " · " +
                rows[0].subtask +
                " · " +
                (mixed
                    ? "Mixed settings · practice mix changed; descriptive only, not evidence of improvement"
                    : rows[0].config.bpm +
                        " BPM · exact matched cohort · daily points are descriptive");
        canvas.width = 900;
        canvas.height = 240;
        canvas.setAttribute("role", "img");
        canvas.setAttribute("aria-label", caption.textContent +
            ". Values follow in the table. No-data days are gaps.");
        const ctx = canvas.getContext("2d");
        if (!ctx)
            continue;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, 900, 240);
        ctx.font = "14px Segoe UI";
        ctx.strokeStyle = "#cbd4d0";
        ctx.strokeRect(85, 20, 790, 175);
        const max = metric === "outcome"
            ? 1
            : Math.max(1, ...points.map((p) => (p.stats.p75 ?? 0) / 1000));
        const x = (time) => 85 + ((time - (now - 56 * 86400000)) / (56 * 86400000)) * 790, y = (n) => 195 - (n / max) * 175;
        ctx.fillStyle = "#53635e";
        ctx.fillText(metric === "outcome" ? "100%" : max.toFixed(1) + "s", 15, 30);
        ctx.fillText(metric === "outcome" ? "0%" : "0s", 40, 197);
        for (const p of points) {
            const value = metric === "outcome"
                ? p.stats.correct / p.stats.eligibleCount
                : p.stats.median === null
                    ? null
                    : p.stats.median / 1000;
            if (value === null)
                continue;
            ctx.strokeStyle = metric === "outcome" ? "#236b56" : "#965b25";
            ctx.fillStyle = ctx.strokeStyle;
            if (metric === "outcome" && p.stats.interval && !mixed) {
                ctx.beginPath();
                ctx.moveTo(x(p.time), y(p.stats.interval[0]));
                ctx.lineTo(x(p.time), y(p.stats.interval[1]));
                ctx.stroke();
            }
            ctx.beginPath();
            ctx.arc(x(p.time), y(value), 4, 0, 2 * Math.PI);
            ctx.fill();
            if (metric === "timing" && p.stats.p75 !== null) {
                ctx.fillRect(x(p.time) - 3, y(p.stats.p75 / 1000) - 3, 6, 6);
            }
        }
        ctx.fillStyle = "#53635e";
        ctx.fillText(dayKey(new Date(now - 56 * 86400000).toISOString(), timezone), 85, 225);
        ctx.fillText(dayKey(new Date(now).toISOString(), timezone), 770, 225);
        const details = document.createElement("details"), summary = document.createElement("summary"), wrap = document.createElement("div"), table = document.createElement("table"), head = document.createElement("thead"), header = document.createElement("tr"), body = document.createElement("tbody");
        summary.textContent =
            "Daily values and sample sizes (no-data days are gaps)";
        wrap.className = "table-scroll";
        wrap.setAttribute("role", "region");
        wrap.setAttribute("aria-label", metric + " daily values");
        wrap.tabIndex = 0;
        const labels = metric === "outcome"
            ? [
                "Local day",
                "Correct / diagnostic questions",
                mixed ? "Comparability" : "Wilson 95%",
                "Source / grain",
            ]
            : [
                "Local day",
                "Median seconds",
                "p75 seconds",
                "Valid timing n / definition",
            ];
        for (const text of labels) {
            const th = document.createElement("th");
            th.scope = "col";
            th.textContent = text;
            header.append(th);
        }
        head.append(header);
        for (const p of points) {
            const tr = document.createElement("tr");
            const values = metric === "outcome"
                ? [
                    p.day,
                    p.stats.correct + "/" + p.stats.eligibleCount,
                    mixed
                        ? "Mixed settings; descriptive only"
                        : (p.stats.interval
                            ?.map((v) => (v * 100).toFixed(1) + "%")
                            .join(" to ") ?? "No observations"),
                    rows[0].source + " / " + rows[0].grain,
                ]
                : [
                    p.day,
                    p.stats.median === null
                        ? "Not recorded"
                        : (p.stats.median / 1000).toFixed(2),
                    p.stats.p75 === null
                        ? "Not recorded"
                        : (p.stats.p75 / 1000).toFixed(2),
                    p.stats.timingCount +
                        " / " +
                        (rows[0].record.analytics?.timingVersion ??
                            "legacy time excluded"),
                ];
            for (const value of values) {
                const td = document.createElement("td");
                td.textContent = value;
                tr.append(td);
            }
            body.append(tr);
        }
        table.append(head, body);
        wrap.append(table);
        details.append(summary, wrap);
        figure.append(caption, canvas, details);
        parent.append(figure);
    }
}
