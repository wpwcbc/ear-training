export const policy = Object.freeze({
    version: "insights-2.2",
    days: 28,
    minimum: 30,
    sessions: 3,
    daysMinimum: 3,
    width: 0.3,
    target: 0.8,
    timingMinimum: 20,
    replayThreshold: 0.4,
});
export function wilson(k, n) {
    if (!n)
        return null;
    const z = 1.96, p = k / n, d = 1 + (z * z) / n;
    const center = (p + (z * z) / (2 * n)) / d;
    const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
    return [Math.max(0, center - half), Math.min(1, center + half)];
}
export function evidenceLabel(n, k, sessions, days) {
    const interval = wilson(k, n);
    return !n
        ? "No evidence"
        : n < 10
            ? "Early signal"
            : n >= policy.minimum &&
                sessions >= policy.sessions &&
                days >= policy.daysMinimum &&
                interval &&
                interval[1] - interval[0] <= policy.width
                ? "Enough to guide practice"
                : "Building evidence";
}
export function quantile(values, fraction) {
    const sorted = values
        .filter((n) => Number.isFinite(n) && n >= 0)
        .sort((a, b) => a - b);
    if (!sorted.length)
        return null;
    const index = (sorted.length - 1) * fraction, floor = Math.floor(index);
    return (sorted[floor] + (sorted[Math.ceil(index)] - sorted[floor]) * (index - floor));
}
const dateFormatters = new Map();
const parsedDates = new Map(), formattedDays = new Map();
export function timestamp(value) {
    let n = parsedDates.get(value);
    if (n === undefined) {
        n = Date.parse(value);
        if (parsedDates.size >= 20000)
            parsedDates.clear();
        parsedDates.set(value, n);
    }
    return n;
}
export function compareId(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
}
export function dayKey(timestamp, timezone) {
    const key = timezone + "\0" + timestamp, previous = formattedDays.get(key);
    if (previous)
        return previous;
    let formatter = dateFormatters.get(timezone);
    if (!formatter) {
        formatter = new Intl.DateTimeFormat("en-CA", {
            timeZone: timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
        dateFormatters.set(timezone, formatter);
    }
    const result = formatter.format(new Date(timestamp));
    if (formattedDays.size >= 20000)
        formattedDays.clear();
    formattedDays.set(key, result);
    return result;
}
