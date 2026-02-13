import { LEAD_VELOCITY_DEFAULT } from "../core/constants.js";
import type { ProgressionPreset } from "../core/progressions.js";
import type {
	ActiveMode,
	AmbienceMode,
	AmbientSettings,
	DroneQueueEvent,
	Mode1Config,
	Mode2Config,
	PlaybackMode,
} from "./types.js";

export const CUSTOM_PROGRESSION_NAME = "Custom progression";

export const STORAGE_KEYS = {
	velocityMix: "eartrain:velocityMix:drone",
	customProgressions: "eartrain:customProgressions",
};

export const METRONOME_SETTINGS = {
	volumeDb: -8,
	envelope: {
		attack: 0.01,
		decay: 0.1,
		sustain: 0.9,
		release: 1.2,
	},
} as const;

export const AMBIENCE_SETTINGS: AmbientSettings = {
	firstChord: {
		volumeDb: -12,
		envelope: {
			attack: 2.0,
			decay: 0.5,
			sustain: 0.75,
			release: 5.0,
		},
	},
	breathing: {
		wave: "triangle",
		volumeDb: -12,
		envelope: {
			attack: 1.0,
			decay: 5.0,
			sustain: 0.25,
			release: 5.0,
		},
		pulseDurationMin: 3.0,
		pulseDurationMax: 4.0,
		velocityPercentMin: 0.75,
		velocityPercentMax: 1.0,
		pulseDelayMinMs: 200,
		pulseDelayMaxMs: 1000,
	},
};

export const state = {
	activeMode: "mode1" as ActiveMode,
	activeProgressionName: CUSTOM_PROGRESSION_NAME,
	questionQueue: [] as DroneQueueEvent[],
	questionIndex: 0,
	lastMode1Config: null as Mode1Config | null,
	lastMode2Config: null as Mode2Config | null,
	customProgressions: [] as ProgressionPreset[],
	tuneProgressions: [] as ProgressionPreset[],
	cachedLeadVelocity: LEAD_VELOCITY_DEFAULT,
	nextChordKey: "Space",
	playbackMode: "ambience" as PlaybackMode,
	ambienceMode: "breathing" as AmbienceMode,
	autoAdvanceEnabled: false,
	autoAdvanceSeconds: 5,
	autoAdvanceTimer: null as number | null,
	metronomeTimer: null as number | null,
	roundingWarningShown: false,
	currentBarOffset: 0,
	eventBarMap: new Map<number, number[]>(),
	barHighlightTimers: [] as number[],
	isDroneRunning: false,
	stopRequested: false,
	loopForeverActive: false,
	loopIndex: 0,
	loopBaseConfig: null as Mode1Config | null,
	metronomeBeatIndex: 0,
	metronomeBeatTotal: 0,
	metronomeBeatMs: 0,
	metronomeBpb: 4,
	metronomeBpm: 80,
	metronomeAdvanceMode: "auto" as "auto" | "manual",
	metronomeQueuedNext: false,
	metronomeLastChordSymbol: null as string | null,
	ambientTimer: null as number | null,
	currentRootNote: null as string | null,
};
