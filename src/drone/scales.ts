import { SCALE_OPTIONS } from "../core/scales.js";
import * as theory from "../core/theory.js";

interface ResolvedScaleOption {
	id: string;
	label: string;
	degrees: string;
	tokens: string[];
}

const resolvedScaleOptions: ResolvedScaleOption[] = SCALE_OPTIONS.map(
	(option) => ({
		...option,
		tokens: theory.parseDegreeList(option.degrees),
	}),
);

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
