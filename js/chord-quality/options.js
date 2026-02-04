export const QUALITY_OPTIONS = [
    { id: "maj7", label: "Major 7", intervalSets: [[0, 4, 7, 11]] },
    {
        id: "m7",
        label: "Minor 7 / Major 6",
        intervalSets: [
            [0, 3, 7, 10],
            [0, 4, 7, 9],
        ],
    },
    { id: "7", label: "Dominant 7", intervalSets: [[0, 4, 7, 10]] },
    {
        id: "m6m7b5",
        label: "m6 / m7b5",
        intervalSets: [
            [0, 3, 7, 9],
            [0, 3, 6, 10],
        ],
    },
    { id: "dim7", label: "Diminished 7", intervalSets: [[0, 3, 6, 9]] },
    { id: "sus4", label: "Sus 4", intervalSets: [[0, 5, 7, 10]] },
    { id: "7b9", label: "7 flat 9", intervalSets: [[0, 4, 7, 10, 13]] },
    { id: "7#9", label: "7 sharp 9", intervalSets: [[0, 4, 7, 10, 15]] },
    { id: "7alt", label: "Altered 7", intervalSets: [[0, 4, 8, 10, 13]] },
];
export const FIVE_NOTE_QUALITIES = ["7b9", "7#9", "7alt"];
export const VOICING_OPTIONS = [
    {
        id: "closed",
        label: "Closed (#1-#2-#3-#4)",
        order: [0, 1, 2, 3],
        octaves: [0, 0, 0, 0],
    },
    {
        id: "open-1573",
        label: "Drop2 (#1-#3-#4-#2)",
        order: [0, 2, 3, 1],
        octaves: [0, 0, 0, 12],
    },
    {
        id: "open-1537",
        label: "Open (#1-#3-#2-#4)",
        order: [0, 2, 1, 3],
        octaves: [0, 0, 12, 12],
    },
];
export const getQualityOption = (id) => QUALITY_OPTIONS.find((option) => option.id === id);
export const getVoicingOption = (id) => VOICING_OPTIONS.find((option) => option.id === id);
