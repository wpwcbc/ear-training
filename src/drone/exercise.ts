import { RANDOM_ROOTS, type ChordQuality } from "../core/constants.js";
import * as theory from "../core/theory.js";
import { dom } from "./dom.js";
import { state } from "./state.js";
import * as audio from "./audio.js";
import { collectVelocitySettings } from "./velocity.js";
import type {
	ActiveMode,
	DroneQueueEvent,
	Mode1Config,
	Mode2Config,
	BreathingNote,
	BarSegment,
	BarState,
} from "./types.js";

export const setStatus = (
	message: string,
	stateClass: "ok" | "warn" | "" = "",
): void => {
	dom.elDroneStatus.textContent = message;
	if (stateClass) {
		dom.elDroneStatus.dataset.state = stateClass;
	} else {
		delete dom.elDroneStatus.dataset.state;
	}
};

const clearBarHighlightTimers = (): void => {
	state.barHighlightTimers.forEach((timer) => window.clearTimeout(timer));
	state.barHighlightTimers = [];
};

const clearAutoAdvanceTimer = (): void => {
	if (state.autoAdvanceTimer) {
		window.clearTimeout(state.autoAdvanceTimer);
		state.autoAdvanceTimer = null;
	}
};

export const resetExerciseDisplay = (): void => {
	dom.elDroneKeyLabel.textContent = "-";
	dom.elDroneChordLabel.textContent = "-";
	dom.elDroneTonicLabel.textContent = "-";
	dom.elDroneNextLabel.textContent = "-";
	dom.elDroneNextTonicLabel.textContent = "-";
	dom.elDroneProgressLabel.textContent = "-";
	dom.elDroneChordList.innerHTML = "";
	state.roundingWarningShown = false;
	state.eventBarMap.clear();
	clearBarHighlightTimers();
	clearAutoAdvanceTimer();
	state.loopForeverActive = false;
	state.loopIndex = 0;
	state.loopBaseConfig = null;
	setStatus("Configure a progression and press Start.");
	dom.btnNextChord.disabled = true;
	dom.btnNextChord.textContent = "Next chord";
};

const QUALITY_SUFFIX: Record<ChordQuality, string> = {
	maj7: "maj7",
	m7: "m7",
	"7": "7",
	"7b9": "7b9",
	m7b5: "m7b5",
	dim7: "dim7",
	mmaj7: "mMaj7",
	"+": "+",
};

const buildChordNotes = (
	event: DroneQueueEvent,
	minRootMidi: number,
): { notes: string[]; tonicName: string } => {
	let chordRootMidi = 0;
	let chordTonicName = "";

	if (event.mode === "mode1") {
		const keyCenter = event.keyCenter || "C";
		chordRootMidi = theory.computeChordRootMidiFromKey(
			keyCenter,
			event.chordDegree || "1",
			1,
		);
		chordRootMidi = theory.clampRootMidiToMin(chordRootMidi, minRootMidi);
		const keyPc = theory.noteNameToPitchClassSemitones(keyCenter);
		const offset = theory.parseDegreeToSemitones(event.chordDegree || "1");
		chordTonicName = theory.pcToNameSharp(keyPc + offset);
	} else {
		chordRootMidi = theory.computeChordRootMidiFromNote(
			event.chordRoot || "C",
			1,
		);
		chordRootMidi = theory.clampRootMidiToMin(chordRootMidi, minRootMidi);
		chordTonicName = event.chordRoot || "C";
	}

	const intervals = theory.buildChordIntervals(event.quality);
	const chordMidis = theory.buildChordVoicing(chordRootMidi, intervals);
	return {
		notes: chordMidis.map(theory.midiToNoteNameSharp),
		tonicName: chordTonicName,
	};
};

const getChordSymbol = (event: DroneQueueEvent, minRootMidi: number): string => {
	const chord = buildChordNotes(event, minRootMidi);
	const suffix = QUALITY_SUFFIX[event.quality] || event.quality;
	return `${chord.tonicName}${suffix}`;
};

