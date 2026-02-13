import { PROGRESSION_PRESETS } from "../core/progressions.js";
import { initFullscreenLive } from "../core/fullscreen.js";
import * as audio from "./audio.js";
import { dom } from "./dom.js";
import { state } from "./state.js";
import { initVelocityControls } from "./velocity.js";
import { initProgressions } from "./presets.js";
import {
	addProgressionRow,
	getAmbienceMode,
	getMode,
	getPlaybackMode,
	loadDefaultProgression,
	markProgressionCustom,
	readMode1Config,
	readMode2Config,
	renderMode2Rows,
	showModePanels,
} from "./setup.js";
import {
	nextChord,
	readBeatsPerBar,
	readBpm,
	resetExerciseDisplay,
	scheduleAutoAdvance,
	setDroneRunning,
	setStatus,
	startDrone,
	stopDrone,
	updateNextChordButton,
	updatePlaybackUI,
} from "./exercise.js";

const normalizeKeyLabel = (key: string, code: string): string => {
	if (code === "Space") {
		return "Space";
	}
	if (key === " ") {
		return "Space";
	}
	if (key === "Escape") {
		return "Esc";
	}
	if (key === "Backspace") {
		return "Backspace";
	}
	if (key.length === 1) {
		return key.toUpperCase();
	}
	return key;
};

const normalizeKeyText = (value: string): string => {
	const trimmed = value.trim();
	if (!trimmed) {
		return "";
	}
	if (trimmed.toLowerCase() === "space") {
		return "Space";
	}
	return trimmed.length === 1 ? trimmed.toUpperCase() : trimmed;
};

const isTypingTarget = (target: EventTarget | null): boolean => {
	if (!(target instanceof HTMLElement)) {
		return false;
	}
	const tag = target.tagName.toLowerCase();
	return tag === "input" || tag === "textarea" || target.isContentEditable;
};

const setNextChordKey = (label: string): void => {
	if (!label) {
		return;
	}
	state.nextChordKey = label;
	dom.elNextChordKeyInput.value = label;
};

const applyPlaybackParam = (): void => {
	const params = new URLSearchParams(window.location.search);
	const raw = params.get("mode") ?? params.get("playback");
	if (!raw) {
		return;
	}
	const value = raw.toLowerCase();
	if (value !== "ambience" && value !== "metronome") {
		return;
	}
	const radio = document.querySelector<HTMLInputElement>(
		`input[name='playbackMode'][value='${value}']`,
	);
	if (radio) {
		radio.checked = true;
	}
};

const updatePlaybackState = (): void => {
	state.playbackMode = getPlaybackMode();
	state.ambienceMode = getAmbienceMode();
	if (state.playbackMode === "metronome") {
		state.metronomeAdvanceMode = getMetronomeAdvanceMode();
	}
	updatePlaybackUI();
};

const updateModeUI = (): void => {
	const mode = getMode();
	showModePanels(mode);
	resetExerciseDisplay();
};

const updateModeConfigFromLast = (): void => {
	if (state.activeMode === "mode1" && state.lastMode1Config) {
		dom.elLoopTimesInput.value = String(state.lastMode1Config.loopTimes ?? 1);
		dom.elLoopForeverToggle.checked = !!state.lastMode1Config.loopForever;
		syncLoopForeverUI();
		dom.elLoopShiftInput.value = String(state.lastMode1Config.loopKeyShift ?? 0);
	} else if (state.activeMode === "mode2" && state.lastMode2Config) {
		(document.getElementById("mode2Questions") as HTMLInputElement).value =
			String(state.lastMode2Config.totalQuestions ?? 1);
	}
};

const getActiveConfig = () => {
	return state.activeMode === "mode1"
		? state.lastMode1Config
		: state.lastMode2Config;
};

const getMetronomeAdvanceMode = (): "auto" | "manual" => {
	const selected = document.querySelector<HTMLInputElement>(
		"input[name='metronomeAdvanceMode']:checked",
	);
	return selected?.value === "manual" ? "manual" : "auto";
};

const syncLoopForeverUI = (): void => {
	const isInfinite = dom.elLoopForeverToggle.checked;
	dom.elLoopTimesInput.disabled = isInfinite;
};

const syncAutoAdvanceState = (validate = false): void => {
	const enabled = dom.elAutoAdvanceToggle.checked;
	const rawSeconds = Number(dom.elAutoAdvanceSeconds.value || 0);
	if (enabled && (!Number.isFinite(rawSeconds) || rawSeconds <= 0)) {
		if (validate) {
			throw new Error("Auto-advance seconds must be greater than 0.");
		}
		state.autoAdvanceEnabled = false;
		return;
	}
	state.autoAdvanceEnabled = enabled;
	if (Number.isFinite(rawSeconds) && rawSeconds > 0) {
		state.autoAdvanceSeconds = rawSeconds;
	}
};

const rescheduleAutoAdvance = (): void => {
	if (!state.isDroneRunning || state.playbackMode !== "ambience") {
		return;
	}
	const config = getActiveConfig();
	if (!config) {
		return;
	}
	scheduleAutoAdvance(config.minRootMidi);
};

// ------------------------------
// Event wiring
// ------------------------------
dom.btnStartAudio.addEventListener("click", async () => {
	try {
		await audio.ensureAudioReady();
		setStatus("Audio ready. Configure your progression and press Start.", "ok");
	} catch {
		setStatus("Audio failed to start.", "warn");
	}
});

