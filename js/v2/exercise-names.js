/** Public vocabulary. Stored IDs and URLs remain stable for existing records. */
export const exerciseNames = {
    m1: "Single Chord · Degree Audiation",
    m2: "Single Chord · Degree Recognition",
    "progression-recognition": "Progression · Degree Recognition",
    "progression-singing": "Progression · Degree Audiation",
};
// "singing" is the historical serialized ID for progression degree audiation.
export const progressionModes = {
    degreeRecognition: "recognition",
    degreeAudiation: "singing",
};
export function progressionExercise(mode) {
    return mode === progressionModes.degreeAudiation
        ? "progression-singing"
        : "progression-recognition";
}
export function progressionName(mode) {
    return exerciseNames[progressionExercise(mode)];
}
