import type { Config } from "./model.js";
import { recognitionDegrees, type Chord } from "./theory.js";
export interface ChoicePolicy {
  version: "recognition-choice-family-1";
  kind: "all-roles" | "tested-label-substitution";
  distractors: string[];
  counts: number[];
}
export function responseOptions(
  chord: Chord,
  degree: string,
  config: Config,
): string[] {
  const all = recognitionDegrees(chord),
    fixed =
      config.mode === "m2"
        ? (config.responseDistractors ?? "").trim().split(/\s+/).filter(Boolean)
        : [];
  return fixed.length
    ? [...new Set([...fixed.filter((d) => all.includes(d)), degree])].sort(
        (a, b) => all.indexOf(a) - all.indexOf(b),
      )
    : all;
}
export function captureChoicePolicy(
  config: Config,
  options: string[][],
): ChoicePolicy {
  const distractors = [
    ...new Set(
      (config.responseDistractors ?? "").trim().split(/\s+/).filter(Boolean),
    ),
  ].sort();
  return {
    version: "recognition-choice-family-1",
    kind:
      config.mode === "m2" && distractors.length
        ? "tested-label-substitution"
        : "all-roles",
    distractors,
    counts: options.map((o) => o.length),
  };
}
