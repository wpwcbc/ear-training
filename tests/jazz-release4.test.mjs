import test from "node:test";
import assert from "node:assert/strict";
import {
  defaults,
  generate,
  validateConfig,
  loadFavorites,
  keys,
} from "../js/jazz/model.js";
import {
  qualities,
  parseChord,
  targetPc,
  recognitionDegrees,
  pitchClass,
  guides,
  chordToneDegrees,
  tensionDegrees,
} from "../js/jazz/theory.js";
import {
  phrases,
  transformPhrase,
  phraseNoteName,
} from "../js/jazz/phrases.js";
import { bassPositions, bassTarget, strings } from "../js/jazz/bass.js";
import { skillStats } from "../js/jazz/insights.js";
import { AudioEngine } from "../js/jazz/audio.js";
import { parseProgression } from "../js/jazz/progressions.js";

test("extended chord qualities have unambiguous tones and correct diminished/suspended spelling", () => {
  for (const quality of qualities) {
    const chord = parseChord("Bb" + quality);
    const labels = recognitionDegrees(chord);
    assert.equal(new Set(labels.map((d) => targetPc(chord, d))).size, 12);
    assert.ok(guides(chord).every((d) => chordToneDegrees(chord).includes(d)));
  }
  assert.equal(parseChord("C").quality, "maj");
  assert.equal(pitchClass("Bbbb"), 8);
  assert.ok(chordToneDegrees(parseChord("Bdim7")).includes("bb7"));
  assert.ok(chordToneDegrees(parseChord("G7sus4")).includes("4"));
  assert.deepEqual(tensionDegrees(parseChord("G7alt")), [
    "b9",
    "#9",
    "b5",
    "b13",
  ]);
});

test("target constraints and two-target patterns are enforced across a progression", () => {
  for (const targetLimit of ["guides", "chord", "tensions"]) {
    const config = {
      ...defaults,
      mode: "m5",
      targetLimit,
      targetPattern: "two",
      path: "nearest",
    };
    for (const target of generate(config, 0).targets) {
      const allowed =
        targetLimit === "guides"
          ? guides(target.chord)
          : targetLimit === "chord"
            ? chordToneDegrees(target.chord)
            : tensionDegrees(target.chord);
      assert.ok(allowed.includes(target.degree));
      assert.ok(allowed.includes(target.secondDegree));
      assert.notEqual(target.midi % 12, target.secondMidi % 12);
    }
  }
  assert.equal(
    validateConfig({ ...defaults, mode: "m5", targetPattern: "line" }).path,
    "nearest",
  );
});

test("custom bar positions agree with durations in 4/4", () => {
  const progression = parseProgression(
    "Dm7 2 1\nG7 2 1\nCmaj7 8 2",
    "Bars",
    "custom-bars",
  );
  assert.deepEqual(progression.bars, [1, 1, 2]);
  assert.throws(() =>
    parseProgression("Dm7 2 1\nG7 2 2", "Wrong bar", "custom-bars"),
  );
  const targets = generate(
    { ...defaults, mode: "m5", progression: progression.id },
    0,
    [progression],
  ).targets;
  assert.deepEqual(
    targets.map((t) => t.bar),
    [1, 1, 2],
  );
});

test("original phrase variants preserve target notes, duration and chord context in every transposition", () => {
  for (const phrase of phrases)
    for (const transpose of [-5, 0, 4])
      for (const variation of ["original", "rhythm", "approach", "enclosure"]) {
        const result = transformPhrase(phrase.id, transpose, variation, 36, 84);
        assert.equal(
          result.notes.reduce((s, n) => s + n.beats, 0),
          12,
        );
        assert.equal(result.notes.length, phrase.notes.length);
        result.chords.forEach((_, i) =>
          assert.equal(
            result.notes
              .filter((n) => n.chord === i)
              .reduce((s, n) => s + n.beats, 0),
            4,
          ),
        );
        result.notes.forEach((n, i) => {
          assert.equal(pitchClass(phraseNoteName(result, n)), n.midi % 12);
          if (n.target)
            assert.equal(
              n.midi % 12,
              (phrase.notes[i].midi + transpose + 120) % 12,
            );
        });
      }
  assert.throws(() => transformPhrase("missing", 0, "original", 48, 72));
  assert.throws(() => transformPhrase("landmarks", 0, "original", 60, 61));
});

test("M6 generation stores a reproducible phrase, targets and original license", () => {
  const challenge = generate(
    { ...defaults, mode: "m6", variation: "enclosure", transpose: 3 },
    0,
  );
  assert.equal(challenge.phrase.license.includes("CC0"), true);
  assert.equal(challenge.targets.length, 3);
  challenge.targets.forEach((t) =>
    assert.equal(targetPc(t.chord, t.degree), t.midi % 12),
  );
});

