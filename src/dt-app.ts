import {
	CHORD_QUALITIES,
	CHORD_VOICE_VELOCITIES,
	LEAD_VELOCITY_DEFAULT,
	RANDOM_ROOTS,
	MIN_CHORD_ROOT_MIDI,
	DEFAULT_MODE1,
	type ChordQuality,
	type ChordConfig,
} from "./dt-constants.js";
import { SCALE_OPTIONS, type ScaleOption } from "./dt-scales.js";
import {
	PROGRESSION_PRESETS,
	PROGRESSION_CATEGORIES,
	type ProgressionPreset,
	type ProgressionChordPreset,
	type ProgressionCategory,
} from "./dt-progressions.js";
import * as theory from "./dt-theory.js";
import * as audio from "./dt-audio.js";


type ActiveMode = "mode1" | "mode2";
type StatsGrouping = "quality" | "degree";
type StatsOrder = "name" | "time-asc" | "time-desc";

interface Mode1Config {
	keyCenter: string;
	progression: ChordConfig[];
	minRootNote: string;
	minRootMidi: number;
	loopTimes: number;
	loopKeyShift: number;
}

interface Mode2Config {
	totalQuestions: number;
	allowedByQuality: Record<ChordQuality, string[]>;
	enabledQualities: ChordQuality[];
	minRootNote: string;
	minRootMidi: number;
}

interface BaseQueueEvent {
	mode: ActiveMode;
	minRootMidi: number;
	chordIndex: number;
	chordCount: number;
	questionInChord: number;
	questionsPerChord: number;
	quality: ChordQuality;
	allowedUpperDegrees: string[];
	playChord: boolean;
}

interface Mode1QueueEvent extends BaseQueueEvent {
	mode: "mode1";
	keyCenter: string;
	chordDegree: string;
}

interface Mode2QueueEvent extends BaseQueueEvent {
	mode: "mode2";
	keyCenter: null;
	chordRoot: string;
}

type QueueEvent = Mode1QueueEvent | Mode2QueueEvent;

type Question = QueueEvent & {
	chordRootMidi: number;
	chordTonicName: string;
	chordNotes: string[];
	chordVelocities: number[];
	leadVelocity: number;
	upperNote: string;
	correctUpperDegree: string;
};

interface QuestionRecord {
	chordDegree: string;
	chordQuality: ChordQuality;
	upperDegree: string;
	timeSeconds: number;
	attempts: number;
}

interface TestRecord {
	progressionName: string;
	avgTimeSeconds: number;
	avgAttempts: number;
	datetime: string;
}

interface VelocitySettings {
	root: number;
	fifth: number;
	seventh: number;
	third: number;
	lead: number;
}

const getById = <T extends HTMLElement>(id: string): T => {
	const el: HTMLElement | null = document.getElementById(id);
	if (!el) {
		throw new Error("Missing element: " + id);
	}
	return el as T;
};

interface ResolvedScaleOption extends ScaleOption {
	tokens: string[];
}

const resolvedScaleOptions: ResolvedScaleOption[] = SCALE_OPTIONS.map(
	(option) => ({
		...option,
		tokens: theory.parseDegreeList(option.degrees),
	}),
);

const scaleById: Record<string, ResolvedScaleOption> = resolvedScaleOptions.reduce(
	(acc, option) => {
		acc[option.id] = option;
		return acc;
	},
	{} as Record<string, ResolvedScaleOption>,
);
const SCALE_ID_ALIASES: Record<string, string> = {
	"phygian dominant": "phrygian dominant",
};
const normalizeScaleKey = (value: string): string =>
	value
		.toLowerCase()
		.trim()
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ");
const normalizedScaleIdMap: Record<string, string> = resolvedScaleOptions.reduce(
	(acc, option) => {
		acc[normalizeScaleKey(option.id)] = option.id;
		acc[normalizeScaleKey(option.label)] = option.id;
		return acc;
	},
	{} as Record<string, string>,
);

const MODE2_DEFAULT_DEGREES: Partial<Record<ChordQuality, string>> = {
	maj7: "1 2 3 #4 5 6 7",
	m7: "1 2 b3 4 5 6 b7",
	"7": "1 2 3 4 5 6 b7",
	m7b5: "1 b2 b3 4 b5 b6 b7",
	dim7: "1 b2 b3 4 b5 b6 bb7",
	mmaj7: "1 2 b3 4 5 6 7",
	"+": "1 2 3 #4 #5 6 7",
};

const DEFAULT_DEGREE_TEXT: string = "1 2 3 4 5 6 7";

function tokensMatch(a: string[], b: string[]): boolean {
	if (a.length !== b.length) {
		return false;
	}
	return a.every((token, index) => token === b[index]);
}

function detectScaleId(degreesText: string): string {
	try {
		const tokens = theory.parseDegreeList(degreesText);
		const match = resolvedScaleOptions.find((option) =>
			tokensMatch(tokens, option.tokens),
		);
		return match ? match.id : "custom";
	} catch {
		return "custom";
	}
}

function getMode2DefaultDegrees(quality: ChordQuality): string {
	return MODE2_DEFAULT_DEGREES[quality] ?? DEFAULT_DEGREE_TEXT;
}

function clampVelocity(value: number, fallback: number): number {
	if (!Number.isFinite(value)) {
		return fallback;
	}
	return Math.min(1, Math.max(0, value));
}

function formatVelocity(value: number): string {
	return clampVelocity(value, 0).toFixed(2);
}

function readVelocity(input: HTMLInputElement, fallback: number): number {
	return clampVelocity(Number(input.value), fallback);
}

function loadVelocitySettings(): VelocitySettings {
	const defaults: VelocitySettings = {
		root: CHORD_VOICE_VELOCITIES.root,
		fifth: CHORD_VOICE_VELOCITIES.fifth,
		seventh: CHORD_VOICE_VELOCITIES.seventh,
		third: CHORD_VOICE_VELOCITIES.third,
		lead: LEAD_VELOCITY_DEFAULT,
	};
	try {
		const raw = localStorage.getItem(STORAGE_KEYS.velocityMix);
		if (!raw) {
			return defaults;
		}
		const parsed = JSON.parse(raw) as Partial<VelocitySettings>;
		if (!parsed || typeof parsed !== "object") {
			return defaults;
		}
		return {
			root: clampVelocity(Number(parsed.root), defaults.root),
			fifth: clampVelocity(Number(parsed.fifth), defaults.fifth),
			seventh: clampVelocity(Number(parsed.seventh), defaults.seventh),
			third: clampVelocity(Number(parsed.third), defaults.third),
			lead: clampVelocity(Number(parsed.lead), defaults.lead),
		};
	} catch {
		return defaults;
	}
}

function collectVelocitySettings(): VelocitySettings {
	return {
		root: readVelocity(elVelocityRoot, CHORD_VOICE_VELOCITIES.root),
		fifth: readVelocity(elVelocityFifth, CHORD_VOICE_VELOCITIES.fifth),
		seventh: readVelocity(elVelocitySeventh, CHORD_VOICE_VELOCITIES.seventh),
		third: readVelocity(elVelocityThird, CHORD_VOICE_VELOCITIES.third),
		lead: readVelocity(elVelocityLead, LEAD_VELOCITY_DEFAULT),
	};
}

