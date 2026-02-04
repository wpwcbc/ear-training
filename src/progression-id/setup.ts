import * as theory from "../core/theory.js";
import { buildToggleRow } from "../ui/toggles.js";
import { dom } from "./dom.js";
import type { Config, ProgressionMode, SubstitutionSettings } from "./types.js";

export const renderSubstitutionOptions = (): void => {
	dom.elSubstitutionOptions.innerHTML = "";
	dom.elSubstitutionOptions.append(
		buildToggleRow({
			label: "Secondary maj ii-V",
			id: "secondaryMajorIIV",
			checked: true,
		}),
		buildToggleRow({
			label: "Secondary minor iiø-Vb9",
			id: "secondaryMinorIIVb9",
			checked: false,
		}),
		buildToggleRow({
			label: "Tritone substitutions",
			id: "tritoneSubs",
			checked: true,
		}),
		buildToggleRow({
			label: "Backdoor (iv–bVII)",
			id: "backdoor",
			checked: true,
		}),
		buildToggleRow({
			label: "Borrowed bVII / bVI",
			id: "borrowed",
			checked: true,
		}),
	);
};

export const getMode = (): ProgressionMode => {
	const checked = document.querySelector<HTMLInputElement>(
		"input[name='mode']:checked",
	);
	if (!checked) {
		return "major";
	}
	return checked.value as ProgressionMode;
};

const readSubstitutionSettings = (): SubstitutionSettings => {
	const toggles = Array.from(
		dom.elSubstitutionOptions.querySelectorAll<HTMLInputElement>(
			".option-toggle",
		),
	);
	const setting = (id: string): boolean =>
		toggles.find((toggle) => toggle.dataset.optionId === id)?.checked ??
		false;
	return {
		secondaryMajorIIV: setting("secondaryMajorIIV"),
		secondaryMinorIIVb9: setting("secondaryMinorIIVb9"),
		tritoneSubs: setting("tritoneSubs"),
		backdoor: setting("backdoor"),
		borrowed: setting("borrowed"),
	};
};

export const readConfig = (): Config => {
	const keyCenter = dom.elKeyInput.value.trim() || "C";
	theory.noteNameToPitchClassSemitones(keyCenter);
	const minRootNote = dom.elMinRootInput.value.trim();
	if (!minRootNote) {
		throw new Error("Enter a minimum chord root (e.g., G2).");
	}
	const minRootMidi = theory.noteWithOctaveToMidi(minRootNote);
	return {
		keyCenter,
		mode: getMode(),
		minRootNote,
		minRootMidi,
		substitutions: readSubstitutionSettings(),
	};
};
