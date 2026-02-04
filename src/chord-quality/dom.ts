const getById = <T extends HTMLElement>(id: string): T => {
	const el: HTMLElement | null = document.getElementById(id);
	if (!el) {
		throw new Error("Missing element: " + id);
	}
	return el as T;
};

export const dom = {
	getById,
	elQuestionCount: getById<HTMLInputElement>("questionCount"),
	elMinRootInput: getById<HTMLInputElement>("minRootInput"),
	elQualityOptions: getById<HTMLDivElement>("qualityOptions"),
	elVoicingOptions: getById<HTMLDivElement>("voicingOptions"),
	elInversionOptions: getById<HTMLDivElement>("inversionOptions"),
	elInversionWarning: getById<HTMLParagraphElement>("inversionWarning"),
	elPlaybackRadios: Array.from(
		document.querySelectorAll<HTMLInputElement>(
			"input[name='playbackMode']",
		),
	),
	elQuestionLabel: getById<HTMLSpanElement>("questionLabel"),
	elTimeLabel: getById<HTMLSpanElement>("timeLabel"),
	elAttemptsLabel: getById<HTMLSpanElement>("attemptsLabel"),
	elStatus: getById<HTMLDivElement>("status"),
	elAnswers: getById<HTMLDivElement>("answers"),
	elCompletionPanel: getById<HTMLElement>("completionPanel"),
	elCompletionStats: getById<HTMLDivElement>("completionStats"),
	elCompletionSummary: getById<HTMLParagraphElement>("completionSummary"),
	elRerunControls: getById<HTMLDivElement>("rerunControls"),
	elLiveQuestionPanel: getById<HTMLElement>("liveQuestionPanel"),
	elTestRecords: getById<HTMLDivElement>("testRecords"),
	elStatsRecords: getById<HTMLDivElement>("statsRecords"),
	elStatsGroupSelect: getById<HTMLSelectElement>("statsGroupSelect"),
	elStatsOrderSelect: getById<HTMLSelectElement>("statsOrderSelect"),
	elTestFilterSelect: getById<HTMLSelectElement>("testFilterSelect"),
	elRecordsTabButtons: Array.from(
		document.querySelectorAll<HTMLButtonElement>("[data-records-tab]"),
	),
	elRecordsTabPanels: Array.from(
		document.querySelectorAll<HTMLDivElement>("[data-records-panel]"),
	),
	btnStartAudio: getById<HTMLButtonElement>("btnStartAudio"),
	btnStartTest: getById<HTMLButtonElement>("btnStartTest"),
	btnStopTest: getById<HTMLButtonElement>("btnStopTest"),
	btnReplay: getById<HTMLButtonElement>("btnReplay"),
};
