let chordSynth = null;
let audioReady = false;
export const ensureAudioReady = async () => {
    if (audioReady) {
        return;
    }
    await Tone.start();
    chordSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: {
            attack: 0.01,
            decay: 0.1,
            sustain: 0.6,
            release: 0.8,
        },
    }).toDestination();
    chordSynth.volume.value = -8;
    audioReady = true;
};
export const schedulePlayback = (chords) => {
    if (!chordSynth) {
        return;
    }
    let time = Tone.now();
    const chordDuration = 1.05;
    const gap = 0.08;
    chords.forEach((chord) => {
        chord.chordNotes.forEach((note, index) => {
            const velocity = chord.chordVelocities?.[index] ?? 0.8;
            chordSynth?.triggerAttackRelease(note, chordDuration, time, velocity);
        });
        time += chordDuration + gap;
    });
};
