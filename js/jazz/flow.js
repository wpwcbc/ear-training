import { defaults, validateConfig, loadSessions, saveSession, isRecognition, recommendation, } from "./model.js";
import { qualities, degrees, parseChord, allowedTargetDegrees, chordToneDegrees, } from "./theory.js";
import { progressionBank } from "./progressions.js";
import { flowKeys, readList, rememberConfig, canonicalizeConfig, sessionStatus, missedQuestions, } from "./lifecycle.js";
import { icon, commandIcon, relativeDate, duration } from "./ui.js";
import { renderAnalytics } from "./analytics/views.js";
import { compileSuggestedDiagnostic, } from "./analytics/drills.js";
import { readAll, put } from "./analytics/repository.js";
import { dataRevision } from "./analytics/hierarchy.js";
export const exerciseNames = {
    m1: "Hear a Chord Degree",
    m2: "Identify a Chord Degree",
    m3: "Same Note, New Chord",
    m4: "Anticipate Next Chord Tone",
    m5: "Follow a Progression",
    m6: "Bebop Phrase Lab",
    m7: "Ear to Bass",
};
const purposes = {
    m1: "Imagine and sing a degree over a chord.",
    m2: "Recognize the melody's role in the chord.",
    m3: "Hold one pitch as its harmonic function changes.",
    m4: "Sing the next target before its chord sounds.",
    m5: "Keep a melodic line through changing harmony.",
    m6: "Hear, sing, predict and vary an original phrase.",
    m7: "Connect an imagined pitch to the bass fingerboard.",
};
const steps = ["Exercise", "Harmony", "Targets", "Playback", "Review"];
const roots = "C C# D Eb E F F# G Ab A Bb B".split(" ");
const $ = (id) => document.getElementById(id);
function node(tag, text = "", className = "") {
    const item = document.createElement(tag);
    item.textContent = text;
    item.className = className;
    return item;
}
function action(text, handler, secondary = true) {
    const button = node("button", text, secondary ? "secondary" : "");
    button.type = "button";
    commandIcon(button);
    button.onclick = () => {
        Promise.resolve().then(handler).catch(showError);
    };
    return button;
}
function showError(error) {
    $("flow-status").dataset.tone = "error";
    $("flow-status").textContent =
        error instanceof Error ? error.message : String(error);
}
function summary(config) {
    return [
        exerciseNames[config.mode],
        ["m1", "m2", "m7"].includes(config.mode)
            ? `${config.rootOrder === "fixed" ? config.root : config.roots} / ${(config.qualityPool ?? [config.quality]).join(", ")}`
            : config.mode === "m6"
                ? `${config.phraseId}, ${config.variation}, transpose ${config.transpose}`
                : (config.progressionPool ?? [config.progression])
                    .map((id) => progressionBank.find((p) => p.id === id)?.name ??
                    "Custom progression")
                    .join(", "),
        config.degreePool?.join(", ") ??
            (config.mode === "m1" || config.mode === "m7"
                ? config.degree
                : config.mode === "m2"
                    ? config.recognitionPool
                    : {
                        guided: "Preset targets",
                        nearest: "Nearest guide tones",
                        common: "Common tones",
                        stepwise: "Stepwise targets",
                        leap: "Leaping targets",
                    }[config.path]),
        `${config.bpm} BPM / ${config.beats} beats per chord / ${config.context === "full" ? "Full chord" : config.context === "shell" ? "Chord shell" : "Root anchor"}${config.countIn ? " / " + config.countIn + "-beat count-in" : ""}${config.metronome ? " / Metronome" : ""}`,
        config.count ? `${config.count} questions` : "Endless",
    ];
}
export function installFlow(engine) {
    let draft = engine.getConfig(), draftCustoms = engine.getCustoms();
    let wizardStep = 0, maxStep = 0, currentRoute = "", dashboardTab = "recent";
    let source = "wizard", sourcePresetId;
    let creating = false;
    let showAllRecent = false;
    let prepareTimer = 0;
    let startingContext = false;
    let pendingAutoPlay = null;
    let historyFilters = {
        mode: "",
        status: "",
        grading: "",
        date: "",
        count: "",
        duration: "",
    };
    const main = document.querySelector("main");
    const navigation = document.querySelector(".lab-tabs");
    const originalPractice = document.querySelector(".practice");
    const settings = $("settings");
    const settingsDetails = settings.parentElement;
    const customEditor = $("custom-editor");
    const modeBar = document.querySelector(".mode-bar");
    const shell = node("div");
    shell.id = "flow-shell";
    shell.innerHTML = `
    <p id="flow-status" role="status" aria-live="polite"></p>
    <section id="dashboard-view"><div class="dashboard-start"><div><h2 id="dashboard-title">Your next practice</h2></div><button id="start-practicing">New session</button></div>
      <div id="resume-list"></div><div class="dashboard-shortcuts"><button class="secondary" data-config-shortcut="recent">Recent</button><button class="secondary" data-config-shortcut="saved">Saved</button></div>
      <div class="dashboard-workspace"><section class="mode-library" aria-labelledby="mode-library-title"><div class="mode-library-heading"><h3 id="mode-library-title">Choose your exercise</h3></div><div id="mode-library" class="mode-grid"></div></section>
      <section class="configuration-library" aria-labelledby="configuration-library-title"><h3 id="configuration-library-title">Your configurations</h3><div class="dashboard-tabs" role="tablist" aria-label="Configurations"><button data-dashboard="recent" role="tab">Recent</button><button data-dashboard="saved" role="tab">Saved</button><button data-dashboard="suggested" role="tab">Quick starts</button></div>
      <div id="configuration-list" role="tabpanel"></div></section></div><div id="dashboard-overview" class="overview"></div>
      <p class="local-notice">Saved in this browser only. Other devices do not sync; clearing browser data removes local practice records.</p>
    </section>
    <section id="wizard-view" hidden><div class="page-title"><span class="section-label">NEW SESSION</span><h2>Set Up Practice</h2></div><nav id="wizard-stepper" class="wizard-stepper" aria-label="Setup steps"></nav><div class="wizard-section-title"><span id="wizard-section-index"></span><h3 id="wizard-section-title"></h3></div>
      <div id="exercise-step"><label>Exercises<select id="exercise-filter"><option value="recommended">Recommended</option><option value="all">All Exercises</option></select></label><div id="exercise-list" class="exercise-list"></div></div>
      <div id="wizard-options"><div id="pool-fields"></div><div id="legacy-fields"></div></div>
      <div id="review-config"></div><p id="wizard-validation" role="status"></p>
      <div class="wizard-footer"><button id="wizard-back" class="secondary">Back</button><span id="wizard-short-summary"></span><button id="save-draft" class="secondary">Save Draft</button><button id="wizard-save-preset" class="secondary">Save as Preset</button><button id="wizard-next">Continue</button></div>
    </section>
    <section id="session-view" hidden><div class="session-top"><button id="session-exit" class="secondary">Exit</button><div class="session-identity"><strong id="session-exercise"></strong><span id="session-progress"></span></div><div id="session-tools"></div><details id="session-menu" class="row-menu"><summary class="row-menu-trigger">Session actions</summary><div class="row-menu-items"><button id="session-end" class="secondary">Finish Session</button></div></details></div><progress id="session-meter" value="0" max="10" aria-label="Session completion"></progress>
      <div class="session-playback"><p id="session-state" role="status" aria-live="polite"></p></div>
      <details id="compact-settings"><summary>Playback Settings</summary><div class="settings-grid"><label>Volume<input id="compact-volume" type="range" min="0" max="1" step="0.05"></label><label>Tempo<input id="compact-bpm" type="number" min="30" max="240"></label><label class="check"><input id="compact-metronome" type="checkbox">Metronome</label><button id="session-edit" class="secondary">End &amp; Edit Exercise</button></div></details>
      <div class="session-phases" aria-label="Practice stages"><span data-phase="listen">Listen</span><span data-phase="imagine">Imagine</span><span data-phase="compare">Compare</span><span data-phase="assess">Assess</span></div><p id="session-prepare" role="timer"></p><div id="practice-host"></div>
    </section>
    <section id="summary-view" hidden><h2>Session Summary</h2><div id="summary-content"></div><div id="summary-actions" class="actions"></div></section>`;
    main.append(shell);
    icon(document.querySelector(".lab-heading h1"), "audio-lines");
    icon($("start-practicing"), "play");
    document
        .querySelectorAll("[data-config-shortcut]")
        .forEach((button) => {
        icon(button, button.dataset.configShortcut === "saved" ? "bookmark" : "rotate-ccw");
        button.onclick = () => {
            document
                .querySelector(`[data-dashboard="${button.dataset.configShortcut}"]`)
                .click();
            document
                .querySelector(".configuration-library")
                .scrollIntoView({ block: "start" });
        };
    });
    icon($("wizard-back"), "arrow-left");
    icon($("save-draft"), "save", true);
    icon($("wizard-save-preset"), "bookmark");
    icon($("wizard-next"), "arrow-right");
    icon($("session-exit"), "arrow-left", true);
    icon($("session-menu").querySelector("summary"), "ellipsis", true);
    icon($("session-end"), "check");
    document.querySelector(".session-playback").append($("compact-settings"));
    $("practice-host").append(originalPractice);
    $("session-tools").append($("pause"));
    $("session-menu").querySelector(".row-menu-items").prepend($("favorite"));
    $("session-menu").addEventListener("click", (event) => {
        if (event.target.closest("button")) {
            $("session-menu").open = false;
            $("session-menu")
                .querySelector("summary")
                .focus({ preventScroll: true });
        }
    });
    const question = node("div", "", "session-question");
    for (const id of [
        "phase",
        "chart",
        "prompt",
        "instruction",
        "answer",
        "choices",
        "countdown",
    ])
        question.append($(id));
    originalPractice.prepend(question);
    const dock = node("div", "", "practice-dock");
    dock.append($("grading"), originalPractice.querySelector(".actions"), $("status"));
    originalPractice.append(dock);
    $("reference-details").append($("context-only"));
    for (const [id, name, only] of [
        ["start", "play", false],
        ["replay", "rotate-ccw", false],
        ["reveal", "eye", false],
        ["next", "arrow-right", false],
        ["pause", "pause", true],
        ["favorite", "bookmark", false],
        ["skip", "skip-forward", true],
        ["retry", "rotate-ccw", true],
    ])
        icon($(id), name, only);
    for (const [grade, name] of [
        ["correct", "check"],
        ["close", "minus"],
        ["missed", "x"],
    ])
        icon(document.querySelector(`[data-grade="${grade}"]`), name);
    icon($("compact-settings").querySelector("summary"), "sliders-horizontal");
    $("legacy-fields").append(modeBar, settingsDetails, customEditor);
    settingsDetails.open = true;
    settingsDetails.querySelector("summary").hidden = true;
    modeBar.hidden = true;
    $("free-tab").textContent = "Practice";
    $("history-tab").textContent = "History";
    $("path-tab").hidden = true;
    const stepFields = {
        1: [
            "root",
            "quality",
            "rootOrder",
            "roots",
            "progression",
            "span",
            "repeats",
            "phraseId",
            "context",
            "inversion",
            "recognitionQualities",
        ],
        2: [
            "degree",
            "recognitionPool",
            "responseDistractors",
            "path",
            "commonMode",
            "targetLimit",
            "targetPattern",
            "hintLevel",
            "showChords",
            "showProgression",
            "rangePreset",
            "low",
            "high",
            "vocalLow",
            "vocalHigh",
            "bassLow",
            "bassHigh",
            "variation",
            "transpose",
            "bassTask",
            "fretLow",
            "fretHigh",
            "fretNames",
        ],
        3: [
            "count",
            "runMode",
            "timbre",
            "countIn",
            "bpm",
            "beats",
            "volume",
            "revealMode",
            "predictionSeconds",
            "gapBeats",
        ],
    };
    for (const [step, ids] of Object.entries(stepFields))
        for (const id of ids)
            $(id).closest("label").dataset.wizardStep = step;
    for (const id of [
        "inversion",
        "repeats",
        "rangePreset",
        "low",
        "high",
        "vocalLow",
        "vocalHigh",
        "bassLow",
        "bassHigh",
        "fretNames",
        "transpose",
        "hintLevel",
    ])
        $(id).closest("label").dataset.advanced = "true";
    const customize = node("details", "", "customize-control");
    customize.append(node("summary", "Customize"));
    customize.ontoggle = () => $("wizard-options").classList.toggle("customizing", customize.open);
    $("wizard-options").insertBefore(customize, $("legacy-fields"));
    settings.querySelectorAll("details").forEach((detail) => {
        detail.open = true;
        detail.querySelector("summary").hidden = true;
    });
    function write(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }
    function presets() {
        return readList(localStorage, flowKeys.presets);
    }
    function draftSave() {
        write(flowKeys.draft, {
            schemaVersion: 1,
            config: draft,
            customs: draftCustoms,
            step: wizardStep,
            maxStep,
        });
    }
    function hydrate(config, customs = engine.getCustoms()) {
        draft = { ...defaults, ...structuredClone(config) };
        draftCustoms = structuredClone(customs);
        engine.setCustoms(draftCustoms);
        engine.setConfig(draft);
    }
    function readDraft() {
        const next = { ...draft };
        for (const key of Object.keys(defaults)) {
            const input = $(key);
            next[key] =
                typeof defaults[key] === "boolean"
                    ? input.checked
                    : typeof defaults[key] === "number"
                        ? Number(input.value)
                        : input.value;
        }
        if (next.rangePreset === "voice") {
            next.low = next.vocalLow;
            next.high = next.vocalHigh;
        }
        if (next.rangePreset === "bass") {
            next.low = next.bassLow;
            next.high = next.bassHigh;
        }
        draft = next;
        draftCustoms = engine.getCustoms();
    }
    function validateStep(step = wizardStep) {
        const single = ["m1", "m2", "m7"].includes(draft.mode);
        if (step >= 1 && single) {
            if (!draft.roots.trim())
                return "Harmony: select at least one root.";
            if (!draft.qualityPool?.length)
                return "Harmony: select at least one chord quality.";
        }
        if (step >= 1 &&
            ["m3", "m4", "m5"].includes(draft.mode) &&
            !draft.progressionPool?.length)
            return "Harmony: select at least one progression.";
        if (step >= 2 && single && !draft.degreePool?.length)
            return "Targets: select at least one target degree.";
        try {
            if (step >= 2)
                validateConfig(draft, draftCustoms);
            else if (single)
                draft.roots
                    .split(/[\s,]+/)
                    .filter(Boolean)
                    .forEach((root) => parseChord(root + "maj7"));
            return "";
        }
        catch (error) {
            return error.message;
        }
    }
    function normalizePools() {
        if (["m1", "m2", "m7"].includes(draft.mode)) {
            draft.qualityPool ?? (draft.qualityPool = draft.mode === "m2" && !draft.showChords
                ? draft.recognitionQualities.split(/\s+/)
                : [draft.quality]);
            draft.degreePool ?? (draft.degreePool = draft.mode === "m2"
                ? draft.recognitionPool.split(/\s+/)
                : [draft.degree]);
            draft.progressionPool = undefined;
        }
        else {
            draft.qualityPool = undefined;
            draft.progressionPool ?? (draft.progressionPool = [draft.progression]);
            if (draft.mode === "m3" || draft.mode === "m6")
                draft.degreePool = undefined;
        }
    }
    function syncWizardState() {
        engine.setConfig(draft);
        draftSave();
        const error = validateStep();
        $("wizard-validation").textContent = error;
        $("wizard-next").disabled = !!error || creating;
        const summaries = summary(draft);
        $("wizard-stepper")
            .querySelectorAll("small")
            .forEach((item, i) => {
            item.textContent = summaries[i];
        });
    }
    function pool(title, values, selected, change, label = (value) => value) {
        const fieldset = node("fieldset", "", "pool-field");
        fieldset.append(node("legend", title));
        const grid = node("div", "", "pool-grid");
        grid.dataset.pool = title;
        const commonQualities = ["maj7", "m7", "7", "m7b5"];
        const advanced = title === "Chord Qualities"
            ? node("details", "", "advanced-qualities")
            : null;
        const advancedLabel = node("summary", "More chord qualities");
        const advancedGrid = node("div", "", "pool-grid");
        if (advanced) {
            advanced.open = selected.some((value) => !commonQualities.includes(value));
            advanced.append(advancedLabel, advancedGrid);
        }
        const updateAdvancedLabel = () => {
            const count = advancedGrid.querySelectorAll("input:checked").length;
            advancedLabel.textContent = `More chord qualities${count ? ` (${count} selected)` : ""}`;
        };
        if (title === "Target Degrees") {
            const ordered = [
                "1",
                "b3",
                "3",
                "4",
                "b5",
                "5",
                "6",
                "bb7",
                "b7",
                "maj7",
                "b9",
                "9",
                "#9",
                "11",
                "#11",
                "#5",
                "b13",
                "13",
            ];
            values = ordered.filter((d) => values.includes(d));
        }
        values.forEach((value) => {
            if (title === "Target Degrees") {
                const isTension = [
                    "b9",
                    "9",
                    "#9",
                    "11",
                    "#11",
                    "#5",
                    "b13",
                    "13",
                ].includes(value);
                if (!grid.querySelector(`[data-group="${isTension ? "tensions" : "landmarks"}"]`)) {
                    const heading = node("div", isTension ? "Extensions & tensions" : "Chord landmarks", "pool-group-label");
                    heading.dataset.group = isTension ? "tensions" : "landmarks";
                    grid.append(heading);
                }
            }
            const wrapper = node("label", "", "check");
            const checkbox = node("input");
            checkbox.type = "checkbox";
            checkbox.value = value;
            checkbox.checked = selected.includes(value);
            checkbox.onchange = () => {
                change(Array.from(fieldset.querySelectorAll("input:checked")).map((input) => input.value));
                updateAdvancedLabel();
                syncWizardState();
            };
            wrapper.append(checkbox, node("span", label(value)));
            (advanced && !commonQualities.includes(value)
                ? advancedGrid
                : grid).append(wrapper);
        });
        fieldset.append(grid);
        if (advanced)
            fieldset.append(advanced);
        updateAdvancedLabel();
        $("pool-fields").append(fieldset);
    }
    function updateWizard() {
        normalizePools();
        engine.setConfig(draft);
        const stepper = $("wizard-stepper");
        stepper.replaceChildren();
        const texts = summary(draft);
        $("wizard-section-index").textContent = `0${wizardStep + 1}`;
        $("wizard-section-title").textContent = [
            "Choose your exercise",
            "Choose the harmony",
            "Set your targets",
            "Playback & session",
            "Ready to practice",
        ][wizardStep];
        steps.forEach((title, i) => {
            const button = action(`${i + 1}. ${title}`, () => {
                readDraft();
                wizardStep = i;
                go(`setup/${i + 1}`);
            });
            button.disabled = i > maxStep;
            button.setAttribute("aria-current", i === wizardStep ? "step" : "false");
            button.append(node("small", texts[i]));
            button.title = texts[i];
            stepper.append(button);
        });
        $("exercise-step").hidden = wizardStep !== 0;
        $("wizard-options").hidden = wizardStep === 0 || wizardStep === 4;
        modeBar.hidden = true;
        settingsDetails.hidden = false;
        settings
            .querySelectorAll("[data-wizard-step]")
            .forEach((label) => label.classList.toggle("wizard-off", Number(label.dataset.wizardStep) !== wizardStep));
        for (const id of [
            "quality",
            "degree",
            "roots",
            "root",
            "recognitionPool",
            "recognitionQualities",
            "progression",
        ])
            $(id).closest("label").classList.add("wizard-off");
        customEditor.classList.toggle("wizard-off", wizardStep !== 1);
        const holder = $("pool-fields");
        holder.replaceChildren();
        if (wizardStep === 1 && ["m1", "m2", "m7"].includes(draft.mode)) {
            pool("Chord Roots", roots, draft.roots.split(/[\s,]+/), (values) => {
                draft.roots = values.join(" ");
                if (!values.includes(draft.root))
                    draft.root = values[0] ?? "C";
            });
            pool("Chord Qualities", [...qualities], draft.qualityPool ?? [], (values) => {
                draft.qualityPool = values;
                draft.quality = (values[0] ?? "maj7");
                draft.recognitionQualities = values.join(" ");
            });
        }
        if (wizardStep === 1 && ["m3", "m4", "m5"].includes(draft.mode)) {
            pool("Progression Bank", [...progressionBank, ...draftCustoms].map((p) => p.id), draft.progressionPool ?? [], (values) => {
                draft.progressionPool = values;
                draft.progression = values[0] ?? defaults.progression;
            }, (id) => [...progressionBank, ...draftCustoms].find((p) => p.id === id)
                ?.name ?? id);
        }
        if (wizardStep === 2 && !["m3", "m6"].includes(draft.mode)) {
            const compatible = [
                ...new Set((draft.qualityPool ?? [draft.quality]).flatMap((q) => allowedTargetDegrees(parseChord("C" + q)))),
            ];
            const choices = ["m4", "m5"].includes(draft.mode) ? degrees : compatible;
            pool("Target Degrees", choices, draft.degreePool ?? [], (values) => {
                draft.degreePool = values;
                draft.degree = values[0] ?? "3";
                draft.recognitionPool = values.join(" ");
            }, (d) => {
                const chordTone = (draft.qualityPool ?? [draft.quality]).some((q) => chordToneDegrees(parseChord("C" + q)).includes(d));
                return d + (chordTone ? "" : " (tension)");
            });
            const removed = draft.degreePool?.filter((d) => !choices.includes(d)) ?? [];
            if (removed.length)
                holder.append(node("p", `Unavailable in this harmony: ${removed.join(", ")}. Change Harmony or adjust Targets.`));
        }
        if (wizardStep === 2) {
            const wrapper = node("label", "Challenge Level");
            const select = node("select");
            select.id = "challenge-level";
            select.append(new Option("Custom", "custom"), new Option("Foundations: chord tones, 72 BPM, full hints", "foundations"), new Option("Developing: add 9ths, 96 BPM, full hints", "developing"), new Option("Advanced: tensions, 120 BPM, minimal hints", "advanced"));
            select.onchange = () => {
                if (select.value === "custom")
                    return;
                const level = select.value;
                draft.bpm =
                    level === "foundations" ? 72 : level === "developing" ? 96 : 120;
                draft.hintLevel = level === "advanced" ? "minimal" : "full";
                if (!["m3", "m6"].includes(draft.mode))
                    draft.degreePool =
                        level === "advanced"
                            ? ["9", "#11", "13", "b9", "b13"]
                            : level === "developing"
                                ? ["b3", "3", "b7", "maj7", "9"]
                                : ["b3", "3", "b7", "maj7"];
                draftSave();
                updateWizard();
            };
            wrapper.append(select);
            holder.prepend(wrapper);
        }
        if (wizardStep === 3) {
            for (const [key, title] of [
                ["metronome", "Metronome"],
                ["autoAdvance", "Auto Advance after grading"],
                ["hideChartAfterListening", "Hide chart after listening"],
            ]) {
                const label = node("label", "", "check");
                const input = node("input");
                input.type = "checkbox";
                input.checked = !!draft[key];
                input.id = `flow-${key}`;
                input.onchange = () => {
                    draft[key] = input.checked;
                    draftSave();
                };
                label.append(input, node("span", title));
                holder.append(label);
            }
            if (draft.mode === "m4") {
                $("revealMode").closest("label").classList.add("wizard-off");
                const label = node("label", "Anticipation Gap");
                const select = node("select");
                select.id = "anticipation-gap";
                select.append(new Option("Manual reveal", "manual"), new Option("2 beats", "2"), new Option("1 bar (4 beats)", "4"), new Option("Seconds", "seconds"));
                select.value =
                    draft.revealMode === "manual"
                        ? "manual"
                        : draft.predictionUnit === "beats"
                            ? String(draft.predictionBeats ?? 2)
                            : "seconds";
                const updateGap = () => $("predictionSeconds")
                    .closest("label")
                    .classList.toggle("wizard-off", draft.revealMode === "manual" || draft.predictionUnit === "beats");
                select.onchange = () => {
                    draft.revealMode = select.value === "manual" ? "manual" : "timed";
                    draft.predictionUnit =
                        select.value === "seconds" || select.value === "manual"
                            ? "seconds"
                            : "beats";
                    if (draft.predictionUnit === "beats")
                        draft.predictionBeats = Number(select.value);
                    syncWizardState();
                    updateGap();
                };
                updateGap();
                label.append(select);
                holder.append(label);
            }
            const replayLabel = node("label", "Context Replay");
            const replay = node("select");
            replay.id = "replay-limit";
            [0, 1, 3, 5].forEach((n) => replay.add(new Option(n ? `${n} replays` : "Unlimited", String(n))));
            replay.value = String(draft.replayLimit ?? 0);
            replay.onchange = () => {
                draft.replayLimit = Number(replay.value);
                draftSave();
            };
            replayLabel.append(replay);
            holder.append(replayLabel);
            const prepareLabel = node("label", "Prepare countdown (seconds)");
            const prepare = node("input");
            prepare.type = "number";
            prepare.min = "0";
            prepare.max = "30";
            prepare.value = String(draft.prepareSeconds ?? 0);
            prepare.id = "prepare-seconds";
            prepare.onchange = () => {
                draft.prepareSeconds = Number(prepare.value);
                syncWizardState();
            };
            prepareLabel.append(prepare);
            holder.append(prepareLabel);
        }
        $("review-config").hidden = wizardStep !== 4;
        if (wizardStep === 4)
            configDetails($("review-config"), draft, true);
        $("wizard-back").textContent = wizardStep ? "Back" : "Practice";
        $("wizard-next").textContent =
            wizardStep === 4 ? "Start Practice" : "Continue";
        icon($("wizard-next"), wizardStep === 4 ? "play" : "arrow-right");
        icon($("wizard-back"), "arrow-left");
        $("wizard-save-preset").hidden = wizardStep !== 4;
        $("wizard-short-summary").textContent =
            `${exerciseNames[draft.mode]} / ${draft.count || "Endless"}`;
        const error = validateStep();
        $("wizard-validation").textContent = error;
        $("wizard-next").disabled = !!error || creating;
        renderExercises();
    }
    function renderExercises() {
        const holder = $("exercise-list");
        holder.replaceChildren();
        const all = $("exercise-filter").value === "all";
        Object.keys(exerciseNames)
            .filter((mode) => all || ["m1", "m3", "m4"].includes(mode) || mode === draft.mode)
            .forEach((mode) => {
            const item = node("article", "", "exercise-item");
            const choice = action(exerciseNames[mode], () => {
                readDraft();
                if (draft.mode !== mode) {
                    draft.qualityPool = undefined;
                    draft.degreePool = undefined;
                    draft.progressionPool = undefined;
                    if (["m1", "m2", "m7"].includes(mode)) {
                        draft.qualityPool = ["maj7", "m7", "7"];
                        draft.degreePool = ["b3", "3", "b7", "maj7"];
                    }
                }
                draft.mode = mode;
                delete draft.heldMidi;
                delete draft.phraseFocus;
                delete draft.bassString;
                if (mode === "m5") {
                    draft.runMode = "continuous";
                    draft.path = "nearest";
                }
                wizardStep = 1;
                maxStep = Math.max(maxStep, 1);
                draftSave();
                go("setup/2");
            });
            choice.classList.add("exercise-choice");
            choice.setAttribute("aria-pressed", String(draft.mode === mode));
            choice.setAttribute("aria-label", exerciseNames[mode]);
            const description = node("span", purposes[mode], "exercise-description");
            description.id = `exercise-${mode}-description`;
            const meta = node("span", `${mode === "m2" || mode === "m3" ? "Recognition available" : "Production / self-assessment"} / ${draft.count || 10} questions / about 5 minutes`, "exercise-meta");
            meta.id = `exercise-${mode}-meta`;
            choice.setAttribute("aria-describedby", `${description.id} ${meta.id}`);
            choice.replaceChildren(node("span", exerciseNames[mode], "exercise-name"), description, meta);
            item.append(choice);
            holder.append(item);
        });
    }
    function configDetails(holder, config, editable = false) {
        holder.replaceChildren();
        summary(config).forEach((text, i) => {
            const row = node("div", "", "config-summary-row");
            row.append(node("strong", i === 4 ? "Session Length" : steps[i]), node("span", text));
            if (editable)
                row.append(action("Edit", () => {
                    wizardStep = i === 4 ? 3 : i;
                    go(`setup/${wizardStep + 1}`);
                }));
            holder.append(row);
        });
        const details = node("details");
        details.append(node("summary", "Full configuration"));
        const list = node("dl", "", "parameter-list");
        const parameters = [
            [
                "Root order",
                config.rootOrder === "fixed"
                    ? "Fixed root"
                    : config.rootOrder === "fifths"
                        ? "Circle of fifths"
                        : config.rootOrder === "cycle"
                            ? "Cycle through roots"
                            : "Shuffle roots",
            ],
            ["Target range", `MIDI ${config.low}-${config.high}`],
            [
                "Voicing",
                ["Root position", "First inversion", "Second inversion"][config.inversion],
            ],
            ["Sound", config.timbre === "pad" ? "Chord pad" : "Piano-like synth"],
            ["Hints", config.hintLevel === "full" ? "Full" : "Minimal"],
            ["Auto advance", config.autoAdvance ? "After grading" : "Off"],
            [
                "Replay",
                config.replayLimit ? `${config.replayLimit} per question` : "Unlimited",
            ],
            [
                "Prediction",
                config.revealMode === "manual"
                    ? "Manual reveal"
                    : config.predictionUnit === "beats"
                        ? `${config.predictionBeats ?? 2} beats`
                        : `${config.predictionSeconds}s`,
            ],
        ];
        for (const [name, value] of parameters)
            list.append(node("dt", name), node("dd", value));
        details.append(list);
        holder.append(details);
    }
    function openWizard(config, customs, review = false, from = "wizard", presetId) {
        source = from;
        sourcePresetId = presetId;
        if (config)
            hydrate(config, customs);
        else {
            const raw = localStorage.getItem(flowKeys.draft);
            if (raw) {
                const saved = JSON.parse(raw);
                if (saved.schemaVersion !== 1)
                    throw new Error("This draft uses an unsupported version. Saved data was preserved.");
                hydrate(saved.config, saved.customs);
            }
            else
                hydrate({
                    ...defaults,
                    qualityPool: ["maj7", "m7", "7"],
                    degreePool: ["b3", "3", "b7", "maj7"],
                    roots: "C D F G",
                    rootOrder: "random",
                });
        }
        wizardStep = review ? 4 : 0;
        maxStep = review ? 4 : 0;
        normalizePools();
        draftSave();
        go(`setup/${wizardStep + 1}`);
    }
    async function begin(config, customs, from, presetId, exact, plan) {
        if (creating)
            return;
        creating = true;
        try {
            engine.setCustoms(customs);
            const checked = validateConfig(config, customs);
            // Start unlocking audio inside the user's Practice action, before navigation.
            const audioReady = checked.mode === "m1"
                ? engine.unlock().then(() => "", (error) => error.message ||
                    "Audio is unavailable. Press Play context to retry.")
                : null;
            const pending = plan
                ? [engine.getSession(), ...loadSessions(localStorage)].find((s) => s?.source === from && s.status === "active" && !s.completedCount)
                : undefined;
            let session = pending ??
                (await engine.create(checked, exact && (!plan || plan.selectionPolicy === "exact-review")
                    ? "exact-review"
                    : from, presetId, exact));
            if (pending) {
                engine.resume(pending);
                session = engine.getSession();
            }
            if (plan) {
                session.insightPlanId = plan.id;
                session.insightOrigin = plan.originRoute;
                saveSession(localStorage, session);
            }
            pendingAutoPlay = audioReady ? { id: session.id, audioReady } : null;
            try {
                rememberConfig(localStorage, checked, customs, from);
                if (presetId) {
                    const all = presets();
                    const preset = all.find((p) => p.id === presetId);
                    if (preset) {
                        preset.useCount++;
                        preset.lastUsedAt = new Date().toISOString();
                        write(flowKeys.presets, all);
                    }
                }
            }
            catch (error) {
                if (plan)
                    throw error;
                showError(error);
            }
            go(`session/${session.id}`);
        }
        finally {
            creating = false;
        }
    }
    function savePreset(config, customs) {
        validateConfig(config, customs);
        const name = window.prompt("Preset name", exerciseNames[config.mode]);
        if (name === null)
            return;
        if (!name.trim())
            throw new Error("Enter a preset name.");
        const now = new Date().toISOString();
        const preset = {
            id: crypto.randomUUID(),
            name: name.trim().slice(0, 80),
            config: structuredClone(config),
            customs: structuredClone(customs),
            favorite: false,
            createdAt: now,
            updatedAt: now,
            useCount: 0,
        };
        write(flowKeys.presets, [...presets(), preset]);
        $("flow-status").dataset.tone = "info";
        $("flow-status").textContent = "Preset saved.";
    }
    const quickStarts = [
        [
            "Chord Tones Warm-up",
            {
                ...defaults,
                qualityPool: ["maj7", "m7", "7"],
                degreePool: ["b3", "3", "b7", "maj7"],
                rootOrder: "random",
                roots: "C D F G",
            },
        ],
        [
            "ii-V-I Guide-Tone Anticipation",
            {
                ...defaults,
                mode: "m4",
                progressionPool: ["major-f", "major-c"],
                path: "nearest",
                targetLimit: "guides",
                degreePool: ["b3", "3", "b7", "maj7"],
                revealMode: "manual",
            },
        ],
        [
            "Common-Tone Colour Change",
            {
                ...defaults,
                mode: "m3",
                progressionPool: ["major-f", "mediants"],
                commonMode: "recognize",
                span: 3,
            },
        ],
    ];
    function renderDashboard() {
        const sessions = loadSessions(localStorage);
        const library = $("mode-library");
        library.replaceChildren();
        const symbols = {
            m1: "audio-lines",
            m2: "headphones",
            m3: "rotate-ccw",
            m4: "arrow-right",
            m5: "route",
            m6: "library",
            m7: "sliders-horizontal",
        };
        for (const mode of Object.keys(exerciseNames)) {
            const card = node("article", "", "mode-card");
            const header = node("div", "", "mode-card-header");
            const symbol = node("span");
            icon(symbol, symbols[mode]);
            symbol.setAttribute("aria-hidden", "true");
            header.append(symbol, node("span", mode.toUpperCase()));
            const recent = sessions
                .filter((session) => session.mode === mode)
                .slice(-1)[0];
            const start = action("Set up practice", () => {
                openWizard({
                    ...defaults,
                    mode,
                    ...(mode === "m5"
                        ? { runMode: "continuous", path: "nearest" }
                        : {}),
                });
                wizardStep = 1;
                maxStep = 1;
                draftSave();
                go("setup/2");
            }, true);
            start.setAttribute("aria-label", `Set up ${exerciseNames[mode]}`);
            icon(start, "sliders-horizontal");
            card.append(header, node("h4", exerciseNames[mode]), node("p", purposes[mode]), node("small", recent
                ? `Last practised ${relativeDate(recent.timestamp)}`
                : "Not practised yet"), start);
            library.append(card);
        }
        $("dashboard-title").textContent = sessions.length
            ? "Pick up where you left off"
            : "Your first practice";
        const resume = $("resume-list");
        resume.replaceChildren();
        sessions
            .filter((s) => ["active", "paused"].includes(sessionStatus(s)) && s.progress)
            .slice(-1)
            .reverse()
            .forEach((session) => {
            const row = node("div", "", "resume-row");
            const text = node("div");
            text.append(node("span", "CONTINUE SESSION", "section-label"), node("strong", exerciseNames[session.mode]), node("small", `Question ${(session.progress?.index ?? 0) + 1}${session.questionCount ? " of " + session.questionCount : " / Endless"} / ${relativeDate(session.timestamp)}`));
            row.append(text, action("Resume", () => go(`session/${session.id}`), false));
            resume.append(row);
        });
        document
            .querySelectorAll("[data-dashboard]")
            .forEach((button) => {
            const active = button.dataset.dashboard === dashboardTab;
            button.setAttribute("aria-selected", String(active));
            button.tabIndex = active ? 0 : -1;
            button.id = "dashboard-" + button.dataset.dashboard;
            button.setAttribute("aria-controls", "configuration-list");
        });
        const holder = $("configuration-list");
        holder.setAttribute("aria-labelledby", "dashboard-" + dashboardTab);
        holder.replaceChildren();
        if (dashboardTab === "suggested") {
            if (currentRoute === "suggested")
                renderSuggested(holder);
            else
                renderQuickStarts(holder);
        }
        else if (dashboardTab === "saved") {
            const saved = presets().sort((a, b) => Number(b.favorite) - Number(a.favorite) ||
                (b.lastUsedAt ?? b.updatedAt).localeCompare(a.lastUsedAt ?? a.updatedAt));
            if (!saved.length)
                holder.append(node("p", "No saved presets yet."));
            saved.forEach((preset) => {
                const row = configRow(preset.name + (preset.favorite ? " / Favorite" : ""), preset.config, preset.lastUsedAt, preset.customs, "saved", preset.id);
                row.querySelector(".row-menu-items").append(action("Rename", () => {
                    const name = window.prompt("Preset name", preset.name);
                    if (name?.trim()) {
                        mutatePreset(preset.id, (p) => {
                            p.name = name.trim().slice(0, 80);
                        });
                    }
                }), action("Duplicate", () => {
                    const all = presets();
                    all.push({
                        ...structuredClone(preset),
                        id: crypto.randomUUID(),
                        name: preset.name + " copy",
                        favorite: false,
                        useCount: 0,
                    });
                    write(flowKeys.presets, all);
                    renderDashboard();
                }), action(preset.favorite ? "Unfavorite" : "Favorite", () => mutatePreset(preset.id, (p) => {
                    p.favorite = !p.favorite;
                })), action("Delete", () => {
                    if (window.confirm(`Delete preset "${preset.name}"?`)) {
                        write(flowKeys.presets, presets().filter((p) => p.id !== preset.id));
                        renderDashboard();
                    }
                }));
                holder.append(row);
            });
        }
        else {
            const recent = readList(localStorage, flowKeys.recent);
            if (!recent.length) {
                holder.append(node("p", "No recent practice yet."), action("Browse quick starts", () => {
                    dashboardTab = "suggested";
                    renderDashboard();
                    $("dashboard-suggested").focus();
                }));
            }
            (showAllRecent ? recent : recent.slice(0, 5)).forEach((item) => holder.append(configRow(exerciseNames[item.config.mode], item.config, item.lastUsedAt, item.customs, "recent")));
            if (recent.length > 5)
                holder.append(action(showAllRecent
                    ? "Show fewer configurations"
                    : `Show all ${recent.length} configurations`, () => {
                    showAllRecent = !showAllRecent;
                    renderDashboard();
                }));
        }
        const complete = sessions.filter((s) => sessionStatus(s) === "completed");
        const days = new Set(sessions.map((s) => new Date(s.timestamp).toLocaleDateString())).size;
        const self = sessions
            .flatMap((s) => s.records)
            .filter((r) => r.gradingSource === "self");
        const automatic = sessions
            .flatMap((s) => s.records)
            .filter((r) => r.gradingSource === "automatic" &&
            r.grade !== "skipped" &&
            !r.referenceAssisted);
        const overview = $("dashboard-overview");
        overview.hidden = !sessions.length;
        overview.replaceChildren();
        for (const [label, value] of [
            ["Practice days", String(days)],
            ["Completed sessions", String(complete.length)],
            ["Self-assessments", String(self.length)],
            [
                "Recognition accuracy",
                automatic.length
                    ? Math.round((automatic.filter((r) => r.grade === "correct").length /
                        automatic.length) *
                        100) + "%"
                    : "--",
            ],
        ]) {
            const metric = node("div", "", "metric");
            metric.append(node("strong", value), node("span", label));
            overview.append(metric);
        }
    }
    function mutatePreset(id, change) {
        const all = presets();
        const preset = all.find((p) => p.id === id);
        if (preset) {
            change(preset);
            preset.updatedAt = new Date().toISOString();
            write(flowKeys.presets, all);
        }
        renderDashboard();
    }
    function configRow(name, config, date, customs, from, presetId) {
        const row = node("article", "", "config-item");
        const body = node("div", "", "config-main");
        const category = node("span", isRecognition(config) ? "Recognition" : "Production", "exercise-type");
        const text = summary(config);
        body.append(node("h3", name), node("p", `${text[1]} / ${text[2]}`, "config-description"));
        const meta = node("div", "", "config-meta");
        meta.append(category, node("span", text[4]), node("span", `${config.bpm} BPM`), node("time", relativeDate(date)));
        body.append(meta);
        row.append(body);
        const controls = node("div", "", "actions");
        const menu = node("details", "", "row-menu");
        const trigger = node("summary", "More actions", "row-menu-trigger");
        icon(trigger, "ellipsis", true);
        trigger.setAttribute("aria-label", `More actions for ${name}`);
        const items = node("div", "", "row-menu-items");
        items.addEventListener("click", (event) => {
            if (event.target.closest("button"))
                menu.open = false;
        });
        items.append(action("Edit & Practice", () => openWizard(config, customs, true, from, presetId)), action("Save as Preset", () => savePreset(config, customs)));
        menu.append(trigger, items);
        controls.append(action("Practice", () => begin(config, customs, from, presetId), false), menu);
        const details = node("details");
        details.append(node("summary", "Configuration"));
        const detailBody = node("div");
        configDetails(detailBody, config);
        details.append(detailBody);
        details.className = "config-details";
        body.append(details);
        row.append(controls);
        return row;
    }
    function renderQuickStarts(holder) {
        const quick = node("div", "", "quick-starts");
        for (const [name, config] of quickStarts) {
            const row = node("article", "", "quick-start");
            row.append(node("h3", name), node("p", summary(config).slice(1, 3).join(" / "), "config-description"), action("Practice", () => begin(config, engine.getCustoms(), "quick-start"), false), action("Customize", () => openWizard(config, engine.getCustoms(), true)));
            quick.append(row);
        }
        holder.append(quick);
    }
    function renderSuggested(holder) {
        holder.replaceChildren();
        const rec = recommendation(loadSessions(localStorage));
        holder.append(node("p", rec.text));
        const recommended = {
            ...defaults,
            ...rec.config,
            mode: rec.mode,
            degree: rec.degree,
        };
        const recActions = node("div", "", "actions");
        recActions.append(action("Practice Recommendation", () => begin(recommended, engine.getCustoms(), "suggested")), action("Customize Recommendation", () => openWizard(recommended, engine.getCustoms(), true, "suggested")));
        holder.append(recActions);
        renderQuickStarts(holder);
        const recommendations = [
            [
                "Progression Continuity",
                { ...defaults, mode: "m5", runMode: "continuous", path: "nearest" },
            ],
            [
                "Changing Tonal Centers",
                {
                    ...defaults,
                    mode: "m5",
                    progression: "giant-centers",
                    runMode: "continuous",
                    path: "nearest",
                },
            ],
            ["Jazz Phrase Audiation", { ...defaults, mode: "m6" }],
            ["Ear to Bass", { ...defaults, mode: "m7", degree: "3" }],
        ];
        recommendations.forEach(([name, config]) => {
            const row = node("article", "", "config-item");
            row.append(node("h3", name), node("p", purposes[config.mode]), node("p", summary(config).slice(1).join(" / ")));
            const last = loadSessions(localStorage)
                .slice()
                .reverse()
                .find((s) => canonicalizeConfig(s.config) === canonicalizeConfig(config));
            row.append(node("small", last
                ? `Last practice: ${last.completedCount} completed / ${new Date(last.timestamp).toLocaleDateString()}`
                : "No result for this configuration yet."));
            const controls = node("div", "", "actions");
            controls.append(action("Practice", () => begin(config, engine.getCustoms(), "suggested"), false), action("Customize", () => openWizard(config, engine.getCustoms(), true, "suggested")));
            row.append(controls);
            holder.append(row);
        });
    }
    function showSummary(id) {
        go(`session/${id}/summary`);
    }
    function renderSummary(session) {
        const holder = $("summary-content");
        holder.replaceChildren();
        holder.append(node("span", sessionStatus(session), "status-badge"), node("h3", exerciseNames[session.mode]), node("p", new Date(session.timestamp).toLocaleString(), "muted"));
        const metrics = node("div", "", "overview");
        for (const [label, value] of [
            [
                "Questions completed",
                `${session.completedCount}${session.questionCount ? " / " + session.questionCount : ""}`,
            ],
            [
                session.timeSource === "active-session"
                    ? "Active practice"
                    : "Recorded response time",
                duration(session.totalTime),
            ],
        ]) {
            const metric = node("div", "", "metric");
            metric.append(node("strong", value), node("span", label));
            metrics.append(metric);
        }
        holder.append(metrics);
        const records = session.records.filter((r) => !r.referenceAssisted);
        const self = records.filter((r) => r.gradingSource === "self");
        const automatic = records.filter((r) => r.gradingSource === "automatic" && r.grade !== "skipped");
        if (self.length) {
            holder.append(node("h3", "Self-assessed performance"));
            const distribution = node("div", "", "grade-distribution");
            for (const grade of ["correct", "close", "missed", "skipped"]) {
                const count = self.filter((r) => r.grade === grade).length;
                const row = node("div", "", `grade-result ${grade}`);
                const bar = node("progress");
                bar.max = self.length;
                bar.value = count;
                bar.setAttribute("aria-label", `${grade}: ${count}`);
                row.append(node("span", grade), bar, node("strong", String(count)));
                distribution.append(row);
            }
            holder.append(distribution);
        }
        if (automatic.length)
            holder.append(node("h3", "Automatically graded recognition"), node("p", `${Math.round((automatic.filter((r) => r.grade === "correct").length / automatic.length) * 100)}% accuracy / ${automatic.length} assessments`));
        const needs = records.filter((r) => ["missed", "close"].includes(r.grade));
        if (needs.length) {
            const review = node("section", "", "needs-review");
            review.append(node("h3", "Needs Review"));
            const list = node("ul");
            [
                ...new Set(needs.map((r) => `${r.chords.join(" > ")}: ${r.targets.join(", ")}`)),
            ].forEach((text) => list.append(node("li", text)));
            review.append(list);
            holder.append(review);
        }
        const detail = node("details");
        detail.append(node("summary", "Configuration snapshot"));
        const config = node("div");
        configDetails(config, session.config);
        detail.append(config);
        holder.append(detail);
        appendResults(holder, session);
        const controls = $("summary-actions");
        const missed = missedQuestions(session);
        controls.replaceChildren();
        if (session.insightOrigin) {
            let originScrollY;
            controls.append(action("Return to this insight", () => {
                if (originScrollY !== undefined)
                    sessionStorage.setItem("insights:scroll:" + session.insightOrigin, String(originScrollY));
                go(session.insightOrigin);
            }));
            void readAll("drillPlans")
                .then((plans) => {
                if (!controls.isConnected ||
                    location.hash !== `#/session/${session.id}/summary`)
                    return;
                const plan = plans.find((p) => p.id === session.insightPlanId);
                if (!plan)
                    return;
                originScrollY = plan.originScrollY;
                holder.append(node("p", plan.baselineKind === "new-profile"
                    ? `${session.completedCount} diagnostic questions completed. ${session.records.filter((r) => r.grade === "correct").length} self-rated correct; ${session.records.filter((r) => r.grade === "close").length} close; ${session.records.filter((r) => r.grade === "missed").length} missed; ${session.records.filter((r) => r.grade === "skipped").length} skipped. This is a new diagnostic, not a matched improvement test.`
                    : `${plan.reason}. ${session.records.filter((r) => !r.referenceAssisted && r.grade !== "skipped").length} new observations collected. A focused set alone does not establish mastery or improvement.`));
                controls.append(action(plan.baselineKind === "new-profile"
                    ? "Repeat diagnostic"
                    : "Repeat focus", async () => {
                    let next = plan;
                    if (plan.baselineKind === "new-profile") {
                        const rows = await readAll("assessments");
                        const result = compileSuggestedDiagnostic({
                            id: plan.id,
                            label: plan.reason,
                            quality: plan.config.quality,
                            degree: plan.config.degree,
                            rows: rows.filter((e) => plan.evidenceAssessmentIds.includes(e.id)),
                        }, plan.originRoute, dataRevision(rows), {
                            contrast: plan.config.degreePool?.[1],
                            roots: plan.config.roots.split(/\s+/),
                            config: plan.config,
                            variationIndex: (plan.variationIndex ?? 0) + 1,
                        });
                        if (!result.plan)
                            throw new Error(result.unsupportedReason);
                        next = { ...result.plan, originScrollY: plan.originScrollY };
                        await put("drillPlans", next);
                    }
                    await begin(next.config, next.customSnapshots, "insight:" + next.id, undefined, next.questions, next);
                }), ...(plan.baselineKind === "new-profile"
                    ? []
                    : [
                        action("Matched check", () => begin({ ...plan.baseline, count: 10 }, plan.customSnapshots, "matched-check")),
                    ]));
            })
                .catch(showError);
        }
        controls.append(action("Practice Same Settings", () => begin(session.config, session.customSnapshot ?? engine.getCustoms(), "history"), missed.length > 0), action("Edit Settings", () => openWizard(session.config, session.customSnapshot, true, "history")), action("Save Configuration", () => savePreset(session.config, session.customSnapshot ?? [])), action("Back to Practice", () => go("home")));
        if (missed.length)
            controls.prepend(action("Review Missed", () => begin({ ...session.config, count: 0 }, session.customSnapshot ?? [], "history", undefined, missed), false));
        if (session.questions?.length)
            controls.append(action("Replay Exact Questions", () => begin({ ...session.config, count: 0 }, session.customSnapshot ?? [], "history", undefined, session.questions)));
    }
    function appendResults(holder, session) {
        const details = node("details");
        details.append(node("summary", "Question results"));
        const scroll = node("div", "", "table-scroll");
        const list = node("table");
        const head = node("thead"), header = node("tr");
        for (const label of [
            "Question",
            "Harmony / Target",
            "Result",
            "Time",
            "Replays",
        ]) {
            const cell = node("th", label);
            cell.scope = "col";
            header.append(cell);
        }
        head.append(header);
        list.append(head);
        const body = node("tbody");
        session.records.forEach((record) => {
            const row = node("tr");
            const harmony = node("td");
            harmony.append(node("strong", record.chords.join(" > ")), node("small", `${record.targets.join(", ")} = ${record.actualNotes.join(", ")}${record.selectedDegrees ? " / selected: " + record.selectedDegrees.join(", ") : ""}`));
            const result = node("td");
            result.append(node("span", record.grade, `status-badge ${record.grade}`), node("small", record.referenceAssisted
                ? "Reference-assisted"
                : record.gradingSource === "self"
                    ? "Self-assessment"
                    : "Recognition"));
            row.append(node("td", record.questionIndex !== undefined
                ? String(record.questionIndex + 1)
                : "--"), harmony, result, node("td", `${record.responseLatency.toFixed(1)}s`), node("td", String(record.replayCount)));
            body.append(row);
        });
        list.append(body);
        scroll.append(list);
        details.append(scroll);
        holder.append(details);
    }
    function renderHistory() {
        const holder = $("history-list");
        holder.replaceChildren();
        const filters = node("div", "", "settings-grid history-filters");
        const options = [
            ["mode", "Exercise", Object.entries(exerciseNames)],
            [
                "status",
                "Status",
                ["active", "paused", "completed", "abandoned"].map((v) => [v, v]),
            ],
            [
                "grading",
                "Grading",
                [
                    ["self", "Self-assessment"],
                    ["automatic", "Automatic recognition"],
                ],
            ],
            [
                "count",
                "Questions",
                [
                    ["5", "5"],
                    ["10", "10"],
                    ["20", "20"],
                    ["endless", "Endless"],
                    ["other", "Review set"],
                ],
            ],
            [
                "duration",
                "Duration",
                [
                    ["short", "Under 5 minutes"],
                    ["long", "5 minutes or more"],
                ],
            ],
        ];
        options.forEach(([key, title, values]) => {
            const label = node("label", title);
            const select = node("select");
            select.setAttribute("aria-label", title);
            select.append(new Option("All", ""), ...values.map(([v, t]) => new Option(t, v)));
            select.value = historyFilters[key];
            select.onchange = () => {
                historyFilters[key] = select.value;
                renderHistory();
            };
            label.append(select);
            filters.append(label);
        });
        const label = node("label", "Date");
        const date = node("input");
        date.type = "date";
        date.value = historyFilters.date;
        date.onchange = () => {
            historyFilters.date = date.value;
            renderHistory();
        };
        label.append(date);
        filters.append(label);
        holder.append(filters);
        const sessions = loadSessions(localStorage)
            .slice()
            .reverse()
            .filter((s) => (!historyFilters.mode || s.mode === historyFilters.mode) &&
            (!historyFilters.status ||
                sessionStatus(s) === historyFilters.status) &&
            (!historyFilters.grading ||
                s.records.some((r) => r.gradingSource === historyFilters.grading) ||
                (s.records.length === 0 &&
                    (isRecognition(s.config) ? "automatic" : "self") ===
                        historyFilters.grading)) &&
            (!historyFilters.date ||
                new Date(s.timestamp).toLocaleDateString("en-CA") ===
                    historyFilters.date) &&
            (!historyFilters.count ||
                (historyFilters.count === "endless"
                    ? !s.questionCount
                    : historyFilters.count === "other"
                        ? ![0, 5, 10, 20].includes(s.questionCount)
                        : s.questionCount === Number(historyFilters.count))) &&
            (!historyFilters.duration ||
                (historyFilters.duration === "short"
                    ? s.totalTime < 300
                    : s.totalTime >= 300)));
        if (!sessions.length)
            holder.append(node("p", "No sessions match these filters."));
        sessions.forEach((session) => {
            const row = node("article", "", "config-item history-row");
            const body = node("div", "", "config-main");
            body.append(node("span", sessionStatus(session), `status-badge ${sessionStatus(session)}`), node("h3", exerciseNames[session.mode]), node("p", `${relativeDate(session.timestamp)} / ${session.completedCount} of ${session.questionCount || "Endless"} / ${duration(session.totalTime)} ${session.timeSource !== "active-session" ? "response time" : "active"}`, "config-meta"));
            row.append(body);
            const controls = node("div", "", "actions");
            controls.append(action("Repeat Session Config", () => begin(session.config, session.customSnapshot ?? engine.getCustoms(), "history")), action("View Summary", () => showSummary(session.id)));
            if (["active", "paused"].includes(sessionStatus(session)) &&
                session.progress)
                controls.append(action("Resume", () => go(`session/${session.id}`), false));
            row.append(controls);
            const details = node("details");
            details.className = "config-details";
            details.append(node("summary", "Session details"));
            const detailBody = node("div");
            configDetails(detailBody, session.config);
            appendResults(detailBody, session);
            details.append(detailBody);
            row.append(details);
            holder.append(row);
        });
    }
    function go(route) {
        const hash = `#/${route}`;
        if (location.hash === hash)
            routePage();
        else
            location.hash = hash;
    }
    function routePage() {
        const route = location.hash.replace(/^#\/?/, "") || "home";
        document
            .querySelectorAll("#analytics-content dialog[open]")
            .forEach((panel) => panel.close());
        if (!route.startsWith("insights"))
            $("analytics-content").dataset.route = "";
        else if (currentRoute.startsWith("insights")) {
            const previousCell = new URLSearchParams(currentRoute.split("?")[1] ?? "").get("cell");
            if (previousCell &&
                !new URLSearchParams(route.split("?")[1] ?? "").has("cell"))
                sessionStorage.setItem("insights:focus", previousCell);
        }
        document
            .querySelectorAll(".row-menu[open]")
            .forEach((menu) => (menu.open = false));
        clearInterval(prepareTimer);
        prepareTimer = 0;
        $("session-prepare").textContent = "";
        if (currentRoute.startsWith("session/") &&
            !currentRoute.endsWith("/summary") &&
            currentRoute !== route)
            engine.leave();
        currentRoute = route;
        for (const id of [
            "dashboard-view",
            "wizard-view",
            "session-view",
            "summary-view",
            "free-view",
            "path-view",
            "history-view",
            "insights-view",
            "review-view",
        ])
            $(id).hidden = true;
        navigation.hidden =
            route.startsWith("session/") && !route.endsWith("/summary");
        document.querySelector(".site-nav").hidden =
            navigation.hidden;
        document.querySelector(".lab-heading").hidden =
            navigation.hidden;
        for (const [tab, value] of [
            ["free", "home"],
            ["path", "suggested"],
            ["history", "history"],
            ["insights", "insights"],
            ["review", "review"],
        ]) {
            $(tab + "-tab").setAttribute("aria-selected", String(value === route ||
                (tab === "free" &&
                    (route.startsWith("setup/") || route === "suggested")) ||
                (tab === "insights" && route.startsWith("insights"))));
            $(tab + "-tab").tabIndex =
                $(tab + "-tab").getAttribute("aria-selected") === "true" ? 0 : -1;
        }
        $("free-tab").setAttribute("aria-controls", route.startsWith("setup/") ? "wizard-view" : "dashboard-view");
        document.body.classList.toggle("in-session", navigation.hidden);
        document.body.classList.toggle("in-wizard", route.startsWith("setup/"));
        if (!navigation.hidden)
            $("session-count").textContent = "Practice saved locally";
        $("flow-status").textContent = "";
        $("flow-status").dataset.tone = "info";
        if (route.startsWith("setup/")) {
            $("wizard-view").hidden = false;
            wizardStep = Math.max(0, Math.min(4, Number(route.split("/")[1]) - 1 || 0));
            maxStep = Math.max(maxStep, wizardStep);
            updateWizard();
            document.querySelector(".wizard-body").scrollTop = 0;
        }
        else if (route.startsWith("session/")) {
            const id = route.split("/")[1];
            const saved = loadSessions(localStorage).find((s) => s.id === id);
            if (!saved) {
                go("home");
                showError("Session not found in this browser.");
                return;
            }
            if (route.endsWith("/summary")) {
                $("summary-view").hidden = false;
                renderSummary(saved);
            }
            else if (["completed", "abandoned"].includes(sessionStatus(saved)))
                showSummary(id);
            else {
                $("session-view").hidden = false;
                if (engine.getSession()?.id !== saved.id ||
                    engine.getSession()?.status === "paused")
                    engine.resume(saved);
                $("session-exercise").textContent = exerciseNames[saved.mode];
                $("compact-volume").value = String(saved.config.volume);
                $("compact-bpm").value = String(saved.config.bpm);
                $("compact-metronome").checked =
                    !!saved.config.metronome;
                updateSession();
                if (pendingAutoPlay?.id === saved.id) {
                    const pending = pendingAutoPlay;
                    pendingAutoPlay = null;
                    void pending.audioReady.then((error) => {
                        if (currentRoute !== `session/${pending.id}` ||
                            engine.getSession()?.id !== pending.id ||
                            engine.getSession()?.status !== "active")
                            return;
                        if (error) {
                            showError(error);
                            return;
                        }
                        if (!engine.getSession()?.progress?.hasPlayed)
                            void startContext();
                    });
                }
            }
        }
        else if (route.startsWith("insights")) {
            $("insights-view").hidden = false;
            void renderAnalytics($("analytics-content"), route, {
                start: (config, customs, source, questions, plan) => begin(config, customs, source, undefined, questions, plan),
                customize: (config, customs) => openWizard(config, customs, true),
            });
        }
        else if (route === "suggested") {
            dashboardTab = "suggested";
            $("dashboard-view").hidden = false;
            renderDashboard();
        }
        else if (["history", "review"].includes(route)) {
            engine.refreshViews();
            $(route + "-view").hidden = false;
            if (route === "history")
                renderHistory();
        }
        else {
            $("dashboard-view").hidden = false;
            renderDashboard();
        }
        window.scrollTo(0, 0);
    }
    function updateSession() {
        const session = engine.getSession();
        if (!session)
            return;
        $("session-progress").textContent = $("session-count").textContent;
        const phase = $("phase").textContent;
        document.querySelector('[data-phase="imagine"]').textContent =
            isRecognition(session.config) ? "Answer" : "Imagine";
        icon($("pause"), phase === "PAUSED" ? "play" : "pause", true);
        icon($("favorite"), "bookmark");
        const playback = $("session-state");
        const state = phase === "PAUSED"
            ? "Paused"
            : phase === "ESTABLISH CONTEXT"
                ? "Playing context"
                : phase === "COUNT IN"
                    ? "Count-in"
                    : phase === "READY"
                        ? "Ready to listen"
                        : phase === "GRADED"
                            ? "Assessment complete"
                            : phase === "REFERENCE"
                                ? "Compare with reference"
                                : "Your turn";
        if (playback.textContent !== state)
            playback.textContent = state;
        playback.dataset.state =
            phase === "PAUSED"
                ? "paused"
                : phase === "ESTABLISH CONTEXT"
                    ? "playing"
                    : "ready";
        icon(playback, phase === "PAUSED"
            ? "pause"
            : phase === "ESTABLISH CONTEXT"
                ? "audio-lines"
                : phase === "GRADED"
                    ? "check"
                    : phase === "REFERENCE"
                        ? "eye"
                        : "play");
        const meter = $("session-meter");
        meter.hidden = !session.questionCount;
        meter.max = Math.max(1, session.questionCount);
        meter.value = session.completedCount;
        const stage = phase === "READY" || phase === "ESTABLISH CONTEXT"
            ? "listen"
            : phase === "REFERENCE"
                ? "compare"
                : phase === "GRADED"
                    ? "assess"
                    : "imagine";
        document.querySelectorAll("[data-phase]").forEach((item) => {
            item.classList.toggle("active", phase !== "PAUSED" && item.dataset.phase === stage);
            item.setAttribute("aria-current", phase !== "PAUSED" && item.dataset.phase === stage ? "step" : "false");
        });
        if (phase === "PAUSED") {
            clearInterval(prepareTimer);
            prepareTimer = 0;
            $("session-prepare").textContent = "";
        }
        if (phase === "GRADED")
            $("next").focus({ preventScroll: true });
    }
    new MutationObserver(updateSession).observe($("phase"), {
        childList: true,
        characterData: true,
        subtree: true,
    });
    document.addEventListener("click", (event) => {
        document
            .querySelectorAll(".row-menu[open]")
            .forEach((menu) => {
            if (!menu.contains(event.target))
                menu.open = false;
        });
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape")
            document
                .querySelectorAll(".row-menu[open]")
                .forEach((menu) => {
                menu.open = false;
                menu.querySelector("summary").focus();
            });
    });
    for (const group of [
        navigation,
        document.querySelector(".dashboard-tabs"),
    ]) {
        group.addEventListener("keydown", (event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
                return;
            const buttons = Array.from(group.querySelectorAll('button[role="tab"]:not([hidden])'));
            const index = buttons.indexOf(document.activeElement);
            if (index < 0)
                return;
            const next = event.key === "Home"
                ? 0
                : event.key === "End"
                    ? buttons.length - 1
                    : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) %
                        buttons.length;
            event.preventDefault();
            buttons[next].focus();
            buttons[next].click();
        });
    }
    $("start-practicing").onclick = () => {
        try {
            openWizard();
        }
        catch (error) {
            showError(error);
        }
    };
    document.querySelectorAll("[data-dashboard]").forEach((button) => (button.onclick = () => {
        dashboardTab = button.dataset.dashboard;
        try {
            renderDashboard();
        }
        catch (error) {
            showError(error);
        }
    }));
    $("exercise-filter").onchange = renderExercises;
    $("wizard-back").onclick = () => {
        readDraft();
        if (wizardStep) {
            wizardStep--;
            draftSave();
            go(`setup/${wizardStep + 1}`);
        }
        else
            go("home");
    };
    $("wizard-next").onclick = () => {
        Promise.resolve()
            .then(async () => {
            readDraft();
            const error = validateStep();
            if (error) {
                $("wizard-validation").textContent = error;
                return;
            }
            if (wizardStep === 4)
                await begin(draft, draftCustoms, source, sourcePresetId);
            else {
                wizardStep++;
                maxStep = Math.max(maxStep, wizardStep);
                draftSave();
                go(`setup/${wizardStep + 1}`);
            }
        })
            .catch(showError);
    };
    $("save-draft").onclick = () => {
        try {
            readDraft();
            draftSave();
            $("flow-status").textContent = "Draft saved.";
            $("flow-status").dataset.tone = "info";
        }
        catch (error) {
            showError(error);
        }
    };
    $("wizard-save-preset").onclick = () => {
        try {
            readDraft();
            savePreset(draft, draftCustoms);
        }
        catch (error) {
            showError(error);
        }
    };
    settings.addEventListener("change", () => {
        if (!currentRoute.startsWith("setup/"))
            return;
        try {
            readDraft();
            normalizePools();
            syncWizardState();
        }
        catch (error) {
            showError(error);
        }
    });
    $("free-tab").onclick = () => go("home");
    $("path-tab").onclick = () => go("suggested");
    $("history-tab").onclick = () => go("history");
    $("insights-tab").onclick = () => go("insights");
    $("review-tab").onclick = () => go("review");
    $("session-exit").onclick = () => go("home");
    $("session-end").onclick = () => {
        const session = engine.getSession();
        if (!session)
            return;
        engine.leave(true);
        session.status = "completed";
        session.endedAt = new Date().toISOString();
        saveSession(localStorage, session);
        showSummary(session.id);
    };
    $("session-edit").onclick = () => {
        const session = engine.getSession();
        if (!session)
            return;
        engine.leave(true);
        openWizard(session.config, session.customSnapshot, true);
    };
    $("compact-settings").onchange = () => {
        const bpm = Number($("compact-bpm").value);
        if (!Number.isFinite(bpm) || bpm < 30 || bpm > 240) {
            showError("Tempo must be 30-240 BPM.");
            return;
        }
        engine.compact({
            volume: Number($("compact-volume").value),
            bpm,
            metronome: $("compact-metronome").checked,
        });
    };
    const play = $("start");
    async function startContext() {
        const session = engine.getSession();
        if (!session || prepareTimer || startingContext)
            return;
        startingContext = true;
        try {
            await engine.unlock();
        }
        catch (error) {
            showError(error);
            return;
        }
        finally {
            startingContext = false;
        }
        if (engine.getSession()?.id !== session.id ||
            !currentRoute.endsWith(session.id))
            return;
        const seconds = session.config.prepareSeconds ?? 0;
        if (!seconds) {
            engine.play().catch(showError);
            return;
        }
        let remaining = seconds;
        $("session-prepare").textContent = `Prepare: ${remaining}s`;
        prepareTimer = window.setInterval(() => {
            remaining--;
            $("session-prepare").textContent =
                remaining > 0 ? `Prepare: ${remaining}s` : "";
            if (remaining <= 0) {
                clearInterval(prepareTimer);
                prepareTimer = 0;
                engine.play().catch(showError);
            }
        }, 1000);
    }
    play.onclick = startContext;
    originalPractice.addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (button && button.id !== "start") {
            clearInterval(prepareTimer);
            prepareTimer = 0;
            $("session-prepare").textContent = "";
        }
    }, true);
    window.addEventListener("hashchange", () => {
        try {
            routePage();
        }
        catch (error) {
            showError(error);
        }
    });
    window.addEventListener("pagehide", () => engine.leave());
    document.addEventListener("keydown", (event) => {
        if (!currentRoute.startsWith("session/") ||
            currentRoute.endsWith("/summary") ||
            event.defaultPrevented ||
            event.repeat ||
            event.target.closest("input,select,textarea,.row-menu[open],[contenteditable=true]") ||
            event.ctrlKey ||
            event.metaKey ||
            event.altKey)
            return;
        let target = null;
        const key = event.key.toLowerCase();
        if ((key === " " || key === "enter") &&
            event.target.closest("button,a,summary"))
            return;
        if (key === " ")
            target = $("start").hidden
                ? $("pause")
                : $("start");
        if (key === "r")
            target = $("replay");
        if (key === "n")
            target = $("next");
        if (key === "enter") {
            if (event.target.matches("button,a"))
                return;
            target = !$("next").disabled
                ? $("next")
                : !$("start").hidden
                    ? $("start")
                    : $("reveal");
        }
        if (["1", "2", "3"].includes(key)) {
            if (!$("grading").hidden)
                target =
                    $("grading").querySelectorAll("button")[Number(key) - 1];
            else if (!$("choices").hidden) {
                const select = $("choices").querySelector("select:not(:disabled)");
                if (select?.options[Number(key)]) {
                    select.value = select.options[Number(key)].value;
                    select.dispatchEvent(new Event("change"));
                }
            }
        }
        if (target && !target.disabled && !target.hidden) {
            event.preventDefault();
            target.click();
        }
    });
    const reset = action("Reset to Recommended", () => {
        const mode = draft.mode;
        hydrate({ ...defaults, mode });
        normalizePools();
        draftSave();
        updateWizard();
    });
    $("wizard-view").insertBefore(reset, $("wizard-validation"));
    const wizardBody = node("div", "", "wizard-body");
    $("wizard-view").insertBefore(wizardBody, document.querySelector(".wizard-footer"));
    wizardBody.append($("exercise-step"), $("wizard-options"), $("review-config"), reset, $("wizard-validation"));
    const originalCustomSave = $("custom-form").onsubmit;
    $("custom-form").onsubmit = (event) => {
        originalCustomSave?.call($("custom-form"), event);
        draftCustoms = engine.getCustoms();
        draft = engine.getConfig();
        draft.progressionPool = [draft.progression];
        draftSave();
        updateWizard();
    };
    for (const id of ["custom-new", "custom-delete"]) {
        const original = $(id).onclick;
        $(id).onclick = (event) => {
            original?.call($(id), event);
            draftCustoms = engine.getCustoms();
            draft = engine.getConfig();
            draft.progressionPool = [draft.progression];
            draftSave();
            updateWizard();
        };
    }
    try {
        const raw = localStorage.getItem(flowKeys.draft);
        if (raw && location.hash.startsWith("#/setup/")) {
            const saved = JSON.parse(raw);
            if (saved.schemaVersion !== 1)
                throw new Error("Unsupported draft version. Existing data was preserved.");
            hydrate(saved.config, saved.customs);
            maxStep = saved.maxStep ?? 4;
        }
        routePage();
    }
    catch (error) {
        $("dashboard-view").hidden = false;
        showError(error);
    }
    return {
        onRender: updateSession,
        showSummary,
        practiceFavorite: (favorite) => {
            const config = { ...defaults, ...favorite.config, count: 0 };
            const customs = engine.getCustoms();
            if (["m3", "m4", "m5"].includes(config.mode)) {
                config.progression = favorite.challenge.progressionId;
                config.progressionPool = undefined;
                if (![...progressionBank, ...customs].some((p) => p.id === config.progression))
                    customs.push({
                        id: config.progression,
                        name: "Saved review progression",
                        chords: favorite.challenge.targets.map((t) => t.chord.symbol),
                        targets: favorite.challenge.targets.map((t) => t.degree),
                        beats: favorite.challenge.targets.map((t) => t.beats ?? config.beats),
                    });
            }
            return begin(config, customs, "history", undefined, [favorite.challenge]);
        },
        varyPhrase: (variation) => begin({ ...(engine.getSession()?.config ?? draft), variation }, engine.getSession()?.customSnapshot ?? engine.getCustoms(), "history"),
    };
}
