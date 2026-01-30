import * as theory from "../core/theory.js";
import { dom } from "./dom.js";
import { QUALITY_OPTIONS, VOICING_OPTIONS } from "./options.js";
import type { Config, QualityId, VoicingId } from "./types.js";

const buildToggleRow = (
	label: string,
	id: string,
	checked: boolean,
): HTMLDivElement => {
	const row = document.createElement("div");
	row.className = "mode2-row simple";
	row.dataset.optionId = id;

	const field = document.createElement("div");
	field.className = "field";
	const toggle = document.createElement("label");
	toggle.className = "toggle";
	const input = document.createElement("input");
	input.type = "checkbox";
	input.checked = checked;
	input.dataset.optionId = id;
	input.className = "option-toggle";
	const track = document.createElement("span");
	track.className = "toggle-track";
	const text = document.createElement("span");
	text.className = "toggle-label";
	text.textContent = label;
	toggle.append(input, track, text);
	field.append(toggle);
	row.append(field);
	return row;
};

export const renderQualityOptions = (): void => {
	dom.elQualityOptions.innerHTML = "";
	QUALITY_OPTIONS.forEach((option) => {
		const row = buildToggleRow(option.label, option.id, true);
		dom.elQualityOptions.appendChild(row);
	});
};

export const renderVoicingOptions = (): void => {
	dom.elVoicingOptions.innerHTML = "";
	VOICING_OPTIONS.forEach((option) => {
		const row = buildToggleRow(option.label, option.id, true);
		dom.elVoicingOptions.appendChild(row);
	});
};

const readEnabledOptions = (
	container: HTMLElement,
): { qualities: QualityId[]; voicings: VoicingId[] } => {
	const toggles = Array.from(
		container.querySelectorAll<HTMLInputElement>(".option-toggle"),
	);
	const enabled = toggles.filter((toggle) => toggle.checked);
	const ids = enabled.map((toggle) => toggle.dataset.optionId || "");
	const qualities = ids.filter((id) =>
		QUALITY_OPTIONS.some((option) => option.id === id),
	) as QualityId[];
	const voicings = ids.filter((id) =>
		VOICING_OPTIONS.some((option) => option.id === id),
	) as VoicingId[];
	return { qualities, voicings };
};

export const readConfig = (): Config => {
	const playbackMode =
		dom.elPlaybackRadios.find((radio) => radio.checked)?.value ===
		"arpeggiated"
			? "arpeggiated"
			: "stacked";
	const totalQuestions = Number(dom.elQuestionCount.value || 1);
	if (!Number.isFinite(totalQuestions) || totalQuestions < 1) {
		throw new Error("Questions per test must be at least 1.");
	}
	const minRootNote = dom.elMinRootInput.value.trim();
	if (!minRootNote) {
		throw new Error("Enter a minimum chord root (e.g., G2).");
	}
	const minRootMidi = theory.noteWithOctaveToMidi(minRootNote);
	const qualityEnabled = readEnabledOptions(dom.elQualityOptions).qualities;
	const voicingEnabled = readEnabledOptions(dom.elVoicingOptions).voicings;

	if (!qualityEnabled.length) {
		throw new Error("Select at least one chord quality.");
	}
	if (!voicingEnabled.length) {
		throw new Error("Select at least one voicing.");
	}

	return {
		totalQuestions: Math.floor(totalQuestions),
		minRootNote,
		minRootMidi,
		enabledQualities: qualityEnabled,
		enabledVoicings: voicingEnabled,
		playbackMode,
	};
};
