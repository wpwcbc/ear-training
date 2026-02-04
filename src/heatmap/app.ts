import * as theory from "../core/theory.js";
import { CHORD_QUALITIES } from "../core/constants.js";
import { QUALITY_OPTIONS } from "../chord-quality/options.js";
import { STORAGE_KEYS as DEGREE_KEYS } from "../degree/state.js";
import { STORAGE_KEYS as INTERVAL_KEYS } from "../interval/state.js";
import { STORAGE_KEYS as CHORD_QUALITY_KEYS } from "../chord-quality/state.js";
import { STORAGE_KEYS as PROGRESSION_KEYS } from "../progression-id/state.js";

type AxisKey = "key" | "degree" | "quality";

interface HeatmapRecord {
	key: string;
	degree: string;
	quality: string;
	time: number;
	attempts: number;
}

interface ExerciseSource {
	id: string;
	label: string;
	keys: string[];
}

const EXERCISES: ExerciseSource[] = [
	{
		id: "overall",
		label: "Overall (all exercises)",
		keys: [
			DEGREE_KEYS.questionHistory,
			INTERVAL_KEYS.questionHistory,
			CHORD_QUALITY_KEYS.questionHistory,
			PROGRESSION_KEYS.questionHistory,
		],
	},
	{
		id: "degree",
		label: "Scale Degree Trainer",
		keys: [DEGREE_KEYS.questionHistory],
	},
	{
		id: "interval",
		label: "Interval Trainer",
		keys: [INTERVAL_KEYS.questionHistory],
	},
	{
		id: "chord-quality",
		label: "Chord Quality ID",
		keys: [CHORD_QUALITY_KEYS.questionHistory],
	},
	{
		id: "progression-id",
		label: "Progression ID",
		keys: [PROGRESSION_KEYS.questionHistory],
	},
];

const KEY_ORDER = [
	"C",
	"C#",
	"D",
	"Eb",
	"E",
	"F",
	"F#",
	"G",
	"Ab",
	"A",
	"Bb",
	"B",
	"/",
];

const QUALITY_ORDER = [
	...CHORD_QUALITIES,
	...QUALITY_OPTIONS.map((option) => option.id).filter((id) =>
		["maj6", "m6", "sus4", "7b9", "7#9", "7alt"].includes(id),
	),
];

const exerciseSelect = document.getElementById(
	"exerciseSelect",
) as HTMLSelectElement;
const xAxisSelect = document.getElementById("xAxisSelect") as HTMLSelectElement;
const yAxisSelect = document.getElementById("yAxisSelect") as HTMLSelectElement;
const heatmapContainer = document.getElementById(
	"heatmapContainer",
) as HTMLDivElement;
const heatmapLegend = document.getElementById(
	"heatmapLegend",
) as HTMLDivElement;

const loadRecords = (key: string): HeatmapRecord[] => {
	try {
		const raw = localStorage.getItem(key);
		if (!raw) {
			return [];
		}
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			return [];
		}
		return parsed.map((record: any) => ({
			key: String(record.keyCenter ?? "/"),
			degree: String(record.chordDegree ?? "/"),
			quality: String(record.chordQuality ?? "/"),
			time: Number(record.timeSeconds ?? 0),
			attempts: Number(record.attempts ?? 0),
		}));
	} catch {
		return [];
	}
};

const getAxisValue = (record: HeatmapRecord, axis: AxisKey): string => {
	if (axis === "key") return record.key;
	if (axis === "quality") return record.quality;
	return record.degree;
};

const uniqueAxisValues = (
	records: HeatmapRecord[],
	axis: AxisKey,
): string[] => {
	const values = Array.from(new Set(records.map((record) => getAxisValue(record, axis))));
	if (axis === "key") {
		return values.sort((a, b) => KEY_ORDER.indexOf(a) - KEY_ORDER.indexOf(b));
	}
	if (axis === "quality") {
		const getQualityIndex = (value: string): number => {
			const idx = QUALITY_ORDER.indexOf(
				value as (typeof QUALITY_ORDER)[number],
			);
			return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
		};
		return values.sort(
			(a, b) => getQualityIndex(a) - getQualityIndex(b),
		);
	}
	return values.sort((a, b) => {
		if (a === "/") return 1;
		if (b === "/") return -1;
		try {
			return theory.parseDegreeToSemitones(a) - theory.parseDegreeToSemitones(b);
		} catch {
			return a.localeCompare(b);
		}
	});
};

