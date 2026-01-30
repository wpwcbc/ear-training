import * as audio from "./audio.js";
import { dom } from "./dom.js";
import { QUALITY_OPTIONS, getQualityOption, getVoicingOption } from "./options.js";
import { addRecord, addRecords, renderRecords } from "./records.js";
import { state, STORAGE_KEYS, DEFAULT_TEST_NAME } from "./state.js";
import * as theory from "../core/theory.js";
import { RANDOM_ROOTS } from "../core/constants.js";
const TONE_LABELS = [
    "root",
    "third",
    "fifth",
    "seventh",
];
const buildVoicing = (rootMidi, intervals, voicingId) => {
    const voicing = getVoicingOption(voicingId);
    if (!voicing) {
        return {
            midis: intervals.map((interval) => rootMidi + interval),
            tones: TONE_LABELS,
        };
    }
    const midis = voicing.order.map((toneIndex, index) => rootMidi + intervals[toneIndex] + voicing.octaves[index]);
    const tones = voicing.order.map((toneIndex) => TONE_LABELS[toneIndex] || "root");
    return { midis, tones };
};
const buildQueue = (config) => {
    const queue = [];
    for (let i = 0; i < config.totalQuestions; i += 1) {
        const quality = theory.pickRandom(config.enabledQualities);
        const voicing = theory.pickRandom(config.enabledVoicings);
        queue.push({
            index: i,
            total: config.totalQuestions,
            quality,
            voicing,
            playbackMode: config.playbackMode,
            chordRootMidi: 0,
            chordTonicName: "",
            chordNotes: [],
            chordVelocities: [],
        });
    }
    return queue;
};
const buildQuestion = (question, config) => {
    const chordRootName = theory.pickRandom(RANDOM_ROOTS);
    let chordRootMidi = theory.computeChordRootMidiFromNote(chordRootName, 1);
    chordRootMidi = theory.clampRootMidiToMin(chordRootMidi, config.minRootMidi);
    const chordTonicName = chordRootName.replace("b", "b");
    const qualityOption = getQualityOption(question.quality);
    const intervals = qualityOption?.intervals ?? [0, 4, 7, 11];
    const { midis, tones } = buildVoicing(chordRootMidi, intervals, question.voicing);
    const chordVelocities = tones.map((tone) => audio.getVelocityForTone(tone));
    return {
        ...question,
        chordRootMidi,
        chordTonicName,
        chordNotes: midis.map(theory.midiToNoteNameSharp),
        chordVelocities,
    };
};
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
    dom.elQuestionLabel.textContent = "-";
    dom.elTimeLabel.textContent = "0.00s";
    dom.elAttemptsLabel.textContent = "0";
    dom.elAnswers.innerHTML = "";
    setStatus("Configure a test and press Start.");
    dom.btnReplay.disabled = true;
    dom.elCompletionPanel.classList.add("hidden");
    dom.elRerunControls.innerHTML = "";
};
const renderQuestion = (question) => {
    dom.elQuestionLabel.textContent = `${question.index + 1} / ${question.total}`;
    state.attempts = 0;
    dom.elAttemptsLabel.textContent = "0";
    dom.elAnswers.innerHTML = "";
    setStatus("Listen to the chord. Identify the quality.");
    QUALITY_OPTIONS.forEach((option) => {
        if (!state.enabledQualities.includes(option.id)) {
            return;
        }
        const button = document.createElement("button");
        button.textContent = option.label;
        button.addEventListener("click", () => handleAnswer(option.id));
        dom.elAnswers.appendChild(button);
    });
};
const handleAnswer = (selectedQuality) => {
    if (!state.currentQuestion) {
        return;
    }
    state.attempts += 1;
    dom.elAttemptsLabel.textContent = String(state.attempts);
    if (selectedQuality === state.currentQuestion.quality) {
        const elapsedSeconds = (performance.now() - state.startPerfMs) / 1000;
        state.currentQuestionRecords.push({
            chordQuality: state.currentQuestion.quality,
            chordVoicing: state.currentQuestion.voicing,
            timeSeconds: Number(elapsedSeconds.toFixed(3)),
            attempts: state.attempts,
            playbackMode: state.currentQuestion.playbackMode,
        });
        stopTimer();
        setStatus("Correct. Moving to the next question...", "ok");
        dom.btnReplay.disabled = true;
        Array.from(dom.elAnswers.querySelectorAll("button")).forEach((btn) => {
            btn.disabled = true;
        });
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
    dom.elAnswers.innerHTML = "";
    const questionCount = state.currentQuestionRecords.length || 1;
    const avgTime = state.currentQuestionRecords.reduce((sum, rec) => sum + rec.timeSeconds, 0) /
        questionCount;
    const avgAttempts = state.currentQuestionRecords.reduce((sum, rec) => sum + rec.attempts, 0) /
        questionCount;
    const modeLabel = state.lastConfig?.playbackMode === "arpeggiated"
        ? "One by one"
        : "Stacked chord";
    addRecord(STORAGE_KEYS.testHistory, {
        progressionName: `${DEFAULT_TEST_NAME} — ${modeLabel}`,
        avgTimeSeconds: Number(avgTime.toFixed(3)),
        avgAttempts: Number(avgAttempts.toFixed(2)),
        datetime: new Date().toISOString(),
    });
    addRecords(STORAGE_KEYS.questionHistory, state.currentQuestionRecords);
    state.currentQuestionRecords = [];
    setStatus("Test complete. Run again when ready.", "ok");
    dom.elCompletionPanel.classList.remove("hidden");
    dom.elCompletionSummary.textContent = `Avg time: ${avgTime.toFixed(3)}s · Avg attempts: ${avgAttempts.toFixed(2)}`;
    dom.elRerunControls.innerHTML = "";
    const btnAgain = document.createElement("button");
    btnAgain.textContent = "Run again";
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
    const base = state.questionQueue[state.questionIndex];
    if (!state.lastConfig) {
        return;
    }
    state.currentQuestion = buildQuestion(base, state.lastConfig);
    renderQuestion(state.currentQuestion);
    startTimer();
    dom.btnReplay.disabled = false;
    audio.schedulePlayback(state.currentQuestion);
};
export const startTest = (config) => {
    state.lastConfig = config;
    state.enabledQualities = config.enabledQualities;
    state.enabledVoicings = config.enabledVoicings;
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
export const setTestRunning = (isRunning) => {
    state.isTestRunning = isRunning;
    dom.btnStartTest.disabled = isRunning;
};
