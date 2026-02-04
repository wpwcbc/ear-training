export const STORAGE_KEYS = {
    testHistory: "eartrain:chordQuality:testHistory",
    questionHistory: "eartrain:chordQuality:questionHistory",
};
export const TEST_FILTER_ALL = "all";
export const DEFAULT_TEST_NAME = "Chord Quality ID";
export const state = {
    lastConfig: null,
    enabledQualities: [],
    enabledVoicings: [],
    enabledInversions: [],
    questionQueue: [],
    questionIndex: 0,
    currentQuestion: null,
    attempts: 0,
    currentQuestionRecords: [],
    statsGrouping: "voicing",
    statsOrder: "name",
    recordsTab: "tests",
    testFilter: TEST_FILTER_ALL,
    isTestRunning: false,
    timerHandle: 0,
    startPerfMs: 0,
};
export const resetState = () => {
    state.questionQueue = [];
    state.questionIndex = 0;
    state.currentQuestion = null;
    state.attempts = 0;
    state.currentQuestionRecords = [];
    state.timerHandle = 0;
    state.startPerfMs = 0;
};
