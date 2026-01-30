import type { ChordQuality, ChordConfig } from "../core/constants.js";
import type { ProgressionPreset } from "../core/progressions.js";

export type ActiveMode = "mode1" | "mode2";
export type StatsGrouping = "quality" | "degree";
export type StatsOrder = "name" | "time-asc" | "time-desc";
export type IntervalMode = "harmonic" | "melodic";
export type MelodicDirection = "up" | "down";

export interface Mode1Config {
	keyCenter: string;
	progression: ChordConfig[];
	minRootNote: string;
	minRootMidi: number;
	loopTimes: number;
	loopKeyShift: number;
	intervalMode: IntervalMode;
}

export interface Mode2Config {
	totalQuestions: number;
	allowedByQuality: Record<ChordQuality, string[]>;
	enabledQualities: ChordQuality[];
	minRootNote: string;
	minRootMidi: number;
	intervalMode: IntervalMode;
}

export interface BaseQueueEvent {
	mode: ActiveMode;
	minRootMidi: number;
	chordIndex: number;
	chordCount: number;
	questionInChord: number;
	questionsPerChord: number;
	quality: ChordQuality;
	allowedUpperDegrees: string[];
	playChord: boolean;
	intervalMode: IntervalMode;
}

export interface Mode1QueueEvent extends BaseQueueEvent {
	mode: "mode1";
	keyCenter: string;
	chordDegree: string;
}

export interface Mode2QueueEvent extends BaseQueueEvent {
	mode: "mode2";
	keyCenter: null;
	chordRoot: string;
}

export type QueueEvent = Mode1QueueEvent | Mode2QueueEvent;

export type Question = QueueEvent & {
	chordRootMidi: number;
	chordTonicName: string;
	chordNotes: string[];
	chordVelocities: number[];
	leadVelocity: number;
	intervalNotes: [string, string];
	intervalLabel: string;
	intervalMode: IntervalMode;
	melodicDirection: MelodicDirection;
	intervalSemis: number;
};

export interface QuestionRecord {
	keyCenter: string;
	chordDegree: string;
	chordQuality: ChordQuality;
	intervalLabel: string;
	timeSeconds: number;
	attempts: number;
}

export interface TestRecord {
	progressionName: string;
	avgTimeSeconds: number;
	avgAttempts: number;
	datetime: string;
}

export interface BuildPresetResult {
	preset: ProgressionPreset | null;
	error: string | null;
}

export interface VelocitySettings {
	root: number;
	fifth: number;
	seventh: number;
	third: number;
	lead: number;
}

export interface ResolvedScaleOption {
	id: string;
	label: string;
	degrees: string;
	tokens: string[];
}
