import { SCALE_OPTIONS } from "../core/scales.js";
import * as theory from "../core/theory.js";
import type { ChordQuality } from "../core/constants.js";
import type { ResolvedScaleOption } from "./types.js";

const resolvedScaleOptions: ResolvedScaleOption[] = SCALE_OPTIONS.map((option) => ({
	...option,
	tokens: theory.parseDegreeList(option.degrees),
}));

export const scaleById: Record<string, ResolvedScaleOption> =
	resolvedScaleOptions.reduce((acc, option) => {
		acc[option.id] = option;
		return acc;
	}, {} as Record<string, ResolvedScaleOption>);

const SCALE_ID_ALIASES: Record<string, string> = {
	"phygian dominant": "phrygian dominant",
};

const normalizeScaleKey = (value: string): string =>
	value
		.toLowerCase()
		.trim()
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ");

const normalizedScaleIdMap: Record<string, string> = resolvedScaleOptions.reduce(
	(acc, option) => {
		acc[normalizeScaleKey(option.id)] = option.id;
		acc[normalizeScaleKey(option.label)] = option.id;
		return acc;
	},
	{} as Record<string, string>,
);

const MODE2_DEFAULT_DEGREES: Partial<Record<ChordQuality, string>> = {
	maj7: "1 2 3 #4 5 6 7",
	m7: "1 2 b3 4 5 6 b7",
	"7": "1 2 3 4 5 6 b7",
	m7b5: "1 b2 b3 4 b5 b6 b7",
	dim7: "1 b2 b3 4 b5 b6 bb7",
	mmaj7: "1 2 b3 4 5 6 7",
	"+": "1 2 3 #4 #5 6 7",
};

const DEFAULT_DEGREE_TEXT = "1 2 3 4 5 6 7";

const tokensMatch = (a: string[], b: string[]): boolean => {
	if (a.length !== b.length) {
		return false;
	}
	return a.every((token, index) => token === b[index]);
};

export const detectScaleId = (degreesText: string): string => {
	try {
		const tokens = theory.parseDegreeList(degreesText);
		const match = resolvedScaleOptions.find((option) =>
			tokensMatch(tokens, option.tokens),
		);
		return match ? match.id : "custom";
	} catch {
		return "custom";
	}
};

export const getMode2DefaultDegrees = (quality: ChordQuality): string =>
	MODE2_DEFAULT_DEGREES[quality] ?? DEFAULT_DEGREE_TEXT;

export const resolveScaleId = (value: string): string | null => {
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

export const isScaleId = (value: string): boolean => Boolean(scaleById[value]);
