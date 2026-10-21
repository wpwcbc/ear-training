import {
  parseChord,
  targetPc,
  spellTarget,
  degreeForPc,
  inRange,
  nearestGuide,
  pitchClass,
  type Quality,
  type Chord,
  chordToneDegrees,
  tensionDegrees,
  allowedTargetDegrees,
} from "./theory.js";
import {
  progressionBank,
  guideDegrees,
  parseProgression,
  type Progression,
} from "./progressions.js";
import { bassTarget } from "./bass.js";
import { transformPhrase } from "./phrases.js";
import { normalize } from "./analytics/adapters.js";
import { priorities } from "./analytics/metrics.js";
export type Mode = "m1" | "m2" | "m3" | "m4" | "m5" | "m6" | "m7";
export interface Config {
  qualityPool?: string[];
  degreePool?: string[];
  progressionPool?: string[];
  metronome?: boolean;
  autoAdvance?: boolean;
  replayLimit?: number;
  prepareSeconds?: number;
  predictionUnit?: "seconds" | "beats";
  predictionBeats?: number;
  hideChartAfterListening?: boolean;
  mode: Mode;
  root: string;
  quality: Quality;
  degree: string;
  roots: string;
  rootOrder: "fixed" | "random" | "cycle" | "fifths";
  hintLevel: "full" | "minimal";
  progression: string;
  path: "guided" | "nearest" | "common" | "stepwise" | "leap";
  commonMode: "recognize" | "produce";
  span: number;
  recognitionPool: string;
  recognitionQualities: string;
  revealMode: "manual" | "timed";
  predictionSeconds: number;
  countIn: number;
  gapBeats: number;
  repeats: number;
  count: number;
  low: number;
  high: number;
  bpm: number;
  beats: number;
  context: "full" | "shell" | "root";
  inversion: number;
  volume: number;
  timbre: "piano" | "pad";
  showChords: boolean;
  showProgression: boolean;
  runMode: "step" | "continuous";
  targetPattern: "one" | "two" | "line";
  targetLimit: "preset" | "guides" | "chord" | "tensions";
  phraseId: string;
  variation: "original" | "rhythm" | "approach" | "enclosure";
  transpose: number;
  bassTask: "sing-play" | "hear-play" | "next-beat";
  fretLow: number;
  fretHigh: number;
  fretNames: boolean;
  rangePreset: "custom" | "voice" | "bass";
  vocalLow: number;
  vocalHigh: number;
  bassLow: number;
  bassHigh: number;
}
export const defaults: Config = {
  mode: "m1",
  root: "D",
  quality: "m7",
  degree: "9",
  roots: "C D Eb F G Ab Bb",
  rootOrder: "fixed",
  hintLevel: "full",
  progression: "major-f",
  path: "guided",
  count: 10,
  low: 48,
  high: 72,
  bpm: 72,
  beats: 4,
  context: "full",
  inversion: 0,
  volume: 0.6,
  timbre: "piano",
  showChords: true,
  commonMode: "recognize",
  span: 0,
  recognitionPool: "1 b3 3 5 b7 maj7 9 11 13",
  recognitionQualities: "maj7 m7 7 m7b5",
  revealMode: "manual",
  predictionSeconds: 4,
  countIn: 0,
  gapBeats: 2,
  repeats: 1,
  showProgression: true,
  runMode: "step",
  targetPattern: "one",
  targetLimit: "preset",
  phraseId: "landmarks",
  variation: "original",
  transpose: 0,
  bassTask: "sing-play",
  fretLow: 0,
  fretHigh: 12,
  fretNames: false,
  rangePreset: "custom",
  vocalLow: 48,
  vocalHigh: 72,
  bassLow: 28,
  bassHigh: 60,
};
export interface Target {
  chord: Chord;
  degree: string;
  name: string;
  midi: number;
  beats?: number;
  bar?: number;
  secondMidi?: number;
  secondDegree?: string;
}
export interface Challenge {
  targets: Target[];
  progressionId: string;
  phrase?: ReturnType<typeof transformPhrase>;
}
export function isRecognition(config: Config): boolean {
  return (
    config.mode === "m2" ||
    (config.mode === "m3" && config.commonMode === "recognize")
  );
}
export function isSequential(config: Config): boolean {
  return config.mode === "m4" || config.mode === "m5";
}
export function generate(
  config: Config,
  index: number,
  customs: Progression[] = [],
  random: () => number = Math.random,
): Challenge {
  if (config.mode === "m6") {
    const phrase = transformPhrase(
      config.phraseId,
      config.transpose,
      config.variation,
      config.low,
      config.high,
    );
    return {
      phrase,
      progressionId: phrase.id,
      targets: phrase.chords.map((symbol, i) => {
        const chord = parseChord(symbol),
          note =
            phrase.notes.find((n) => n.chord === i && n.target) ??
            phrase.notes.find((n) => n.chord === i)!;
        const degree = degreeForPc(chord, note.midi % 12);
        return {
          chord,
          degree,
          midi: note.midi,
          name: spellTarget(chord, degree),
          beats: phrase.notes
            .filter((n) => n.chord === i)
            .reduce((sum, n) => sum + n.beats, 0),
        };
      }),
    };
  }
  if (config.mode === "m1" || config.mode === "m2" || config.mode === "m7") {
    let roots = config.roots
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean);
    if (config.rootOrder === "fifths") {
      if (!config.qualityPool && !config.degreePool)
        roots = "C G D A E B F# C# Ab Eb Bb F".split(" ");
      const fifths = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
      roots.sort(
        (a, b) => fifths.indexOf(pitchClass(a)) - fifths.indexOf(pitchClass(b)),
      );
    }
    roots.forEach((root) => parseChord(root + config.quality));
    if (!roots.length) throw new Error("Enter at least one root.");
    const root =
      config.rootOrder === "fixed"
        ? config.root
        : config.rootOrder === "random"
          ? roots[Math.floor(random() * roots.length)]
          : roots[index % roots.length];
    const qualityPool =
      config.mode === "m2" && !config.showChords
        ? [
            ...new Set(
              config.recognitionQualities
                .trim()
                .split(/[\s,]+/)
                .filter(Boolean),
            ),
          ]
        : (config.qualityPool ?? [config.quality]);
    qualityPool.forEach((quality) => parseChord("C" + quality));
    if (!qualityPool.length)
      throw new Error("Choose at least one recognition quality.");
    const quality = qualityPool[Math.floor(random() * qualityPool.length)];
    const chord = parseChord(root + quality);
    const options =
      config.mode === "m2"
        ? [
            ...new Set(
              (
                config.degreePool
                  ?.filter((d) => allowedTargetDegrees(chord).includes(d))
                  .join(" ") ?? config.recognitionPool
              )
                .trim()
                .split(/[\s,]+/)
                .filter(Boolean)
                .map((degree) => degreeForPc(chord, targetPc(chord, degree))),
            ),
          ]
        : [];
    if (config.mode === "m2" && !options.length)
      throw new Error("Enter at least one recognition degree.");
    const allowed = config.degreePool?.filter((d) =>
      allowedTargetDegrees(chord).includes(d),
    );
    if (allowed && !allowed.length)
      throw new Error(`Targets: no compatible degree for ${chord.symbol}.`);
    const degree =
      config.mode === "m2"
        ? options[Math.floor(random() * options.length)]
        : allowed
          ? allowed[Math.floor(random() * allowed.length)]
          : config.degree;
    return {
      targets: [
        {
          chord,
          degree,
          name: spellTarget(chord, degree),
          midi:
            config.mode === "m7"
              ? bassTarget(
                  targetPc(chord, degree),
                  config.bassLow,
                  config.bassHigh,
                  config.fretLow,
                  config.fretHigh,
                )
              : inRange(targetPc(chord, degree), config.low, config.high),
        },
      ],
      progressionId: "single",
    };
  }
  const progressionId = config.progressionPool
    ? config.progressionPool[
        Math.floor(random() * config.progressionPool.length)
      ]
    : config.progression;
  const progression = [...progressionBank, ...customs].find(
    (p) => p.id === progressionId,
  );
  if (!progression) throw new Error("Select a progression.");
  let previous = inRange(
    targetPc(parseChord(progression.chords[0]), progression.targets[0]),
    config.low,
    config.high,
  );
  const sourceChords = progression.chords.slice(
    0,
    config.span || (config.mode === "m3" ? 5 : undefined),
  );
  const chords = Array.from(
    { length: isSequential(config) ? config.repeats : 1 },
    () => sourceChords,
  ).flat();
  const commonPc = progression.common
    ? pitchClass(progression.common)
    : Array.from({ length: 12 }, (_, pc) => pc).sort((a, b) => {
        const score = (pc: number) =>
          chords.reduce((sum, symbol) => {
            const chord = parseChord(symbol);
            const degree = degreeForPc(chord, pc);
            return (
              sum +
              (guideDegrees(chord).includes(degree)
                ? 3
                : ["1", "5"].includes(degree)
                  ? 2
                  : 0)
            );
          }, 0);
        return score(b) - score(a) || a - b;
      })[0];
  const commonMidi = inRange(commonPc, config.low, config.high);
  let beatPosition = 0;
  return {
    progressionId: progression.id,
    targets: chords.map((symbol, i) => {
      const chord = parseChord(symbol);
      const chordIndex = i % sourceChords.length;
      let degree = progression.targets[chordIndex];
      const limitPool = !isSequential(config)
        ? null
        : config.targetLimit === "guides"
          ? guideDegrees(chord)
          : config.targetLimit === "chord"
            ? chordToneDegrees(chord)
            : config.targetLimit === "tensions"
              ? tensionDegrees(chord)
              : null;
      const pool =
        config.degreePool && isSequential(config)
          ? config.degreePool.filter(
              (d) =>
                allowedTargetDegrees(chord).includes(d) &&
                (!limitPool || limitPool.includes(d)),
            )
          : limitPool;
      let midi: number;
      if (pool && !pool.length)
        throw new Error(`Targets: no compatible degree for ${chord.symbol}.`);
      if (config.mode === "m3") {
        midi = commonMidi;
        degree = degreeForPc(chord, midi % 12);
      } else if (
        (config.path === "nearest" ||
          (config.mode === "m5" && config.targetPattern === "line")) &&
        i > 0
      ) {
        const next = pool
          ? pool
              .map((degree) => ({
                degree,
                midi: inRange(
                  targetPc(chord, degree),
                  config.low,
                  config.high,
                  previous,
                ),
              }))
              .sort(
                (a, b) =>
                  Math.abs(a.midi - previous) - Math.abs(b.midi - previous),
              )[0]
          : nearestGuide(chord, previous, config.low, config.high);
        degree = next.degree;
        midi = next.midi;
      } else if (config.path === "common" && i > 0) {
        midi = previous;
        degree = degreeForPc(chord, midi % 12);
      } else if (["stepwise", "leap"].includes(config.path) && i > 0) {
        const options = ["1", ...guideDegrees(chord), "5", "9", "13"].flatMap(
          (degree) =>
            Array.from(
              { length: config.high - config.low + 1 },
              (_, offset) => config.low + offset,
            )
              .filter((midi) => midi % 12 === targetPc(chord, degree))
              .map((midi) => ({ degree, midi })),
        );
        const filtered = options.filter((option) =>
          config.path === "stepwise"
            ? Math.abs(option.midi - previous) <= 2
            : Math.abs(option.midi - previous) >= 3,
        );
        if (!filtered.length)
          throw new Error(
            `No ${config.path} target fits ${chord.symbol} in this range. Choose Guided or Nearest guide tone.`,
          );
        const choice = filtered.sort(
          (a, b) => Math.abs(a.midi - previous) - Math.abs(b.midi - previous),
        )[0];
        degree = choice.degree;
        midi = choice.midi;
      } else
        midi = inRange(
          targetPc(chord, degree),
          config.low,
          config.high,
          previous,
        );
      if (pool && !pool.includes(degree)) {
        if (config.path === "common")
          throw new Error(
            `The common tone is outside the selected target set on ${chord.symbol}. Choose a different target set.`,
          );
        const candidates = pool
          .map((d) => ({
            degree: d,
            midi: inRange(
              targetPc(chord, d),
              config.low,
              config.high,
              previous,
            ),
          }))
          .filter((t) =>
            config.path === "stepwise"
              ? Math.abs(t.midi - previous) <= 2
              : config.path === "leap"
                ? Math.abs(t.midi - previous) >= 3
                : true,
          )
          .sort(
            (a, b) => Math.abs(a.midi - previous) - Math.abs(b.midi - previous),
          );
        if (!candidates.length)
          throw new Error(
            `No target satisfies the path and target set on ${chord.symbol}.`,
          );
        degree = candidates[0].degree;
        midi = candidates[0].midi;
      }
      previous = midi;
      const secondDegree =
        config.mode === "m5" && config.targetPattern === "two"
          ? (pool ?? [...guideDegrees(chord), ...chordToneDegrees(chord)]).find(
              (d) => targetPc(chord, d) !== midi % 12,
            )
          : undefined;
      if (
        config.mode === "m5" &&
        config.targetPattern === "two" &&
        !secondDegree
      )
        throw new Error(
          `Two targets need two distinct notes on ${chord.symbol}. Choose chord tones or preset targets.`,
        );
      const bar = Math.floor(beatPosition / 4) + 1;
      beatPosition += progression.beats?.[chordIndex] ?? config.beats;
      return {
        chord,
        degree,
        midi,
        name: spellTarget(chord, degree),
        beats: progression.beats?.[chordIndex] ?? config.beats,
        bar,
        ...(secondDegree
          ? {
              secondDegree,
              secondMidi: inRange(
                targetPc(chord, secondDegree),
                config.low,
                config.high,
                midi,
              ),
            }
          : {}),
      };
    }),
  };
}
export function validateConfig(
  config: Config,
  customs: Progression[] = [],
): Config {
  const next = { ...config };
  if (
    next.predictionUnit &&
    !["seconds", "beats"].includes(next.predictionUnit)
  )
    throw new Error("Choose a valid prediction gap unit.");
  if (
    next.predictionBeats !== undefined &&
    ![1, 2, 4].includes(next.predictionBeats)
  )
    throw new Error("Prediction gap must be 1, 2 or 4 beats.");
  for (const key of ["qualityPool", "degreePool", "progressionPool"] as const) {
    if (next[key] && (!Array.isArray(next[key]) || !next[key]!.length))
      throw new Error(`Choose at least one ${key}.`);
  }
  if (next.qualityPool) {
    next.qualityPool.forEach((q) => parseChord("C" + q));
    for (const q of next.qualityPool) {
      const chord = parseChord("C" + q);
      if (
        next.degreePool &&
        !next.degreePool.some((d) => allowedTargetDegrees(chord).includes(d))
      )
        throw new Error(`Targets: choose a compatible degree for ${q}.`);
    }
  }
  next.degreePool?.forEach((d) => targetPc(parseChord("Cmaj7"), d));
  if (
    next.progressionPool?.some(
      (id) => ![...progressionBank, ...customs].some((p) => p.id === id),
    )
  )
    throw new Error("Harmony: a selected progression is unavailable.");
  if (
    next.prepareSeconds !== undefined &&
    (!Number.isFinite(next.prepareSeconds) ||
      next.prepareSeconds < 0 ||
      next.prepareSeconds > 30)
  )
    throw new Error("Prepare countdown must be 0-30 seconds.");
  if (
    next.replayLimit !== undefined &&
    ![0, 1, 3, 5].includes(next.replayLimit)
  )
    throw new Error("Choose a valid replay limit.");
  const bounded = (
    key: keyof Config,
    min: number,
    max: number,
    integer = false,
  ) => {
    const value = next[key];
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < min ||
      value > max ||
      (integer && !Number.isInteger(value))
    )
      throw new Error(
        `Invalid ${key}: choose ${min}-${max}${integer ? " (whole numbers)" : ""}.`,
      );
  };
  bounded("low", 28, 84, true);
  bounded("high", 40, 96, true);
  if (next.high - next.low < 11)
    throw new Error("Choose a target range of at least 12 semitones.");
  bounded("bpm", 30, 240);
  bounded("beats", 1, 8, true);
  bounded("volume", 0, 1);
  bounded("inversion", 0, 2, true);
  bounded("predictionSeconds", 0.5, 30);
  bounded("countIn", 0, 8, true);
  bounded("gapBeats", 0, 4, true);
  bounded("repeats", 1, 8, true);
  bounded("transpose", -11, 11, true);
  bounded("fretLow", 0, 24, true);
  bounded("fretHigh", 0, 24, true);
  bounded("vocalLow", 28, 84, true);
  bounded("vocalHigh", 40, 96, true);
  bounded("bassLow", 28, 67, true);
  bounded("bassHigh", 39, 67, true);
  if (
    next.fretLow > next.fretHigh ||
    next.vocalHigh - next.vocalLow < 11 ||
    next.bassHigh - next.bassLow < 11
  )
    throw new Error("Check your vocal/bass register and fret range.");
  if (
    ![0, 5, 10, 20].includes(next.count) ||
    ![0, 2, 3, 4, 5].includes(next.span)
  )
    throw new Error("Select a valid question count and progression length.");
  if (
    !["m1", "m2", "m3", "m4", "m5", "m6", "m7"].includes(next.mode) ||
    !["guided", "nearest", "common", "stepwise", "leap"].includes(next.path) ||
    !["recognize", "produce"].includes(next.commonMode) ||
    !["manual", "timed"].includes(next.revealMode)
  )
    throw new Error("Select a valid practice mode.");
  if (next.mode === "m3") next.context = "full";
  if (next.mode === "m5" && next.targetPattern === "line") {
    next.path = "nearest";
    next.targetLimit = "guides";
  }
  if (next.mode === "m6") next.context = "full";
  if (
    !["step", "continuous"].includes(next.runMode) ||
    !["one", "two", "line"].includes(next.targetPattern) ||
    !["preset", "guides", "chord", "tensions"].includes(next.targetLimit) ||
    !["sing-play", "hear-play", "next-beat"].includes(next.bassTask) ||
    !["original", "rhythm", "approach", "enclosure"].includes(next.variation)
  )
    throw new Error("Choose valid performance settings.");
  if (!next.showChords && next.context !== "full")
    throw new Error(
      "Root and shell contexts need visible chord symbols. Enable symbols or choose Full chord.",
    );
  generate(next, 0, customs);
  return next;
}
export type Grade = "correct" | "close" | "missed" | "skipped";
export interface RecordEntry {
  analytics?: import("./analytics/types.js").Capture;
  questionIndex?: number;
  chordStep?: number;
  timestamp: string;
  mode: Mode;
  config: Config;
  chords: string[];
  targets: string[];
  actualNotes: string[];
  progressionId: string;
  responseLatency: number;
  gradingSource: "self" | "automatic";
  grade: Grade;
  replayCount: number;
  selectedDegrees?: string[];
  referenceAssisted?: boolean;
  selectedQualities?: string[];
  actualMidis?: number[];
  selectedPosition?: number;
}
export interface Session {
  insightPlanId?: string;
  insightOrigin?: string;
  status?: "active" | "paused" | "completed" | "abandoned";
  source?: string;
  sourcePresetId?: string;
  endedAt?: string;
  rngSeed?: string;
  generatorVersion?: string;
  questions?: Challenge[];
  progress?: PracticeProgress;
  customSnapshot?: Progression[];
  id: string;
  timestamp: string;
  mode: Mode;
  config: Config;
  questionCount: number;
  totalTime: number;
  completedCount: number;
  records: RecordEntry[];
  timeSource?: "active-session" | "response-sum";
}
export interface PracticeProgress {
  analytics?: import("./analytics/types.js").Capture;
  index: number;
  step: number;
  revealed: boolean;
  graded: boolean;
  replays: number;
  elapsed: number;
  referenceSeen: boolean;
  referenceAssisted: boolean;
  selected: string[];
  selectedQualities: string[];
  phraseStage: number;
  bassStage: number;
  bassSelection?: number;
  marks: number[];
  hasPlayed: boolean;
  completedQuestions: number[];
  contextPending?: boolean;
}
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export const keys = {
  config: "jazzEarLab:v1:config",
  sessions: "jazzEarLab:v1:sessions",
  progressions: "jazzEarLab:v1:progressions",
  favorites: "jazzEarLab:v1:favorites",
};
export interface Favorite {
  id: string;
  timestamp: string;
  config: Config;
  challenge: Challenge;
}
export function loadFavorites(storage: StorageLike): Favorite[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(keys.favorites) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter(
          (f) =>
            typeof f?.id === "string" &&
            f.config &&
            Array.isArray(f.challenge?.targets) &&
            f.challenge.targets.length,
        )
      : [];
  } catch {
    return [];
  }
}
export function loadProgressions(storage: StorageLike): Progression[] {
  try {
    const parsed: unknown = JSON.parse(
      storage.getItem(keys.progressions) || "[]",
    );
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((value) => {
      try {
        if (
          typeof value.id !== "string" ||
          !value.id.startsWith("custom-") ||
          !Array.isArray(value.chords) ||
          !Array.isArray(value.beats)
        )
          return [];
        return [parseStoredProgression(value)];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}
function parseStoredProgression(value: Progression): Progression {
  return parseProgression(
    value.chords.map((chord, i) => `${chord} ${value.beats?.[i]}`).join("\n"),
    value.name,
    value.id,
  );
}
export function loadSessions(storage: StorageLike): Session[] {
  try {
    const data: unknown = JSON.parse(storage.getItem(keys.sessions) || "[]");
    return Array.isArray(data)
      ? data.filter(
          (s): s is Session =>
            !!s && Array.isArray(s.records) && typeof s.id === "string",
        )
      : [];
  } catch {
    return [];
  }
}
export function saveSession(storage: StorageLike, session: Session): void {
  const sessions = loadSessions(storage).filter((s) => s.id !== session.id);
  storage.setItem(
    keys.sessions,
    JSON.stringify([...sessions, session].slice(-100)),
  );
}
export function recommendation(sessions: Session[]): {
  mode: Mode;
  degree: string;
  text: string;
  config?: Partial<Config>;
} {
  const evidence = sessions.flatMap((s) =>
    s.records.flatMap((r, i) => {
      try {
        return [normalize(s, r, i)];
      } catch {
        return [];
      }
    }),
  );
  const focus = priorities(
    evidence,
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  ).find((p) => p.stats.eligibleCount > 0 && p.rank < 3);
  if (focus) {
    const row = focus.rows[0];
    return {
      mode: row.mode as Mode,
      degree: row.record.targets[0],
      config: row.config,
      text: `${focus.category}: ${focus.label}. ${focus.stats.label}; ${focus.stats.eligibleCount} questions represented. Inspect Insights before selecting a focused drill.`,
    };
  }
  return {
    mode: "m1",
    degree: "3",
    text: "Collect evidence with chord landmarks: produce a 3rd, then a 7th. All modes remain available.",
  };
}
