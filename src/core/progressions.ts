import type { ChordQuality } from "./constants.js";

export type ProgressionCategory = "Commons" | "Tunes" | "Customs";
export type DurationMode = "x" | "/";

export interface ProgressionChordPreset {
	chordDegree: string;
	quality: ChordQuality;
	scaleId: string;
	durationMode: DurationMode;
	durationValue: number;
}

export interface ProgressionPreset {
	id: string;
	name: string;
	category: ProgressionCategory;
	defaultKey: string;
	chords: ProgressionChordPreset[];
	description?: string;
}

export const PROGRESSION_CATEGORIES: {
	id: ProgressionCategory;
	label: string;
}[] = [
	{ id: "Commons", label: "Commons" },
	{ id: "Tunes", label: "Tunes" },
	{ id: "Customs", label: "Customs" },
];

export const PROGRESSION_PRESETS: ProgressionPreset[] = [
	{
		id: "turnaround-major",
		name: "Turnaround (I–vi–ii–V)",
		category: "Commons",
		defaultKey: "C",
		chords: [
			{
				chordDegree: "1",
				quality: "maj7",
				scaleId: "ionian",
				durationMode: "x",
				durationValue: 1,
			},
			{
				chordDegree: "6",
				quality: "m7",
				scaleId: "aeolian",
				durationMode: "x",
				durationValue: 1,
			},
			{
				chordDegree: "2",
				quality: "m7",
				scaleId: "dorian",
				durationMode: "x",
				durationValue: 1,
			},
			{
				chordDegree: "5",
				quality: "7",
				scaleId: "mixolydian",
				durationMode: "x",
				durationValue: 1,
			},
		],
	},
	{
		id: "major-251",
		name: "Major ii–V–I",
		category: "Commons",
		defaultKey: "C",
		chords: [
			{
				chordDegree: "1",
				quality: "maj7",
				scaleId: "ionian",
				durationMode: "x",
				durationValue: 1,
			},
			{
				chordDegree: "2",
				quality: "m7",
				scaleId: "dorian",
				durationMode: "x",
				durationValue: 1,
			},
			{
				chordDegree: "5",
				quality: "7",
				scaleId: "mixolydian",
				durationMode: "x",
				durationValue: 1,
			},
			{
				chordDegree: "1",
				quality: "maj7",
				scaleId: "ionian",
				durationMode: "x",
				durationValue: 1,
			},
		],
	},
	{
		id: "minor-251",
		name: "Minor iiø–V–i",
		category: "Commons",
		defaultKey: "C",
		chords: [
			{
				chordDegree: "1",
				quality: "m7",
				scaleId: "aeolian",
				durationMode: "x",
				durationValue: 1,
			},
			{
				chordDegree: "2",
				quality: "m7b5",
				scaleId: "locrian",
				durationMode: "x",
				durationValue: 1,
			},
			{
				chordDegree: "5",
				quality: "7",
				scaleId: "mixolydian",
				durationMode: "x",
				durationValue: 1,
			},
			{
				chordDegree: "1",
				quality: "m7",
				scaleId: "aeolian",
				durationMode: "x",
				durationValue: 1,
			},
		],
	},
	{
		id: "backdoor-cadence",
		name: "Backdoor cadence (IV–bVII–I)",
		category: "Commons",
		defaultKey: "C",
		chords: [
			{
				chordDegree: "1",
				quality: "maj7",
				scaleId: "ionian",
				durationMode: "x",
				durationValue: 1,
			},
			{
				chordDegree: "4",
				quality: "m7",
				scaleId: "dorian",
				durationMode: "x",
				durationValue: 1,
			},
			{
				chordDegree: "b7",
				quality: "7",
				scaleId: "lydian dominant",
				durationMode: "x",
				durationValue: 1,
			},
			{
				chordDegree: "1",
				quality: "maj7",
				scaleId: "ionian",
				durationMode: "x",
				durationValue: 1,
			},
		],
	},
	{
		id: "screendoor-cadence",
		name: "Screendoor cadence (#ivø-VII-I)",
		category: "Commons",
		defaultKey: "C",
		chords: [
			{
				chordDegree: "1",
				quality: "maj7",
				scaleId: "ionian",
				durationMode: "x",
				durationValue: 1,
			},
			{
				chordDegree: "#4",
				quality: "m7b5",
				scaleId: "locrian #2",
				durationMode: "x",
				durationValue: 1,
			},
			{
				chordDegree: "7",
				quality: "7",
				scaleId: "phrygian dominant",
				durationMode: "x",
				durationValue: 1,
			},
			{
				chordDegree: "1",
				quality: "maj7",
				scaleId: "ionian",
				durationMode: "x",
				durationValue: 1,
			},
		],
	},
];
