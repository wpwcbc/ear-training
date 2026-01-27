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

declare const Tone: any;

type ActiveMode = "mode1" | "mode2";

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

interface DroneQueueEvent {
	mode: ActiveMode;
	keyCenter: string | null;
	quality: ChordQuality;
	chordDegree?: string;
	chordRoot?: string;
	chordIndex: number;
	chordCount: number;
}

interface BuildPresetResult {
	preset: ProgressionPreset | null;
	error: string | null;
}

interface VelocitySettings {
	root: number;
	fifth: number;
	seventh: number;
	third: number;
	lead: number;
}

interface AudioState {
	chordSynth: any;
	audioReady: boolean;
	activeNotes: string[];
}

const STORAGE_KEYS = {
	velocityMix: "eartrain:velocityMix",
	customProgressions: "eartrain:customProgressions",
};

const MODE2_DEFAULT_DEGREES: Partial<Record<ChordQuality, string>> = {
	maj7: "1 2 3 #4 5 6 7",
	m7: "1 2 b3 4 5 6 b7",
	"7": "1 2 3 4 5 6 b7",
	m7b5: "1 b2 b3 4 b5 b6 b7",
	dim7: "1 b2 b3 4 b5 b6 bb7",
	mmaj7: "1 2 b3 4 5 6 7",
	"+": "1 2 3 #4 #5 6 7",
};
const DEFAULT_DEGREE_TEXT = "1 2 3 4 5 6 7";

const audioState: AudioState = {
	chordSynth: null,
	audioReady: false,
	activeNotes: [],
};

const getById = <T extends HTMLElement>(id: string): T => {
	const el = document.getElementById(id);
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
const elSaveProgressionName: HTMLInputElement = getById("saveProgressionName");
const elSaveProgressionError: HTMLParagraphElement = getById(
	"saveProgressionError",
);
const elSaveProgressionControls: HTMLDivElement = getById(
	"saveProgressionControls",
);
const elProgressionList: HTMLDivElement = getById("progressionList");

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

const elDroneKeyLabel: HTMLSpanElement = getById("droneKeyLabel");
const elDroneChordLabel: HTMLSpanElement = getById("droneChordLabel");
const elDroneTonicLabel: HTMLSpanElement = getById("droneTonicLabel");
const elDroneNextLabel: HTMLSpanElement = getById("droneNextLabel");
const elDroneNextTonicLabel: HTMLSpanElement = getById("droneNextTonicLabel");
const elDroneProgressLabel: HTMLSpanElement = getById("droneProgressLabel");
const elDroneStatus: HTMLDivElement = getById("droneStatus");

const btnStartAudio: HTMLButtonElement = getById("btnStartAudio");
const btnStartDrone: HTMLButtonElement = getById("btnStartDrone");
const btnStopDrone: HTMLButtonElement = getById("btnStopDrone");
const btnNextChord: HTMLButtonElement = getById("btnNextChord");
const btnAddChord: HTMLButtonElement = getById("btnAddChord");
const btnSaveProgression: HTMLButtonElement = getById("btnSaveProgression");

let activeMode: ActiveMode = "mode1";
let activeProgressionName = "Custom progression";
let questionQueue: DroneQueueEvent[] = [];
let questionIndex = 0;
let lastMode1Config: Mode1Config | null = null;
let lastMode2Config: Mode2Config | null = null;
let customProgressions: ProgressionPreset[] = [];
let tuneProgressions: ProgressionPreset[] = [];

const clampVelocity = (value: number, fallback: number): number => {
	if (!Number.isFinite(value)) {
		return fallback;
	}
	return Math.min(1, Math.max(0, value));
};

const formatVelocity = (value: number): string => clampVelocity(value, 0).toFixed(2);

const readVelocity = (input: HTMLInputElement, fallback: number): number =>
	clampVelocity(Number(input.value), fallback);

const loadVelocitySettings = (): VelocitySettings => {
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
		return {
			root: clampVelocity(parsed.root ?? defaults.root, defaults.root),
			fifth: clampVelocity(parsed.fifth ?? defaults.fifth, defaults.fifth),
			seventh: clampVelocity(parsed.seventh ?? defaults.seventh, defaults.seventh),
			third: clampVelocity(parsed.third ?? defaults.third, defaults.third),
			lead: clampVelocity(parsed.lead ?? defaults.lead, defaults.lead),
		};
	} catch {
		return defaults;
	}
};

