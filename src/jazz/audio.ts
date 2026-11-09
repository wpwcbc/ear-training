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
export type SinglePlaybackEnd = "completed" | "cancelled" | "faded" | "interrupted";
export interface SinglePlaybackOptions {
  excludeTarget?: number;
  fullReference?: boolean;
  voiceLevels?: number[];
}
export interface SinglePlayback {
  readonly readyMs: number;
  readonly durationMs: number;
  readonly activeVoices: number;
  readonly ready: Promise<boolean>;
  readonly completed: Promise<SinglePlaybackEnd>;
  cancel(): void;
  fadeOut(durationMs?: number): Promise<SinglePlaybackEnd>;
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
  private single: SinglePlayback | null = null;
  private layerTarget:
    ((midi: number, volume: number) => SinglePlayback | null) | null = null;
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
    if (!this.context || this.context.state === "closed")
      this.context = new AudioContext();
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
    options: SinglePlaybackOptions = {},
  ): SinglePlayback {
    if (!this.context || this.context.state !== "running")
      throw new Error("Audio unavailable. Press Retry audio.");
    if (options.voiceLevels !== undefined && (!Array.isArray(options.voiceLevels) ||
        options.voiceLevels.length !== 5 || options.voiceLevels.some(level => !Number.isFinite(level) || level < 0 || level > 2)))
      throw new Error("Voice levels must contain five values from 0% to 200%.");
    this.stop();
    const notes = chordNotes(chord).map((note, index) => ({note, level: options.voiceLevels?.[index] ?? 1}));
    // Reserve the independent target's nominal peak even before M1 Done, so
    // continuing references never need to reattack or rebalance a live chord.
    const nominalPeak = (context ? notes.reduce((sum, voice) => sum + voice.level * 0.09, 0) : 0) + 0.24;
    const headroom = 1 / Math.max(1, nominalPeak / 0.95);
    const ctx = this.context,
      dispatch = ctx.currentTime,
      start = dispatch + 0.04,
      readyMs =
        midi === null
          ? context
            ? options.excludeTarget !== undefined
              ? 40
              : 900
            : 0
          : options.fullReference
            ? 40
            : 120;
    const pending = new Set<ReturnType<AudioEngine["tone"]>>();
    let endTime = dispatch,
      settled = false,
      fading = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let referenceTimer: ReturnType<typeof setTimeout> | undefined;
    let signalReferenceReady: ((ready: boolean) => void) | undefined;
    let signalReady!: (ready: boolean) => void;
    let signalEnd!: (end: SinglePlaybackEnd) => void;
    const ready = new Promise<boolean>((resolve) => {
      signalReady = resolve;
    });
    const completed = new Promise<SinglePlaybackEnd>((resolve) => {
      signalEnd = resolve;
    });
    const settle = (end: SinglePlaybackEnd) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(referenceTimer);
      ctx.removeEventListener("statechange", onStateChange);
      signalReferenceReady?.(false);
      signalReady(false);
      signalEnd(end);
    };
    const stop = (end: SinglePlaybackEnd) => {
      if (settled) return;
      for (const voice of pending) {
        voice.gain.gain.cancelScheduledValues(ctx.currentTime);
        voice.gain.gain.setValueAtTime(0, ctx.currentTime);
        voice.source.stop();
        this.voices.delete(voice.source);
      }
      pending.clear();
      endTime = ctx.currentTime;
      settle(end);
    };
    const onStateChange = () => {
      if (ctx.state !== "running") stop("interrupted");
    };
    const playback: SinglePlayback = {
      readyMs,
      get durationMs() {
        return (endTime - dispatch) * 1000;
      },
      get activeVoices() {
        return pending.size;
      },
      ready,
      completed,
      cancel: () => stop("cancelled"),
      fadeOut: (durationMs = 80) => {
        if (settled || fading) return completed;
        if (!Number.isFinite(durationMs) || durationMs < 0)
          throw new RangeError("Fade duration must be a nonnegative number.");
        fading = true;
        clearTimeout(timer);
        signalReady(false);
        const now = ctx.currentTime,
          fadeEnd = now + durationMs / 1000;
        endTime = now;
        for (const voice of pending) {
          const end =
            voice.startTime > now ? now : Math.min(voice.endTime, fadeEnd);
          if (voice.startTime > now) {
            voice.gain.gain.cancelScheduledValues(now);
            voice.gain.gain.setValueAtTime(0, now);
          } else {
            voice.gain.gain.cancelAndHoldAtTime(now);
            voice.gain.gain.linearRampToValueAtTime(0, end);
          }
          voice.source.stop(end);
          endTime = Math.max(endTime, end);
        }
        return completed;
      },
    };
    ctx.addEventListener("statechange", onStateChange);
    this.single = playback;
    const schedule = (note: number, at: number, level: number) => {
      const voice = this.tone(note, at, 2.5, level, false, true, () => {
        pending.delete(voice);
        if (!pending.size) settle(fading ? "faded" : "completed");
      });
      pending.add(voice);
      endTime = Math.max(endTime, voice.endTime);
    };
    this.layerTarget = (target, level) => {
      // onended may be queued after the audio clock has passed the chord tail.
      if (
        settled ||
        fading ||
        options.excludeTarget === undefined ||
        ![...pending].some(
          (voice) =>
            voice.startTime <= ctx.currentTime &&
            voice.endTime > ctx.currentTime,
        )
      )
        return null;
      const onset = ctx.currentTime + 0.04;
      const referenceReady = new Promise<boolean>((resolve) => {
        signalReferenceReady = resolve;
      });
      schedule(target, onset, level * 0.24 * headroom);
      const checkReferenceReady = () => {
        if (settled || fading) {
          signalReferenceReady?.(false);
          return;
        }
        const remaining = onset - ctx.currentTime;
        if (ctx.state === "running" && remaining <= 0.000001)
          signalReferenceReady?.(true);
        else
          referenceTimer = setTimeout(
            checkReferenceReady,
            Math.max(10, Math.ceil(remaining * 1000)),
          );
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
        notes
          .filter(({note, level}) => {
            const excluded = options.fullReference
              ? midi
              : options.excludeTarget;
            return (
              excluded === undefined ||
              excluded === null ||
              note % 12 !== excluded % 12
            ) && level > 0;
          })
          .forEach(({note, level}) => schedule(note, start, volume * 0.09 * level * headroom));
      if (midi !== null)
        schedule(
          midi,
          start + (options.fullReference ? 0 : 0.08),
          volume * 0.24 * headroom,
        );
    } catch (e) {
      this.stop();
      throw e;
    }
    // Check the audio clock so a suspended context cannot become answer-ready
    // merely because wall-clock time elapsed.
    const checkReady = () => {
      if (settled) return;
      const remaining = dispatch + readyMs / 1000 - ctx.currentTime;
      if (ctx.state === "running" && remaining <= 0.000001) signalReady(true);
      else
        timer = setTimeout(
          checkReady,
          Math.max(10, Math.ceil(remaining * 1000)),
        );
    };
    checkReady();
    if (!pending.size) settle("completed");
    return playback;
  }
  playReference(
    chord: ReturnType<typeof parseChord>,
    midi: number,
    volume: number,
    continuing?: SinglePlayback | null,
    voiceLevels?: number[],
  ): SinglePlayback {
    if (!this.context || this.context.state !== "running")
      throw new Error("Audio unavailable. Press Retry audio.");
    if (continuing && continuing === this.single) {
      const reference = this.layerTarget?.(midi, volume);
      if (reference) return reference;
    }
    return this.playSingle(chord, midi, volume, true, { fullReference: true, voiceLevels });
  }
  playSequence(
    events: { midi: number; start: number; duration: number; level: number }[],
    countInBeat: number,
    duration: number,
  ): SinglePlayback {
    if (!this.context || this.context.state !== "running")
      throw new Error("Audio unavailable. Retry playback.");
    this.stop();
    const ctx = this.context,
      start = ctx.currentTime + 0.04;
    this.playbackStart = start;
    let resolve!: (end: SinglePlaybackEnd) => void,
      ended = false;
    const completed = new Promise<SinglePlaybackEnd>((r) => (resolve = r));
    const voices = new Set<ReturnType<AudioEngine["tone"]>>();
    const settle = (end: SinglePlaybackEnd) => {
      if (!ended) {
        ended = true;
        ctx.removeEventListener("statechange", changed);
        resolve(end);
      }
    };
    const cancel = () => {
      for (const voice of voices) {
        try {
          voice.source.stop();
        } catch {}
      }
      voices.clear();
      settle("cancelled");
    };
    const changed = () => {
      if (ctx.state !== "running") {
        settle("interrupted");
        this.stop();
      }
    };
    ctx.addEventListener("statechange", changed);
    const plan: SinglePlayback = {
      readyMs: 40,
      durationMs: duration * 1000 + 40,
      get activeVoices() {
        return voices.size;
      },
      ready: Promise.resolve(true),
      completed,
      cancel,
      fadeOut: async () => {
        cancel();
        return "cancelled";
      },
    };
    this.single = plan;
    try {
      for (let i = 0; i < 4; i++) this.click(start + i * countInBeat, 0.08);
      const sentinel = this.tone(60, start, duration, 0, false, true, () => {
        voices.delete(sentinel);
        if (!voices.size) settle("completed");
      });
      voices.add(sentinel);
      for (const event of events) {
        const voice = this.tone(
          event.midi,
          start + event.start,
          event.duration,
          event.level,
          false,
          true,
          () => {
            voices.delete(voice);
            if (!voices.size) settle("completed");
          },
        );
        voices.add(voice);
      }
    } catch (error) {
      this.stop();
      throw error;
    }
    if (!voices.size) settle("completed");
    return plan;
  }
  close(): void {
    this.stop();
    void this.context?.close();
    this.context = null;
  }
  stop(): void {
    this.single?.cancel();
    this.single = null;
    this.layerTarget = null;
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
    natural = false,
    onEnd?: () => void,
  ): {
    source: OscillatorNode;
    gain: GainNode;
    startTime: number;
    endTime: number;
  } {
    const ctx = this.context!;
    const oscillator = ctx.createOscillator(),
      gain = ctx.createGain();
    oscillator.type = pad ? "sine" : "triangle";
    oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + (pad ? 0.12 : 0.015));
    if(volume===0) gain.gain.linearRampToValueAtTime(0,start+duration*.75);
    else gain.gain.exponentialRampToValueAtTime(
      Math.max(volume * (natural ? 0.04 : 0.35), 0.0001),
      start + duration * (natural ? 0.75 : 0.8),
    );
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
