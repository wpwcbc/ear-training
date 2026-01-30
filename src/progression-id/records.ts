import * as theory from "../core/theory.js";
import { dom } from "./dom.js";
import { state, STORAGE_KEYS, TEST_FILTER_ALL } from "./state.js";
import type { QuestionRecord, StatsGrouping, StatsOrder, TestRecord } from "./types.js";
import { CHORD_QUALITIES, type ChordQuality } from "../core/constants.js";

const loadHistory = <T>(key: string): T[] => {
	try {
		const raw = localStorage.getItem(key);
		if (!raw) {
			return [];
		}
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? (parsed as T[]) : [];
	} catch {
		return [];
	}
};

const saveHistory = <T>(key: string, records: T[]): void => {
	localStorage.setItem(key, JSON.stringify(records));
};

export const addRecord = <T>(key: string, record: T, limit = 200): void => {
	const records = loadHistory<T>(key);
	records.unshift(record);
	if (records.length > limit) {
		records.length = limit;
	}
	saveHistory(key, records);
};

export const addRecords = <T>(
	key: string,
	newRecords: T[],
	limit = 200,
): void => {
	if (!newRecords.length) {
		return;
	}
	const records = loadHistory<T>(key);
	const merged = [...newRecords, ...records];
	if (merged.length > limit) {
		merged.length = limit;
	}
	saveHistory(key, merged);
};

const updateStatsToggle = (): void => {
	dom.elStatsGroupSelect.value = state.statsGrouping;
	dom.elStatsOrderSelect.value = state.statsOrder;
};

const updateRecordsTabs = (): void => {
	dom.elRecordsTabButtons.forEach((button) => {
		const tab = button.dataset.recordsTab;
		const isActive = tab === state.recordsTab;
		button.classList.toggle("active", isActive);
		button.setAttribute("aria-selected", String(isActive));
	});
	dom.elRecordsTabPanels.forEach((panel) => {
		const panelTab = panel.dataset.recordsPanel;
		panel.classList.toggle("active", panelTab === state.recordsTab);
	});
};

