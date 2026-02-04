export type QualityId =
	| "maj7"
	| "m7"
	| "7"
	| "m6m7b5"
	| "dim7"
	| "sus4"
	| "7b9"
	| "7#9"
	| "7alt";

export type VoicingId = "closed" | "open-1573" | "open-1537";

export type StatsGrouping = "voicing" | "inversion";
export type StatsOrder = "name" | "time-asc" | "time-desc";

export interface QualityOption {
	id: QualityId;
	label: string;
	intervalSets: number[][];
}

export interface VoicingOption {
	id: VoicingId;
	label: string;
	order: number[];
	octaves: number[];
}

export interface Config {
	totalQuestions: number;
	minRootNote: string;
	minRootMidi: number;
	enabledQualities: QualityId[];
	enabledVoicings: VoicingId[];
	enabledInversions: number[];
	playbackMode: "stacked" | "arpeggiated";
}

export interface Question {
	index: number;
	total: number;
	quality: QualityId;
	voicing: VoicingId;
	inversion: number;
	chordRootMidi: number;
	chordTonicName: string;
	chordNotes: string[];
	chordVelocities: number[];
	playbackMode: "stacked" | "arpeggiated";
}

export interface QuestionRecord {
	chordQuality: QualityId;
	chordVoicing: VoicingId;
	chordInversion: number;
	timeSeconds: number;
	attempts: number;
	playbackMode: "stacked" | "arpeggiated";
}

export interface TestRecord {
	progressionName: string;
	avgTimeSeconds: number;
	avgAttempts: number;
	datetime: string;
}

export interface ChordToneVelocity {
	root: number;
	third: number;
	fifth: number;
	seventh: number;
	tension: number;
}