const collectVelocitySettings = (): VelocitySettings => ({
	root: readVelocity(elVelocityRoot, CHORD_VOICE_VELOCITIES.root),
	fifth: readVelocity(elVelocityFifth, CHORD_VOICE_VELOCITIES.fifth),
	seventh: readVelocity(elVelocitySeventh, CHORD_VOICE_VELOCITIES.seventh),
	third: readVelocity(elVelocityThird, CHORD_VOICE_VELOCITIES.third),
	lead: readVelocity(elVelocityLead, LEAD_VELOCITY_DEFAULT),
});

const saveVelocitySettings = (): void => {
	const settings = collectVelocitySettings();
	localStorage.setItem(STORAGE_KEYS.velocityMix, JSON.stringify(settings));
};

const initVelocityControls = (): void => {
	const saved = loadVelocitySettings();
	const items = [
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
	] as const;

	items.forEach((item) => {
		const initial = saved[item.key] ?? item.defaultValue;
		item.input.value = String(initial);
		item.label.textContent = formatVelocity(initial);
		item.input.addEventListener("input", () => {
			item.label.textContent = formatVelocity(Number(item.input.value));
			saveVelocitySettings();
		});
	});
};

const getMode = (): ActiveMode => {
	const checked = document.querySelector<HTMLInputElement>(
		"input[name='mode']:checked",
	);
	if (!checked) {
		throw new Error("Select a mode before starting.");
	}
	return checked.value as ActiveMode;
};

const updateModeUI = (): void => {
	activeMode = getMode();
	if (activeMode === "mode1") {
		elMode1.classList.remove("hidden");
		elMode2.classList.add("hidden");
	} else {
		elMode1.classList.add("hidden");
		elMode2.classList.remove("hidden");
	}
	updateSaveControlsVisibility(activeMode);
	resetExerciseDisplay();
};

const setSaveError = (message = ""): void => {
	const trimmed = message.trim();
	if (!trimmed) {
		elSaveProgressionError.textContent = "";
		elSaveProgressionError.classList.add("hidden");
		return;
	}
	elSaveProgressionError.textContent = trimmed;
	elSaveProgressionError.classList.remove("hidden");
};

const updateSaveControlsVisibility = (mode: ActiveMode): void => {
	if (mode === "mode1") {
		elSaveProgressionControls.classList.remove("hidden");
	} else {
		elSaveProgressionControls.classList.add("hidden");
		setSaveError();
	}
};

const tokensMatch = (a: string[], b: string[]): boolean => {
	if (a.length !== b.length) {
		return false;
	}
	return a.every((token, index) => token === b[index]);
};

const detectScaleId = (degreesText: string): string => {
	try {
		const tokens = theory.parseDegreeList(degreesText);
		const match = resolvedScaleOptions.find((option) =>
			tokensMatch(tokens, option.tokens),
		);
		return match ? match.id : "custom";
	} catch {
		return "custom";
	}
};

const populateScaleSelect = (select: HTMLSelectElement, selectedId: string): void => {
	select.innerHTML = "";
	const customOption = document.createElement("option");
	customOption.value = "custom";
	customOption.textContent = "Custom";
	select.appendChild(customOption);
	resolvedScaleOptions.forEach((option) => {
		const opt = document.createElement("option");
		opt.value = option.id;
		opt.textContent = option.label;
		select.appendChild(opt);
	});
	select.value = selectedId || "custom";
	if (!select.value) {
		select.value = "custom";
	}
};

