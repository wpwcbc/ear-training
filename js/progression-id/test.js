import * as audio from "./audio.js";
import { dom } from "./dom.js";
import { addRecord, addRecords, renderRecords } from "./records.js";
import { state, STORAGE_KEYS } from "./state.js";
import { buildProgression } from "./progression.js";
import { CHORD_VOICE_VELOCITIES, CHORD_QUALITIES } from "../core/constants.js";
import * as theory from "../core/theory.js";
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
const ANSWER_QUALITIES = CHORD_QUALITIES.filter((quality) => ["maj7", "m7", "7", "m7b5", "dim7"].includes(quality));
const startTimer = () => {
    state.startPerfMs = performance.now();
    if (state.timerHandle) {
        window.clearInterval(state.timerHandle);
    }
    state.timerHandle = window.setInterval(() => {
        const dt = (performance.now() - state.startPerfMs) / 1000;
        dom.elTimeLabel.textContent = dt.toFixed(2) + "s";
    }, 25);
};
const stopTimer = () => {
    if (state.timerHandle) {
        window.clearInterval(state.timerHandle);
        state.timerHandle = 0;
    }
};
export const setStatus = (message, stateLabel = "") => {
    dom.elStatus.textContent = message;
    if (stateLabel) {
        dom.elStatus.dataset.state = stateLabel;
    }
    else {
        delete dom.elStatus.dataset.state;
    }
};
export const resetLiveDisplay = () => {
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
const populateAnswerSelects = () => {
    dom.elDegreeSelect.innerHTML = "";
    DEGREE_OPTIONS.forEach((degree) => {
        const option = document.createElement("option");
        option.value = degree;
        option.textContent = degree;
        dom.elDegreeSelect.appendChild(option);
    });
    dom.elQualitySelect.innerHTML = "";
    ANSWER_QUALITIES.forEach((quality) => {
        const option = document.createElement("option");
        option.value = quality;
        option.textContent = quality;
        dom.elQualitySelect.appendChild(option);
    });
};
const buildQueue = (config) => {
    const progression = buildProgression(config);
    return progression.map((chord, index) => ({
        index,
        total: progression.length,
        keyCenter: config.keyCenter,
        mode: config.mode,
        chord,
        chordRootMidi: 0,
        chordTonicName: "",
        chordNotes: [],
        chordVelocities: [],
    }));
};
const buildQuestion = (question, config) => {
    let chordRootMidi = theory.computeChordRootMidiFromKey(config.keyCenter, question.chord.degree, 1);
    chordRootMidi = theory.clampRootMidiToMin(chordRootMidi, config.minRootMidi);
    const keyPc = theory.noteNameToPitchClassSemitones(config.keyCenter);
    const offset = theory.parseDegreeToSemitones(question.chord.degree);
    const chordTonicName = theory.pcToNameSharp(keyPc + offset);
    const chordIntervals = theory.buildChordIntervals(question.chord.quality);
    const chordMidis = theory.buildChordVoicing(chordRootMidi, chordIntervals);
    const chordVelocities = chordMidis.map((_, index) => {
        if (index === 0)
            return CHORD_VOICE_VELOCITIES.root;
        if (index === 1)
            return CHORD_VOICE_VELOCITIES.fifth;
        if (index === 2)
            return CHORD_VOICE_VELOCITIES.seventh;
        return CHORD_VOICE_VELOCITIES.third;
    });
    return {
        ...question,
        chordRootMidi,
        chordTonicName,
        chordNotes: chordMidis.map(theory.midiToNoteNameSharp),
        chordVelocities,
    };
};
const renderQuestion = (question) => {
    const total = state.questionQueue.length;
    const position = state.questionIndex + 1;
    dom.elKeyLabel.textContent = question.keyCenter;
    dom.elChordLabel.textContent = `${question.chord.degree} ${question.chord.quality}`;
    dom.elTonicLabel.textContent = question.chordTonicName;
    dom.elQuestionLabel.textContent = `${position} / ${total}`;
    state.attempts = 0;
    dom.elAttemptsLabel.textContent = "0";
    setStatus("Select degree and quality.");
    dom.elDegreeSelect.value = DEGREE_OPTIONS[0];
    dom.elQualitySelect.value = ANSWER_QUALITIES[0];
};
const handleAnswer = () => {
    if (!state.currentQuestion) {
        return;
    }
    const selectedDegree = dom.elDegreeSelect.value;
    const selectedQuality = dom.elQualitySelect.value;
    state.attempts += 1;
    dom.elAttemptsLabel.textContent = String(state.attempts);
    if (selectedDegree === state.currentQuestion.chord.degree &&
        selectedQuality === state.currentQuestion.chord.quality) {
        const elapsedSeconds = (performance.now() - state.startPerfMs) / 1000;
        state.currentQuestionRecords.push({
            keyCenter: state.currentQuestion.keyCenter,
            chordDegree: state.currentQuestion.chord.degree,
            chordQuality: state.currentQuestion.chord.quality,
            timeSeconds: Number(elapsedSeconds.toFixed(3)),
            attempts: state.attempts,
        });
        stopTimer();
        setStatus("Correct. Moving to the next chord...", "ok");
        dom.btnReplay.disabled = true;
        dom.btnSubmitAnswer.disabled = true;
        window.setTimeout(() => {
            state.questionIndex += 1;
            loadQuestion();
        }, 600);
    }
    else {
        setStatus("Not yet. Try again.", "warn");
    }
};
const finishTest = () => {
    stopTimer();
    state.currentQuestion = null;
    dom.btnReplay.disabled = true;
    dom.btnSubmitAnswer.disabled = false;
    const questionCount = state.currentQuestionRecords.length || 1;
    const avgTime = state.currentQuestionRecords.reduce((sum, rec) => sum + rec.timeSeconds, 0) /
        questionCount;
    const avgAttempts = state.currentQuestionRecords.reduce((sum, rec) => sum + rec.attempts, 0) /
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
    dom.elCompletionSummary.textContent = `Avg time: ${avgTime.toFixed(3)}s · Avg attempts: ${avgAttempts.toFixed(2)}`;
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
const loadQuestion = () => {
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
    audio.schedulePlayback(state.currentQuestion);
};
export const startTest = (config) => {
    state.lastConfig = config;
    state.questionQueue = buildQueue(config);
    state.questionIndex = 0;
    dom.elCompletionPanel.classList.add("hidden");
    dom.elRerunControls.innerHTML = "";
    loadQuestion();
};
export const stopTest = () => {
    stopTimer();
    state.questionQueue = [];
    state.questionIndex = 0;
    state.currentQuestion = null;
    resetLiveDisplay();
};
export const replayCurrent = () => {
    if (!state.currentQuestion) {
        return;
    }
    audio.schedulePlayback(state.currentQuestion);
};
export const initAnswers = () => {
    populateAnswerSelects();
    dom.btnSubmitAnswer.addEventListener("click", handleAnswer);
};
