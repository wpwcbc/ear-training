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
export function wilson(k: number, n: number): [number, number] | null {
  if (!n) return null;
  const z = 1.96,
    p = k / n,
    d = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / d;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, center - half), Math.min(1, center + half)];
}
export function evidenceLabel(
  n: number,
  k: number,
  sessions: number,
  days: number,
): string {
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
export function quantile(values: number[], fraction: number): number | null {
  const sorted = values
    .filter((n) => Number.isFinite(n) && n >= 0)
    .sort((a, b) => a - b);
  if (!sorted.length) return null;
  const index = (sorted.length - 1) * fraction,
    floor = Math.floor(index);
  return (
    sorted[floor] + (sorted[Math.ceil(index)] - sorted[floor]) * (index - floor)
  );
}
export function dayKey(timestamp: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}
