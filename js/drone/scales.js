import { SCALE_OPTIONS } from "../core/scales.js";
import * as theory from "../core/theory.js";
const resolvedScaleOptions = SCALE_OPTIONS.map((option) => ({
    ...option,
    tokens: theory.parseDegreeList(option.degrees),
}));
export const scaleById = resolvedScaleOptions.reduce((acc, option) => {
    acc[option.id] = option;
    return acc;
}, {});
const SCALE_ID_ALIASES = {
    "phygian dominant": "phrygian dominant",
};
const normalizeScaleKey = (value) => value
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
const normalizedScaleIdMap = resolvedScaleOptions.reduce((acc, option) => {
    acc[normalizeScaleKey(option.id)] = option.id;
    acc[normalizeScaleKey(option.label)] = option.id;
    return acc;
}, {});
export const resolveScaleId = (value) => {
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }
    if (scaleById[trimmed]) {
        return trimmed;
    }
    const normalized = normalizeScaleKey(trimmed);
    const alias = SCALE_ID_ALIASES[normalized];
    if (alias && scaleById[alias]) {
        return alias;
    }
    return normalizedScaleIdMap[normalized] ?? null;
};
export const isScaleId = (value) => Boolean(scaleById[value]);
