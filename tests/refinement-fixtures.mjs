import { assessment, supportedParent, query } from "./summary-fixtures.mjs";
export const asOf = Date.parse("2026-10-22T04:00:00Z");
export const refinementQuery = {
  ...query,
  endExclusive: "2026-10-22T16:00:00.000Z",
};
// Synthetic reconstruction, not a recovered explanation of the user's records.
export function currentUI() {
  const specs = [
    ["m7", "11", 5, 7],
    ["7", "13", 3, 6],
    ["7", "3", 10, 13],
    ["maj7", "3", 13, 14],
    ["7", "9", 5, 5],
    ["m7", "b3", 20, 20],
    ["7", "b7", 12, 13],
    ["m7", "b7", 17, 18],
    ["maj7", "maj7", 14, 14],
  ];
  const rows = [];
  for (const [quality, degree, k, n] of specs)
    for (let j = 0; j < n; j++) {
      const i = rows.length;
      rows.push(
        assessment(i, {
          idPrefix: "current-ui-m1",
          quality,
          degree,
          grade: j < k ? "correct" : "missed",
          root: ["D", "G", "C", "F", "A"][i % 5],
          config: { bpm: i % 2 ? 80 : 100 },
        }),
      );
    }
  const dayOne = new Set(
    [
      ...rows.filter((e) => e.record.grade === "correct").slice(0, 23),
      ...rows.filter((e) => e.record.grade === "missed").slice(0, 6),
    ].map((e) => e.id),
  );
  for (const e of rows) {
    const day = dayOne.has(e.id) ? "20" : "21",
      time = `2026-10-${day}T04:00:00.000Z`;
    e.createdAt = e.record.timestamp = e.session.timestamp = time;
    e.sessionId = e.session.id =
      "current-ui-m1:session:" + day + ":" + e.config.bpm;
  }
  for (const e of rows
    .filter((e) => e.record.grade === "correct")
    .slice(0, 2)) {
    const retry = structuredClone(e);
    retry.id += ":reassessment";
    retry.attemptOrdinal = 2;
    rows.push(retry);
  }
  const skip = assessment(112, { idPrefix: "current-ui-m1", grade: "skipped" });
  skip.createdAt =
    skip.record.timestamp =
    skip.session.timestamp =
      "2026-10-21T04:00:00.000Z";
  rows.push(skip);
  return rows;
}
export function fixtureLedger() {
  return {
    fixture: "current-ui-m1",
    provenance:
      "Synthetic reconstruction: two correct reassessments share existing question IDs. Not an explanation recovered from real history.",
    asOf: new Date(asOf).toISOString(),
    timezone: "Asia/Hong_Kong",
    records: currentUI().map((e) => ({
      id: e.id,
      questionId: e.questionId,
      sessionId: e.sessionId,
      cohortKey: e.cohortKey,
      createdAt: e.createdAt,
      grade: e.record.grade,
      quality: e.config.quality,
      degree: e.config.degree,
      root: e.config.root,
      attemptOrdinal: e.attemptOrdinal,
    })),
  };
}
export const unknownIdentity = () =>
  currentUI()
    .slice(0, 7)
    .map((e) => ({
      ...e,
      questionId: null,
      capabilities: { ...e.capabilities, identity: false },
    }));
export const rootImbalanced = () =>
  Array.from({ length: 50 }, (_, i) =>
    assessment(i, { root: i < 40 ? "D" : i < 45 ? "G" : "C" }),
  );
export const sufficient = supportedParent;
export const stale = () =>
  supportedParent().map((e) => ({ ...e, createdAt: "2026-07-01T04:00:00Z" }));
export const empty = () => [];
export const matched = () => [
  ...supportedParent(),
  ...supportedParent().map((_, i) =>
    assessment(i, {
      idPrefix: "matched-peer",
      degree: "b3",
      grade: "correct",
      root: ["D", "G", "C", "F", "A"][Math.floor(i / 10)],
    }),
  ),
];
