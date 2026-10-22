import { dayKey } from "./policy.js";
import { dailyResults, resolveWindow, trendDensity } from "./windows.js";
export function renderTrend(parent, rows, timezone, now = Date.now(), mixed = false, window = resolveWindow(now, timezone, 28), locale = "en") {
    const zh = locale === "zh-Hant";
    const points = dailyResults(rows, window), density = trendDensity(points.map((p) => p.stats.eligibleCount));
    if (!points.length) {
        const status = document.createElement("p");
        status.textContent = "No dated diagnostic outcomes in this window.";
        parent.append(status);
        return;
    }
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
        if (rows[0].mode === "m1" && metric === "outcome")
            caption.textContent = zh
                ? "自評正確 · 診斷首次作答樣本 · " +
                    (mixed
                        ? "不同設定，僅供描述，尚不足以證實進步"
                        : "同一已知設定；每日數值僅供描述")
                : "Self-rated correct · diagnostic first-question sample · " +
                    (mixed
                        ? "Mixed settings · descriptive only, not evidence of improvement"
                        : "Known matched settings; daily points are descriptive");
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
        const start = window.startInclusive
            ? Date.parse(window.startInclusive)
            : points[0].time, end = window.startInclusive === null
            ? Date.parse(resolveWindow(points[points.length - 1].time, timezone, 1)
                .endExclusive)
            : Date.parse(window.endExclusive);
        const x = (time) => 85 + ((time - start) / Math.max(1, end - start)) * 790, y = (n) => 195 - (n / max) * 175;
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
        ctx.fillText(dayKey(new Date(start).toISOString(), timezone), 85, 225);
        ctx.fillText(dayKey(new Date(end - 1).toISOString(), timezone), 770, 225);
        const details = document.createElement("details"), summary = document.createElement("summary"), wrap = document.createElement("div"), table = document.createElement("table"), head = document.createElement("thead"), header = document.createElement("tr"), body = document.createElement("tbody");
        summary.textContent =
            "Daily values and sample sizes (no-data days are gaps)";
        details.open = density !== "chart";
        wrap.className = "table-scroll";
        wrap.setAttribute("role", "region");
        wrap.setAttribute("aria-label", metric + " daily values");
        wrap.tabIndex = 0;
        const labels = metric === "outcome"
            ? zh
                ? ["本地日期", "正確 / 診斷題數", "比例"]
                : ["Local day", "Correct / diagnostic questions", "Rate"]
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
                    new Intl.NumberFormat(undefined, {
                        style: "percent",
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                    }).format(p.stats.correct / p.stats.eligibleCount),
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
        figure.dataset.density = density;
        figure.append(caption);
        if (density === "chart")
            figure.append(canvas);
        else if (points.length >= 3) {
            const plot = document.createElement("details"), label = document.createElement("summary");
            label.textContent = "Daily dot plot";
            plot.append(label, canvas);
            figure.append(plot);
        }
        figure.append(details);
        if (metric === "outcome" && mixed) {
            const note = document.createElement("p");
            note.textContent = zh
                ? `資料來自 ${points.length} 個日曆日，設定有所不同。這些結果尚不足以確立進步。`
                : `${points.length} recorded ${points.length === 1 ? "day" : "days"}; settings differ. These results do not establish improvement.`;
            figure.append(note);
        }
        parent.append(figure);
    }
}
