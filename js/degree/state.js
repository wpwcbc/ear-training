export const CUSTOM_PROGRESSION_NAME = "Custom progression";
export const TEST_FILTER_ALL = "all";
export const STORAGE_KEYS = {
    testHistory: "eartrain:testHistory",
    questionHistory: "eartrain:questionHistory",
    velocityMix: "eartrain:velocityMix:degree",
    customProgressions: "eartrain:customProgressions",
};
export const state = {
    activeMode: "mode1",
    lastMode1Config: null,
    lastMode2Config: null,
    activeProgressionName: CUSTOM_PROGRESSION_NAME,
    customProgressions: [],
    tuneProgressions: [],
    questionQueue: [],
    questionIndex: 0,
    currentQuestion: null,
    attempts: 0,
    currentQuestionRecords: [],
    statsGrouping: "quality",
    statsOrder: "name",
    recordsTab: "tests",
    testFilter: TEST_FILTER_ALL,
    isTestRunning: false,
    timerHandle: 0,
    startPerfMs: 0,
};
