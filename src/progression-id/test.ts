import * as audio from "./audio.js";
import { dom } from "./dom.js";
import { addRecord, addRecords, renderRecords } from "./records.js";
import { state, STORAGE_KEYS } from "./state.js";
import { buildProgression } from "./progression.js";
import type { Config, Question } from "./types.js";
import { CHORD_VOICE_VELOCITIES } from "../core/constants.js";
import * as theory from "../core/theory.js";
import type { ChordQuality } from "../core/constants.js";

const DEGREE_OPTIONS = [
	"1",
	"2",
	"3",
	"4",
	"5",
	"6",
	"7",
	"b2",
	"b3",
	"#4",
	"b5",
	"b6",
	"b7",
];

const ANSWER_QUALITIES = [
	"maj7",
	"m7",
	"7",
	"7b9",
	"m7b5",
	"dim7",
] as ChordQuality[];

const startTimer = (): void => {
	state.startPerfMs = performance.now();
	if (state.timerHandle) {
		window.clearInterval(state.timerHandle);
	}
	state.timerHandle = window.setInterval(() => {
		const dt = (performance.now() - state.startPerfMs) / 1000;
		dom.elTimeLabel.textContent = dt.toFixed(2) + "s";
	}, 25);
};

const stopTimer = (): void => {
	if (state.timerHandle) {
		window.clearInterval(state.timerHandle);
		state.timerHandle = 0;
	}
};

export const setStatus = (message: string, stateLabel = ""): void => {
	dom.elStatus.textContent = message;
	if (stateLabel) {
		dom.elStatus.dataset.state = stateLabel;
	} else {
		delete dom.elStatus.dataset.state;
	}
};

export const resetLiveDisplay = (): void => {
	dom.elKeyLabel.textContent = "-";
	dom.elChordLabel.textContent = "-";
	dom.elTonicLabel.textContent = "-";
	dom.elQuestionLabel.textContent = "-";
	dom.elTimeLabel.textContent = "0.00s";
	dom.elAttemptsLabel.textContent = "0";
	setStatus("Configure a test and press Start.");
	dom.btnReplay.disabled = true;
	dom.btnSubmitAnswer.disabled = true;
	dom.elCompletionPanel.classList.add("hidden");
	dom.elRerunControls.innerHTML = "";
};

const populateAnswerSelects = (): void => {
	const fillDegree = (select: HTMLSelectElement): void => {
		select.innerHTML = "";
		DEGREE_OPTIONS.forEach((degree) => {
			const option = document.createElement("option");
			option.value = degree;
			option.textContent = degree;
			select.appendChild(option);
		});
	};

	const fillQuality = (select: HTMLSelectElement): void => {
		select.innerHTML = "";
		ANSWER_QUALITIES.forEach((quality) => {
			const option = document.createElement("option");
			option.value = quality;
			option.textContent =
				quality === "m7b5" ? "m7b5 (ø)" : quality === "7b9" ? "7♭9" : quality;
			select.appendChild(option);
		});
	};

	fillDegree(dom.elDegreeSelectA);
	fillDegree(dom.elDegreeSelectB);
	fillQuality(dom.elQualitySelectA);
	fillQuality(dom.elQualitySelectB);
};

const buildQueue = (config: Config): Question[] => {
	const progression = buildProgression(config);
	return [
		{
			index: 0,
			total: 1,
			keyCenter: config.keyCenter,
			mode: config.mode,
			progression,
			chordTonicNames: [],
			chordNotes: [],
			chordVelocities: [],
		},
	];
};

const buildQuestion = (question: Question, config: Config): Question => {
	const chordTonicNames: string[] = [];
	const chordNotes: string[][] = [];
	const chordVelocities: number[][] = [];
	const keyPc = theory.noteNameToPitchClassSemitones(config.keyCenter);

	question.progression.forEach((chord) => {
		let chordRootMidi = theory.computeChordRootMidiFromKey(
			config.keyCenter,
			chord.degree,
			1,
		);
		chordRootMidi = theory.clampRootMidiToMin(
			chordRootMidi,
			config.minRootMidi,
		);
		const offset = theory.parseDegreeToSemitones(chord.degree);
		const chordTonicName = theory.pcToNameSharp(keyPc + offset);
		const chordIntervals = theory.buildChordIntervals(chord.quality);
		const chordMidis = theory.buildChordVoicing(chordRootMidi, chordIntervals);
		const velocities = chordMidis.map((_, index) => {
			if (index === 0) return CHORD_VOICE_VELOCITIES.root;
			if (index === 1) return CHORD_VOICE_VELOCITIES.fifth;
			if (index === 2) return CHORD_VOICE_VELOCITIES.seventh;
			if (index === 3) return CHORD_VOICE_VELOCITIES.third;
			return 0.5;
		});

		chordTonicNames.push(chordTonicName);
		chordNotes.push(chordMidis.map(theory.midiToNoteNameSharp));
		chordVelocities.push(velocities);
	});

	return {
		...question,
		chordTonicNames,
		chordNotes,
		chordVelocities,
	};
};

const formatProgressionLabel = (progression: Question["progression"]): string => {
	if (!progression.length) {
		return "-";
	}
	const first = progression[0];
	const last = progression[progression.length - 1];
	return `${first.degree} ${first.quality} → ? → ? → ${last.degree} ${last.quality}`;
};