const formatLabel = (value: string): string => (value === "/" ? "Random" : value);

const renderHeatmap = (): void => {
	const selected = EXERCISES.find((exercise) => exercise.id === exerciseSelect.value);
	if (!selected) {
		return;
	}
	const records = selected.keys.flatMap(loadRecords);
	heatmapContainer.innerHTML = "";

	if (!records.length) {
		heatmapLegend.textContent = "No records yet for this selection.";
		const empty = document.createElement("div");
		empty.className = "record-card empty";
		empty.textContent = "No data available.";
		heatmapContainer.appendChild(empty);
		return;
	}

	const xAxis = xAxisSelect.value as AxisKey;
	const yAxis = yAxisSelect.value as AxisKey;
	if (xAxis === yAxis) {
		heatmapLegend.textContent = "Choose two different axes for the heatmap.";
		return;
	}

	const xValues = uniqueAxisValues(records, xAxis);
	const yValues = uniqueAxisValues(records, yAxis);

	const totals = new Map<
		string,
		{ totalTime: number; totalAttempts: number; count: number }
	>();

	// Single pass aggregation: O(n) instead of filtering records per cell.
	records.forEach((record) => {
		const x = getAxisValue(record, xAxis);
		const y = getAxisValue(record, yAxis);
		const key = `${y}::${x}`;
		const current = totals.get(key) ?? {
			totalTime: 0,
			totalAttempts: 0,
			count: 0,
		};
		current.totalTime += record.time;
		current.totalAttempts += record.attempts;
		current.count += 1;
		totals.set(key, current);
	});

	const cellStats = new Map<
		string,
		{ avgTime: number; avgAttempts: number; count: number }
	>();
	let maxTime = 0;

	for (const [key, value] of totals.entries()) {
		const avgTime = value.totalTime / value.count;
		const avgAttempts = value.totalAttempts / value.count;
		cellStats.set(key, {
			avgTime,
			avgAttempts,
			count: value.count,
		});
		maxTime = Math.max(maxTime, avgTime);
	}

	const grid = document.createElement("div");
	grid.className = "heatmap-grid";
	grid.style.gridTemplateColumns = `minmax(120px, 0.9fr) repeat(${xValues.length}, minmax(80px, 1fr))`;

	const headerSpacer = document.createElement("div");
	headerSpacer.className = "heatmap-header heatmap-header--corner";
	grid.appendChild(headerSpacer);

	xValues.forEach((value) => {
		const header = document.createElement("div");
		header.className = "heatmap-header";
		header.textContent = formatLabel(value);
		grid.appendChild(header);
	});

	yValues.forEach((y) => {
		const rowLabel = document.createElement("div");
		rowLabel.className = "heatmap-header heatmap-header--row";
		rowLabel.textContent = formatLabel(y);
		grid.appendChild(rowLabel);

		xValues.forEach((x) => {
			const cellKey = `${y}::${x}`;
			const cell = document.createElement("div");
			cell.className = "heatmap-cell";
			const stats = cellStats.get(cellKey);
			if (!stats) {
				cell.classList.add("is-empty");
				cell.textContent = "—";
				grid.appendChild(cell);
				return;
			}
			const intensity = maxTime ? Math.min(stats.avgTime / maxTime, 1) : 0;
			const lightness = 94 - intensity * 28;
			cell.style.backgroundColor = `hsl(18, 70%, ${lightness}%)`;
			cell.innerHTML = `<div class="heatmap-value">${stats.avgTime.toFixed(
				2,
			)}s</div><div class="heatmap-sub">${stats.avgAttempts.toFixed(
				2,
			)} att · ${stats.count} q</div>`;
			grid.appendChild(cell);
		});
	});

	heatmapLegend.textContent = `Color shows avg time (s). ${records.length} records loaded.`;
	heatmapContainer.appendChild(grid);
};

const init = (): void => {
	exerciseSelect.innerHTML = "";
	EXERCISES.forEach((exercise) => {
		const option = document.createElement("option");
		option.value = exercise.id;
		option.textContent = exercise.label;
		exerciseSelect.appendChild(option);
	});
	exerciseSelect.value = "overall";
	xAxisSelect.value = "quality";
	yAxisSelect.value = "degree";

	exerciseSelect.addEventListener("change", renderHeatmap);
	xAxisSelect.addEventListener("change", renderHeatmap);
	yAxisSelect.addEventListener("change", renderHeatmap);

	renderHeatmap();
};

init();
