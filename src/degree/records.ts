import { CHORD_QUALITIES } from "../core/constants.js";
import * as theory from "../core/theory.js";
import { dom } from "./dom.js";
import { state, STORAGE_KEYS, TEST_FILTER_ALL } from "./state.js";
import type { QuestionRecord, TestRecord, StatsGrouping } from "./types.js";

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

	const updateTestFilterOptions = (names: string[]): void => {
		const options = [TEST_FILTER_ALL, ...names];
		if (!options.includes(state.testFilter)) {
			state.testFilter = TEST_FILTER_ALL;
		}
		dom.elTestFilterSelect.innerHTML = "";

		const allOption = document.createElement("option");
		allOption.value = TEST_FILTER_ALL;
		allOption.textContent = "All progressions";
		dom.elTestFilterSelect.appendChild(allOption);

		names.forEach((name) => {
			const option = document.createElement("option");
			option.value = name;
			option.textContent = name;
			dom.elTestFilterSelect.appendChild(option);
		});

		dom.elTestFilterSelect.value = state.testFilter;
	};

	const progressionNames = Array.from(
		new Set(tests.map((record) => record.progressionName)),
	).sort((a, b) => a.localeCompare(b));
	updateTestFilterOptions(progressionNames);

	const filteredTests =
		state.testFilter === TEST_FILTER_ALL
			? tests
			: tests.filter(
					(record) => record.progressionName === state.testFilter,
			  );

	const groupAverages = new Map<string, { sum: number; count: number }>();
	tests.forEach((record) => {
		const stats = groupAverages.get(record.progressionName) || {
			sum: 0,
			count: 0,
		};
		stats.sum += record.avgTimeSeconds;
		stats.count += 1;
		groupAverages.set(record.progressionName, stats);
	});

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
		table.className = "stats-table tests-table";

		const header = document.createElement("div");
		header.className = "stats-row stats-header";
		header.append(
			buildCell("Progression", "stats-cell stats-label"),
			buildCell("Avg time"),
			buildCell("Avg attempts"),
			buildCell("Prog avg time"),
			buildCell("Date"),
		);
		table.appendChild(header);

		filteredTests.slice(0, 20).forEach((record) => {
			const row = document.createElement("div");
			row.className = "stats-row";
			const group = groupAverages.get(record.progressionName);
			const groupAvg =
				group && group.count ? group.sum / group.count : record.avgTimeSeconds;
			row.append(
				buildCell(record.progressionName, "stats-cell stats-label"),
				buildCell(`${record.avgTimeSeconds}s`),
				buildCell(String(record.avgAttempts)),
				buildCell(`${groupAvg.toFixed(3)}s`),
				buildCell(new Date(record.datetime).toLocaleString()),
			);
			table.appendChild(row);
		});

		dom.elTestRecords.appendChild(table);
	}

	const formatDegreeLabel = (degree: string): string =>
		degree === "/" ? "Random" : degree;

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
		qualityOrder.get(quality) ?? Number.MAX_SAFE_INTEGER;
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
		keyType: StatsGrouping,
	): number => {
		const aKey =
			keyType === "quality" ? getQualityIndex(a.key) : getDegreeIndex(a.key);
		const bKey =
			keyType === "quality" ? getQualityIndex(b.key) : getDegreeIndex(b.key);
		if (aKey !== bKey) {
			return aKey - bKey;
		}
		return a.key.localeCompare(b.key);
	};
	const compareByTime = (
		a: { key: string; stats: { avgTime: number } },
		b: { key: string; stats: { avgTime: number } },
		direction: number,
		keyType: StatsGrouping,
	): number => {
		const delta = (a.stats.avgTime - b.stats.avgTime) * direction;
		if (delta !== 0) {
			return delta;
		}
		return compareByName(a, b, keyType);
	};

	const renderStats = (items: QuestionRecord[]): void => {
		if (!items.length) {
			const empty = document.createElement("div");
			empty.className = "record-card empty";
			empty.textContent = "No stats yet.";
			dom.elStatsRecords.appendChild(empty);
			return;
		}

		const table = document.createElement("div");
		table.className = "stats-table";

		const header = document.createElement("div");
		header.className = "stats-row stats-header";
		header.append(
			buildCell(
				state.statsGrouping === "quality" ? "Quality" : "Root degree",
				"stats-cell stats-label",
			),
			buildCell("Avg time"),
			buildCell("Avg attempts"),
			buildCell("Questions"),
		);
		table.appendChild(header);

		const topKeyType: StatsGrouping =
			state.statsGrouping === "quality" ? "quality" : "degree";
		const subKeyType: StatsGrouping =
			state.statsGrouping === "quality" ? "degree" : "quality";
		const topKey =
			state.statsGrouping === "quality"
				? (record: QuestionRecord) => record.chordQuality
				: (record: QuestionRecord) => record.chordDegree;
		const subKey =
			state.statsGrouping === "quality"
				? (record: QuestionRecord) => record.chordDegree
				: (record: QuestionRecord) => record.chordQuality;
		const sortDirection = state.statsOrder === "time-desc" ? -1 : 1;
		const sortGroups =
			state.statsOrder === "name"
				? (a: { key: string }, b: { key: string }) =>
						compareByName(a, b, topKeyType)
				: (
						a: { key: string; stats: { avgTime: number } },
						b: { key: string; stats: { avgTime: number } },
					) => compareByTime(a, b, sortDirection, topKeyType);
		const sortSubgroups =
			state.statsOrder === "name"
				? (a: { key: string }, b: { key: string }) =>
						compareByName(a, b, subKeyType)
				: (
						a: { key: string; stats: { avgTime: number } },
						b: { key: string; stats: { avgTime: number } },
					) => compareByTime(a, b, sortDirection, subKeyType);

		const groups = Array.from(groupRecords(items, topKey).entries())
			.map(([key, records]) => ({
				key,
				records,
				stats: calculateStats(records),
			}))
			.sort(sortGroups);

		groups.forEach((group) => {
			const groupRow = document.createElement("div");
			groupRow.className = "stats-row stats-row--group";
			const groupLabel =
				state.statsGrouping === "quality"
					? group.key
					: `Degree ${formatDegreeLabel(group.key)}`;
			groupRow.append(
				buildCell(groupLabel, "stats-cell stats-label"),
				buildCell(`${group.stats.avgTime}s`),
				buildCell(String(group.stats.avgAttempts)),
				buildCell(String(group.stats.count)),
			);
			table.appendChild(groupRow);

			const subEntries = Array.from(
				groupRecords(group.records, subKey).entries(),
			)
				.map(([key, records]) => ({
					key,
					records,
					stats: calculateStats(records),
				}))
				.sort(sortSubgroups);

			subEntries.forEach((entry) => {
				const subRow = document.createElement("div");
				subRow.className = "stats-row stats-row--sub";
				const label =
					state.statsGrouping === "quality"
						? `↳ Degree ${formatDegreeLabel(entry.key)}`
						: `↳ ${entry.key}`;
				subRow.append(
					buildCell(label, "stats-cell stats-label"),
					buildCell(`${entry.stats.avgTime}s`),
					buildCell(String(entry.stats.avgAttempts)),
					buildCell(String(entry.stats.count)),
				);
				table.appendChild(subRow);
			});
		});

		dom.elStatsRecords.appendChild(table);
	};

	renderStats(questions);
};

export const initRecords = (): void => {
	dom.elRecordsTabButtons.forEach((button) => {
		button.addEventListener("click", () => {
			const tab = button.dataset.recordsTab;
			if (tab === "tests" || tab === "stats") {
				state.recordsTab = tab;
				updateRecordsTabs();
			}
		});
	});

	dom.elStatsGroupSelect.addEventListener("change", () => {
		const group = dom.elStatsGroupSelect.value;
		if (group === "quality" || group === "degree") {
			state.statsGrouping = group;
			updateStatsToggle();
			renderRecords();
		}
	});

	dom.elStatsOrderSelect.addEventListener("change", () => {
		const order = dom.elStatsOrderSelect.value;
		if (order === "name" || order === "time-asc" || order === "time-desc") {
			state.statsOrder = order;
			updateStatsToggle();
			renderRecords();
		}
	});

	dom.elTestFilterSelect.addEventListener("change", () => {
		state.testFilter = dom.elTestFilterSelect.value || TEST_FILTER_ALL;
		renderRecords();
	});

	updateRecordsTabs();
	updateStatsToggle();
	renderRecords();
};