function saveVelocitySettings(): void {
	const settings = collectVelocitySettings();
	localStorage.setItem(STORAGE_KEYS.velocityMix, JSON.stringify(settings));
}

function initVelocityControls(): void {
	const saved = loadVelocitySettings();
	const items: Array<{
		key: keyof VelocitySettings;
		input: HTMLInputElement;
		label: HTMLSpanElement;
		defaultValue: number;
	}> = [
		{
			key: "root",
			input: elVelocityRoot,
			label: elVelocityRootValue,
			defaultValue: CHORD_VOICE_VELOCITIES.root,
		},
		{
			key: "fifth",
			input: elVelocityFifth,
			label: elVelocityFifthValue,
			defaultValue: CHORD_VOICE_VELOCITIES.fifth,
		},
		{
			key: "seventh",
			input: elVelocitySeventh,
			label: elVelocitySeventhValue,
			defaultValue: CHORD_VOICE_VELOCITIES.seventh,
		},
		{
			key: "third",
			input: elVelocityThird,
			label: elVelocityThirdValue,
			defaultValue: CHORD_VOICE_VELOCITIES.third,
		},
		{
			key: "lead",
			input: elVelocityLead,
			label: elVelocityLeadValue,
			defaultValue: LEAD_VELOCITY_DEFAULT,
		},
	];

	items.forEach((item) => {
		const initial =
			saved[item.key] !== undefined ? saved[item.key] : item.defaultValue;
		item.input.value = String(initial);
		item.label.textContent = formatVelocity(initial);
		item.input.addEventListener("input", () => {
			item.label.textContent = formatVelocity(Number(item.input.value));
			saveVelocitySettings();
		});
	});
}

function populateScaleSelect(
	select: HTMLSelectElement,
	selectedId: string,
): void {
	select.innerHTML = "";

	const customOption: HTMLOptionElement = document.createElement("option");
	customOption.value = "custom";
	customOption.textContent = "Custom";
	select.appendChild(customOption);

	resolvedScaleOptions.forEach((option) => {
		const opt = document.createElement("option");
		opt.value = option.id;
		opt.textContent = option.label;
		select.appendChild(opt);
	});

	select.value = selectedId;
	if (!select.value) {
		select.value = "custom";
	}
}

function populateQualitySelect(
	select: HTMLSelectElement,
	selectedValue: string,
): void {
	select.innerHTML = "";
	CHORD_QUALITIES.forEach((quality) => {
		const opt = document.createElement("option");
		opt.value = quality;
		opt.textContent = quality;
		select.appendChild(opt);
	});
	select.value = selectedValue;
	if (!select.value) {
		select.value = CHORD_QUALITIES[0] ?? "maj7";
	}
}

function wireScaleControls(
	select: HTMLSelectElement,
	input: HTMLInputElement,
): void {
	let suppressInputSync = false;

	select.addEventListener("change", () => {
		const selectedId = select.value;
		if (selectedId === "custom") {
			return;
		}
		const option = scaleById[selectedId];
		if (!option) {
			return;
		}
		suppressInputSync = true;
		input.value = option.degrees;
		suppressInputSync = false;
	});

	input.addEventListener("input", () => {
		if (suppressInputSync) {
			return;
		}
		if (select.value !== "custom") {
			select.value = "custom";
		}
	});
}

// ------------------------------
// UI references
// ------------------------------
const elMode1: HTMLDivElement = getById("mode1Config");
const elMode2: HTMLDivElement = getById("mode2Config");
const elKeyInput: HTMLInputElement = getById("keyInput");
const elMinRootInput: HTMLInputElement = getById("minRootInput");
const elLoopTimesInput: HTMLInputElement = getById("loopTimesInput");
const elLoopShiftInput: HTMLInputElement = getById("loopShiftInput");
const elProgressionRows: HTMLDivElement = getById("progressionRows");
const elChordTemplate: HTMLTemplateElement = getById("chordRowTemplate");
const elMode2Rows: HTMLDivElement = getById("mode2Rows");
const elMode2Template: HTMLTemplateElement = getById("mode2RowTemplate");
const elSaveProgressionName: HTMLInputElement =
	getById("saveProgressionName");
const elSaveProgressionError: HTMLParagraphElement =
	getById("saveProgressionError");
const elSaveProgressionControls: HTMLDivElement =
	getById("saveProgressionControls");
const elVelocityRoot: HTMLInputElement = getById("velocityRoot");
const elVelocityFifth: HTMLInputElement = getById("velocityFifth");
const elVelocitySeventh: HTMLInputElement = getById("velocitySeventh");
const elVelocityThird: HTMLInputElement = getById("velocityThird");
const elVelocityLead: HTMLInputElement = getById("velocityLead");
const elVelocityRootValue: HTMLSpanElement = getById("velocityRootValue");
const elVelocityFifthValue: HTMLSpanElement = getById("velocityFifthValue");
const elVelocitySeventhValue: HTMLSpanElement = getById("velocitySeventhValue");
const elVelocityThirdValue: HTMLSpanElement = getById("velocityThirdValue");
const elVelocityLeadValue: HTMLSpanElement = getById("velocityLeadValue");

const elKeyLabel: HTMLSpanElement = getById("keyLabel");
const elChordLabel: HTMLSpanElement = getById("chordLabel");
const elTonicLabel: HTMLSpanElement = getById("tonicLabel");
const elQuestionLabel: HTMLSpanElement = getById("questionLabel");
const elTimeLabel: HTMLSpanElement = getById("timeLabel");
const elAttemptsLabel: HTMLSpanElement = getById("attemptsLabel");
const elStatus: HTMLDivElement = getById("status");
const elAnswers: HTMLDivElement = getById("answers");
const elCompletionPanel: HTMLElement = getById("completionPanel");
const elCompletionStats: HTMLDivElement = getById("completionStats");
const elCompletionSummary: HTMLParagraphElement = getById("completionSummary");
const elRerunControls: HTMLDivElement = getById("rerunControls");
const elProgressionList: HTMLDivElement = getById("progressionList");
const btnSaveProgression: HTMLButtonElement = getById("btnSaveProgression");
const elLiveQuestionPanel: HTMLElement = getById("liveQuestionPanel");
const elTestRecords: HTMLDivElement = getById("testRecords");
const elStatsRecords: HTMLDivElement = getById("statsRecords");
const elStatsGroupSelect: HTMLSelectElement = getById("statsGroupSelect");
const elStatsOrderSelect: HTMLSelectElement = getById("statsOrderSelect");
const elTestFilterSelect: HTMLSelectElement = getById("testFilterSelect");
const elRecordsTabButtons: HTMLButtonElement[] = Array.from(
	document.querySelectorAll<HTMLButtonElement>("[data-records-tab]"),
);
const elRecordsTabPanels: HTMLDivElement[] = Array.from(
	document.querySelectorAll<HTMLDivElement>("[data-records-panel]"),
);

