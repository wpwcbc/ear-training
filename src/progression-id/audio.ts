declare const Tone: any;

export interface PlaybackQuestion {
	chordNotes: string[];
	chordVelocities: number[];
}

let chordSynth: any = null;
let audioReady = false;

export const ensureAudioReady = async (): Promise<void> => {
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

export const schedulePlayback = (question: PlaybackQuestion): void => {
	if (!chordSynth) {
		return;
	}
	const now = Tone.now();
	const chordDuration = 1.05;
	question.chordNotes.forEach((note, index) => {
		const velocity = question.chordVelocities?.[index] ?? 0.8;
		chordSynth?.triggerAttackRelease(note, chordDuration, now, velocity);
	});
};
