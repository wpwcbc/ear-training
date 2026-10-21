import { legacyLogger } from '../analytics/legacy.js';
const audioState = {
    chordSynth: null,
    leadSynth: null,
    audioReady: false,
};
export async function ensureAudioReady() {
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
            attack: 0.01,
            decay: 0.1,
            sustain: 0.6,
            release: 0.8,
        },
    }).toDestination();
    audioState.chordSynth.volume.value = -8;
    audioState.leadSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: {
            attack: 0.01,
            decay: 0.08,
            sustain: 0.45,
            release: 0.5,
        },
    }).toDestination();
    audioState.leadSynth.volume.value = -4;
    audioState.audioReady = true;
}
function schedulePlaybackAudio(question) {
    const now = Tone.now();
    const chordDuration = question.playChord ? 1.05 : 0;
    const gap = 0.08;
    if (question.playChord) {
        question.chordNotes.forEach((note, index) => {
            const velocity = question.chordVelocities?.[index] ?? 0.8;
            audioState.chordSynth.triggerAttackRelease(note, chordDuration, now, velocity);
        });
    }
    const startTime = now + (question.playChord ? chordDuration + gap : 0);
    const velocity = question.leadVelocity ?? 1;
    const scheduledMs = ((question.playChord ? chordDuration + gap : 0) + (question.intervalMode === 'harmonic' ? .9 : 1.48) + .5) * 1000;
    const [noteA, noteB] = question.intervalNotes;
    if (question.intervalMode === "harmonic") {
        audioState.leadSynth.triggerAttackRelease(noteA, 0.9, startTime, velocity);
        audioState.leadSynth.triggerAttackRelease(noteB, 0.9, startTime, velocity);
        legacyLogger('interval').play(scheduledMs);
        return;
    }
    const firstNote = question.melodicDirection === "up" ? noteA : noteB;
    const secondNote = question.melodicDirection === "up" ? noteB : noteA;
    audioState.leadSynth.triggerAttackRelease(firstNote, 0.7, startTime, velocity);
    audioState.leadSynth.triggerAttackRelease(secondNote, 0.7, startTime + 0.7 + gap, velocity);
    legacyLogger('interval').play(scheduledMs);
}
export function schedulePlayback(question) { const logger = legacyLogger('interval'); logger.beginPlayback(); try {
    schedulePlaybackAudio(question);
}
catch (error) {
    logger.audioFailed();
    throw error;
} }
export function isReady() {
    return audioState.audioReady;
}
