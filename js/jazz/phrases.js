import { parseChord, pitchClass, spellTarget, degreeForPc } from "./theory.js";
const note = (midi, beats, chord, role, target = false) => ({ midi, beats, chord, role, target });
// Original, deliberately composed three-bar studies; no imported recordings or transcriptions.
export const phrases = [
    {
        id: "anticipations",
        name: "Original study / early arrival",
        license: "Original Jazz Ear Lab study, CC0-1.0",
        chords: ["Dm7", "G7", "Cmaj7"],
        notes: [
            note(65, 1, 0, "target", true),
            note(69, 1, 0, "chord tone"),
            note(72, 0.5, 0, "enclosure"),
            note(70, 0.5, 0, "enclosure"),
            note(71, 1, 0, "anticipation"),
            note(71, 1, 1, "target", true),
            note(65, 1, 1, "chord tone"),
            note(62, 1, 1, "chord tone"),
            note(64, 1, 1, "anticipation"),
            note(64, 2, 2, "target", true),
            note(67, 1, 2, "chord tone"),
            note(60, 1, 2, "resolution"),
        ],
    },
    {
        id: "landmarks",
        name: "Original study / upper landmarks",
        license: "Original Jazz Ear Lab study, CC0-1.0",
        chords: ["Dm7", "G7", "Cmaj7"],
        notes: [
            note(65, 0.5, 0, "target", true),
            note(69, 0.5, 0, "chord tone"),
            note(72, 1, 0, "chord tone"),
            note(71, 0.5, 0, "passing"),
            note(70, 0.5, 0, "passing"),
            note(69, 1, 0, "chord tone"),
            note(71, 1, 1, "target", true),
            note(74, 0.5, 1, "chord tone"),
            note(77, 0.5, 1, "chord tone"),
            note(76, 0.5, 1, "tension"),
            note(73, 0.5, 1, "approach"),
            note(74, 1, 1, "chord tone"),
            note(76, 1, 2, "target", true),
            note(74, 0.5, 2, "tension"),
            note(73, 0.5, 2, "approach"),
            note(72, 2, 2, "resolution"),
        ],
    },
    {
        id: "enclosures",
        name: "Original study / enclosed third",
        license: "Original Jazz Ear Lab study, CC0-1.0",
        chords: ["Dm7", "G7", "Cmaj7"],
        notes: [
            note(69, 0.5, 0, "target", true),
            note(68, 0.5, 0, "passing"),
            note(67, 1, 0, "chord tone"),
            note(65, 1, 0, "chord tone"),
            note(64, 1, 0, "tension"),
            note(65, 0.5, 1, "chord tone"),
            note(62, 0.5, 1, "chord tone"),
            note(58, 0.5, 1, "approach"),
            note(59, 1.5, 1, "target", true),
            note(62, 1, 1, "chord tone"),
            note(65, 0.5, 2, "enclosure"),
            note(63, 0.5, 2, "enclosure"),
            note(64, 1, 2, "target", true),
            note(67, 2, 2, "resolution"),
        ],
    },
];
const rootNames = [
    "C",
    "Db",
    "D",
    "Eb",
    "E",
    "F",
    "Gb",
    "G",
    "Ab",
    "A",
    "Bb",
    "B",
];
export function transformPhrase(id, transpose, variation, low, high) {
    const original = phrases.find((p) => p.id === id);
    if (!original)
        throw new Error("Choose a phrase.");
    let notes = original.notes.map((n) => ({ ...n, midi: n.midi + transpose }));
    const chords = original.chords.map((symbol) => {
        const chord = parseChord(symbol);
        return (rootNames[(pitchClass(chord.root) + transpose + 120) % 12] + chord.quality);
    });
    if (variation === "rhythm")
        for (let i = 0; i < notes.length - 1; i++) {
            const a = notes[i], b = notes[i + 1];
            if (!a.target &&
                !b.target &&
                a.chord === b.chord &&
                a.beats === 0.5 &&
                b.beats === 0.5) {
                a.beats = 0.75;
                b.beats = 0.25;
                i++;
            }
        }
    if (variation === "approach" || variation === "enclosure")
        notes.forEach((target, i) => {
            if (!target.target || i === 0)
                return;
            if (!notes[i - 1].target) {
                notes[i - 1].midi = target.midi - 1;
                notes[i - 1].role =
                    variation === "enclosure" ? "enclosure" : "approach";
            }
            if (variation === "enclosure" && i > 1 && !notes[i - 2].target) {
                notes[i - 2].midi = target.midi + 1;
                notes[i - 2].role = "enclosure";
            }
        });
    const octave = [-36, -24, -12, 0, 12, 24, 36]
        .filter((shift) => notes.every((n) => n.midi + shift >= low && n.midi + shift <= high))
        .sort((a, b) => Math.abs(a) - Math.abs(b))[0];
    if (octave === undefined)
        throw new Error("The whole phrase does not fit this register. Widen your range.");
    notes = notes.map((n) => ({ ...n, midi: n.midi + octave }));
    return { ...original, chords, notes };
}
export function phraseNoteName(phrase, note) {
    const chord = parseChord(phrase.chords[note.chord]);
    return spellTarget(chord, degreeForPc(chord, note.midi % 12));
}
