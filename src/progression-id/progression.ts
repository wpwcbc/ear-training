import type { ChordSpec, Config, ProgressionMode } from "./types.js";
import type { ChordQuality } from "../core/constants.js";

const MAJOR_POOL: ChordSpec[] = [
	{ degree: "1", quality: "maj7" },
	{ degree: "2", quality: "m7" },
	{ degree: "3", quality: "m7" },
	{ degree: "4", quality: "maj7" },
	{ degree: "5", quality: "7" },
	{ degree: "6", quality: "m7" },
	{ degree: "7", quality: "m7b5" },
];

const MINOR_POOL: ChordSpec[] = [
	{ degree: "6", quality: "m7" },
	{ degree: "2", quality: "m7b5" },
	{ degree: "b3", quality: "maj7" },
	{ degree: "4", quality: "m7" },
	{ degree: "5", quality: "7" },
	{ degree: "b6", quality: "maj7" },
	{ degree: "b7", quality: "7" },
];

const SECONDARY_DOMS: ChordSpec[] = [
	{ degree: "2", quality: "7" },
	{ degree: "3", quality: "7" },
	{ degree: "4", quality: "7" },
	{ degree: "5", quality: "7" },
	{ degree: "6", quality: "7" },
];

const TRITONE_SUBS: ChordSpec[] = [{ degree: "b2", quality: "7" }];
const BACKDOOR: ChordSpec[] = [
	{ degree: "4", quality: "m7" },
	{ degree: "b7", quality: "7" },
];
const BORROWED: ChordSpec[] = [
	{ degree: "b7", quality: "7" },
	{ degree: "b6", quality: "maj7" },
];

const pickRandom = <T>(list: T[]): T =>
	list[Math.floor(Math.random() * list.length)];

const buildPool = (mode: ProgressionMode, config: Config): ChordSpec[] => {
	const base = mode === "major" ? [...MAJOR_POOL] : [...MINOR_POOL];
	if (config.substitutions.secondaryDominants) {
		base.push(...SECONDARY_DOMS);
	}
	if (config.substitutions.tritoneSubs) {
		base.push(...TRITONE_SUBS);
	}
	if (config.substitutions.backdoor) {
		base.push(...BACKDOOR);
	}
	if (config.substitutions.borrowed) {
		base.push(...BORROWED);
	}
	return base;
};

const getTonic = (mode: ProgressionMode): ChordSpec =>
	mode === "major"
		? { degree: "1", quality: "maj7" }
		: { degree: "6", quality: "m7" };

const dedupeRepeat = (pool: ChordSpec[], last: ChordSpec): ChordSpec => {
	if (pool.length < 2) {
		return pickRandom(pool);
	}
	let candidate = pickRandom(pool);
	let guard = 0;
	while (
		guard < 8 &&
		candidate.degree === last.degree &&
		candidate.quality === last.quality
	) {
		candidate = pickRandom(pool);
		guard += 1;
	}
	return candidate;
};

export const buildProgression = (config: Config): ChordSpec[] => {
	const pool = buildPool(config.mode, config);
	const tonic = getTonic(config.mode);
	const chords: ChordSpec[] = [tonic];
	for (let i = 0; i < 6; i += 1) {
		const next = dedupeRepeat(pool, chords[chords.length - 1]);
		chords.push(next);
	}
	chords.push(tonic);
	return chords;
};

export const qualityLabel = (quality: ChordQuality): string => quality;