const btnStartAudio: HTMLButtonElement = getById("btnStartAudio");
const btnStartTest: HTMLButtonElement = getById("btnStartTest");
const btnStopTest: HTMLButtonElement = getById("btnStopTest");
const btnReplay: HTMLButtonElement = getById("btnReplay");
const btnAddChord: HTMLButtonElement = getById("btnAddChord");

// ------------------------------
// Timer
// ------------------------------
let timerHandle: number = 0;
let startPerfMs: number = 0;

let statsGrouping: StatsGrouping = "quality";
let statsOrder: StatsOrder = "name";
let recordsTab: "tests" | "stats" = "tests";
const TEST_FILTER_ALL = "all";
let testFilter: string = TEST_FILTER_ALL;

function startTimer(): void {
	startPerfMs = performance.now();
	if (timerHandle) {
		window.clearInterval(timerHandle);
	}
	timerHandle = window.setInterval(() => {
		const dt: number = (performance.now() - startPerfMs) / 1000;
		elTimeLabel.textContent = dt.toFixed(2) + "s";
	}, 25);
}

function stopTimer(): void {
	if (timerHandle) {
		window.clearInterval(timerHandle);
		timerHandle = 0;
	}
}

function setStatus(message: string, state: "ok" | "warn" | "" = ""): void {
	elStatus.textContent = message;
	if (state) {
		elStatus.dataset.state = state;
	} else {
		delete elStatus.dataset.state;
	}
}

function setSaveError(message = ""): void {
	const trimmed = message.trim();
	if (!trimmed) {
		elSaveProgressionError.textContent = "";
		elSaveProgressionError.classList.add("hidden");
		return;
	}
	elSaveProgressionError.textContent = trimmed;
	elSaveProgressionError.classList.remove("hidden");
}

function updateSaveControlsVisibility(mode: ActiveMode): void {
	if (mode === "mode1") {
		elSaveProgressionControls.classList.remove("hidden");
	} else {
		elSaveProgressionControls.classList.add("hidden");
		setSaveError();
	}
}

// ------------------------------
// Mode + config handling
// ------------------------------
let activeMode: ActiveMode = "mode1";
let lastMode1Config: Mode1Config | null = null;
let lastMode2Config: Mode2Config | null = null;
const CUSTOM_PROGRESSION_NAME = "Custom progression";
let activeProgressionName: string = CUSTOM_PROGRESSION_NAME;
let customProgressions: ProgressionPreset[] = [];
let tuneProgressions: ProgressionPreset[] = [];

function markProgressionCustom(): void {
	activeProgressionName = CUSTOM_PROGRESSION_NAME;
}

const STORAGE_KEYS = {
	testHistory: "eartrain:testHistory",
	questionHistory: "eartrain:questionHistory",
	velocityMix: "eartrain:velocityMix",
	customProgressions: "eartrain:customProgressions",
};

function loadHistory<T>(key: string): T[] {
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
}

function saveHistory<T>(key: string, records: T[]): void {
	localStorage.setItem(key, JSON.stringify(records));
}

function addRecord<T>(key: string, record: T, limit = 200): void {
	const records = loadHistory<T>(key);
	records.unshift(record);
	if (records.length > limit) {
		records.length = limit;
	}
	saveHistory(key, records);
}

function addRecords<T>(key: string, newRecords: T[], limit = 200): void {
	if (!newRecords.length) {
		return;
	}
	const records = loadHistory<T>(key);
	const merged = [...newRecords, ...records];
	if (merged.length > limit) {
		merged.length = limit;
	}
	saveHistory(key, merged);
}

