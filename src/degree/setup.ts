import {
	CHORD_QUALITIES,
	DEFAULT_MODE1,
	type ChordConfig,
	type ChordQuality,
} from "../core/constants.js";
import { SCALE_OPTIONS } from "../core/scales.js";
import type {
	ProgressionPreset,
	ProgressionChordPreset,
} from "../core/progressions.js";
import * as theory from "../core/theory.js";
import { dom } from "./dom.js";
import { state, CUSTOM_PROGRESSION_NAME } from "./state.js";
import {
	detectScaleId,
	getMode2DefaultDegrees,
	isScaleId,
	scaleById,
} from "./scales.js";
import { slugify } from "./utils.js";
import type {
	ActiveMode,
	BuildPresetResult,
	Mode1Config,
	Mode2Config,
} from "./types.js";

const populateScaleSelect = (
	select: HTMLSelectElement,
	selectedId: string,
): void => {
	select.innerHTML = "";

	const customOption = document.createElement("option");
	customOption.value = "custom";
	customOption.textContent = "Custom";
	select.appendChild(customOption);

	SCALE_OPTIONS.forEach((option) => {
		const opt = document.createElement("option");
		opt.value = option.id;
		opt.textContent = option.label;
		select.appendChild(opt);
	});

	select.value = selectedId;
	if (!select.value) {
		select.value = "custom";
	}
};

const populateQualitySelect = (
	select: HTMLSelectElement,
	selectedValue: string,
): void => {
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
};

