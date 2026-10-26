import { AudioEngine } from "../jazz/audio.js";
import { QuestionLifecycle } from "./question.js";
import { builtins, primaryPresets, roots, qualities, degrees, roles, validate, stream, attempt, read, write, keys, metrics, cohort, } from "./model.js";
const host = document.getElementById("app"), error = document.getElementById("error");
const audio = new AudioEngine();
let question = null;
let reviewOperation = 0;
let seenMaterial = new Set();
let presets = [], sessions = [], activeId = builtins[0].id, draft;
let session = null, current = null, generate = null;
let step = "Harmony", dirty = false, fatal = false;
let selectedCohort = "", rootFilter = "", qualityFilter = "";
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
    return `${c.exercise.toUpperCase()} / ${c.roots.join(", ")} / ${c.qualities.join(", ")} / ${c.targets.join(", ")} (${c.targetMode}) / context ${c.context ? "on" : "off"} / ${c.count || "Unlimited"} questions${c.exercise === "m1" ? " / " + c.method : ""}`;
}
function customize(p) {
    activeId = p.id;
    draft = structuredClone(p.config);
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
        const o = el("option", v === "All selected roots" ? "All roots" : v === "All selected qualities" ? "All qualities" : v);
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
    const summary = document.getElementById("config-summary");
    if (summary)
        summary.textContent = describe(draft);
    const overview = document.getElementById("config-overview");
    if (overview)
        overview.replaceChildren(...configurationSummary());
}
function configurationSummary() {
    return [
        `Roots: ${draft.roots.length} / 12 selected`,
        `Qualities: ${draft.qualities.join(", ") || "None selected"}`,
        `Targets: ${draft.targets.join(", ") || "None selected"} (${draft.targetMode})`,
    ].map((text) => el("p", text));
}
function pool(label, options, values, update) {
    const f = el("fieldset"), group = el("div", "", "pool");
    f.append(el("legend", label), group);
    for (const value of options) {
        const l = el("label"), input = el("input");
        input.type = "checkbox";
        input.value = value;
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
function config() {
    heading("Customize " + preset().name);
    const tabs = el("nav", "", "steps");
    tabs.setAttribute("aria-label", "Configuration steps");
    for (const name of ["Harmony", "Targets", "Practice"]) {
        const b = button(name, () => {
            step = name;
            configRender();
        });
        b.setAttribute("aria-current", step === name ? "step" : "false");
        tabs.append(b);
    }
    host.append(tabs);
    if (step === "Harmony")
        host.append(pool("Roots", roots, draft.roots, (v) => (draft.roots = v)), button("All 12 Keys", () => {
            draft.roots = [...roots];
            autoSave();
            configRender();
        }), pool("Chord qualities", qualities, draft.qualities, (v) => (draft.qualities = v)));
    if (step === "Targets")
        host.append(select("Degree selection", draft.targetMode, ["functional", "exact"], (v) => {
            draft.targetMode = v;
            draft.targets =
                v === "functional" ? ["Third", "Seventh"] : ["3", "b7"];
            autoSave();
            configRender();
        }), pool("Target degrees", draft.targetMode === "functional" ? roles : degrees, draft.targets, (v) => (draft.targets = v)));
    if (step === "Practice") {
        if (!primaryPresets.some((p) => p.id === activeId))
            host.append(select("Exercise", draft.exercise, ["m1", "m2"], (v) => {
                draft.exercise = v;
                autoSave();
                configRender();
            }));
        if (draft.exercise === "m1")
            host.append(select("Response method (self-assessed)", draft.method, ["imagined", "sung", "played"], (v) => {
                draft.method = v;
                autoSave();
            }));
        const l = el("label"), check = el("input");
        check.type = "checkbox";
        check.checked = draft.context;
        check.onchange = () => {
            draft.context = check.checked;
            autoSave();
        };
        l.append(check, el("span", " Audible chord context"));
        const advanceLabel = el("label"), advance = el("input");
        advance.type = "checkbox";
        advance.checked = draft.autoAdvance !== false;
        advance.onchange = () => {
            draft.autoAdvance = advance.checked;
            autoSave();
        };
        advanceLabel.append(advance, el("span", " Auto Advance"));
        host.append(actions(l, advanceLabel));
        const countLabel = el("label", "Questions (0 = Unlimited)"), count = el("input");
        count.type = "number";
        count.min = "0";
        count.max = "200";
        count.value = String(draft.count);
        count.onchange = () => {
            draft.count = count.value === "" ? NaN : Number(count.value);
            autoSave();
        };
        countLabel.append(count);
        host.append(countLabel);
        const vl = el("label", "Volume"), v = el("input"), value = el("output", Math.round(draft.volume * 100) + "%");
        v.id = "practice-volume";
        v.setAttribute("aria-label", "Volume");
        value.htmlFor = v.id;
        v.type = "range";
        v.min = "0";
        v.max = "1";
        v.step = "0.05";
        v.value = String(draft.volume);
        v.oninput = () => value.textContent = Math.round(Number(v.value) * 100) + "%";
        v.onchange = () => {
            draft.volume = Number(v.value);
            autoSave();
        };
        vl.append(v, value);
        host.append(vl);
    }
    const status = el("p", dirty ? "Not saved. Retry saving." : savedPresetId === activeId ? "Changes saved to this preset." : "Preset ready", "notice");
    status.dataset.state = dirty ? "unsaved" : "saved";
    status.id = "config-status";
    status.setAttribute("role", "status");
    const summary = el("p", describe(draft));
    summary.id = "config-summary";
    host.append(status, summary, actions(button("Start practice", () => start({ ...preset(), config: validate(draft) }), false), button("Back to presets", () => (location.hash = "home")), ...(!primaryPresets.some((p) => p.id === activeId)
        ? [
            button("Rename", () => {
                const name = prompt("Preset name", preset().name);
                if (name?.trim()) {
                    preset().name = name.trim().slice(0, 100);
                    persist();
                    configRender();
                }
            }),
        ]
        : [])));
    const original = builtins.find((p) => p.id === activeId);
    host.append(button(original ? "Restore Default" : "Delete preset", () => {
        if (!confirm(original
            ? "Restore this built-in preset?"
            : "Delete this preset? Practice history will be kept."))
            return;
        if (original) {
            const i = presets.findIndex((p) => p.id === activeId);
            presets[i] = structuredClone(original);
            draft = structuredClone(original.config);
            persist();
            configRender();
        }
        else {
            presets = presets.filter((p) => p.id !== activeId);
            activeId = presets[0].id;
            persist();
            location.hash = "home";
        }
    }));
    try {
        validate(draft);
    }
    catch (e) {
        status.dataset.state = "invalid";
        status.textContent =
            e.message + " Last valid saved preset unchanged.";
    }
    const title = host.querySelector("h1"), anchor = el("section", "", "config-anchor"), work = el("section", "", "config-work"), overview = el("div");
    overview.id = "config-overview";
    overview.append(...configurationSummary());
    anchor.append(title, status, overview, disclosure("Full configuration", summary));
    const footer = host.querySelector(".actions:has(button[data-focus-key='Start practice'])");
    footer.classList.add("config-actions");
    const restore = Array.from(host.querySelectorAll("button")).find((b) => b.textContent === "Restore Default" || b.textContent === "Delete preset");
    footer.append(restore);
    const controls = Array.from(host.children).filter((node) => node !== footer);
    work.append(...controls, footer);
    work.setAttribute("aria-label", "Preset settings");
    host.replaceChildren(splitView(anchor, work, "configuration"));
}
function configRender() {
    const key = document.activeElement?.dataset.focusKey;
    headingFocus = false;
    host.replaceChildren();
    config();
    restoreControl(key);
}
async function start(p) {
    if (session)
        return;
    const c = validate(p.config);
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
    const workspace = el("div", "", "practice-workspace"), response = el("section", "", "response-area"), settings = el("details", "", "session-settings");
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
        section.append(el("p", `Unknown imagined degree: ${unknown}. No specific wrong degree was reported.`));
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
            draft = structuredClone(s.config);
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
    const config = {
        ...structuredClone(items[0].configurationSnapshot),
        qualities: [items[0].target.chord.quality],
        targetMode: "exact",
        targets: [items[0].target.degree],
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
    const all = sessions.flatMap((s) => s.attempts), groups = [...new Set(all.map(cohort))];
    if (!groups.length) {
        host.append(el("p", "Not enough comparable data. Start an M1 or M2 preset."), actions(button("Practice", () => location.hash = "home", false)));
        return;
    }
    if (!groups.includes(selectedCohort))
        selectedCohort = groups[groups.length - 1];
    const labels = groups.map((g, i) => {
        const a = all.find((a) => cohort(a) === g), c = a.configurationSnapshot;
        return `${i + 1}. ${a.exercise.toUpperCase()} / ${c.context ? "Context on" : "Context off"} / ${a.exposure === "fresh" ? "Fresh" : "Previously seen"}${a.exercise === "m1" ? " / " + c.method : ""}`;
    });
    const scope = el("section", "", "insight-scope");
    const condition = select("Comparable practice conditions", labels[groups.indexOf(selectedCohort)], labels, (value) => {
        selectedCohort = groups[labels.indexOf(value)];
        rootFilter = "";
        qualityFilter = "";
        render();
    });
    condition.querySelector("select").setAttribute("aria-describedby", "comparison-description");
    scope.append(condition);
    let rows = all.filter((a) => cohort(a) === selectedCohort);
    const c = rows[0].configurationSnapshot, sample = rows[0], description = el("p", "", "scope-description");
    description.id = "comparison-description";
    description.textContent = c.exercise === "m1" ? "Self-rated / " + c.method : "First-answer evidence";
    scope.append(description);
    const conditions = disclosure("Full comparison conditions", el("p", describe(c)), el("p", `Timing: ${sample.timingVersion}. Generator: ${sample.target.generatorVersion}. Answer policy: 12 pitch-class choices with exact target spelling.`));
    scope.append(conditions);
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
    const dates = sessions.filter((s) => rows.some((a) => a.sessionId === s.id)).map((s) => s.startedAt.slice(0, 10)).sort();
    if (dates.length) {
        const range = dates[0] === dates[dates.length - 1] ? dates[0] : `${dates[0]} to ${dates[dates.length - 1]}`;
        scope.append(el("p", `Recorded ${range} · All matching sessions`, "scope-date"));
    }
    const cells = [...new Set(rows.map((a) => `${a.target.chord.quality}/${a.target.degree}`))].map((key) => {
        const items = rows.filter((a) => `${a.target.chord.quality}/${a.target.degree}` === key);
        return { key, items, m: metrics(items) };
    });
    const supported = cells.filter((cell) => cell.m.n >= 10).sort((a, b) => a.m.correct / a.m.n - b.m.correct / b.m.n);
    const overview = summary(rows, c, false), body = overview.querySelector(".evidence-body");
    const patterns = el("section", "", "patterns");
    patterns.append(el("h2", "Patterns worth attention"));
    if (supported.length > 1 && supported[0].m.correct / supported[0].m.n < supported[supported.length - 1].m.correct / supported[supported.length - 1].m.n) {
        patterns.append(el("p", "Descriptive, not a diagnosis. At least 10 assessed responses per group; roots and replay use may differ.", "pattern-caution"));
        for (const [i, cell] of [supported[0], supported[supported.length - 1]].entries()) {
            const row = el("article", "", "pattern-row"), rate = cell.m.correct / cell.m.n;
            row.append(el("h3", cell.key.replace("/", " / ")));
            const bar = el("div", "", "evidence-bar"), fill = el("span");
            fill.style.width = `${rate * 100}%`;
            bar.setAttribute("aria-hidden", "true");
            bar.append(fill);
            row.append(bar, el("strong", Math.round(rate * 100) + "%"), el("span", `${cell.m.correct} / ${cell.m.n} assessed`), el("small", `Replay-assisted ${cell.m.replayed} / ${cell.m.n}`), button("Customize focus", () => customizeFocus(cell.items, cell.key), i !== 0));
            patterns.append(row);
        }
    }
    else {
        patterns.append(el("p", "Not enough comparable data to identify distinct strongest/weakest patterns. Explore individual observations below."));
    }
    const notes = body.querySelector(".evidence-notes");
    body.append(patterns);
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
        td.append(button("Customize focus", () => customizeFocus(cell.items, cell.key)));
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
    for (const s of sessions.slice().reverse()) {
        const item = el("li"), link = el("a", `${s.startedAt.slice(0, 10)} · ${s.config.exercise.toUpperCase()} · ${s.attempts.length} records${s.endedAt ? "" : " (interrupted)"}`);
        link.href = "#results/" + s.id;
        item.append(link);
        history.append(item);
    }
    const latest = sessions.slice().reverse().find((s) => rows.some((a) => a.sessionId === s.id));
    if (latest) {
        const link = el("a", "View latest matching session", "session-link");
        link.href = "#results/" + latest.id;
        const item = el("li");
        item.append(link);
        history.prepend(item);
    }
    host.append(overview, detail, disclosure("Sessions", history));
}
function render() {
    if (fatal)
        return;
    const route = location.hash.slice(1) || "home";
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
    if (route === "practice" && session)
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
