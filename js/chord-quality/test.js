import * as audio from "./audio.js";
import { dom } from "./dom.js";
import { FIVE_NOTE_QUALITIES, QUALITY_OPTIONS, getQualityOption, getVoicingOption, } from "./options.js";
import { addRecord, addRecords, renderRecords } from "./records.js";
import { state, STORAGE_KEYS, DEFAULT_TEST_NAME } from "./state.js";
import * as theory from "../core/theory.js";
import { RANDOM_ROOTS } from "../core/constants.js";
const BASE_TONE_LABELS = ["root", "third", "fifth", "seventh"];
const EXTENDED_TONE_LABELS = [
    "root",
    "third",
    "fifth",
    "seventh",
    "tension",
];
const applyInversion = (intervals, labels, inversion) => {
    const count = intervals.length;
    if (!count) {
        return { intervals, labels };
    }
    const shift = ((inversion % count) + count) % count;
    if (!shift) {
        return { intervals, labels };
    }
    const headIntervals = intervals
        .slice(0, shift)
        .map((interval) => interval + 12);
    const headLabels = labels.slice(0, shift);
    return {
        intervals: [...intervals.slice(shift), ...headIntervals],
        labels: [...labels.slice(shift), ...headLabels],
    };
};
const buildVoicing = (rootMidi, intervals, voicingId, inversion) => {
    const voicing = getVoicingOption(voicingId);
    const isFiveTone = intervals.length === 5;
    const baseLabels = (isFiveTone ? [...EXTENDED_TONE_LABELS] : [...BASE_TONE_LABELS]);
    const { intervals: invertedIntervals, labels: invertedLabels } = applyInversion(intervals, baseLabels.slice(0, intervals.length), inversion);
    if (!voicing || voicingId === "closed") {
        return {
            midis: invertedIntervals.map((interval) => rootMidi + interval),
            tones: invertedLabels,
        };
    }
    if (isFiveTone) {
        const rootIndex = invertedLabels.indexOf("root");
        const rootInterval = rootIndex >= 0 ? invertedIntervals[rootIndex] : invertedIntervals[0];
        const rootMidiNote = rootMidi + rootInterval;
        const upperIntervals = invertedIntervals.filter((_, index) => index !== rootIndex);
        const upperLabels = invertedLabels.filter((_, index) => index !== rootIndex);
        const midis = [
            rootMidiNote,
            ...voicing.order.map((toneIndex, index) => rootMidi +
                upperIntervals[toneIndex] +
                voicing.octaves[index]),
        ];
        const tones = [
            "root",
            ...voicing.order.map((toneIndex) => upperLabels[toneIndex]),
        ];
        return { midis, tones };
    }
    const midis = voicing.order.map((toneIndex, index) => rootMidi + invertedIntervals[toneIndex] + voicing.octaves[index]);
    const tones = voicing.order.map((toneIndex) => invertedLabels[toneIndex] || "root");
    return { midis, tones };
};
const buildQueue = (config) => {
    const queue = [];
    for (let i = 0; i < config.totalQuestions; i += 1) {
        const quality = theory.pickRandom(config.enabledQualities);
        const voicing = theory.pickRandom(config.enabledVoicings);
        const inversion = theory.pickRandom(config.enabledInversions);
        queue.push({
            index: i,
            total: config.totalQuestions,
            quality,
            voicing,
            inversion,
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
    const intervalSets = qualityOption?.intervalSets ?? [[0, 4, 7, 11]];
    const intervals = theory.pickRandom(intervalSets);
    const effectiveInversion = intervals.length === 5 && FIVE_NOTE_QUALITIES.includes(question.quality)
        ? 0
        : question.inversion;
    const { midis, tones } = buildVoicing(chordRootMidi, intervals, question.voicing, effectiveInversion);
    const chordVelocities = tones.map((tone) => audio.getVelocityForTone(tone));
    return {
        ...question,
        inversion: effectiveInversion,
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
    dom.elCompletionStats.innerHTML = "";
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
            chordInversion: state.currentQuestion.inversion,
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
    const avgTime = state.currentQuestionRecords.reduce((sum, rec) => sum + rec.timeSeconds, 0) / questionCount;
    const avgAttempts = state.currentQuestionRecords.reduce((sum, rec) => sum + rec.attempts, 0) / questionCount;
    const modeLabel = state.lastConfig?.playbackMode === "arpeggiated"
        ? "Arpeggiated"
        : "Stacked";
    addRecord(STORAGE_KEYS.testHistory, {
        progressionName: `${DEFAULT_TEST_NAME} — ${modeLabel}`,
        avgTimeSeconds: Number(avgTime.toFixed(3)),
        avgAttempts: Number(avgAttempts.toFixed(2)),
        datetime: new Date().toISOString(),
    });
    addRecords(STORAGE_KEYS.questionHistory, state.currentQuestionRecords);
    renderRecords();
    state.currentQuestionRecords = [];
    setStatus("Test complete. Run again when ready.", "ok");
    dom.elCompletionPanel.classList.remove("hidden");
    dom.elCompletionStats.innerHTML = "";
    const completionItems = [
        { label: "Playback", value: modeLabel },
        { label: "Avg time", value: `${avgTime.toFixed(3)}s` },
        { label: "Avg attempts", value: avgAttempts.toFixed(2) },
    ];
    completionItems.forEach((item) => {
        const card = document.createElement("div");
        card.className = "completion-stat";
        const label = document.createElement("div");
        label.className = "label";
        label.textContent = item.label;
        const value = document.createElement("div");
        value.className = "value";
        value.textContent = item.value;
        card.append(label, value);
        dom.elCompletionStats.appendChild(card);
    });
    dom.elCompletionSummary.textContent =
        "Run again when you are ready for another set.";
    dom.elRerunControls.innerHTML = "";
    const btnAgain = document.createElement("button");
    btnAgain.textContent = "Run again";
    btnAgain.addEventListener("click", () => {
        if (state.lastConfig) {
            startTest(state.lastConfig);
        }
    });
    dom.elRerunControls.append(btnAgain);
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
    state.enabledInversions = config.enabledInversions;
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
