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
    audioState.leadSynth = new Tone.Synth({
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
export function schedulePlayback(question) {
    const now = Tone.now();
    const chordDuration = question.playChord ? 1.05 : 0;
    const gap = 0.08;
    if (question.playChord) {
        question.chordNotes.forEach((note, index) => {
            const velocity = question.chordVelocities?.[index] ?? 0.8;
            audioState.chordSynth.triggerAttackRelease(note, chordDuration, now, velocity);
        });
    }
    audioState.leadSynth.triggerAttackRelease(question.upperNote, 0.85, now + (question.playChord ? chordDuration + gap : 0), question.leadVelocity ?? 1);
}
export function isReady() {
    return audioState.audioReady;
}
