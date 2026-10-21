import type { Evidence } from "./types.js";
import { aggregate, eligible, independent } from "./metrics.js";
import { dayKey } from "./policy.js";

export interface CalendarWindow {
  startInclusive: string | null;
  endExclusive: string;
  asOf: number;
  timezone: string;
}
function shift(day: string, offset: number) {
  return new Date(Date.parse(day + "T12:00:00Z") + offset * 86400000)
    .toISOString()
    .slice(0, 10);
}
const midnights = new Map<string, number>();
export function midnight(day: string, timezone: string): number {
  const key = timezone + "\0" + day,
    cached = midnights.get(key);
  if (cached !== undefined) return cached;
  const target = Date.parse(day + "T00:00:00Z");
  let low = target - 36 * 3600000,
    high = target + 36 * 3600000;
  // First valid instant of the local date, even when a DST jump skips midnight.
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (dayKey(new Date(middle).toISOString(), timezone) < day)
      low = middle + 1;
    else high = middle;
  }
  if (midnights.size >= 1024) midnights.clear();
  midnights.set(key, low);
  return low;
}
export function resolveWindow(
  asOf: number,
  timezone: string,
  days: number | null,
): CalendarWindow {
  const today = dayKey(new Date(asOf).toISOString(), timezone);
  return {
    startInclusive:
      days === null
        ? null
        : new Date(midnight(shift(today, 1 - days), timezone)).toISOString(),
    endExclusive: new Date(midnight(shift(today, 1), timezone)).toISOString(),
    asOf,
    timezone,
  };
}
export function inWindow(date: string, window: CalendarWindow) {
  const time = Date.parse(date);
  return (
    Number.isFinite(time) &&
    time <= window.asOf &&
    time < Date.parse(window.endExclusive) &&
    (window.startInclusive === null ||
      time >= Date.parse(window.startInclusive))
  );
}
export function dailyResults(rows: Evidence[], window: CalendarWindow) {
  const groups = new Map<string, Evidence[]>();
  for (const e of independent(
    rows.filter(
      (e) => inWindow(e.createdAt, window) && eligible(e, window.asOf),
    ),
  )) {
    const key = dayKey(e.createdAt, window.timezone),
      list = groups.get(key) ?? [];
    list.push(e);
    groups.set(key, list);
  }
  return [...groups]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([day, items]) => ({
      day,
      time: midnight(day, window.timezone),
      stats: aggregate(items, window.timezone, window.asOf),
    }));
}
export function trendDensity(counts: number[]) {
  return counts.length === 0
    ? "empty"
    : counts.length === 1
      ? "single"
      : counts.length >= 7 && counts.filter((n) => n >= 5).length >= 3
        ? "chart"
        : "table";
}
