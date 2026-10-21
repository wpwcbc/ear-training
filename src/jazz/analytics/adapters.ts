import type { Session, RecordEntry, StorageLike } from "../model.js";
import { parseChord } from "../theory.js";
import {
  task,
  grain,
  hash,
  analyticsCohortKey,
  type Evidence,
} from "./types.js";
export function normalize(
  session: Session,
  record: RecordEntry,
  index: number,
): Evidence {
  if (
    !record ||
    !record.config ||
    !/^m[1-7]$/.test(record.mode) ||
    !["self", "automatic"].includes(record.gradingSource) ||
    !["correct", "close", "missed", "skipped"].includes(record.grade) ||
    !Array.isArray(record.targets) ||
    !record.targets.length ||
    !Array.isArray(record.chords) ||
    record.chords.length !== record.targets.length
  )
    throw new Error("Invalid assessment");
  record.chords.forEach(parseChord);
  const capture = record.analytics;
  const candidate =
    record.questionIndex === undefined
      ? undefined
      : session.questions?.[record.questionIndex];
  const scope =
    candidate &&
    (record.mode === "m4" ||
      (record.mode === "m5" && record.config.runMode === "step"))
      ? candidate.targets.slice(record.chordStep, (record.chordStep ?? 0) + 1)
      : candidate?.targets;
  const flattened = scope?.flatMap((t) => [
    { chord: t.chord.symbol, degree: t.degree },
    ...(t.secondDegree
      ? [{ chord: t.chord.symbol, degree: t.secondDegree }]
      : []),
  ]);
  const aligned =
    flattened?.length === record.targets.length &&
    flattened.every(
      (t, i) => t.degree === record.targets[i] && t.chord === record.chords[i],
    );
  const challenge = aligned ? candidate : undefined;
  const questionId =
    capture?.questionId ??
    (challenge ? `${session.id}:q${record.questionIndex}` : null);
  const config = capture?.effectiveConfig ?? record.config;
  const exposure = session.source?.includes("review")
    ? "exact-review"
    : session.source?.startsWith("insight:")
      ? "targeted"
      : "fresh";
  const version = capture ? "standard" : "historical";
  const source =
    capture?.assessmentSource === "visual" ? "visual" : record.gradingSource;
  return {
    schemaVersion: 2,
    stimulusHash: hash(
      challenge ?? {
        chords: record.chords,
        targets: record.targets,
        midis: record.actualMidis,
      },
    ),
    id: capture?.id ?? `v1:${session.id}:${index}`,
    sessionId: session.id,
    questionId,
    mode: record.mode,
    subtask: task(config),
    grain: grain(config),
    createdAt: record.timestamp,
    source,
    exposure,
    assistance:
      record.referenceAssisted === undefined
        ? "unknown"
        : record.referenceAssisted
          ? "reference"
          : "none",
    attemptOrdinal:
      capture?.attemptOrdinal ?? (record.referenceAssisted ? 2 : 1),
    config,
    record: structuredClone(record),
    challenge: challenge && structuredClone(challenge),
    session: structuredClone({
      ...session,
      records: [],
      questions: undefined,
      progress: undefined,
    }),
    cohortKey: analyticsCohortKey(
      config,
      {
        generator: session.generatorVersion ?? "legacy",
        ...(capture?.choicePolicy
          ? { choicePolicy: capture.choicePolicy }
          : {}),
        assessedScope:
          record.mode === "m4" ||
          (record.mode === "m5" && config.runMode === "step")
            ? {
                step: record.chordStep,
                chords: record.chords,
                targets: record.targets,
              }
            : grain(config),
        material: challenge ?? {
          chords: record.chords,
          targets: record.targets,
          midis: record.actualMidis,
        },
        customs: session.customSnapshot ?? [],
      },
      source,
      exposure,
      capture?.timingVersion ?? "legacy-seconds",
      capture?.answerOptions,
    ),
    version,
    capabilities: {
      identity: !!questionId,
      selections: !!record.selectedDegrees,
      timing:
        capture?.validity === "valid" &&
        typeof capture.activeMs === "number" &&
        Number.isFinite(capture.activeMs) &&
        capture.activeMs >= 0,
      marks: !!capture?.marks,
      position: !!capture?.position,
    },
    rawSource: { key: "jazzEarLab:v1:sessions", index, hash: hash(record) },
  };
}
export interface LegacyData {
  id: string;
  title: string;
  key: string;
  rows: Record<string, unknown>[];
  tests: Record<string, unknown>[];
  invalid: number;
  rawQuestions?: string | null;
  rawTests?: string | null;
  error?: string;
}
export function legacyData(storage: StorageLike): LegacyData[] {
  return [
    ["degree", "Degree", "eartrain:"],
    ["interval", "Interval", "eartrain:interval:"],
    ["chord-quality", "Chord Quality", "eartrain:chordQuality:"],
    ["progression-id", "Progression ID", "eartrain:progressionId:"],
  ].map(([id, title, prefix]) => {
    const result: LegacyData = {
      id,
      title,
      key: prefix + "questionHistory",
      rows: [],
      tests: [],
      invalid: 0,
      rawQuestions: storage.getItem(prefix + "questionHistory"),
      rawTests: storage.getItem(prefix + "testHistory"),
    };
    try {
      const raw: unknown = JSON.parse(storage.getItem(result.key) ?? "[]");
      const tests: unknown = JSON.parse(
        storage.getItem(prefix + "testHistory") ?? "[]",
      );
      if (!Array.isArray(raw) || !Array.isArray(tests))
        throw new Error("Unsupported saved format");
      result.rows = raw.filter(
        (r) =>
          r &&
          typeof r === "object" &&
          Number.isInteger(r.attempts) &&
          r.attempts >= 1,
      );
      result.invalid = raw.length - result.rows.length;
      result.tests = tests.filter((t) => t && typeof t === "object");
    } catch (error) {
      result.error = String(error);
    }
    return result;
  });
}
