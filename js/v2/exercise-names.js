/** Public vocabulary. Stored IDs and URLs remain stable for existing records. */
export const exerciseNames = {
    m1: "Single Chord · Degree Audiation",
    m2: "Single Chord · Degree Recognition",
    "progression-recognition": "Progression · Degree Recognition",
    "progression-singing": "Progression · Degree Audiation",
    "single-play-by-ear": "Single Chord · Play by Ear",
    "progression-play-by-ear": "Progression · Play by Ear",
};
// "singing" is the historical serialized ID for progression degree audiation.
export const progressionModes = {
    degreeRecognition: "recognition",
    degreeAudiation: "singing",
    singlePlayByEar: "play-single",
    playByEar: "play",
};
export function progressionExercise(mode) {
    if (mode === progressionModes.singlePlayByEar)
        return "single-play-by-ear";
    if (mode === progressionModes.playByEar)
        return "progression-play-by-ear";
    return mode === progressionModes.degreeAudiation
        ? "progression-singing"
        : "progression-recognition";
}
export function progressionName(mode) {
    return exerciseNames[progressionExercise(mode)];
}
export function isPlayByEar(mode) { return mode === progressionModes.playByEar || mode === progressionModes.singlePlayByEar; }
export function modeForExercise(exercise) { return Object.values(progressionModes).find(mode => progressionExercise(mode) === exercise); }
