import {
  qualities,
  degrees,
  parseChord,
  targetPc,
  inRange,
  recognitionDegrees,
  chordToneDegrees,
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
    name: "M1 Audiation",
    config: {
      ...base,
      exercise: "m1",
      qualities: ["maj7", "m7", "7"],
      targets: [...roles],
    },
  },
  {
    id: "m2-general",
    name: "M2 Recognition",
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
    [c.targets, c.targetMode === "exact" ? degrees : roles, "target"],
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
  for (const root of c.roots)
    for (const quality of c.qualities)
      for (const requested of c.targets) {
        const chord = parseChord(root + quality),
          degree = resolve(chord, requested, c.targetMode);
        inRange(targetPc(chord, degree), 60, 83);
      }
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
  const pairs = c.qualities.flatMap((quality) =>
    [
      ...new Set(
        c.targets.map((t) =>
          resolve(parseChord("C" + quality), t, c.targetMode),
        ),
      ),
    ].map((degree) => ({ quality, degree })),
  );
  return () => {
    if (!bag.length) bag = shuffle([...pairs]);
    if (!rootBag.length) rootBag = shuffle([...c.roots]);
    const pair = bag.pop()!,
      chord = parseChord(rootBag.pop()! + pair.quality);
    return {
      id: `${seed}:${index++}`,
      chord,
      degree: pair.degree,
      midi: inRange(targetPc(chord, pair.degree), 60, 83),
      options: optionsFor(chord, pair.degree),
      generatorVersion: "v2-balanced-1",
    };
  };
}
export const timingVersion = "v2-answer-ready-1";
export interface Attempt {
  id: string;
  sessionId: string;
  questionId: string;
  exercise: Config["exercise"];
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
    timingVersion,
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
  if (a.exercise !== "m1") throw new Error("Only M1 supports self-assessment.");
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
  ]);
}
export function metrics(rows: Attempt[]) {
  const assessed = rows.filter((a) => a.firstCorrect !== null),
    correct = assessed.filter((a) => a.firstCorrect);
  const times = correct
    .filter((a) => a.timingValidity === "valid" && a.firstResponseMs !== null)
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
    before: rows.reduce((n, a) => n + a.replaysBeforeFirst, 0),
    after: rows.reduce((n, a) => n + a.replaysAfterFirst, 0),
    median,
    timed: n,
  };
}
