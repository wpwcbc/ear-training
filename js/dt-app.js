import { CHORD_QUALITIES, CHORD_VOICE_VELOCITIES, LEAD_VELOCITY_DEFAULT, RANDOM_ROOTS, MIN_CHORD_ROOT_MIDI, DEFAULT_MODE1, } from "./dt-constants.js";
import { SCALE_OPTIONS } from "./dt-scales.js";
import { PROGRESSION_PRESETS, PROGRESSION_CATEGORIES, } from "./dt-progressions.js";
import * as theory from "./dt-theory.js";
import * as audio from "./dt-audio.js";
const getById = (id) => {
    const el = document.getElementById(id);
    if (!el) {
        throw new Error("Missing element: " + id);
    }
    return el;
};
const resolvedScaleOptions = SCALE_OPTIONS.map((option) => ({
    ...option,
    tokens: theory.parseDegreeList(option.degrees),
}));
const scaleById = resolvedScaleOptions.reduce((acc, option) => {
    acc[option.id] = option;
    return acc;
}, {});
const SCALE_ID_ALIASES = {
    "phygian dominant": "phrygian dominant",
};
const normalizeScaleKey = (value) => value
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
const normalizedScaleIdMap = resolvedScaleOptions.reduce((acc, option) => {
    acc[normalizeScaleKey(option.id)] = option.id;
    acc[normalizeScaleKey(option.label)] = option.id;
    return acc;
}, {});
const MODE2_DEFAULT_DEGREES = {
    maj7: "1 2 3 #4 5 6 7",
    m7: "1 2 b3 4 5 6 b7",
    "7": "1 2 3 4 5 6 b7",
    m7b5: "1 b2 b3 4 b5 b6 b7",
    dim7: "1 b2 b3 4 b5 b6 bb7",
    mmaj7: "1 2 b3 4 5 6 7",
    "+": "1 2 3 #4 #5 6 7",
};
const DEFAULT_DEGREE_TEXT = "1 2 3 4 5 6 7";
function tokensMatch(a, b) {
    if (a.length !== b.length) {
        return false;
    }
    return a.every((token, index) => token === b[index]);
}
function detectScaleId(degreesText) {
    try {
        const tokens = theory.parseDegreeList(degreesText);
        const match = resolvedScaleOptions.find((option) => tokensMatch(tokens, option.tokens));
        return match ? match.id : "custom";
    }
    catch {
        return "custom";
    }
}
function getMode2DefaultDegrees(quality) {
    return MODE2_DEFAULT_DEGREES[quality] ?? DEFAULT_DEGREE_TEXT;
}
function clampVelocity(value, fallback) {
    if (!Number.isFinite(value)) {
        return fallback;
    }
    return Math.min(1, Math.max(0, value));
}
function formatVelocity(value) {
    return clampVelocity(value, 0).toFixed(2);
}
function readVelocity(input, fallback) {
    return clampVelocity(Number(input.value), fallback);
}
function loadVelocitySettings() {
    const defaults = {
        root: CHORD_VOICE_VELOCITIES.root,
        fifth: CHORD_VOICE_VELOCITIES.fifth,
        seventh: CHORD_VOICE_VELOCITIES.seventh,
        third: CHORD_VOICE_VELOCITIES.third,
        lead: LEAD_VELOCITY_DEFAULT,
    };
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.velocityMix);
        if (!raw) {
            return defaults;
        }
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") {
            return defaults;
        }
        return {
            root: clampVelocity(Number(parsed.root), defaults.root),
            fifth: clampVelocity(Number(parsed.fifth), defaults.fifth),
            seventh: clampVelocity(Number(parsed.seventh), defaults.seventh),
            third: clampVelocity(Number(parsed.third), defaults.third),
            lead: clampVelocity(Number(parsed.lead), defaults.lead),
        };
    }
    catch {
        return defaults;
    }
}
function collectVelocitySettings() {
    return {
        root: readVelocity(elVelocityRoot, CHORD_VOICE_VELOCITIES.root),
        fifth: readVelocity(elVelocityFifth, CHORD_VOICE_VELOCITIES.fifth),
        seventh: readVelocity(elVelocitySeventh, CHORD_VOICE_VELOCITIES.seventh),
        third: readVelocity(elVelocityThird, CHORD_VOICE_VELOCITIES.third),
        lead: readVelocity(elVelocityLead, LEAD_VELOCITY_DEFAULT),
    };
}
function saveVelocitySettings() {
    const settings = collectVelocitySettings();
    localStorage.setItem(STORAGE_KEYS.velocityMix, JSON.stringify(settings));
}
function initVelocityControls() {
    const saved = loadVelocitySettings();
    const items = [
        {
            key: "root",
            input: elVelocityRoot,
            label: elVelocityRootValue,
            defaultValue: CHORD_VOICE_VELOCITIES.root,
        },
        {
            key: "fifth",
            input: elVelocityFifth,
            label: elVelocityFifthValue,
            defaultValue: CHORD_VOICE_VELOCITIES.fifth,
        },
        {
            key: "seventh",
            input: elVelocitySeventh,
            label: elVelocitySeventhValue,
            defaultValue: CHORD_VOICE_VELOCITIES.seventh,
        },
        {
            key: "third",
            input: elVelocityThird,
            label: elVelocityThirdValue,
            defaultValue: CHORD_VOICE_VELOCITIES.third,
        },
        {
            key: "lead",
            input: elVelocityLead,
            label: elVelocityLeadValue,
            defaultValue: LEAD_VELOCITY_DEFAULT,
        },
    ];
    items.forEach((item) => {
        const initial = saved[item.key] !== undefined ? saved[item.key] : item.defaultValue;
        item.input.value = String(initial);
        item.label.textContent = formatVelocity(initial);
        item.input.addEventListener("input", () => {
            item.label.textContent = formatVelocity(Number(item.input.value));
            saveVelocitySettings();
        });
    });
}
function populateScaleSelect(select, selectedId) {
    select.innerHTML = "";
    const customOption = document.createElement("option");
    customOption.value = "custom";
    customOption.textContent = "Custom";
    select.appendChild(customOption);
    resolvedScaleOptions.forEach((option) => {
        const opt = document.createElement("option");
        opt.value = option.id;
        opt.textContent = option.label;
        select.appendChild(opt);
    });
    select.value = selectedId;
    if (!select.value) {
        select.value = "custom";
    }
}
function populateQualitySelect(select, selectedValue) {
    select.innerHTML = "";
    CHORD_QUALITIES.forEach((quality) => {
        const opt = document.createElement("option");
        opt.value = quality;
        opt.textContent = quality;
        select.appendChild(opt);
    });
    select.value = selectedValue;
    if (!select.value) {
        select.value = CHORD_QUALITIES[0] ?? "maj7";
    }
}
function wireScaleControls(select, input) {
    let suppressInputSync = false;
    select.addEventListener("change", () => {
        const selectedId = select.value;
        if (selectedId === "custom") {
            return;
        }
        const option = scaleById[selectedId];
        if (!option) {
            return;
        }
        suppressInputSync = true;
        input.value = option.degrees;
        suppressInputSync = false;
    });
    input.addEventListener("input", () => {
        if (suppressInputSync) {
            return;
        }
        if (select.value !== "custom") {
            select.value = "custom";
        }
    });
}
// ------------------------------
// UI references
// ------------------------------
const elMode1 = getById("mode1Config");
const elMode2 = getById("mode2Config");
const elKeyInput = getById("keyInput");
const elMinRootInput = getById("minRootInput");
const elLoopTimesInput = getById("loopTimesInput");
const elProgressionRows = getById("progressionRows");
const elChordTemplate = getById("chordRowTemplate");
const elMode2Rows = getById("mode2Rows");
const elMode2Template = getById("mode2RowTemplate");
const elSaveProgressionName = getById("saveProgressionName");
const elSaveProgressionError = getById("saveProgressionError");
const elVelocityRoot = getById("velocityRoot");
const elVelocityFifth = getById("velocityFifth");
const elVelocitySeventh = getById("velocitySeventh");
const elVelocityThird = getById("velocityThird");
const elVelocityLead = getById("velocityLead");
const elVelocityRootValue = getById("velocityRootValue");
const elVelocityFifthValue = getById("velocityFifthValue");
const elVelocitySeventhValue = getById("velocitySeventhValue");
const elVelocityThirdValue = getById("velocityThirdValue");
const elVelocityLeadValue = getById("velocityLeadValue");
const elKeyLabel = getById("keyLabel");
const elChordLabel = getById("chordLabel");
const elTonicLabel = getById("tonicLabel");
const elQuestionLabel = getById("questionLabel");
const elTimeLabel = getById("timeLabel");
const elAttemptsLabel = getById("attemptsLabel");
const elStatus = getById("status");
const elAnswers = getById("answers");
const elCompletionPanel = getById("completionPanel");
const elCompletionStats = getById("completionStats");
const elCompletionSummary = getById("completionSummary");
const elRerunControls = getById("rerunControls");
const elProgressionList = getById("progressionList");
const btnSaveProgression = getById("btnSaveProgression");
const elLiveQuestionPanel = getById("liveQuestionPanel");
const elTestRecords = getById("testRecords");
const elStatsRecords = getById("statsRecords");
const elStatsGroupSelect = getById("statsGroupSelect");
const elStatsOrderSelect = getById("statsOrderSelect");
const elTestFilterSelect = getById("testFilterSelect");
const elRecordsTabButtons = Array.from(document.querySelectorAll("[data-records-tab]"));
const elRecordsTabPanels = Array.from(document.querySelectorAll("[data-records-panel]"));
const btnStartAudio = getById("btnStartAudio");
const btnStartTest = getById("btnStartTest");
const btnStopTest = getById("btnStopTest");
const btnReplay = getById("btnReplay");
const btnAddChord = getById("btnAddChord");
// ------------------------------
// Timer
// ------------------------------
let timerHandle = 0;
let startPerfMs = 0;
let statsGrouping = "quality";
let statsOrder = "name";
let recordsTab = "tests";
const TEST_FILTER_ALL = "all";
let testFilter = TEST_FILTER_ALL;
function startTimer() {
    startPerfMs = performance.now();
    if (timerHandle) {
        window.clearInterval(timerHandle);
    }
    timerHandle = window.setInterval(() => {
        const dt = (performance.now() - startPerfMs) / 1000;
        elTimeLabel.textContent = dt.toFixed(2) + "s";
    }, 25);
}
function stopTimer() {
    if (timerHandle) {
        window.clearInterval(timerHandle);
        timerHandle = 0;
    }
}
function setStatus(message, state = "") {
    elStatus.textContent = message;
    if (state) {
        elStatus.dataset.state = state;
    }
    else {
        delete elStatus.dataset.state;
    }
}
function setSaveError(message = "") {
    const trimmed = message.trim();
    if (!trimmed) {
        elSaveProgressionError.textContent = "";
        elSaveProgressionError.classList.add("hidden");
        return;
    }
    elSaveProgressionError.textContent = trimmed;
    elSaveProgressionError.classList.remove("hidden");
}
// ------------------------------
// Mode + config handling
// ------------------------------
let activeMode = "mode1";
let lastMode1Config = null;
let lastMode2Config = null;
const CUSTOM_PROGRESSION_NAME = "Custom progression";
let activeProgressionName = CUSTOM_PROGRESSION_NAME;
let customProgressions = [];
let tuneProgressions = [];
function markProgressionCustom() {
    activeProgressionName = CUSTOM_PROGRESSION_NAME;
}
const STORAGE_KEYS = {
    testHistory: "eartrain:testHistory",
    questionHistory: "eartrain:questionHistory",
    velocityMix: "eartrain:velocityMix",
    customProgressions: "eartrain:customProgressions",
};
function loadHistory(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) {
            return [];
        }
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
function saveHistory(key, records) {
    localStorage.setItem(key, JSON.stringify(records));
}
function addRecord(key, record, limit = 200) {
    const records = loadHistory(key);
    records.unshift(record);
    if (records.length > limit) {
        records.length = limit;
    }
    saveHistory(key, records);
}
function addRecords(key, newRecords, limit = 200) {
    if (!newRecords.length) {
        return;
    }
    const records = loadHistory(key);
    const merged = [...newRecords, ...records];
    if (merged.length > limit) {
        merged.length = limit;
    }
    saveHistory(key, merged);
}
function slugify(value) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
function isChordQuality(value) {
    return CHORD_QUALITIES.includes(value);
}
function isScaleId(value) {
    return Boolean(scaleById[value]);
}
function resolveScaleId(value) {
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }
    if (scaleById[trimmed]) {
        return trimmed;
    }
    const normalized = normalizeScaleKey(trimmed);
    const alias = SCALE_ID_ALIASES[normalized];
    if (alias && scaleById[alias]) {
        return alias;
    }
    return normalizedScaleIdMap[normalized] ?? null;
}
function normalizePreset(raw, forcedCategory) {
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
    }
    catch {
        return null;
    }
    const chordsInput = Array.isArray(raw.chords) ? raw.chords : [];
    if (!chordsInput.length) {
        return null;
    }
    const chords = [];
    for (const chord of chordsInput) {
        const chordDegree = String(chord.chordDegree || "").trim();
        const quality = String(chord.quality || "").trim();
        const scaleIdRaw = String(chord.scaleId || "").trim();
        const scaleId = resolveScaleId(scaleIdRaw);
        const questions = typeof chord.questions === "number" && chord.questions >= 1
            ? Math.floor(chord.questions)
            : undefined;
        if (!chordDegree || !isChordQuality(quality) || !scaleId) {
            return null;
        }
        try {
            theory.parseDegreeToSemitones(chordDegree);
        }
        catch {
            return null;
        }
        chords.push({
            chordDegree,
            quality,
            scaleId,
            questions,
        });
    }
    const category = forcedCategory || raw.category || "Customs";
    const id = String(raw.id || "").trim() ||
        `${category.toLowerCase()}-${slugify(name)}-${Date.now()}`;
    return {
        id,
        name,
        category,
        defaultKey,
        chords,
        description: raw.description,
    };
}
function loadCustomProgressions() {
    const stored = loadHistory(STORAGE_KEYS.customProgressions);
    return stored
        .map((item) => normalizePreset(item, "Customs"))
        .filter(Boolean);
}
function saveCustomProgressions(list) {
    localStorage.setItem(STORAGE_KEYS.customProgressions, JSON.stringify(list));
}
function addProgressionRow(data) {
    const clone = elChordTemplate.content.cloneNode(true);
    const row = clone.querySelector(".progression-row");
    if (!row) {
        return;
    }
    const degreeSelect = row.querySelector(".chord-degree");
    const qualitySelect = row.querySelector(".chord-quality");
    const scaleSelect = row.querySelector(".scale-select");
    const degreesInput = row.querySelector(".upper-degrees");
    const questionsInput = row.querySelector(".question-count");
    const removeBtn = row.querySelector(".remove-chord");
    degreeSelect.value = data?.chordDegree || "1";
    populateQualitySelect(qualitySelect, data?.quality || CHORD_QUALITIES[0] || "maj7");
    degreesInput.value = data?.allowedUpperDegrees
        ? data.allowedUpperDegrees.join(" ")
        : "1 2 3 4 5 6 7";
    questionsInput.value = String(data?.questions || 1);
    const selectedScaleId = detectScaleId(degreesInput.value);
    populateScaleSelect(scaleSelect, selectedScaleId);
    wireScaleControls(scaleSelect, degreesInput);
    degreeSelect.addEventListener("input", () => {
        markProgressionCustom();
    });
    qualitySelect.addEventListener("change", () => {
        markProgressionCustom();
    });
    removeBtn.addEventListener("click", () => {
        row.remove();
        markProgressionCustom();
    });
    elProgressionRows.appendChild(clone);
}
function loadDefaultProgression() {
    const defaultPreset = PROGRESSION_PRESETS.find((preset) => preset.id === "major-251") ||
        PROGRESSION_PRESETS.find((preset) => preset.name === "Major ii–V–I");
    if (defaultPreset) {
        applyProgressionPreset(defaultPreset);
        return;
    }
    elProgressionRows.innerHTML = "";
    DEFAULT_MODE1.progression.forEach((chord) => addProgressionRow(chord));
    elKeyInput.value = DEFAULT_MODE1.keyCenter;
    markProgressionCustom();
}
function renderMode2Rows() {
    elMode2Rows.innerHTML = "";
    CHORD_QUALITIES.forEach((quality) => {
        const clone = elMode2Template.content.cloneNode(true);
        const row = clone.querySelector(".mode2-row");
        if (!row) {
            return;
        }
        row.dataset.quality = quality;
        const toggle = row.querySelector(".mode2-enable");
        const toggleLabel = row.querySelector(".toggle-label");
        const scaleSelect = row.querySelector(".mode2-scale");
        const degreesInput = row.querySelector(".mode2-degrees");
        toggle.checked = true;
        toggleLabel.textContent = quality;
        degreesInput.value = getMode2DefaultDegrees(quality);
        const scaleId = detectScaleId(degreesInput.value);
        populateScaleSelect(scaleSelect, scaleId);
        wireScaleControls(scaleSelect, degreesInput);
        const syncRowState = () => {
            const enabled = toggle.checked;
            scaleSelect.disabled = !enabled;
            degreesInput.disabled = !enabled;
            row.classList.toggle("is-disabled", !enabled);
        };
        toggle.addEventListener("change", syncRowState);
        syncRowState();
        elMode2Rows.appendChild(clone);
    });
}
function getMode() {
    const checked = document.querySelector("input[name='mode']:checked");
    if (!checked) {
        throw new Error("Select a mode before starting.");
    }
    return checked.value;
}
function updateModeUI() {
    activeMode = getMode();
    if (activeMode === "mode1") {
        elMode1.classList.remove("hidden");
        elMode2.classList.add("hidden");
    }
    else {
        elMode1.classList.add("hidden");
        elMode2.classList.remove("hidden");
    }
    resetLiveDisplay();
}
function readMinRootSetting() {
    const minRootNote = elMinRootInput.value.trim();
    if (!minRootNote) {
        throw new Error("Enter a minimum chord root (e.g., G2).");
    }
    const minRootMidi = theory.noteWithOctaveToMidi(minRootNote);
    return { minRootNote, minRootMidi };
}
function readMode1Config() {
    const { minRootNote, minRootMidi } = readMinRootSetting();
    const loopTimes = Number(elLoopTimesInput.value || 1);
    if (!Number.isFinite(loopTimes) || loopTimes < 1) {
        throw new Error("Loop times must be at least 1.");
    }
    const keyCenter = elKeyInput.value.trim();
    if (!keyCenter) {
        throw new Error("Enter a key center.");
    }
    theory.noteNameToPitchClassSemitones(keyCenter);
    const rows = Array.from(elProgressionRows.querySelectorAll(".progression-row"));
    if (!rows.length) {
        throw new Error("Add at least one chord to the progression.");
    }
    const progression = rows.map((row) => {
        const degree = row.querySelector(".chord-degree")
            .value.trim();
        if (!degree) {
            throw new Error("Chord degree cannot be empty.");
        }
        theory.parseDegreeToSemitones(degree);
        const quality = row.querySelector(".chord-quality")
            .value;
        const allowedText = row.querySelector(".upper-degrees")
            .value;
        const questions = Number(row.querySelector(".question-count").value || 1);
        const allowedUpperDegrees = theory.parseDegreeList(allowedText);
        if (!Number.isFinite(questions) || questions < 1) {
            throw new Error("Questions per chord must be at least 1.");
        }
        return {
            chordDegree: degree,
            quality,
            allowedUpperDegrees,
            questions: Math.floor(questions),
        };
    });
    return {
        keyCenter,
        progression,
        minRootNote,
        minRootMidi,
        loopTimes: Math.floor(loopTimes),
    };
}
function buildCustomPresetFromSetup(name) {
    const mode = getMode();
    if (mode !== "mode1") {
        return {
            preset: null,
            error: "Switch to Mode 1 to save a progression.",
        };
    }
    const keyCenter = elKeyInput.value.trim();
    if (!keyCenter) {
        return { preset: null, error: "Enter a key center before saving." };
    }
    try {
        theory.noteNameToPitchClassSemitones(keyCenter);
    }
    catch {
        return { preset: null, error: "Key center is invalid." };
    }
    const rows = Array.from(elProgressionRows.querySelectorAll(".progression-row"));
    if (!rows.length) {
        return { preset: null, error: "Add at least one chord before saving." };
    }
    const chords = [];
    for (const row of rows) {
        const degree = row.querySelector(".chord-degree").value.trim();
        const quality = row.querySelector(".chord-quality")
            .value;
        const scaleSelect = row.querySelector(".scale-select");
        const scaleId = scaleSelect.value;
        const questions = Number(row.querySelector(".question-count").value || 1);
        if (!degree) {
            return { preset: null, error: "Chord degree cannot be empty." };
        }
        try {
            theory.parseDegreeToSemitones(degree);
        }
        catch {
            return { preset: null, error: `Invalid chord degree: ${degree}` };
        }
        if (!isChordQuality(quality)) {
            return { preset: null, error: "Chord quality is invalid." };
        }
        if (!isScaleId(scaleId)) {
            return {
                preset: null,
                error: "Custom scales cannot be saved. Please choose a named scale for every chord.",
            };
        }
        chords.push({
            chordDegree: degree,
            quality,
            scaleId,
            questions: Number.isFinite(questions) && questions >= 1
                ? Math.floor(questions)
                : undefined,
        });
    }
    return {
        preset: {
            id: `custom-${slugify(name)}-${Date.now()}`,
            name,
            category: "Customs",
            defaultKey: keyCenter,
            chords,
        },
        error: null,
    };
}
function applyProgressionPreset(preset) {
    const mode1Radio = document.querySelector("input[name='mode'][value='mode1']");
    if (mode1Radio) {
        mode1Radio.checked = true;
    }
    updateModeUI();
    elKeyInput.value = preset.defaultKey;
    elProgressionRows.innerHTML = "";
    activeProgressionName = preset.name;
    preset.chords.forEach((chord) => {
        const scaleOption = scaleById[chord.scaleId];
        const allowedUpperDegrees = scaleOption
            ? scaleOption.tokens
            : theory.parseDegreeList("1 2 3 4 5 6 7");
        addProgressionRow({
            chordDegree: chord.chordDegree,
            quality: chord.quality,
            allowedUpperDegrees,
            questions: chord.questions ?? 1,
        });
    });
}
function getAllProgressions() {
    return [...PROGRESSION_PRESETS, ...tuneProgressions, ...customProgressions];
}
function downloadPreset(preset) {
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
}
function handleDeleteCustom(id) {
    customProgressions = customProgressions.filter((preset) => preset.id !== id);
    saveCustomProgressions(customProgressions);
    renderProgressionList();
}
async function handleImportCustom(input) {
    const file = input.files?.[0];
    if (!file) {
        return;
    }
    try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const imported = [];
        if (Array.isArray(parsed)) {
            parsed.forEach((item) => {
                const preset = normalizePreset(item, "Customs");
                if (preset) {
                    imported.push(preset);
                }
            });
        }
        else {
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
            const existingIndex = customProgressions.findIndex((item) => item.name === preset.name);
            if (existingIndex >= 0) {
                customProgressions[existingIndex] = {
                    ...preset,
                    id: customProgressions[existingIndex].id,
                };
            }
            else {
                customProgressions.push(preset);
            }
        });
        saveCustomProgressions(customProgressions);
        renderProgressionList();
    }
    catch {
        alert("Unable to import progression.");
    }
    finally {
        input.value = "";
    }
}
async function loadTuneProgressions() {
    try {
        const response = await fetch("./tunes/index.json");
        if (!response.ok) {
            return;
        }
        const fileList = (await response.json());
        if (!Array.isArray(fileList)) {
            return;
        }
        const loaded = [];
        for (const fileName of fileList) {
            const res = await fetch(`./tunes/${fileName}`);
            if (!res.ok) {
                continue;
            }
            const presetRaw = await res.json();
            const preset = normalizePreset(presetRaw, "Tunes");
            if (preset) {
                loaded.push(preset);
            }
        }
        tuneProgressions = loaded;
    }
    catch {
        tuneProgressions = [];
    }
}
function renderProgressionList() {
    elProgressionList.innerHTML = "";
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
        const matches = allPresets.filter((preset) => preset.category === category.id);
        if (!matches.length) {
            const empty = document.createElement("p");
            empty.className = "progression-empty";
            empty.textContent = "No presets yet.";
            items.appendChild(empty);
        }
        else {
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
                const chordLabels = preset.chords.map((chord) => `${chord.chordDegree}-${chord.quality}`);
                const maxPreview = 8;
                const preview = chordLabels.slice(0, maxPreview).join("  ");
                const suffix = chordLabels.length > maxPreview ? " ..." : "";
                meta.textContent = `${preset.defaultKey} · ${preview}${suffix}`;
                btn.append(name, meta);
                btn.addEventListener("click", () => applyProgressionPreset(preset));
                card.appendChild(btn);
                if (category.id === "Customs") {
                    const actions = document.createElement("div");
                    actions.className = "progression-card-actions";
                    const exportBtn = document.createElement("button");
                    exportBtn.type = "button";
                    exportBtn.className = "progression-action";
                    exportBtn.textContent = "Export";
                    exportBtn.addEventListener("click", () => downloadPreset(preset));
                    const deleteBtn = document.createElement("button");
                    deleteBtn.type = "button";
                    deleteBtn.className = "progression-action danger";
                    deleteBtn.textContent = "Delete";
                    deleteBtn.addEventListener("click", () => handleDeleteCustom(preset.id));
                    actions.append(exportBtn, deleteBtn);
                    card.appendChild(actions);
                }
                items.appendChild(card);
            });
        }
        group.appendChild(items);
        elProgressionList.appendChild(group);
    });
}
function readMode2Config() {
    const { minRootNote, minRootMidi } = readMinRootSetting();
    const mode2Input = document.getElementById("mode2Questions");
    const totalQuestions = Number(mode2Input?.value || 1);
    if (!Number.isFinite(totalQuestions) || totalQuestions < 1) {
        throw new Error("Questions per test must be at least 1.");
    }
    const allowedByQuality = CHORD_QUALITIES.reduce((acc, quality) => {
        acc[quality] = [];
        return acc;
    }, {});
    const enabledQualities = [];
    const rows = Array.from(elMode2Rows.querySelectorAll(".mode2-row"));
    rows.forEach((row) => {
        const quality = row.dataset.quality;
        if (!quality) {
            return;
        }
        const toggle = row.querySelector(".mode2-enable");
        const degreesInput = row.querySelector(".mode2-degrees");
        if (!toggle.checked) {
            return;
        }
        allowedByQuality[quality] = theory.parseDegreeList(degreesInput.value);
        enabledQualities.push(quality);
    });
    if (!enabledQualities.length) {
        throw new Error("Select at least one chord quality for Mode 2.");
    }
    return {
        totalQuestions: Math.floor(totalQuestions),
        allowedByQuality,
        enabledQualities,
        minRootNote,
        minRootMidi,
    };
}
// ------------------------------
// Test generation
// ------------------------------
let questionQueue = [];
let questionIndex = 0;
let currentQuestion = null;
let attempts = 0;
let currentQuestionRecords = [];
let currentTestName = CUSTOM_PROGRESSION_NAME;
function buildMode1Queue(config) {
    const queue = [];
    for (let loopIndex = 0; loopIndex < config.loopTimes; loopIndex += 1) {
        config.progression.forEach((chord, chordIndex) => {
            for (let i = 0; i < chord.questions; i += 1) {
                queue.push({
                    mode: "mode1",
                    keyCenter: config.keyCenter,
                    minRootMidi: config.minRootMidi,
                    chordIndex,
                    chordCount: config.progression.length,
                    questionInChord: i + 1,
                    questionsPerChord: chord.questions,
                    chordDegree: chord.chordDegree,
                    quality: chord.quality,
                    allowedUpperDegrees: chord.allowedUpperDegrees,
                    playChord: i === 0,
                });
            }
        });
    }
    return queue;
}
function buildMode2Queue(config) {
    const queue = [];
    for (let i = 0; i < config.totalQuestions; i += 1) {
        const quality = theory.pickRandom(config.enabledQualities);
        const chordRoot = theory.pickRandom(RANDOM_ROOTS);
        queue.push({
            mode: "mode2",
            keyCenter: null,
            minRootMidi: config.minRootMidi,
            chordIndex: i,
            chordCount: config.totalQuestions,
            questionInChord: 1,
            questionsPerChord: 1,
            chordRoot,
            quality,
            allowedUpperDegrees: config.allowedByQuality[quality],
            playChord: true,
        });
    }
    return queue;
}
function buildQuestion(event) {
    let chordRootMidi = 0;
    let chordTonicName = "";
    const minRootMidi = typeof event.minRootMidi === "number"
        ? event.minRootMidi
        : MIN_CHORD_ROOT_MIDI;
    if (event.mode === "mode1") {
        chordRootMidi = theory.computeChordRootMidiFromKey(event.keyCenter, event.chordDegree, 1);
        chordRootMidi = theory.clampRootMidiToMin(chordRootMidi, minRootMidi);
        const keyPc = theory.noteNameToPitchClassSemitones(event.keyCenter);
        const offset = theory.parseDegreeToSemitones(event.chordDegree);
        chordTonicName = theory.pcToNameSharp(keyPc + offset);
    }
    else {
        chordRootMidi = theory.computeChordRootMidiFromNote(event.chordRoot, 1);
        chordRootMidi = theory.clampRootMidiToMin(chordRootMidi, minRootMidi);
        chordTonicName = event.chordRoot;
    }
    const chordIntervals = theory.buildChordIntervals(event.quality);
    const chordMidis = theory.buildChordVoicing(chordRootMidi, chordIntervals);
    const chordVelocities = [
        readVelocity(elVelocityRoot, CHORD_VOICE_VELOCITIES.root),
        readVelocity(elVelocityFifth, CHORD_VOICE_VELOCITIES.fifth),
        readVelocity(elVelocitySeventh, CHORD_VOICE_VELOCITIES.seventh),
        readVelocity(elVelocityThird, CHORD_VOICE_VELOCITIES.third),
    ];
    const leadVelocity = readVelocity(elVelocityLead, LEAD_VELOCITY_DEFAULT);
    const topChordMidi = Math.max(...chordMidis);
    const correctDegree = theory.pickRandom(event.allowedUpperDegrees);
    const upperMidi = theory.chooseUpperMidi(chordRootMidi, correctDegree, topChordMidi);
    return {
        ...event,
        chordRootMidi,
        chordTonicName,
        chordVelocities,
        leadVelocity,
        chordNotes: chordMidis.map(theory.midiToNoteNameSharp),
        upperNote: theory.midiToNoteNameSharp(upperMidi),
        correctUpperDegree: correctDegree,
    };
}
function resetLiveDisplay() {
    elKeyLabel.textContent = "-";
    elChordLabel.textContent = "-";
    elTonicLabel.textContent = "-";
    elQuestionLabel.textContent = "-";
    elTimeLabel.textContent = "0.00s";
    elAttemptsLabel.textContent = "0";
    elAnswers.innerHTML = "";
    setStatus("Configure a test and press Start.");
    btnReplay.disabled = true;
    elCompletionPanel.classList.add("hidden");
    elRerunControls.innerHTML = "";
}
function renderQuestion(question) {
    const total = questionQueue.length;
    const position = questionIndex + 1;
    const keyLabel = question.mode === "mode1" ? question.keyCenter : "Random";
    elKeyLabel.textContent = keyLabel;
    if (question.mode === "mode1") {
        elChordLabel.textContent =
            question.chordDegree + " " + question.quality;
    }
    else {
        elChordLabel.textContent =
            question.chordTonicName + " " + question.quality;
    }
    elTonicLabel.textContent = question.chordTonicName;
    elQuestionLabel.textContent =
        position +
            " / " +
            total +
            (question.mode === "mode1"
                ? ` (Chord ${question.chordIndex + 1}/${question.chordCount}, Q ${question.questionInChord}/${question.questionsPerChord})`
                : "");
    attempts = 0;
    elAttemptsLabel.textContent = "0";
    elAnswers.innerHTML = "";
    setStatus(question.playChord
        ? "Listen to the chord, then the upper note. Identify the degree."
        : "New upper note (same chord). Identify the degree.");
    question.allowedUpperDegrees.forEach((deg) => {
        const button = document.createElement("button");
        button.textContent = deg;
        button.addEventListener("click", () => handleAnswer(deg));
        elAnswers.appendChild(button);
    });
}
function handleAnswer(selectedDegree) {
    if (!currentQuestion) {
        return;
    }
    attempts += 1;
    elAttemptsLabel.textContent = String(attempts);
    if (selectedDegree === currentQuestion.correctUpperDegree) {
        const elapsedSeconds = (performance.now() - startPerfMs) / 1000;
        const chordDegree = currentQuestion.mode === "mode1"
            ? currentQuestion.chordDegree
            : "/";
        currentQuestionRecords.push({
            chordDegree,
            chordQuality: currentQuestion.quality,
            upperDegree: currentQuestion.correctUpperDegree,
            timeSeconds: Number(elapsedSeconds.toFixed(3)),
            attempts,
        });
        stopTimer();
        setStatus("Correct. Moving to the next question...", "ok");
        btnReplay.disabled = true;
        Array.from(elAnswers.querySelectorAll("button")).forEach((btn) => {
            btn.disabled = true;
        });
        window.setTimeout(() => {
            questionIndex += 1;
            loadQuestion();
        }, 600);
    }
    else {
        setStatus("Not yet. Try again.", "warn");
    }
}
function loadQuestion() {
    if (questionIndex >= questionQueue.length) {
        finishTest();
        return;
    }
    currentQuestion = buildQuestion(questionQueue[questionIndex]);
    renderQuestion(currentQuestion);
    startTimer();
    btnReplay.disabled = false;
    audio.schedulePlayback(currentQuestion);
}
function finishTest() {
    stopTimer();
    currentQuestion = null;
    btnReplay.disabled = true;
    elAnswers.innerHTML = "";
    setStatus("Test complete. Choose a rerun option.", "ok");
    elCompletionPanel.classList.remove("hidden");
    const questionCount = currentQuestionRecords.length || 1;
    const avgTime = currentQuestionRecords.reduce((sum, rec) => sum + rec.timeSeconds, 0) /
        questionCount;
    const avgAttempts = currentQuestionRecords.reduce((sum, rec) => sum + rec.attempts, 0) /
        questionCount;
    const testRecord = {
        progressionName: currentTestName,
        avgTimeSeconds: Number(avgTime.toFixed(3)),
        avgAttempts: Number(avgAttempts.toFixed(2)),
        datetime: new Date().toISOString(),
    };
    addRecords(STORAGE_KEYS.questionHistory, currentQuestionRecords);
    addRecord(STORAGE_KEYS.testHistory, testRecord);
    renderRecords();
    elCompletionStats.innerHTML = "";
    const statItems = [
        { label: "Progression", value: testRecord.progressionName },
        { label: "Avg time", value: `${testRecord.avgTimeSeconds}s` },
        { label: "Avg attempts", value: String(testRecord.avgAttempts) },
    ];
    statItems.forEach((item) => {
        const card = document.createElement("div");
        card.className = "completion-stat";
        const label = document.createElement("div");
        label.className = "label";
        label.textContent = item.label;
        const value = document.createElement("div");
        value.className = "value";
        value.textContent = item.value;
        card.append(label, value);
        elCompletionStats.appendChild(card);
    });
    if (activeMode === "mode1" && lastMode1Config) {
        elCompletionSummary.textContent =
            "Run the same progression again, or shift the key center.";
        elRerunControls.innerHTML = "";
        const btnSame = document.createElement("button");
        btnSame.textContent = "Run again (same key)";
        btnSame.addEventListener("click", () => rerunMode1(0));
        const btnP4 = document.createElement("button");
        btnP4.textContent = "Raise key by P4";
        btnP4.className = "secondary";
        btnP4.addEventListener("click", () => rerunMode1(5));
        const btnP5 = document.createElement("button");
        btnP5.textContent = "Raise key by P5";
        btnP5.className = "secondary";
        btnP5.addEventListener("click", () => rerunMode1(7));
        elRerunControls.append(btnSame, btnP4, btnP5);
    }
    else if (activeMode === "mode2" && lastMode2Config) {
        elCompletionSummary.textContent = "Ready for another random test?";
        elRerunControls.innerHTML = "";
        const btnAgain = document.createElement("button");
        btnAgain.textContent = "Run another random test";
        btnAgain.addEventListener("click", () => {
            if (lastMode2Config) {
                startTest(lastMode2Config, "mode2");
            }
        });
        elRerunControls.append(btnAgain);
    }
}
function startTest(config, mode) {
    activeMode = mode;
    currentQuestionRecords = [];
    currentTestName =
        mode === "mode1"
            ? activeProgressionName || CUSTOM_PROGRESSION_NAME
            : "Random progression";
    questionQueue =
        mode === "mode1"
            ? buildMode1Queue(config)
            : buildMode2Queue(config);
    questionIndex = 0;
    elCompletionPanel.classList.add("hidden");
    elRerunControls.innerHTML = "";
    loadQuestion();
}
function rerunMode1(shiftSemis) {
    if (!lastMode1Config) {
        return;
    }
    const updatedKey = theory.transposeKeyCenter(lastMode1Config.keyCenter, shiftSemis);
    const newConfig = {
        ...lastMode1Config,
        keyCenter: updatedKey,
    };
    elKeyInput.value = updatedKey;
    if (newConfig.minRootNote) {
        elMinRootInput.value = newConfig.minRootNote;
    }
    elLoopTimesInput.value = String(newConfig.loopTimes ?? 1);
    lastMode1Config = newConfig;
    startTest(newConfig, "mode1");
}
function renderRecords() {
    const tests = loadHistory(STORAGE_KEYS.testHistory);
    const questions = loadHistory(STORAGE_KEYS.questionHistory);
    elTestRecords.innerHTML = "";
    elStatsRecords.innerHTML = "";
    const buildCell = (text, className = "stats-cell") => {
        const cell = document.createElement("div");
        cell.className = className;
        cell.textContent = text;
        return cell;
    };
    const updateTestFilterOptions = (names) => {
        const options = [TEST_FILTER_ALL, ...names];
        if (!options.includes(testFilter)) {
            testFilter = TEST_FILTER_ALL;
        }
        elTestFilterSelect.innerHTML = "";
        const allOption = document.createElement("option");
        allOption.value = TEST_FILTER_ALL;
        allOption.textContent = "All progressions";
        elTestFilterSelect.appendChild(allOption);
        names.forEach((name) => {
            const option = document.createElement("option");
            option.value = name;
            option.textContent = name;
            elTestFilterSelect.appendChild(option);
        });
        elTestFilterSelect.value = testFilter;
    };
    const progressionNames = Array.from(new Set(tests.map((record) => record.progressionName))).sort((a, b) => a.localeCompare(b));
    updateTestFilterOptions(progressionNames);
    const filteredTests = testFilter === TEST_FILTER_ALL
        ? tests
        : tests.filter((record) => record.progressionName === testFilter);
    const groupAverages = new Map();
    tests.forEach((record) => {
        const stats = groupAverages.get(record.progressionName) || {
            sum: 0,
            count: 0,
        };
        stats.sum += record.avgTimeSeconds;
        stats.count += 1;
        groupAverages.set(record.progressionName, stats);
    });
    if (!filteredTests.length) {
        const empty = document.createElement("div");
        empty.className = "record-card empty";
        empty.textContent =
            testFilter === TEST_FILTER_ALL
                ? "No test records yet."
                : "No records for this progression.";
        elTestRecords.appendChild(empty);
    }
    else {
        const table = document.createElement("div");
        table.className = "stats-table tests-table";
        const header = document.createElement("div");
        header.className = "stats-row stats-header";
        header.append(buildCell("Progression", "stats-cell stats-label"), buildCell("Avg time"), buildCell("Avg attempts"), buildCell("Prog avg time"), buildCell("Date"));
        table.appendChild(header);
        filteredTests.slice(0, 20).forEach((record) => {
            const row = document.createElement("div");
            row.className = "stats-row";
            const group = groupAverages.get(record.progressionName);
            const groupAvg = group && group.count ? group.sum / group.count : record.avgTimeSeconds;
            row.append(buildCell(record.progressionName, "stats-cell stats-label"), buildCell(`${record.avgTimeSeconds}s`), buildCell(String(record.avgAttempts)), buildCell(`${groupAvg.toFixed(3)}s`), buildCell(new Date(record.datetime).toLocaleString()));
            table.appendChild(row);
        });
        elTestRecords.appendChild(table);
    }
    const formatDegreeLabel = (degree) => degree === "/" ? "Random" : degree;
    const calculateStats = (items) => {
        const count = items.length || 1;
        const totalTime = items.reduce((sum, item) => sum + item.timeSeconds, 0);
        const totalAttempts = items.reduce((sum, item) => sum + item.attempts, 0);
        return {
            avgTime: Number((totalTime / count).toFixed(3)),
            avgAttempts: Number((totalAttempts / count).toFixed(2)),
            count: items.length,
        };
    };
    const groupRecords = (items, keyFn) => {
        const groups = new Map();
        items.forEach((record) => {
            const key = keyFn(record);
            const list = groups.get(key) ?? [];
            list.push(record);
            groups.set(key, list);
        });
        return groups;
    };
    const qualityOrder = new Map(CHORD_QUALITIES.map((quality, index) => [quality, index]));
    const getQualityIndex = (quality) => qualityOrder.get(quality) ?? Number.MAX_SAFE_INTEGER;
    const getDegreeIndex = (degree) => {
        if (degree === "/") {
            return Number.POSITIVE_INFINITY;
        }
        try {
            return theory.parseDegreeToSemitones(degree);
        }
        catch {
            return Number.POSITIVE_INFINITY;
        }
    };
    const compareByName = (a, b, keyType) => {
        const aKey = keyType === "quality" ? getQualityIndex(a.key) : getDegreeIndex(a.key);
        const bKey = keyType === "quality" ? getQualityIndex(b.key) : getDegreeIndex(b.key);
        if (aKey !== bKey) {
            return aKey - bKey;
        }
        return a.key.localeCompare(b.key);
    };
    const compareByTime = (a, b, direction, keyType) => {
        const delta = (a.stats.avgTime - b.stats.avgTime) * direction;
        if (delta !== 0) {
            return delta;
        }
        return compareByName(a, b, keyType);
    };
    const renderStats = (items) => {
        if (!items.length) {
            const empty = document.createElement("div");
            empty.className = "record-card empty";
            empty.textContent = "No stats yet.";
            elStatsRecords.appendChild(empty);
            return;
        }
        const table = document.createElement("div");
        table.className = "stats-table";
        const buildCell = (text, className = "stats-cell") => {
            const cell = document.createElement("div");
            cell.className = className;
            cell.textContent = text;
            return cell;
        };
        const header = document.createElement("div");
        header.className = "stats-row stats-header";
        header.append(buildCell(statsGrouping === "quality" ? "Quality" : "Root degree", "stats-cell stats-label"), buildCell("Avg time"), buildCell("Avg attempts"), buildCell("Questions"));
        table.appendChild(header);
        const topKeyType = statsGrouping === "quality"
            ? "quality"
            : "degree";
        const subKeyType = statsGrouping === "quality"
            ? "degree"
            : "quality";
        const topKey = statsGrouping === "quality"
            ? (record) => record.chordQuality
            : (record) => record.chordDegree;
        const subKey = statsGrouping === "quality"
            ? (record) => record.chordDegree
            : (record) => record.chordQuality;
        const sortDirection = statsOrder === "time-desc" ? -1 : 1;
        const sortGroups = statsOrder === "name"
            ? (a, b) => compareByName(a, b, topKeyType)
            : (a, b) => compareByTime(a, b, sortDirection, topKeyType);
        const sortSubgroups = statsOrder === "name"
            ? (a, b) => compareByName(a, b, subKeyType)
            : (a, b) => compareByTime(a, b, sortDirection, subKeyType);
        const groups = Array.from(groupRecords(items, topKey).entries())
            .map(([key, records]) => ({
            key,
            records,
            stats: calculateStats(records),
        }))
            .sort(sortGroups);
        groups.forEach((group) => {
            const groupRow = document.createElement("div");
            groupRow.className = "stats-row stats-row--group";
            const groupLabel = statsGrouping === "quality"
                ? group.key
                : `Degree ${formatDegreeLabel(group.key)}`;
            groupRow.append(buildCell(groupLabel, "stats-cell stats-label"), buildCell(`${group.stats.avgTime}s`), buildCell(String(group.stats.avgAttempts)), buildCell(String(group.stats.count)));
            table.appendChild(groupRow);
            const subEntries = Array.from(groupRecords(group.records, subKey).entries())
                .map(([key, records]) => ({
                key,
                records,
                stats: calculateStats(records),
            }))
                .sort(sortSubgroups);
            subEntries.forEach((entry) => {
                const subRow = document.createElement("div");
                subRow.className = "stats-row stats-row--sub";
                const label = statsGrouping === "quality"
                    ? `↳ Degree ${formatDegreeLabel(entry.key)}`
                    : `↳ ${entry.key}`;
                subRow.append(buildCell(label, "stats-cell stats-label"), buildCell(`${entry.stats.avgTime}s`), buildCell(String(entry.stats.avgAttempts)), buildCell(String(entry.stats.count)));
                table.appendChild(subRow);
            });
        });
        elStatsRecords.appendChild(table);
    };
    renderStats(questions);
}
function updateStatsToggle() {
    elStatsGroupSelect.value = statsGrouping;
    elStatsOrderSelect.value = statsOrder;
}
function updateRecordsTabs() {
    elRecordsTabButtons.forEach((button) => {
        const tab = button.dataset.recordsTab;
        const isActive = tab === recordsTab;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-selected", String(isActive));
    });
    elRecordsTabPanels.forEach((panel) => {
        const panelTab = panel.dataset.recordsPanel;
        panel.classList.toggle("active", panelTab === recordsTab);
    });
}
// ------------------------------
// Event wiring
// ------------------------------
elRecordsTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const tab = button.dataset.recordsTab;
        if (tab === "tests" || tab === "stats") {
            recordsTab = tab;
            updateRecordsTabs();
        }
    });
});
elStatsGroupSelect.addEventListener("change", () => {
    const group = elStatsGroupSelect.value;
    if (group === "quality" || group === "degree") {
        statsGrouping = group;
        updateStatsToggle();
        renderRecords();
    }
});
elStatsOrderSelect.addEventListener("change", () => {
    const order = elStatsOrderSelect.value;
    if (order === "name" || order === "time-asc" || order === "time-desc") {
        statsOrder = order;
        updateStatsToggle();
        renderRecords();
    }
});
elTestFilterSelect.addEventListener("change", () => {
    testFilter = elTestFilterSelect.value || TEST_FILTER_ALL;
    renderRecords();
});
btnStartAudio.addEventListener("click", async () => {
    try {
        await audio.ensureAudioReady();
        setStatus("Audio ready. Configure your test and press Start.", "ok");
    }
    catch (err) {
        setStatus("Audio failed to start.", "warn");
    }
});
btnStartTest.addEventListener("click", async () => {
    try {
        await audio.ensureAudioReady();
        const mode = getMode();
        if (mode === "mode1") {
            const config = readMode1Config();
            lastMode1Config = config;
            startTest(config, "mode1");
        }
        else {
            const config = readMode2Config();
            lastMode2Config = config;
            startTest(config, "mode2");
        }
        elLiveQuestionPanel.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    }
    catch (err) {
        setStatus(err.message || "Unable to start.", "warn");
    }
});
btnStopTest.addEventListener("click", () => {
    stopTimer();
    currentQuestion = null;
    questionQueue = [];
    questionIndex = 0;
    resetLiveDisplay();
});
btnReplay.addEventListener("click", () => {
    if (!currentQuestion || !audio.isReady()) {
        return;
    }
    audio.schedulePlayback(currentQuestion);
});
btnSaveProgression.addEventListener("click", () => {
    setSaveError();
    const name = elSaveProgressionName.value.trim();
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
    const existingIndex = customProgressions.findIndex((item) => item.name === preset.name);
    if (existingIndex >= 0) {
        customProgressions[existingIndex] = {
            ...preset,
            id: customProgressions[existingIndex].id,
        };
    }
    else {
        customProgressions.push(preset);
    }
    saveCustomProgressions(customProgressions);
    activeProgressionName = preset.name;
    renderProgressionList();
    setSaveError();
});
elSaveProgressionName.addEventListener("input", () => {
    setSaveError();
});
btnAddChord.addEventListener("click", () => {
    addProgressionRow();
    markProgressionCustom();
});
document.querySelectorAll("input[name='mode']").forEach((radio) => {
    radio.addEventListener("change", updateModeUI);
});
// Init
loadDefaultProgression();
renderMode2Rows();
initVelocityControls();
customProgressions = loadCustomProgressions();
renderProgressionList();
void loadTuneProgressions().then(() => {
    renderProgressionList();
});
updateModeUI();
resetLiveDisplay();
updateRecordsTabs();
updateStatsToggle();
renderRecords();
