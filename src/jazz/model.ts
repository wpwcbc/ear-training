import {
  parseChord,
  targetPc,
  spellTarget,
  degreeForPc,
  inRange,
  nearestGuide,
  progressions,
  pitchClass,
  type Quality,
  type Chord,
} from "./theory.js";
export type Mode = "m1" | "m3" | "m4";
export interface Config {
  mode: Mode;
  root: string;
  quality: Quality;
  degree: string;
  roots: string;
  rootOrder: "fixed" | "random" | "cycle";
  progression: string;
  path: "guided" | "nearest";
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
}
export const defaults: Config = {
  mode: "m1",
  root: "D",
  quality: "m7",
  degree: "9",
  roots: "C D Eb F G Ab Bb",
  rootOrder: "fixed",
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
};
export interface Target {
  chord: Chord;
  degree: string;
  name: string;
  midi: number;
}
export interface Challenge {
  targets: Target[];
  progressionId: string;
}
export function generate(config: Config, index: number): Challenge {
  if (config.mode === "m1") {
    const roots = config.roots
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean);
    roots.forEach((root) => parseChord(root + config.quality));
    if (!roots.length) throw new Error("Enter at least one root.");
    const root =
      config.rootOrder === "fixed"
        ? config.root
        : config.rootOrder === "random"
          ? roots[Math.floor(Math.random() * roots.length)]
          : roots[index % roots.length];
    const chord = parseChord(root + config.quality);
    return {
      targets: [
        {
          chord,
          degree: config.degree,
          name: spellTarget(chord, config.degree),
          midi: inRange(
            targetPc(chord, config.degree),
            config.low,
            config.high,
          ),
        },
      ],
      progressionId: "single",
    };
  }
  const progression = progressions.find((p) => p.id === config.progression);
  if (!progression) throw new Error("Select a progression.");
  let previous = inRange(
    targetPc(parseChord(progression.chords[0]), progression.targets[0]),
    config.low,
    config.high,
  );
  const commonMidi = inRange(
    pitchClass(progression.common),
    config.low,
    config.high,
  );
  return {
    progressionId: progression.id,
    targets: progression.chords.map((symbol, i) => {
      const chord = parseChord(symbol);
      let degree = progression.targets[i];
      let midi: number;
      if (config.mode === "m3") {
        midi = commonMidi;
        degree = degreeForPc(chord, midi % 12);
      } else if (config.path === "nearest" && i > 0) {
        const next = nearestGuide(chord, previous, config.low, config.high);
        degree = next.degree;
        midi = next.midi;
      } else
        midi = inRange(
          targetPc(chord, degree),
          config.low,
          config.high,
          previous,
        );
      previous = midi;
      return { chord, degree, midi, name: spellTarget(chord, degree) };
    }),
  };
}
export type Grade = "correct" | "close" | "missed" | "skipped";
export interface RecordEntry {
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
}
export interface Session {
  id: string;
  timestamp: string;
  mode: Mode;
  config: Config;
  questionCount: number;
  totalTime: number;
  completedCount: number;
  records: RecordEntry[];
}
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export const keys = {
  config: "jazzEarLab:v1:config",
  sessions: "jazzEarLab:v1:sessions",
};
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
} {
  const recent = sessions
    .flatMap((s) => s.records)
    .filter(
      (r) =>
        Date.now() - Date.parse(r.timestamp) < 7 * 86400000 &&
        r.grade !== "skipped",
    )
    .slice(-20);
  if (!recent.length)
    return {
      mode: "m1",
      degree: "3",
      text: "Start with chord landmarks: produce a 3rd, then a 7th.",
    };
  const weak = recent
    .filter((r) => r.grade !== "correct" || r.replayCount > 1)
    .sort((a, b) => b.responseLatency - a.responseLatency)[0];
  if (weak)
    return {
      mode: weak.mode,
      degree: weak.targets[0],
      text: `Revisit ${weak.chords.join(" / ")} (${weak.targets.join(" / ")}). Recent ${weak.gradingSource === "self" ? "self-assessment" : "recognition"} suggests more practice.`,
    };
  const mode = recent[recent.length - 1].mode;
  return {
    mode: mode === "m1" ? "m3" : "m4",
    degree: "3",
    text:
      mode === "m1"
        ? "Try holding one pitch through changing chords."
        : "Try singing the next target before hearing its chord.",
  };
}