function slugify(value: string): string {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function isChordQuality(value: string): value is ChordQuality {
	return CHORD_QUALITIES.includes(value as ChordQuality);
}

function isScaleId(value: string): boolean {
	return Boolean(scaleById[value]);
}

function resolveScaleId(value: string): string | null {
	const trimmed = value.trim();
	if (!trimmed) {
		return null;
	}
	if (scaleById[trimmed]) {
		return trimmed;
	}
	const normalized = normalizeScaleKey(trimmed);
	const alias = SCALE_ID_ALIASES[normalized];
	if (alias && scaleById[alias]) {
		return alias;
	}
	return normalizedScaleIdMap[normalized] ?? null;
}

function normalizePreset(
	raw: Partial<ProgressionPreset>,
	forcedCategory?: ProgressionCategory,
): ProgressionPreset | null {
	if (!raw || typeof raw !== "object") {
		return null;
	}
	const name = String(raw.name || "").trim();
	const defaultKey = String(raw.defaultKey || "").trim();
	if (!name || !defaultKey) {
		return null;
	}
	try {
		theory.noteNameToPitchClassSemitones(defaultKey);
	} catch {
		return null;
	}
	const chordsInput = Array.isArray(raw.chords) ? raw.chords : [];
	if (!chordsInput.length) {
		return null;
	}

	const chords: ProgressionChordPreset[] = [];
	for (const chord of chordsInput) {
		const chordDegree = String(chord.chordDegree || "").trim();
		const quality = String(chord.quality || "").trim();
		const scaleIdRaw = String(chord.scaleId || "").trim();
		const scaleId = resolveScaleId(scaleIdRaw);
		const questions =
			typeof chord.questions === "number" && chord.questions >= 1
				? Math.floor(chord.questions)
				: undefined;
		if (!chordDegree || !isChordQuality(quality) || !scaleId) {
			return null;
		}
		try {
			theory.parseDegreeToSemitones(chordDegree);
		} catch {
			return null;
		}
		chords.push({
			chordDegree,
			quality,
			scaleId,
			questions,
		});
	}

	const category =
		forcedCategory || (raw.category as ProgressionCategory) || "Customs";
	const id =
		String(raw.id || "").trim() ||
		`${category.toLowerCase()}-${slugify(name)}-${Date.now()}`;

	return {
		id,
		name,
		category,
		defaultKey,
		chords,
		description: raw.description,
	};
}

function loadCustomProgressions(): ProgressionPreset[] {
	const stored = loadHistory<ProgressionPreset>(STORAGE_KEYS.customProgressions);
	return stored
		.map((item) => normalizePreset(item, "Customs"))
		.filter(Boolean) as ProgressionPreset[];
}

function saveCustomProgressions(list: ProgressionPreset[]): void {
	localStorage.setItem(
		STORAGE_KEYS.customProgressions,
		JSON.stringify(list),
	);
}

function addProgressionRow(data?: ChordConfig): void {
	const clone = elChordTemplate.content.cloneNode(true) as DocumentFragment;
	const row: HTMLDivElement | null = clone.querySelector(".progression-row");
	if (!row) {
		return;
	}
	const degreeSelect = row.querySelector(".chord-degree") as HTMLInputElement;
	const qualitySelect = row.querySelector(".chord-quality") as HTMLSelectElement;
	const scaleSelect = row.querySelector(".scale-select") as HTMLSelectElement;
	const degreesInput = row.querySelector(".upper-degrees") as HTMLInputElement;
	const questionsInput = row.querySelector(
		".question-count",
	) as HTMLInputElement;
	const removeBtn = row.querySelector(".remove-chord") as HTMLButtonElement;

	degreeSelect.value = data?.chordDegree || "1";
	populateQualitySelect(
		qualitySelect,
		data?.quality || CHORD_QUALITIES[0] || "maj7",
	);
	degreesInput.value = data?.allowedUpperDegrees
		? data.allowedUpperDegrees.join(" ")
		: "1 2 3 4 5 6 7";
	questionsInput.value = String(data?.questions || 1);

	const selectedScaleId = detectScaleId(degreesInput.value);
	populateScaleSelect(scaleSelect, selectedScaleId);
	wireScaleControls(scaleSelect, degreesInput);

	degreeSelect.addEventListener("input", () => {
		markProgressionCustom();
	});

	qualitySelect.addEventListener("change", () => {
		markProgressionCustom();
	});

	removeBtn.addEventListener("click", () => {
		row.remove();
		markProgressionCustom();
	});

	elProgressionRows.appendChild(clone);
}

function loadDefaultProgression(): void {
	const defaultPreset =
		PROGRESSION_PRESETS.find((preset) => preset.id === "major-251") ||
		PROGRESSION_PRESETS.find((preset) => preset.name === "Major ii–V–I");

	if (defaultPreset) {
		applyProgressionPreset(defaultPreset);
		return;
	}

	elProgressionRows.innerHTML = "";
	DEFAULT_MODE1.progression.forEach((chord) => addProgressionRow(chord));
	elKeyInput.value = DEFAULT_MODE1.keyCenter;
	markProgressionCustom();
}

function renderMode2Rows(): void {
	elMode2Rows.innerHTML = "";

	CHORD_QUALITIES.forEach((quality) => {
		const clone = elMode2Template.content.cloneNode(true) as DocumentFragment;
		const row = clone.querySelector(".mode2-row") as HTMLDivElement | null;
		if (!row) {
			return;
		}
		row.dataset.quality = quality;

		const toggle = row.querySelector(".mode2-enable") as HTMLInputElement;
		const toggleLabel = row.querySelector(".toggle-label") as HTMLSpanElement;
		const scaleSelect = row.querySelector(".mode2-scale") as HTMLSelectElement;
		const degreesInput = row.querySelector(".mode2-degrees") as HTMLInputElement;

		toggle.checked = true;
		toggleLabel.textContent = quality;
		degreesInput.value = getMode2DefaultDegrees(quality);
		const scaleId = detectScaleId(degreesInput.value);
		populateScaleSelect(scaleSelect, scaleId);
		wireScaleControls(scaleSelect, degreesInput);

		const syncRowState = (): void => {
			const enabled = toggle.checked;
			scaleSelect.disabled = !enabled;
			degreesInput.disabled = !enabled;
			row.classList.toggle("is-disabled", !enabled);
		};

		toggle.addEventListener("change", syncRowState);
		syncRowState();

		elMode2Rows.appendChild(clone);
	});
}

function getMode(): ActiveMode {
	const checked = document.querySelector<HTMLInputElement>(
		"input[name='mode']:checked",
	);
	if (!checked) {
		throw new Error("Select a mode before starting.");
	}
	return checked.value as ActiveMode;
}

function updateModeUI(): void {
	activeMode = getMode();
	if (activeMode === "mode1") {
		elMode1.classList.remove("hidden");
		elMode2.classList.add("hidden");
	} else {
		elMode1.classList.add("hidden");
		elMode2.classList.remove("hidden");
	}
	updateSaveControlsVisibility(activeMode);
	resetLiveDisplay();
}

function readMinRootSetting(): { minRootNote: string; minRootMidi: number } {
	const minRootNote: string = elMinRootInput.value.trim();
	if (!minRootNote) {
		throw new Error("Enter a minimum chord root (e.g., G2).");
	}
	const minRootMidi: number = theory.noteWithOctaveToMidi(minRootNote);
	return { minRootNote, minRootMidi };
}

function readMode1Config(): Mode1Config {
	const { minRootNote, minRootMidi } = readMinRootSetting();
	const loopTimes: number = Number(elLoopTimesInput.value || 1);
	if (!Number.isFinite(loopTimes) || loopTimes < 1) {
		throw new Error("Loop times must be at least 1.");
	}
	const loopShiftRaw: number = Number(elLoopShiftInput.value || 0);
	if (!Number.isFinite(loopShiftRaw) || !Number.isInteger(loopShiftRaw)) {
		throw new Error("Key shift per loop must be a whole number.");
	}
	const keyCenter: string = elKeyInput.value.trim();
	if (!keyCenter) {
		throw new Error("Enter a key center.");
	}
	theory.noteNameToPitchClassSemitones(keyCenter);

	const rows: HTMLDivElement[] = Array.from(
		elProgressionRows.querySelectorAll(".progression-row"),
	) as HTMLDivElement[];
	if (!rows.length) {
		throw new Error("Add at least one chord to the progression.");
	}

	const progression: ChordConfig[] = rows.map((row) => {
		const degree = (row.querySelector(".chord-degree") as HTMLInputElement)
			.value.trim();
		if (!degree) {
			throw new Error("Chord degree cannot be empty.");
		}
		theory.parseDegreeToSemitones(degree);
		const quality = (row.querySelector(".chord-quality") as HTMLSelectElement)
			.value as ChordQuality;
		const allowedText = (row.querySelector(".upper-degrees") as HTMLInputElement)
			.value;
		const questions = Number(
			(row.querySelector(".question-count") as HTMLInputElement).value || 1,
		);

		const allowedUpperDegrees: string[] = theory.parseDegreeList(allowedText);
		if (!Number.isFinite(questions) || questions < 1) {
			throw new Error("Questions per chord must be at least 1.");
		}

		return {
			chordDegree: degree,
			quality,
			allowedUpperDegrees,
			questions: Math.floor(questions),
		};
	});

	return {
		keyCenter,
		progression,
		minRootNote,
		minRootMidi,
		loopTimes: Math.floor(loopTimes),
		loopKeyShift: Math.trunc(loopShiftRaw),
	};
}

interface BuildPresetResult {
	preset: ProgressionPreset | null;
	error: string | null;
}

function buildCustomPresetFromSetup(name: string): BuildPresetResult {
	const mode = getMode();
	if (mode !== "mode1") {
		return {
			preset: null,
			error: "Switch to Mode 1 to save a progression.",
		};
	}

	const keyCenter = elKeyInput.value.trim();
	if (!keyCenter) {
		return { preset: null, error: "Enter a key center before saving." };
	}
	try {
		theory.noteNameToPitchClassSemitones(keyCenter);
	} catch {
		return { preset: null, error: "Key center is invalid." };
	}

	const rows = Array.from(
		elProgressionRows.querySelectorAll(".progression-row"),
	) as HTMLDivElement[];
	if (!rows.length) {
		return { preset: null, error: "Add at least one chord before saving." };
	}

	const chords: ProgressionChordPreset[] = [];
	for (const row of rows) {
		const degree = (
			row.querySelector(".chord-degree") as HTMLInputElement
		).value.trim();
		const quality = (row.querySelector(".chord-quality") as HTMLSelectElement)
			.value as ChordQuality;
		const scaleSelect = row.querySelector(
			".scale-select",
		) as HTMLSelectElement;
		const scaleId = scaleSelect.value;
		const questions = Number(
			(row.querySelector(".question-count") as HTMLInputElement).value || 1,
		);

		if (!degree) {
			return { preset: null, error: "Chord degree cannot be empty." };
		}
		try {
			theory.parseDegreeToSemitones(degree);
		} catch {
			return { preset: null, error: `Invalid chord degree: ${degree}` };
		}

		if (!isChordQuality(quality)) {
			return { preset: null, error: "Chord quality is invalid." };
		}

		if (!isScaleId(scaleId)) {
			return {
				preset: null,
				error:
					"Custom scales cannot be saved. Please choose a named scale for every chord.",
			};
		}

		chords.push({
			chordDegree: degree,
			quality,
			scaleId,
			questions: Number.isFinite(questions) && questions >= 1
				? Math.floor(questions)
				: undefined,
		});
	}

	return {
		preset: {
			id: `custom-${slugify(name)}-${Date.now()}`,
			name,
			category: "Customs",
			defaultKey: keyCenter,
			chords,
		},
		error: null,
	};
}

function applyProgressionPreset(preset: ProgressionPreset): void {
	const mode1Radio = document.querySelector<HTMLInputElement>(
		"input[name='mode'][value='mode1']",
	);
	if (mode1Radio) {
		mode1Radio.checked = true;
	}
	updateModeUI();
	elKeyInput.value = preset.defaultKey;
	elProgressionRows.innerHTML = "";
	activeProgressionName = preset.name;

	preset.chords.forEach((chord) => {
		const scaleOption = scaleById[chord.scaleId];
		const allowedUpperDegrees = scaleOption
			? scaleOption.tokens
			: theory.parseDegreeList("1 2 3 4 5 6 7");
		addProgressionRow({
			chordDegree: chord.chordDegree,
			quality: chord.quality,
			allowedUpperDegrees,
			questions: chord.questions ?? 1,
		});
	});
}

function getAllProgressions(): ProgressionPreset[] {
	return [...PROGRESSION_PRESETS, ...tuneProgressions, ...customProgressions];
}

function downloadPreset(preset: ProgressionPreset): void {
	const payload = JSON.stringify(preset, null, 2);
	const blob = new Blob([payload], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `${slugify(preset.name) || "progression"}.json`;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}

function handleDeleteCustom(id: string): void {
	customProgressions = customProgressions.filter((preset) => preset.id !== id);
	saveCustomProgressions(customProgressions);
	renderProgressionList();
}

async function handleImportCustom(
	input: HTMLInputElement,
): Promise<void> {
	const file = input.files?.[0];
	if (!file) {
		return;
	}
	try {
		const text = await file.text();
		const parsed = JSON.parse(text);
		const imported: ProgressionPreset[] = [];

		if (Array.isArray(parsed)) {
			parsed.forEach((item) => {
				const preset = normalizePreset(item, "Customs");
				if (preset) {
					imported.push(preset);
				}
			});
		} else {
			const preset = normalizePreset(parsed, "Customs");
			if (preset) {
				imported.push(preset);
			}
		}

		if (!imported.length) {
			alert("Invalid progression file.");
			return;
		}

		imported.forEach((preset) => {
			const existingIndex = customProgressions.findIndex(
				(item) => item.name === preset.name,
			);
			if (existingIndex >= 0) {
				customProgressions[existingIndex] = {
					...preset,
					id: customProgressions[existingIndex].id,
				};
			} else {
				customProgressions.push(preset);
			}
		});
		saveCustomProgressions(customProgressions);
		renderProgressionList();
	} catch {
		alert("Unable to import progression.");
	} finally {
		input.value = "";
	}
}

async function loadTuneProgressions(): Promise<void> {
	try {
		const indexUrl = new URL("../tunes/index.json", window.location.href);
		const response = await fetch(indexUrl);
		if (!response.ok) {
			return;
		}
		const fileList = (await response.json()) as string[];
		if (!Array.isArray(fileList)) {
			return;
		}
		const loaded: ProgressionPreset[] = [];
		for (const fileName of fileList) {
			const fileUrl = new URL(`../tunes/${fileName}`, window.location.href);
			const res = await fetch(fileUrl);
			if (!res.ok) {
				continue;
			}
			const presetRaw = await res.json();
			const preset = normalizePreset(presetRaw, "Tunes");
			if (preset) {
				loaded.push(preset);
			}
		}
		tuneProgressions = loaded;
	} catch {
		tuneProgressions = [];
	}
}

function renderProgressionList(): void {
	elProgressionList.innerHTML = "";
	const allPresets = getAllProgressions();

	PROGRESSION_CATEGORIES.forEach((category) => {
		const group = document.createElement("div");
		group.className = "progression-group";

		const headingRow = document.createElement("div");
		headingRow.className = "progression-heading";
		const heading = document.createElement("h3");
		heading.textContent = category.label;
		headingRow.appendChild(heading);

		if (category.id === "Customs") {
			const importBtn = document.createElement("button");
			importBtn.type = "button";
			importBtn.className = "ghost";
			importBtn.textContent = "Import";

			const fileInput = document.createElement("input");
			fileInput.type = "file";
			fileInput.accept = "application/json,.json";
			fileInput.className = "progression-import";
			fileInput.addEventListener("change", () => {
				void handleImportCustom(fileInput);
			});

			importBtn.addEventListener("click", () => fileInput.click());
			headingRow.append(importBtn, fileInput);
		}

		group.appendChild(headingRow);

		const items = document.createElement("div");
		items.className = "progression-items";

		const matches = allPresets.filter(
			(preset) => preset.category === category.id,
		);

		if (!matches.length) {
			const empty = document.createElement("p");
			empty.className = "progression-empty";
			empty.textContent = "No presets yet.";
			items.appendChild(empty);
		} else {
			matches.forEach((preset) => {
				const card = document.createElement("div");
				card.className = "progression-card";

				const btn = document.createElement("button");
				btn.type = "button";
				btn.className = "progression-item";

				const name = document.createElement("div");
				name.textContent = preset.name;

				const meta = document.createElement("div");
				meta.className = "meta";
				const chordLabels = preset.chords.map(
					(chord) => `${chord.chordDegree}-${chord.quality}`,
				);
				const maxPreview = 8;
				const preview = chordLabels.slice(0, maxPreview).join("  ");
				const suffix = chordLabels.length > maxPreview ? " ..." : "";
				meta.textContent = `${preset.defaultKey} · ${preview}${suffix}`;

				btn.append(name, meta);
				btn.addEventListener("click", () =>
					applyProgressionPreset(preset),
				);
				card.appendChild(btn);

				if (category.id === "Customs") {
					const actions = document.createElement("div");
					actions.className = "progression-card-actions";

					const exportBtn = document.createElement("button");
					exportBtn.type = "button";
					exportBtn.className = "progression-action";
					exportBtn.textContent = "Export";
					exportBtn.addEventListener("click", () =>
						downloadPreset(preset),
					);

					const deleteBtn = document.createElement("button");
					deleteBtn.type = "button";
					deleteBtn.className = "progression-action danger";
					deleteBtn.textContent = "Delete";
					deleteBtn.addEventListener("click", () =>
						handleDeleteCustom(preset.id),
					);

					actions.append(exportBtn, deleteBtn);
					card.appendChild(actions);
				}

				items.appendChild(card);
			});
		}

		group.appendChild(items);
		elProgressionList.appendChild(group);
	});
}

function readMode2Config(): Mode2Config {
	const { minRootNote, minRootMidi } = readMinRootSetting();
	const mode2Input = document.getElementById(
		"mode2Questions",
	) as HTMLInputElement | null;
	const totalQuestions: number = Number(mode2Input?.value || 1);
	if (!Number.isFinite(totalQuestions) || totalQuestions < 1) {
		throw new Error("Questions per test must be at least 1.");
	}
	const allowedByQuality: Record<ChordQuality, string[]> = CHORD_QUALITIES.reduce(
		(acc, quality) => {
			acc[quality] = [];
			return acc;
		},
		{} as Record<ChordQuality, string[]>,
	);
	const enabledQualities: ChordQuality[] = [];
	const rows = Array.from(
		elMode2Rows.querySelectorAll(".mode2-row"),
	) as HTMLDivElement[];
	rows.forEach((row) => {
		const quality = row.dataset.quality as ChordQuality | undefined;
		if (!quality) {
			return;
		}
		const toggle = row.querySelector(".mode2-enable") as HTMLInputElement;
		const degreesInput = row.querySelector(".mode2-degrees") as HTMLInputElement;
		if (!toggle.checked) {
			return;
		}
		allowedByQuality[quality] = theory.parseDegreeList(degreesInput.value);
		enabledQualities.push(quality);
	});

	if (!enabledQualities.length) {
		throw new Error("Select at least one chord quality for Mode 2.");
	}
	return {
		totalQuestions: Math.floor(totalQuestions),
		allowedByQuality,
		enabledQualities,
		minRootNote,
		minRootMidi,
	};
}

// ------------------------------
// Test generation
// ------------------------------
let questionQueue: QueueEvent[] = [];
let questionIndex: number = 0;
let currentQuestion: Question | null = null;
let attempts: number = 0;
let currentQuestionRecords: QuestionRecord[] = [];
let currentTestName: string = CUSTOM_PROGRESSION_NAME;

function buildMode1Queue(config: Mode1Config): Mode1QueueEvent[] {
	const queue: Mode1QueueEvent[] = [];
	for (let loopIndex = 0; loopIndex < config.loopTimes; loopIndex += 1) {
		const shiftedKey =
			loopIndex === 0 || config.loopKeyShift === 0
				? config.keyCenter
				: theory.transposeKeyCenter(
						config.keyCenter,
						config.loopKeyShift * loopIndex,
					);
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
				});
			}
		});
	}
	return queue;
}

