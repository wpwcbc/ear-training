import { noteNameToPitchClassSemitones as corePitchClass } from "../core/theory.js";

export function pitchClass(name: string): number {
  const match = /^([A-Ga-g])([#b]*)$/.exec(name.trim());
  if (!match) throw new Error("Invalid note: " + name);
  const accidental = [...match[2]].reduce(
    (sum, ch) => sum + (ch === "#" ? 1 : -1),
    0,
  );
  return (corePitchClass(match[1]) + accidental + 120) % 12;
}
export const qualities = [
  "maj7",
  "m7",
  "7",
  "m7b5",
  "sus4",
  "7sus4",
  "dim7",
  "7alt",
  "7b9",
  "7#9",
  "mmaj7",
  "maj6",
  "m6",
  "maj9",
  "m9",
  "9",
  "13",
  "maj",
  "m",
] as const;
export type Quality = (typeof qualities)[number];
export interface Chord {
  root: string;
  quality: Quality;
  symbol: string;
}
const intervals: Record<Quality, number[]> = {
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  "7": [0, 4, 7, 10],
  m7b5: [0, 3, 6, 10],
  sus4: [0, 5, 7],
  "7sus4": [0, 5, 7, 10],
  dim7: [0, 3, 6, 9],
  "7alt": [0, 4, 6, 10, 13],
  "7b9": [0, 4, 7, 10, 13],
  "7#9": [0, 4, 7, 10, 15],
  mmaj7: [0, 3, 7, 11],
  maj6: [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  maj9: [0, 4, 7, 11, 14],
  m9: [0, 3, 7, 10, 14],
  "9": [0, 4, 7, 10, 14],
  "13": [0, 4, 7, 10, 21],
  maj: [0, 4, 7],
  m: [0, 3, 7],
};
export const degrees = [
  "1",
  "b9",
  "9",
  "b3",
  "#9",
  "3",
  "11",
  "#11",
  "b5",
  "5",
  "b13",
  "13",
  "b7",
  "maj7",
  "4",
  "6",
  "bb7",
  "#5",
];
const offsets: Record<string, number> = {
  "1": 0,
  b9: 1,
  "9": 2,
  b3: 3,
  "#9": 3,
  "3": 4,
  "11": 5,
  "#11": 6,
  b5: 6,
  "5": 7,
  b13: 8,
  "13": 9,
  b7: 10,
  maj7: 11,
  "4": 5,
  "6": 9,
  bb7: 9,
  "#5": 8,
};
export function parseChord(symbol: string): Chord {
  const match = /^([A-G](?:#|b){0,2})(.*)$/.exec(symbol.trim());
  if (!match || !(qualities as readonly string[]).includes(match[2] || "maj"))
    throw new Error("Use chord symbols such as Dm7, G7, Cmaj7 or Bm7b5.");
  const quality = (match[2] || "maj") as Quality;
  return { root: match[1], quality, symbol: match[1] + quality };
}
export function targetPc(chord: Chord, degree: string): number {
  if (!Object.prototype.hasOwnProperty.call(offsets, degree))
    throw new Error("Unsupported degree: " + degree);
  return (pitchClass(chord.root) + offsets[degree]) % 12;
}
export function spellTarget(chord: Chord, degree: string): string {
  const number = degree === "maj7" ? 7 : Number(degree.replace(/[#b]/g, ""));
  const letters = "CDEFGAB";
  const letter = letters[(letters.indexOf(chord.root[0]) + number - 1) % 7];
  let delta = (targetPc(chord, degree) - pitchClass(letter) + 12) % 12;
  if (delta > 6) delta -= 12;
  return letter + (delta < 0 ? "b".repeat(-delta) : "#".repeat(delta));
}
export function degreeForPc(chord: Chord, pc: number): string {
  const distance = (pc - pitchClass(chord.root) + 12) % 12;
  const names = [
    "1",
    "b9",
    "9",
    ["7", "7alt", "7b9", "7#9", "9", "13"].includes(chord.quality)
      ? "#9"
      : "b3",
    "3",
    ["sus4", "7sus4"].includes(chord.quality) ? "4" : "11",
    ["m7b5", "dim7", "7alt"].includes(chord.quality) ? "b5" : "#11",
    "5",
    "b13",
    chord.quality === "dim7"
      ? "bb7"
      : ["maj6", "m6"].includes(chord.quality)
        ? "6"
        : "13",
    "b7",
    "maj7",
  ];
  return names[distance];
}
export function chordToneDegrees(chord: Chord): string[] {
  return intervals[chord.quality].map((offset) =>
    degreeForPc(chord, (pitchClass(chord.root) + offset) % 12),
  );
}
export function guides(chord: Chord): string[] {
  const tones = chordToneDegrees(chord),
    result = tones.filter((d) => ["b3", "3", "b7", "maj7", "bb7"].includes(d));
  return result.length
    ? result
    : tones.filter((d) => ["1", "4", "5"].includes(d));
}
export function tensionDegrees(chord: Chord): string[] {
  if (chord.quality === "7alt") return ["b9", "#9", "b5", "b13"];
  if (chord.quality === "7b9") return ["b9", "11", "b13"];
  if (chord.quality === "7#9") return ["#9", "#11", "b13"];
  return ["9", chord.quality.startsWith("maj") ? "#11" : "11", "13"];
}
export function recognitionDegrees(chord: Chord): string[] {
  return Array.from({ length: 12 }, (_, pc) =>
    degreeForPc(chord, (pitchClass(chord.root) + pc) % 12),
  );
}
export function inRange(
  pc: number,
  low: number,
  high: number,
  near = (low + high) / 2,
): number {
  const candidates = Array.from({ length: 128 }, (_, i) => i).filter(
    (n) => n >= low && n <= high && n % 12 === pc,
  );
  if (!candidates.length)
    throw new Error(
      "This range does not contain the target pitch. Widen the range.",
    );
  return candidates.sort(
    (a, b) => Math.abs(a - near) - Math.abs(b - near) || a - b,
  )[0];
}
export function chordNotes(chord: Chord, inversion = 0): number[] {
  const notes = intervals[chord.quality].map(
    (n) => 48 + pitchClass(chord.root) + n,
  );
  for (let i = 0; i < inversion; i++) notes.push(notes.shift()! + 12);
  return notes;
}
export function nearestGuide(
  chord: Chord,
  previous: number,
  low: number,
  high: number,
): { degree: string; midi: number } {
  const options = guides(chord);
  return options
    .map((degree) => ({
      degree,
      midi: inRange(targetPc(chord, degree), low, high, previous),
    }))
    .sort(
      (a, b) => Math.abs(a.midi - previous) - Math.abs(b.midi - previous),
    )[0];
}
export const progressions = [
  {
    id: "major-f",
    name: "Major ii-V-I / Path A",
    chords: ["Dm7", "G7", "Cmaj7"],
    targets: ["b3", "b7", "3"],
    common: "F",
  },
  {
    id: "major-c",
    name: "Major ii-V-I / Path B",
    chords: ["Dm7", "G7", "Cmaj7"],
    targets: ["b7", "3", "1"],
    common: "F",
  },
  {
    id: "mediants",
    name: "Chromatic mediants",
    chords: ["Cmaj7", "Eb7", "Abmaj7"],
    targets: ["5", "3", "maj7"],
    common: "G",
  },
  {
    id: "minor",
    name: "Minor ii-V-i",
    chords: ["Dm7b5", "G7", "Cm7"],
    targets: ["b3", "3", "b3"],
    common: "F",
  },
];