const populateQualitySelect = (select: HTMLSelectElement, selectedValue: ChordQuality): void => {
	select.innerHTML = "";
	CHORD_QUALITIES.forEach((quality) => {
		const opt = document.createElement("option");
		opt.value = quality;
		opt.textContent = quality;
		select.appendChild(opt);
	});
	select.value = selectedValue || (CHORD_QUALITIES[0] ?? "maj7");
};

const wireScaleControls = (select: HTMLSelectElement, input: HTMLInputElement): void => {
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
};

const getMode2DefaultDegrees = (quality: ChordQuality): string =>
	MODE2_DEFAULT_DEGREES[quality] ?? DEFAULT_DEGREE_TEXT;

const readMinRootSetting = (): { minRootNote: string; minRootMidi: number } => {
	const minRootNote = elMinRootInput.value.trim();
	if (!minRootNote) {
		throw new Error("Enter a minimum chord root (e.g., G2). ");
	}
	const minRootMidi = theory.noteWithOctaveToMidi(minRootNote);
	return { minRootNote, minRootMidi };
};

const readMode1Config = (): Mode1Config => {
	const { minRootNote, minRootMidi } = readMinRootSetting();
	const loopTimes = Number(elLoopTimesInput.value || 1);
	if (!Number.isFinite(loopTimes) || loopTimes < 1) {
		throw new Error("Loop times must be at least 1.");
	}
	const loopShiftRaw = Number(elLoopShiftInput.value || 0);
	if (!Number.isFinite(loopShiftRaw) || !Number.isInteger(loopShiftRaw)) {
		throw new Error("Key shift per loop must be a whole number.");
	}
	const keyCenter = elKeyInput.value.trim();
	if (!keyCenter) {
		throw new Error("Enter a key center.");
	}
	theory.noteNameToPitchClassSemitones(keyCenter);

	const rows = Array.from(
		elProgressionRows.querySelectorAll<HTMLDivElement>(".progression-row"),
	);
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
		const allowedUpperDegrees = theory.parseDegreeList(allowedText);
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
};

