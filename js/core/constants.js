export const CHORD_QUALITIES = [
    "maj7",
    "m7",
    "7",
    "m7b5",
    "dim7",
    "mmaj7",
    "+",
];
export const NOTE_NAMES_SHARP = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
];
export const RANDOM_ROOTS = [
    "C",
    "C#",
    "D",
    "Eb",
    "E",
    "F",
    "F#",
    "G",
    "Ab",
    "A",
    "Bb",
    "B",
];
export const MIN_CHORD_ROOT_MIDI = 43;
export const CHORD_VOICE_VELOCITIES = {
    root: 0.9,
    fifth: 0.65,
    seventh: 0.6,
    third: 0.55,
};
export const LEAD_VELOCITY_DEFAULT = 1;
export const DEFAULT_MODE1 = {
    keyCenter: "C",
    progression: [
        {
            chordDegree: "2",
            quality: "m7",
            allowedUpperDegrees: ["1", "2", "b3", "4", "5", "6", "b7"],
            questions: 1,
        },
        {
            chordDegree: "5",
            quality: "7",
            allowedUpperDegrees: ["1", "2", "3", "4", "5", "6", "b7"],
            questions: 1,
        },
        {
            chordDegree: "1",
            quality: "maj7",
            allowedUpperDegrees: ["1", "2", "3", "#4", "5", "6", "7"],
            questions: 1,
        },
    ],
};
