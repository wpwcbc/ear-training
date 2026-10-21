import { generate, validateConfig, } from "../model.js";
import { parseChord, targetPc } from "../theory.js";
import { progressionBank } from "../progressions.js";
import { bassPositions } from "../bass.js";
import { phrases } from "../phrases.js";
import { seededRandom } from "../lifecycle.js";
import { hash } from "./types.js";
export function defaultFocusIndex(e) {
    if (e.record.analytics?.troubleSteps?.length)
        return Math.max(1, e.record.analytics.troubleSteps[0]);
    if (e.mode === "m3" && e.source === "automatic") {
        const wrong = e.record.targets.findIndex((degree, i) => e.record.selectedDegrees?.[i] !== degree ||
            (e.record.selectedQualities &&
                e.record.selectedQualities[i] !==
                    parseChord(e.record.chords[i]).quality));
        if (wrong >= 0)
            return Math.max(1, wrong);
    }
    return e.record.chordStep || 1;
}
export function validateScheduled(question, config) {
    if (question.focus?.kind === "phrase-stage" &&
        question.focus.stage !== config.phraseFocus)
        throw new Error("The scheduled phrase stage differs from the execution plan.");
    if (!question.targets.length ||
        (["m3", "m4", "m5"].includes(config.mode) && question.targets.length < 2))
        throw new Error("This task needs at least two saved chord targets.");
    for (const target of question.targets) {
        const chord = parseChord(target.chord.symbol);
        if (chord.quality !== target.chord.quality ||
            targetPc(chord, target.degree) !== ((target.midi % 12) + 12) % 12)
            throw new Error("Saved target does not match its chord and degree.");
        const low = config.mode === "m7" ? config.bassLow : config.low, high = config.mode === "m7" ? config.bassHigh : config.high;
        if (!Number.isInteger(target.midi) ||
            target.midi < low ||
            target.midi > high)
            throw new Error("A scheduled note is outside the saved register.");
        if (target.secondMidi !== undefined &&
            (!target.secondDegree ||
                targetPc(chord, target.secondDegree) !== target.secondMidi % 12 ||
                target.secondMidi < low ||
                target.secondMidi > high))
            throw new Error("Invalid second target.");
        if (config.mode === "m3" &&
            target.midi !== (config.heldMidi ?? question.targets[0].midi))
            throw new Error("The held pitch changed.");
        if (config.mode === "m7" &&
            !bassPositions(target.midi, config.fretLow, config.fretHigh).some((p) => !config.bassString || p.string === config.bassString))
            throw new Error("The scheduled pitch cannot be played in the required position.");
    }
    if (config.mode === "m6" &&
        (!question.phrase || question.phrase.id !== config.phraseId))
        throw new Error("The saved phrase is unavailable.");
}
function schedule(focus, contrast, seed) {
    const questions = [
        ...Array.from({ length: 7 }, () => structuredClone(focus)),
        ...Array.from({ length: 3 }, () => structuredClone(contrast)),
    ];
    const random = seededRandom(seed, 0);
    for (let i = 9; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
    }
    return questions;
}
function finish(cell, route, config, questions, reason, predicate, changed = [], customs = cell.rows[0].session.customSnapshot ?? []) {
    validateConfig(config, customs);
    if (questions.length !== 10)
        throw new Error("A focused set must contain ten validated questions.");
    questions.forEach((q) => validateScheduled(q, { ...config, ...q.presentation }));
    const e = cell.rows[0], id = "focus-" + hash([cell.id, predicate, questions]);
    const plan = {
        id,
        version: 1,
        reason,
        sourceCohortKey: e.cohortKey,
        evidenceAsOf: new Date().toISOString(),
        evidenceAssessmentIds: cell.rows.map((r) => r.id),
        config,
        customSnapshots: structuredClone(customs),
        questions,
        selectionPolicy: "contrast",
        questionCount: 10,
        compatibleGeneratorVersion: "insights-focus-2",
        originRoute: route,
        baseline: structuredClone(e.config),
        changedDifficulty: changed,
        targetPredicate: predicate,
    };
    return {
        supported: true,
        plan,
        preview: questions.map((q) => q.targets
            .map((t) => `${t.chord.symbol}/${t.degree} (${t.midi})`)
            .join(" → ")),
    };
}
export function qualityContrast(cell, route) {
    try {
        const e = cell.rows[0], expected = parseChord(e.record.chords[0]), selected = cell.rows
            .map((r) => r.record.selectedQualities?.[0])
            .find((q) => q && q !== expected.quality);
        if (!selected)
            throw new Error("No committed quality contrast is available.");
        parseChord(expected.root + selected);
        const config = {
            ...e.config,
            count: 10,
            root: expected.root,
            roots: expected.root,
            rootOrder: "fixed",
            quality: expected.quality,
            qualityPool: undefined,
            degreePool: undefined,
            progressionPool: undefined,
            recognitionQualities: [expected.quality, selected].join(" "),
        };
        const seed = hash([cell.id, selected]);
        const questions = Array.from({ length: 10 }, (_, i) => generate(validateConfig({
            ...config,
            recognitionQualities: i % 2 ? selected : expected.quality,
            degreePool: [e.record.targets[0]],
        }, e.session.customSnapshot ?? []), i, e.session.customSnapshot ?? [], seededRandom(seed, i)));
        config.degreePool = [e.record.targets[0]];
        return finish(cell, route, config, questions, `${expected.root}: 5 ${expected.quality} / 5 ${selected}; degree ${e.record.targets[0]}`, {
            kind: "quality-pair",
            qualities: [expected.quality, selected],
            degree: e.record.targets[0],
        }, ["Balanced expected qualities; original answer choices retained"]);
    }
    catch (error) {
        return { supported: false, unsupportedReason: String(error) };
    }
}
export function compileAdvanced(cell, route) {
    try {
        const e = cell.rows[0], saved = e.challenge;
        if (!saved)
            throw new Error("The original question snapshot is missing. Configure new practice to collect this context.");
        let config = { ...e.config, count: 10 };
        const seed = hash(cell.id);
        if (e.mode === "m3") {
            const at = Math.max(1, Math.min(saved.targets.length - 1, cell.focus?.targetIndex ?? defaultFocusIndex(e))), pair = saved.targets.slice(at - 1, at + 1), midi = pair[0].midi;
            if (pair.some((t) => t.midi !== midi))
                throw new Error("The saved sequence does not preserve a single held pitch.");
            const custom = {
                id: "custom-held-" + seed,
                name: "Focused held-pitch pair",
                chords: pair.map((t) => t.chord.symbol),
                targets: pair.map((t) => t.degree),
                beats: pair.map((t) => t.beats ?? config.beats),
            };
            const customs = [
                ...(e.session.customSnapshot ?? []).filter((p) => p.id !== custom.id),
                custom,
            ];
            config = {
                ...config,
                heldMidi: midi,
                progression: custom.id,
                progressionPool: [custom.id],
                span: 2,
            };
            const focus = generate(validateConfig(config, customs), 0, customs, seededRandom(seed, 0));
            focus.focus = { kind: "held-pitch", sourceIndices: [at - 1, at] };
            const contrast = {
                ...structuredClone(focus),
                targets: [...structuredClone(focus.targets)].reverse(),
            };
            const result = finish(cell, route, config, schedule(focus, contrast, seed), `Held MIDI ${midi}: 7 ${pair.map((t) => t.chord.symbol + "/" + t.degree).join(" → ")}; 3 reverse-role contrasts`, { kind: "held-pitch", midi, chords: pair.map((t) => t.chord.symbol) }, ["Two-chord span; reverse order contrasts"], customs);
            if (result.plan &&
                e.source === "self" &&
                !e.record.analytics?.troubleSteps?.length)
                result.plan.reason +=
                    " · diagnostic pair; the whole-run rating does not identify a failed chord";
            return result;
        }
        if (e.mode === "m4") {
            const at = Math.max(1, Math.min(saved.targets.length - 1, cell.focus?.targetIndex ?? e.record.chordStep ?? 1));
            const focus = {
                ...structuredClone(saved),
                targets: structuredClone(saved.targets.slice(at - 1, at + 1)),
                focus: { kind: "transition", sourceIndices: [at - 1, at] },
            };
            const contrast = structuredClone(saved);
            contrast.presentation = { repeats: config.repeats };
            config = { ...config, repeats: 1 };
            focus.presentation = { repeats: 1 };
            const same = saved.targets.length === 2;
            const questions = same
                ? Array.from({ length: 10 }, () => structuredClone(focus))
                : schedule(focus, contrast, seed);
            const result = finish(cell, route, config, questions, `${same ? "10 exact transition reviews" : "7 focused transition reviews; 3 full-progression reviews"} · ${focus.targets.map((t) => t.chord.symbol + "/" + t.degree).join(" → ")} · original prediction window`, {
                kind: "transition",
                source: focus.targets[0].chord.symbol,
                destination: focus.targets[1].chord.symbol,
                motion: focus.targets[1].midi - focus.targets[0].midi,
            }, [
                "Stored source/destination targets; single-pass exact transition review; full contrasts retain original repeats",
            ]);
            if (result.plan)
                result.plan.selectionPolicy = "exact-review";
            return result;
        }
        if (e.mode === "m5") {
            const chosen = cell.focus?.targetIndex ??
                e.record.analytics?.troubleSteps?.[0] ??
                e.record.chordStep ??
                1;
            const at = Math.max(1, Math.min(saved.targets.length - 1, chosen)), first = Math.max(0, at - 1), end = Math.min(saved.targets.length, at + 2);
            const focus = {
                ...structuredClone(saved),
                targets: structuredClone(saved.targets.slice(first, end)),
                focus: {
                    kind: "section",
                    sourceIndices: Array.from({ length: end - first }, (_, i) => i + first),
                },
            };
            const contrast = structuredClone(saved);
            contrast.presentation = { repeats: config.repeats };
            config = { ...config, repeats: 1 };
            focus.presentation = { repeats: 1 };
            const result = finish(cell, route, config, schedule(focus, contrast, seed), `7 single-pass section loops (changes ${first + 1}–${end}); 3 full progressions with original repeats · ${config.runMode}, ${config.targetPattern} · ${e.record.analytics?.troubleSteps?.length ? "self-reported section" : "diagnostic section"}`, {
                kind: "section",
                indices: focus.focus.sourceIndices,
                runMode: config.runMode,
            }, [
                "Shortened single-pass section in seven questions; original run mode, tempo and pattern retained; contrasts retain original repeats",
            ]);
            return result;
        }
        if (e.mode === "m6") {
            const stage = cell.focus?.stage ?? config.phraseFocus ?? "sing";
            config = { ...config, phraseFocus: stage };
            const focus = structuredClone(saved);
            focus.focus = { kind: "phrase-stage", stage };
            focus.presentation = { phraseFocus: stage };
            const contrast = generate({
                ...config,
                variation: config.variation === "rhythm" ? "original" : "rhythm",
            }, 0, e.session.customSnapshot ?? [], seededRandom(seed, 0));
            contrast.focus = { kind: "phrase-stage", stage };
            contrast.presentation = {
                phraseFocus: stage,
                variation: config.variation === "rhythm" ? "original" : "rhythm",
            };
            return finish(cell, route, config, schedule(focus, contrast, seed), `Listen → ${stage}: 7 saved phrase / 3 rhythm contrasts · ${config.phraseId}, transpose ${config.transpose}`, { kind: "phrase-stage", stage, phraseId: config.phraseId }, [
                "Stage focus with required listening; three rhythm-variation contrasts",
            ]);
        }
        if (e.mode === "m7" && cell.focus?.position) {
            const position = cell.focus.position;
            if (!bassPositions(saved.targets[0].midi, config.fretLow, config.fretHigh).some((p) => p.string === position.string &&
                p.fret === position.fret &&
                p.midi === position.midi))
                throw new Error("This position is not valid for the saved MIDI.");
            const target = saved.targets[0];
            config = {
                ...config,
                root: target.chord.root,
                roots: target.chord.root,
                rootOrder: "fixed",
                quality: target.chord.quality,
                qualityPool: [target.chord.quality],
                degree: target.degree,
                degreePool: [target.degree],
                bassString: position.string,
                fretLow: position.fret,
                fretHigh: position.fret,
                fretNames: false,
            };
            const focus = structuredClone(saved);
            focus.focus = { kind: "bass-position", position };
            delete focus.presentation;
            return finish(cell, route, config, Array.from({ length: 10 }, () => structuredClone(focus)), `10 mapping trials: ${position.string} string, fret ${position.fret} · MIDI ${position.midi} · note names hidden`, { kind: "bass-position", ...position }, ["Single valid position; note names hidden"]);
        }
        throw new Error("This focus has no compatible saved target.");
    }
    catch (error) {
        return { supported: false, unsupportedReason: String(error) };
    }
}
export function diagnosticSequences(base, route) {
    try {
        const config = { ...base, count: 10 }, seed = hash(["sequence-diagnostic", config]);
        const candidates = base.mode === "m6"
            ? phrases.flatMap((phrase) => ["original", "rhythm", "approach", "enclosure"].map((variation) => ({
                ...config,
                phraseId: phrase.id,
                variation: variation,
            })))
            : progressionBank.map((p) => ({
                ...config,
                progression: p.id,
                progressionPool: undefined,
            }));
        const valid = candidates
            .flatMap((settings) => {
            try {
                const q = generate(validateConfig(settings, []), 0, [], seededRandom(seed, 0));
                validateScheduled(q, settings);
                q.presentation = settings;
                return [q];
            }
            catch {
                return [];
            }
        })
            .slice(0, 5);
        if (!valid.length)
            return null;
        const questions = Array.from({ length: 10 }, (_, i) => structuredClone(valid[Math.floor(i / 2) % valid.length]));
        const preview = [
            ...new Set(questions.map((q) => q.phrase
                ? `${q.phrase.id}/${q.phrase.notes.length} notes`
                : q.targets.map((t) => t.chord.symbol).join(" → "))),
        ];
        return {
            id: "diagnostic-" + seed,
            version: 1,
            reason: `Balanced ${base.mode.toUpperCase()} diagnostic: ${valid.length} saved contexts, paired presentations`,
            sourceCohortKey: "diagnostic",
            evidenceAsOf: new Date().toISOString(),
            evidenceAssessmentIds: [],
            config,
            customSnapshots: [],
            questions,
            selectionPolicy: "diagnostic",
            questionCount: 10,
            compatibleGeneratorVersion: "insights-focus-2",
            originRoute: route,
            baseline: base,
            changedDifficulty: ["Balanced diagnostic context sampling"],
            targetPredicate: { kind: "diagnostic", cells: preview },
        };
    }
    catch {
        return null;
    }
}