const readMode2Config = (): Mode2Config => {
	const { minRootNote, minRootMidi } = readMinRootSetting();
	const totalQuestions = Number(
		(document.getElementById("mode2Questions") as HTMLInputElement).value || 1,
	);
	if (!Number.isFinite(totalQuestions) || totalQuestions < 1) {
		throw new Error("Questions per test must be at least 1.");
	}
	const allowedByQuality: Record<ChordQuality, string[]> = {} as Record<
		ChordQuality,
		string[]
	>;
	const enabledQualities: ChordQuality[] = [];
	elMode2Rows.querySelectorAll<HTMLDivElement>(".mode2-row").forEach((row) => {
		const quality = row.dataset.quality as ChordQuality;
		const toggle = row.querySelector<HTMLInputElement>(".mode2-enable");
		const degreesInput = row.querySelector<HTMLInputElement>(".mode2-degrees");
		if (!quality || !toggle || !degreesInput) {
			return;
		}
		if (!toggle.checked) {
			return;
		}
		enabledQualities.push(quality);
		allowedByQuality[quality] = theory.parseDegreeList(degreesInput.value);
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
};

const buildMode1Queue = (config: Mode1Config): DroneQueueEvent[] => {
	const queue: DroneQueueEvent[] = [];
	const totalChords = config.progression.reduce(
		(sum, chord) => sum + Math.max(1, chord.questions),
		0,
	);
	for (let loopIndex = 0; loopIndex < config.loopTimes; loopIndex += 1) {
		const shiftedKey =
			loopIndex === 0 || config.loopKeyShift === 0
				? config.keyCenter
				: theory.transposeKeyCenter(
						config.keyCenter,
						config.loopKeyShift * loopIndex,
					);
		let chordIndex = 0;
		config.progression.forEach((chord) => {
			const repeats = Math.max(1, chord.questions);
			for (let i = 0; i < repeats; i += 1) {
				queue.push({
					mode: "mode1",
					keyCenter: shiftedKey,
					quality: chord.quality,
					chordDegree: chord.chordDegree,
					chordIndex,
					chordCount: totalChords,
				});
				chordIndex += 1;
			}
		});
	}
	return queue;
};

const buildMode2Queue = (config: Mode2Config): DroneQueueEvent[] => {
	const queue: DroneQueueEvent[] = [];
	for (let i = 0; i < config.totalQuestions; i += 1) {
		const quality = theory.pickRandom(config.enabledQualities);
		const chordRoot = theory.pickRandom(RANDOM_ROOTS);
		queue.push({
			mode: "mode2",
			keyCenter: null,
			quality,
			chordRoot,
			chordIndex: i,
			chordCount: config.totalQuestions,
		});
	}
	return queue;
};

const setStatus = (message: string, state: "ok" | "warn" | "" = ""): void => {
	elDroneStatus.textContent = message;
	if (state) {
		elDroneStatus.dataset.state = state;
	} else {
		delete elDroneStatus.dataset.state;
	}
};

const resetExerciseDisplay = (): void => {
	elDroneKeyLabel.textContent = "-";
	elDroneChordLabel.textContent = "-";
	elDroneTonicLabel.textContent = "-";
	elDroneNextLabel.textContent = "-";
	elDroneNextTonicLabel.textContent = "-";
	elDroneProgressLabel.textContent = "-";
	setStatus("Configure a progression and press Start.");
	btnNextChord.disabled = true;
};

const getChordDisplay = (event: DroneQueueEvent): string => {
	if (event.mode === "mode1") {
		return `${event.chordDegree} ${event.quality}`;
	}
	return `${event.chordRoot} ${event.quality}`;
};

const buildChordNotes = (
	event: DroneQueueEvent,
	minRootMidi: number,
): { notes: string[]; tonicName: string } => {
	let chordRootMidi = 0;
	let chordTonicName = "";

	if (event.mode === "mode1") {
		const keyCenter = event.keyCenter || "C";
		chordRootMidi = theory.computeChordRootMidiFromKey(
			keyCenter,
			event.chordDegree || "1",
			1,
		);
		chordRootMidi = theory.clampRootMidiToMin(chordRootMidi, minRootMidi);
		const keyPc = theory.noteNameToPitchClassSemitones(keyCenter);
		const offset = theory.parseDegreeToSemitones(event.chordDegree || "1");
		chordTonicName = theory.pcToNameSharp(keyPc + offset);
	} else {
		chordRootMidi = theory.computeChordRootMidiFromNote(
			event.chordRoot || "C",
			1,
		);
		chordRootMidi = theory.clampRootMidiToMin(chordRootMidi, minRootMidi);
		chordTonicName = event.chordRoot || "C";
	}

	const intervals = theory.buildChordIntervals(event.quality);
	const chordMidis = theory.buildChordVoicing(chordRootMidi, intervals);
	return {
		notes: chordMidis.map(theory.midiToNoteNameSharp),
		tonicName: chordTonicName,
	};
};

const ensureAudioReady = async (): Promise<void> => {
	if (audioState.audioReady) {
		return;
	}
	await Tone.start();
	audioState.chordSynth = new Tone.PolySynth(Tone.Synth, {
		oscillator: { type: "triangle" },
		envelope: {
			attack: 0.01,
			decay: 0.1,
			sustain: 0.9,
			release: 1.2,
		},
	}).toDestination();
	audioState.chordSynth.volume.value = -8;
	audioState.audioReady = true;
};

const stopChord = (): void => {
	if (!audioState.audioReady || !audioState.chordSynth) {
		return;
	}
	if (audioState.activeNotes.length) {
		audioState.chordSynth.triggerRelease(audioState.activeNotes);
		audioState.activeNotes = [];
	}
};

const playChord = (notes: string[], velocities: number[]): void => {
	if (!audioState.audioReady || !audioState.chordSynth) {
		return;
	}
	stopChord();
	audioState.activeNotes = notes;
	notes.forEach((note, index) => {
		const velocity = velocities[index] ?? 0.8;
		audioState.chordSynth.triggerAttack(note, undefined, velocity);
	});
};

const renderProgressionList = (): void => {
	elProgressionList.innerHTML = "";
	const allPresets = [...PROGRESSION_PRESETS, ...tuneProgressions, ...customProgressions];

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

		const matches = allPresets.filter((preset) => preset.category === category.id);

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
				btn.addEventListener("click", () => applyProgressionPreset(preset));
				card.appendChild(btn);

				if (category.id === "Customs") {
					const actions = document.createElement("div");
					actions.className = "progression-card-actions";

					const exportBtn = document.createElement("button");
					exportBtn.type = "button";
					exportBtn.className = "progression-action";
					exportBtn.textContent = "Export";
					exportBtn.addEventListener("click", () => downloadPreset(preset));

					const deleteBtn = document.createElement("button");
					deleteBtn.type = "button";
					deleteBtn.className = "progression-action danger";
					deleteBtn.textContent = "Delete";
					deleteBtn.addEventListener("click", () => handleDeleteCustom(preset.id));

					actions.append(exportBtn, deleteBtn);
					card.appendChild(actions);
				}

				items.appendChild(card);
			});
		}

		group.appendChild(items);
		elProgressionList.appendChild(group);
	});
};

