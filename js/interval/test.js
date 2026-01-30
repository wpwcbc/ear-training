import { MIN_CHORD_ROOT_MIDI, RANDOM_ROOTS, } from "../core/constants.js";
import * as theory from "../core/theory.js";
import * as audio from "./audio.js";
import { dom } from "./dom.js";
import { state, CUSTOM_PROGRESSION_NAME, STORAGE_KEYS } from "./state.js";
import { collectVelocitySettings } from "./velocity.js";
import { addRecord, addRecords, renderRecords } from "./records.js";
let currentTestName = CUSTOM_PROGRESSION_NAME;
const INTERVAL_LABELS = [
    { semis: 0, label: "P1" },
    { semis: 1, label: "m2" },
    { semis: 2, label: "M2" },
    { semis: 3, label: "m3" },
    { semis: 4, label: "M3" },
    { semis: 5, label: "P4" },
    { semis: 6, label: "TT" },
    { semis: 7, label: "P5" },
    { semis: 8, label: "m6" },
    { semis: 9, label: "M6" },
    { semis: 10, label: "m7" },
    { semis: 11, label: "M7" },
    { semis: 12, label: "P8" },
];
const intervalLabelMap = new Map(INTERVAL_LABELS.map((item) => [item.semis, item.label]));
export const startTimer = () => {
    state.startPerfMs = performance.now();
    if (state.timerHandle) {
        window.clearInterval(state.timerHandle);
    }
    state.timerHandle = window.setInterval(() => {
        const dt = (performance.now() - state.startPerfMs) / 1000;
        dom.elTimeLabel.textContent = dt.toFixed(2) + "s";
    }, 25);
};
export const stopTimer = () => {
    if (state.timerHandle) {
        window.clearInterval(state.timerHandle);
        state.timerHandle = 0;
    }
};
export const setStatus = (message, stateClass = "") => {
    dom.elStatus.textContent = message;
    if (stateClass) {
        dom.elStatus.dataset.state = stateClass;
    }
    else {
        delete dom.elStatus.dataset.state;
    }
};
export const setTestRunning = (running) => {
    state.isTestRunning = running;
    dom.btnStartTest.disabled = running;
    dom.btnStopTest.disabled = !running;
};
const buildMode1Queue = (config) => {
    const queue = [];
    for (let loopIndex = 0; loopIndex < config.loopTimes; loopIndex += 1) {
        const shiftedKey = loopIndex === 0 || config.loopKeyShift === 0
            ? config.keyCenter
            : theory.transposeKeyCenter(config.keyCenter, config.loopKeyShift * loopIndex);
        config.progression.forEach((chord, chordIndex) => {
            for (let i = 0; i < chord.questions; i += 1) {
                queue.push({
                    mode: "mode1",
                    keyCenter: shiftedKey,
                    minRootMidi: config.minRootMidi,
                    chordIndex,
                    chordCount: config.progression.length,
                    questionInChord: i + 1,
                    questionsPerChord: chord.questions,
                    chordDegree: chord.chordDegree,
                    quality: chord.quality,
                    allowedUpperDegrees: chord.allowedUpperDegrees,
                    playChord: i === 0,
                    intervalMode: config.intervalMode,
                });
            }
        });
    }
    return queue;
};
const buildMode2Queue = (config) => {
    const queue = [];
    for (let i = 0; i < config.totalQuestions; i += 1) {
        const quality = theory.pickRandom(config.enabledQualities);
        const chordRoot = theory.pickRandom(RANDOM_ROOTS);
        queue.push({
            mode: "mode2",
            keyCenter: null,
            minRootMidi: config.minRootMidi,
            chordIndex: i,
            chordCount: config.totalQuestions,
            questionInChord: 1,
            questionsPerChord: 1,
            chordRoot,
            quality,
            allowedUpperDegrees: config.allowedByQuality[quality],
            playChord: true,
            intervalMode: config.intervalMode,
        });
    }
    return queue;
};
const buildQuestion = (event) => {
    let chordRootMidi = 0;
    let chordTonicName = "";
    const minRootMidi = typeof event.minRootMidi === "number"
        ? event.minRootMidi
        : MIN_CHORD_ROOT_MIDI;
    if (event.mode === "mode1") {
        chordRootMidi = theory.computeChordRootMidiFromKey(event.keyCenter, event.chordDegree, 1);
        chordRootMidi = theory.clampRootMidiToMin(chordRootMidi, minRootMidi);
        const keyPc = theory.noteNameToPitchClassSemitones(event.keyCenter);
        const offset = theory.parseDegreeToSemitones(event.chordDegree);
        chordTonicName = theory.pcToNameSharp(keyPc + offset);
    }
    else {
        chordRootMidi = theory.computeChordRootMidiFromNote(event.chordRoot, 1);
        chordRootMidi = theory.clampRootMidiToMin(chordRootMidi, minRootMidi);
        chordTonicName = event.chordRoot;
    }
    const chordIntervals = theory.buildChordIntervals(event.quality);
    const chordMidis = theory.buildChordVoicing(chordRootMidi, chordIntervals);
    const velocitySettings = collectVelocitySettings();
    const chordVelocities = [
        velocitySettings.root,
        velocitySettings.fifth,
        velocitySettings.seventh,
        velocitySettings.third,
    ];
    const leadVelocity = velocitySettings.lead;
    const topChordMidi = Math.max(...chordMidis);
    let firstDegree = theory.pickRandom(event.allowedUpperDegrees);
    let secondDegree = theory.pickRandom(event.allowedUpperDegrees);
    let guard = 0;
    while (secondDegree === firstDegree && guard < 10) {
        secondDegree = theory.pickRandom(event.allowedUpperDegrees);
        guard += 1;
    }
    const firstMidi = theory.chooseUpperMidi(chordRootMidi, firstDegree, topChordMidi);
    const secondMidi = theory.chooseUpperMidi(chordRootMidi, secondDegree, topChordMidi);
    const lowMidi = Math.min(firstMidi, secondMidi);
    const highMidi = Math.max(firstMidi, secondMidi);
    const rawInterval = highMidi - lowMidi;
    const normalized = rawInterval % 12 === 0 ? 12 : rawInterval % 12;
    const intervalLabel = intervalLabelMap.get(normalized) ?? `${normalized} st`;
    const intervalMode = event.intervalMode === "melodic" ? "melodic" : "harmonic";
    const melodicDirection = intervalMode === "melodic" && Math.random() > 0.5 ? "down" : "up";
    return {
        ...event,
        chordRootMidi,
        chordTonicName,
        chordVelocities,
        leadVelocity,
        chordNotes: chordMidis.map(theory.midiToNoteNameSharp),
        intervalNotes: [
            theory.midiToNoteNameSharp(lowMidi),
            theory.midiToNoteNameSharp(highMidi),
        ],
        intervalLabel,
        intervalMode,
        melodicDirection,
        intervalSemis: normalized,
    };
};
export const resetLiveDisplay = () => {
    dom.elKeyLabel.textContent = "-";
    dom.elChordLabel.textContent = "-";
    dom.elTonicLabel.textContent = "-";
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
    const total = state.questionQueue.length;
    const position = state.questionIndex + 1;
    const keyLabel = question.mode === "mode1" ? question.keyCenter : "Random";
    dom.elKeyLabel.textContent = keyLabel;
    if (question.mode === "mode1") {
        dom.elChordLabel.textContent =
            question.chordDegree + " " + question.quality;
    }
    else {
        dom.elChordLabel.textContent =
            question.chordTonicName + " " + question.quality;
    }
    dom.elTonicLabel.textContent = question.chordTonicName;
    dom.elQuestionLabel.textContent =
        position +
            " / " +
            total +
            (question.mode === "mode1"
                ? ` (Chord ${question.chordIndex + 1}/${question.chordCount}, Q ${question.questionInChord}/${question.questionsPerChord})`
                : "");
    state.attempts = 0;
    dom.elAttemptsLabel.textContent = "0";
    dom.elAnswers.innerHTML = "";
    const modeLabel = question.intervalMode === "harmonic" ? "two notes together" : "two notes in sequence";
    setStatus(question.playChord
        ? `Listen to the chord, then ${modeLabel}. Identify the interval.`
        : `New interval (same chord). Identify the interval.`);
    INTERVAL_LABELS.forEach((interval) => {
        const button = document.createElement("button");
        button.textContent = interval.label;
        button.addEventListener("click", () => handleAnswer(interval.label));
        dom.elAnswers.appendChild(button);
    });
};
const handleAnswer = (selectedInterval) => {
    if (!state.currentQuestion) {
        return;
    }
    state.attempts += 1;
    dom.elAttemptsLabel.textContent = String(state.attempts);
    if (selectedInterval === state.currentQuestion.intervalLabel) {
        const elapsedSeconds = (performance.now() - state.startPerfMs) / 1000;
        const chordDegree = state.currentQuestion.mode === "mode1"
            ? state.currentQuestion.chordDegree
            : "/";
        const keyCenter = state.currentQuestion.mode === "mode1"
            ? state.currentQuestion.keyCenter
            : "/";
        state.currentQuestionRecords.push({
            chordDegree,
            chordQuality: state.currentQuestion.quality,
            intervalLabel: state.currentQuestion.intervalLabel,
            timeSeconds: Number(elapsedSeconds.toFixed(3)),
            attempts: state.attempts,
            keyCenter,
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
const loadQuestion = () => {
    if (state.questionIndex >= state.questionQueue.length) {
        finishTest();
        return;
    }
    state.currentQuestion = buildQuestion(state.questionQueue[state.questionIndex]);
    renderQuestion(state.currentQuestion);
    startTimer();
    dom.btnReplay.disabled = false;
    audio.schedulePlayback(state.currentQuestion);
};
const finishTest = () => {
    stopTimer();
    state.currentQuestion = null;
    dom.btnReplay.disabled = true;
    dom.elAnswers.innerHTML = "";
    setStatus("Test complete. Choose a rerun option.", "ok");
    setTestRunning(false);
    dom.elCompletionPanel.classList.remove("hidden");
    const questionCount = state.currentQuestionRecords.length || 1;
    const avgTime = state.currentQuestionRecords.reduce((sum, rec) => sum + rec.timeSeconds, 0) / questionCount;
    const avgAttempts = state.currentQuestionRecords.reduce((sum, rec) => sum + rec.attempts, 0) /
        questionCount;
    const testRecord = {
        progressionName: currentTestName,
        avgTimeSeconds: Number(avgTime.toFixed(3)),
        avgAttempts: Number(avgAttempts.toFixed(2)),
        datetime: new Date().toISOString(),
    };
    addRecords(STORAGE_KEYS.questionHistory, state.currentQuestionRecords);
    addRecord(STORAGE_KEYS.testHistory, testRecord);
    renderRecords();
    dom.elCompletionStats.innerHTML = "";
    const statItems = [
        { label: "Progression", value: testRecord.progressionName },
        { label: "Avg time", value: `${testRecord.avgTimeSeconds}s` },
        { label: "Avg attempts", value: String(testRecord.avgAttempts) },
    ];
    statItems.forEach((item) => {
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
    if (state.activeMode === "mode1" && state.lastMode1Config) {
        dom.elCompletionSummary.textContent =
            "Run the same progression again, or shift the key center.";
        dom.elRerunControls.innerHTML = "";
        const btnSame = document.createElement("button");
        btnSame.textContent = "Run again (same key)";
        btnSame.addEventListener("click", () => rerunMode1(0));
        const btnP4 = document.createElement("button");
        btnP4.textContent = "Raise key by P4";
        btnP4.className = "secondary";
        btnP4.addEventListener("click", () => rerunMode1(5));
        const btnP5 = document.createElement("button");
        btnP5.textContent = "Raise key by P5";
        btnP5.className = "secondary";
        btnP5.addEventListener("click", () => rerunMode1(7));
        dom.elRerunControls.append(btnSame, btnP4, btnP5);
    }
    else if (state.activeMode === "mode2" && state.lastMode2Config) {
        dom.elCompletionSummary.textContent = "Ready for another random test?";
        dom.elRerunControls.innerHTML = "";
        const btnAgain = document.createElement("button");
        btnAgain.textContent = "Run another random test";
        btnAgain.addEventListener("click", () => {
            if (state.lastMode2Config) {
                startTest(state.lastMode2Config, "mode2");
            }
        });
        dom.elRerunControls.appendChild(btnAgain);
    }
};
export const startTest = (config, mode) => {
    state.activeMode = mode;
    state.currentQuestionRecords = [];
    currentTestName =
        mode === "mode1"
            ? state.activeProgressionName || CUSTOM_PROGRESSION_NAME
            : "Random progression";
    state.questionQueue =
        mode === "mode1"
            ? buildMode1Queue(config)
            : buildMode2Queue(config);
    state.questionIndex = 0;
    dom.elCompletionPanel.classList.add("hidden");
    dom.elRerunControls.innerHTML = "";
    setTestRunning(true);
    loadQuestion();
};
export const rerunMode1 = (shiftSemis) => {
    if (!state.lastMode1Config) {
        return;
    }
    const updatedKey = theory.transposeKeyCenter(state.lastMode1Config.keyCenter, shiftSemis);
    const newConfig = {
        ...state.lastMode1Config,
        keyCenter: updatedKey,
    };
    dom.elKeyInput.value = updatedKey;
    if (newConfig.minRootNote) {
        dom.elMinRootInput.value = newConfig.minRootNote;
    }
    dom.elLoopTimesInput.value = String(newConfig.loopTimes ?? 1);
    dom.elLoopShiftInput.value = String(newConfig.loopKeyShift ?? 0);
    state.lastMode1Config = newConfig;
    startTest(newConfig, "mode1");
};
export const stopTest = () => {
    stopTimer();
    state.currentQuestion = null;
    state.questionQueue = [];
    state.questionIndex = 0;
    setTestRunning(false);
    resetLiveDisplay();
};
export const replayCurrent = () => {
    if (!state.currentQuestion || !audio.isReady()) {
        return;
    }
    audio.schedulePlayback(state.currentQuestion);
};
