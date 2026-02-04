import type {
	Config,
	Question,
	QuestionRecord,
	StatsGrouping,
	StatsOrder,
	TestRecord,
} from "./types.js";

export const STORAGE_KEYS = {
	testHistory: "eartrain:chordQuality:testHistory",
	questionHistory: "eartrain:chordQuality:questionHistory",
};

export const TEST_FILTER_ALL = "all";
export const DEFAULT_TEST_NAME = "Chord Quality ID";

export const state = {
	lastConfig: null as Config | null,
	enabledQualities: [] as Config["enabledQualities"],
	enabledVoicings: [] as Config["enabledVoicings"],
	enabledInversions: [] as Config["enabledInversions"],
	questionQueue: [] as Question[],
	questionIndex: 0,
	currentQuestion: null as Question | null,
	attempts: 0,
	currentQuestionRecords: [] as QuestionRecord[],
	statsGrouping: "voicing" as StatsGrouping,
	statsOrder: "name" as StatsOrder,
	recordsTab: "tests" as "tests" | "stats",
	testFilter: TEST_FILTER_ALL,
	isTestRunning: false,
	timerHandle: 0,
	startPerfMs: 0,
};

export const resetState = (): void => {
	state.questionQueue = [];
	state.questionIndex = 0;
	state.currentQuestion = null;
	state.attempts = 0;
	state.currentQuestionRecords = [];
	state.timerHandle = 0;
	state.startPerfMs = 0;
};
