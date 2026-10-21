import {
  generate,
  validateConfig,
  type Challenge,
  type Config,
} from "../model.js";
import { allowedTargetDegrees, parseChord } from "../theory.js";
import { seededRandom } from "../lifecycle.js";
import type { Cell } from "./metrics.js";
import { hash } from "./types.js";
import {
  compileAdvanced,
  qualityContrast,
  diagnosticSequences,
} from "./focused.js";
export interface DrillPlan {
  id: string;
  version: 1;
  reason: string;
  sourceCohortKey: string;
  evidenceAsOf: string;
  evidenceAssessmentIds: string[];
  config: Config;
  customSnapshots: NonNullable<
    Cell["rows"][number]["session"]["customSnapshot"]
  >;
  questions: Challenge[];
  selectionPolicy: "contrast" | "diagnostic" | "exact-review" | "matched";
  questionCount: 10;
  compatibleGeneratorVersion: string;
  originRoute: string;
  baseline: Config;
  changedDifficulty: string[];
  targetPredicate?:
    | { kind: "quality-pair"; qualities: string[]; degree: string }
    | { kind: "held-pitch"; midi: number; chords: string[] }
    | {
        kind: "transition";
        source: string;
        destination: string;
        motion: number;
      }
    | { kind: "section"; indices: number[]; runMode: string }
    | {
        kind: "phrase-stage";
        stage: NonNullable<Config["phraseFocus"]>;
        phraseId: string;
      }
    | { kind: "bass-position"; string: string; fret: number; midi: number }
    | { kind: "diagnostic"; cells: string[] };
}
export function compileDrill(
  cell: Cell,
  route: string,
): { supported: boolean; unsupportedReason?: string; plan?: DrillPlan } {
  const e = cell.rows[0];
  if (!e)
    return {
      supported: false,
      unsupportedReason: "No saved context. Configure a diagnostic set.",
    };
  if (["m3", "m4", "m5", "m6"].includes(e.mode) || cell.focus?.position)
    return compileAdvanced(cell, route);
  if (!["m1", "m2", "m7"].includes(e.mode) || !cell.quality || !cell.degree)
    return {
      supported: false,
      unsupportedReason:
        "Automatic focus is unavailable for this sequence or stage. Review the saved question or customize its settings.",
    };
  try {
    if (e.mode === "m2" && !e.config.showChords) {
      const qualityErrors = cell.rows.filter(
        (r) =>
          r.record.selectedQualities?.[0] &&
          r.record.selectedQualities[0] !== cell.quality,
      ).length;
      const degreeErrors = cell.rows.filter(
        (r) =>
          r.record.selectedDegrees?.[0] &&
          r.record.selectedDegrees[0] !== cell.degree,
      ).length;
      if (qualityErrors > degreeErrors) return qualityContrast(cell, route);
    }
    const config = {
      ...e.config,
      count: 10,
      quality: cell.quality as Config["quality"],
      qualityPool: [cell.quality],
      degree: cell.degree,
      degreePool: [cell.degree],
      progressionPool: undefined,
      root: parseChord(e.record.chords[0]).root,
      rootOrder: "fixed" as const,
      roots: parseChord(e.record.chords[0]).root,
    };
    // Pin hidden-quality generation without changing the actual answer-choice UI.
    if (e.mode === "m2" && !config.showChords)
      config.recognitionQualities = cell.quality;
    const choices = allowedTargetDegrees(
      parseChord(config.root + cell.quality),
    );
    const confusion =
      e.mode === "m2"
        ? cell.rows
            .map((r) => r.record.selectedDegrees?.[0])
            .find((d) => d && d !== cell.degree && choices.includes(d))
        : undefined;
    const contrast =
      confusion ??
      choices.find(
        (d) =>
          d !== cell.degree &&
          (
            e.config.degreePool ?? e.config.recognitionPool.split(/\s+/)
          ).includes(d),
      );
    if (!contrast)
      return {
        supported: false,
        unsupportedReason:
          "No compatible nearby contrast within these settings. Customize the target pool.",
      };
    const customs = e.session.customSnapshot ?? [],
      seed = hash([cell.id, cell.rows.map((r) => r.id)]);
    const random = seededRandom(seed, 0);
    const focusCount = confusion ? 5 : 7;
    const allocation = [
      ...Array(focusCount).fill(cell.degree),
      ...Array(10 - focusCount).fill(contrast),
    ] as string[];
    for (let i = allocation.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [allocation[i], allocation[j]] = [allocation[j], allocation[i]];
    }
    const questions = allocation.map((degree, i) => {
      const settings = validateConfig(
        { ...config, degree, degreePool: [degree] },
        customs,
      );
      const question = generate(settings, i, customs, seededRandom(seed, i));
      if (
        question.targets.length !== 1 ||
        question.targets[0].degree !== degree ||
        question.targets[0].chord.quality !== cell.quality
      )
        throw new Error("Generated target did not match the focus.");
      return question;
    });
    config.degreePool = [cell.degree, contrast];
    validateConfig(config, customs);
    return {
      supported: true,
      plan: {
        id: "drill-" + seed,
        version: 1,
        reason: `${config.root}: ${focusCount} ${cell.quality}/${cell.degree}; ${10 - focusCount} ${cell.quality}/${contrast}`,
        sourceCohortKey: e.cohortKey,
        evidenceAsOf: new Date().toISOString(),
        evidenceAssessmentIds: cell.rows.map((r) => r.id),
        config,
        customSnapshots: customs,
        questions,
        selectionPolicy: "contrast",
        questionCount: 10,
        compatibleGeneratorVersion: "insights-schedule-1",
        originRoute: route,
        baseline: e.config,
        changedDifficulty: [
          `Target sampling: ${focusCount} focus / ${10 - focusCount} contrast`,
          `Root scope: ${config.root}`,
        ],
      },
    };
  } catch (error) {
    return { supported: false, unsupportedReason: String(error) };
  }
}

