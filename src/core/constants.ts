export type ChordQuality =
	| "maj7"
	| "m7"
	| "7"
	| "m7b5"
	| "dim7"
	| "mmaj7"
	| "+";

export interface ChordConfig {
	chordDegree: string;
	quality: ChordQuality;
	allowedUpperDegrees: string[];
	questions: number;
}

export interface Mode1Defaults {
	keyCenter: string;
	progression: ChordConfig[];
}

export const CHORD_QUALITIES: ChordQuality[] = [
	"maj7",
	"m7",
	"7",
	"m7b5",
	"dim7",
	"mmaj7",
	"+",
];

export const NOTE_NAMES_SHARP: string[] = [
	"C",
	"C#",
	"D",
	"D#",
	"E",
	"F",
	"F#",
	"G",
	"G#",
	"A",
	"A#",
	"B",
];

export const RANDOM_ROOTS: string[] = [
	"C",
	"C#",
	"D",
	"Eb",
	"E",
	"F",
	"F#",
	"G",
	"Ab",
	"A",
	"Bb",
	"B",
];

export const MIN_CHORD_ROOT_MIDI: number = 43;

export const CHORD_VOICE_VELOCITIES: {
	root: number;
	fifth: number;
	seventh: number;
	third: number;
} = {
	root: 0.9,
	fifth: 0.65,
	seventh: 0.6,
	third: 0.55,
};

export const LEAD_VELOCITY_DEFAULT: number = 1;

export const DEFAULT_MODE1: Mode1Defaults = {
	keyCenter: "C",
	progression: [
		{
			chordDegree: "2",
			quality: "m7",
			allowedUpperDegrees: ["1", "2", "b3", "4", "5", "6", "b7"],
			questions: 1,
		},
		{
			chordDegree: "5",
			quality: "7",
			allowedUpperDegrees: ["1", "2", "3", "4", "5", "6", "b7"],
			questions: 1,
		},
		{
			chordDegree: "1",
			quality: "maj7",
			allowedUpperDegrees: ["1", "2", "3", "#4", "5", "6", "7"],
			questions: 1,
		},
	],
};
