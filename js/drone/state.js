import { LEAD_VELOCITY_DEFAULT } from "../core/constants.js";
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
};
export const AMBIENCE_SETTINGS = {
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
    activeMode: "mode1",
    activeProgressionName: CUSTOM_PROGRESSION_NAME,
    questionQueue: [],
    questionIndex: 0,
    lastMode1Config: null,
    lastMode2Config: null,
    customProgressions: [],
    tuneProgressions: [],
    cachedLeadVelocity: LEAD_VELOCITY_DEFAULT,
    nextChordKey: "Space",
    playbackMode: "ambience",
    ambienceMode: "breathing",
    autoAdvanceEnabled: false,
    autoAdvanceSeconds: 5,
    autoAdvanceTimer: null,
    metronomeTimer: null,
    roundingWarningShown: false,
    currentBarOffset: 0,
    eventBarMap: new Map(),
    barHighlightTimers: [],
    isDroneRunning: false,
    stopRequested: false,
    loopForeverActive: false,
    loopIndex: 0,
    loopBaseConfig: null,
    metronomeBeatIndex: 0,
    metronomeBeatTotal: 0,
    metronomeBeatMs: 0,
    metronomeBpb: 4,
    metronomeBpm: 80,
    ambientTimer: null,
    currentRootNote: null,
};
