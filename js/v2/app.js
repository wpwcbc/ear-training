import { configurationChapters, configurationGroup, rememberGroups, practiceSummary } from "./configuration.js";
import { mountProgression, progressionEvidence, progressionSessions, progressionConditions } from "./progression-ui.js";
import { AudioEngine } from "../jazz/audio.js";
import { parseChord, chordNotes, chordToneDegrees, degreeForPc } from "../jazz/theory.js";
import { QuestionLifecycle } from "./question.js";
import { builtins, primaryPresets, roots, qualities, degrees, validate, editableConfig, targetsFor, insightRows, stream, attempt, read, write, keys, metrics, } from "./model.js";
const host = document.getElementById("app"), error = document.getElementById("error");
const audio = new AudioEngine();
let question = null;
let reviewOperation = 0;
let seenMaterial = new Set();
let presets = [], sessions = [], activeId = builtins[0].id, draft;
let session = null, current = null, generate = null;
const configGroups = new Map();
let step = "Harmony";
let dirty = false, fatal = false;
let insightModule = "overall", production = "all", auditionQuality = "";
let rootFilter = "", qualityFilter = "";
let headingFocus = true, lastRoute = "", savedPresetId = "";
let practiceSignature = "";
function restoreControl(key) {
    if (!key)
        return;
    Array.from(host.querySelectorAll("[data-focus-key]")).find((node) => node.dataset.focusKey === key && !node.disabled)?.focus({ preventScroll: true });
}
function splitView(anchor, work, cls = "") {
    const split = el("div", "", "split-view " + cls);
    split.append(anchor, work);
    return split;
}
function disclosure(label, ...content) {
    const details = el("details");
    details.append(el("summary", label), ...content);
    return details;
}
function el(tag, text = "", cls = "") {
    const e = document.createElement(tag);
    e.textContent = text;
    e.className = cls;
    return e;
}
function report(e) {
    error.hidden = false;
    error.replaceChildren(el("span", e instanceof Error ? e.message : String(e)), button(fatal ? "Retry loading" : dirty ? "Retry saving" : "Dismiss", () => fatal ? location.reload() : dirty ? saveAll() : clearError()));
}
function clearError() {
    error.hidden = true;
    error.replaceChildren();
}
function button(label, fn, secondary = true, disabled = false) {
    const b = el("button", label, secondary ? "secondary" : "");
    b.dataset.focusKey = label;
    const glyph = label.startsWith("Replay") ? "rotate-ccw" : label === "Customize" ? "sliders-horizontal" : label === "Correct" ? "check" : label === "Incorrect" ? "x" : label === "Stop" ? "square" : "";
    if (glyph) {
        const icon = el("img");
        icon.src = glyph === "square" ? "square.svg" : "../jazz-ear-lab/icons/" + glyph + ".svg";
        icon.alt = "";
        icon.width = icon.height = 20;
        b.prepend(icon);
    }
    b.type = "button";
    b.disabled = disabled;
    b.onclick = () => {
        Promise.resolve()
            .then(() => {
            if (b.isConnected && !b.disabled)
                return fn();
        })
            .catch(report);
    };
    return b;
}
function actions(...items) {
    const e = el("div", "", "actions");
    e.append(...items);
    return e;
}
function heading(text) {
    const h = el("h1", text);
    h.tabIndex = -1;
    host.append(h);
    if (headingFocus)
        h.focus({ preventScroll: true });
    return h;
}
function preset() {
    return presets.find((p) => p.id === activeId) ?? presets[0];
}
function saveAll() {
    write(keys.sessions, sessions);
    write(keys.presets, presets);
    write(keys.last, activeId);
    write(keys.exposures, [...seenMaterial]);
    dirty = false;
    clearError();
    const status = document.getElementById("config-status");
    if (status && status.dataset.state !== "invalid") {
        status.textContent = "Changes saved to this preset.";
        status.dataset.state = "saved";
    }
}
function persist() {
    dirty = true;
    try {
        saveAll();
    }
    catch (e) {
        report(e);
    }
}
function load() {
    try {
        const saved = read(keys.presets, []);
        sessions = read(keys.sessions, []);
        const exposures = read(keys.exposures, []);
        if (!Array.isArray(exposures) ||
            exposures.some((v) => typeof v !== "string"))
            throw new Error("Invalid V2 exposure records; existing data preserved.");
        seenMaterial = new Set(exposures);
        if (!Array.isArray(saved) || !Array.isArray(sessions))
            throw new Error("Unsupported V2 data. Existing records were preserved.");
        for (const p of saved) {
            if (typeof p.id !== "string" || typeof p.name !== "string")
                throw new Error("Invalid saved preset.");
            validate(p.config);
        }
        for (const s of sessions) {
            validate(s.config);
            if (!Array.isArray(s.attempts))
                throw new Error("Invalid saved session.");
        }
        presets = [
            ...builtins.map((b) => structuredClone(saved.find((p) => p.id === b.id) ?? b)),
            ...saved.filter((p) => !builtins.some((b) => b.id === p.id)),
        ];
        activeId = read(keys.last, presets[0].id);
        draft = structuredClone(preset().config);
        render();
    }
    catch (e) {
        fatal = true;
        host.replaceChildren(el("h1", "V2 data could not be loaded"));
        report(e);
    }
}
function describe(c) {
    return `${c.exercise.toUpperCase()} / ${c.roots.join(", ")} / ${c.qualities.join(", ")} / ${c.qualities.map(q => q + ": " + targetsFor(c, q).join(", ")).join("; ")} / mix ${(c.voiceLevels ?? [1, 1, 1, 1, 1]).map(v => Math.round(v * 100) + "%").join(", ")} / context ${c.context ? "on" : "off"} / ${c.count || "Unlimited"} questions${c.exercise === "m1" ? " / " + c.method : ""}`;
}
function customize(p) {
    activeId = p.id;
    draft = editableConfig(p.config);
    location.hash = "configure";
    if (location.hash === "#configure")
        render();
}
function home() {
    heading("Practice");
    const grid = el("div", "", "exercises");
    grid.setAttribute("aria-label", "Exercises");
    for (const definition of primaryPresets) {
        const p = presets.find((p) => p.id === definition.id);
        const card = el("article", "", "exercise");
        const title = el("h2", definition.name);
        title.id = definition.id;
        card.dataset.presetId = p.id;
        card.setAttribute("aria-labelledby", title.id);
        card.append(title, actions(button("Start", () => start(p), false), button("Customize", () => customize(p))));
        grid.append(card);
    }
    for (const [mode, name] of [["recognition", "Progression Recognition"], ["singing", "Guided Singing"]]) {
        const card = el("article", "", "exercise"), title = el("h2", name);
        title.id = "progression-" + mode;
        card.setAttribute("aria-labelledby", title.id);
        card.append(title, actions(button("Start", () => location.hash = "progression/" + mode + "/start", false), button("Customize", () => location.hash = "progression/" + mode)));
        grid.append(card);
    }
    host.append(grid);
    const secondary = el("section", "", "saved-presets");
    secondary.setAttribute("aria-labelledby", "saved-presets-title");
    const title = el("h2", "Saved presets");
    title.id = "saved-presets-title";
    const savedHeading = el("div", "", "saved-heading");
    savedHeading.append(title, button("New preset", () => {
        const name = prompt("Preset name", "My practice");
        if (!name?.trim())
            return;
        const p = {
            id: crypto.randomUUID(),
            name: name.trim().slice(0, 100),
            config: structuredClone(preset().config),
        };
        presets.push(p);
        persist();
        customize(p);
    }));
    secondary.append(savedHeading);
    for (const p of presets) {
        if (primaryPresets.some((d) => d.id === p.id))
            continue;
        const card = el("article", "", "preset-row");
        card.dataset.presetId = p.id;
        card.append(el("h3", p.name), actions(button("Start", () => start(p)), button("Customize", () => customize(p))));
        secondary.append(card);
    }
    host.append(secondary);
    const pageTitle = host.querySelector("h1"), work = el("div", "", "home-work");
    work.append(el("h2", "Exercises"), grid, secondary);
    host.replaceChildren(splitView(pageTitle, work, "home-layout"));
}
function select(label, value, options, update) {
    const l = el("label", label), s = el("select");
    options.forEach((v) => {
        const o = el("option", v === "all" ? "All" : v === "imagined-sung" ? "Imagined / sung" : v === "played" ? "Instrumental playing" : v === "All selected roots" ? "All roots" : v === "All selected qualities" ? "All qualities" : v);
        o.value = v;
        s.append(o);
    });
    s.value = value;
    s.setAttribute("aria-label", label);
    s.dataset.focusKey = label;
    s.onchange = () => update(s.value);
    l.append(s);
    return l;
}
function autoSave() {
    reviewOperation++;
    audio.stop();
    const status = document.getElementById("config-status");
    try {
        const c = validate(draft);
        preset().config = c;
        persist();
        status.textContent = dirty
            ? "Not saved. Keep this page open and Retry saving."
            : "Changes saved to this preset.";
        status.dataset.state = dirty ? "unsaved" : "saved";
        if (!dirty)
            savedPresetId = activeId;
    }
    catch (e) {
        status.dataset.state = "invalid";
        status.textContent = `${e.message} Last valid saved preset unchanged.`;
    }
    configRender();
}
function configurationSummary() {
    return [
        el("h3", "Harmony"), el("p", `Roots: ${draft.roots.join(", ") || "None selected"}`), el("p", `Qualities: ${draft.qualities.join(", ") || "None selected"}`),
        el("h3", "Target degrees"), ...draft.qualities.map(q => el("p", q + ": " + (targetsFor(draft, q).join(", ") || "None selected"))),
        el("h3", "Practice"), el("p", `${draft.count === 0 ? "Unlimited" : draft.count + " questions"} · Context ${draft.context ? "on" : "off"} · Auto Advance ${draft.autoAdvance !== false ? "on" : "off"}`),
        ...(draft.exercise === "m1" ? [el("p", "Self-rated · " + draft.method)] : []),
        el("h3", "Sound"), el("p", `Voice mix: ${(draft.voiceLevels ?? [1, 1, 1, 1, 1]).map(v => Math.round(v * 100) + "%").join(", ")}`), el("p", `Volume: ${Math.round(draft.volume * 100)}%`),
    ];
}
function pool(label, options, values, update) {
    const f = el("fieldset"), group = el("div", "", "pool");
    f.append(el("legend", label), group);
    for (const value of options) {
        const l = el("label"), input = el("input");
        input.type = "checkbox";
        input.value = value;
        input.dataset.focusKey = `pool:${label}:${value}`;
        input.checked = values.includes(value);
        input.onchange = () => {
            update(Array.from(group.querySelectorAll("input:checked")).map((i) => i.value));
            autoSave();
        };
        l.append(input, el("span", value));
        group.append(l);
    }
    return f;
}
function configIssue() {
    try {
        validate(draft);
        return null;
    }
    catch (e) {
        const message = e.message;
        if (!draft.roots.length)
            return { chapter: "Harmony", group: "roots", message };
        if (!draft.qualities.length)
            return { chapter: "Harmony", group: "qualities", message };
        const missing = draft.qualities.find(q => !targetsFor(draft, q).length);
        if (missing)
            return { chapter: "Target degrees", group: "pool:" + missing, message };
        if (!Number.isInteger(draft.count) || draft.count < 0 || draft.count > 200)
            return { chapter: "Practice", group: "length", message };
        return { chapter: "Sound", group: !Number.isFinite(draft.volume) || draft.volume < 0 || draft.volume > 1 ? "volume" : "mix", message };
    }
}
function config() {
    draft = editableConfig(draft);
    const issue = configIssue();
    const page = el("section", "", "config-page"), header = el("header", "", "config-header");
    const title = heading("Customize " + preset().name);
    header.append(title);
    const editor = el("section", "", "config-editor"), side = el("aside", "", "config-summary");
    editor.setAttribute("aria-label", "Preset settings");
    const tabs = el("nav", "", "steps config-tabs");
    tabs.setAttribute("aria-label", "Configuration chapters");
    for (const name of configurationChapters) {
        const tab = button(name, () => { step = name; configRender(); });
        if (step === name)
            tab.setAttribute("aria-current", "page");
        tabs.append(tab);
    }
    editor.append(tabs);
    const group = (key, label, selected, content, open = false) => {
        const id = activeId + ":" + key;
        if (issue?.group === key)
            configGroups.set(id, true);
        const node = configurationGroup(configGroups, id, label, selected, content, open);
        if (issue?.group === key) {
            const error = el("p", issue.message + " Last valid saved preset unchanged.", "config-field-error");
            error.id = "config-validation";
            error.setAttribute("role", "alert");
            node.lastElementChild.prepend(error);
            node.querySelectorAll("input,select,fieldset").forEach(control => {
                control.setAttribute("aria-invalid", "true");
                control.setAttribute("aria-describedby", error.id);
            });
        }
        return node;
    };
    if (issue && issue.chapter !== step) {
        editor.append(el("p", issue.message, "config-field-error"), button("Review invalid settings: " + issue.chapter, () => {
            step = issue.chapter;
            configRender();
            host.querySelector("input[aria-invalid='true'],select[aria-invalid='true']")?.focus();
        }));
    }
    if (step === "Harmony") {
        editor.append(group("roots", "Roots", `${draft.roots.join(", ") || "None selected"} · ${draft.roots.length} / 12 selected`, [
            pool("Roots", roots, draft.roots, values => draft.roots = values),
            button("All 12 Keys", () => { draft.roots = [...roots]; autoSave(); }),
        ], true), group("qualities", "Chord qualities", draft.qualities.join(", ") || "None selected", [
            pool("Chord qualities", qualities, draft.qualities, values => {
                var _a;
                draft.qualities = values;
                for (const q of draft.qualities)
                    (_a = draft.targetPools)[q] ?? (_a[q] = chordToneDegrees(parseChord("C" + q)));
            }),
        ]));
    }
    if (step === "Target degrees") {
        editor.append(el("p", "Choose the degrees to practise against each chord quality.", "muted"));
        draft.qualities.forEach((quality, i) => editor.append(group("pool:" + quality, quality, targetsFor(draft, quality).join(", ") || "None selected", [
            pool(quality, degrees, targetsFor(draft, quality), values => draft.targetPools[quality] = values),
        ], i === 0)));
    }
    if (step === "Practice") {
        const countLabel = el("label", "Questions (0 = Unlimited)"), count = el("input");
        count.type = "number";
        count.min = "0";
        count.max = "200";
        count.value = Number.isNaN(draft.count) ? "" : String(draft.count);
        count.dataset.focusKey = "question-count";
        count.onchange = () => { draft.count = count.value === "" ? NaN : Number(count.value); autoSave(); };
        countLabel.append(count);
        editor.append(group("length", "Session length", draft.count === 0 ? "Unlimited" : `${Number.isNaN(draft.count) ? "Invalid" : draft.count} questions`, [countLabel], true));
        const options = [];
        if (!primaryPresets.some(p => p.id === activeId))
            options.push(select("Exercise", draft.exercise, ["m1", "m2"], value => { draft.exercise = value; autoSave(); }));
        if (draft.exercise === "m1")
            options.push(select("Response method (self-assessed)", draft.method, ["imagined", "sung", "played"], value => { draft.method = value; autoSave(); }));
        for (const [label, value, change] of [
            ["Audible chord context", draft.context, (checked) => draft.context = checked],
            ["Auto Advance", draft.autoAdvance !== false, (checked) => draft.autoAdvance = checked],
        ]) {
            const row = el("label", "", "check-row"), check = el("input");
            check.type = "checkbox";
            check.checked = value;
            check.dataset.focusKey = label;
            check.onchange = () => { change(check.checked); autoSave(); };
            row.append(check, el("span", label));
            options.push(row);
        }
        editor.append(group("behavior", "Response and playback", `${draft.exercise === "m1" ? draft.method + " · Self-assessed · " : ""}Context ${draft.context ? "on" : "off"} · Auto Advance ${draft.autoAdvance !== false ? "on" : "off"}`, options, true));
    }
    if (step === "Sound") {
        const label = el("label", "Volume", "voice-control"), input = el("input"), output = el("output", Math.round(draft.volume * 100) + "%");
        input.type = "range";
        input.min = "0";
        input.max = "1";
        input.step = "0.05";
        input.value = String(draft.volume);
        input.setAttribute("aria-label", "Volume");
        input.dataset.focusKey = "volume";
        input.oninput = () => output.textContent = Math.round(Number(input.value) * 100) + "%";
        input.onchange = () => { draft.volume = Number(input.value); autoSave(); };
        label.append(input, output);
        editor.append(group("volume", "Overall volume", Math.round(draft.volume * 100) + "%", [label], true));
        const controls = [el("p", "Original voices, low to high. 0% mutes; 100% standard; 200% double nominal gain. Accompaniment only.", "muted")];
        if (!draft.qualities.includes(auditionQuality))
            auditionQuality = draft.qualities[0] ?? "";
        if (auditionQuality && draft.roots.length) {
            controls.push(select("Audition quality", auditionQuality, draft.qualities, value => { auditionQuality = value; configRender(); }));
            const chord = parseChord(draft.roots[0] + auditionQuality), notes = chordNotes(chord);
            controls.push(el("p", "Preview chord: " + chord.symbol));
            for (let i = 0; i < 5; i++) {
                const row = el("label", `Voice ${i + 1} · ${notes[i] === undefined ? "absent" : degreeForPc(chord, notes[i] % 12)}`, "voice-control"), voice = el("input"), value = el("output", Math.round(draft.voiceLevels[i] * 100) + "%");
                voice.type = "range";
                voice.min = "0";
                voice.max = "200";
                voice.step = "5";
                voice.value = String(draft.voiceLevels[i] * 100);
                voice.setAttribute("aria-label", `Voice ${i + 1} volume`);
                voice.dataset.focusKey = "voice-" + i;
                voice.oninput = () => value.textContent = voice.value + "%";
                voice.onchange = () => { draft.voiceLevels[i] = Number(voice.value) / 100; autoSave(); };
                row.append(voice, value);
                controls.push(row);
            }
            controls.push(button("Audition " + chord.symbol, async () => {
                const c = validate(draft), token = ++reviewOperation;
                audio.stop();
                await audio.ready();
                if (token !== reviewOperation || location.hash !== "#configure")
                    return;
                audio.playSingle(chord, null, c.volume, true, { voiceLevels: c.voiceLevels });
            }), el("p", "Full accompaniment only · no practice record", "muted"));
        }
        editor.append(group("mix", "Voicing mix", draft.voiceLevels.map(v => Math.round(v * 100) + "%").join(", "), controls));
    }
    const overview = el("div");
    overview.id = "config-overview";
    overview.append(...configurationSummary());
    const full = el("p", describe(draft));
    full.id = "config-summary";
    side.append(practiceSummary(configGroups, activeId + ":overview", [el("h2", "This practice"), overview, disclosure("Full configuration", full)]));
    const mobileSummary = el("p", `${draft.roots.length} roots · ${draft.qualities.join(", ") || "No qualities"} · ${draft.count === 0 ? "Unlimited" : draft.count + " questions"}`, "config-mobile-overview");
    header.append(mobileSummary);
    const status = el("p", issue ? "Invalid settings. Review the highlighted group." : dirty ? "Not saved. Retry saving." : savedPresetId === activeId ? "Changes saved to this preset." : "Preset ready", "notice");
    status.id = "config-status";
    status.dataset.state = issue ? "invalid" : dirty ? "unsaved" : "saved";
    status.setAttribute("role", "status");
    const launch = el("div", "", "config-launch");
    launch.append(button("Start practice", () => start({ ...preset(), config: validate(draft) }), false, Boolean(issue)), status);
    side.append(launch);
    const management = disclosure("Preset actions", button("Back to presets", () => location.hash = "home"));
    if (!primaryPresets.some(p => p.id === activeId))
        management.append(button("Rename", () => {
            const name = prompt("Preset name", preset().name);
            if (name?.trim()) {
                preset().name = name.trim().slice(0, 100);
                persist();
                configRender();
            }
        }));
    const original = builtins.find(p => p.id === activeId);
    management.append(button(original ? "Restore Default" : "Delete preset", () => {
        if (!confirm(original ? "Restore this built-in preset?" : "Delete this preset? Practice history will be kept."))
            return;
        if (original) {
            presets[presets.findIndex(p => p.id === activeId)] = structuredClone(original);
            draft = editableConfig(original.config);
            persist();
            configRender();
        }
        else {
            presets = presets.filter(p => p.id !== activeId);
            activeId = presets[0].id;
            persist();
            location.hash = "home";
        }
    }));
    side.append(management);
    const layout = el("div", "", "config-layout");
    layout.append(editor, side);
    page.append(header, layout);
    host.replaceChildren(page);
}
function configRender() {
    reviewOperation++;
    audio.stop();
    const key = document.activeElement?.dataset.focusKey;
    headingFocus = false;
    rememberGroups(host, configGroups);
    const scroll = window.scrollY;
    host.replaceChildren();
    config();
    restoreControl(key);
    window.scrollTo(0, scroll);
}
async function start(p) {
    if (session)
        return;
    reviewOperation++;
    audio.stop();
    const c = validate(editableConfig(p.config));
    activeId = p.id;
    session = {
        id: crypto.randomUUID(),
        presetId: p.id,
        config: c,
        attempts: [],
        startedAt: new Date().toISOString(),
        endedAt: null,
    };
    sessions.push(session);
    generate = stream(c, session.id);
    persist();
    location.hash = "practice";
    next();
}
function material(a) {
    return `${a.target.chord.symbol}:${a.target.midi}`;
}
function next() {
    if (!session || !generate)
        return;
    if (question)
        question.dispose();
    else
        audio.stop();
    reviewOperation++;
    if (session.config.count && session.attempts.length >= session.config.count) {
        finish();
        return;
    }
    const q = generate(), signature = `${q.chord.symbol}:${q.midi}`, seen = seenMaterial.has(signature) ||
        sessions
            .flatMap((s) => s.attempts)
            .some((a) => material(a) === signature);
    seenMaterial.add(signature);
    current = attempt(session.config, q, session.id, seen ? "previously-seen" : "fresh");
    session.attempts.push(current);
    persist();
    question = new QuestionLifecycle(current, audio, {
        save: persist,
        change: renderPractice,
        advance: next,
        error: report,
        present: () => location.hash === "#practice" && !document.hidden,
    });
    render();
    void question.act({ type: "start" });
}
function finish(destination) {
    if (!session)
        return;
    question?.dispose();
    // A displayed but untouched question is not a submitted attempt.
    if (current &&
        !question?.view.done &&
        current.firstAnswer === null &&
        !current.replaysBeforeFirst)
        session.attempts = session.attempts.filter((a) => a !== current);
    session.endedAt = new Date().toISOString();
    const id = session.id;
    persist();
    session = null;
    current = null;
    question = null;
    generate = null;
    if (destination !== null) {
        location.hash = destination ?? "results/" + id;
        render();
    }
}
function renderPractice() {
    if (location.hash !== "#practice" || !session || !current || !question)
        return;
    const focusedKey = document.activeElement?.dataset.focusKey;
    const lifecycle = question, { busy, ready, done, choosingWrong, resolved, feedback, sounding, reference } = lifecycle.view;
    const soundText = sounding ? reference ? "Reference playing" : session.config.exercise === "m1" ? "Context playing" : session.config.context ? "Question playing" : "Target playing" : "";
    const signature = JSON.stringify([current.id, busy, ready, done, choosingWrong, resolved, feedback, current.firstCorrect, current.retryCount]);
    // A natural audio tail changes the indicator, not the user's live controls.
    if (signature === practiceSignature && host.querySelector(".playback-status")) {
        host.querySelector(".playback-status").textContent = soundText;
        return;
    }
    practiceSignature = signature;
    host.replaceChildren();
    const c = session.config, a = current;
    const top = el("div", "", "session-top");
    top.append(el("h1", c.exercise === "m1" ? "M1 Audiation" : "M2 Recognition"), button("Stop", finish));
    host.append(top);
    const count = el("p", `Question ${session.attempts.length}${c.count ? " / " + c.count : " / Unlimited"}`, "session-count");
    top.insertBefore(count, top.lastElementChild);
    const questionElement = el("section", "", "question");
    questionElement.append(el("p", "Known chord", "chord-label"), el("h2", a.target.chord.symbol));
    if (c.exercise === "m1") {
        const target = el("p", "Target ", "question-prompt");
        target.append(el("span", a.target.degree, "target-degree"));
        questionElement.append(target, el("p", "Self-rated / " + c.method, "method"));
    }
    else
        questionElement.append(el("p", resolved ? "Answer: " + a.target.degree : "Which chord degree?", "question-prompt"));
    host.append(questionElement);
    let statusText = feedback || (ready ? c.exercise === "m1" && done ? "Rate your response" : "Your turn" : "Audio not ready");
    if (busy)
        statusText = "Preparing audio...";
    else if (feedback === "Correct" && a.firstCorrect === false)
        statusText = "Correct on retry";
    const status = el("p", statusText);
    status.id = "feedback";
    host.append(status);
    if (!(c.exercise === "m1" && !c.context && !done))
        host.append(actions(button(ready ? c.exercise === "m1" ? done ? "Replay reference" : "Replay context" : resolved ? "Replay reference" : "Replay" : "Retry audio", () => lifecycle.act({ type: "listen" }), true, busy)));
    if (c.exercise === "m2") {
        if (!resolved) {
            const answers = el("div", "", "answers");
            for (const choice of a.target.options)
                answers.append(button(choice, () => lifecycle.act({ type: "answer", degree: choice }), true, !ready || busy));
            host.append(answers);
        }
        if (a.firstAnswer !== null && !resolved)
            host.append(button("Reveal Answer", () => lifecycle.act({ type: "reveal" }), true, busy));
    }
    else if (!done) {
        host.append(button("Done", () => lifecycle.act({ type: "done" }), false, !ready || busy));
    }
    else if (a.revealedReference && a.firstCorrect === null) {
        if (choosingWrong) {
            const wrongLabel = el("label", "Which degree did you imagine?"), wrong = el("select");
            wrong.id = "wrong-degree";
            wrong.dataset.focusKey = "wrong-degree";
            wrong.disabled = busy || !ready;
            const placeholder = el("option", "Choose a degree or Unknown");
            placeholder.value = "";
            wrong.append(placeholder);
            for (const d of [
                ...a.target.options.filter((d) => d !== a.target.degree),
                "unknown",
            ]) {
                const o = el("option", d === "unknown" ? "Unknown" : d);
                o.value = d;
                wrong.append(o);
            }
            wrong.onchange = () => {
                if (wrong.value &&
                    wrong.value !== a.target.degree &&
                    (wrong.value === "unknown" || a.target.options.includes(wrong.value)))
                    void lifecycle
                        .act({ type: "rate", correct: false, wrong: wrong.value })
                        .catch(report);
            };
            wrongLabel.append(wrong);
            host.append(wrongLabel);
        }
        else {
            host.append(actions(button("Correct", () => lifecycle.act({ type: "rate", correct: true }), true, busy), button("Incorrect", () => lifecycle.act({ type: "incorrect" }), true, busy)));
        }
    }
    if (resolved)
        host.append(button(c.count && session.attempts.length >= c.count
            ? "Finish session"
            : "Next", () => lifecycle.act({ type: "next" }), false, busy || !ready));
    const workspace = el("div", "", "practice-workspace harmonic-workspace single-chord"), response = el("section", "", "response-area"), settings = el("details", "", "session-settings");
    response.setAttribute("aria-label", "Response");
    const controls = Array.from(host.children).filter((node) => node !== top && node !== questionElement);
    const playbackStatus = el("p", soundText, "playback-status");
    if (c.exercise === "m2") {
        const line = el("div", "", "feedback-line");
        line.append(status, playbackStatus);
        questionElement.append(line);
        const replay = controls.find((node) => node.classList.contains("actions"));
        if (replay)
            questionElement.append(replay);
        response.append(...controls.filter((node) => node !== status && node !== replay));
    }
    else {
        response.append(...controls);
        status.after(playbackStatus);
        const replay = response.querySelector(".actions");
        if (replay)
            response.append(replay);
        response.querySelectorAll("button").forEach((b) => {
            if (b.textContent?.startsWith("Done"))
                b.classList.add("done-action");
        });
        if (done)
            response.querySelector(".actions:has(button[data-focus-key='Correct'])")?.classList.add("rating-actions");
    }
    settings.append(el("summary", "Session settings"), el("p", describe(c)));
    if (c.exercise === "m1")
        settings.append(el("p", "Self-assessment only; singing and playing are not pitch-verified. Completion time includes your response and interaction."));
    workspace.append(questionElement, response);
    host.replaceChildren(top, workspace, settings);
    restoreControl(focusedKey);
    const announcement = document.getElementById("practice-announcement");
    const message = `${count.textContent}. ${a.target.chord.symbol}. ${status.textContent}`;
    if (announcement.textContent !== message)
        announcement.textContent = message;
    if (!busy && document.activeElement === document.body) {
        const buttons = Array.from(host.querySelectorAll("button:not(:disabled)"));
        const focus = resolved
            ? buttons.find((b) => b.textContent === "Next" || b.textContent === "Finish session")
            : done
                ? (host.querySelector("#wrong-degree") ??
                    buttons.find((b) => b.textContent === "Correct"))
                : c.exercise === "m2"
                    ? host.querySelector(".answers button:not(:disabled)")
                    : buttons.find((b) => b.textContent?.startsWith("Done"));
        focus?.focus({ preventScroll: true });
    }
}
function confusions(rows) {
    const section = el("section", "", "confusions"), mistakes = new Map();
    let unknown = 0;
    for (const a of rows.filter((a) => a.firstCorrect === false)) {
        const chosen = a.exercise === "m1" ? a.imaginedWrongDegree : a.firstAnswer;
        if (!chosen || chosen === "unknown") {
            unknown++;
            continue;
        }
        const key = `${a.target.degree} → ${chosen}`;
        mistakes.set(key, (mistakes.get(key) ?? 0) + 1);
    }
    section.append(el("h2", "Degree confusions"));
    const list = el("ul");
    for (const [label, count] of [...mistakes].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
        const item = el("li");
        item.append(el("span", label), el("strong", String(count)));
        list.append(item);
    }
    section.append(mistakes.size ? list : el("p", "No recorded first-response confusions."));
    if (unknown)
        section.append(el("p", `Unknown / Don’t know: ${unknown}. No specific wrong degree was reported.`));
    return section;
}
function summary(rows, c, showConfusions = true) {
    const m = metrics(rows), block = el("section", "", "evidence-summary"), outcome = el("section", "", "outcome"), body = el("div", "", "evidence-body"), supporting = el("div", "", "supporting-metrics");
    outcome.dataset.correct = String(m.correct);
    outcome.dataset.assessed = String(m.n);
    outcome.append(el("h2", c.exercise === "m1" ? "Self-rated Accuracy" : "First-answer Accuracy"), el("p", m.n ? Math.round(m.correct / m.n * 100) + "%" : "—", "metric-number"), el("p", `${m.correct} / ${m.n} assessed`, "assessment-count"), el("p", `${m.unassessed} unassessed`, "unassessed"));
    if (c.exercise === "m1")
        outcome.append(el("p", "Self-rated / " + c.method, "assessment-source"));
    for (const [label, value, note] of [
        ["Replay-assisted first responses", `${m.replayed} / ${m.n}`, ""],
        [c.exercise === "m1" ? "Correct self-rated response median" : "Correct-response median",
            m.median === null ? "Unavailable" : (m.median / 1000).toFixed(2) + " s", `n=${m.timed} valid correct responses`],
    ]) {
        const item = el("div", "", "supporting-metric");
        item.append(el("p", label), el("strong", value));
        if (note)
            item.append(el("small", note));
        supporting.append(item);
    }
    const notes = disclosure("Timing and replay detail", el("p", `Replay totals across all ${rows.length} records: ${m.before} before the first response; ${m.after} after. The assisted-response share above uses assessed questions only.`), el("p", `Exposure: ${rows.filter((a) => a.exposure === "fresh").length} fresh, ${rows.filter((a) => a.exposure === "previously-seen").length} previously seen. Repetition is not evidence of transfer.`), el("p", c.exercise === "m1"
        ? `Self-rated ${c.method}; time is self-indicated and includes interaction${c.method === "played" ? " and instrument execution" : ""}. Singing and playing are not pitch-verified.`
        : "Submission time includes listening, reasoning and interaction; it is not pure mental recognition speed. Correct-response times exclude invalid timing and first incorrect answers."));
    notes.className = "evidence-notes";
    body.append(supporting);
    if (showConfusions)
        body.append(confusions(rows));
    body.append(notes);
    block.append(outcome, body);
    return block;
}
function results(id) {
    const s = sessions.find((s) => s.id === id);
    if (!s) {
        heading("Session not found");
        return;
    }
    heading(s.endedAt ? "Session results" : "Interrupted session - saved attempts").className = "page-band";
    const overview = () => {
        const block = summary(s.attempts, s.config);
        block.querySelector(".outcome").append(actions(button("Practice again", () => start({ id: s.presetId, name: "Similar practice", config: s.config }), false), button("Customize", () => {
            activeId = presets.some((p) => p.id === s.presetId) ? s.presetId : presets[0].id;
            draft = editableConfig(s.config);
            location.hash = "configure";
        }), button("Presets", () => location.hash = "home")));
        return block;
    };
    host.append(el("p", `${s.config.exercise === "m1" ? "M1 Audiation / Self-rated " + s.config.method : "M2 Recognition / First answers"} · ${s.attempts.length} ${s.attempts.length === 1 ? "record" : "records"}`, "results-context"), disclosure("Session conditions", el("p", describe(s.config))), overview());
    const review = disclosure("Question review");
    review.className = "question-review";
    for (const a of s.attempts) {
        const item = el("section");
        item.append(el("h3", `${a.target.chord.symbol} / ${a.target.degree}`), el("p", `${a.gradingSource === "self" ? "Self-rated" : "First answer"}: ${a.firstAnswer ?? "Unassessed"}. Recorded response: ${a.firstResponseMs === null ? "Unavailable" : (a.firstResponseMs / 1000).toFixed(2) + "s"} (${a.timingValidity}, descriptive only). Retries: ${a.retryCount}.`));
        const replay = button("Replay reference", async () => {
            const token = ++reviewOperation;
            replay.disabled = true;
            try {
                await audio.ready();
                if (token !== reviewOperation || location.hash !== "#results/" + s.id)
                    return;
                audio.playReference(a.target.chord, a.target.midi, s.config.volume, null, s.config.voiceLevels);
                a.replaysAfterFirst++;
                a.revealedReference = true;
                persist();
                host.querySelector(".evidence-summary")?.replaceWith(overview());
            }
            catch (e) {
                if (token === reviewOperation)
                    throw e;
            }
            finally {
                replay.disabled = false;
            }
        });
        item.append(replay);
        review.append(item);
    }
    host.append(review);
}
function customizeFocus(items, key) {
    if (items[0].exercise.startsWith("progression-")) {
        location.hash = "progression";
        return;
    }
    const config = {
        ...editableConfig(items[0].configurationSnapshot),
        qualities: [items[0].target.chord.quality],
        targetMode: "exact",
        targets: [items[0].target.degree],
        targetPools: { [items[0].target.chord.quality]: [items[0].target.degree] },
    };
    if (rootFilter)
        config.roots = [rootFilter];
    let focus = presets.find((p) => !builtins.some((b) => b.id === p.id) && JSON.stringify(p.config) === JSON.stringify(config));
    if (!focus) {
        focus = { id: crypto.randomUUID(), name: `Focus: ${config.exercise.toUpperCase()} ${key}${rootFilter ? " / " + rootFilter : ""}`, config };
        presets.push(focus);
    }
    persist();
    customize(focus);
}
function insights() {
    heading("Insights");
    const all = [...sessions.flatMap(s => s.attempts), ...progressionEvidence()], scope = el("section", "", "insight-scope");
    const nav = actions();
    for (const [value, label] of [["overall", "Overall"], ["m1", "M1 Audiation"], ["m2", "M2 Recognition"], ["progression-recognition", "Progression Recognition"], ["progression-singing", "Guided Singing"]])
        nav.append(button(label, () => { insightModule = value; production = "all"; rootFilter = ""; qualityFilter = ""; render(); }, insightModule !== value));
    scope.append(nav);
    if (insightModule === "m1")
        scope.append(select("Production category", production, ["all", "imagined-sung", "played"], value => { production = value; render(); }));
    let rows = insightRows(all, insightModule, production);
    host.append(scope);
    if (!rows.length) {
        const progressionMode = insightModule === "progression-singing" ? "singing" : insightModule === "progression-recognition" ? "recognition" : null;
        const label = progressionMode === "singing" ? "Guided Singing" : "Progression Recognition";
        host.append(el("p", progressionMode ? `No ${label} records yet. Start a progression practice.` : "No matching V2 records. Choose an exercise to start practicing."), button(progressionMode ? `Practice ${label}` : "Practice", () => location.hash = progressionMode ? `progression/${progressionMode}` : "home"));
        return;
    }
    const c = rows[0].configurationSnapshot;
    scope.append(el("p", "V2 outcomes · self-ratings and selected answers count equally. Self-ratings are not pitch-verified."));
    const conditions = [...new Set(rows.map(a => a.progressionContext ? progressionConditions(a.progressionContext) : describe(a.configurationSnapshot)))];
    const versions = [...new Set(rows.map(a => `${a.timingVersion} · ${a.target.generatorVersion}`))];
    scope.append(disclosure("Source conditions", ...conditions.map(text => el("p", text)), disclosure("Technical versions", ...versions.map(text => el("p", text)))));
    const historyEntries = [
        ...sessions.map(s => ({ id: s.id, startedAt: s.startedAt, label: s.config.exercise.toUpperCase(), count: s.attempts.length, unit: "records", ended: Boolean(s.endedAt), href: "#results/" + s.id })),
        ...progressionSessions().map(s => ({ ...s, unit: s.count === 1 ? "progression" : "progressions" })),
    ].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    const filters = el("div", "", "insight-filters");
    filters.append(select("Root", rootFilter || "All selected roots", ["All selected roots", ...new Set(rows.map((a) => a.target.chord.root))], (value) => {
        rootFilter = value === "All selected roots" ? "" : value;
        render();
    }), select("Chord quality", qualityFilter || "All selected qualities", ["All selected qualities", ...new Set(rows.map((a) => a.target.chord.quality))], (value) => {
        qualityFilter = value === "All selected qualities" ? "" : value;
        render();
    }));
    host.append(scope, filters);
    rows = rows.filter((a) => (!rootFilter || a.target.chord.root === rootFilter) && (!qualityFilter || a.target.chord.quality === qualityFilter));
    if (!rows.length) {
        host.append(el("p", "Not enough comparable data for these filters."), button("Clear filters", () => { rootFilter = ""; qualityFilter = ""; render(); }));
        return;
    }
    const dates = historyEntries.filter((s) => rows.some((a) => a.sessionId === s.id)).map((s) => s.startedAt.slice(0, 10)).sort();
    if (dates.length) {
        const range = dates[0] === dates[dates.length - 1] ? dates[0] : `${dates[0]} to ${dates[dates.length - 1]}`;
        scope.append(el("p", `Recorded ${range} · All matching sessions`, "scope-date"));
    }
    const cells = [...new Set(rows.map((a) => `${a.target.chord.quality}/${a.target.degree}`))].map((key) => {
        const items = rows.filter((a) => `${a.target.chord.quality}/${a.target.degree}` === key);
        return { key, items, m: metrics(items) };
    });
    const overview = summary(rows, c, false), body = overview.querySelector(".evidence-body");
    overview.querySelector(".outcome h2").textContent = insightModule === "overall" ? "Combined degree accuracy" : (insightModule === "m1" || insightModule === "progression-singing") ? "Self-rated accuracy" : "First-answer accuracy";
    overview.querySelector(".assessment-source")?.remove();
    const labels = overview.querySelectorAll(".supporting-metric > p");
    labels[1].textContent = "Mixed-practice response time";
    body.prepend(confusions(rows));
    body.append(el("p", "M1 Done and M2 answer submission use different readiness boundaries. Mixed-practice time is not pure recognition speed or measured performance onset."));
    overview.querySelector(".evidence-notes > p:last-child")?.remove();
    overview.querySelector(".evidence-notes").append(el("p", "Methods, pools, mix and versions remain in source records; totals combine mixed practice."));
    const patterns = el("section", "", "patterns");
    patterns.append(el("h2", "Chord-degree performance"));
    patterns.append(el("p", "Descriptive observations, not a diagnosis. Sample counts and practice conditions may differ."));
    for (const cell of cells) {
        const row = el("article", "", "pattern-row");
        row.append(el("h3", cell.key.replace("/", " / ")), el("strong", `${cell.m.correct} / ${cell.m.n} assessed`), button(cell.items.every(a => a.exercise.startsWith("progression-")) ? "Progression settings" : "Customize focus", () => customizeFocus(cell.items, cell.key)));
        patterns.append(row);
    }
    const notes = body.querySelector(".evidence-notes");
    body.prepend(patterns);
    const table = el("table"), head = el("tr");
    table.append(el("caption", "Chord Quality × Degree"));
    for (const name of ["Quality / degree", "Correct / assessed", "Replay-assisted", "Correct median (n)", "Practice"]) {
        const th = el("th", name);
        th.scope = "col";
        head.append(th);
    }
    const thead = el("thead");
    thead.append(head);
    table.append(thead);
    const tbody = el("tbody");
    for (const cell of cells) {
        const tr = el("tr"), m = cell.m;
        tr.append(el("td", cell.key), el("td", `${m.correct}/${m.n}`), el("td", `${m.replayed}/${m.n}`), el("td", `${m.median === null ? "Unavailable" : (m.median / 1000).toFixed(2) + "s"} (${m.timed})`));
        const td = el("td");
        td.append(button(cell.items.every(a => a.exercise.startsWith("progression-")) ? "Progression settings" : "Customize focus", () => customizeFocus(cell.items, cell.key)));
        tr.append(td);
        tbody.append(tr);
    }
    table.append(tbody);
    const scroll = el("div", "", "table-scroll");
    scroll.tabIndex = 0;
    scroll.setAttribute("role", "region");
    scroll.setAttribute("aria-label", "Chord quality and degree breakdown");
    scroll.append(table);
    const detail = disclosure("Detailed breakdown", scroll, confusions(rows), notes);
    detail.className = "insight-detail";
    const history = el("ul", "", "session-history");
    const matching = historyEntries.filter(s => rows.some(a => a.sessionId === s.id));
    for (const s of matching) {
        const item = el("li"), link = el("a", `${s.startedAt.slice(0, 10)} · ${s.label} · ${s.count} ${s.unit}${s.ended ? "" : " (interrupted)"}`);
        link.href = s.href;
        item.append(link);
        history.append(item);
    }
    if (matching[0]) {
        const link = el("a", "View latest matching session", "session-link");
        link.href = matching[0].href;
        const item = el("li");
        item.append(link);
        history.prepend(item);
    }
    host.append(overview, detail, disclosure("Sessions", history));
}
let disposeProgression;
function render() {
    disposeProgression?.();
    disposeProgression = undefined;
    if (fatal)
        return;
    const route = location.hash.slice(1) || "home";
    if (route !== "practice")
        document.getElementById("practice-announcement").textContent = "";
    if (session && route !== "practice") {
        finish(route);
        return;
    }
    const focusedKey = document.activeElement?.dataset.focusKey;
    headingFocus = route !== lastRoute;
    lastRoute = route;
    document
        .querySelectorAll("nav[aria-label='Primary'] a")
        .forEach((link) => {
        const active = link.hash ===
            (route === "insights" || route.startsWith("results/")
                ? "#insights"
                : "#home");
        if (active)
            link.setAttribute("aria-current", "page");
        else
            link.removeAttribute("aria-current");
    });
    if (!session) {
        reviewOperation++;
        audio.stop();
    }
    host.replaceChildren();
    if (route === "progression" || route.startsWith("progression/")) {
        try {
            disposeProgression = mountProgression(host, route.split("/")[1] === "singing" ? "singing" : "recognition", route.endsWith("/start"), route.split("/")[2] === "results" ? decodeURIComponent(route.split("/")[3] ?? "") : undefined);
        }
        catch (e) {
            report(e);
        }
    }
    else if (route === "practice" && session)
        renderPractice();
    else if (route === "configure")
        config();
    else if (route === "insights")
        insights();
    else if (route.startsWith("results/"))
        results(route.slice(8));
    else
        home();
    if (!headingFocus)
        restoreControl(focusedKey);
}
document.querySelector(".skip-link").addEventListener("click", (event) => {
    event.preventDefault();
    host.focus();
});
document.querySelector("nav[aria-label='Primary'] a[href='../jazz-ear-lab/']").addEventListener("click", (event) => {
    if (!session)
        return;
    finish(null);
    if (dirty) {
        event.preventDefault();
        location.hash = "results/" + sessions[sessions.length - 1].id;
        render();
    }
});
window.addEventListener("hashchange", render);
document.addEventListener("visibilitychange", () => {
    if (document.hidden)
        question?.interrupt("hidden");
});
window.addEventListener("pagehide", () => {
    reviewOperation++;
    if (question)
        question.interrupt("pagehide");
    else
        audio.stop();
});
window.addEventListener("beforeunload", (e) => {
    if (dirty) {
        e.preventDefault();
        e.returnValue = "";
    }
});
load();