const addProgressionRow = (data?: ChordConfig): void => {
	const clone = elChordTemplate.content.cloneNode(true) as DocumentFragment;
	const row = clone.querySelector(".progression-row") as HTMLDivElement | null;
	if (!row) {
		return;
	}
	const degreeInput = row.querySelector(".chord-degree") as HTMLInputElement;
	const qualitySelect = row.querySelector(".chord-quality") as HTMLSelectElement;
	const scaleSelect = row.querySelector(".scale-select") as HTMLSelectElement;
	const degreesInput = row.querySelector(".upper-degrees") as HTMLInputElement;
	const questionsInput = row.querySelector(".question-count") as HTMLInputElement;
	const removeBtn = row.querySelector(".remove-chord") as HTMLButtonElement;

	degreeInput.value = data?.chordDegree || "1";
	populateQualitySelect(
		qualitySelect,
		(data?.quality || CHORD_QUALITIES[0] || "maj7") as ChordQuality,
	);
	degreesInput.value = data?.allowedUpperDegrees
		? data.allowedUpperDegrees.join(" ")
		: "1 2 3 4 5 6 7";
	questionsInput.value = String(data?.questions || 1);

	const selectedScaleId = detectScaleId(degreesInput.value);
	populateScaleSelect(scaleSelect, selectedScaleId);
	wireScaleControls(scaleSelect, degreesInput);

	degreeInput.addEventListener("input", () => markProgressionCustom());
	qualitySelect.addEventListener("change", () => markProgressionCustom());

	removeBtn.addEventListener("click", () => {
		row.remove();
		markProgressionCustom();
	});

	elProgressionRows.appendChild(clone);
};

const loadDefaultProgression = (): void => {
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
};

const renderMode2Rows = (): void => {
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
};

const markProgressionCustom = (): void => {
	activeProgressionName = "Custom progression";
};

const isScaleId = (value: string): boolean => Boolean(scaleById[value]);

const applyProgressionPreset = (preset: ProgressionPreset): void => {
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
};

