import { test } from "node:test";
import assert from "node:assert/strict";
import {
  builtins,
  primaryPresets,
  validate,
  stream,
  optionsFor,
  resolve,
  attempt,
  answer,
  rate,
  metrics,
  cohort,
  keys,
} from "../js/v2/model.js";
import { parseChord, targetPc, qualities, degrees } from "../js/jazz/theory.js";
const config = structuredClone(builtins[0].config);
test("V2 primary exercises support general degrees and independent altered/exact pools", () => {
  assert.deepEqual(
    primaryPresets.map((p) => p.name),
    ["M1 Audiation", "M2 Recognition"],
  );
  for (const p of primaryPresets) {
    const c = validate(p.config);
    assert.equal(c.roots.length, 12);
    assert.deepEqual(c.targets, ["Root", "Third", "Fifth", "Seventh"]);
    assert.deepEqual(c.qualities, ["maj7", "m7", "7"]);
    const root = validate({ ...c, roots: ["F#", "Bb"] });
    assert.deepEqual(root.qualities, c.qualities);
    assert.deepEqual(root.targets, c.targets);
    const quality = validate({ ...root, qualities: ["7alt", "m7b5"] });
    assert.deepEqual(quality.roots, root.roots);
    assert.deepEqual(quality.targets, c.targets);
    const exact = validate({
      ...quality,
      targetMode: "exact",
      targets: ["b9", "#9", "#11", "b13", "#5", "bb7"],
    });
    assert.deepEqual(exact.roots, root.roots);
    assert.deepEqual(exact.qualities, quality.qualities);
    const next = stream(exact, p.id);
    const offsets = { b9: 1, "#9": 3, "#11": 6, b13: 8, "#5": 8, bb7: 9 };
    const rootPcs = { "F#": 6, Bb: 10 };
    for (let i = 0; i < 24; i++) {
      const q = next();
      assert.equal(
        q.midi % 12,
        (rootPcs[q.chord.root] + offsets[q.degree]) % 12,
      );
      assert.equal(q.options.filter((d) => d === q.degree).length, 1);
      assert.equal(
        new Set(q.options.map((d) => targetPc(q.chord, d))).size,
        12,
      );
    }
  }
  assert.equal(resolve(parseChord("Bdim7"), "Fifth", "functional"), "b5");
  assert.equal(resolve(parseChord("Bdim7"), "Seventh", "functional"), "bb7");
});
test("V2 functional and exact targets agree with sound; all answer policies cover 12 unique pitches", () => {
  for (const [q, third, seventh] of [
    ["maj7", "3", "maj7"],
    ["m7", "b3", "b7"],
    ["7", "3", "b7"],
  ]) {
    const chord = parseChord("G" + q);
    assert.equal(resolve(chord, "Third", "functional"), third);
    assert.equal(resolve(chord, "Seventh", "functional"), seventh);
  }
  for (const q of qualities)
    for (const d of degrees) {
      const chord = parseChord("C" + q),
        opts = optionsFor(chord, d);
      assert.equal(resolve(chord, d, "exact"), d);
      assert.equal(opts.length, 12);
      assert.equal(new Set(opts.map((d) => targetPc(chord, d))).size, 12);
      assert.equal(opts.filter((v) => v === d).length, 1);
    }
  assert.throws(() => validate({ ...config, qualities: ["sus4"] }));
  const all = stream(
    {
      ...config,
      qualities: [...qualities],
      targetMode: "exact",
      targets: [...degrees],
    },
    "all-exact",
  );
  for (let i = 0; i < qualities.length * degrees.length; i++) {
    const q = all();
    assert.equal(q.midi % 12, targetPc(q.chord, q.degree));
    assert.ok(q.midi >= 60 && q.midi <= 83);
    assert.equal(q.options.filter((d) => d === q.degree).length, 1);
  }
  for (const change of [
    { roots: [] },
    { targets: [] },
    { qualities: [] },
    { count: -1 },
    { volume: NaN },
    { roots: ["H"] },
  ])
    assert.throws(() => validate({ ...config, ...change }));
});
test("V2 finite and rolling sampling balance resolved pairs and roots reproducibly", () => {
  const c = { ...config, qualities: ["maj7", "m7", "7"] },
    a = stream(c, "seed"),
    b = stream(c, "seed"),
    pairs = new Map(),
    roots = new Map();
  for (let i = 0; i < 120; i++) {
    const q = a();
    assert.deepEqual(q, b());
    const key = q.chord.quality + q.degree;
    pairs.set(key, (pairs.get(key) || 0) + 1);
    roots.set(q.chord.root, (roots.get(q.chord.root) || 0) + 1);
    assert.equal(q.midi % 12, targetPc(q.chord, q.degree));
  }
  assert.equal(new Set(pairs.values()).size, 1);
  assert.equal(pairs.size, 6);
  assert.equal(new Set(roots.values()).size, 1);
  const ten = stream({ ...c, count: 10 }, "short");
  assert.equal(
    new Set(
      Array.from({ length: 6 }, ten).map((q) => q.chord.quality + q.degree),
    ).size,
    6,
  );
});
test("V2 first answer is locked, retries separate, wrong speed earns no credit", () => {
  const q = stream(config, "lock")(),
    a = attempt(config, q, "s", "fresh"),
    wrong = q.options.find((d) => d !== q.degree);
  a.timingValidity = "valid";
  a.replaysBeforeFirst = 2;
  assert.equal(answer(a, wrong, 100), false);
  const first = [
    a.firstAnswer,
    a.firstCorrect,
    a.firstResponseMs,
    a.replaysBeforeFirst,
  ];
  assert.equal(answer(a, q.degree, 400), true);
  assert.deepEqual(
    [a.firstAnswer, a.firstCorrect, a.firstResponseMs, a.replaysBeforeFirst],
    first,
  );
  assert.equal(a.retryCount, 1);
  assert.equal(metrics([a]).timed, 0);
  const good = attempt(config, q, "s", "fresh");
  good.timingValidity = "valid";
  answer(good, q.degree, 1000);
  assert.deepEqual(
    [
      metrics([a, good]).correct,
      metrics([a, good]).median,
      metrics([a, good]).replayed,
    ],
    [1, 1000, 1],
  );
});
test("V2 self grading requires a truthful wrong degree/Unknown and never implies objective pitch", () => {
  const c = { ...config, exercise: "m1" },
    q = stream(c, "self")(),
    a = attempt(c, q, "s", "fresh");
  assert.throws(() => rate(a, false));
  assert.throws(() => rate(a, false, q.degree));
  rate(a, false, "unknown");
  rate(a, true);
  assert.equal(a.firstCorrect, false);
  assert.equal(a.imaginedWrongDegree, "unknown");
  assert.equal(a.gradingSource, "self");
  const variants = [
    c,
    { ...c, method: "sung" },
    { ...c, method: "played" },
    { ...c, context: false },
    { ...c, exercise: "m2" },
  ].map((c) => cohort(attempt(c, q, "s", "fresh")));
  assert.equal(new Set(variants).size, 5);
  assert.notEqual(cohort(a), cohort({ ...a, timingVersion: "future" }));
  assert.notEqual(cohort(a), cohort({ ...a, exposure: "previously-seen" }));
  assert.notEqual(
    cohort(a),
    cohort({ ...a, target: { ...a.target, generatorVersion: "future" } }),
  );
  assert.throws(() => rate(attempt(config, q, "s", "fresh"), true));
  assert.ok(
    Object.values(keys).every((key) => key.startsWith("jazzEarLab:v2:")),
  );
});
