import {
	CHORD_QUALITIES,
	DEFAULT_MODE1,
	type ChordQuality,
} from "../core/constants.js";
import type {
	ProgressionPreset,
	ProgressionChordPreset,
} from "../core/progressions.js";
import * as theory from "../core/theory.js";
import { dom } from "./dom.js";
import { state, CUSTOM_PROGRESSION_NAME } from "./state.js";
import type {
	ActiveMode,
	AmbienceMode,
	BuildPresetResult,
	DroneChordConfig,
	DurationMode,
	Mode1Config,
	Mode2Config,
	PlaybackMode,
} from "./types.js";

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
	select.value = selectedValue || (CHORD_QUALITIES[0] ?? "maj7");
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

export const getPlaybackMode = (): PlaybackMode => {
	const checked = document.querySelector<HTMLInputElement>(
		"input[name='playbackMode']:checked",
	);
	return (checked?.value as PlaybackMode) || "ambience";
};

export const getAmbienceMode = (): AmbienceMode => {
	const checked = document.querySelector<HTMLInputElement>(
		"input[name='ambienceMode']:checked",
	);
	return (checked?.value as AmbienceMode) || "breathing";
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

export const addProgressionRow = (
	data?: Partial<DroneChordConfig>,
): void => {
	const clone = dom.elChordTemplate.content.cloneNode(true) as DocumentFragment;
	const row = clone.querySelector(".progression-row") as HTMLDivElement | null;
	if (!row) {
		return;
	}
	const degreeInput = row.querySelector(".chord-degree") as HTMLInputElement;
	const qualitySelect = row.querySelector(
		".chord-quality",
	) as HTMLSelectElement;
	const durationMode = row.querySelector(
		".duration-mode",
	) as HTMLSelectElement;
	const durationValue = row.querySelector(
		".duration-value",
	) as HTMLInputElement;
	const durationDiv = row.querySelector(
		".duration-div",
	) as HTMLSelectElement;
	const removeBtn = row.querySelector(".remove-chord") as HTMLButtonElement;

	degreeInput.value = data?.chordDegree || "1";
	populateQualitySelect(
		qualitySelect,
		(data?.quality || CHORD_QUALITIES[0] || "maj7") as ChordQuality,
	);
	const initialMode = data?.durationMode || "x";
	const initialValue = data?.durationValue || 1;
	durationMode.value = initialMode;
	durationValue.value = String(initialMode === "x" ? initialValue : 1);
	durationDiv.value = String(initialMode === "/" ? initialValue : 2);

	const syncDurationInputs = (): void => {
		const isDivide = durationMode.value === "/";
		durationValue.classList.toggle("hidden", isDivide);
		durationDiv.classList.toggle("hidden", !isDivide);
	};
	syncDurationInputs();

	degreeInput.addEventListener("input", markProgressionCustom);
	qualitySelect.addEventListener("change", markProgressionCustom);
	durationMode.addEventListener("change", () => {
		syncDurationInputs();
		markProgressionCustom();
	});
	durationValue.addEventListener("input", markProgressionCustom);
	durationDiv.addEventListener("change", markProgressionCustom);

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
		const toggleLabel = row.querySelector(
			".toggle-label",
		) as HTMLSpanElement;

		toggle.checked = true;
		toggleLabel.textContent = quality;

		const syncRowState = (): void => {
			const enabled = toggle.checked;
			row.classList.toggle("is-disabled", !enabled);
		};

		toggle.addEventListener("change", syncRowState);
		syncRowState();

		dom.elMode2Rows.appendChild(clone);
	});
};

export const readMinRootSetting = (): {
	minRootNote: string;
	minRootMidi: number;
} => {
	const minRootNote = dom.elMinRootInput.value.trim();
	if (!minRootNote) {
		throw new Error("Enter a minimum chord root (e.g., G2). ");
	}
	const minRootMidi = theory.noteWithOctaveToMidi(minRootNote);
	return { minRootNote, minRootMidi };
};

