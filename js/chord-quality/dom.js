const getById = (id) => {
    const el = document.getElementById(id);
    if (!el) {
        throw new Error("Missing element: " + id);
    }
    return el;
};
export const dom = {
    getById,
    elQuestionCount: getById("questionCount"),
    elMinRootInput: getById("minRootInput"),
    elQualityOptions: getById("qualityOptions"),
    elVoicingOptions: getById("voicingOptions"),
    elPlaybackRadios: Array.from(document.querySelectorAll("input[name='playbackMode']")),
    elQuestionLabel: getById("questionLabel"),
    elTimeLabel: getById("timeLabel"),
    elAttemptsLabel: getById("attemptsLabel"),
    elStatus: getById("status"),
    elAnswers: getById("answers"),
    elCompletionPanel: getById("completionPanel"),
    elCompletionSummary: getById("completionSummary"),
    elRerunControls: getById("rerunControls"),
    elLiveQuestionPanel: getById("liveQuestionPanel"),
    elTestRecords: getById("testRecords"),
    elStatsRecords: getById("statsRecords"),
    elStatsGroupSelect: getById("statsGroupSelect"),
    elStatsOrderSelect: getById("statsOrderSelect"),
    elTestFilterSelect: getById("testFilterSelect"),
    elRecordsTabButtons: Array.from(document.querySelectorAll("[data-records-tab]")),
    elRecordsTabPanels: Array.from(document.querySelectorAll("[data-records-panel]")),
    btnStartAudio: getById("btnStartAudio"),
    btnStartTest: getById("btnStartTest"),
    btnStopTest: getById("btnStopTest"),
    btnReplay: getById("btnReplay"),
};
