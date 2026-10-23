import test from "node:test";
import assert from "node:assert/strict";
import { AudioEngine } from "../js/jazz/audio.js";
import { parseChord } from "../js/jazz/theory.js";

// Fake only the Web Audio/clock boundary; exercise the real scheduling API.
async function audioClock(t) {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const sources = [],
    gains = [];
  const context = {
    currentTime: 0,
    state: "running",
    destination: {},
    async resume() {},
    createOscillator() {
      const source = {
        frequency: { value: 0 },
        connect() {},
        disconnect() {
          this.disconnected = true;
        },
        start(at) {
          this.startTime = at;
        },
        stop(at = context.currentTime) {
          this.stopTime = at;
        },
      };
      sources.push(source);
      return source;
    },
    createGain() {
      const events = [];
      const gain = {
        events,
        gain: {
          setValueAtTime(value, at) {
            events.push({ kind: "set", value, at });
          },
          linearRampToValueAtTime(value, at) {
            events.push({ kind: "linear", value, at });
          },
          exponentialRampToValueAtTime(value, at) {
            events.push({ kind: "exponential", value, at });
          },
          cancelAndHoldAtTime(at) {
            events.push({ kind: "hold", at });
          },
          cancelScheduledValues(at) {
            events.push({ kind: "cancel", at });
          },
        },
        connect() {},
        disconnect() {
          this.disconnected = true;
        },
      };
      gains.push(gain);
      return gain;
    },
  };
  t.mock.method(globalThis, "AudioContext", function () {
    return context;
  });
  const audio = new AudioEngine();
  await audio.ready();
  t.after(() => audio.stop());
  function advance(seconds) {
    const delta = Math.round((seconds - context.currentTime) * 1000);
    context.currentTime = seconds;
    for (const source of sources) {
      if (!source.ended && source.stopTime <= seconds) {
        source.ended = true;
        source.onended?.();
      }
    }
    t.mock.timers.tick(delta);
  }
  return { audio, context, sources, gains, advance };
}

// Node has no AudioContext; the stub is replaced/restored by each test.
globalThis.AudioContext = function () {};

test("M1 question withholds the target pitch class and is ready at chord onset", async (t) => {
  const { audio, sources, advance } = await audioClock(t);
  const question = audio.playSingle(parseChord("G7"), null, 0.5, true, {
    excludeTarget: 83,
  });
  const midiNotes = sources.map((s) =>
    Math.round(69 + 12 * Math.log2(s.frequency.value / 440)),
  );
  assert.deepEqual(
    midiNotes,
    [55, 62, 65],
    "B is withheld even when target is in another octave",
  );
  assert.equal(question.readyMs, 40);
  advance(0.04);
  assert.equal(await question.ready, true);
  assert.equal(
    question.activeVoices,
    3,
    "Done readiness does not wait for the chord tail",
  );
  const root = audio.playSingle(parseChord("G7"), null, 0.5, true, {
    excludeTarget: 79,
  });
  assert.equal(root.activeVoices, 3);
  assert.ok(
    sources
      .slice(-3)
      .every(
        (s) =>
          Math.round(69 + 12 * Math.log2(s.frequency.value / 440)) % 12 !== 7,
      ),
  );
  const tension = audio.playSingle(parseChord("G7"), null, 0.5, true, {
    excludeTarget: 68,
  });
  assert.equal(
    tension.activeVoices,
    4,
    "b9 does not remove unrelated chord tones",
  );
});

test("M1 live reference adds only the target and completes after its natural tail", async (t) => {
  const { audio, sources, gains, advance } = await audioClock(t);
  const chord = parseChord("G7");
  const question = audio.playSingle(chord, null, 0.5, true, {
    excludeTarget: 71,
  });
  advance(0.3);
  const originalSources = sources.slice();
  const originalStops = originalSources.map((s) => s.stopTime);
  const originalEnvelopes = gains.map((g) => g.events.slice());
  const reference = audio.playReference(chord, 71, 0.5, question);
  assert.equal(sources.length, 4, "no duplicate chord voices");
  assert.deepEqual(
    originalSources.map((s) => s.stopTime),
    originalStops,
    "chord is not stopped or reattacked",
  );
  assert.deepEqual(
    gains.slice(0, 3).map((g) => g.events),
    originalEnvelopes,
  );
  let completed = false;
  reference.completed.then(() => {
    completed = true;
  });
  advance(0.34);
  assert.equal(
    await reference.ready,
    true,
    "rating is available at reference onset",
  );
  advance(2.6);
  await Promise.resolve();
  assert.equal(
    completed,
    false,
    "old chord completion cannot finish the layered reference",
  );
  assert.equal(reference.activeVoices, 1);
  advance(2.87);
  assert.equal(await reference.completed, "completed");
  assert.equal(reference.activeVoices, 0);
});