dom.btnStartDrone.addEventListener("click", async () => {
	try {
		if (state.isDroneRunning) {
			return;
		}
		await audio.ensureAudioReady();
		state.playbackMode = getPlaybackMode();
		state.ambienceMode = getAmbienceMode();
		if (state.playbackMode === "metronome") {
			readBpm();
			readBeatsPerBar();
			state.metronomeAdvanceMode = getMetronomeAdvanceMode();
			state.metronomeQueuedNext = false;
		} else {
			syncAutoAdvanceState(true);
		}
		const mode = getMode();
		if (mode === "mode1") {
			const config = readMode1Config();
			state.lastMode1Config = config;
			window.setTimeout(() => startDrone(config, "mode1"), 200);
		} else {
			const config = readMode2Config();
			state.lastMode2Config = config;
			window.setTimeout(() => startDrone(config, "mode2"), 200);
		}
	} catch (err) {
		setStatus((err as Error).message || "Unable to start.", "warn");
	} finally {
		const fs = document.getElementById(
			"fullscreenToggle",
		) as HTMLInputElement | null;
		if (!fs?.checked) {
			dom.elExercisePanel.scrollIntoView({
				behavior: "smooth",
				block: "start",
			});
		}
	}
});

dom.btnStopDrone.addEventListener("click", () => {
	stopDrone();
});

dom.btnNextChord.addEventListener("click", () => {
	if (!state.questionQueue.length) {
		return;
	}

	const modeConfig =
		state.activeMode === "mode1" ? state.lastMode1Config : state.lastMode2Config;
	if (!modeConfig) {
		return;
	}

	if (state.playbackMode === "ambience") {
		nextChord(modeConfig.minRootMidi);
		updateNextChordButton();
		return;
	}

	if (
		state.playbackMode === "metronome" &&
		state.metronomeAdvanceMode === "manual"
	) {
		state.metronomeQueuedNext = true;
		updateNextChordButton();
	}
});

dom.elNextChordKeyInput.addEventListener("keydown", (event) => {
	if (event.key === "Tab") {
		return;
	}
	event.preventDefault();
	const label = normalizeKeyLabel(event.key, event.code);
	setNextChordKey(label);
});

dom.elNextChordKeyInput.addEventListener("blur", () => {
	const normalized = normalizeKeyText(dom.elNextChordKeyInput.value);
	if (normalized) {
		setNextChordKey(normalized);
	} else {
		dom.elNextChordKeyInput.value = state.nextChordKey;
	}
});

document.addEventListener("keydown", (event) => {
	if (isTypingTarget(event.target)) {
		return;
	}
	if (state.playbackMode !== "ambience") {
		return;
	}
	const label = normalizeKeyLabel(event.key, event.code);
	if (!state.nextChordKey || label !== state.nextChordKey) {
		return;
	}
	if (label === "Space") {
		event.preventDefault();
	}
	if (!dom.btnNextChord.disabled) {
		dom.btnNextChord.click();
	}
});

dom.elLoopForeverToggle.addEventListener("change", () => {
	syncLoopForeverUI();
});

dom.elAutoAdvanceToggle.addEventListener("change", () => {
	syncAutoAdvanceState();
	rescheduleAutoAdvance();
});

dom.elAutoAdvanceSeconds.addEventListener("input", () => {
	syncAutoAdvanceState();
	rescheduleAutoAdvance();
});

dom.btnAddChord.addEventListener("click", () => {
	addProgressionRow();
	markProgressionCustom();
});

const modeRadios = document.querySelectorAll<HTMLInputElement>(
	"input[name='mode']",
);
modeRadios.forEach((radio) => {
	radio.addEventListener("change", () => {
		updateModeUI();
		updateModeConfigFromLast();
	});
});

const playbackRadios = document.querySelectorAll<HTMLInputElement>(
	"input[name='playbackMode']",
);
playbackRadios.forEach((radio) => {
	radio.addEventListener("change", () => {
		updatePlaybackState();
	});
});

const metronomeAdvanceRadios = document.querySelectorAll<HTMLInputElement>(
	"input[name='metronomeAdvanceMode']",
);
metronomeAdvanceRadios.forEach((radio) => {
	radio.addEventListener("change", () => {
		state.metronomeAdvanceMode = getMetronomeAdvanceMode();
		state.metronomeQueuedNext = false;
		updateNextChordButton();
	});
});

const ambienceRadios = document.querySelectorAll<HTMLInputElement>(
	"input[name='ambienceMode']",
);
ambienceRadios.forEach((radio) => {
	radio.addEventListener("change", () => {
		updatePlaybackState();
	});
});

// ------------------------------
// Init
// ------------------------------
const defaultPreset =
	PROGRESSION_PRESETS.find((preset) => preset.id === "major-251") ||
	PROGRESSION_PRESETS.find((preset) => preset.name === "Major ii–V–I");

const init = (): void => {
	setNextChordKey("Space");
	state.metronomeAdvanceMode = getMetronomeAdvanceMode();
	state.metronomeQueuedNext = false;
	syncLoopForeverUI();
	syncAutoAdvanceState();
	loadDefaultProgression(defaultPreset);
	renderMode2Rows();
	initVelocityControls();
	initProgressions(resetExerciseDisplay);
	applyPlaybackParam();
	updateModeUI();
	updatePlaybackState();
	resetExerciseDisplay();
	setDroneRunning(false);
	updateModeConfigFromLast();
	initFullscreenLive({
		panelId: "exercisePanel",
		toggleId: "fullscreenToggle",
		startButtonId: "btnStartDrone",
		stopButtonId: "btnStopDrone",
		closeOnStop: true,
	});
};

try {
	init();
} catch (err) {
	const message = err instanceof Error ? err.message : "Unknown error";
	console.error(err);
	dom.elDroneStatus.textContent = `Init failed: ${message}`;
	dom.elDroneStatus.dataset.state = "warn";
}
