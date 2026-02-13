import * as audio from "./audio.js";
import { initFullscreenLive } from "../core/fullscreen.js";
import { dom } from "./dom.js";
import { initRecords } from "./records.js";
import { renderSubstitutionOptions, readConfig } from "./setup.js";
import { initAnswers, resetLiveDisplay, setStatus, startTest, stopTest, replayCurrent } from "./test.js";
import { state } from "./state.js";

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
		const config = readConfig();
		state.lastConfig = config;
		window.setTimeout(() => startTest(config), 200);
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

renderSubstitutionOptions();
initAnswers();
resetLiveDisplay();
initRecords();
initFullscreenLive({
	panelId: "liveQuestionPanel",
	toggleId: "fullscreenToggle",
	startButtonId: "btnStartTest",
	stopButtonId: "btnStopTest",
	completionPanelId: "completionPanel",
	closeOnStop: true,
});
