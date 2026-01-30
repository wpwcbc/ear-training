import type { ChordQuality } from "../core/constants.js";

export type ProgressionMode = "major" | "minor";
export type StatsGrouping = "quality" | "degree";
export type StatsOrder = "name" | "time-asc" | "time-desc";

export interface SubstitutionSettings {
	secondaryDominants: boolean;
	tritoneSubs: boolean;
	backdoor: boolean;
	borrowed: boolean;
}

export interface Config {
	keyCenter: string;
	mode: ProgressionMode;
	minRootNote: string;
	minRootMidi: number;
	substitutions: SubstitutionSettings;
}

export interface ChordSpec {
	degree: string;
	quality: ChordQuality;
}

export interface Question {
	index: number;
	total: number;
	keyCenter: string;
	mode: ProgressionMode;
	chord: ChordSpec;
	chordRootMidi: number;
	chordTonicName: string;
	chordNotes: string[];
	chordVelocities: number[];
}

export interface QuestionRecord {
	keyCenter: string;
	chordDegree: string;
	chordQuality: ChordQuality;
	timeSeconds: number;
	attempts: number;
}

export interface TestRecord {
	progressionName: string;
	avgTimeSeconds: number;
	avgAttempts: number;
	datetime: string;
}
