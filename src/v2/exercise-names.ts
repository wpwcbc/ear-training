/** Public vocabulary. Stored IDs and URLs remain stable for existing records. */
export const exerciseNames = {
  m1: "Single Chord · Degree Audiation",
  m2: "Single Chord · Degree Recognition",
  "progression-recognition": "Progression · Degree Recognition",
  "progression-singing": "Progression · Degree Audiation",
} as const;

// "singing" is the historical serialized ID for progression degree audiation.
export const progressionModes = {
  degreeRecognition: "recognition",
  degreeAudiation: "singing",
} as const;
export type ProgressionMode = typeof progressionModes[keyof typeof progressionModes];

export function progressionExercise(mode: ProgressionMode) {
  return mode === progressionModes.degreeAudiation
    ? "progression-singing" as const
    : "progression-recognition" as const;
}
export function progressionName(mode: ProgressionMode) {
  return exerciseNames[progressionExercise(mode)];
}
