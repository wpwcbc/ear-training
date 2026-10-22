import {
  defaults,
  generate,
  validateConfig,
  type Challenge,
  type Config,
} from "../model.js";
import { allowedTargetDegrees, parseChord } from "../theory.js";
import { responseOptions } from "../recognition.js";
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
  originScrollY?: number;
  baseline: Config;
  baselineKind?: "historical" | "new-profile";
  profileVersion?: string;
  evidenceRevision?: string;
  evidenceRefIds?: string[];
  sourceCohortKeys?: string[];
  variationIndex?: number;
  seed?: string;
  schedule?: {
    role: "focus" | "contrast";
    root: string;
    quality: string;
    degree: string;
  }[];
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
export function compileSuggestedDiagnostic(
  cell: Cell,
  route: string,
  revision: string,
  options: {
    contrast?: string;
    roots?: string[];
    config?: Partial<Config>;
    variationIndex?: number;
    evidenceRefIds?: string[];
  } = {},
): { supported: boolean; unsupportedReason?: string; plan?: DrillPlan } {
  try {
    if (cell.rows.some((e) => e.mode !== "m1") || !cell.quality || !cell.degree)
      throw new Error(
        "This diagnostic profile supports M1 quality and degree targets only.",
      );
    const profileVersion = "m1-suggested/2026-10-22.1";
    const roots = [...new Set(options.roots ?? ["C", "D", "F", "G"])];
    if (!roots.length) throw new Error("No valid roots selected.");
    const legal = allowedTargetDegrees(parseChord(roots[0] + cell.quality));
    const contrast =
      options.contrast ??
      ["1", "b3", "3", "5", "b7", "maj7", "9", "11", "13"].find(
        (d) => d !== cell.degree && legal.includes(d),
      );
    if (
      !legal.includes(cell.degree) ||
      !contrast ||
      contrast === cell.degree ||
      !legal.includes(contrast)
    )
      throw new Error(
        "No lawful focus and contrast pair. Customize the target pool.",
      );
    const config: Config = {
      ...structuredClone(defaults),
      mode: "m1",
      count: 10,
      root: roots[0],
      roots: roots.join(" "),
      rootOrder: "cycle",
      quality: cell.quality as Config["quality"],
      qualityPool: [cell.quality],
      degree: cell.degree,
      degreePool: [cell.degree, contrast],
      progressionPool: undefined,
      heldMidi: undefined,
      phraseFocus: undefined,
      bassString: undefined,
      low: 48,
      high: 72,
      vocalLow: 48,
      vocalHigh: 72,
      rangePreset: "custom",
      bpm: 72,
      beats: 4,
      context: "full",
      inversion: 0,
      hintLevel: "full",
      showChords: true,
      showProgression: true,
      revealMode: "manual",
      countIn: 0,
      gapBeats: 2,
      repeats: 1,
      timbre: "piano",
      volume: 0.6,
      metronome: false,
      autoAdvance: false,
      prepareSeconds: 0,
      replayLimit: undefined,
      runMode: "step",
      targetPattern: "one",
      targetLimit: "preset",
      ...options.config,
    };
    Object.assign(config, {
      mode: "m1",
      count: 10,
      root: roots[0],
      roots: roots.join(" "),
      rootOrder: "cycle",
      quality: cell.quality,
      qualityPool: [cell.quality],
      degree: cell.degree,
      degreePool: [cell.degree, contrast],
    });
    validateConfig(config, []);
    const evidenceAssessmentIds = [
      ...new Set(cell.rows.map((e) => e.id)),
    ].sort();
    const variationIndex = options.variationIndex ?? 0;
    const seed = hash([
      profileVersion,
      "m1",
      [cell.quality, cell.degree],
      contrast,
      config,
      evidenceAssessmentIds,
      revision,
      variationIndex,
    ]);
    const slots = Array.from({ length: 10 }, (_, i) => {
      const role = i < 7 ? ("focus" as const) : ("contrast" as const);
      const root = roots[(i < 7 ? i : i - 7) % roots.length];
      const degree = i < 7 ? cell.degree! : contrast;
      const settings = validateConfig(
        {
          ...config,
          root,
          roots: root,
          rootOrder: "fixed",
          degree,
          degreePool: [degree],
          qualityPool: [cell.quality!],
        },
        [],
      );
      const challenge = generate(settings, 0, [], seededRandom(seed, i));
      const target = challenge.targets[0];
      if (
        config.mode !== "m1" ||
        challenge.targets.length !== 1 ||
        target.chord.root !== root ||
        target.chord.quality !== cell.quality ||
        target.degree !== degree ||
        !Number.isInteger(target.midi) ||
        target.midi < config.low ||
        target.midi > config.high
      )
        throw new Error(
          "Generated snapshot does not match the diagnostic settings or pitch range.",
        );
      challenge.presentation = {
        root,
        roots: root,
        rootOrder: "fixed",
        degree,
        degreePool: [degree],
      };
      return { role, root, quality: cell.quality!, degree, challenge };
    });
    const random = seededRandom(seed, 10);
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }
    return {
      supported: true,
      plan: {
        id: "suggested-" + seed,
        version: 1,
        profileVersion,
        baselineKind: "new-profile",
        evidenceRevision: revision,
        evidenceRefIds: options.evidenceRefIds
          ? [...options.evidenceRefIds].sort()
          : [],
        sourceCohortKeys: [
          ...new Set(cell.rows.map((e) => e.cohortKey)),
        ].sort(),
        variationIndex,
        seed,
        reason: `7 ${cell.quality} / ${cell.degree} + 3 ${cell.quality} / ${contrast}. New diagnostic settings; not a matched comparison with your history.`,
        sourceCohortKey: [...new Set(cell.rows.map((e) => e.cohortKey))]
          .sort()
          .join(";"),
        evidenceAsOf:
          [...cell.rows.map((e) => e.createdAt)].sort().slice(-1)[0] ?? "",
        evidenceAssessmentIds,
        config,
        baseline: config,
        customSnapshots: [],
        questions: slots.map((s) => s.challenge),
        schedule: slots.map(({ challenge, ...s }) => s),
        selectionPolicy: "diagnostic",
        questionCount: 10,
        compatibleGeneratorVersion: profileVersion,
        originRoute: route,
        changedDifficulty: ["New diagnostic profile", "7 focus / 3 contrast"],
      },
    };
  } catch (error) {
    return { supported: false, unsupportedReason: String(error) };
  }
}
export function compileMatchedBaseline(
  cell: Cell,
  route: string,
  revision: string,
): DrillPlan | null {
  const row = [...cell.rows].sort((a, b) => (a.id < b.id ? -1 : 1))[0];
  if (
    !row ||
    row.mode !== "m1" ||
    row.version !== "standard" ||
    !row.record.analytics?.effectiveConfig ||
    row.assistance !== "none" ||
    row.exposure !== "fresh" ||
    cell.rows.some((e) => e.cohortKey !== row.cohortKey) ||
    Object.keys(defaults).some(
      (key) =>
        (row.config as unknown as Record<string, unknown>)[key] === undefined,
    )
  )
    return null;
  try {
    const config = structuredClone({ ...row.config, count: 10 });
    const customs = row.session.customSnapshot ?? [];
    validateConfig(config, customs);
    const ids = cell.rows.map((e) => e.id).sort();
    const seed = hash(["matched-profile-1", config, ids, revision]);
    const questions = Array.from({ length: 10 }, (_, i) =>
      generate(config, i, customs, seededRandom(seed, i)),
    );
    if (
      questions.some(
        (q) =>
          q.targets.length !== 1 ||
          q.targets.some((t) => t.midi < config.low || t.midi > config.high),
      )
    )
      return null;
    return {
      id: "matched-" + seed,
      version: 1,
      reason:
        "Historical settings and sampling preserved; ten new generated questions, not a 7/3 allocation.",
      sourceCohortKey: row.cohortKey,
      evidenceAsOf: row.createdAt,
      evidenceAssessmentIds: ids,
      evidenceRevision: revision,
      config,
      customSnapshots: customs,
      questions,
      selectionPolicy: "matched",
      questionCount: 10,
      compatibleGeneratorVersion: "matched-profile-1",
      originRoute: route,
      baseline: row.config,
      baselineKind: "historical",
      changedDifficulty: [],
    };
  } catch {
    return null;
  }
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
  if (e.mode === "m3" && cell.focus?.selected)
    return {
      supported: false,
      unsupportedReason:
        "This role confusion is recorded within a sequence. A balanced single-label contrast cannot preserve its held-pitch task; customize a role-pair diagnostic.",
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
      if (cell.focus?.component === "quality")
        return qualityContrast(cell, route);
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
      if (!cell.focus?.component && qualityErrors > degreeErrors)
        return qualityContrast(cell, route);
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
        ? cell.focus?.component === "degree"
          ? cell.focus.selected
          : cell.rows
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
    if (e.mode === "m2") {
      if (config.responseDistractors?.split(/\s+/).includes(contrast))
        return {
          supported: false,
          unsupportedReason:
            "This contrast would turn a fixed distractor into a target and change the recorded choice policy. Customize the response choices first.",
        };
      if (
        ![cell.degree, contrast].every((d) =>
          responseOptions(
            parseChord(config.root + cell.quality),
            d,
            config,
          ).includes(d),
        )
      )
        return {
          supported: false,
          unsupportedReason:
            "The recorded response-choice pool cannot answer both focus and contrast targets. Customize the choices.",
        };
    }
    const observedRoots = [
      ...new Set(cell.rows.map((r) => parseChord(r.record.chords[0]).root)),
    ].sort();
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
      const root = observedRoots[i % observedRoots.length];
      const settings = validateConfig(
        { ...config, root, roots: root, degree, degreePool: [degree] },
        customs,
      );
      const question = generate(settings, i, customs, seededRandom(seed, i));
      if (
        question.targets.length !== 1 ||
        question.targets[0].degree !== degree ||
        question.targets[0].chord.quality !== cell.quality
      )
        throw new Error("Generated target did not match the focus.");
      question.presentation = { root, roots: root, rootOrder: "fixed" };
      return question;
    });
    config.degreePool = [cell.degree, contrast];
    validateConfig(config, customs);
    return {
      supported: true,
      plan: {
        id: "drill-" + seed,
        version: 1,
        reason: `${observedRoots.join(", ")}: ${focusCount} ${cell.quality}/${cell.degree}; ${10 - focusCount} ${cell.quality}/${contrast}. Repeated target material is labelled targeted, not fresh independent evidence.`,
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
          `Root scope: ${observedRoots.join(", ")}`,
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
