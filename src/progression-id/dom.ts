const getById = <T extends HTMLElement>(id: string): T => {
	const el: HTMLElement | null = document.getElementById(id);
	if (!el) {
		throw new Error("Missing element: " + id);
	}
	return el as T;
};

export const dom = {
	getById,
	elKeyInput: getById<HTMLInputElement>("keyInput"),
	elMinRootInput: getById<HTMLInputElement>("minRootInput"),
	elSubstitutionOptions: getById<HTMLDivElement>("substitutionOptions"),
	elKeyLabel: getById<HTMLSpanElement>("keyLabel"),
	elChordLabel: getById<HTMLSpanElement>("chordLabel"),
	elTonicLabel: getById<HTMLSpanElement>("tonicLabel"),
	elQuestionLabel: getById<HTMLSpanElement>("questionLabel"),
	elTimeLabel: getById<HTMLSpanElement>("timeLabel"),
	elAttemptsLabel: getById<HTMLSpanElement>("attemptsLabel"),
	elStatus: getById<HTMLDivElement>("status"),
	elDegreeSelect: getById<HTMLSelectElement>("degreeSelect"),
	elQualitySelect: getById<HTMLSelectElement>("qualitySelect"),
	btnSubmitAnswer: getById<HTMLButtonElement>("btnSubmitAnswer"),
	elCompletionPanel: getById<HTMLElement>("completionPanel"),
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