const renderQuestion = (question: Question): void => {
	const total = state.questionQueue.length;
	const position = state.questionIndex + 1;
	dom.elKeyLabel.textContent = question.keyCenter;
	dom.elChordLabel.textContent = formatProgressionLabel(question.progression);
	dom.elTonicLabel.textContent = question.chordTonicNames[0] || "-";
	dom.elQuestionLabel.textContent = `${position} / ${total}`;
	state.attempts = 0;
	dom.elAttemptsLabel.textContent = "0";
	setStatus("Select degree and quality for the two middle chords.");
	dom.elDegreeSelectA.value = DEGREE_OPTIONS[0];
	dom.elQualitySelectA.value = ANSWER_QUALITIES[0];
	dom.elDegreeSelectB.value = DEGREE_OPTIONS[0];
	dom.elQualitySelectB.value = ANSWER_QUALITIES[0];
};

const handleAnswer = (): void => {
	if (!state.currentQuestion) {
		return;
	}
	const selectedDegreeA = dom.elDegreeSelectA.value;
	const selectedQualityA = dom.elQualitySelectA.value;
	const selectedDegreeB = dom.elDegreeSelectB.value;
	const selectedQualityB = dom.elQualitySelectB.value;
	state.attempts += 1;
	dom.elAttemptsLabel.textContent = String(state.attempts);

	const targetA = state.currentQuestion.progression[1];
	const targetB = state.currentQuestion.progression[2];

	if (
		targetA &&
		targetB &&
		selectedDegreeA === targetA.degree &&
		selectedQualityA === targetA.quality &&
		selectedDegreeB === targetB.degree &&
		selectedQualityB === targetB.quality
	) {
		const elapsedSeconds =
			(performance.now() - state.startPerfMs) / 1000;
		const baseRecord = {
			keyCenter: state.currentQuestion.keyCenter,
			timeSeconds: Number(elapsedSeconds.toFixed(3)),
			attempts: state.attempts,
		};
		state.currentQuestionRecords.push(
			{
				...baseRecord,
				chordDegree: targetA.degree,
				chordQuality: targetA.quality,
			},
			{
				...baseRecord,
				chordDegree: targetB.degree,
				chordQuality: targetB.quality,
			},
		);

		stopTimer();
		setStatus("Correct. Great work!", "ok");
		dom.btnReplay.disabled = true;
		dom.btnSubmitAnswer.disabled = true;
		window.setTimeout(() => {
			state.questionIndex += 1;
			loadQuestion();
		}, 600);
	} else {
		setStatus("Not yet. Try again.", "warn");
	}
};

const finishTest = (): void => {
	stopTimer();
	state.currentQuestion = null;
	dom.btnReplay.disabled = true;
	dom.btnSubmitAnswer.disabled = false;

	const questionCount = state.currentQuestionRecords.length || 1;
	const avgTime =
		state.currentQuestionRecords.reduce((sum, rec) => sum + rec.timeSeconds, 0) /
		questionCount;
	const avgAttempts =
		state.currentQuestionRecords.reduce((sum, rec) => sum + rec.attempts, 0) /
		questionCount;

	addRecord(STORAGE_KEYS.testHistory, {
		progressionName: `${state.lastConfig?.mode === "minor" ? "Minor" : "Major"} progression`,
		avgTimeSeconds: Number(avgTime.toFixed(3)),
		avgAttempts: Number(avgAttempts.toFixed(2)),
		datetime: new Date().toISOString(),
	});
	addRecords(STORAGE_KEYS.questionHistory, state.currentQuestionRecords);

	state.currentQuestionRecords = [];
	setStatus("Test complete. Run another progression when ready.", "ok");
	dom.elCompletionPanel.classList.remove("hidden");
	dom.elCompletionSummary.textContent = `Avg time: ${avgTime.toFixed(
		3,
	)}s · Avg attempts: ${avgAttempts.toFixed(2)}`;
	dom.elRerunControls.innerHTML = "";

	const btnAgain = document.createElement("button");
	btnAgain.textContent = "Run another progression";
	btnAgain.addEventListener("click", () => {
		if (state.lastConfig) {
			startTest(state.lastConfig);
		}
	});
	dom.elRerunControls.append(btnAgain);
	renderRecords();
};

const loadQuestion = (): void => {
	if (state.questionIndex >= state.questionQueue.length) {
		finishTest();
		return;
	}
	if (!state.lastConfig) {
		return;
	}
	const base = state.questionQueue[state.questionIndex];
	state.currentQuestion = buildQuestion(base, state.lastConfig);
	renderQuestion(state.currentQuestion);
	startTimer();
	dom.btnReplay.disabled = false;
	dom.btnSubmitAnswer.disabled = false;
	const playbackChords = state.currentQuestion.chordNotes.map(
		(notes, index) => ({
			chordNotes: notes,
			chordVelocities: state.currentQuestion?.chordVelocities[index] ?? [],
		}),
	);
	audio.schedulePlayback(playbackChords);
};

export const startTest = (config: Config): void => {
	state.lastConfig = config;
	state.questionQueue = buildQueue(config);
	state.questionIndex = 0;
	dom.elCompletionPanel.classList.add("hidden");
	dom.elRerunControls.innerHTML = "";
	loadQuestion();
};

export const stopTest = (): void => {
	stopTimer();
	state.questionQueue = [];
	state.questionIndex = 0;
	state.currentQuestion = null;
	resetLiveDisplay();
};

export const replayCurrent = (): void => {
	if (!state.currentQuestion) {
		return;
	}
	const playbackChords = state.currentQuestion.chordNotes.map(
		(notes, index) => ({
			chordNotes: notes,
			chordVelocities: state.currentQuestion?.chordVelocities[index] ?? [],
		}),
	);
	audio.schedulePlayback(playbackChords);
};

export const initAnswers = (): void => {
	populateAnswerSelects();
	dom.btnSubmitAnswer.addEventListener("click", handleAnswer);
};
