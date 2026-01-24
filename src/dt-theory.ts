import { NOTE_NAMES_SHARP, type ChordQuality } from "./dt-constants.js";

const MAJOR_SCALE_OFFSETS: Map<string, number> = new Map([
	["1", 0],
	["2", 2],
	["3", 4],
	["4", 5],
	["5", 7],
	["6", 9],
	["7", 11],
]);

export function parseDegreeToSemitones(degText: string): number {
	let text: string = String(degText).trim();
	let accidental: number = 0;

	while (text.startsWith("b")) {
		accidental -= 1;
		text = text.slice(1);
	}
	while (text.startsWith("#")) {
		accidental += 1;
		text = text.slice(1);
	}

	if (!MAJOR_SCALE_OFFSETS.has(text)) {
		throw new Error("Unsupported degree: " + degText);
	}
	return (MAJOR_SCALE_OFFSETS.get(text) ?? 0) + accidental;
}

export function noteNameToPitchClassSemitones(noteName: string): number {
	const match: RegExpExecArray | null = /^([A-Ga-g])([#b]{0,2})$/.exec(
		noteName.trim(),
	);
	if (!match) {
		throw new Error("Bad key center: " + noteName);
	}

	const letter: string = match[1].toUpperCase();
	const acc: string = match[2] || "";

	const base: number | undefined = new Map<string, number>([
		["C", 0],
		["D", 2],
		["E", 4],
		["F", 5],
		["G", 7],
		["A", 9],
		["B", 11],
	]).get(letter);

	if (typeof base !== "number") {
		throw new Error("Bad key center: " + noteName);
	}

	let delta: number = 0;
	for (const ch of acc) {
		if (ch === "#") {
			delta += 1;
		}
		if (ch === "b") {
			delta -= 1;
		}
	}
	return (base + delta + 120) % 12;
}

export function noteWithOctaveToMidi(noteText: string): number {
	const match: RegExpExecArray | null = /^([A-Ga-g])([#b]{0,2})(-?\d+)$/.exec(
		noteText.trim(),
	);
	if (!match) {
		throw new Error("Bad note format (use e.g. G2).");
	}
	const letter: string = match[1].toUpperCase();
	const acc: string = match[2] || "";
	const octave: number = Number(match[3]);
	if (!Number.isFinite(octave)) {
		throw new Error("Bad octave in: " + noteText);
	}
	const pc: number = noteNameToPitchClassSemitones(letter + acc);
	return (octave + 1) * 12 + pc;
}

export function pcToNameSharp(pc: number): string {
	return NOTE_NAMES_SHARP[((pc % 12) + 12) % 12];
}

export function midiToNoteNameSharp(midi: number): string {
	const pc: number = ((midi % 12) + 12) % 12;
	const octave: number = Math.floor(midi / 12) - 1;
	return NOTE_NAMES_SHARP[pc] + String(octave);
}

export function buildChordIntervals(quality: ChordQuality): number[] {
	switch (quality) {
		case "maj7":
			return [0, 4, 7, 11];
		case "m7":
			return [0, 3, 7, 10];
		case "7":
			return [0, 4, 7, 10];
		case "m7b5":
			return [0, 3, 6, 10];
		case "dim7":
			return [0, 3, 6, 9];
		case "mmaj7":
			return [0, 3, 7, 11];
		case "+":
			return [0, 4, 8, 8];
		default:
			throw new Error("Unsupported quality: " + quality);
	}
}

export function buildChordVoicing(
	rootMidi: number,
	intervals: number[],
): number[] {
	const third: number = intervals[1];
	const fifth: number = intervals[2];
	const seventh: number = intervals[3];
	const voiced: number[] = [
		rootMidi,
		rootMidi + fifth,
		rootMidi + seventh,
		rootMidi + third + 12,
	];
	return voiced.sort((a, b) => a - b);
}

export function parseDegreeList(text: string): string[] {
	const tokens: string[] = text
		.split(/[\s,]+/)
		.map((item) => item.trim())
		.filter(Boolean);
	if (!tokens.length) {
		throw new Error("Provide at least one degree.");
	}
	for (const token of tokens) {
		parseDegreeToSemitones(token);
	}
	return tokens;
}

export function chooseUpperMidi(
	rootMidi: number,
	upperDegreeText: string,
	minMidi: number,
): number {
	const semis: number = parseDegreeToSemitones(upperDegreeText);
	let midi: number = rootMidi + semis;
	while (midi < minMidi) {
		midi += 12;
	}
	return midi;
}

export function computeChordRootMidiFromKey(
	keyCenter: string,
	chordDegreeText: string,
	octave: number,
): number {
	const keyPc: number = noteNameToPitchClassSemitones(keyCenter);
	const offset: number = parseDegreeToSemitones(chordDegreeText);
	const chordPc: number = (keyPc + offset + 120) % 12;
	return (octave + 1) * 12 + chordPc;
}

export function computeChordRootMidiFromNote(
	noteName: string,
	octave: number,
): number {
	const pc: number = noteNameToPitchClassSemitones(noteName);
	return (octave + 1) * 12 + pc;
}

export function clampRootMidiToMin(rootMidi: number, minMidi: number): number {
	let midi: number = rootMidi;
	while (midi < minMidi) {
		midi += 12;
	}
	return midi;
}

export function transposeKeyCenter(keyCenter: string, semis: number): string {
	const pc: number = noteNameToPitchClassSemitones(keyCenter);
	return pcToNameSharp(pc + semis);
}

export function pickRandom<T>(list: T[]): T {
	return list[Math.floor(Math.random() * list.length)];
}
