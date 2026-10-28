import { stream, builtins } from "./model.js";
import { progressionModes, isPlayByEar, type ProgressionMode } from "./exercise-names.js";
import {
  parseChord,
  pitchClass,
  chordToneDegrees,
  chordNotes,
  targetPc,
  inRange,
  qualities,
  degrees,
  type Chord,
  type Quality,
} from "../jazz/theory.js";
export interface ProgressionConfig {
  mode: ProgressionMode;
  keyMode?: "fixed" | "random";
  key?: string;
  keyPool?: string[];
  roots?: string[];
  qualities?: Quality[];
  chords: { symbol: string; beats: number }[];
  bpm: number;
  notes: number;
  count: number;
  volume: number;
  levels: number[];
  pools: Partial<Record<Quality, string[]>>;
}
export interface NoteOutcome {
  exposure?: "fresh" | "previously-seen";
  id: string;
  occurrence: number;
  position: number;
  chord: Chord;
  degree: string;
  midi: number;
  answer: string | null;
  correct: boolean | null;
  assisted: boolean;
}
export interface ProgressionQuestion {
  id: string;
  config: ProgressionConfig;
  source?: ProgressionConfig;
  practiceKey?: string;
  notes: NoteOutcome[];
  submitted: boolean;
  done: boolean;
  referencePlayed?: boolean;
  performanceEndedAt?: number;
  completionDelayMs?: number;
  interrupted?: boolean;
  before: number;
  after: number;
  created: string;
}
export const practiceKeys = "C C# D Eb E F F# G Ab A Bb B".split(" ");
export const templates = {
  major: ["Dm7", "G7", "Cmaj7"],
  minor: ["Dm7b5", "G7", "Cm7"],
  backdoor: ["Fm7", "Bb7", "Cmaj7"],
};
export const defaults: ProgressionConfig = {
  mode: progressionModes.degreeRecognition,
  chords: templates.major.map((symbol) => ({ symbol, beats: 4 })),
  bpm: 80,
  notes: 2,
  count: 10,
  volume: 0.6,
  levels: [1, 1, 1, 1, 1],
  pools: {
    m7: ["1", "b3", "5", "b7"],
    "7": ["3", "b7", "9"],
    maj7: ["1", "3", "5", "maj7"],
  },
};
export function validate(input: ProgressionConfig): ProgressionConfig {
  const c = structuredClone(input);
  c.keyMode ??= "fixed"; c.key ??= "C"; c.keyPool ??= [...practiceKeys];
  if (!["fixed", "random"].includes(c.keyMode) || !practiceKeys.includes(c.key) || !Array.isArray(c.keyPool) || c.keyPool.some(k => !practiceKeys.includes(k)) || new Set(c.keyPool).size !== c.keyPool.length || (c.keyMode === "random" && !c.keyPool.length))
    throw Error("Choose a valid practice key and at least one random key.");
  if (
    !Object.values(progressionModes).includes(c.mode) ||
    !Number.isFinite(c.bpm) ||
    c.bpm < 20 ||
    c.bpm > 300 ||
    !Number.isInteger(c.notes) ||
    c.notes < 1 ||
    c.notes > 4 ||
    !Number.isInteger(c.count) ||
    c.count < 0 ||
    c.count > 200 ||
    !Number.isFinite(c.volume) ||
    c.volume < 0 ||
    c.volume > 1
  )
    throw Error(
      "Choose BPM 20–300, 1–4 notes/chord, 0–200 questions and valid volume.",
    );
  const single = c.mode === progressionModes.singlePlayByEar;
  if (single && (!c.roots?.length || c.roots.some(r => !practiceKeys.includes(r)) || !c.qualities?.length || c.qualities.some(q => !qualities.includes(q)) || c.notes !== 1)) throw Error("Choose roots, chord qualities and one target for single-chord practice.");
  if (!Array.isArray(c.chords) || c.chords.length < (single ? 1 : 2) || c.chords.length > (single ? 1 : 32))
    throw Error("Choose 2–32 chord occurrences.");
  if (
    !Array.isArray(c.levels) ||
    c.levels.length !== 5 ||
    c.levels.some((x) => !Number.isFinite(x) || x < 0 || x > 2)
  )
    throw Error("Voice levels must be 0–200%.");
  for (const row of single ? c.qualities!.map(q => ({symbol: "C" + q, beats: 4})) : c.chords) {
    const chord = parseChord(row.symbol);
    if (!Number.isInteger(row.beats) || row.beats < 1 || row.beats > 16)
      throw Error("Each chord needs 1–16 beats.");
    const pool = c.pools[chord.quality];
    if (
      !Array.isArray(pool) ||
      !pool.length ||
      pool.some((d) => !degrees.includes(d)) ||
      new Set(pool).size !== pool.length
    )
      throw Error(
        chord.quality + " needs supported target degrees without duplicates.",
      );
  }
  return c;
}
export function generate(
  input: ProgressionConfig,
  random = Math.random,
  drawnKey?: string,
): ProgressionQuestion {
  const source = validate(input), config = structuredClone(source),
    key = drawnKey ?? source.key!, id = crypto.randomUUID();
  if (!practiceKeys.includes(key)) throw Error("Unsupported practice key.");
  if (source.mode === progressionModes.singlePlayByEar) { const root = source.roots![Math.floor(random() * source.roots!.length)], quality = source.qualities![Math.floor(random() * source.qualities!.length)]; config.chords = [{symbol: root + quality, beats: 4}]; }
  const offset = source.mode === progressionModes.singlePlayByEar ? 0 : pitchClass(key);
  config.chords = config.chords.map(row => { const chord = parseChord(row.symbol); return { ...row, symbol: practiceKeys[(pitchClass(chord.root) + offset) % 12] + chord.quality }; });
  return {
    id,
    config, source, practiceKey: key,
    created: new Date().toISOString(),
    submitted: false,
    done: false,
    before: 0,
    after: 0,
    notes: config.chords.flatMap((row, occurrence) => {
      const chord = parseChord(row.symbol),
        pool = config.pools[chord.quality]!;
      return Array.from({ length: config.notes }, (_, position) => {
        const degree = pool[Math.floor(random() * pool.length)];
        return {
          id: `${id}:${occurrence}:${position}`,
          occurrence,
          position,
          chord,
          degree,
          midi: inRange(targetPc(chord, degree), 60, 83),
          answer: null,
          correct: null,
          assisted: false,
        };
      });
    }),
  };
}
/** One frozen session: only requesting a new question consumes a key draw. */
export function questionStream(input: ProgressionConfig, random = Math.random) {
  const source = validate(input);
  const singleNext = source.mode === progressionModes.singlePlayByEar ? stream({ ...builtins[0].config, exercise: "m2", roots: source.roots!, qualities: source.qualities!, targetMode: "exact", targetPools: source.pools, targets: [...new Set(Object.values(source.pools).flat())] as string[] }, crypto.randomUUID()) : null;
  let bag: string[] = [], last = "";
  return () => {
    let key = source.key!;
    if (source.keyMode === "random") {
      if (!bag.length) {
        bag = [...source.keyPool!];
        for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
        if (bag.length > 1 && bag[0] === last) [bag[0], bag[1]] = [bag[1], bag[0]];
      }
      key = bag.shift()!; last = key;
    }
    const question = generate(source, random, key);
    if (singleNext) {
      const target = singleNext(); question.config.chords = [{symbol: target.chord.symbol, beats: 4}];
      Object.assign(question.notes[0], {chord: target.chord, degree: target.degree, midi: target.midi});
      delete question.practiceKey;
    }
    return question;
  };
}
export function submit(q: ProgressionQuestion, answers: string[]) {
  if (q.submitted) return;
  if (
    answers.length !== q.notes.length ||
    answers.some((a) => a !== "unknown" && !degrees.includes(a))
  )
    throw Error("Choose a degree or Don’t know for every note.");
  q.notes.forEach((n, i) => {
    n.answer = answers[i];
    n.correct = answers[i] === n.degree;
    n.assisted = q.before > 0;
  });
  q.submitted = true;
}
export function rate(
  q: ProgressionQuestion,
  index: number,
  correct: boolean,
  wrong?: string,
) {
  const n = q.notes[index];
  if (q.config.mode !== progressionModes.degreeAudiation || !n) throw Error("Invalid self-rating.");
  if (n.correct !== null) return;
  if (
    !correct &&
    (!wrong ||
      wrong === n.degree ||
      (wrong !== "unknown" && !degrees.includes(wrong)))
  )
    throw Error("Choose a different degree or Unknown.");
  n.correct = correct;
  n.answer = correct ? n.degree : wrong!;
  n.assisted = q.before > 0;
}
export function report(questions: ProgressionQuestion[]) {
  const notes = [
      ...new Map(
        questions.flatMap((q) => q.notes).map((n) => [n.id, n]),
      ).values(),
    ],
    assessed = notes.filter((n) => n.correct !== null);
  return {
    assessed: assessed.length,
    correct: assessed.filter((n) => n.correct).length,
    unassessed: notes.length - assessed.length,
    assisted: assessed.filter((n) => n.assisted).length,
  };
}
export function sequence(q: ProgressionQuestion, melody: boolean) {
  const c = q.config,
    beat = 60 / c.bpm;
  let cursor = 4 * beat;
  const events: {
    midi: number;
    start: number;
    duration: number;
    level: number;
  }[] = [];
  const starts: number[] = [];
  c.chords.forEach((row, i) => {
    const duration = row.beats * beat,
      chord = parseChord(row.symbol),
      notes = chordNotes(chord),
      scale =
        1 /
        Math.max(
          1,
          (notes.reduce((s, _, j) => s + c.levels[j] * 0.09, 0) + 0.24) / 0.94,
        );
    starts.push(cursor);
    notes.forEach((midi, j) => {
      if (c.levels[j] > 0)
        events.push({
          midi,
          start: cursor,
          duration: Math.max(0.03, duration - 0.03),
          level: c.volume * c.levels[j] * 0.09 * scale,
        });
    });
    if (melody)
      q.notes
        .filter((n) => n.occurrence === i)
        .forEach((n) =>
          events.push({
            midi: n.midi,
            start: cursor + (n.position * duration) / c.notes,
            duration: Math.max(0.03, duration / c.notes - 0.03),
            level: c.volume * 0.24 * scale,
          }),
        );
    cursor += duration;
  });
  return { events, starts, duration: cursor, countIn: beat };
}
export function addQualityPools(c: ProgressionConfig) {
  for (const row of c.mode === progressionModes.singlePlayByEar ? (c.qualities ?? []).map(q => ({symbol:"C" + q})) : c.chords) {
    const chord = parseChord(row.symbol);
    c.pools[chord.quality] ??= chordToneDegrees(chord);
  }
}