test("M1 expired chord (even with queued end events) and context-off use a fresh full reference", async (t) => {
  const { audio, context, sources, advance } = await audioClock(t);
  const chord = parseChord("G7");
  const question = audio.playSingle(chord, null, 0.5, true, {
    excludeTarget: 71,
  });
  context.currentTime = 3; // Audio has ended, but the browser has not delivered onended yet.
  assert.equal(question.activeVoices, 3);
  const reference = audio.playReference(chord, 71, 0.5, question);
  const fresh = sources.slice(3);
  assert.equal(fresh.length, 4, "G D F plus target B, without doubled B");
  assert.ok(
    fresh.every((s) => s.startTime === 3.04),
    "chord and target start together",
  );
  assert.equal(reference.readyMs, 40);
  advance(3.05);
  assert.equal(await reference.ready, true);
  advance(5.57);
  assert.equal(await reference.completed, "completed");
  const silent = audio.playSingle(chord, null, 0.5, false, {
    excludeTarget: 71,
  });
  assert.equal(await silent.ready, true);
  const before = sources.length;
  const contextOff = audio.playReference(chord, 68, 0.5, silent);
  assert.equal(
    sources.length - before,
    5,
    "context-off reference restores the full G7 plus b9",
  );
  assert.equal(contextOff.activeVoices, 5);
});

test("V2 readiness keeps M2 onset; completion waits for every natural voice release", async (t) => {
  const { audio, sources, advance } = await audioClock(t);
  const playback = audio.playSingle(parseChord("G7"), 71, 0.5, true);
  assert.ok(
    playback.ready instanceof Promise,
    "playback exposes explicit readiness",
  );
  let ready = false,
    completed = false;
  playback.ready.then((value) => {
    ready = value;
  });
  playback.completed.then(() => {
    completed = true;
  });
  assert.equal(playback.activeVoices, 5);
  assert.equal(playback.readyMs, 120);
  assert.ok(playback.durationMs >= 2000 && playback.durationMs <= 3000);
  assert.equal(sources.at(-1).startTime, 0.12);
  assert.ok(sources.every((s) => s.type === "triangle"));
  advance(0.119);
  await Promise.resolve();
  assert.equal(ready, false);
  advance(0.12);
  assert.equal(await playback.ready, true);
  advance(2.57);
  await Promise.resolve();
  assert.equal(completed, false, "target is still releasing after chord ends");
  assert.equal(playback.activeVoices, 1);
  advance(2.65);
  assert.equal(await playback.completed, "completed");
  assert.equal(playback.activeVoices, 0);
  assert.ok(sources.every((s) => s.disconnected));
});

test("V2 fade holds sounding voices, ends them together, and waits for their end events", async (t) => {
  const { audio, sources, gains, advance } = await audioClock(t);
  const playback = audio.playSingle(parseChord("G7"), 71, 0.5, true);
  advance(0.2);
  assert.equal(await playback.ready, true);
  const ending = playback.fadeOut(80);
  let ended = false;
  ending.then(() => {
    ended = true;
  });
  assert.equal(playback.fadeOut(80), ending, "repeated fades are idempotent");
  for (const gain of gains) {
    assert.ok(gain.events.some((e) => e.kind === "hold" && e.at === 0.2));
    assert.ok(
      gain.events.some(
        (e) => e.kind === "linear" && e.value === 0 && e.at === 0.28,
      ),
    );
  }
  assert.ok(sources.every((s) => s.stopTime === 0.28));
  advance(0.27);
  await Promise.resolve();
  assert.equal(ended, false);
  advance(0.28);
  assert.equal(await ending, "faded");
  assert.equal(await playback.completed, "faded");
  assert.equal(playback.activeVoices, 0);
});

test("Replay replaces V2 voices; Stop cancels future onset and stale readiness/completion", async (t) => {
  const { audio, context, sources, advance } = await audioClock(t);
  const first = audio.playSingle(parseChord("G7"), 71, 0.5, true);
  const oldSources = [...sources];
  const replay = audio.playSingle(parseChord("G7"), 71, 0.5, false);
  assert.equal(await first.ready, false);
  assert.equal(await first.completed, "cancelled");
  assert.equal(first.activeVoices, 0);
  assert.ok(oldSources.every((s) => s.stopTime < s.startTime));
  assert.equal(replay.activeVoices, 1, "context-off retains only the target");
  assert.ok(
    Math.abs(sources.at(-1).frequency.value - 493.8833012561241) < 0.001,
  );
  audio.stop();
  audio.stop();
  assert.equal(await replay.ready, false);
  assert.equal(await replay.completed, "cancelled");
  assert.ok(sources.every((s) => s.stopTime === context.currentTime));
  advance(4);
  assert.equal(replay.activeVoices, 0);
  assert.equal(
    await replay.completed,
    "cancelled",
    "ended events cannot revive old playback",
  );
});

test("Fading before M2 target onset silences future target instead of starting it", async (t) => {
  const { audio, sources, advance } = await audioClock(t);
  const playback = audio.playSingle(parseChord("G7"), 71, 0.5, true);
  advance(0.08);
  const ending = playback.fadeOut();
  assert.ok(sources.at(-1).stopTime < sources.at(-1).startTime);
  assert.equal(await playback.ready, false);
  advance(0.17);
  assert.equal(await ending, "faded");
  assert.equal(playback.activeVoices, 0);
});
