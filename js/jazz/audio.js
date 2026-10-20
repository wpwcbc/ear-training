import { chordNotes } from "./theory.js";
// Every voice belongs to this engine, including voices scheduled in the future.
export class AudioEngine {
    constructor() {
        this.context = null;
        this.voices = new Set();
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
    play(targets, config, melody, melodyOnly = false) {
        if (!this.context || this.context.state !== "running")
            throw new Error("Press Start to enable audio.");
        this.stop();
        const duration = (60 / config.bpm) * config.beats;
        const now = this.context.currentTime + 0.04;
        targets.forEach((target, index) => {
            const start = now + index * duration;
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
        return duration * targets.length;
    }
}