export function compileDiagnostic(
  base: Config,
  route: string,
  history: import("./types.js").Evidence[] = [],
): DrillPlan | null {
  if (!["m1", "m2", "m7"].includes(base.mode))
    return diagnosticSequences(base, route);
  try {
    const root =
      base.rootOrder === "fixed"
        ? base.root
        : base.roots.split(/[\s,]+/).filter(Boolean)[0];
    const quality =
      base.mode === "m2" && !base.showChords
        ? base.recognitionQualities.split(/[\s,]+/).filter(Boolean)[0]
        : (base.qualityPool?.[0] ?? base.quality);
    const chord = parseChord(root + quality),
      available = allowedTargetDegrees(chord);
    const counts = (degree: string) =>
      new Set(
        history
          .filter((e) =>
            e.record.chords.some(
              (c, i) => c === chord.symbol && e.record.targets[i] === degree,
            ),
          )
          .map((e) => e.questionId ?? e.id),
      ).size;
    const pool = (
      base.degreePool ?? ["1", "b3", "3", "5", "b7", "maj7", "9", "11", "13"]
    )
      .filter((d) => available.includes(d))
      .sort((a, b) => counts(a) - counts(b))
      .slice(0, 5);
    if (!pool.length) return null;
    const config = {
      ...base,
      count: 10,
      root,
      quality: chord.quality,
      progressionPool: undefined,
      rootOrder: "fixed" as const,
      roots: root,
      degreePool: pool,
      qualityPool: [chord.quality],
      recognitionQualities: chord.quality,
    };
    const seed = hash(["diagnostic-1", config]);
    const allocation = Array.from(
      { length: 10 },
      (_, i) =>
        pool[
          i < pool.length * 2
            ? Math.floor(i / 2)
            : (i - pool.length * 2) % pool.length
        ],
    );
    const questions = allocation.map((degree, i) =>
      generate(
        validateConfig({ ...config, degree, degreePool: [degree] }, []),
        i,
        [],
        seededRandom(seed, i),
      ),
    );
    if (questions.some((q, i) => q.targets[0].degree !== allocation[i]))
      return null;
    const random = seededRandom(seed, 10);
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
    return {
      id: "diagnostic-" + seed,
      version: 1,
      reason: `${chord.symbol}: ${pool.map((degree) => degree + " × " + allocation.filter((d) => d === degree).length).join(", ")} · lowest retained coverage within this target scope`,
      sourceCohortKey: "diagnostic",
      evidenceAsOf: new Date().toISOString(),
      evidenceAssessmentIds: history.map((e) => e.id),
      config,
      customSnapshots: [],
      questions,
      selectionPolicy: "diagnostic",
      questionCount: 10,
      compatibleGeneratorVersion: "insights-schedule-1",
      originRoute: route,
      baseline: base,
      changedDifficulty: [
        "Balanced diagnostic target sampling",
        `Diagnostic root / quality: ${chord.symbol}`,
      ],
    };
  } catch {
    return null;
  }
}
