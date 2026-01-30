export const QUALITY_OPTIONS = [
    { id: "maj7", label: "Major 7", intervals: [0, 4, 7, 11] },
    { id: "m7", label: "Minor 7", intervals: [0, 3, 7, 10] },
    { id: "7", label: "Dominant 7", intervals: [0, 4, 7, 10] },
    { id: "m7b5", label: "Half-diminished 7", intervals: [0, 3, 6, 10] },
    { id: "dim7", label: "Diminished 7", intervals: [0, 3, 6, 9] },
    { id: "maj6", label: "Major 6", intervals: [0, 4, 7, 9] },
    { id: "m6", label: "Minor 6", intervals: [0, 3, 7, 9] },
    { id: "sus2", label: "Sus 2", intervals: [0, 2, 7, 10] },
    { id: "sus4", label: "Sus 4", intervals: [0, 5, 7, 10] },
    { id: "7b9", label: "7 flat 9", intervals: [0, 4, 10, 13] },
    { id: "7#9", label: "7 sharp 9", intervals: [0, 4, 10, 15] },
    { id: "7alt", label: "Altered 7", intervals: [0, 4, 10, 8] },
];
export const VOICING_OPTIONS = [
    {
        id: "closed",
        label: "Closed (1-3-5-7)",
        order: [0, 1, 2, 3],
        octaves: [0, 0, 0, 0],
    },
    {
        id: "open-1573",
        label: "Open (1-5-7-3)",
        order: [0, 2, 3, 1],
        octaves: [0, 0, 0, 12],
    },
    {
        id: "open-1537",
        label: "Open (1-5-3-7)",
        order: [0, 2, 1, 3],
        octaves: [0, 0, 12, 12],
    },
];
export const getQualityOption = (id) => QUALITY_OPTIONS.find((option) => option.id === id);
export const getVoicingOption = (id) => VOICING_OPTIONS.find((option) => option.id === id);
