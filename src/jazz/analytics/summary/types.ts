import type { Evidence } from "../types.js";
export type Category =
  | "weakness"
  | "relative-strength"
  | "confusion"
  | "specific-difficulty"
  | "comparable-trend"
  | "tentative-positive"
  | "descriptive-peer"
  | "coverage";
export type Level = "none" | "early" | "building" | "sufficient";
export interface InsightsQuery {
  mode: string;
  subtask: string;
  source: string;
  metricId: string;
  startInclusive: string | null;
  endExclusive: string | null;
  timezone: string;
  exposure: string;
  assistance: string;
  dataVersions: readonly string[];
  contextFilters: Readonly<Record<string, readonly string[]>>;
}
export interface EvidenceRef {
  schemaVersion: 1;
  id: string;
  dataRevision: string;
  computedAt: string;
  metricId: string;
  definitionVersion: string;
  cohortKeys: readonly string[];
  assessmentIds: readonly string[];
  itemIds: readonly string[];
  diagnosticQuestionIds: readonly string[];
  importedSourceRefs: readonly string[];
  querySnapshot: InsightsQuery;
  exclusions: Readonly<Record<string, number>>;
  policyVersion: string;
}
export interface Observation {
  row: Evidence;
  index: number;
  outcome: "correct" | "close" | "missed" | null;
  root: string;
  quality: string;
  degree: string;
  family: string;
}
export interface AggregateCell {
  queryScope?: string;
  schemaVersion: 1;
  id: string;
  parentId?: string;
  level: "degree" | "quality-degree" | "root-quality-degree" | "mode-specific";
  mode: string;
  subtask: string;
  source: Evidence["source"];
  grain: Evidence["grain"];
  metricId: string;
  label: string;
  quality?: string;
  degree?: string;
  numerator: number | null;
  denominator: number | null;
  selfRatings: { correct: number; close: number; missed: number };
  descriptiveItemCount: number;
  independentQuestionCount: number | null;
  sessions: number;
  localDays: number;
  wilson95: [number, number] | null;
  reliability: Level;
  stale: boolean;
  roots: { root: string; questionCount: number }[];
  contextState: "matched" | "mixed-descriptive" | "unknown";
  generalization: "root-specific" | "observed-roots" | "not-established";
  evidenceRefId: string;
  capabilityReasons: string[];
  observations: Observation[];
  sample: Observation[];
  rows: Evidence[];
  last: number;
  stratum?: boolean;
  aggregateEvidenceRefId?: string;
  qualityGuard?: import("./generalization.js").QualityGuard;
}
export interface Insight {
  actionId?: string;
  schemaVersion: 1;
  id: string;
  category: Category;
  certainty: "supported" | "tentative" | "descriptive" | "coverage";
  mode: string;
  subtask: string;
  source: string;
  metricId: string;
  cellId: string;
  templateId: string;
  templateVersion: 1;
  params: Readonly<Record<string, string | number>>;
  evidenceRefIds: readonly string[];
  comparisonId?: string;
  semanticKey: string;
  suppressedBy?: string;
  suppressionReason?: string;
}
export interface MatchedComparison {
  id: string;
  familyVersion: string;
  kind: "peer" | "period";
  leftEvidenceRefId: string;
  rightEvidenceRefId: string;
  matchedShareLeft: number;
  matchedShareRight: number;
  sharedStrata: string[];
  hasReversal: boolean;
  compatible: boolean;
  vetoReasons: string[];
}
export interface SummaryModel {
  revision: string;
  query: InsightsQuery;
  cells: AggregateCell[];
  refs: Map<string, EvidenceRef>;
  candidates: Insight[];
  statements: Insight[];
  recommendations: Insight[];
  comparisons: MatchedComparison[];
  reconciliation: {
    retained: number;
    normalized: number;
    nonSkipped: number;
    eligible: number;
    diagnostic: number | null;
    exclusions: Record<string, number>;
    excludedIds: Record<string, string[]>;
    diagnosticIds: string[];
  };
}