export function defaultConfig(mode: ProgressionMode): ProgressionConfig {
  const config = { ...structuredClone(defaults), mode };
  if (mode === progressionModes.singlePlayByEar) Object.assign(config, {chords: [{symbol: "Cmaj7", beats: 4}], notes: 1, roots: [...practiceKeys], qualities: ["maj7", "m7", "7"]});
  return config;
}
export function performanceComplete(q: ProgressionQuestion, now: number) {
  if (!isPlayByEar(q.config.mode) || q.done || !Number.isFinite(now)) throw Error("Invalid performance completion.");
  q.performanceEndedAt = now;
}
export function finishPerformance(q: ProgressionQuestion, now: number) {
  if (q.done) return;
  if (!isPlayByEar(q.config.mode) || q.performanceEndedAt === undefined || !Number.isFinite(now) || now < q.performanceEndedAt) throw Error("Wait for accompaniment completion.");
  q.completionDelayMs = now - q.performanceEndedAt; q.done = true;
}
export function assessPerformance(q: ProgressionQuestion, errors: Record<string, string>) {
  if (q.submitted) return;
  if (!isPlayByEar(q.config.mode) || !q.done || !q.referencePlayed) throw Error("Hear the full reference before self-assessment.");
  for (const [id, wrong] of Object.entries(errors)) {
    const note = q.notes.find(n => n.id === id);
    if (!note || wrong === note.degree || (wrong !== "unknown" && !degrees.includes(wrong))) throw Error("Choose a different degree or Unknown.");
  }
  for (const note of q.notes) { note.correct = !(note.id in errors); note.answer = note.correct ? note.degree : errors[note.id]; note.assisted = q.before > 0; }
  q.submitted = true;
}