function buildMode2Queue(config: Mode2Config): Mode2QueueEvent[] {
	const queue: Mode2QueueEvent[] = [];
	for (let i = 0; i < config.totalQuestions; i += 1) {
		const quality: ChordQuality = theory.pickRandom(config.enabledQualities);
		const chordRoot: string = theory.pickRandom(RANDOM_ROOTS);
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
		});
	}
	return queue;
}

function buildQuestion(event: QueueEvent): Question {
	let chordRootMidi: number = 0;
	let chordTonicName: string = "";
	const minRootMidi: number =
		typeof event.minRootMidi === "number"
			? event.minRootMidi
			: MIN_CHORD_ROOT_MIDI;

	if (event.mode === "mode1") {
		chordRootMidi = theory.computeChordRootMidiFromKey(
			event.keyCenter,
			event.chordDegree,
			1,
		);
		chordRootMidi = theory.clampRootMidiToMin(chordRootMidi, minRootMidi);
		const keyPc: number = theory.noteNameToPitchClassSemitones(event.keyCenter);
		const offset: number = theory.parseDegreeToSemitones(event.chordDegree);
		chordTonicName = theory.pcToNameSharp(keyPc + offset);
	} else {
		chordRootMidi = theory.computeChordRootMidiFromNote(event.chordRoot, 1);
		chordRootMidi = theory.clampRootMidiToMin(chordRootMidi, minRootMidi);
		chordTonicName = event.chordRoot;
	}

	const chordIntervals: number[] = theory.buildChordIntervals(event.quality);
	const chordMidis: number[] = theory.buildChordVoicing(
		chordRootMidi,
		chordIntervals,
	);
	const chordVelocities: number[] = [
		readVelocity(elVelocityRoot, CHORD_VOICE_VELOCITIES.root),
		readVelocity(elVelocityFifth, CHORD_VOICE_VELOCITIES.fifth),
		readVelocity(elVelocitySeventh, CHORD_VOICE_VELOCITIES.seventh),
		readVelocity(elVelocityThird, CHORD_VOICE_VELOCITIES.third),
	];
	const leadVelocity: number = readVelocity(
		elVelocityLead,
		LEAD_VELOCITY_DEFAULT,
	);
	const topChordMidi: number = Math.max(...chordMidis);
	const correctDegree: string = theory.pickRandom(event.allowedUpperDegrees);
	const upperMidi: number = theory.chooseUpperMidi(
		chordRootMidi,
		correctDegree,
		topChordMidi,
	);

	return {
		...event,
		chordRootMidi,
		chordTonicName,
		chordVelocities,
		leadVelocity,
		chordNotes: chordMidis.map(theory.midiToNoteNameSharp),
		upperNote: theory.midiToNoteNameSharp(upperMidi),
		correctUpperDegree: correctDegree,
	};
}

