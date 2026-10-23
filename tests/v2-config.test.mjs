import assert from "node:assert/strict";
import test from "node:test";
import { builtins, validate } from "../js/v2/model.js";

test("Auto Advance accepts old presets without mutating them and validates explicit overrides", () => {
  const old = structuredClone(builtins[0].config);
  delete old.autoAdvance;
  const saved = JSON.stringify(old);
  assert.equal(validate(old).autoAdvance, true);
  assert.equal(JSON.stringify(old), saved);
  assert.equal(validate({ ...old, autoAdvance: false }).autoAdvance, false);
  assert.equal(validate({ ...old, autoAdvance: true }).autoAdvance, true);
  for (const autoAdvance of [null, "false", 0, 1])
    assert.throws(() => validate({ ...old, autoAdvance }), /Unsupported exercise settings/);
});
