import type { ChordQuality, ChordConfig } from "../core/constants.js";
import type { ProgressionPreset } from "../core/progressions.js";

export type ActiveMode = "mode1" | "mode2";
export type PlaybackMode = "ambience" | "metronome";
export type AmbienceMode = "steady" | "breathing";
export type DurationMode = "x" | "/";

export interface DroneQueueEvent {
	mode: ActiveMode;
	keyCenter: string | null;
	quality: ChordQuality;
	chordDegree?: string;
	chordRoot?: string;
	chordIndex: number;
	chordCount: number;
	durationMode: DurationMode;
	durationValue: number;
}

export interface DroneChordConfig extends ChordConfig {
	durationMode: DurationMode;
	durationValue: number;
}

export interface Mode1Config {
	keyCenter: string;
	progression: DroneChordConfig[];
	minRootNote: string;
	minRootMidi: number;
	loopTimes: number;
	loopForever: boolean;
	loopKeyShift: number;
}

export interface Mode2Config {
	totalQuestions: number;
	enabledQualities: ChordQuality[];
	minRootNote: string;
	minRootMidi: number;
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

export interface AmbientSettings {
	firstChord: {
		volumeDb: number;
		envelope: {
			attack: number;
			decay: number;
			sustain: number;
			release: number;
		};
	};
	breathing: {
		wave: "sine" | "triangle" | "sawtooth" | "square";
		volumeDb: number;
		envelope: {
			attack: number;
			decay: number;
			sustain: number;
			release: number;
		};
		pulseDurationMin: number;
		pulseDurationMax: number;
		velocityPercentMin: number;
		velocityPercentMax: number;
		pulseDelayMinMs: number;
		pulseDelayMaxMs: number;
	};
}

export interface AudioState {
	chordSynth: any;
	rootSynth: any;
	ambientSynth: any;
	audioReady: boolean;
	activeNotes: string[];
}

export type BreathingNote = { note: string; maxVelocity: number };

export type BarSegment = { symbol: string; units: number; eventIndex: number };
export type BarState = { segments: BarSegment[]; units: number };
