import { defaults, generate } from "../js/jazz/model.js";
import { normalize } from "../js/jazz/analytics/adapters.js";
export const now = Date.parse("2026-10-21T12:00:00Z");
export const query = {
  mode: "m1",
  subtask: "produce",
  source: "self",
  metricId: "outcome",
  startInclusive: null,
  endExclusive: new Date(now).toISOString(),
  timezone: "Asia/Hong_Kong",
  exposure: "fresh",
  assistance: "none",
  dataVersions: ["standard", "historical"],
  contextFilters: {},
};
export function assessment(
  i,
  {
    root = "D",
    degree = "11",
    quality = "m7",
    mode = "m1",
    grade = i % 2 ? "missed" : "correct",
    config: extra = {},
    idPrefix = "synthetic",
    ...overrides
  } = {},
) {
  const config = {
    ...defaults,
    mode,
    root,
    roots: root,
    rootOrder: "fixed",
    quality,
    qualityPool: [quality],
    degree,
    degreePool: [degree, "9"],
    ...extra,
  };
  const challenge = generate(config, 0, [], () => 0.1),
    date = new Date(now - (i % 5) * 86400000 - 1000).toISOString();
  const record = {
    mode,
    config,
    questionIndex: 0,
    chordStep: mode === "m4" ? 1 : 0,
    timestamp: date,
    chords: challenge.targets.map((t) => t.chord.symbol),
    targets: challenge.targets.map((t) => t.degree),
    actualNotes: challenge.targets.map((t) => t.name),
    actualMidis: challenge.targets.map((t) => t.midi),
    progressionId: challenge.progressionId,
    gradingSource:
      mode === "m2" || (mode === "m3" && config.commonMode === "recognize")
        ? "automatic"
        : "self",
    grade,
    responseLatency: 1,
    replayCount: 0,
    referenceAssisted: false,
  };
  if (record.gradingSource === "automatic")
    record.selectedDegrees = record.targets.map((d, j) =>
      grade === "correct" ? d : "9",
    );
  const session = {
    id: idPrefix + ":session" + (i % 5),
    timestamp: date,
    mode,
    config,
    questionCount: 10,
    completedCount: 1,
    totalTime: 1,
    records: [record],
    questions: [challenge],
    generatorVersion: "jazz-1",
  };
  const e = normalize(session, record, 0);
  e.id = idPrefix + ":assessment" + i;
  e.questionId = idPrefix + ":question" + i;
  e.capabilities.identity = true;
  e.createdAt = date;
  return { ...e, ...overrides };
}
export function supportedParent() {
  return Array.from({ length: 50 }, (_, i) =>
    assessment(i, { root: ["D", "G", "C", "F", "A"][Math.floor(i / 10)] }),
  );
}
export function screenshot113() {
  const rows = Array.from({ length: 110 }, (_, i) =>
    assessment(i, {
      degree: i < 50 ? "11" : "b3",
      grade: i < 11 ? "missed" : "correct",
      root: ["D", "G", "C", "F", "A"][i % 5],
    }),
  );
  for (let i = 0; i < 2; i++) {
    const e = structuredClone(rows[20 + i]);
    e.id += ":retry";
    e.attemptOrdinal = 2;
    e.record.grade = "correct";
    rows.push(e);
  }
  rows.push(assessment(112, { grade: "skipped" }));
  return rows;
}
