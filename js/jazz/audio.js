import { chordNotes } from "./theory.js";
import { parseChord, degreeForPc, spellTarget } from "./theory.js";
export function playbackPlan(targets, config, options = {}) {
    const beat = 60 / config.bpm, countIn = (options.countIn ?? 0) * beat;
    let cursor = countIn + (options.seed || options.rootAnchor ? beat : 0);
    const events = [];
    for (let repeat = 0; repeat < (options.repeats ?? 1); repeat++)
        targets.forEach((target, index) => {
            if (index > 0 || repeat > 0)
                cursor += (options.gapBeats ?? 0) * beat;
            const duration = (target.beats ?? config.beats) * beat;
            events.push({ index, start: cursor, duration });
            cursor += duration;
        });
    return { events, duration: cursor + 0.04, countIn, seedStart: countIn };
}
// Every voice belongs to this engine, including voices scheduled in the future.
export class AudioEngine {
    constructor() {
        this.context = null;
        this.voices = new Set();
        this.single = null;
        this.layerTarget = null;
        this.playbackStart = 0;
        this.plan = {
            events: [],
            duration: 0,
            countIn: 0,
            seedStart: 0,
        };
    }
    get position() {
        return this.context ? this.context.currentTime - this.playbackStart : 0;
    }
    async ready() {
        this.context ?? (this.context = new AudioContext());
        await this.context.resume();
        if (this.context.state !== "running")
            throw new Error("Audio is suspended. Press Start or Replay to retry.");
    }
    async pause() {
        if (this.context?.state === "running")
            await this.context.suspend();
    }
    playSingle(chord, midi, volume, context, options = {}) {
        if (!this.context || this.context.state !== "running")
            throw new Error("Audio unavailable. Press Retry audio.");
        this.stop();
        const ctx = this.context, dispatch = ctx.currentTime, start = dispatch + 0.04, readyMs = midi === null
            ? context
                ? options.excludeTarget !== undefined
                    ? 40
                    : 900
                : 0
            : options.fullReference
                ? 40
                : 120;
        const pending = new Set();
        let endTime = dispatch, settled = false, fading = false;
        let timer;
        let referenceTimer;
        let signalReferenceReady;
        let signalReady;
        let signalEnd;
        const ready = new Promise((resolve) => {
            signalReady = resolve;
        });
        const completed = new Promise((resolve) => {
            signalEnd = resolve;
        });
        const settle = (end) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            clearTimeout(referenceTimer);
            signalReferenceReady?.(false);
            signalReady(false);
            signalEnd(end);
        };
        const playback = {
            readyMs,
            get durationMs() {
                return (endTime - dispatch) * 1000;
            },
            get activeVoices() {
                return pending.size;
            },
            ready,
            completed,
            cancel: () => {
                if (settled)
                    return;
                for (const voice of pending) {
                    voice.gain.gain.cancelScheduledValues(ctx.currentTime);
                    voice.gain.gain.setValueAtTime(0, ctx.currentTime);
                    voice.source.stop();
                    this.voices.delete(voice.source);
                }
                pending.clear();
                endTime = ctx.currentTime;
                settle("cancelled");
            },
            fadeOut: (durationMs = 80) => {
                if (settled || fading)
                    return completed;
                if (!Number.isFinite(durationMs) || durationMs < 0)
                    throw new RangeError("Fade duration must be a nonnegative number.");
                fading = true;
                clearTimeout(timer);
                signalReady(false);
                const now = ctx.currentTime, fadeEnd = now + durationMs / 1000;
                endTime = now;
                for (const voice of pending) {
                    const end = voice.startTime > now ? now : Math.min(voice.endTime, fadeEnd);
                    if (voice.startTime > now) {
                        voice.gain.gain.cancelScheduledValues(now);
                        voice.gain.gain.setValueAtTime(0, now);
                    }
                    else {
                        voice.gain.gain.cancelAndHoldAtTime(now);
                        voice.gain.gain.linearRampToValueAtTime(0, end);
                    }
                    voice.source.stop(end);
                    endTime = Math.max(endTime, end);
                }
                return completed;
            },
        };
        this.single = playback;
        const schedule = (note, at, level) => {
            const voice = this.tone(note, at, 2.5, level, false, true, () => {
                pending.delete(voice);
                if (!pending.size)
                    settle(fading ? "faded" : "completed");
            });
            pending.add(voice);
            endTime = Math.max(endTime, voice.endTime);
        };
        this.layerTarget = (target, level) => {
            // onended may be queued after the audio clock has passed the chord tail.
            if (settled ||
                fading ||
                options.excludeTarget === undefined ||
                ![...pending].some((voice) => voice.startTime <= ctx.currentTime &&
                    voice.endTime > ctx.currentTime))
                return null;
            const onset = ctx.currentTime + 0.04;
            const referenceReady = new Promise((resolve) => {
                signalReferenceReady = resolve;
            });
            schedule(target, onset, level * 0.24);
            const checkReferenceReady = () => {
                if (settled || fading) {
                    signalReferenceReady?.(false);
                    return;
                }
                const remaining = onset - ctx.currentTime;
                if (ctx.state === "running" && remaining <= 0.000001)
                    signalReferenceReady?.(true);
                else
                    referenceTimer = setTimeout(checkReferenceReady, Math.max(10, Math.ceil(remaining * 1000)));
            };
            checkReferenceReady();
            return {
                readyMs: 40,
                get durationMs() {
                    return (endTime - onset + 0.04) * 1000;
                },
                get activeVoices() {
                    return playback.activeVoices;
                },
                ready: referenceReady,
                completed,
                cancel: playback.cancel,
                fadeOut: playback.fadeOut,
            };
        };
        try {
            if (context)
                chordNotes(chord)
                    .filter((note) => {
                    const excluded = options.fullReference
                        ? midi
                        : options.excludeTarget;
                    return (excluded === undefined ||
                        excluded === null ||
                        note % 12 !== excluded % 12);
                })
                    .forEach((note) => schedule(note, start, volume * 0.09));
            if (midi !== null)
                schedule(midi, start + (options.fullReference ? 0 : 0.08), volume * 0.24);
        }
        catch (e) {
            this.stop();
            throw e;
        }
        // Check the audio clock so a suspended context cannot become answer-ready
        // merely because wall-clock time elapsed.
        const checkReady = () => {
            if (settled)
                return;
            const remaining = dispatch + readyMs / 1000 - ctx.currentTime;
            if (ctx.state === "running" && remaining <= 0.000001)
                signalReady(true);
            else
                timer = setTimeout(checkReady, Math.max(10, Math.ceil(remaining * 1000)));
        };
        checkReady();
        if (!pending.size)
            settle("completed");
        return playback;
    }
    playReference(chord, midi, volume, continuing) {
        if (!this.context || this.context.state !== "running")
            throw new Error("Audio unavailable. Press Retry audio.");
        if (continuing && continuing === this.single) {
            const reference = this.layerTarget?.(midi, volume);
            if (reference)
                return reference;
        }
        return this.playSingle(chord, midi, volume, true, { fullReference: true });
    }
    stop() {
        this.single?.cancel();
        this.single = null;
        this.layerTarget = null;
        for (const voice of this.voices) {
            try {
                voice.stop();
            }
            catch { }
        }
        this.voices.clear();
    }
    tone(midi, start, duration, volume, pad, natural = false, onEnd) {
        const ctx = this.context;
        const oscillator = ctx.createOscillator(), gain = ctx.createGain();
        oscillator.type = pad ? "sine" : "triangle";
        oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(volume, start + (pad ? 0.12 : 0.015));
        gain.gain.exponentialRampToValueAtTime(Math.max(volume * (natural ? 0.04 : 0.35), 0.0001), start + duration * (natural ? 0.75 : 0.8));
        gain.gain.linearRampToValueAtTime(0, start + duration);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        this.voices.add(oscillator);
        oscillator.onended = () => {
            this.voices.delete(oscillator);
            oscillator.disconnect();
            gain.disconnect();
            onEnd?.();
        };
        oscillator.start(start);
        oscillator.stop(start + duration + 0.02);
        return {
            source: oscillator,
            gain,
            startTime: start,
            endTime: start + duration + 0.02,
        };
    }
    click(start, volume) {
        const ctx = this.context;
        const source = ctx.createBufferSource(), gain = ctx.createGain();
        const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.035), ctx.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++)
            samples[i] = (Math.random() * 2 - 1) * (1 - i / samples.length);
        source.buffer = buffer;
        gain.gain.setValueAtTime(volume, start);
        source.connect(gain);
        gain.connect(ctx.destination);
        this.voices.add(source);
        source.onended = () => {
            this.voices.delete(source);
            source.disconnect();
            gain.disconnect();
        };
        source.start(start);
        source.stop(start + 0.04);
    }
    play(targets, config, melody, melodyOnly = false, options = {}) {
        if (!this.context || this.context.state !== "running")
            throw new Error("Press Start to enable audio.");
        this.stop();
        const now = this.context.currentTime + 0.04;
        this.playbackStart = now;
        this.plan = playbackPlan(targets, config, options);
        for (let i = 0; i < (options.countIn ?? 0); i++)
            this.click(now + (i * 60) / config.bpm, config.volume * (i === 0 ? 0.22 : 0.14));
        if (config.metronome) {
            const beat = 60 / config.bpm;
            for (let start = this.plan.countIn; start < this.plan.duration - 0.04; start += beat)
                this.click(now + start, config.volume * 0.1);
        }
        if (options.seed && targets.length)
            this.tone(targets[0].midi, now + this.plan.seedStart, (60 / config.bpm) * 0.85, config.volume * 0.24, false);
        if (options.rootAnchor && targets.length)
            this.tone(chordNotes(targets[0].chord)[0], now + this.plan.seedStart, (60 / config.bpm) * 0.85, config.volume * 0.24, false);
        if (options.cueAtEnd)
            this.click(now + this.plan.duration - 0.04, config.volume * 0.2);
        this.plan.events.forEach((event) => {
            const target = targets[event.index];
            const start = now + event.start, duration = event.duration;
            if (!melodyOnly) {
                let notes = chordNotes(target.chord, config.inversion);
                if (config.context === "root")
                    notes = [chordNotes(target.chord)[0]];
                if (config.context === "shell") {
                    const shell = notes.filter((n) => n % 12 !== target.midi % 12);
                    // Keep quality-defining tones unless the chord symbol provides that context.
                    if (config.showChords)
                        notes = shell;
                }
                notes.forEach((n) => this.tone(n, start, duration * 0.92, config.volume * 0.09, config.timbre === "pad"));
            }
            if (melody) {
                const split = target.secondMidi !== undefined ? 2 : 1;
                this.tone(target.midi, start + (split === 2 ? 0.01 : 0.08), (duration / split) * 0.85, config.volume * 0.24, false);
                if (target.secondMidi !== undefined)
                    this.tone(target.secondMidi, start + duration / 2, duration * 0.42, config.volume * 0.24, false);
            }
        });
        return this.plan.duration;
    }
    playPhrase(phrase, config, firstChordOnly = false) {
        const chordSymbols = firstChordOnly
            ? phrase.chords.slice(0, 1)
            : phrase.chords;
        const targets = chordSymbols.map((symbol, index) => {
            const chord = parseChord(symbol), notes = phrase.notes.filter((n) => n.chord === index), degree = degreeForPc(chord, notes[0].midi % 12);
            return {
                chord,
                degree,
                name: spellTarget(chord, degree),
                midi: notes[0].midi,
                beats: notes.reduce((sum, n) => sum + n.beats, 0),
            };
        });
        const duration = this.play(targets, { ...config, context: "full" }, false, false, { countIn: config.countIn });
        let cursor = (config.countIn * 60) / config.bpm;
        phrase.notes
            .filter((n) => !firstChordOnly || n.chord === 0)
            .forEach((note) => {
            const length = (note.beats * 60) / config.bpm;
            this.tone(note.midi, this.playbackStart + cursor, length * 0.88, config.volume * 0.24, false);
            cursor += length;
        });
        return duration;
    }
}
