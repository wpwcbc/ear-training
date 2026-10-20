import test from "node:test";
import assert from "node:assert/strict";
import { AudioEngine } from "../js/jazz/audio.js";
import {
  parseChord,
  targetPc,
  spellTarget,
  inRange,
  nearestGuide,
  qualities,
  degrees,
  pitchClass,
} from "../js/jazz/theory.js";
import {
  defaults,
  generate,
  loadSessions,
  saveSession,
  recommendation,
} from "../js/jazz/model.js";

test("all supported roots, qualities and degrees resolve to the spelled pitch class", () => {
  for (const root of [
    "C",
    "C#",
    "D",
    "Eb",
    "E",
    "F",
    "F#",
    "G",
    "Ab",
    "A",
    "Bb",
    "B",
    "Cb",
  ])
    for (const quality of qualities)
      for (const degree of degrees) {
        const chord = parseChord(root + quality);
        assert.equal(
          pitchClass(spellTarget(chord, degree)),
          targetPc(chord, degree),
        );
      }
  assert.equal(spellTarget(parseChord("Dm7"), "9"), "E");
  assert.equal(spellTarget(parseChord("G7"), "b7"), "F");
  assert.equal(spellTarget(parseChord("F#maj7"), "maj7"), "E#");
  assert.equal(spellTarget(parseChord("Eb7"), "#9"), "F#");
  assert.throws(() => parseChord("invalid"));
});
test("register keeps pitch class and rejects impossible ranges", () => {
  for (let pc = 0; pc < 12; pc++)
    for (const [low, high] of [
      [28, 52],
      [48, 72],
      [60, 84],
    ]) {
      const midi = inRange(pc, low, high);
      assert.equal(midi % 12, pc);
      assert.ok(midi >= low && midi <= high);
    }
  assert.throws(() => inRange(1, 60, 60));
});
test("common tone remains the same MIDI pitch across independent chord roots", () => {
  const functional = generate({ ...defaults, mode: "m3" }, 0).targets;
  assert.deepEqual(
    functional.map((t) => t.degree),
    ["b3", "b7", "11"],
  );
  assert.equal(new Set(functional.map((t) => t.midi)).size, 1);
  const nonfunctional = generate(
    { ...defaults, mode: "m3", progression: "mediants" },
    0,
  ).targets;
  assert.deepEqual(
    nonfunctional.map((t) => t.degree),
    ["5", "3", "maj7"],
  );
  assert.equal(new Set(nonfunctional.map((t) => t.midi)).size, 1);
});
test("guide-tone paths preserve common tones and semitone motion", () => {
  assert.deepEqual(
    generate({ ...defaults, mode: "m4" }, 0).targets.map((t) => t.name),
    ["F", "F", "E"],
  );
  assert.deepEqual(
    generate(
      { ...defaults, mode: "m4", progression: "major-c" },
      0,
    ).targets.map((t) => t.name),
    ["C", "B", "C"],
  );
  assert.equal(nearestGuide(parseChord("G7"), 65, 48, 72).midi, 65);
  assert.equal(nearestGuide(parseChord("G7"), 60, 48, 72).midi, 59);
});
test("jazz storage is versioned and never writes old progress", () => {
  const entries = new Map([["eartrain:questionHistory", "original"]]);
  const storage = {
    getItem: (key) => entries.get(key) || null,
    setItem: (key, value) => entries.set(key, value),
  };
  const session = { id: "s", records: [], mode: "m1" };
  saveSession(storage, session);
  saveSession(storage, session);
  assert.equal(loadSessions(storage).length, 1);
  assert.equal(entries.get("eartrain:questionHistory"), "original");
  assert.equal(recommendation([]).mode, "m1");
  entries.set("jazzEarLab:v1:sessions", "bad JSON");
  assert.deepEqual(loadSessions(storage), []);
});
test("audio owns future voices, stops them on replay, and root anchor ignores inversion", async () => {
  const voices = [];
  globalThis.AudioContext = class {
    currentTime = 0;
    state = "running";
    destination = {};
    async resume() {}
    createOscillator() {
      const oscillator = {
        frequency: { value: 0 },
        connect() {},
        disconnect() {},
        start(at) {
          this.at = at;
        },
        stop(at) {
          if (at === undefined) this.cancelled = true;
        },
      };
      voices.push(oscillator);
      return oscillator;
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
  const audio = new AudioEngine();
  await audio.ready();
  const challenge = generate({ ...defaults, mode: "m3" }, 0);
  audio.play(challenge.targets, defaults, true);
  const scheduled = [...voices];
  assert.ok(scheduled.some((v) => v.at > 1));
  audio.stop();
  assert.ok(scheduled.every((v) => v.cancelled));
  audio.play(
    [challenge.targets[0]],
    { ...defaults, context: "root", inversion: 2 },
    false,
  );
  const frequency = voices.at(-1).frequency.value;
  assert.ok(Math.abs(frequency - 440 * 2 ** ((50 - 69) / 12)) < 0.001);
  audio.play([challenge.targets[0]], defaults, false);
  assert.ok(voices.at(-5).cancelled);
  audio.stop();
  delete globalThis.AudioContext;
});
