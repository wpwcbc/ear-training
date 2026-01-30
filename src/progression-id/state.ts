import type {
	Config,
	Question,
	QuestionRecord,
	StatsGrouping,
	StatsOrder,
	TestRecord,
} from "./types.js";

export const STORAGE_KEYS = {
	testHistory: "eartrain:progressionId:testHistory",
	questionHistory: "eartrain:progressionId:questionHistory",
};

export const TEST_FILTER_ALL = "all";

export const state = {
	lastConfig: null as Config | null,
	questionQueue: [] as Question[],
	questionIndex: 0,
	currentQuestion: null as Question | null,
	attempts: 0,
	currentQuestionRecords: [] as QuestionRecord[],
	statsGrouping: "quality" as StatsGrouping,
	statsOrder: "name" as StatsOrder,
	recordsTab: "tests" as "tests" | "stats",
	testFilter: TEST_FILTER_ALL,
	isTestRunning: false,
	timerHandle: 0,
	startPerfMs: 0,
};