function resetLiveDisplay(): void {
	elKeyLabel.textContent = "-";
	elChordLabel.textContent = "-";
	elTonicLabel.textContent = "-";
	elQuestionLabel.textContent = "-";
	elTimeLabel.textContent = "0.00s";
	elAttemptsLabel.textContent = "0";
	elAnswers.innerHTML = "";
	setStatus("Configure a test and press Start.");
	btnReplay.disabled = true;
	elCompletionPanel.classList.add("hidden");
	elRerunControls.innerHTML = "";
}

function renderQuestion(question: Question): void {
	const total: number = questionQueue.length;
	const position: number = questionIndex + 1;
	const keyLabel: string =
		question.mode === "mode1" ? question.keyCenter : "Random";

	elKeyLabel.textContent = keyLabel;
	if (question.mode === "mode1") {
		elChordLabel.textContent =
			question.chordDegree + " " + question.quality;
	} else {
		elChordLabel.textContent =
			question.chordTonicName + " " + question.quality;
	}
	elTonicLabel.textContent = question.chordTonicName;
	elQuestionLabel.textContent =
		position +
		" / " +
		total +
		(question.mode === "mode1"
			? ` (Chord ${question.chordIndex + 1}/${question.chordCount}, Q ${question.questionInChord}/${question.questionsPerChord})`
			: "");

	attempts = 0;
	elAttemptsLabel.textContent = "0";
	elAnswers.innerHTML = "";
	setStatus(
		question.playChord
			? "Listen to the chord, then the upper note. Identify the degree."
			: "New upper note (same chord). Identify the degree.",
	);

	question.allowedUpperDegrees.forEach((deg: string) => {
		const button: HTMLButtonElement = document.createElement("button");
		button.textContent = deg;
		button.addEventListener("click", () => handleAnswer(deg));
		elAnswers.appendChild(button);
	});
}

