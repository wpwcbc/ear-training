import type { Evidence } from "../types.js";
export function registry(
  e: Pick<Evidence, "mode" | "subtask" | "source" | "grain">,
) {
  if (!/^m[1-7]$/.test(e.mode))
    return {
      schemaVersion: 1,
      mode: e.mode,
      subtask: e.subtask,
      outcomeAxes:
        e.mode === "degree"
          ? ["upper-degree", "quality"]
          : e.mode === "interval"
            ? ["interval", "quality"]
            : e.mode === "chord-quality"
              ? ["quality", "voicing"]
              : [],
      degreeUse: e.mode === "progression-id" ? "exposure-only" : "unsupported",
      templateId:
        e.mode === "progression-id"
          ? "legacy-progression"
          : e.mode === "drone"
            ? "drone"
            : "legacy",
      drillCompilerId: null,
    } as const;
  const degreeOutcome =
    ["m1", "m2", "m7"].includes(e.mode) ||
    (e.mode === "m3" && e.subtask === "recognize");
  return {
    schemaVersion: 1,
    mode: e.mode,
    subtask: e.subtask,
    outcomeAxes: degreeOutcome
      ? ["quality", "degree", "root"]
      : e.mode === "m4"
        ? ["transition", "window"]
        : e.mode === "m6"
          ? ["phrase", "stage", "variation"]
          : ["progression", "pattern", "position"],
    degreeUse: degreeOutcome ? "outcome" : "exposure-only",
    templateId:
      e.mode === "m1"
        ? "m1"
        : e.mode === "m2"
          ? "m2"
          : e.mode === "m3"
            ? e.subtask === "recognize"
              ? "m3-recognize"
              : "m3-produce"
            : e.mode === "m4"
              ? "m4"
              : e.mode === "m5"
                ? e.subtask.startsWith("continuous")
                  ? "m5-run"
                  : "m5-step"
                : e.mode === "m6"
                  ? e.subtask === "whole-activity"
                    ? "m6-whole"
                    : "m6-stage"
                  : e.source === "visual"
                    ? "m7-mapping"
                    : "m7-self",
    drillCompilerId: /^m[1-7]$/.test(e.mode) ? "insights-schedule-1" : null,
  } as const;
}
