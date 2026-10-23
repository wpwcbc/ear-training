import { AudioEngine, } from "../jazz/audio.js";
import { builtins, primaryPresets, roots, qualities, degrees, roles, validate, stream, attempt, answer, rate, read, write, keys, metrics, cohort, } from "./model.js";
const host = document.getElementById("app"), error = document.getElementById("error");
const audio = new AudioEngine();
let playback = null;
let transition = 0, transitionTimer;
function cancelAdvance() {
    transition++;
    clearTimeout(transitionTimer);
    transitionTimer = undefined;
}
function scheduleAdvance({ after, delayMs = 0, fade = false, } = {}) {
    cancelAdvance();
    if (!session || !current || !resolved || session.config.autoAdvance === false)
        return;
    const token = transition, a = current, s = session, op = operation;
    const active = () => token === transition &&
        current === a &&
        session === s &&
        operation === op &&
        resolved &&
        s.config.autoAdvance !== false &&
        location.hash === "#practice" &&
        !document.hidden;
    const advance = async () => {
        try {
            if (after && (await after) !== "completed")
                return;
            if (!active())
                return;
            if (fade && playback && (await playback.fadeOut()) === "cancelled")
                return;
            if (active())
                next();
        }
        catch (e) {
            if (active()) {
                cancelAdvance();
                ready = false;
                feedback = "Audio unavailable. Retry audio before continuing.";
                renderPractice();
                report(e);
            }
        }
    };
    if (delayMs)
        transitionTimer = setTimeout(() => void advance(), delayMs);
    else
        void advance();
}
let seenMaterial = new Set();
let presets = [], sessions = [], activeId = builtins[0].id, draft;
let session = null, current = null, generate = null;
let step = "Harmony", busy = false, ready = false, done = false, resolved = false, feedback = "", started = 0, operation = 0, dirty = false, fatal = false;
let selectedCohort = "", rootFilter = "", qualityFilter = "";
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
    b.type = "button";
    b.disabled = disabled;
    b.onclick = () => {
        Promise.resolve().then(fn).catch(report);
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
    h.focus({ preventScroll: true });
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
}
function select(label, value, options, update) {
    const l = el("label", label), s = el("select");
    options.forEach((v) => {
        const o = el("option", v);
        o.value = v;
        s.append(o);
    });
    s.value = value;
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
    }
    catch (e) {
        status.dataset.state = "invalid";
        status.textContent = `${e.message} Last valid saved preset unchanged.`;
    }
    const summary = document.getElementById("config-summary");
    if (summary)
        summary.textContent = describe(draft);
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
        const vl = el("label", "Volume"), v = el("input");
        v.type = "range";
        v.min = "0";
        v.max = "1";
        v.step = "0.05";
        v.value = String(draft.volume);
        v.onchange = () => {
            draft.volume = Number(v.value);
            autoSave();
        };
        vl.append(v);
        host.append(vl);
    }
    const status = el("p", "", "notice");
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
}
function configRender() {
    host.replaceChildren();
    config();
}
async function start(p) {
    if (busy || session)
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
    cancelAdvance();
    operation++;
    audio.stop();
    playback = null;
    busy = false;
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
    done = false;
    resolved = false;
    ready = false;
    started = 0;
    feedback = "";
    render();
    void play(false);
}
function elapsed() {
    return current?.timingValidity === "valid" && started
        ? Math.max(0, performance.now() - started)
        : null;
}
async function play(replay, reference = false) {
    if (!session || !current || busy)
        return false;
    cancelAdvance();
    const a = current, c = session.config, token = ++operation;
    busy = true;
    ready = false;
    renderPractice();
    try {
        if (c.exercise === "m1" && !c.context && !reference) {
            if (!started) {
                started = performance.now();
                if (a.timingValidity !== "interrupted")
                    a.timingValidity = "valid";
            }
            ready = true;
            return true;
        }
        await audio.ready();
        if (token !== operation)
            return false;
        const plan = audio.playSingle(a.target.chord, c.exercise === "m2" || reference ? a.target.midi : null, c.volume, reference ? c.exercise === "m2" : c.context);
        playback = plan;
        if (replay) {
            if (done || a.firstAnswer !== null)
                a.replaysAfterFirst++;
            else
                a.replaysBeforeFirst++;
        }
        if (!(await plan.ready))
            return false;
        if (reference && (await plan.completed) !== "completed")
            return false;
        if (token !== operation)
            return false;
        if (!started && !reference) {
            started = performance.now();
            if (a.timingValidity !== "interrupted")
                a.timingValidity = "valid";
        }
        if (reference)
            a.revealedReference = true;
        ready = true;
        persist();
        return true;
    }
    catch (e) {
        if (token !== operation)
            return false;
        if (!done && a.firstAnswer === null)
            a.timingValidity = "interrupted";
        persist();
        feedback = "Audio unavailable. Retry audio before responding.";
        report(e);
        return false;
    }
    finally {
        if (token === operation) {
            busy = false;
            renderPractice();
        }
    }
}
function finish() {
    if (!session)
        return;
    cancelAdvance();
    operation++;
    busy = false;
    audio.stop();
    playback = null;
    // A displayed but untouched question is not a submitted attempt.
    if (current &&
        !done &&
        current.firstAnswer === null &&
        !current.replaysBeforeFirst)
        session.attempts = session.attempts.filter((a) => a !== current);
    session.endedAt = new Date().toISOString();
    const id = session.id;
    persist();
    session = null;
    current = null;
    generate = null;
    location.hash = "results/" + id;
    render();
}
function afterResponse(fastAdvance = false) {
    persist();
    if (fastAdvance) {
        renderPractice();
        scheduleAdvance({ delayMs: 1000, fade: true });
        return;
    }
    if (resolved &&
        session?.config.autoAdvance !== false &&
        session?.config.count &&
        session.attempts.length >= session.config.count)
        finish();
    else
        renderPractice();
}
function renderPractice() {
    if (location.hash !== "#practice" || !session || !current)
        return;
    host.replaceChildren();
    const c = session.config, a = current;
    const top = el("div", "", "session-top");
    top.append(el("h1", c.exercise === "m1" ? "M1 Audiation" : "M2 Recognition"), button("Stop", finish));
    host.append(top);
    host.append(el("p", `Question ${session.attempts.length}${c.count ? " / " + c.count : " / Unlimited"} - ${c.exercise === "m1" ? c.method + " / self-assessed" : "automatically scored"} - context ${c.context ? "on" : "off"}`));
    const question = el("section", "", "question");
    question.append(el("h2", a.target.chord.symbol));
    if (c.exercise === "m1")
        question.append(el("p", "Hear the " + a.target.degree));
    else
        question.append(el("p", resolved ? "Answer: " + a.target.degree : "Which chord degree?"));
    host.append(question);
    const status = el("p", busy ? "Playing..." : feedback || (ready ? "Your turn" : "Audio not ready"));
    status.id = "feedback";
    status.setAttribute("role", "status");
    host.append(status);
    if (!(c.exercise === "m1" && !c.context && !done))
        host.append(actions(button(ready ? "Replay" : "Retry audio", () => play(started > 0, done || resolved), true, busy)));
    if (c.exercise === "m2") {
        if (!resolved) {
            const answers = el("div", "", "answers");
            for (const choice of a.target.options)
                answers.append(button(choice, () => {
                    if (!ready || busy || resolved)
                        return;
                    const correct = answer(a, choice, elapsed());
                    if (correct)
                        a.revealedReference = true;
                    resolved = correct;
                    feedback = correct ? "Correct" : "Incorrect";
                    afterResponse(correct);
                }, true, !ready || busy));
            host.append(answers);
        }
        if (a.firstAnswer !== null && !resolved)
            host.append(button("Reveal Answer", async () => {
                if (current !== a || busy || resolved)
                    return;
                if (await play(false, true)) {
                    resolved = true;
                    feedback = "Reference revealed. First answer unchanged.";
                    persist();
                    renderPractice();
                    if (playback)
                        scheduleAdvance({ after: playback.completed });
                }
            }, true, busy));
    }
    else if (!done) {
        host.append(button("Done - " + c.method, async () => {
            if (!ready || busy)
                return;
            a.firstResponseMs = elapsed();
            done = true;
            persist();
            await play(false, true);
        }, false, !ready || busy));
    }
    else if (a.revealedReference && a.firstCorrect === null) {
        const wrongLabel = el("label", "If incorrect, which degree did you imagine?"), wrong = el("select");
        wrong.id = "wrong-degree";
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
        wrongLabel.append(wrong);
        host.append(wrongLabel);
        const grade = (correct) => {
            rate(a, correct, wrong.value);
            resolved = true;
            feedback = correct ? "Self-rated Correct" : "Self-rated Incorrect";
            afterResponse();
        };
        host.append(actions(button("Correct", () => grade(true), false, busy), button("Incorrect", () => grade(false), true, busy)));
    }
    if (resolved)
        host.append(button(c.count && session.attempts.length >= c.count
            ? "Finish session"
            : "Next", () => {
            if (current === a && resolved && !busy)
                next();
        }, false, busy));
    if (c.exercise === "m1")
        host.append(el("p", "Self-assessment only; singing and playing are not pitch-verified. Completion time includes your response and interaction."));
    if (!busy && document.activeElement === document.body) {
        const buttons = Array.from(host.querySelectorAll("button:not(:disabled)"));
        const focus = resolved
            ? buttons.find((b) => b.textContent === "Next" || b.textContent === "Finish session")
            : done
                ? host.querySelector("#wrong-degree")
                : c.exercise === "m2"
                    ? host.querySelector(".answers button:not(:disabled)")
                    : buttons.find((b) => b.textContent?.startsWith("Done"));
        focus?.focus({ preventScroll: true });
    }
}
function summary(rows, c) {
    const m = metrics(rows), block = el("section"), overview = el("div", "", "metrics");
    overview.append(el("p", `${c.exercise === "m1" ? "Self-rated Accuracy" : "First-answer Accuracy"}: ${m.correct}/${m.n}${m.n ? " (" + Math.round((m.correct / m.n) * 100) + "%)" : ""}; ${m.unassessed} unassessed`), el("p", `Replay-assisted first responses: ${m.replayed}/${m.n}. Replays before: ${m.before}; after: ${m.after}.`), el("p", `Correct-first response median: ${m.median === null ? "Not enough comparable data" : (m.median / 1000).toFixed(2) + "s"} (n=${m.timed}).`));
    block.append(overview, el("p", `Exposure: ${rows.filter((a) => a.exposure === "fresh").length} fresh, ${rows.filter((a) => a.exposure === "previously-seen").length} previously seen. Repetition is not evidence of transfer.`), el("p", c.exercise === "m1"
        ? `Self-rated ${c.method}; time is self-indicated and includes interaction${c.method === "played" ? " and instrument execution" : ""}.`
        : "Submission time includes listening, reasoning and interaction; it is not pure mental recognition speed."));
    const mistakes = new Map();
    for (const a of rows.filter((a) => a.firstCorrect === false)) {
        const label = `${a.target.degree} → ${a.exercise === "m1" ? a.imaginedWrongDegree : a.firstAnswer}`;
        mistakes.set(label, (mistakes.get(label) ?? 0) + 1);
    }
    const list = el("ul");
    for (const [label, n] of mistakes)
        list.append(el("li", `${label}: ${n}`));
    block.append(el("h2", "Degree confusions"), mistakes.size ? list : el("p", "No recorded first-response confusions."));
    return block;
}
function results(id) {
    const s = sessions.find((s) => s.id === id);
    if (!s) {
        heading("Session not found");
        return;
    }
    heading(s.endedAt ? "Session results" : "Interrupted session - saved attempts");
    host.append(el("p", describe(s.config)), summary(s.attempts, s.config), actions(button("Practice again", () => start({ id: s.presetId, name: "Similar practice", config: s.config }), false), button("Customize", () => {
        activeId = presets.some((p) => p.id === s.presetId)
            ? s.presetId
            : presets[0].id;
        draft = structuredClone(s.config);
        location.hash = "configure";
    }), button("Presets", () => (location.hash = "home"))));
    const review = el("details");
    review.append(el("summary", "Question review"));
    for (const a of s.attempts) {
        const item = el("section");
        item.append(el("h3", `${a.target.chord.symbol} / ${a.target.degree}`), el("p", `${a.gradingSource === "self" ? "Self-rated" : "First answer"}: ${a.firstAnswer ?? "Unassessed"}. Recorded response: ${a.firstResponseMs === null ? "Unavailable" : (a.firstResponseMs / 1000).toFixed(2) + "s"} (${a.timingValidity}, descriptive only). Retries: ${a.retryCount}.`));
        const replay = button("Replay reference", async () => {
            const token = ++operation;
            replay.disabled = true;
            try {
                await audio.ready();
                if (token !== operation || location.hash !== "#results/" + s.id)
                    return;
                audio.playSingle(a.target.chord, a.target.midi, s.config.volume, false);
                a.replaysAfterFirst++;
                a.revealedReference = true;
                persist();
                host
                    .querySelector("section")
                    ?.replaceWith(summary(s.attempts, s.config));
            }
            catch (e) {
                if (token === operation)
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
function insights() {
    heading("Insights");
    const all = sessions.flatMap((s) => s.attempts), groups = [...new Set(all.map(cohort))];
    if (!groups.length) {
        host.append(el("p", "Not enough comparable data. Start an M1 or M2 preset."));
        return;
    }
    if (!groups.includes(selectedCohort))
        selectedCohort = groups[groups.length - 1];
    const labels = groups.map((g, i) => `${i + 1}. ${describe(all.find((a) => cohort(a) === g).configurationSnapshot)} / ${all.find((a) => cohort(a) === g).exposure}`);
    host.append(select("Comparable practice conditions", labels[groups.indexOf(selectedCohort)], labels, (v) => {
        selectedCohort = groups[labels.indexOf(v)];
        rootFilter = "";
        qualityFilter = "";
        render();
    }));
    let rows = all.filter((a) => cohort(a) === selectedCohort);
    host.append(select("Root", rootFilter || "All selected roots", ["All selected roots", ...new Set(rows.map((a) => a.target.chord.root))], (v) => {
        rootFilter = v === "All selected roots" ? "" : v;
        render();
    }), select("Chord quality", qualityFilter || "All selected qualities", [
        "All selected qualities",
        ...new Set(rows.map((a) => a.target.chord.quality)),
    ], (v) => {
        qualityFilter = v === "All selected qualities" ? "" : v;
        render();
    }));
    rows = rows.filter((a) => (!rootFilter || a.target.chord.root === rootFilter) &&
        (!qualityFilter || a.target.chord.quality === qualityFilter));
    if (!rows.length) {
        host.append(el("p", "Not enough comparable data."));
        return;
    }
    host.append(summary(rows, rows[0].configurationSnapshot), el("p", describe(rows[0].configurationSnapshot)), el("p", "Matched exercise, method, chord context, pools, answer policy, exposure and timing version. Small samples are descriptive, not proof of progress or live performance."));
    const table = el("table"), head = el("tr");
    table.append(el("caption", "Chord Quality × Degree"));
    for (const name of [
        "Quality / degree",
        "Correct / assessed",
        "Replay-assisted",
        "Correct median (n)",
        "Practice",
    ])
        head.append(el("th", name));
    table.append(head);
    const cells = [
        ...new Set(rows.map((a) => `${a.target.chord.quality}/${a.target.degree}`)),
    ].map((key) => {
        const items = rows.filter((a) => `${a.target.chord.quality}/${a.target.degree}` === key);
        return { key, items, m: metrics(items) };
    });
    for (const cell of cells) {
        const tr = el("tr"), m = cell.m;
        tr.append(el("td", cell.key), el("td", `${m.correct}/${m.n}`), el("td", `${m.replayed}/${m.n}`), el("td", `${m.median === null ? "—" : (m.median / 1000).toFixed(2) + "s"} (${m.timed})`));
        const td = el("td");
        td.append(button("Customize focus", () => {
            const config = {
                ...structuredClone(cell.items[0].configurationSnapshot),
                qualities: [cell.items[0].target.chord.quality],
                targetMode: "exact",
                targets: [cell.items[0].target.degree],
            };
            let focus = presets.find((p) => !builtins.some((b) => b.id === p.id) &&
                JSON.stringify(p.config) === JSON.stringify(config));
            if (!focus) {
                focus = {
                    id: crypto.randomUUID(),
                    name: `Focus: ${config.exercise.toUpperCase()} ${cell.key}`,
                    config,
                };
                presets.push(focus);
            }
            persist();
            customize(focus);
        }));
        tr.append(td);
        table.append(tr);
    }
    const scroll = el("div", "", "table-scroll");
    scroll.tabIndex = 0;
    scroll.setAttribute("role", "region");
    scroll.setAttribute("aria-label", "Chord quality and degree breakdown");
    scroll.append(table);
    host.append(scroll);
    const supported = cells
        .filter((c) => c.m.n >= 10)
        .sort((a, b) => a.m.correct / a.m.n - b.m.correct / b.m.n);
    host.append(el("p", supported.length > 1
        ? `Descriptive patterns (at least 10 assessed per cell): lowest ${supported[0].key}, highest ${supported[supported.length - 1].key}. Not a statistical confidence claim; compare root and replay exposure before drawing conclusions.`
        : "Not enough comparable data to identify strongest/weakest patterns."));
    const history = el("ul");
    for (const s of sessions.slice().reverse()) {
        const li = el("li"), a = el("a", `${s.startedAt.slice(0, 10)} ${s.config.exercise.toUpperCase()} - ${s.attempts.length} records${s.endedAt ? "" : " (interrupted)"}`);
        a.href = "#results/" + s.id;
        li.append(a);
        history.append(li);
    }
    host.append(el("h2", "Sessions"), history);
}
function render() {
    if (fatal)
        return;
    const route = location.hash.slice(1) || "home";
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
    if (session && route !== "practice") {
        finish();
        return;
    }
    if (!session) {
        cancelAdvance();
        operation++;
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
}
window.addEventListener("hashchange", render);
document.addEventListener("visibilitychange", () => {
    if (document.hidden && current) {
        cancelAdvance();
        operation++;
        busy = false;
        ready = false;
        if (current.firstAnswer === null && !done)
            current.timingValidity = "interrupted";
        audio.stop();
        feedback =
            "Practice interrupted; unsubmitted timing excluded. Retry audio to continue.";
        persist();
        renderPractice();
    }
});
window.addEventListener("pagehide", () => {
    cancelAdvance();
    operation++;
    if (current) {
        if (current.firstAnswer === null && !done)
            current.timingValidity = "interrupted";
        persist();
    }
    audio.stop();
});
window.addEventListener("beforeunload", (e) => {
    if (dirty) {
        e.preventDefault();
        e.returnValue = "";
    }
});
load();