test("standard bass tuning and position mapping preserve pitch class and playable register", () => {
  assert.deepEqual(
    strings.map((s) => s.midi),
    [43, 38, 33, 28],
  );
  assert.ok(
    bassPositions(40, 0, 12).some((p) => p.string === "E" && p.fret === 12),
  );
  for (let pc = 0; pc < 12; pc++) {
    const midi = bassTarget(pc, 28, 60, 0, 12);
    assert.equal(midi % 12, pc);
    assert.ok(bassPositions(midi).length);
  }
  assert.throws(() => bassTarget(1, 28, 60, 0, 0));
  assert.throws(() => bassPositions(40, 12, 0));
  const target = generate({ ...defaults, mode: "m7" }, 0).targets[0];
  assert.ok(target.midi >= 28 && target.midi <= 60);
  assert.ok(bassPositions(target.midi).length);
});

test("bass mastery is not mixed with audiation mastery and hidden-quality guesses count", () => {
  const record = {
    mode: "m1",
    gradingSource: "self",
    grade: "correct",
    chords: ["G7"],
    targets: ["3"],
    responseLatency: 1,
    replayCount: 0,
  };
  const stats = skillStats(
    [{ records: [record, { ...record, mode: "m7" }] }],
    "degree",
  );
  assert.equal(stats.length, 2);
  const blind = {
    ...record,
    mode: "m2",
    gradingSource: "automatic",
    grade: "missed",
    selectedDegrees: ["3"],
    selectedQualities: ["maj7"],
  };
  assert.equal(skillStats([{ records: [blind] }], "degree")[0].missed, 1);
});

test("blind recognition samples only its chosen qualities and favorites use a separate namespace", () => {
  for (let i = 0; i < 10; i++)
    assert.equal(
      generate(
        {
          ...defaults,
          mode: "m2",
          showChords: false,
          recognitionQualities: "7alt",
        },
        i,
      ).targets[0].chord.quality,
      "7alt",
    );
  const favorite = {
    id: "review",
    timestamp: "today",
    config: defaults,
    challenge: generate(defaults, 0),
  };
  const data = new Map([
    ["eartrain:questionHistory", "old"],
    [keys.favorites, JSON.stringify([favorite])],
  ]);
  const storage = { getItem: (key) => data.get(key) || null };
  assert.equal(loadFavorites(storage).length, 1);
  assert.equal(data.get("eartrain:questionHistory"), "old");
});
test("circle-of-fifths roots cycle explicitly and unused blind pools do not block production", () => {
  const roots = Array.from(
    { length: 12 },
    (_, i) =>
      generate({ ...defaults, rootOrder: "fifths" }, i).targets[0].chord.root,
  );
  assert.deepEqual(roots, [
    "C",
    "G",
    "D",
    "A",
    "E",
    "B",
    "F#",
    "C#",
    "Ab",
    "Eb",
    "Bb",
    "F",
  ]);
  assert.doesNotThrow(() =>
    generate({ ...defaults, recognitionQualities: "invalid" }, 0),
  );
});
test("count-in, blind root anchor, two targets and next-beat cue share a cancellable audio clock", async () => {
  const sources = [];
  const source = () => {
    const voice = {
      frequency: { value: 0 },
      connect() {},
      disconnect() {},
      start(at) {
        this.startAt = at;
      },
      stop(at) {
        if (at === undefined) this.cancelled = true;
        else this.stopAt = at;
      },
    };
    sources.push(voice);
    return voice;
  };
  globalThis.AudioContext = class {
    state = "running";
    currentTime = 0;
    sampleRate = 48000;
    destination = {};
    async resume() {
      this.state = "running";
    }
    async suspend() {
      this.state = "suspended";
    }
    createOscillator() {
      return source();
    }
    createBufferSource() {
      const s = source();
      s.noise = true;
      return s;
    }
    createBuffer(channels, length) {
      return { getChannelData: () => new Float32Array(length) };
    }
    createGain() {
      return {
        gain: {
          setValueAtTime() {},
          linearRampToValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {},
        disconnect() {},
      };
    }
  };
  try {
    const engine = new AudioEngine();
    await engine.ready();
    const config = { ...defaults, bpm: 120 };
    const target = {
      ...generate(config, 0).targets[0],
      secondMidi: 60,
      secondDegree: "b7",
    };
    engine.play([target], config, true, false, {
      countIn: 4,
      rootAnchor: true,
      cueAtEnd: true,
    });
    assert.equal(engine.plan.events[0].start, 2.5);
    const cue = sources.filter((s) => s.noise).at(-1);
    assert.ok(Math.abs(cue.startAt - engine.plan.duration) < 1e-9);
    const leads = sources.filter((s) => !s.noise).slice(-2);
    assert.ok(leads[0].startAt < leads[1].startAt);
    await engine.pause();
    await engine.ready();
    engine.stop();
    assert.ok(sources.every((s) => s.cancelled));
  } finally {
    delete globalThis.AudioContext;
  }
});