const buildBars = (minRootMidi: number): BarSegment[][] => {
	const bars: BarSegment[][] = [];
	let current: BarState = { segments: [], units: 0 };
	state.eventBarMap.clear();

	const flush = (): void => {
		if (current.segments.length) {
			const barIndex = bars.length;
			current.segments.forEach((segment) => {
				const list = state.eventBarMap.get(segment.eventIndex) ?? [];
				list.push(barIndex);
				state.eventBarMap.set(segment.eventIndex, list);
			});
			bars.push([...current.segments]);
			current = { segments: [], units: 0 };
		}
	};

	state.questionQueue.forEach((event, eventIndex) => {
		const symbol = getChordSymbol(event, minRootMidi);
		const mode = event.durationMode || "x";
		const value = Math.max(1, event.durationValue || 1);

		if (mode === "x") {
			flush();
			for (let i = 0; i < value; i += 1) {
				const barIndex = bars.length;
				state.eventBarMap.set(eventIndex, [
					...(state.eventBarMap.get(eventIndex) ?? []),
					barIndex,
				]);
				bars.push([{ symbol, units: 4, eventIndex }]);
			}
			return;
		}

		const units = value === 2 ? 2 : 1;
		if (current.units + units > 4) {
			flush();
		}
		current.segments.push({ symbol, units, eventIndex });
		current.units += units;
		if (current.units >= 4) {
			flush();
		}
	});

	flush();
	return bars;
};

const updateChordHighlight = (index: number): void => {
	const currentEvent = state.questionQueue[index];
	const barIndices = state.eventBarMap.get(index) ?? [];
	const activeBarIndex =
		barIndices[Math.min(state.currentBarOffset, barIndices.length - 1)];

	dom.elDroneChordList
		.querySelectorAll<HTMLDivElement>(".chord-pill")
		.forEach((pill) => {
			const match = Number(pill.dataset.barIndex) === activeBarIndex;
			pill.classList.toggle("is-active", match);
		});

	dom.elDroneChordList
		.querySelectorAll<HTMLDivElement>(".chord-segment")
		.forEach((segment) => {
			const match =
				Number(segment.dataset.eventIndex) === index &&
				Number(segment.dataset.barIndex) === activeBarIndex;
			segment.classList.toggle("is-active", match);
		});
};

export const renderChordSequence = (minRootMidi: number): void => {
	dom.elDroneChordList.innerHTML = "";
	if (!state.questionQueue.length) {
		return;
	}
	buildBars(minRootMidi).forEach((bar) => {
		const pill = document.createElement("div");
		pill.className = "chord-pill";
		pill.dataset.barIndex = String(dom.elDroneChordList.childElementCount);
		bar.forEach((segment) => {
			const span = document.createElement("div");
			span.className = "chord-segment";
			span.textContent = segment.symbol;
			span.style.gridColumn = `span ${segment.units}`;
			span.dataset.eventIndex = String(segment.eventIndex);
			span.dataset.barIndex = pill.dataset.barIndex ?? "0";
			pill.appendChild(span);
		});
		dom.elDroneChordList.appendChild(pill);
	});
};

const getChordDisplay = (event: DroneQueueEvent): string => {
	if (event.mode === "mode1") {
		return `${event.chordDegree} ${event.quality}`;
	}
	return `${event.chordRoot} ${event.quality}`;
};

const updateDisplayForIndex = (index: number, minRootMidi: number): void => {
	if (!state.questionQueue.length) {
		resetExerciseDisplay();
		return;
	}
	const current = state.questionQueue[index];
	const next = state.questionQueue[index + 1];

	const keyLabel =
		current.mode === "mode1" ? current.keyCenter || "-" : "Random";
	dom.elDroneKeyLabel.textContent = keyLabel;
	dom.elDroneChordLabel.textContent = getChordDisplay(current);

	const currentChord = buildChordNotes(current, minRootMidi);
	dom.elDroneTonicLabel.textContent = currentChord.tonicName;
	state.currentBarOffset = 0;
	updateChordHighlight(index);

	if (next) {
		dom.elDroneNextLabel.textContent = getChordDisplay(next);
		const nextChord = buildChordNotes(next, minRootMidi);
		dom.elDroneNextTonicLabel.textContent = nextChord.tonicName;
	} else {
		dom.elDroneNextLabel.textContent = "-";
		dom.elDroneNextTonicLabel.textContent = "-";
	}

	dom.elDroneProgressLabel.textContent = `${index + 1} / ${state.questionQueue.length}`;
	updateNextChordButton();
};

