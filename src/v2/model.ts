import { exerciseNames } from "./exercise-names.js";
import {
  qualities,
  degrees,
  parseChord,
  targetPc,
  inRange,
  recognitionDegrees,
  chordToneDegrees,
  chordNotes,
  type Quality,
  type Chord,
} from "../jazz/theory.js";
export { qualities, degrees };
export const roots = "C C# D Eb E F F# G Ab A Bb B".split(" ");
export const roles = ["Root", "Third", "Fifth", "Seventh"];
export interface Config {
  exercise: "m1" | "m2";
  roots: string[];
  qualities: Quality[];
  targetMode: "functional" | "exact";
  targets: string[];
  targetPools?: Partial<Record<Quality, string[]>>;
  voiceLevels?: number[];
  method: "imagined" | "sung" | "played";
  context: boolean;
  autoAdvance?: boolean;
  count: number;
  volume: number;
}
export interface Preset {
  id: string;
  name: string;
  config: Config;
}
const base: Config = {
  exercise: "m2",
  roots: [...roots],
  qualities: ["7"],
  targetMode: "functional",
  targets: ["Third", "Seventh"],
  method: "imagined",
  context: true,
  autoAdvance: true,
  count: 10,
  volume: 0.6,
};
export const primaryPresets: Preset[] = [
  {
    id: "m1-general",
    name: exerciseNames.m1,
    config: {
      ...base,
      exercise: "m1",
      qualities: ["maj7", "m7", "7"],
      targets: [...roles],
    },
  },
  {
    id: "m2-general",
    name: exerciseNames.m2,
    config: { ...base, qualities: ["maj7", "m7", "7"], targets: [...roles] },
  },
];
export const builtins: Preset[] = [
  {
    id: "recognition-guides",
    name: "Dominant Guide Tones - All Keys",
    config: base,
  },
  {
    id: "audiation-thirds",
    name: "Audiation - Major and Minor Thirds",
    config: {
      ...base,
      exercise: "m1",
      roots: ["C", "D", "F", "G"],
      qualities: ["maj7", "m7", "7"],
      targets: ["Third"],
    },
  },
  ...primaryPresets,
];
export function resolve(
  chord: Chord,
  target: string,
  mode: Config["targetMode"],
): string {
  if (mode === "exact") {
    if (!degrees.includes(target))
      throw new Error("Select supported exact degrees.");
    return target;
  }
  const tones = chordToneDegrees(chord);
  const candidates: Record<string, string[]> = {
    Root: ["1"],
    Third: ["b3", "3"],
    Fifth: ["b5", "5", "#5"],
    Seventh: ["bb7", "b7", "maj7"],
  };
  const degree = candidates[target]?.find((d) => tones.includes(d));
  if (!degree)
    throw new Error(
      `${target} is not defined for ${chord.quality}. Choose an Exact degree or another quality.`,
    );
  return degree;
}
export function validate(input: Config): Config {
  const c = structuredClone(input);
  if (
    !c ||
    !["m1", "m2"].includes(c.exercise) ||
    !["functional", "exact"].includes(c.targetMode) ||
    !["imagined", "sung", "played"].includes(c.method) ||
    typeof c.context !== "boolean" ||
    (c.autoAdvance !== undefined && typeof c.autoAdvance !== "boolean")
  )
    throw new Error("Unsupported exercise settings.");
  c.autoAdvance ??= true;
  for (const [items, vocabulary, label] of [
    [c.roots, roots, "root"],
    [c.qualities, qualities, "chord quality"],
    ...(!c.targetPools ? [[c.targets, c.targetMode === "exact" ? degrees : roles, "target"] as const] : []),
  ] as const) {
    if (
      !Array.isArray(items) ||
      !items.length ||
      items.some((v) => !vocabulary.includes(v as never)) ||
      new Set(items).size !== items.length
    )
      throw new Error(
        `Select at least one valid ${label}, without duplicates.`,
      );
  }
  if (
    !Number.isInteger(c.count) ||
    c.count < 0 ||
    c.count > 200 ||
    !Number.isFinite(c.volume) ||
    c.volume < 0 ||
    c.volume > 1
  )
    throw new Error(
      "Question count must be 0 (Unlimited) to 200; volume must be 0 to 1.",
    );
  if (c.voiceLevels !== undefined && (!Array.isArray(c.voiceLevels) ||
    c.voiceLevels.length !== 5 || c.voiceLevels.some(level => !Number.isFinite(level) || level < 0 || level > 2)))
    throw new Error("Voice levels must contain five values from 0% to 200%.");
  if (c.targetPools !== undefined) {
    if (!c.targetPools || typeof c.targetPools !== "object" || Array.isArray(c.targetPools))
      throw new Error("Invalid per-quality target pools.");
    for (const [quality, pool] of Object.entries(c.targetPools))
      if (!qualities.includes(quality as Quality) || !Array.isArray(pool) ||
          pool.some(degree => !degrees.includes(degree)) || new Set(pool).size !== pool.length)
        throw new Error(`Select supported target degrees for ${quality}, without duplicates.`);
    for (const quality of c.qualities)
      if (!c.targetPools[quality]?.length) throw new Error(`Select at least one target for ${quality}.`);
  }
  for (const root of c.roots)
    for (const quality of c.qualities)
      for (const requested of targetsFor(c, quality)) {
        const chord = parseChord(root + quality),
          degree = requested;
        inRange(targetPc(chord, degree), 60, 83);
        if (c.voiceLevels && !chordNotes(chord).some((note, i) =>
          note % 12 !== targetPc(chord, degree) && c.voiceLevels![i] > 0))
          throw new Error(`No non-target accompaniment remains for ${quality} / ${degree}. Adjust the voicing mix.`);
      }
  return c;
}
// Resolve old presets lazily; never rewrite historical configuration snapshots.
export function targetsFor(c: Config, quality: Quality): string[] {
  if (c.targetPools) return [...(c.targetPools[quality] ?? [])];
  return [...new Set(c.targets.map(target => resolve(parseChord("C" + quality), target, c.targetMode)))];
}
export function editableConfig(input: Config): Config {
  const c = structuredClone(input);
  c.targetPools ??= Object.fromEntries(c.qualities.map(quality => [quality, targetsFor(c, quality)]));
  c.voiceLevels ??= [1, 1, 1, 1, 1];
  return c;
}
export interface Question {
  id: string;
  chord: Chord;
  degree: string;
  midi: number;
  options: string[];
  generatorVersion: string;
}
export function optionsFor(chord: Chord, degree: string): string[] {
  return recognitionDegrees(chord).map((label) =>
    targetPc(chord, label) === targetPc(chord, degree) ? degree : label,
  );
}
export function stream(input: Config, seed: string): () => Question {
  const c = validate(input);
  let state = 2166136261,
    index = 0,
    bag: { quality: Quality; degree: string }[] = [],
    rootBag: string[] = [];
  for (const char of seed)
    state = Math.imul(state ^ char.charCodeAt(0), 16777619);
  const random = () => {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const shuffle = <T>(items: T[]) => {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  };
  const pairs = c.qualities.flatMap(quality => targetsFor(c, quality).map(degree => ({quality, degree})));
  let qualityBag: Quality[] = [];
  const targetBags = new Map<Quality, string[]>();
  return () => {
    if (!bag.length) bag = shuffle([...pairs]);
    if (!rootBag.length) rootBag = shuffle([...c.roots]);
    let pair = bag.pop()!;
    if (c.targetPools) {
      if (!qualityBag.length) qualityBag = shuffle([...c.qualities]);
      const quality = qualityBag.pop()!;
      let targets = targetBags.get(quality);
      if (!targets?.length) targetBags.set(quality, targets = shuffle(targetsFor(c, quality)));
      pair = {quality, degree: targets.pop()!};
    }
    const chord = parseChord(rootBag.pop()! + pair.quality);
    return {
      id: `${seed}:${index++}`,
      chord,
      degree: pair.degree,
      midi: inRange(targetPc(chord, pair.degree), 60, 83),
      options: optionsFor(chord, pair.degree),
      generatorVersion: c.targetPools ? "v2-quality-balanced-4" : "v2-balanced-3",
    };
  };
}
export const timingVersion = "v2-answer-ready-1";
export interface Attempt {
  id: string;
  sessionId: string;
  questionId: string;
  exercise: keyof typeof exerciseNames;
  gradingSource: "self" | "automatic";
  responseMethod: string;
  configurationSnapshot: Config;
  target: Question;
  firstAnswer: string | null;
  firstCorrect: boolean | null;
  imaginedWrongDegree?: string;
  firstResponseMs: number | null;
  timingVersion: string;
  timingValidity: "valid" | "interrupted" | "unavailable";
  replayQuestionId?: string;
  replayEventsBefore?: number;
  replayEventsAfter?: number;
  progressionContext?: string;
  replaysBeforeFirst: number;
  replaysAfterFirst: number;
  retryCount: number;
  retries: { answer: string; atMs: number | null }[];
  revealedReference: boolean;
  completedAt: string | null;
  exposure: "fresh" | "previously-seen";
}
export function attempt(
  c: Config,
  q: Question,
  sessionId: string,
  exposure: Attempt["exposure"],
): Attempt {
  return {
    id: crypto.randomUUID(),
    sessionId,
    questionId: q.id,
    exercise: c.exercise,
    gradingSource: c.exercise === "m1" ? "self" : "automatic",
    responseMethod: c.exercise === "m1" ? c.method : "degree-button",
    configurationSnapshot: structuredClone(c),
    target: structuredClone(q),
    firstAnswer: null,
    firstCorrect: null,
    firstResponseMs: null,
    timingVersion: c.exercise === "m1" ? "v2-m1-chord-onset-2" : timingVersion,
    timingValidity: "unavailable",
    replaysBeforeFirst: 0,
    replaysAfterFirst: 0,
    retryCount: 0,
    retries: [],
    revealedReference: false,
    completedAt: null,
    exposure,
  };
}
export function answer(
  a: Attempt,
  chosen: string,
  elapsed: number | null,
): boolean {
  if (a.exercise !== "m2" || !a.target.options.includes(chosen))
    throw new Error("Select a valid answer.");
  const correct = chosen === a.target.degree;
  if (a.firstAnswer === null) {
    a.firstAnswer = chosen;
    a.firstCorrect = correct;
    a.firstResponseMs = elapsed;
    a.completedAt = new Date().toISOString();
  } else {
    a.retryCount++;
    a.retries.push({ answer: chosen, atMs: elapsed });
  }
  return correct;
}
export function rate(a: Attempt, correct: boolean, wrong?: string): void {
  if (a.exercise !== "m1") throw new Error("Only single-chord degree audiation supports this self-assessment interface.");
  if (a.firstCorrect !== null) return;
  if (
    !correct &&
    (!wrong ||
      (wrong !== "unknown" &&
        (!a.target.options.includes(wrong) || wrong === a.target.degree)))
  )
    throw new Error("Choose a different degree or Unknown.");
  a.firstCorrect = correct;
  a.firstAnswer = correct ? "correct" : "incorrect";
  if (!correct) a.imaginedWrongDegree = wrong;
  a.completedAt = new Date().toISOString();
}
export interface Session {
  id: string;
  presetId: string;
  config: Config;
  attempts: Attempt[];
  startedAt: string;
  endedAt: string | null;
}
export const keys = {
  presets: "jazzEarLab:v2:presets",
  sessions: "jazzEarLab:v2:sessions",
  last: "jazzEarLab:v2:last",
  exposures: "jazzEarLab:v2:exposures",
};
export function read<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (raw === null) return structuredClone(fallback);
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(
      "Saved V2 data could not be read. Existing data was preserved; do not clear browser data without a backup.",
    );
  }
}
export function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error(
      "Could not save V2 data. Keep this page open, allow/free browser storage, then Retry saving.",
    );
  }
}
export function cohort(a: Attempt): string {
  const c = a.configurationSnapshot;
  return JSON.stringify([
    a.exercise,
    a.gradingSource,
    a.responseMethod,
    c.context,
    a.timingVersion,
    a.target.generatorVersion,
    "12-pc-exact-substitution-1",
    [...c.roots].sort(),
    [...c.qualities].sort(),
    c.targetMode,
    [...c.targets].sort(),
    a.exposure,
    ...(c.targetPools || c.voiceLevels ? [
      c.targetPools ? c.qualities.slice().sort().map(quality => [quality, targetsFor(c, quality).sort()]) : null,
      c.voiceLevels ?? [1, 1, 1, 1, 1],
    ] : []),
  ]);
}
export function uniqueAttempts(rows: Attempt[]): Attempt[] {
  const seen = new Set<string>();
  return rows.filter(a => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}
export function insightRows(input: Attempt[], module: "overall" | Attempt["exercise"] = "overall", production = "all"): Attempt[] {
  return uniqueAttempts(input).filter(a => {
    if (!Object.keys(exerciseNames).includes(a.exercise)) return false;
    if (module !== "overall" && a.exercise !== module) return false;
    if (module !== "m1" || production === "all") return true;
    return production === "imagined-sung"
      ? a.responseMethod === "imagined" || a.responseMethod === "sung"
      : production === "played" && a.responseMethod === "played";
  });
}
export function metrics(input: Attempt[]) {
  const rows = uniqueAttempts(input);
  const replayKeys=new Set<string>();
  const eventRows=rows.filter(a=>{if(!a.replayQuestionId)return true;if(replayKeys.has(a.replayQuestionId))return false;replayKeys.add(a.replayQuestionId);return true;});
  const assessed = rows.filter((a) => a.firstCorrect !== null),
    correct = assessed.filter((a) => a.firstCorrect);
  const times = correct
    .filter((a) => a.timingValidity === "valid" && a.firstResponseMs !== null && Number.isFinite(a.firstResponseMs) && a.firstResponseMs >= 0)
    .map((a) => a.firstResponseMs!)
    .sort((a, b) => a - b);
  const n = times.length,
    median = n
      ? (times[Math.floor(n / 2)] + times[Math.floor((n - 1) / 2)]) / 2
      : null;
  return {
    n: assessed.length,
    correct: correct.length,
    unassessed: rows.length - assessed.length,
    replayed: assessed.filter((a) => a.replaysBeforeFirst > 0).length,
    before: eventRows.reduce((n, a) => n + (a.replayEventsBefore ?? a.replaysBeforeFirst), 0),
    after: eventRows.reduce((n, a) => n + (a.replayEventsAfter ?? a.replaysAfterFirst), 0),
    median,
    timed: n,
  };
}
