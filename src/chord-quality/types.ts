export type QualityId =
	| "maj7"
	| "m7"
	| "7"
	| "m7b5"
	| "dim7"
	| "maj6"
	| "m6"
	| "sus2"
	| "sus4"
	| "7b9"
	| "7#9"
	| "7alt";

export type VoicingId = "closed" | "open-1573" | "open-1537";

export type StatsGrouping = "quality" | "voicing";
export type StatsOrder = "name" | "time-asc" | "time-desc";

export interface QualityOption {
	id: QualityId;
	label: string;
	intervals: number[];
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
	playbackMode: "stacked" | "arpeggiated";
}

export interface Question {
	index: number;
	total: number;
	quality: QualityId;
	voicing: VoicingId;
	chordRootMidi: number;
	chordTonicName: string;
	chordNotes: string[];
	chordVelocities: number[];
	playbackMode: "stacked" | "arpeggiated";
}

export interface QuestionRecord {
	chordQuality: QualityId;
	chordVoicing: VoicingId;
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
}
