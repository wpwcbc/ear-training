import {
	PROGRESSION_PRESETS,
	PROGRESSION_CATEGORIES,
	type ProgressionPreset,
	type ProgressionCategory,
	type ProgressionChordPreset,
} from "../core/progressions.js";
import { CHORD_QUALITIES, type ChordQuality } from "../core/constants.js";
import * as theory from "../core/theory.js";
import { dom } from "./dom.js";
import { state, STORAGE_KEYS } from "./state.js";
import { resolveScaleId } from "./scales.js";
import { slugify } from "./utils.js";
import {
	applyProgressionPreset,
	buildCustomPresetFromSetup,
	setSaveError,
} from "./setup.js";

let onPresetApplied: (() => void) | undefined;

const isChordQuality = (value: string): value is ChordQuality =>
	CHORD_QUALITIES.includes(value as ChordQuality);

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
		const scaleIdRaw = String(chord.scaleId || "").trim();
		const scaleId = resolveScaleId(scaleIdRaw);
		const rawDurationMode = String(
			(chord as ProgressionChordPreset).durationMode || "",
		);
		const durationMode = rawDurationMode === "/" ? "/" : "x";
		const rawDurationValue = Number(
			(chord as ProgressionChordPreset).durationValue,
		);
		const durationValue =
			durationMode === "/"
				? rawDurationValue === 2 || rawDurationValue === 4
					? rawDurationValue
					: 2
				: Number.isFinite(rawDurationValue) && rawDurationValue >= 1
					? Math.floor(rawDurationValue)
					: 1;
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
			durationMode,
			durationValue,
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
};

const loadCustomProgressions = (): ProgressionPreset[] => {
	try {
		const raw = localStorage.getItem(STORAGE_KEYS.customProgressions);
		if (!raw) {
			return [];
		}
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			return [];
		}
		return parsed
			.map((item) => normalizePreset(item, "Customs"))
			.filter(Boolean) as ProgressionPreset[];
	} catch {
		return [];
	}
};

const saveCustomProgressions = (list: ProgressionPreset[]): void => {
	localStorage.setItem(
		STORAGE_KEYS.customProgressions,
		JSON.stringify(list),
	);
};

const getAllProgressions = (): ProgressionPreset[] => [
	...PROGRESSION_PRESETS,
	...state.tuneProgressions,
	...state.customProgressions,
];

const downloadPreset = (preset: ProgressionPreset): void => {
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
};

const handleDeleteCustom = (id: string): void => {
	state.customProgressions = state.customProgressions.filter(
		(preset) => preset.id !== id,
	);
	saveCustomProgressions(state.customProgressions);
	renderProgressionList();
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
			alert("Invalid progression file.");
			return;
		}

		imported.forEach((preset) => {
			const existingIndex = state.customProgressions.findIndex(
				(item) => item.name === preset.name,
			);
			if (existingIndex >= 0) {
				state.customProgressions[existingIndex] = {
					...preset,
					id: state.customProgressions[existingIndex].id,
				};
			} else {
				state.customProgressions.push(preset);
			}
		});
		saveCustomProgressions(state.customProgressions);
		renderProgressionList();
	} catch {
		alert("Unable to import progression.");
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
		state.tuneProgressions = loaded;
	} catch {
		state.tuneProgressions = [];
	}
};

const renderProgressionList = (): void => {
	dom.elProgressionList.innerHTML = "";
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
					applyProgressionPreset(preset, onPresetApplied),
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
		dom.elProgressionList.appendChild(group);
	});
};

const saveProgressionFromSetup = (): void => {
	setSaveError();
	const name = dom.elSaveProgressionName.value.trim();
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
	const existingIndex = state.customProgressions.findIndex(
		(item) => item.name === preset.name,
	);
	if (existingIndex >= 0) {
		state.customProgressions[existingIndex] = {
			...preset,
			id: state.customProgressions[existingIndex].id,
		};
	} else {
		state.customProgressions.push(preset);
	}
	saveCustomProgressions(state.customProgressions);
	state.activeProgressionName = preset.name;
	renderProgressionList();
	setSaveError();
};

export const initProgressions = (
	onApplied?: () => void,
): void => {
	onPresetApplied = onApplied;
	state.customProgressions = loadCustomProgressions();
	renderProgressionList();
	void loadTuneProgressions().then(() => {
		renderProgressionList();
	});

	dom.btnSaveProgression.addEventListener("click", saveProgressionFromSetup);
	dom.elSaveProgressionName.addEventListener("input", () => {
		setSaveError();
	});
};

export { renderProgressionList };