function handleAnswer(selectedDegree: string): void {
	if (!currentQuestion) {
		return;
	}
	attempts += 1;
	elAttemptsLabel.textContent = String(attempts);

	if (selectedDegree === currentQuestion.correctUpperDegree) {
		const elapsedSeconds: number =
			(performance.now() - startPerfMs) / 1000;
		const chordDegree: string =
			currentQuestion.mode === "mode1"
				? currentQuestion.chordDegree
				: "/";
		currentQuestionRecords.push({
			chordDegree,
			chordQuality: currentQuestion.quality,
			upperDegree: currentQuestion.correctUpperDegree,
			timeSeconds: Number(elapsedSeconds.toFixed(3)),
			attempts,
		});

		stopTimer();
		setStatus("Correct. Moving to the next question...", "ok");
		btnReplay.disabled = true;
		Array.from(elAnswers.querySelectorAll("button")).forEach((btn) => {
			(btn as HTMLButtonElement).disabled = true;
		});
		window.setTimeout(() => {
			questionIndex += 1;
			loadQuestion();
		}, 600);
	} else {
		setStatus("Not yet. Try again.", "warn");
	}
}

function loadQuestion(): void {
	if (questionIndex >= questionQueue.length) {
		finishTest();
		return;
	}
	currentQuestion = buildQuestion(questionQueue[questionIndex]);
	renderQuestion(currentQuestion);
	startTimer();
	btnReplay.disabled = false;
	audio.schedulePlayback(currentQuestion);
}

function finishTest(): void {
	stopTimer();
	currentQuestion = null;
	btnReplay.disabled = true;
	elAnswers.innerHTML = "";
	setStatus("Test complete. Choose a rerun option.", "ok");
	elCompletionPanel.classList.remove("hidden");

	const questionCount = currentQuestionRecords.length || 1;
	const avgTime =
		currentQuestionRecords.reduce((sum, rec) => sum + rec.timeSeconds, 0) /
		questionCount;
	const avgAttempts =
		currentQuestionRecords.reduce((sum, rec) => sum + rec.attempts, 0) /
		questionCount;

	const testRecord: TestRecord = {
		progressionName: currentTestName,
		avgTimeSeconds: Number(avgTime.toFixed(3)),
		avgAttempts: Number(avgAttempts.toFixed(2)),
		datetime: new Date().toISOString(),
	};

	addRecords(STORAGE_KEYS.questionHistory, currentQuestionRecords);
	addRecord(STORAGE_KEYS.testHistory, testRecord);
	renderRecords();

	elCompletionStats.innerHTML = "";
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
		elCompletionStats.appendChild(card);
	});

	if (activeMode === "mode1" && lastMode1Config) {
		elCompletionSummary.textContent =
			"Run the same progression again, or shift the key center.";
		elRerunControls.innerHTML = "";

		const btnSame: HTMLButtonElement = document.createElement("button");
		btnSame.textContent = "Run again (same key)";
		btnSame.addEventListener("click", () => rerunMode1(0));

		const btnP4: HTMLButtonElement = document.createElement("button");
		btnP4.textContent = "Raise key by P4";
		btnP4.className = "secondary";
		btnP4.addEventListener("click", () => rerunMode1(5));

		const btnP5: HTMLButtonElement = document.createElement("button");
		btnP5.textContent = "Raise key by P5";
		btnP5.className = "secondary";
		btnP5.addEventListener("click", () => rerunMode1(7));

		elRerunControls.append(btnSame, btnP4, btnP5);
	} else if (activeMode === "mode2" && lastMode2Config) {
		elCompletionSummary.textContent = "Ready for another random test?";
		elRerunControls.innerHTML = "";
		const btnAgain: HTMLButtonElement = document.createElement("button");
		btnAgain.textContent = "Run another random test";
		btnAgain.addEventListener("click", () => {
			if (lastMode2Config) {
				startTest(lastMode2Config, "mode2");
			}
		});
		elRerunControls.append(btnAgain);
	}
}

function startTest(config: Mode1Config | Mode2Config, mode: ActiveMode): void {
	activeMode = mode;
	currentQuestionRecords = [];
	currentTestName =
		mode === "mode1"
			? activeProgressionName || CUSTOM_PROGRESSION_NAME
			: "Random progression";
	questionQueue =
		mode === "mode1"
			? buildMode1Queue(config as Mode1Config)
			: buildMode2Queue(config as Mode2Config);
	questionIndex = 0;
	elCompletionPanel.classList.add("hidden");
	elRerunControls.innerHTML = "";
	loadQuestion();
}

function rerunMode1(shiftSemis: number): void {
	if (!lastMode1Config) {
		return;
	}
	const updatedKey: string = theory.transposeKeyCenter(
		lastMode1Config.keyCenter,
		shiftSemis,
	);
	const newConfig: Mode1Config = {
		...lastMode1Config,
		keyCenter: updatedKey,
	};
	elKeyInput.value = updatedKey;
	if (newConfig.minRootNote) {
		elMinRootInput.value = newConfig.minRootNote;
	}
	elLoopTimesInput.value = String(newConfig.loopTimes ?? 1);
	elLoopShiftInput.value = String(newConfig.loopKeyShift ?? 0);
	lastMode1Config = newConfig;
	startTest(newConfig, "mode1");
}

