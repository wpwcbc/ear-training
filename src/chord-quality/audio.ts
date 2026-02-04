declare const Tone: any;

import { CHORD_VOICE_VELOCITIES } from "../core/constants.js";
import type { ChordToneVelocity } from "./types.js";

export interface PlaybackQuestion {
	chordNotes: string[];
	chordVelocities: number[];
	playbackMode: "stacked" | "arpeggiated";
}

let chordSynth: any = null;
let audioReady = false;

const velocityMap: ChordToneVelocity = {
	root: CHORD_VOICE_VELOCITIES.root,
	third: CHORD_VOICE_VELOCITIES.third,
	fifth: CHORD_VOICE_VELOCITIES.fifth,
	seventh: CHORD_VOICE_VELOCITIES.seventh,
	tension: 0.5,
};

export const getVelocityForTone = (tone: keyof ChordToneVelocity): number =>
	velocityMap[tone];

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
			release: 0.9,
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
	const chordDuration = 1.15;
	if (question.playbackMode === "arpeggiated") {
		const step = 0.22;
		question.chordNotes.forEach((note, index) => {
			const velocity = question.chordVelocities?.[index] ?? 0.8;
			chordSynth?.triggerAttackRelease(
				note,
				0.7,
				now + index * step,
				velocity,
			);
		});
		return;
	}
	question.chordNotes.forEach((note, index) => {
		const velocity = question.chordVelocities?.[index] ?? 0.8;
		chordSynth?.triggerAttackRelease(note, chordDuration, now, velocity);
	});
};
