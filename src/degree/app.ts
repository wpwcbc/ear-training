import { PROGRESSION_PRESETS } from "../core/progressions.js";
import * as audio from "./audio.js";
import { initFullscreenLive } from "../core/fullscreen.js";
import { dom } from "./dom.js";
import { state } from "./state.js";
import { initVelocityControls } from "./velocity.js";
import { initProgressions } from "./presets.js";
import { initRecords } from "./records.js";
import {
	addProgressionRow,
	getMode,
	loadDefaultProgression,
	markProgressionCustom,
	readMode1Config,
	readMode2Config,
	renderMode2Rows,
	showModePanels,
} from "./setup.js";
import {
	replayCurrent,
	resetLiveDisplay,
	setStatus,
	setTestRunning,
	startTest,
	stopTest,
} from "./test.js";

const updateModeUI = (): void => {
	const mode = getMode();
	showModePanels(mode);
	resetLiveDisplay();
};

// ------------------------------
// Event wiring
// ------------------------------
dom.btnStartAudio.addEventListener("click", async () => {
	try {
		await audio.ensureAudioReady();
		setStatus("Audio ready. Configure your test and press Start.", "ok");
	} catch {
		setStatus("Audio failed to start.", "warn");
	}
});

dom.btnStartTest.addEventListener("click", async () => {
	try {
		if (state.isTestRunning) {
			return;
		}
		await audio.ensureAudioReady();
		const mode = getMode();
		if (mode === "mode1") {
			const config = readMode1Config();
			state.lastMode1Config = config;
			window.setTimeout(() => startTest(config, "mode1"), 200);
		} else {
			const config = readMode2Config();
			state.lastMode2Config = config;
			window.setTimeout(() => startTest(config, "mode2"), 200);
		}
		const fs = document.getElementById(
			"fullscreenToggle",
		) as HTMLInputElement | null;
		if (!fs?.checked) {
			dom.elLiveQuestionPanel.scrollIntoView({
				behavior: "smooth",
				block: "start",
			});
		}
	} catch (err) {
		setStatus((err as Error).message || "Unable to start.", "warn");
	}
});

dom.btnStopTest.addEventListener("click", () => {
	stopTest();
});

dom.btnReplay.addEventListener("click", () => {
	replayCurrent();
});

dom.btnAddChord.addEventListener("click", () => {
	addProgressionRow();
	markProgressionCustom();
});

document.querySelectorAll<HTMLInputElement>("input[name='mode']").forEach(
	(radio) => {
		radio.addEventListener("change", updateModeUI);
	},
);

// ------------------------------
// Init
// ------------------------------
const defaultPreset =
	PROGRESSION_PRESETS.find((preset) => preset.id === "major-251") ||
	PROGRESSION_PRESETS.find((preset) => preset.name === "Major ii–V–I");

loadDefaultProgression(defaultPreset);
renderMode2Rows();
initVelocityControls();
initProgressions(resetLiveDisplay);
updateModeUI();
resetLiveDisplay();
setTestRunning(false);
initRecords();
initFullscreenLive({
	panelId: "liveQuestionPanel",
	toggleId: "fullscreenToggle",
	startButtonId: "btnStartTest",
	stopButtonId: "btnStopTest",
	completionPanelId: "completionPanel",
	closeOnStop: true,
});