function renderRecords(): void {
	const tests = loadHistory<TestRecord>(STORAGE_KEYS.testHistory);
	const questions = loadHistory<QuestionRecord>(STORAGE_KEYS.questionHistory);

	elTestRecords.innerHTML = "";
	elStatsRecords.innerHTML = "";

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
		if (!options.includes(testFilter)) {
			testFilter = TEST_FILTER_ALL;
		}
		elTestFilterSelect.innerHTML = "";

		const allOption = document.createElement("option");
		allOption.value = TEST_FILTER_ALL;
		allOption.textContent = "All progressions";
		elTestFilterSelect.appendChild(allOption);

		names.forEach((name) => {
			const option = document.createElement("option");
			option.value = name;
			option.textContent = name;
			elTestFilterSelect.appendChild(option);
		});

		elTestFilterSelect.value = testFilter;
	};

	const progressionNames = Array.from(
		new Set(tests.map((record) => record.progressionName)),
	).sort((a, b) => a.localeCompare(b));
	updateTestFilterOptions(progressionNames);

	const filteredTests =
		testFilter === TEST_FILTER_ALL
			? tests
			: tests.filter((record) => record.progressionName === testFilter);

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
			testFilter === TEST_FILTER_ALL
				? "No test records yet."
				: "No records for this progression.";
		elTestRecords.appendChild(empty);
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

		elTestRecords.appendChild(table);
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

	const qualityOrder: Map<string, number> = new Map(
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
			elStatsRecords.appendChild(empty);
			return;
		}

		const table = document.createElement("div");
		table.className = "stats-table";

		const buildCell = (text: string, className = "stats-cell"): HTMLDivElement => {
			const cell = document.createElement("div");
			cell.className = className;
			cell.textContent = text;
			return cell;
		};

		const header = document.createElement("div");
		header.className = "stats-row stats-header";
		header.append(
			buildCell(
				statsGrouping === "quality" ? "Quality" : "Root degree",
				"stats-cell stats-label",
			),
			buildCell("Avg time"),
			buildCell("Avg attempts"),
			buildCell("Questions"),
		);
		table.appendChild(header);

		const topKeyType: StatsGrouping = statsGrouping === "quality"
			? "quality"
			: "degree";
		const subKeyType: StatsGrouping = statsGrouping === "quality"
			? "degree"
			: "quality";
		const topKey =
			statsGrouping === "quality"
				? (record: QuestionRecord) => record.chordQuality
				: (record: QuestionRecord) => record.chordDegree;
		const subKey =
			statsGrouping === "quality"
				? (record: QuestionRecord) => record.chordDegree
				: (record: QuestionRecord) => record.chordQuality;
		const sortDirection: number = statsOrder === "time-desc" ? -1 : 1;
		const sortGroups =
			statsOrder === "name"
				? (a: { key: string }, b: { key: string }) =>
						compareByName(a, b, topKeyType)
				: (
						a: { key: string; stats: { avgTime: number } },
						b: { key: string; stats: { avgTime: number } },
					) => compareByTime(a, b, sortDirection, topKeyType);
		const sortSubgroups =
			statsOrder === "name"
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
				statsGrouping === "quality"
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
					statsGrouping === "quality"
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

		elStatsRecords.appendChild(table);
	};

	renderStats(questions);
}

function updateStatsToggle(): void {
	elStatsGroupSelect.value = statsGrouping;
	elStatsOrderSelect.value = statsOrder;
}

function updateRecordsTabs(): void {
	elRecordsTabButtons.forEach((button) => {
		const tab = button.dataset.recordsTab;
		const isActive = tab === recordsTab;
		button.classList.toggle("active", isActive);
		button.setAttribute("aria-selected", String(isActive));
	});
	elRecordsTabPanels.forEach((panel) => {
		const panelTab = panel.dataset.recordsPanel;
		panel.classList.toggle("active", panelTab === recordsTab);
	});
}

// ------------------------------
// Event wiring
// ------------------------------
elRecordsTabButtons.forEach((button) => {
	button.addEventListener("click", () => {
		const tab = button.dataset.recordsTab;
		if (tab === "tests" || tab === "stats") {
			recordsTab = tab;
			updateRecordsTabs();
		}
	});
});

elStatsGroupSelect.addEventListener("change", () => {
	const group = elStatsGroupSelect.value;
	if (group === "quality" || group === "degree") {
		statsGrouping = group;
		updateStatsToggle();
		renderRecords();
	}
});

elStatsOrderSelect.addEventListener("change", () => {
	const order = elStatsOrderSelect.value;
	if (order === "name" || order === "time-asc" || order === "time-desc") {
		statsOrder = order;
		updateStatsToggle();
		renderRecords();
	}
});

elTestFilterSelect.addEventListener("change", () => {
	testFilter = elTestFilterSelect.value || TEST_FILTER_ALL;
	renderRecords();
});

btnStartAudio.addEventListener("click", async () => {
	try {
		await audio.ensureAudioReady();
		setStatus("Audio ready. Configure your test and press Start.", "ok");
	} catch (err) {
		setStatus("Audio failed to start.", "warn");
	}
});

btnStartTest.addEventListener("click", async () => {
	try {
		await audio.ensureAudioReady();
		const mode: ActiveMode = getMode();
		if (mode === "mode1") {
			const config: Mode1Config = readMode1Config();
			lastMode1Config = config;
			startTest(config, "mode1");
		} else {
			const config: Mode2Config = readMode2Config();
			lastMode2Config = config;
			startTest(config, "mode2");
		}
		elLiveQuestionPanel.scrollIntoView({
			behavior: "smooth",
			block: "start",
		});
	} catch (err) {
		setStatus((err as Error).message || "Unable to start.", "warn");
	}
});

btnStopTest.addEventListener("click", () => {
	stopTimer();
	currentQuestion = null;
	questionQueue = [];
	questionIndex = 0;
	resetLiveDisplay();
});

btnReplay.addEventListener("click", () => {
	if (!currentQuestion || !audio.isReady()) {
		return;
	}
	audio.schedulePlayback(currentQuestion);
});

btnSaveProgression.addEventListener("click", () => {
	setSaveError();
	const name = elSaveProgressionName.value.trim();
	if (!name) {
		setSaveError("Enter a progression name before saving.");
		return;
	}
	const result = buildCustomPresetFromSetup(name);
	if (!result.preset) {
		setSaveError(result.error || "Unable to save progression.");
		return;
	}
	const preset = result.preset;
	const existingIndex = customProgressions.findIndex(
		(item) => item.name === preset.name,
	);
	if (existingIndex >= 0) {
		customProgressions[existingIndex] = {
			...preset,
			id: customProgressions[existingIndex].id,
		};
	} else {
		customProgressions.push(preset);
	}
	saveCustomProgressions(customProgressions);
	activeProgressionName = preset.name;
	renderProgressionList();
	setSaveError();
});

elSaveProgressionName.addEventListener("input", () => {
	setSaveError();
});

btnAddChord.addEventListener("click", () => {
	addProgressionRow();
	markProgressionCustom();
});

document.querySelectorAll<HTMLInputElement>("input[name='mode']").forEach(
	(radio) => {
		radio.addEventListener("change", updateModeUI);
	},
);

// Init
loadDefaultProgression();
renderMode2Rows();
initVelocityControls();
customProgressions = loadCustomProgressions();
renderProgressionList();
void loadTuneProgressions().then(() => {
	renderProgressionList();
});
updateModeUI();
resetLiveDisplay();
updateRecordsTabs();
updateStatsToggle();
renderRecords();
