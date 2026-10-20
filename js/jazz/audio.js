import { chordNotes } from "./theory.js";
export function playbackPlan(targets, config, options = {}) {
    const beat = 60 / config.bpm, countIn = (options.countIn ?? 0) * beat;
    let cursor = countIn + (options.seed ? beat : 0);
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
    stop() {
        for (const voice of this.voices) {
            try {
                voice.stop();
            }
            catch { }
        }
        this.voices.clear();
    }
    tone(midi, start, duration, volume, pad) {
        const ctx = this.context;
        const oscillator = ctx.createOscillator(), gain = ctx.createGain();
        oscillator.type = pad ? "sine" : "triangle";
        oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(volume, start + (pad ? 0.12 : 0.015));
        gain.gain.exponentialRampToValueAtTime(Math.max(volume * 0.35, 0.0001), start + duration * 0.8);
        gain.gain.linearRampToValueAtTime(0, start + duration);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        this.voices.add(oscillator);
        oscillator.onended = () => {
            this.voices.delete(oscillator);
            oscillator.disconnect();
            gain.disconnect();
        };
        oscillator.start(start);
        oscillator.stop(start + duration + 0.02);
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
        if (options.seed && targets.length)
            this.tone(targets[0].midi, now + this.plan.seedStart, (60 / config.bpm) * 0.85, config.volume * 0.24, false);
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
            if (melody)
                this.tone(target.midi, start + 0.08, duration * 0.85, config.volume * 0.24, false);
        });
        return this.plan.duration;
    }
}