const buildCustomPresetFromSetup = (name: string): BuildPresetResult => {
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
		elProgressionRows.querySelectorAll<HTMLDivElement>(".progression-row"),
	);
	if (!rows.length) {
		return { preset: null, error: "Add at least one chord before saving." };
	}

	const chords: ProgressionChordPreset[] = [];
	for (const row of rows) {
		const degree = (row.querySelector(".chord-degree") as HTMLInputElement)
			.value.trim();
		const quality = (row.querySelector(".chord-quality") as HTMLSelectElement)
			.value as ChordQuality;
		const scaleSelect = row.querySelector(".scale-select") as HTMLSelectElement;
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

		if (!CHORD_QUALITIES.includes(quality)) {
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
			id: `custom-${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
			name,
			category: "Customs",
			defaultKey: keyCenter,
			chords,
		},
		error: null,
	};
};

const loadCustomProgressions = (): ProgressionPreset[] => {
	try {
		const raw = localStorage.getItem(STORAGE_KEYS.customProgressions);
		if (!raw) {
			return [];
		}
		const parsed = JSON.parse(raw) as ProgressionPreset[];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
};

const saveCustomProgressions = (list: ProgressionPreset[]): void => {
	localStorage.setItem(STORAGE_KEYS.customProgressions, JSON.stringify(list));
};

const downloadPreset = (preset: ProgressionPreset): void => {
	const payload = JSON.stringify(preset, null, 2);
	const blob = new Blob([payload], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `${preset.name.toLowerCase().replace(/\s+/g, "-")}.json`;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
};

const handleDeleteCustom = (id: string): void => {
	customProgressions = customProgressions.filter((preset) => preset.id !== id);
	saveCustomProgressions(customProgressions);
	renderProgressionList();
};

const normalizePreset = (
	raw: Partial<ProgressionPreset>,
	forcedCategory?: ProgressionCategory,
): ProgressionPreset | null => {
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
		const scaleId = String(chord.scaleId || "").trim();
		const questions =
			typeof chord.questions === "number" && chord.questions >= 1
				? Math.floor(chord.questions)
				: undefined;
		if (!chordDegree || !CHORD_QUALITIES.includes(quality as ChordQuality)) {
			return null;
		}
		if (!isScaleId(scaleId)) {
			return null;
		}
		try {
			theory.parseDegreeToSemitones(chordDegree);
		} catch {
			return null;
		}
		chords.push({
			chordDegree,
			quality: quality as ChordQuality,
			scaleId,
			questions,
		});
	}

	const category = forcedCategory || (raw.category as ProgressionCategory) || "Customs";
	const id = String(raw.id || "").trim() ||
		`${category.toLowerCase()}-${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;

	return {
		id,
		name,
		category,
		defaultKey,
		chords,
		description: raw.description,
	};
};

const handleImportCustom = async (input: HTMLInputElement): Promise<void> => {
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
			setSaveError("Invalid progression file.");
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
		setSaveError("Unable to import progression.");
	} finally {
		input.value = "";
	}
};

const loadTuneProgressions = async (): Promise<void> => {
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
};

const updateDisplayForIndex = (index: number, minRootMidi: number): void => {
	if (!questionQueue.length) {
		resetExerciseDisplay();
		return;
	}
	const current = questionQueue[index];
	const next = questionQueue[index + 1];

	const keyLabel = current.mode === "mode1" ? current.keyCenter || "-" : "Random";
	elDroneKeyLabel.textContent = keyLabel;
	elDroneChordLabel.textContent = getChordDisplay(current);

	const currentChord = buildChordNotes(current, minRootMidi);
	elDroneTonicLabel.textContent = currentChord.tonicName;

	if (next) {
		elDroneNextLabel.textContent = getChordDisplay(next);
		const nextChord = buildChordNotes(next, minRootMidi);
		elDroneNextTonicLabel.textContent = nextChord.tonicName;
	} else {
		elDroneNextLabel.textContent = "-";
		elDroneNextTonicLabel.textContent = "-";
	}

	elDroneProgressLabel.textContent = `${index + 1} / ${questionQueue.length}`;
};

const playIndex = (index: number, minRootMidi: number): void => {
	const event = questionQueue[index];
	const chord = buildChordNotes(event, minRootMidi);
	const velocities = collectVelocitySettings();
	playChord(chord.notes, [
		velocities.root,
		velocities.fifth,
		velocities.seventh,
		velocities.third,
	]);
	setStatus("Chord is sustaining. Click Next chord to advance.", "ok");
};

const startDrone = (config: Mode1Config | Mode2Config, mode: ActiveMode): void => {
	questionQueue =
		mode === "mode1"
			? buildMode1Queue(config as Mode1Config)
			: buildMode2Queue(config as Mode2Config);
	questionIndex = 0;
	updateDisplayForIndex(questionIndex, config.minRootMidi);
	playIndex(questionIndex, config.minRootMidi);
	btnNextChord.disabled = questionQueue.length <= 1;
};

const nextChord = (minRootMidi: number): void => {
	if (questionIndex + 1 >= questionQueue.length) {
		btnNextChord.disabled = true;
		setStatus("End of progression.", "ok");
		return;
	}
	questionIndex += 1;
	updateDisplayForIndex(questionIndex, minRootMidi);
	playIndex(questionIndex, minRootMidi);
	btnNextChord.disabled = questionIndex + 1 >= questionQueue.length;
};

btnStartAudio.addEventListener("click", async () => {
	try {
		await ensureAudioReady();
		setStatus("Audio ready. Configure your progression and press Start.", "ok");
	} catch {
		setStatus("Audio failed to start.", "warn");
	}
});

btnStartDrone.addEventListener("click", async () => {
	try {
		await ensureAudioReady();
		const mode = getMode();
		if (mode === "mode1") {
			const config = readMode1Config();
			lastMode1Config = config;
			startDrone(config, "mode1");
		} else {
			const config = readMode2Config();
			lastMode2Config = config;
			startDrone(config, "mode2");
		}
	} catch (err) {
		setStatus((err as Error).message || "Unable to start.", "warn");
	}
});

btnStopDrone.addEventListener("click", () => {
	stopChord();
	questionQueue = [];
	questionIndex = 0;
	resetExerciseDisplay();
});

btnNextChord.addEventListener("click", () => {
	if (!questionQueue.length) {
		return;
	}
	const modeConfig = activeMode === "mode1" ? lastMode1Config : lastMode2Config;
	if (!modeConfig) {
		return;
	}
	nextChord(modeConfig.minRootMidi);
});

btnAddChord.addEventListener("click", () => {
	addProgressionRow();
	markProgressionCustom();
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

elSaveProgressionName.addEventListener("input", () => setSaveError());

const updateModeConfigFromLast = (): void => {
	if (activeMode === "mode1" && lastMode1Config) {
		elLoopTimesInput.value = String(lastMode1Config.loopTimes ?? 1);
		elLoopShiftInput.value = String(lastMode1Config.loopKeyShift ?? 0);
	} else if (activeMode === "mode2" && lastMode2Config) {
		(document.getElementById("mode2Questions") as HTMLInputElement).value =
			String(lastMode2Config.totalQuestions ?? 1);
	}
};

const loadCustomProgressionsSafe = (): void => {
	customProgressions = loadCustomProgressions();
};

const init = (): void => {
	loadDefaultProgression();
	renderMode2Rows();
	initVelocityControls();
	loadCustomProgressionsSafe();
	renderProgressionList();
	void loadTuneProgressions().then(() => {
		renderProgressionList();
	});
	updateModeUI();
	resetExerciseDisplay();
	updateModeConfigFromLast();
};

const modeRadios = document.querySelectorAll<HTMLInputElement>(
	"input[name='mode']",
);
modeRadios.forEach((radio) => {
	radio.addEventListener("change", () => {
		updateModeUI();
		updateModeConfigFromLast();
	});
});

init();
