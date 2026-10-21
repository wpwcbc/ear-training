import type { Config, Challenge, RecordEntry, Session } from "../model.js";
export type Grain =
  "answer" | "sequence" | "transition" | "target-pair" | "run" | "phrase-stage";
export interface Capture {
  id: string;
  questionId: string;
  attemptOrdinal: number;
  createdAt: string;
  effectiveConfig: Config;
  timingVersion: string;
  activeMs: number | null;
  validity: "valid" | "interrupted" | "unknown";
  reasons: string[];
  contextReplays: number;
  referenceReplays: number;
  ready?: boolean;
  marks?: { expected: number[]; selected: number[] };
  stageRatings?: {
    stage: number;
    grade: "correct" | "close" | "missed";
    committedAt: string;
  }[];
  position?: {
    string: string;
    fret: number;
    midi: number;
    expectedMidi: number;
  };
  answerOptions?: string[][];
}
export interface Evidence {
  stimulusHash?: string;
  schemaVersion: 2;
  id: string;
  sessionId: string;
  questionId: string | null;
  mode: string;
  subtask: string;
  grain: Grain;
  createdAt: string;
  source: "self" | "automatic";
  exposure: "fresh" | "targeted" | "exact-review";
  assistance: "none" | "reference" | "unknown";
  attemptOrdinal: number;
  config: Config;
  record: RecordEntry;
  challenge?: Challenge;
  session: Session;
  cohortKey: string;
  version: "historical" | "standard";
  capabilities: {
    identity: boolean;
    selections: boolean;
    timing: boolean;
    marks: boolean;
    position: boolean;
  };
  rawSource: { key: string; index: number; hash: string };
}
export function stable(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => JSON.stringify(k) + ":" + stable(v))
        .join(",") +
      "}"
    );
  return JSON.stringify(value) ?? "null";
}
export function hash(value: unknown): string {
  let n = 2166136261;
  for (const c of stable(value)) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return (n >>> 0).toString(16);
}
export function task(config: Config): string {
  switch (config.mode) {
    case "m2":
      return config.showChords ? "visible" : "hidden";
    case "m3":
      return config.commonMode;
    case "m5":
      return config.runMode + "-" + config.targetPattern;
    case "m7":
      return config.bassTask;
    case "m6":
      return "whole-activity";
    default:
      return config.mode === "m4" ? config.revealMode : "produce";
  }
}
export function grain(config: Config): Grain {
  return config.mode === "m3"
    ? "sequence"
    : config.mode === "m4"
      ? "transition"
      : config.mode === "m5"
        ? config.runMode === "continuous"
          ? "run"
          : config.targetPattern === "two"
            ? "target-pair"
            : "transition"
        : config.mode === "m6"
          ? "run"
          : "answer";
}
export function analyticsCohortKey(
  config: Config,
  material: unknown,
  source: string,
  exposure: string,
  version: string,
  options?: string[][],
): string {
  const normalized = { ...config } as Record<string, unknown>;
  for (const key of ["volume", "count", "autoAdvance", "prepareSeconds"])
    delete normalized[key];
  return stable({
    version: 1,
    config: normalized,
    material,
    source,
    exposure,
    timing: version,
    options,
  });
}
