declare const Tone: any;

export interface PlaybackQuestion {
	playChord: boolean;
	chordNotes: string[];
	chordVelocities?: number[];
	intervalNotes: [string, string];
	intervalMode: "harmonic" | "melodic";
	melodicDirection: "up" | "down";
	leadVelocity?: number;
}

interface AudioState {
	chordSynth: any;
	leadSynth: any;
	audioReady: boolean;
}

const audioState: AudioState = {
	chordSynth: null,
	leadSynth: null,
	audioReady: false,
};

export async function ensureAudioReady(): Promise<void> {
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

export function schedulePlayback(question: PlaybackQuestion): void {
	const now: number = Tone.now();
	const chordDuration: number = question.playChord ? 1.05 : 0;
	const gap: number = 0.08;

	if (question.playChord) {
		question.chordNotes.forEach((note, index) => {
			const velocity: number = question.chordVelocities?.[index] ?? 0.8;
			audioState.chordSynth.triggerAttackRelease(
				note,
				chordDuration,
				now,
				velocity,
			);
		});
	}

	const startTime: number = now + (question.playChord ? chordDuration + gap : 0);
	const velocity: number = question.leadVelocity ?? 1;
	const [noteA, noteB] = question.intervalNotes;
	if (question.intervalMode === "harmonic") {
		audioState.leadSynth.triggerAttackRelease(noteA, 0.9, startTime, velocity);
		audioState.leadSynth.triggerAttackRelease(noteB, 0.9, startTime, velocity);
		return;
	}
	const firstNote = question.melodicDirection === "up" ? noteA : noteB;
	const secondNote = question.melodicDirection === "up" ? noteB : noteA;
	audioState.leadSynth.triggerAttackRelease(firstNote, 0.7, startTime, velocity);
	audioState.leadSynth.triggerAttackRelease(
		secondNote,
		0.7,
		startTime + 0.7 + gap,
		velocity,
	);
}

export function isReady(): boolean {
	return audioState.audioReady;
}
