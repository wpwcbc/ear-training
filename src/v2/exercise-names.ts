/** Public vocabulary. Stored IDs and URLs remain stable for existing records. */
export const exerciseNames = {
  m1: "Single Chord · Degree Audiation",
  m2: "Single Chord · Degree Recognition",
  "progression-recognition": "Progression · Degree Recognition",
  "progression-singing": "Progression · Degree Audiation",
  "single-play-by-ear": "Single Chord · Play by Ear",
  "progression-play-by-ear": "Progression · Play by Ear",
} as const;

// "singing" is the historical serialized ID for progression degree audiation.
export const progressionModes = {
  degreeRecognition: "recognition",
  degreeAudiation: "singing",
  singlePlayByEar: "play-single",
  playByEar: "play",
} as const;
export type ProgressionMode = typeof progressionModes[keyof typeof progressionModes];

export function progressionExercise(mode: ProgressionMode) {
  if (mode === progressionModes.singlePlayByEar) return "single-play-by-ear" as const;
  if (mode === progressionModes.playByEar) return "progression-play-by-ear" as const;
  return mode === progressionModes.degreeAudiation
    ? "progression-singing" as const
    : "progression-recognition" as const;
}
export function progressionName(mode: ProgressionMode) {
  return exerciseNames[progressionExercise(mode)];
}

export function isPlayByEar(mode: ProgressionMode) { return mode === progressionModes.playByEar || mode === progressionModes.singlePlayByEar; }