export const renderRecords = (): void => {
	const tests = loadHistory<TestRecord>(STORAGE_KEYS.testHistory);
	const questions = loadHistory<QuestionRecord>(STORAGE_KEYS.questionHistory);

	dom.elTestRecords.innerHTML = "";
	dom.elStatsRecords.innerHTML = "";

	const buildCell = (
		text: string,
		className = "stats-cell",
	): HTMLDivElement => {
		const cell = document.createElement("div");
		cell.className = className;
		cell.textContent = text;
		return cell;
	};

	const uniqueTests = Array.from(
		new Set(tests.map((record) => record.progressionName)),
	);
	dom.elTestFilterSelect.innerHTML = "";
	const allOption = document.createElement("option");
	allOption.value = TEST_FILTER_ALL;
	allOption.textContent = "All progressions";
	dom.elTestFilterSelect.appendChild(allOption);
	uniqueTests.forEach((name) => {
		const option = document.createElement("option");
		option.value = name;
		option.textContent = name;
		dom.elTestFilterSelect.appendChild(option);
	});
	dom.elTestFilterSelect.value = state.testFilter;

	const filteredTests =
		state.testFilter === TEST_FILTER_ALL
			? tests
			: tests.filter((record) => record.progressionName === state.testFilter);

	if (!filteredTests.length) {
		const empty = document.createElement("div");
		empty.className = "record-card empty";
		empty.textContent =
			state.testFilter === TEST_FILTER_ALL
				? "No test records yet."
				: "No records for this progression.";
		dom.elTestRecords.appendChild(empty);
	} else {
		const table = document.createElement("div");
		table.className = "stats-table tests-table tests-table--compact";

		const header = document.createElement("div");
		header.className = "stats-row stats-header";
		header.append(
			buildCell("Progression", "stats-cell stats-label"),
			buildCell("Avg time"),
			buildCell("Avg attempts"),
			buildCell("Date"),
		);
		table.appendChild(header);

		filteredTests.slice(0, 20).forEach((record) => {
			const row = document.createElement("div");
			row.className = "stats-row";
			row.append(
				buildCell(record.progressionName, "stats-cell stats-label"),
				buildCell(`${record.avgTimeSeconds}s`),
				buildCell(String(record.avgAttempts)),
				buildCell(new Date(record.datetime).toLocaleString()),
			);
			table.appendChild(row);
		});

		dom.elTestRecords.appendChild(table);
	}

	const calculateStats = (
		items: QuestionRecord[],
	): { avgTime: number; avgAttempts: number; count: number } => {
		const count = items.length || 1;
		const totalTime = items.reduce((sum, item) => sum + item.timeSeconds, 0);
		const totalAttempts = items.reduce(
			(sum, item) => sum + item.attempts,
			0,
		);
		return {
			avgTime: Number((totalTime / count).toFixed(3)),
			avgAttempts: Number((totalAttempts / count).toFixed(2)),
			count: items.length,
		};
	};

	const groupRecords = (
		items: QuestionRecord[],
		keyFn: (record: QuestionRecord) => string,
	): Map<string, QuestionRecord[]> => {
		const groups = new Map<string, QuestionRecord[]>();
		items.forEach((record) => {
			const key = keyFn(record);
			const list = groups.get(key) ?? [];
			list.push(record);
			groups.set(key, list);
		});
		return groups;
	};

	const qualityOrder = new Map(
		CHORD_QUALITIES.map((quality, index) => [quality, index]),
	);
	const getQualityIndex = (quality: string): number =>
		qualityOrder.get(quality as ChordQuality) ?? Number.MAX_SAFE_INTEGER;
	const getDegreeIndex = (degree: string): number => {
		if (degree === "/") {
			return Number.POSITIVE_INFINITY;
		}
		try {
			return theory.parseDegreeToSemitones(degree);
		} catch {
			return Number.POSITIVE_INFINITY;
		}
	};

	const compareByName = (
		a: { key: string },
		b: { key: string },
		grouping: StatsGrouping,
	): number => {
		if (grouping === "quality") {
			return getQualityIndex(a.key) - getQualityIndex(b.key);
		}
		return getDegreeIndex(a.key) - getDegreeIndex(b.key);
	};

	const compareByTime = (
		a: { avgTime: number },
		b: { avgTime: number },
		desc: boolean,
	): number => (desc ? b.avgTime - a.avgTime : a.avgTime - b.avgTime);

	if (!questions.length) {
		const empty = document.createElement("div");
		empty.className = "record-card empty";
		empty.textContent = "No question records yet.";
		dom.elStatsRecords.appendChild(empty);
		return;
	}

	const grouping = state.statsGrouping;
	const grouped = groupRecords(questions, (record) =>
		grouping === "quality" ? record.chordQuality : record.chordDegree,
	);
	let groupedStats = Array.from(grouped.entries()).map(([key, records]) => {
		const stats = calculateStats(records);
		return { key, ...stats };
	});

	if (state.statsOrder === "name") {
		groupedStats = groupedStats.sort((a, b) =>
			compareByName(a, b, grouping),
		);
	} else {
		const desc = state.statsOrder === "time-desc";
		groupedStats = groupedStats.sort((a, b) => compareByTime(a, b, desc));
	}

	const table = document.createElement("div");
	table.className = "stats-table";
	const header = document.createElement("div");
	header.className = "stats-row stats-header";
	header.append(
		buildCell(grouping === "quality" ? "Quality" : "Degree", "stats-cell stats-label"),
		buildCell("Avg time"),
		buildCell("Avg attempts"),
		buildCell("Questions"),
	);
	table.appendChild(header);

	groupedStats.forEach((group) => {
		const row = document.createElement("div");
		row.className = "stats-row";
		row.append(
			buildCell(group.key, "stats-cell stats-label"),
			buildCell(`${group.avgTime}s`),
			buildCell(String(group.avgAttempts)),
			buildCell(String(group.count)),
		);
		table.appendChild(row);
	});

	dom.elStatsRecords.appendChild(table);
};

export const initRecords = (): void => {
	updateStatsToggle();
	updateRecordsTabs();
	renderRecords();

	dom.elStatsGroupSelect.addEventListener("change", () => {
		state.statsGrouping = dom.elStatsGroupSelect
			.value as StatsGrouping;
		renderRecords();
	});

	dom.elStatsOrderSelect.addEventListener("change", () => {
		state.statsOrder = dom.elStatsOrderSelect.value as StatsOrder;
		renderRecords();
	});

	dom.elTestFilterSelect.addEventListener("change", () => {
		state.testFilter = dom.elTestFilterSelect.value;
		renderRecords();
	});

	dom.elRecordsTabButtons.forEach((button) => {
		button.addEventListener("click", () => {
			const tab = button.dataset.recordsTab;
			if (!tab) {
				return;
			}
			state.recordsTab = tab as "tests" | "stats";
			updateRecordsTabs();
		});
	});
};
