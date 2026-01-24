import type { ChordQuality } from "./dt-constants.js";

export type ProgressionCategory = "Commons" | "Tunes" | "Customs";

export interface ProgressionChordPreset {
	chordDegree: string;
	quality: ChordQuality;
	scaleId: string;
	questions?: number;
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
			{ chordDegree: "1", quality: "maj7", scaleId: "ionian" },
			{ chordDegree: "6", quality: "m7", scaleId: "aeolian" },
			{ chordDegree: "2", quality: "m7", scaleId: "dorian" },
			{ chordDegree: "5", quality: "7", scaleId: "mixolydian" },
		],
	},
	{
		id: "major-251",
		name: "Major ii–V–I",
		category: "Commons",
		defaultKey: "C",
		chords: [
			{ chordDegree: "1", quality: "maj7", scaleId: "ionian" },
			{ chordDegree: "2", quality: "m7", scaleId: "dorian" },
			{ chordDegree: "5", quality: "7", scaleId: "mixolydian" },
			{ chordDegree: "1", quality: "maj7", scaleId: "ionian" },
		],
	},
	{
		id: "minor-251",
		name: "Minor iiø–V–i",
		category: "Commons",
		defaultKey: "C",
		chords: [
			{ chordDegree: "1", quality: "m7", scaleId: "aeolian" },
			{ chordDegree: "2", quality: "m7b5", scaleId: "locrian" },
			{ chordDegree: "5", quality: "7", scaleId: "mixolydian" },
			{ chordDegree: "1", quality: "m7", scaleId: "aeolian" },
		],
	},
	{
		id: "backdoor-cadence",
		name: "Backdoor cadence (IV–bVII–I)",
		category: "Commons",
		defaultKey: "C",
		chords: [
			{ chordDegree: "1", quality: "maj7", scaleId: "ionian" },
			{ chordDegree: "4", quality: "m7", scaleId: "dorian" },
			{ chordDegree: "b7", quality: "7", scaleId: "lydian dominant" },
			{ chordDegree: "1", quality: "maj7", scaleId: "ionian" },
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
				questions: 1,
			},
			{
				chordDegree: "#4",
				quality: "m7b5",
				scaleId: "locrian #2",
				questions: 1,
			},
			{
				chordDegree: "7",
				quality: "7",
				scaleId: "phrygian dominant",
				questions: 1,
			},
			{
				chordDegree: "1",
				quality: "maj7",
				scaleId: "ionian",
				questions: 1,
			},
		],
	},
];
