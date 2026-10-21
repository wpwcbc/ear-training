import { parseChord } from "../theory.js";
import type { Evidence } from "./types.js";
import { hash, stable } from "./types.js";
import { eligible } from "./metrics.js";
import { policy, evidenceLabel, wilson, dayKey } from "./policy.js";
import { summaryPolicy as p } from "./summary/policy.js";
import { registry } from "./summary/registry.js";
import type {
  AggregateCell,
  Observation,
  EvidenceRef,
  InsightsQuery,
} from "./summary/types.js";
const uniq = (values: string[]) => [...new Set(values)].sort();
const dayFormats = new Map<string, Intl.DateTimeFormat>();
function localDay(date: string, zone: string) {
  let fmt = dayFormats.get(zone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    dayFormats.set(zone, fmt);
  }
  return fmt.format(new Date(date));
}
const cohortHashes = new Map<string, string>();
export function dataRevision(rows: Evidence[]): string {
  const fingerprint = (key: string) => {
    let h = cohortHashes.get(key);
    if (!h) {
      h = hash(key);
      if (cohortHashes.size > 16000) cohortHashes.clear();
      cohortHashes.set(key, h);
    }
    return h;
  };
  return hash(
    rows
      .map((e) => [
        e.id,
        e.questionId,
        e.createdAt,
        fingerprint(e.cohortKey),
        e.mode,
        e.subtask,
        e.source,
        e.grain,
        e.version,
        e.capabilities,
        e.stimulusHash,
        e.record.grade,
        e.record.selectedDegrees,
        e.record.selectedQualities,
        e.record.analytics,
        e.assistance,
        e.exposure,
      ])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
  );
}
// This is a presentation projection, never a replacement for the exact cohort key.
export function comparisonFamily(e: Evidence, peer = false): string {
  const config = { ...e.config } as Record<string, unknown>;
  for (const k of [
    "root",
    "roots",
    "rootOrder",
    "volume",
    "count",
    "autoAdvance",
    "prepareSeconds",
  ])
    delete config[k];
  if (peer) for (const k of ["degree", "degreePool"]) delete config[k];
  const options = e.record.analytics?.answerOptions;
  if (e.source === "automatic" && !options?.length) return "unknown";
  const choiceFamily = options?.map((set) => [...set].sort());
  let generator: unknown = "unknown";
  try {
    generator =
      JSON.parse(e.cohortKey).material?.generator ??
      e.session.generatorVersion ??
      "legacy";
  } catch {
    return "unknown";
  }
  return stable({
    version: "root-projection-1",
    comparisonFamily: peer ? "tested-label-substitution-1" : "exact-choices-1",
    config,
    mode: e.mode,
    task: e.subtask,
    source: e.source,
    grain: e.grain,
    exposure: e.exposure,
    assistance: e.assistance,
    recording: e.version,
    timing: e.record.analytics?.timingVersion ?? "legacy-seconds",
    generator,
    choiceFamily,
  });
}
export function metricId(e: Evidence) {
  return e.source === "visual"
    ? "visual-mapping-exactness"
    : e.source === "self"
      ? "self-rating-consistency"
      : e.mode === "m3"
        ? "recognition-item"
        : !e.config.showChords
          ? "joint-recognition"
          : "degree-recognition";
}
function ordered(items: Observation[]) {
  return [...items].sort(
    (a, b) =>
      (a.row.record.chordStep ?? 0) - (b.row.record.chordStep ?? 0) ||
      a.index - b.index ||
      a.row.createdAt.localeCompare(b.row.createdAt) ||
      a.row.id.localeCompare(b.row.id),
  );
}
export function diagnosticSample(
  items: Observation[],
  now: number,
): Observation[] {
  const seen = new Set<string>();
  return ordered(items).filter((o) => {
    const e = o.row;
    if (
      !eligible(e, now) ||
      !e.capabilities.identity ||
      !e.questionId ||
      o.outcome === null ||
      seen.has(e.questionId)
    )
      return false;
    seen.add(e.questionId);
    return true;
  });
}
export function reconciliation(rows: Evidence[], now: number) {
  const unique = [...new Map(rows.map((e) => [e.id, e])).values()];
  const reasons: Record<string, number> = {};
  const metric = unique.filter((e) => {
    const reason =
      e.record.grade === "skipped"
        ? "skipped"
        : !Number.isFinite(Date.parse(e.createdAt)) ||
            Date.parse(e.createdAt) > now
          ? "invalid-or-future-date"
          : e.assistance !== "none"
            ? "assistance-or-unknown"
            : e.exposure !== "fresh"
              ? "targeted-or-review"
              : e.attemptOrdinal !== 1
                ? "retry"
                : !e.questionId || !e.capabilities.identity
                  ? "missing-question-identity"
                  : "";
    if (reason) reasons[reason] = (reasons[reason] ?? 0) + 1;
    return !reason;
  });
  const keys = new Set(
    metric.map((e) =>
      stable([e.mode, e.subtask, e.source, e.grain, e.questionId]),
    ),
  );
  reasons["repeated-question-at-selected-grain"] = metric.length - keys.size;
  return {
    retained: rows.length,
    normalized: unique.length,
    nonSkipped: unique.filter((e) => e.record.grade !== "skipped").length,
    eligible: metric.length,
    diagnostic: metric.length
      ? keys.size
      : unique.some((e) => !e.questionId)
        ? null
        : 0,
    exclusions: reasons,
  };
}
export function makeCell(
  items: Observation[],
  level: AggregateCell["level"],
  key: string,
  query: InsightsQuery,
  revision: string,
  now: number,
): { cell: AggregateCell; ref: EvidenceRef } {
  const observations = ordered(items),
    sample = diagnosticSample(observations, now),
    first = observations[0],
    e = first.row;
  const k = sample.filter((o) => o.outcome === "correct").length,
    n = sample.length;
  const rows = [
    ...new Map(observations.map((o) => [o.row.id, o.row])).values(),
  ].sort((a, b) => a.id.localeCompare(b.id));
  const sessions = new Set(sample.map((o) => o.row.sessionId)).size,
    days = new Set(sample.map((o) => localDay(o.row.createdAt, query.timezone)))
      .size;
  const rootMap = new Map<string, number>();
  for (const o of sample)
    if (o.root !== "Unknown")
      rootMap.set(o.root, (rootMap.get(o.root) ?? 0) + 1);
  const roots = [...rootMap]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([root, questionCount]) => ({ root, questionCount }));
  const families = new Set(observations.map((o) => o.family));
  const contextState = families.has("unknown")
    ? "unknown"
    : families.size === 1
      ? "matched"
      : "mixed-descriptive";
  const rootGate =
    roots.length >= p.rootMinimum &&
    roots.every(
      (r) =>
        r.questionCount >= p.perRootQuestionMinimum &&
        r.questionCount / n <= p.maxRootShare,
    ) &&
    roots.reduce((sum, r) => sum + r.questionCount, 0) === n;
  const quality = level === "degree" ? undefined : first.quality || undefined;
  const degree =
    level === "mode-specific" ? undefined : first.degree || undefined;
  const scope =
    level === "root-quality-degree"
      ? "root-specific"
      : rootGate
        ? "observed-roots"
        : "not-established";
  const id = "cell-" + hash(key),
    refId =
      "evidence-" +
      hash([
        revision,
        id,
        query,
        p.version,
        observations.map((o) => [o.row.id, o.index]),
      ]);
  const last = Math.max(0, ...sample.map((o) => Date.parse(o.row.createdAt)));
  const label =
    level === "mode-specific"
      ? modeContext(e)
      : [level === "root-quality-degree" ? first.root : "", quality, degree]
          .filter(Boolean)
          .join(" / ");
  const outcome = observations.some((o) => o.outcome !== null);
  const exclusions = reconciliation(rows, now).exclusions;
  const ref: EvidenceRef = {
    schemaVersion: 1,
    id: refId,
    dataRevision: revision,
    computedAt: new Date(now).toISOString(),
    metricId: metricId(e),
    definitionVersion: policy.version,
    cohortKeys: uniq(rows.map((e) => e.cohortKey)),
    assessmentIds: rows.map((e) => e.id),
    itemIds: observations.map((o) => o.row.id + ":item" + o.index),
    diagnosticQuestionIds: uniq(sample.map((o) => o.row.questionId!)),
    importedSourceRefs: uniq(
      rows
        .filter((e) => e.version === "historical")
        .map((e) => stable(e.rawSource)),
    ),
    querySnapshot: query,
    exclusions,
    policyVersion: p.version,
  };
  const labelState = evidenceLabel(n, k, sessions, days);
  const cell: AggregateCell = {
    schemaVersion: 1,
    id,
    level,
    mode: e.mode,
    subtask: e.subtask,
    source: e.source,
    grain: e.grain,
    metricId: metricId(e),
    label,
    quality,
    degree,
    numerator: outcome ? k : null,
    denominator: outcome ? n : null,
    selfRatings: {
      correct: k,
      close: sample.filter((o) => o.outcome === "close").length,
      missed: sample.filter((o) => o.outcome === "missed").length,
    },
    descriptiveItemCount: observations.length,
    independentQuestionCount: rows.every((e) => !!e.questionId) ? n : null,
    sessions,
    localDays: days,
    wilson95: wilson(k, n),
    reliability:
      labelState === "Enough to guide practice"
        ? "sufficient"
        : !n
          ? "none"
          : n < 10
            ? "early"
            : "building",
    stale: !!last && now - last > policy.days * 86400000,
    roots,
    contextState,
    generalization: scope,
    evidenceRefId: refId,
    capabilityReasons: [
      ...(contextState !== "matched"
        ? ["Practice settings differ or are unknown; aggregate is descriptive."]
        : []),
      ...(scope === "not-established"
        ? ["Transfer across roots is not established."]
        : []),
      ...(!outcome
        ? ["Target coverage only; the parent activity has one outcome."]
        : []),
    ],
    observations,
    sample,
    rows,
    last,
  };
  return { cell, ref };
}
export function modeContext(e: Evidence): string {
  if (e.mode === "m4") {
    const step = e.record.chordStep,
      from = step === undefined ? undefined : e.challenge?.targets[step - 1];
    return `${from ? from.chord.symbol + "/" + from.degree : "Unknown source"} → ${e.record.chords.join("+")}/${e.record.targets.join("+")} · ${e.config.predictionUnit === "beats" ? e.config.predictionBeats + " beats" : e.config.predictionSeconds + "s"}`;
  }
  if (e.mode === "m6")
    return `${e.config.phraseId} / ${e.config.variation} / ${e.subtask}`;
  return `${e.record.progressionId} / ${e.subtask}${e.mode === "m5" && e.config.runMode === "step" ? " / step " + e.record.chordStep : ""}`;
}
export function buildHierarchy(
  rows: Evidence[],
  query: InsightsQuery,
  revision: string,
  now = Date.now(),
) {
  const groups = new Map<
    string,
    { level: AggregateCell["level"]; items: Observation[]; stratumOf?: string }
  >();
  const familyCache = new Map<string, string>();
  function add(key: string, level: AggregateCell["level"], o: Observation) {
    const g = groups.get(key) ?? { level, items: [] };
    g.items.push(o);
    groups.set(key, g);
  }
  for (const e of [...new Map(rows.map((e) => [e.id, e])).values()]) {
    if (e.record.grade === "skipped") continue;
    const axes = registry(e),
      base = stable([
        e.mode,
        e.subtask,
        e.source,
        e.grain,
        metricId(e),
        e.exposure,
        e.assistance,
        e.version,
      ]);
    let family = familyCache.get(e.cohortKey);
    if (!family) {
      family = comparisonFamily(e);
      familyCache.set(e.cohortKey, family);
    }
    e.record.targets.forEach((degree, index) => {
      const chord = parseChord(e.record.chords[index]),
        root = e.record.chords[index].match(/^[A-G][b#]?/)?.[0] ?? "Unknown";
      const outcome =
        axes.degreeUse !== "outcome"
          ? null
          : e.source === "automatic"
            ? e.record.selectedDegrees?.[index]
              ? e.record.selectedDegrees[index] === degree &&
                (!e.record.selectedQualities ||
                  e.record.selectedQualities[index] === chord.quality)
                ? "correct"
                : "missed"
              : null
            : (e.record.grade as Observation["outcome"]);
      const o: Observation = {
        row: e,
        index,
        outcome,
        root,
        quality: chord.quality,
        degree,
        family,
      };
      add(stable([base, "degree", degree]), "degree", o);
      add(
        stable([base, "quality-degree", chord.quality, degree]),
        "quality-degree",
        o,
      );
      add(
        stable([
          base,
          "root-quality-degree",
          root,
          chord.quality,
          degree,
          family,
        ]),
        "root-quality-degree",
        o,
      );
    });
    if (axes.degreeUse !== "outcome") {
      const o: Observation = {
        row: e,
        index: 0,
        outcome: e.record.grade as Observation["outcome"],
        root: e.record.chords[0].match(/^[A-G][b#]?/)?.[0] ?? "Unknown",
        quality: "",
        degree: "",
        family: e.cohortKey,
      };
      add(
        stable([base, "mode-specific", modeContext(e), e.cohortKey]),
        "mode-specific",
        o,
      );
    }
  }
  for (const [key, g] of [...groups])
    if (g.level === "quality-degree") {
      const strata = new Map<string, Observation[]>();
      for (const o of g.items) {
        const list = strata.get(o.family) ?? [];
        list.push(o);
        strata.set(o.family, list);
      }
      if (strata.size > 1)
        for (const [family, items] of strata)
          if (family !== "unknown")
            groups.set(key + ":stratum:" + family, {
              level: g.level,
              items,
              stratumOf: key,
            });
    }
  const refs = new Map<string, EvidenceRef>(),
    byKey = new Map<string, AggregateCell>();
  const cells = [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, g]) => {
      const { cell, ref } = makeCell(
        g.items,
        g.level,
        key,
        query,
        revision,
        now,
      );
      if (g.stratumOf) cell.stratum = true;
      refs.set(ref.id, ref);
      byKey.set(key, cell);
      return cell;
    });
  for (const [key, g] of groups)
    if (g.stratumOf) {
      const c = byKey.get(key)!,
        parent = byKey.get(g.stratumOf)!;
      c.parentId = parent.id;
      c.aggregateEvidenceRefId = parent.evidenceRefId;
      c.label += " · matched settings subset";
      c.capabilityReasons.push(
        "Subset: " +
          c.rows.length +
          " of " +
          parent.rows.length +
          " retained assessments; other settings excluded.",
      );
    }
  return { cells, refs };
}
export function refResolves(
  ref: EvidenceRef,
  rows: Evidence[],
  query: InsightsQuery,
): boolean {
  return (
    ref.dataRevision === dataRevision(rows) &&
    stable(ref.querySnapshot) === stable(query) &&
    ref.policyVersion === p.version &&
    ref.assessmentIds.every((id) => rows.some((e) => e.id === id))
  );
}
