import { parseChord, targetPc, spellTarget, degreeForPc, inRange, nearestGuide, pitchClass, } from "./theory.js";
import { progressionBank, guideDegrees, parseProgression, } from "./progressions.js";
export const defaults = {
    mode: "m1",
    root: "D",
    quality: "m7",
    degree: "9",
    roots: "C D Eb F G Ab Bb",
    rootOrder: "fixed",
    progression: "major-f",
    path: "guided",
    count: 10,
    low: 48,
    high: 72,
    bpm: 72,
    beats: 4,
    context: "full",
    inversion: 0,
    volume: 0.6,
    timbre: "piano",
    showChords: true,
    commonMode: "recognize",
    span: 0,
    recognitionPool: "1 b3 3 5 b7 maj7 9 11 13",
    revealMode: "manual",
    predictionSeconds: 4,
    countIn: 0,
    gapBeats: 2,
    repeats: 1,
};
export function isRecognition(config) {
    return (config.mode === "m2" ||
        (config.mode === "m3" && config.commonMode === "recognize"));
}
export function isSequential(config) {
    return config.mode === "m4" || config.mode === "m5";
}
export function generate(config, index, customs = []) {
    if (config.mode === "m1" || config.mode === "m2") {
        const roots = config.roots
            .trim()
            .split(/[\s,]+/)
            .filter(Boolean);
        roots.forEach((root) => parseChord(root + config.quality));
        if (!roots.length)
            throw new Error("Enter at least one root.");
        const root = config.rootOrder === "fixed"
            ? config.root
            : config.rootOrder === "random"
                ? roots[Math.floor(Math.random() * roots.length)]
                : roots[index % roots.length];
        const chord = parseChord(root + config.quality);
        const options = config.mode === "m2"
            ? [
                ...new Set(config.recognitionPool
                    .trim()
                    .split(/[\s,]+/)
                    .filter(Boolean)
                    .map((degree) => degreeForPc(chord, targetPc(chord, degree)))),
            ]
            : [];
        if (config.mode === "m2" && !options.length)
            throw new Error("Enter at least one recognition degree.");
        const degree = config.mode === "m2"
            ? options[Math.floor(Math.random() * options.length)]
            : config.degree;
        return {
            targets: [
                {
                    chord,
                    degree,
                    name: spellTarget(chord, degree),
                    midi: inRange(targetPc(chord, degree), config.low, config.high),
                },
            ],
            progressionId: "single",
        };
    }
    const progression = [...progressionBank, ...customs].find((p) => p.id === config.progression);
    if (!progression)
        throw new Error("Select a progression.");
    let previous = inRange(targetPc(parseChord(progression.chords[0]), progression.targets[0]), config.low, config.high);
    const sourceChords = progression.chords.slice(0, config.span || (config.mode === "m3" ? 5 : undefined));
    const chords = Array.from({ length: isSequential(config) ? config.repeats : 1 }, () => sourceChords).flat();
    const commonPc = progression.common
        ? pitchClass(progression.common)
        : Array.from({ length: 12 }, (_, pc) => pc).sort((a, b) => {
            const score = (pc) => chords.reduce((sum, symbol) => {
                const chord = parseChord(symbol);
                const degree = degreeForPc(chord, pc);
                return (sum +
                    (guideDegrees(chord).includes(degree)
                        ? 3
                        : ["1", "5"].includes(degree)
                            ? 2
                            : 0));
            }, 0);
            return score(b) - score(a) || a - b;
        })[0];
    const commonMidi = inRange(commonPc, config.low, config.high);
    return {
        progressionId: progression.id,
        targets: chords.map((symbol, i) => {
            const chord = parseChord(symbol);
            const chordIndex = i % sourceChords.length;
            let degree = progression.targets[chordIndex];
            let midi;
            if (config.mode === "m3") {
                midi = commonMidi;
                degree = degreeForPc(chord, midi % 12);
            }
            else if (config.path === "nearest" && i > 0) {
                const next = nearestGuide(chord, previous, config.low, config.high);
                degree = next.degree;
                midi = next.midi;
            }
            else if (config.path === "common" && i > 0) {
                midi = previous;
                degree = degreeForPc(chord, midi % 12);
            }
            else if (["stepwise", "leap"].includes(config.path) && i > 0) {
                const options = ["1", ...guideDegrees(chord), "5", "9", "13"].flatMap((degree) => Array.from({ length: config.high - config.low + 1 }, (_, offset) => config.low + offset)
                    .filter((midi) => midi % 12 === targetPc(chord, degree))
                    .map((midi) => ({ degree, midi })));
                const filtered = options.filter((option) => config.path === "stepwise"
                    ? Math.abs(option.midi - previous) <= 2
                    : Math.abs(option.midi - previous) >= 3);
                if (!filtered.length)
                    throw new Error(`No ${config.path} target fits ${chord.symbol} in this range. Choose Guided or Nearest guide tone.`);
                const choice = filtered.sort((a, b) => Math.abs(a.midi - previous) - Math.abs(b.midi - previous))[0];
                degree = choice.degree;
                midi = choice.midi;
            }
            else
                midi = inRange(targetPc(chord, degree), config.low, config.high, previous);
            previous = midi;
            return {
                chord,
                degree,
                midi,
                name: spellTarget(chord, degree),
                beats: progression.beats?.[chordIndex] ?? config.beats,
            };
        }),
    };
}
export function validateConfig(config, customs = []) {
    const next = { ...config };
    const bounded = (key, min, max, integer = false) => {
        const value = next[key];
        if (typeof value !== "number" ||
            !Number.isFinite(value) ||
            value < min ||
            value > max ||
            (integer && !Number.isInteger(value)))
            throw new Error(`Invalid ${key}: choose ${min}-${max}${integer ? " (whole numbers)" : ""}.`);
    };
    bounded("low", 28, 84, true);
    bounded("high", 40, 96, true);
    if (next.high - next.low < 11)
        throw new Error("Choose a target range of at least 12 semitones.");
    bounded("bpm", 30, 240);
    bounded("beats", 1, 8, true);
    bounded("volume", 0, 1);
    bounded("inversion", 0, 2, true);
    bounded("predictionSeconds", 0.5, 30);
    bounded("countIn", 0, 8, true);
    bounded("gapBeats", 0, 4, true);
    bounded("repeats", 1, 8, true);
    if (![0, 5, 10, 20].includes(next.count) ||
        ![0, 2, 3, 4, 5].includes(next.span))
        throw new Error("Select a valid question count and progression length.");
    if (!["m1", "m2", "m3", "m4", "m5"].includes(next.mode) ||
        !["guided", "nearest", "common", "stepwise", "leap"].includes(next.path) ||
        !["recognize", "produce"].includes(next.commonMode) ||
        !["manual", "timed"].includes(next.revealMode))
        throw new Error("Select a valid practice mode.");
    if (next.mode === "m3")
        next.context = "full";
    if (!next.showChords && next.context !== "full")
        throw new Error("Root and shell contexts need visible chord symbols. Enable symbols or choose Full chord.");
    generate(next, 0, customs);
    return next;
}
export const keys = {
    config: "jazzEarLab:v1:config",
    sessions: "jazzEarLab:v1:sessions",
    progressions: "jazzEarLab:v1:progressions",
};
export function loadProgressions(storage) {
    try {
        const parsed = JSON.parse(storage.getItem(keys.progressions) || "[]");
        if (!Array.isArray(parsed))
            return [];
        return parsed.flatMap((value) => {
            try {
                if (typeof value.id !== "string" ||
                    !value.id.startsWith("custom-") ||
                    !Array.isArray(value.chords) ||
                    !Array.isArray(value.beats))
                    return [];
                return [parseStoredProgression(value)];
            }
            catch {
                return [];
            }
        });
    }
    catch {
        return [];
    }
}
function parseStoredProgression(value) {
    return parseProgression(value.chords.map((chord, i) => `${chord} ${value.beats?.[i]}`).join("\n"), value.name, value.id);
}
export function loadSessions(storage) {
    try {
        const data = JSON.parse(storage.getItem(keys.sessions) || "[]");
        return Array.isArray(data)
            ? data.filter((s) => !!s && Array.isArray(s.records) && typeof s.id === "string")
            : [];
    }
    catch {
        return [];
    }
}
export function saveSession(storage, session) {
    const sessions = loadSessions(storage).filter((s) => s.id !== session.id);
    storage.setItem(keys.sessions, JSON.stringify([...sessions, session].slice(-100)));
}
export function recommendation(sessions) {
    const recent = sessions
        .flatMap((s) => s.records)
        .filter((r) => Date.now() - Date.parse(r.timestamp) < 7 * 86400000 &&
        r.grade !== "skipped" &&
        !r.referenceAssisted)
        .slice(-20);
    if (!recent.length)
        return {
            mode: "m1",
            degree: "3",
            text: "Start with chord landmarks: produce a 3rd, then a 7th.",
        };
    const weak = recent
        .filter((r) => r.grade !== "correct" || r.replayCount > 1)
        .sort((a, b) => b.responseLatency - a.responseLatency)[0];
    if (weak)
        return {
            mode: weak.mode,
            degree: weak.targets[0],
            config: weak.config,
            text: `Revisit ${weak.chords.join(" / ")} (${weak.targets.join(" / ")}). Recent ${weak.gradingSource === "self" ? "self-assessment" : "recognition"} suggests more practice.`,
        };
    const mode = recent[recent.length - 1].mode;
    return {
        mode: mode === "m1" || mode === "m2" ? "m3" : mode === "m3" ? "m4" : "m5",
        degree: "3",
        text: mode === "m1"
            ? "Try holding one pitch through changing chords."
            : "Try singing the next target before hearing its chord.",
    };
}
