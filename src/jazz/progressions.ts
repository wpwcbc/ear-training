import {
  parseChord,
  progressions as originalProgressions,
  type Chord,
} from "./theory.js";

export interface Progression {
  id: string;
  name: string;
  chords: string[];
  targets: string[];
  common?: string;
  beats?: number[];
}

export const progressionBank: Progression[] = [
  ...originalProgressions,
  {
    id: "secondary",
    name: "Secondary dominants / C-A7-Dm7-G7",
    chords: ["Cmaj7", "A7", "Dm7", "G7"],
    targets: ["3", "3", "b3", "b7"],
  },
  {
    id: "tritone",
    name: "Tritone substitution / Dm7-Db7-Cmaj7",
    chords: ["Dm7", "Db7", "Cmaj7"],
    targets: ["b7", "b7", "3"],
  },
  {
    id: "cycle",
    name: "ii-V cycle / C to Bb",
    chords: ["Dm7", "G7", "Cmaj7", "Cm7", "F7", "Bbmaj7"],
    targets: ["b3", "b7", "3", "b3", "b7", "3"],
  },
  {
    id: "blues",
    name: "Blues / closing turnaround",
    chords: ["Dm7", "G7", "C7", "A7"],
    targets: ["b3", "b7", "3", "3"],
  },
  {
    id: "rhythm",
    name: "Rhythm changes / bridge dominants",
    chords: ["D7", "G7", "C7", "F7"],
    targets: ["3", "b7", "3", "b7"],
    beats: [8, 8, 8, 8],
  },
  {
    id: "giant-centers",
    name: "Three tonal centers / B-G-Eb",
    chords: ["Bmaj7", "D7", "Gmaj7", "Bb7", "Ebmaj7", "F#7", "Bmaj7"],
    targets: ["3", "b7", "3", "b7", "3", "b7", "3"],
    beats: [2, 2, 2, 2, 4, 4, 4],
  },
  {
    id: "nonfunctional",
    name: "Non-functional / major colors",
    chords: ["Cmaj7", "F#maj7", "Ebmaj7", "Amaj7"],
    targets: ["maj7", "3", "maj7", "3"],
  },
];

export function guideDegrees(chord: Chord): string[] {
  return [
    chord.quality === "m7" || chord.quality === "m7b5" ? "b3" : "3",
    chord.quality === "maj7" ? "maj7" : "b7",
  ];
}

// Each row is a chord and its harmonic duration, independent of a global key.
export function parseProgression(
  text: string,
  name: string,
  id: string,
): Progression {
  if (!name.trim() || name.trim().length > 80)
    throw new Error("Give the progression a name (1-80 characters).");
  const rows = text
    .trim()
    .split(/\n/)
    .filter((row) => row.trim());
  if (rows.length < 2 || rows.length > 32)
    throw new Error("Enter 2-32 chords, one per line: Dm7 4");
  const chords: string[] = [],
    beats: number[] = [],
    targets: string[] = [];
  rows.forEach((row, index) => {
    const parts = row.trim().split(/\s+/);
    if (parts.length > 2)
      throw new Error(
        `Row ${index + 1}: use a chord symbol and beats, such as G7 4.`,
      );
    const chord = parseChord(parts[0]);
    const duration = parts[1] === undefined ? 4 : Number(parts[1]);
    if (
      !Number.isFinite(duration) ||
      duration < 1 ||
      duration > 16 ||
      !Number.isInteger(duration)
    )
      throw new Error(
        `Row ${index + 1}: beats must be a whole number from 1 to 16.`,
      );
    chords.push(chord.symbol);
    beats.push(duration);
    targets.push(guideDegrees(chord)[0]);
  });
  return { id, name: name.trim(), chords, beats, targets };
}