export const readMode1Config = (): Mode1Config => {
	const { minRootNote, minRootMidi } = readMinRootSetting();
	const loopForever = dom.elLoopForeverToggle.checked;
	const loopTimesRaw = Number(dom.elLoopTimesInput.value || 1);
	if (!loopForever && (!Number.isFinite(loopTimesRaw) || loopTimesRaw < 1)) {
		throw new Error("Loop times must be at least 1.");
	}
	const loopTimes =
		Number.isFinite(loopTimesRaw) && loopTimesRaw >= 1
			? Math.floor(loopTimesRaw)
			: 1;
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
		dom.elProgressionRows.querySelectorAll<HTMLDivElement>(".progression-row"),
	);
	if (!rows.length) {
		throw new Error("Add at least one chord to the progression.");
	}

	let slashUnits = 0;
	const progression: DroneChordConfig[] = rows.map((row) => {
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
		const durationMode = (
			row.querySelector(".duration-mode") as HTMLSelectElement
		).value as DurationMode;
		const durationValueInput = row.querySelector(
			".duration-value",
		) as HTMLInputElement | null;
		const durationDivInput = row.querySelector(
			".duration-div",
		) as HTMLSelectElement | null;
		const durationValueRaw =
			durationMode === "/"
				? Number(durationDivInput?.value || 2)
				: Number(durationValueInput?.value || 1);
		if (!Number.isFinite(durationValueRaw) || durationValueRaw < 1) {
			throw new Error("Duration must be at least 1.");
		}
		if (durationMode === "/" && ![2, 4].includes(durationValueRaw)) {
			throw new Error("Slash duration must be /2 or /4.");
		}
		if (durationMode === "/") {
			slashUnits += durationValueRaw === 2 ? 2 : 1;
		} else if (slashUnits % 4 !== 0) {
			throw new Error(
				"Slash durations must add up to a full bar before a normal chord.",
			);
		} else {
			slashUnits = 0;
		}
		return {
			chordDegree: degree,
			quality,
			allowedUpperDegrees: [],
			questions: Math.floor(durationValueRaw),
			durationMode,
			durationValue: Math.floor(durationValueRaw),
		};
	});
	if (slashUnits % 4 !== 0) {
		throw new Error(
			"Slash durations must add up to a full bar before the progression ends.",
		);
	}

	return {
		keyCenter,
		progression,
		minRootNote,
		minRootMidi,
		loopTimes,
		loopForever,
		loopKeyShift: Math.trunc(loopShiftRaw),
	};
};

export const readMode2Config = (): Mode2Config => {
	const { minRootNote, minRootMidi } = readMinRootSetting();
	const totalQuestions = Number(
		(document.getElementById("mode2Questions") as HTMLInputElement).value || 1,
	);
	if (!Number.isFinite(totalQuestions) || totalQuestions < 1) {
		throw new Error("Questions per test must be at least 1.");
	}
	const enabledQualities: ChordQuality[] = [];
	dom.elMode2Rows
		.querySelectorAll<HTMLDivElement>(".mode2-row")
		.forEach((row) => {
			const quality = row.dataset.quality as ChordQuality;
			const toggle = row.querySelector<HTMLInputElement>(".mode2-enable");
			if (!quality || !toggle) {
				return;
			}
			if (!toggle.checked) {
				return;
			}
			enabledQualities.push(quality);
		});
	if (!enabledQualities.length) {
		throw new Error("Select at least one chord quality for Mode 2.");
	}
	return {
		totalQuestions: Math.floor(totalQuestions),
		enabledQualities,
		minRootNote,
		minRootMidi,
	};
};

export const defaultScaleIdForQuality = (quality: ChordQuality): string => {
	switch (quality) {
		case "maj7":
			return "ionian";
		case "m7":
			return "dorian";
		case "7":
			return "mixolydian";
		case "m7b5":
			return "locrian";
		case "dim7":
			return "locrian";
		case "mmaj7":
			return "melodic minor";
		case "+":
			return "lydian";
		default:
			return "ionian";
	}
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
		addProgressionRow({
			chordDegree: chord.chordDegree,
			quality: chord.quality,
			durationMode: chord.durationMode || "x",
			durationValue: Math.max(1, chord.durationValue || 1),
		});
	});
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
		dom.elProgressionRows.querySelectorAll<HTMLDivElement>(".progression-row"),
	);
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
		const durationMode = (
			row.querySelector(".duration-mode") as HTMLSelectElement
		).value as DurationMode;
		const durationValueInput = row.querySelector(
			".duration-value",
		) as HTMLInputElement | null;
		const durationDivInput = row.querySelector(
			".duration-div",
		) as HTMLSelectElement | null;
		const durationValueRaw =
			durationMode === "/"
				? Number(durationDivInput?.value || 2)
				: Number(durationValueInput?.value || 1);
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
		if (durationMode === "/" && ![2, 4].includes(durationValueRaw)) {
			return { preset: null, error: "Duration / must be 2 or 4." };
		}
		const scaleId = defaultScaleIdForQuality(quality);

		chords.push({
			chordDegree: degree,
			quality,
			scaleId,
			durationMode,
			durationValue:
				Number.isFinite(durationValueRaw) && durationValueRaw >= 1
					? Math.floor(durationValueRaw)
					: 1,
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
