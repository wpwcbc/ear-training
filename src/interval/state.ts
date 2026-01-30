import type { ProgressionPreset } from "../core/progressions.js";
import type {
	ActiveMode,
	Mode1Config,
	Mode2Config,
	QueueEvent,
	Question,
	StatsGrouping,
	StatsOrder,
	QuestionRecord,
} from "./types.js";

export const CUSTOM_PROGRESSION_NAME = "Custom progression";
export const TEST_FILTER_ALL = "all";

export const STORAGE_KEYS = {
	testHistory: "eartrain:interval:testHistory",
	questionHistory: "eartrain:interval:questionHistory",
	velocityMix: "eartrain:velocityMix:interval",
	customProgressions: "eartrain:customProgressions",
};

export const state = {
	activeMode: "mode1" as ActiveMode,
	lastMode1Config: null as Mode1Config | null,
	lastMode2Config: null as Mode2Config | null,
	activeProgressionName: CUSTOM_PROGRESSION_NAME,
	customProgressions: [] as ProgressionPreset[],
	tuneProgressions: [] as ProgressionPreset[],
	questionQueue: [] as QueueEvent[],
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
