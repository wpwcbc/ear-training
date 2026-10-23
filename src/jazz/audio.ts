import { chordNotes } from "./theory.js";
import type { Config, Target } from "./model.js";
import { type Phrase } from "./phrases.js";
import { parseChord, degreeForPc, spellTarget } from "./theory.js";

export interface PlaybackOptions {
  countIn?: number;
  repeats?: number;
  gapBeats?: number;
  seed?: boolean;
  cueAtEnd?: boolean;
  rootAnchor?: boolean;
}
export interface PlaybackEvent {
  index: number;
  start: number;
  duration: number;
}
export function playbackPlan(
  targets: Target[],
  config: Config,
  options: PlaybackOptions = {},
): {
  events: PlaybackEvent[];
  duration: number;
  countIn: number;
  seedStart: number;
} {
  const beat = 60 / config.bpm,
    countIn = (options.countIn ?? 0) * beat;
  let cursor = countIn + (options.seed || options.rootAnchor ? beat : 0);
  const events: PlaybackEvent[] = [];
  for (let repeat = 0; repeat < (options.repeats ?? 1); repeat++)
    targets.forEach((target, index) => {
      if (index > 0 || repeat > 0) cursor += (options.gapBeats ?? 0) * beat;
      const duration = (target.beats ?? config.beats) * beat;
      events.push({ index, start: cursor, duration });
      cursor += duration;
    });
  return { events, duration: cursor + 0.04, countIn, seedStart: countIn };
}

// Every voice belongs to this engine, including voices scheduled in the future.
export class AudioEngine {
  private context: AudioContext | null = null;
  private voices = new Set<AudioScheduledSourceNode>();
  private playbackStart = 0;
  plan: ReturnType<typeof playbackPlan> = {
    events: [],
    duration: 0,
    countIn: 0,
    seedStart: 0,
  };
  get position(): number {
    return this.context ? this.context.currentTime - this.playbackStart : 0;
  }
  async ready(): Promise<void> {
    this.context ??= new AudioContext();
    await this.context.resume();
    if (this.context.state !== "running")
      throw new Error("Audio is suspended. Press Start or Replay to retry.");
  }
  async pause(): Promise<void> {
    if (this.context?.state === "running") await this.context.suspend();
  }
  playSingle(
    chord: ReturnType<typeof parseChord>,
    midi: number | null,
    volume: number,
    context: boolean,
  ): { readyMs: number; durationMs: number } {
    if (!this.context || this.context.state !== "running")
      throw new Error("Audio unavailable. Press Retry audio.");
    this.stop();
    const start = this.context.currentTime + 0.04;
    if (context)
      chordNotes(chord).forEach((note) =>
        this.tone(note, start, 0.8, volume * 0.09, false),
      );
    if (midi !== null)
      this.tone(midi, start + 0.08, 0.75, volume * 0.24, false);
    return {
      readyMs: midi === null ? (context ? 900 : 0) : 120,
      durationMs: 900,
    };
  }
  stop(): void {
    for (const voice of this.voices) {
      try {
        voice.stop();
      } catch {}
    }
    this.voices.clear();
  }
  private tone(
    midi: number,
    start: number,
    duration: number,
    volume: number,
    pad: boolean,
  ): void {
    const ctx = this.context!;
    const oscillator = ctx.createOscillator(),
      gain = ctx.createGain();
    oscillator.type = pad ? "sine" : "triangle";
    oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + (pad ? 0.12 : 0.015));
    gain.gain.exponentialRampToValueAtTime(
      Math.max(volume * 0.35, 0.0001),
      start + duration * 0.8,
    );
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
  private click(start: number, volume: number): void {
    const ctx = this.context!;
    const source = ctx.createBufferSource(),
      gain = ctx.createGain();
    const buffer = ctx.createBuffer(
      1,
      Math.ceil(ctx.sampleRate * 0.035),
      ctx.sampleRate,
    );
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
  play(
    targets: Target[],
    config: Config,
    melody: boolean,
    melodyOnly = false,
    options: PlaybackOptions = {},
  ): number {
    if (!this.context || this.context.state !== "running")
      throw new Error("Press Start to enable audio.");
    this.stop();
    const now = this.context.currentTime + 0.04;
    this.playbackStart = now;
    this.plan = playbackPlan(targets, config, options);
    for (let i = 0; i < (options.countIn ?? 0); i++)
      this.click(
        now + (i * 60) / config.bpm,
        config.volume * (i === 0 ? 0.22 : 0.14),
      );
    if (config.metronome) {
      const beat = 60 / config.bpm;
      for (
        let start = this.plan.countIn;
        start < this.plan.duration - 0.04;
        start += beat
      )
        this.click(now + start, config.volume * 0.1);
    }
    if (options.seed && targets.length)
      this.tone(
        targets[0].midi,
        now + this.plan.seedStart,
        (60 / config.bpm) * 0.85,
        config.volume * 0.24,
        false,
      );
    if (options.rootAnchor && targets.length)
      this.tone(
        chordNotes(targets[0].chord)[0],
        now + this.plan.seedStart,
        (60 / config.bpm) * 0.85,
        config.volume * 0.24,
        false,
      );
    if (options.cueAtEnd)
      this.click(now + this.plan.duration - 0.04, config.volume * 0.2);
    this.plan.events.forEach((event) => {
      const target = targets[event.index];
      const start = now + event.start,
        duration = event.duration;
      if (!melodyOnly) {
        let notes = chordNotes(target.chord, config.inversion);
        if (config.context === "root") notes = [chordNotes(target.chord)[0]];
        if (config.context === "shell") {
          const shell = notes.filter((n) => n % 12 !== target.midi % 12);
          // Keep quality-defining tones unless the chord symbol provides that context.
          if (config.showChords) notes = shell;
        }
        notes.forEach((n) =>
          this.tone(
            n,
            start,
            duration * 0.92,
            config.volume * 0.09,
            config.timbre === "pad",
          ),
        );
      }
      if (melody) {
        const split = target.secondMidi !== undefined ? 2 : 1;
        this.tone(
          target.midi,
          start + (split === 2 ? 0.01 : 0.08),
          (duration / split) * 0.85,
          config.volume * 0.24,
          false,
        );
        if (target.secondMidi !== undefined)
          this.tone(
            target.secondMidi,
            start + duration / 2,
            duration * 0.42,
            config.volume * 0.24,
            false,
          );
      }
    });
    return this.plan.duration;
  }
  playPhrase(phrase: Phrase, config: Config, firstChordOnly = false): number {
    const chordSymbols = firstChordOnly
      ? phrase.chords.slice(0, 1)
      : phrase.chords;
    const targets = chordSymbols.map((symbol, index) => {
      const chord = parseChord(symbol),
        notes = phrase.notes.filter((n) => n.chord === index),
        degree = degreeForPc(chord, notes[0].midi % 12);
      return {
        chord,
        degree,
        name: spellTarget(chord, degree),
        midi: notes[0].midi,
        beats: notes.reduce((sum, n) => sum + n.beats, 0),
      };
    });
    const duration = this.play(
      targets,
      { ...config, context: "full" },
      false,
      false,
      { countIn: config.countIn },
    );
    let cursor = (config.countIn * 60) / config.bpm;
    phrase.notes
      .filter((n) => !firstChordOnly || n.chord === 0)
      .forEach((note) => {
        const length = (note.beats * 60) / config.bpm;
        this.tone(
          note.midi,
          this.playbackStart + cursor,
          length * 0.88,
          config.volume * 0.24,
          false,
        );
        cursor += length;
      });
    return duration;
  }
}
