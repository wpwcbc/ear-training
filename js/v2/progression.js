import { progressionModes } from "./exercise-names.js";
import { parseChord, pitchClass, chordToneDegrees, chordNotes, targetPc, inRange, degrees, } from "../jazz/theory.js";
export const practiceKeys = "C C# D Eb E F F# G Ab A Bb B".split(" ");
export const templates = {
    major: ["Dm7", "G7", "Cmaj7"],
    minor: ["Dm7b5", "G7", "Cm7"],
    backdoor: ["Fm7", "Bb7", "Cmaj7"],
};
export const defaults = {
    mode: progressionModes.degreeRecognition,
    chords: templates.major.map((symbol) => ({ symbol, beats: 4 })),
    bpm: 80,
    notes: 2,
    count: 10,
    volume: 0.6,
    levels: [1, 1, 1, 1, 1],
    pools: {
        m7: ["1", "b3", "5", "b7"],
        "7": ["3", "b7", "9"],
        maj7: ["1", "3", "5", "maj7"],
    },
};
export function validate(input) {
    const c = structuredClone(input);
    c.keyMode ?? (c.keyMode = "fixed");
    c.key ?? (c.key = "C");
    c.keyPool ?? (c.keyPool = [...practiceKeys]);
    if (!["fixed", "random"].includes(c.keyMode) || !practiceKeys.includes(c.key) || !Array.isArray(c.keyPool) || c.keyPool.some(k => !practiceKeys.includes(k)) || new Set(c.keyPool).size !== c.keyPool.length || (c.keyMode === "random" && !c.keyPool.length))
        throw Error("Choose a valid practice key and at least one random key.");
    if (!Object.values(progressionModes).includes(c.mode) ||
        !Number.isFinite(c.bpm) ||
        c.bpm < 20 ||
        c.bpm > 300 ||
        !Number.isInteger(c.notes) ||
        c.notes < 1 ||
        c.notes > 4 ||
        !Number.isInteger(c.count) ||
        c.count < 0 ||
        c.count > 200 ||
        !Number.isFinite(c.volume) ||
        c.volume < 0 ||
        c.volume > 1)
        throw Error("Choose BPM 20–300, 1–4 notes/chord, 0–200 questions and valid volume.");
    if (!Array.isArray(c.chords) || c.chords.length < 2 || c.chords.length > 32)
        throw Error("Choose 2–32 chord occurrences.");
    if (!Array.isArray(c.levels) ||
        c.levels.length !== 5 ||
        c.levels.some((x) => !Number.isFinite(x) || x < 0 || x > 2))
        throw Error("Voice levels must be 0–200%.");
    for (const row of c.chords) {
        const chord = parseChord(row.symbol);
        if (!Number.isInteger(row.beats) || row.beats < 1 || row.beats > 16)
            throw Error("Each chord needs 1–16 beats.");
        const pool = c.pools[chord.quality];
        if (!Array.isArray(pool) ||
            !pool.length ||
            pool.some((d) => !degrees.includes(d)) ||
            new Set(pool).size !== pool.length)
            throw Error(chord.quality + " needs supported target degrees without duplicates.");
    }
    return c;
}
export function generate(input, random = Math.random, drawnKey) {
    const source = validate(input), config = structuredClone(source), key = drawnKey ?? source.key, id = crypto.randomUUID();
    if (!practiceKeys.includes(key))
        throw Error("Unsupported practice key.");
    const offset = pitchClass(key);
    config.chords = source.chords.map(row => { const chord = parseChord(row.symbol); return { ...row, symbol: practiceKeys[(pitchClass(chord.root) + offset) % 12] + chord.quality }; });
    return {
        id,
        config, source, practiceKey: key,
        created: new Date().toISOString(),
        submitted: false,
        done: false,
        before: 0,
        after: 0,
        notes: config.chords.flatMap((row, occurrence) => {
            const chord = parseChord(row.symbol), pool = config.pools[chord.quality];
            return Array.from({ length: config.notes }, (_, position) => {
                const degree = pool[Math.floor(random() * pool.length)];
                return {
                    id: `${id}:${occurrence}:${position}`,
                    occurrence,
                    position,
                    chord,
                    degree,
                    midi: inRange(targetPc(chord, degree), 60, 83),
                    answer: null,
                    correct: null,
                    assisted: false,
                };
            });
        }),
    };
}
/** One frozen session: only requesting a new question consumes a key draw. */
export function questionStream(input, random = Math.random) {
    const source = validate(input);
    let bag = [], last = "";
    return () => {
        let key = source.key;
        if (source.keyMode === "random") {
            if (!bag.length) {
                bag = [...source.keyPool];
                for (let i = bag.length - 1; i > 0; i--) {
                    const j = Math.floor(random() * (i + 1));
                    [bag[i], bag[j]] = [bag[j], bag[i]];
                }
                if (bag.length > 1 && bag[0] === last)
                    [bag[0], bag[1]] = [bag[1], bag[0]];
            }
            key = bag.shift();
            last = key;
        }
        return generate(source, random, key);
    };
}
export function submit(q, answers) {
    if (q.submitted)
        return;
    if (answers.length !== q.notes.length ||
        answers.some((a) => a !== "unknown" && !degrees.includes(a)))
        throw Error("Choose a degree or Don’t know for every note.");
    q.notes.forEach((n, i) => {
        n.answer = answers[i];
        n.correct = answers[i] === n.degree;
        n.assisted = q.before > 0;
    });
    q.submitted = true;
}
export function rate(q, index, correct, wrong) {
    const n = q.notes[index];
    if (q.config.mode !== progressionModes.degreeAudiation || !n)
        throw Error("Invalid self-rating.");
    if (n.correct !== null)
        return;
    if (!correct &&
        (!wrong ||
            wrong === n.degree ||
            (wrong !== "unknown" && !degrees.includes(wrong))))
        throw Error("Choose a different degree or Unknown.");
    n.correct = correct;
    n.answer = correct ? n.degree : wrong;
    n.assisted = q.before > 0;
}
export function report(questions) {
    const notes = [
        ...new Map(questions.flatMap((q) => q.notes).map((n) => [n.id, n])).values(),
    ], assessed = notes.filter((n) => n.correct !== null);
    return {
        assessed: assessed.length,
        correct: assessed.filter((n) => n.correct).length,
        unassessed: notes.length - assessed.length,
        assisted: assessed.filter((n) => n.assisted).length,
    };
}
export function sequence(q, melody) {
    const c = q.config, beat = 60 / c.bpm;
    let cursor = 4 * beat;
    const events = [];
    const starts = [];
    c.chords.forEach((row, i) => {
        const duration = row.beats * beat, chord = parseChord(row.symbol), notes = chordNotes(chord), scale = 1 /
            Math.max(1, (notes.reduce((s, _, j) => s + c.levels[j] * 0.09, 0) + 0.24) / 0.94);
        starts.push(cursor);
        notes.forEach((midi, j) => {
            if (c.levels[j] > 0)
                events.push({
                    midi,
                    start: cursor,
                    duration: Math.max(0.03, duration - 0.03),
                    level: c.volume * c.levels[j] * 0.09 * scale,
                });
        });
        if (melody)
            q.notes
                .filter((n) => n.occurrence === i)
                .forEach((n) => events.push({
                midi: n.midi,
                start: cursor + (n.position * duration) / c.notes,
                duration: Math.max(0.03, duration / c.notes - 0.03),
                level: c.volume * 0.24 * scale,
            }));
        cursor += duration;
    });
    return { events, starts, duration: cursor, countIn: beat };
}
export function addQualityPools(c) {
    var _a, _b;
    for (const row of c.chords) {
        const chord = parseChord(row.symbol);
        (_a = c.pools)[_b = chord.quality] ?? (_a[_b] = chordToneDegrees(chord));
    }
}