const playIndex = (index: number, minRootMidi: number): void => {
	const event = state.questionQueue[index];
	const chord = buildChordNotes(event, minRootMidi);
	const velocities = collectVelocitySettings();
	const advanceHint = state.autoAdvanceEnabled
		? `Auto-advancing every ${state.autoAdvanceSeconds}s.`
		: "Click Next chord to advance.";
	if (state.ambienceMode === "steady") {
		audio.stopRootSustain();
		audio.stopAmbient();
		audio.playChord(chord.notes, [
			velocities.root,
			velocities.fifth,
			velocities.seventh,
			velocities.third,
		]);
		setStatus(`Steady chord sustaining. ${advanceHint}`, "ok");
		return;
	}

	const rootNote = chord.notes[0];
	audio.playRootSustain(rootNote, velocities.root);
	const breathingNotes: BreathingNote[] = [
		{ note: chord.notes[1], maxVelocity: velocities.fifth },
		{ note: chord.notes[2], maxVelocity: velocities.seventh },
		{ note: chord.notes[3], maxVelocity: velocities.third },
	];
	audio.startAmbient(breathingNotes);
	setStatus(`Breathing chord. ${advanceHint}`, "ok");
};

export const scheduleAutoAdvance = (minRootMidi: number): void => {
	clearAutoAdvanceTimer();
	if (!state.autoAdvanceEnabled) {
		return;
	}
	if (!state.isDroneRunning || state.playbackMode !== "ambience") {
		return;
	}
	const seconds = state.autoAdvanceSeconds;
	if (!Number.isFinite(seconds) || seconds <= 0) {
		return;
	}
	state.autoAdvanceTimer = window.setTimeout(() => {
		state.autoAdvanceTimer = null;
		if (!state.isDroneRunning || state.playbackMode !== "ambience") {
			return;
		}
		nextChord(minRootMidi);
	}, seconds * 1000);
};

const stopMetronome = (): void => {
	if (state.metronomeTimer) {
		window.clearTimeout(state.metronomeTimer);
		state.metronomeTimer = null;
	}
	clearBarHighlightTimers();
	state.metronomeBeatIndex = 0;
	state.metronomeBeatTotal = 0;
};

const computeBeatsFromDuration = (
	event: DroneQueueEvent,
	bpb: number,
): { beats: number; rounded: boolean } => {
	if (state.metronomeAdvanceMode === "manual") {
		return { beats: 1, rounded: false };
	}

	const mode = event.durationMode || "x";
	const value = Math.max(1, event.durationValue || 1);
	const raw = mode === "/" ? bpb / value : value * bpb;
	const rounded = Math.round(raw);
	const beats = Math.max(1, rounded);
	return {
		beats,
		rounded: Math.abs(raw - rounded) > 0.001,
	};
};

const runMetronomeBeat = (minRootMidi: number): void => {
	if (!state.questionQueue.length) {
		resetExerciseDisplay();
		setDroneRunning(false);
		return;
	}
	if (state.questionIndex >= state.questionQueue.length) {
		if (startNextLoop(minRootMidi)) {
			state.metronomeBeatIndex = 0;
			state.metronomeBeatTotal = 0;
			runMetronomeBeat(minRootMidi);
			return;
		}
		setStatus("End of progression.", "ok");
		dom.btnNextChord.disabled = true;
		setDroneRunning(false);
		audio.stopChord();
		return;
	}
	const event = state.questionQueue[state.questionIndex];
	const { beats, rounded } = computeBeatsFromDuration(
		event,
		state.metronomeBpb,
	);
	state.metronomeBeatTotal = beats;

	if (state.metronomeBeatIndex === 0) {
		updateDisplayForIndex(state.questionIndex, minRootMidi);
		if (rounded && !state.roundingWarningShown) {
			state.roundingWarningShown = true;
			setStatus(
				"Metronome running. Non-integer beat counts were rounded; playback might sound unexpected.",
				"warn",
			);
		} else {
			setStatus(
				state.metronomeAdvanceMode === "manual"
					? "Metronome running. Press Next chord to switch on the next beat."
					: "Metronome running. Chords advance automatically.",
				"ok",
			);
		}
	}

	state.currentBarOffset =
		event.durationMode === "x"
			? Math.min(
					Math.max(0, event.durationValue - 1),
					Math.floor(state.metronomeBeatIndex / state.metronomeBpb),
				)
			: 0;
	updateChordHighlight(state.questionIndex);

	const chord = buildChordNotes(event, minRootMidi);
	const velocities = collectVelocitySettings();
	audio.playChordBeat(
		chord.notes,
		[
			velocities.root,
			velocities.fifth,
			velocities.seventh,
			velocities.third,
		],
		state.metronomeBpm,
	);

	state.metronomeBeatIndex += 1;

	state.metronomeTimer = window.setTimeout(() => {
		if (state.stopRequested) {
			state.stopRequested = false;
			audio.stopAmbient();
			audio.stopRootSustain();
			audio.stopChord();
			setDroneRunning(false);
			state.questionQueue = [];
			state.questionIndex = 0;
			resetExerciseDisplay();
			return;
		}
		if (state.metronomeAdvanceMode === "manual") {
			state.metronomeBeatIndex = 0;
			state.metronomeBeatTotal = 1;

			if (state.metronomeQueuedNext) {
				state.metronomeQueuedNext = false;
				state.questionIndex += 1;
			}
		} else if (state.metronomeBeatIndex >= state.metronomeBeatTotal) {
			state.questionIndex += 1;
			state.metronomeBeatIndex = 0;
		}

		runMetronomeBeat(minRootMidi);
	}, state.metronomeBeatMs);
};