const wireScaleControls = (
	select: HTMLSelectElement,
	input: HTMLInputElement,
): void => {
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

export const setSaveError = (message = ""): void => {
	const trimmed = message.trim();
	if (!trimmed) {
		dom.elSaveProgressionError.textContent = "";
		dom.elSaveProgressionError.classList.add("hidden");
		return;
	}
	dom.elSaveProgressionError.textContent = trimmed;
	dom.elSaveProgressionError.classList.remove("hidden");
};

export const updateSaveControlsVisibility = (mode: ActiveMode): void => {
	if (mode === "mode1") {
		dom.elSaveProgressionControls.classList.remove("hidden");
	} else {
		dom.elSaveProgressionControls.classList.add("hidden");
		setSaveError();
	}
};

export const markProgressionCustom = (): void => {
	state.activeProgressionName = CUSTOM_PROGRESSION_NAME;
};

export const addProgressionRow = (data?: ChordConfig): void => {
	const clone = dom.elChordTemplate.content.cloneNode(true) as DocumentFragment;
	const row = clone.querySelector(".progression-row") as HTMLDivElement | null;
	if (!row) {
		return;
	}
	const degreeSelect = row.querySelector(".chord-degree") as HTMLInputElement;
	const qualitySelect = row.querySelector(
		".chord-quality",
	) as HTMLSelectElement;
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

	degreeSelect.addEventListener("input", markProgressionCustom);
	qualitySelect.addEventListener("change", markProgressionCustom);

	removeBtn.addEventListener("click", () => {
		row.remove();
		markProgressionCustom();
	});

	dom.elProgressionRows.appendChild(clone);
};

export const loadDefaultProgression = (
	defaultPreset?: ProgressionPreset,
): void => {
	if (defaultPreset) {
		applyProgressionPreset(defaultPreset);
		return;
	}

	dom.elProgressionRows.innerHTML = "";
	DEFAULT_MODE1.progression.forEach((chord) => addProgressionRow(chord));
	dom.elKeyInput.value = DEFAULT_MODE1.keyCenter;
	markProgressionCustom();
};

export const renderMode2Rows = (): void => {
	dom.elMode2Rows.innerHTML = "";

	CHORD_QUALITIES.forEach((quality) => {
		const clone = dom.elMode2Template.content.cloneNode(
			true,
		) as DocumentFragment;
		const row = clone.querySelector(".mode2-row") as HTMLDivElement | null;
		if (!row) {
			return;
		}
		row.dataset.quality = quality;

		const toggle = row.querySelector(".mode2-enable") as HTMLInputElement;
		const toggleLabel = row.querySelector(".toggle-label") as HTMLSpanElement;
		const scaleSelect = row.querySelector(
			".mode2-scale",
		) as HTMLSelectElement;
		const degreesInput = row.querySelector(
			".mode2-degrees",
		) as HTMLInputElement;

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

		dom.elMode2Rows.appendChild(clone);
	});
};

export const getMode = (): ActiveMode => {
	const checked = document.querySelector<HTMLInputElement>(
		"input[name='mode']:checked",
	);
	if (!checked) {
		throw new Error("Select a mode before starting.");
	}
	return checked.value as ActiveMode;
};

export const showModePanels = (mode: ActiveMode): void => {
	state.activeMode = mode;
	if (mode === "mode1") {
		dom.elMode1.classList.remove("hidden");
		dom.elMode2.classList.add("hidden");
	} else {
		dom.elMode1.classList.add("hidden");
		dom.elMode2.classList.remove("hidden");
	}
	updateSaveControlsVisibility(mode);
};

export const readMinRootSetting = (): {
	minRootNote: string;
	minRootMidi: number;
} => {
	const minRootNote = dom.elMinRootInput.value.trim();
	if (!minRootNote) {
		throw new Error("Enter a minimum chord root (e.g., G2).");
	}
	const minRootMidi = theory.noteWithOctaveToMidi(minRootNote);
	return { minRootNote, minRootMidi };
};

export const readMode1Config = (): Mode1Config => {
	const { minRootNote, minRootMidi } = readMinRootSetting();
	const loopTimes = Number(dom.elLoopTimesInput.value || 1);
	if (!Number.isFinite(loopTimes) || loopTimes < 1) {
		throw new Error("Loop times must be at least 1.");
	}
	const loopShiftRaw = Number(dom.elLoopShiftInput.value || 0);
	if (!Number.isFinite(loopShiftRaw) || !Number.isInteger(loopShiftRaw)) {
		throw new Error("Key shift per loop must be a whole number.");
	}
	const keyCenter = dom.elKeyInput.value.trim();
	if (!keyCenter) {
		throw new Error("Enter a key center.");
	}
	theory.noteNameToPitchClassSemitones(keyCenter);

	const rows = Array.from(
		dom.elProgressionRows.querySelectorAll(".progression-row"),
	) as HTMLDivElement[];
	if (!rows.length) {
		throw new Error("Add at least one chord to the progression.");
	}

	const progression = rows.map((row) => {
		const degree = (
			row.querySelector(".chord-degree") as HTMLInputElement
		).value.trim();
		if (!degree) {
			throw new Error("Chord degree cannot be empty.");
		}
		theory.parseDegreeToSemitones(degree);
		const quality = (
			row.querySelector(".chord-quality") as HTMLSelectElement
		).value as ChordQuality;
		const allowedText = (
			row.querySelector(".upper-degrees") as HTMLInputElement
		).value;
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

export const readMode2Config = (): Mode2Config => {
	const { minRootNote, minRootMidi } = readMinRootSetting();
	const mode2Input = document.getElementById(
		"mode2Questions",
	) as HTMLInputElement | null;
	const totalQuestions = Number(mode2Input?.value || 1);
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
		dom.elMode2Rows.querySelectorAll(".mode2-row"),
	) as HTMLDivElement[];
	rows.forEach((row) => {
		const quality = row.dataset.quality as ChordQuality | undefined;
		if (!quality) {
			return;
		}
		const toggle = row.querySelector(".mode2-enable") as HTMLInputElement;
		const degreesInput = row.querySelector(
			".mode2-degrees",
		) as HTMLInputElement;
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
};

export const buildCustomPresetFromSetup = (
	name: string,
): BuildPresetResult => {
	const mode = getMode();
	if (mode !== "mode1") {
		return {
			preset: null,
			error: "Switch to Mode 1 to save a progression.",
		};
	}

	const keyCenter = dom.elKeyInput.value.trim();
	if (!keyCenter) {
		return { preset: null, error: "Enter a key center before saving." };
	}
	try {
		theory.noteNameToPitchClassSemitones(keyCenter);
	} catch {
		return { preset: null, error: "Key center is invalid." };
	}

	const rows = Array.from(
		dom.elProgressionRows.querySelectorAll(".progression-row"),
	) as HTMLDivElement[];
	if (!rows.length) {
		return { preset: null, error: "Add at least one chord before saving." };
	}

	const chords: ProgressionChordPreset[] = [];
	for (const row of rows) {
		const degree = (
			row.querySelector(".chord-degree") as HTMLInputElement
		).value.trim();
		const quality = (
			row.querySelector(".chord-quality") as HTMLSelectElement
		).value as ChordQuality;
		const scaleSelect = row.querySelector(
			".scale-select",
		) as HTMLSelectElement;
		const scaleId = scaleSelect.value;
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
			durationMode: "x",
			durationValue: 1,
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
};

export const applyProgressionPreset = (
	preset: ProgressionPreset,
	onModeChange?: () => void,
): void => {
	const mode1Radio = document.querySelector<HTMLInputElement>(
		"input[name='mode'][value='mode1']",
	);
	if (mode1Radio) {
		mode1Radio.checked = true;
	}
	showModePanels("mode1");
	onModeChange?.();
	dom.elKeyInput.value = preset.defaultKey;
	dom.elProgressionRows.innerHTML = "";
	state.activeProgressionName = preset.name;

	preset.chords.forEach((chord) => {
		const scaleOption = scaleById[chord.scaleId];
		const allowedUpperDegrees = scaleOption
			? scaleOption.tokens
			: theory.parseDegreeList("1 2 3 4 5 6 7");
		addProgressionRow({
			chordDegree: chord.chordDegree,
			quality: chord.quality,
			allowedUpperDegrees,
			questions: 1,
		});
	});
};
