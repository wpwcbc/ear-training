import { recognitionDegrees } from "./theory.js";
export function responseOptions(chord, degree, config) {
    const all = recognitionDegrees(chord), fixed = config.mode === "m2"
        ? (config.responseDistractors ?? "").trim().split(/\s+/).filter(Boolean)
        : [];
    return fixed.length
        ? [...new Set([...fixed.filter((d) => all.includes(d)), degree])].sort((a, b) => all.indexOf(a) - all.indexOf(b))
        : all;
}
export function captureChoicePolicy(config, options) {
    const distractors = [
        ...new Set((config.responseDistractors ?? "").trim().split(/\s+/).filter(Boolean)),
    ].sort();
    return {
        version: "recognition-choice-family-1",
        kind: config.mode === "m2" && distractors.length
            ? "tested-label-substitution"
            : "all-roles",
        distractors,
        counts: options.map((o) => o.length),
    };
}