const startMetronome = (minRootMidi: number): void => {
	state.stopRequested = false;
	state.metronomeBeatIndex = 0;
	state.metronomeBeatTotal = 0;
	state.metronomeQueuedNext = false;
	state.metronomeTimer && window.clearTimeout(state.metronomeTimer);
	state.metronomeTimer = null;
	runMetronomeBeat(minRootMidi);
};

const buildMode1Queue = (config: Mode1Config): DroneQueueEvent[] => {
	const queue: DroneQueueEvent[] = [];
	const totalChords = config.progression.length * config.loopTimes;
	let chordIndex = 0;

	for (let loopIndex = 0; loopIndex < config.loopTimes; loopIndex += 1) {
		const loopQueue = buildMode1QueueForLoop(
			config,
			loopIndex,
			chordIndex,
			totalChords,
		);
		queue.push(...loopQueue);
		chordIndex += loopQueue.length;
	}
	return queue;
};

const buildMode1QueueForLoop = (
	config: Mode1Config,
	loopIndex: number,
	chordOffset = 0,
	totalChords = config.progression.length,
): DroneQueueEvent[] => {
	const shiftedKey =
		loopIndex === 0 || config.loopKeyShift === 0
			? config.keyCenter
			: theory.transposeKeyCenter(
					config.keyCenter,
					config.loopKeyShift * loopIndex,
				);
	return config.progression.map((chord, index) => ({
		mode: "mode1" as const,
		keyCenter: shiftedKey,
		chordDegree: chord.chordDegree,
		quality: chord.quality,
		chordIndex: chordOffset + index,
		chordCount: totalChords,
		durationMode: chord.durationMode,
		durationValue: chord.durationValue,
	}));
};

const buildMode2Queue = (config: Mode2Config): DroneQueueEvent[] => {
	const queue: DroneQueueEvent[] = [];
	for (let i = 0; i < config.totalQuestions; i += 1) {
		const quality: ChordQuality = theory.pickRandom(config.enabledQualities);
		const chordRoot = theory.pickRandom(RANDOM_ROOTS);
		queue.push({
			mode: "mode2",
			keyCenter: null,
			quality,
			chordRoot,
			chordIndex: i,
			chordCount: config.totalQuestions,
			durationMode: "x",
			durationValue: 1,
		});
	}
	return queue;
};

export const updatePlaybackUI = (): void => {
	dom.elMetronomeControls.classList.toggle(
		"hidden",
		state.playbackMode !== "metronome",
	);
	dom.elMetronomeAdvanceToggle.classList.toggle(
		"hidden",
		state.playbackMode !== "metronome",
	);
	dom.elAmbienceModeToggle.classList.toggle(
		"hidden",
		state.playbackMode !== "ambience",
	);
	if (state.playbackMode === "metronome") {
		stopMetronome();
		audio.stopAmbient();
	}
	if (state.playbackMode !== "ambience") {
		clearAutoAdvanceTimer();
	}
	updateNextChordButton();
};

const startNextLoop = (minRootMidi: number): boolean => {
	if (!state.loopForeverActive || !state.loopBaseConfig) {
		return false;
	}
	state.loopIndex += 1;
	state.questionQueue = buildMode1QueueForLoop(state.loopBaseConfig, state.loopIndex);
	state.questionIndex = 0;
	state.currentBarOffset = 0;
	renderChordSequence(minRootMidi);
	return true;
};

export const updateNextChordButton = (): void => {
	if (!state.isDroneRunning || !state.questionQueue.length) {
		dom.btnNextChord.disabled = true;
		dom.btnNextChord.textContent = "Next chord";
		return;
	}

	const canManuallyAdvanceInMetronome =
		state.playbackMode === "metronome" && state.metronomeAdvanceMode === "manual";
	const canAdvance = state.playbackMode === "ambience" || canManuallyAdvanceInMetronome;

	if (!canAdvance) {
		dom.btnNextChord.disabled = true;
		dom.btnNextChord.textContent = "Next chord";
		return;
	}

	const hasNext =
		state.loopForeverActive || state.questionIndex + 1 < state.questionQueue.length;
	dom.btnNextChord.disabled = false;
	if (state.playbackMode === "ambience") {
		dom.btnNextChord.textContent = hasNext ? "Next chord" : "End live";
	} else {
		dom.btnNextChord.textContent = hasNext ? "Next chord" : "End";
	}
};

