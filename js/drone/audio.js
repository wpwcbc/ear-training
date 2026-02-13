import { AMBIENCE_SETTINGS, METRONOME_SETTINGS, state } from "./state.js";
const audioState = {
    chordSynth: null,
    rootSynth: null,
    ambientSynth: null,
    audioReady: false,
    activeNotes: [],
};
export const ensureAudioReady = async () => {
    if (audioState.audioReady) {
        return;
    }
    await Tone.start();
    const warmupSynth = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.001, decay: 0.01, sustain: 0, release: 0.01 },
    }).toDestination();
    warmupSynth.volume.value = -60;
    warmupSynth.triggerAttackRelease("C4", 0.02);
    warmupSynth.dispose();
    audioState.chordSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: {
            attack: METRONOME_SETTINGS.envelope.attack,
            decay: METRONOME_SETTINGS.envelope.decay,
            sustain: METRONOME_SETTINGS.envelope.sustain,
            release: METRONOME_SETTINGS.envelope.release,
        },
    }).toDestination();
    audioState.chordSynth.volume.value = METRONOME_SETTINGS.volumeDb;
    audioState.rootSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: {
            attack: AMBIENCE_SETTINGS.firstChord.envelope.attack,
            decay: AMBIENCE_SETTINGS.firstChord.envelope.decay,
            sustain: AMBIENCE_SETTINGS.firstChord.envelope.sustain,
            release: AMBIENCE_SETTINGS.firstChord.envelope.release,
        },
    }).toDestination();
    audioState.rootSynth.volume.value = AMBIENCE_SETTINGS.firstChord.volumeDb;
    audioState.ambientSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: AMBIENCE_SETTINGS.breathing.wave },
        envelope: {
            attack: AMBIENCE_SETTINGS.breathing.envelope.attack,
            decay: AMBIENCE_SETTINGS.breathing.envelope.decay,
            sustain: AMBIENCE_SETTINGS.breathing.envelope.sustain,
            release: AMBIENCE_SETTINGS.breathing.envelope.release,
        },
    }).toDestination();
    audioState.ambientSynth.volume.value = AMBIENCE_SETTINGS.breathing.volumeDb;
    audioState.audioReady = true;
};
export const isAudioReady = () => audioState.audioReady;
export const stopChord = () => {
    if (!audioState.audioReady || !audioState.chordSynth) {
        return;
    }
    // In metronome mode we triggerAttackRelease each beat without tracking per-note state,
    // so prefer a hard release-all to avoid tails masking chord changes.
    if (typeof audioState.chordSynth.releaseAll === "function") {
        audioState.chordSynth.releaseAll();
    }
    if (audioState.activeNotes.length) {
        audioState.chordSynth.triggerRelease(audioState.activeNotes);
        audioState.activeNotes = [];
    }
};
export const stopRootSustain = () => {
    if (!audioState.audioReady || !audioState.rootSynth) {
        return;
    }
    if (state.currentRootNote) {
        audioState.rootSynth.triggerRelease(state.currentRootNote);
    }
    state.currentRootNote = null;
};
export const playChord = (notes, velocities) => {
    if (!audioState.audioReady || !audioState.chordSynth) {
        return;
    }
    stopChord();
    audioState.activeNotes = notes;
    notes.forEach((note, index) => {
        const velocity = velocities[index] ?? 0.8;
        audioState.chordSynth.triggerAttack(note, undefined, velocity);
    });
};
export const playRootSustain = (note, velocity) => {
    if (!audioState.audioReady || !audioState.rootSynth) {
        return;
    }
    const now = Tone.now();
    if (state.currentRootNote) {
        audioState.rootSynth.triggerRelease(state.currentRootNote, now);
    }
    state.currentRootNote = note;
    audioState.rootSynth.triggerAttack(note, now, velocity);
};
export const playChordBeat = (notes, velocities, bpm) => {
    if (!audioState.audioReady || !audioState.chordSynth) {
        return;
    }
    const duration = (60 / bpm) * 0.9;
    const now = Tone.now();
    notes.forEach((note, index) => {
        const velocity = velocities[index] ?? 0.8;
        audioState.chordSynth.triggerAttackRelease(note, duration, now, velocity);
    });
};
export const playChordBeats = (notes, velocities, beats, bpm) => {
    if (!audioState.audioReady || !audioState.chordSynth) {
        return;
    }
    stopChord();
    audioState.activeNotes = [];
    const beatSeconds = 60 / bpm;
    const duration = beatSeconds * 0.9;
    const now = Tone.now();
    for (let beat = 0; beat < beats; beat += 1) {
        const startTime = now + beat * beatSeconds;
        notes.forEach((note, index) => {
            const velocity = velocities[index] ?? 0.8;
            audioState.chordSynth.triggerAttackRelease(note, duration, startTime, velocity);
        });
    }
};
export const stopAmbient = () => {
    if (state.ambientTimer) {
        window.clearTimeout(state.ambientTimer);
        state.ambientTimer = null;
    }
    if (audioState.ambientSynth?.releaseAll) {
        audioState.ambientSynth.releaseAll();
    }
};
const scheduleAmbientPulse = (notes) => {
    if (!state.isDroneRunning || state.playbackMode !== "ambience") {
        return;
    }
    if (!audioState.ambientSynth) {
        return;
    }
    if (!notes.length) {
        return;
    }
    const pick = notes[Math.floor(Math.random() * notes.length)];
    const duration = AMBIENCE_SETTINGS.breathing.pulseDurationMin +
        Math.random() *
            Math.max(0, AMBIENCE_SETTINGS.breathing.pulseDurationMax -
                AMBIENCE_SETTINGS.breathing.pulseDurationMin);
    const percent = AMBIENCE_SETTINGS.breathing.velocityPercentMin +
        Math.random() *
            Math.max(0, AMBIENCE_SETTINGS.breathing.velocityPercentMax -
                AMBIENCE_SETTINGS.breathing.velocityPercentMin);
    const velocity = Math.max(0, Math.min(1, pick.maxVelocity * percent));
    audioState.ambientSynth.triggerAttackRelease(pick.note, duration, undefined, velocity);
    const delay = AMBIENCE_SETTINGS.breathing.pulseDelayMinMs +
        Math.random() *
            Math.max(0, AMBIENCE_SETTINGS.breathing.pulseDelayMaxMs -
                AMBIENCE_SETTINGS.breathing.pulseDelayMinMs);
    state.ambientTimer = window.setTimeout(() => scheduleAmbientPulse(notes), delay);
};
export const startAmbient = (notes) => {
    stopAmbient();
    window.setTimeout(() => scheduleAmbientPulse(notes), 0);
};
