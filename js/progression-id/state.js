export const STORAGE_KEYS = {
    testHistory: "eartrain:progressionId:testHistory",
    questionHistory: "eartrain:progressionId:questionHistory",
};
export const TEST_FILTER_ALL = "all";
export const state = {
    lastConfig: null,
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