export const endLive = (): void => {
	audio.stopAmbient();
	audio.stopRootSustain();
	audio.stopChord();
	clearAutoAdvanceTimer();
	state.loopForeverActive = false;
	state.loopBaseConfig = null;
	setStatus("Live ended.", "ok");
	setDroneRunning(false);
	updateNextChordButton();
};

export const setDroneRunning = (running: boolean): void => {
	state.isDroneRunning = running;
	dom.btnStartDrone.disabled = running;
	dom.btnStopDrone.disabled = !running;
	document
		.querySelectorAll<HTMLInputElement>("input[name='mode']")
		.forEach((input) => {
			input.disabled = running;
		});
	document
		.querySelectorAll<HTMLInputElement>("input[name='playbackMode']")
		.forEach((input) => {
			input.disabled = running;
		});
	document
		.querySelectorAll<HTMLInputElement>("input[name='ambienceMode']")
		.forEach((input) => {
			input.disabled = running;
		});
	document
		.querySelectorAll<HTMLInputElement>("input[name='metronomeAdvanceMode']")
		.forEach((input) => {
			input.disabled = running;
		});
	updateNextChordButton();
};

export const startDrone = (
	config: Mode1Config | Mode2Config,
	mode: ActiveMode,
): void => {
	if (mode === "mode1") {
		const mode1Config = config as Mode1Config;
		state.loopForeverActive = mode1Config.loopForever;
		state.loopIndex = 0;
		state.loopBaseConfig = mode1Config.loopForever ? mode1Config : null;
		state.questionQueue = mode1Config.loopForever
			? buildMode1QueueForLoop(mode1Config, 0)
			: buildMode1Queue(mode1Config);
	} else {
		state.loopForeverActive = false;
		state.loopIndex = 0;
		state.loopBaseConfig = null;
		state.questionQueue = buildMode2Queue(config as Mode2Config);
	}
	state.questionIndex = 0;
	stopMetronome();
	state.roundingWarningShown = false;
	renderChordSequence(config.minRootMidi);
	setDroneRunning(true);
	if (state.playbackMode === "metronome") {
		state.metronomeBeatMs = 60000 / state.metronomeBpm;
		audio.stopAmbient();
		startMetronome(config.minRootMidi);
	} else {
		updateDisplayForIndex(state.questionIndex, config.minRootMidi);
		playIndex(state.questionIndex, config.minRootMidi);
		scheduleAutoAdvance(config.minRootMidi);
	}
	updateNextChordButton();
};

export const nextChord = (minRootMidi: number): void => {
	if (!state.questionQueue.length) {
		return;
	}
	if (state.questionIndex + 1 >= state.questionQueue.length) {
		if (!startNextLoop(minRootMidi)) {
			endLive();
			return;
		}
	} else {
		state.questionIndex += 1;
	}
	updateDisplayForIndex(state.questionIndex, minRootMidi);
	playIndex(state.questionIndex, minRootMidi);
	updateNextChordButton();
	scheduleAutoAdvance(minRootMidi);
};

export const stopDrone = (): void => {
	if (!state.isDroneRunning) {
		return;
	}
	if (state.playbackMode === "metronome") {
		state.stopRequested = true;
		return;
	}
	audio.stopAmbient();
	audio.stopRootSustain();
	audio.stopChord();
	clearAutoAdvanceTimer();
	state.questionQueue = [];
	state.questionIndex = 0;
	state.loopForeverActive = false;
	state.loopBaseConfig = null;
	setDroneRunning(false);
	resetExerciseDisplay();
};

export const readBpm = (): number => {
	const bpm = Number(dom.elBpmInput.value || 80);
	if (!Number.isFinite(bpm) || bpm < 30 || bpm > 300) {
		throw new Error("BPM must be between 30 and 300.");
	}
	state.metronomeBpm = bpm;
	return bpm;
};

export const readBeatsPerBar = (): number => {
	const bpb = Number(dom.elBpbInput.value || 4);
	if (!Number.isFinite(bpb) || bpb < 1 || bpb > 12) {
		throw new Error("Beats per bar must be between 1 and 12.");
	}
	state.metronomeBpb = bpb;
	return bpb;
};
