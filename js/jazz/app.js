import { degrees, recognitionDegrees } from "./theory.js";
import { progressionBank, parseProgression } from "./progressions.js";
import { skillStats, confusions } from "./insights.js";
import { defaults, generate, keys, loadSessions, saveSession, recommendation, loadProgressions, validateConfig, isRecognition, isSequential, } from "./model.js";
import { AudioEngine } from "./audio.js";
const el = (id) => document.getElementById(id);
const audio = new AudioEngine();
let customs = loadProgressions(localStorage);
let config = { ...defaults };
try {
    const saved = JSON.parse(localStorage.getItem(keys.config) || "null");
    if (saved && typeof saved === "object")
        config = { ...defaults, ...saved };
}
catch { }
let challenge = null, session = null;
let step = 0, index = 0, replays = 0, started = 0, elapsed = 0;
let revealed = false, graded = false, paused = false, busy = false;
let phaseTimer = 0;
let predictionTimer = 0, visualFrame = 0, predictionDeadline = 0, predictionRemaining = 0;
let contextPending = false, operation = 0;
let selected = [];
let completedQuestions = new Set();
let referenceSeen = false, referenceAssisted = false;
const status = (text) => {
    el("status").textContent = text;
};
const button = (id, enabled) => {
    el(id).disabled = !enabled;
};
function stopAudio() {
    audio.stop();
    window.clearTimeout(phaseTimer);
    phaseTimer = 0;
    window.clearInterval(predictionTimer);
    predictionTimer = 0;
    window.cancelAnimationFrame(visualFrame);
    visualFrame = 0;
    el("countdown").textContent = "";
}
function armPrediction(seconds = config.mode === "m5"
    ? (config.gapBeats * 60) / config.bpm
    : config.predictionSeconds) {
    if (!challenge ||
        revealed ||
        paused ||
        !isSequential(config) ||
        config.revealMode !== "timed")
        return;
    predictionRemaining = seconds;
    predictionDeadline = performance.now() + seconds * 1000;
    const update = () => {
        predictionRemaining = Math.max(0, (predictionDeadline - performance.now()) / 1000);
        el("countdown").textContent =
            `Next chord in ${predictionRemaining.toFixed(1)}s`;
        if (predictionRemaining <= 0) {
            window.clearInterval(predictionTimer);
            predictionTimer = 0;
            safe(reveal)();
        }
    };
    predictionTimer = window.setInterval(update, 50);
    update();
}
function followAudio(offset = 0) {
    const update = () => {
        const position = audio.position;
        const event = audio.plan.events.find((e) => position >= e.start && position < e.start + e.duration);
        el("chart")
            .querySelectorAll("span")
            .forEach((span, i) => span.classList.toggle("active", !!event && i === event.index + offset));
        if (position < audio.plan.duration)
            visualFrame = requestAnimationFrame(update);
    };
    visualFrame = requestAnimationFrame(update);
}
function store() {
    try {
        localStorage.setItem(keys.config, JSON.stringify(config));
        if (session)
            saveSession(localStorage, session);
    }
    catch {
        status("Browser storage is unavailable or full. This session may not survive a refresh.");
    }
}
function updateViews(view = "free") {
    for (const name of ["free", "path", "history", "insights"]) {
        el(name + "-view").hidden = name !== view;
        el(name + "-tab").setAttribute("aria-selected", String(name === view));
    }
    if (view !== "free" && challenge && !paused)
        togglePause();
    renderHistory();
}
function populate() {
    el("degree").replaceChildren(...degrees.map((degree) => new Option(degree, degree)));
    el("progression").replaceChildren(...[...progressionBank, ...customs].map((p) => new Option(p.name, p.id)));
    for (const key of Object.keys(defaults)) {
        const input = el(key);
        if (key === "showChords")
            input.checked = config.showChords;
        else
            input.value = String(config[key]);
    }
    modeUI();
    editorUI();
}
function modeUI() {
    const single = config.mode === "m1" || config.mode === "m2";
    el("single-settings").hidden = !single;
    el("degree-setting").hidden = config.mode !== "m1";
    el("recognition-setting").hidden = config.mode !== "m2";
    el("progression-settings").hidden = single;
    el("sequence-settings").hidden = single;
    el("path-setting").hidden = !isSequential(config);
    el("common-mode-setting").hidden = config.mode !== "m3";
    el("reveal-mode-setting").hidden = !isSequential(config);
    el("prediction-setting").hidden = config.mode !== "m4";
    el("gap-setting").hidden = config.mode !== "m5";
    el("custom-editor").hidden = single;
    el("recognize").hidden = config.mode !== "m1";
    el("context").disabled = config.mode === "m3";
}
function readConfig() {
    const next = { ...config };
    for (const key of Object.keys(defaults)) {
        const input = el(key);
        const value = key === "showChords"
            ? input.checked
            : typeof defaults[key] === "number"
                ? Number(input.value)
                : input.value;
        next[key] = value;
    }
    return validateConfig(next, customs);
}
function render() {
    const active = !!challenge;
    button("start", !busy);
    el("start").textContent = active ? "Restart session" : "Start";
    button("pause", active);
    button("retry", active && !paused);
    button("skip", active && !paused);
    button("replay", active && !paused);
    button("reveal", active && !paused && !revealed && !phaseTimer);
    button("next", active && !paused && graded);
    el("grading").hidden =
        !active || !revealed || graded || paused || isRecognition(config);
    el("choices").hidden =
        !active || paused || !isRecognition(config) || revealed;
    el("answer").hidden = !active || !revealed || paused;
    el("pause").textContent = paused ? "Resume" : "Pause";
    el("reveal").textContent = isSequential(config)
        ? "Hear next chord"
        : isRecognition(config)
            ? "Check answers"
            : "Reveal";
    if (!challenge)
        return;
    const targets = challenge.targets;
    const chart = el("chart");
    chart.replaceChildren();
    targets.forEach((target, i) => {
        const span = document.createElement("span");
        span.textContent = config.showChords
            ? target.chord.symbol
            : `Chord ${i + 1}`;
        span.className = i === step ? "active" : "";
        chart.append(span);
    });
    el("session-count").textContent =
        `Question ${index + 1}${config.count ? " / " + config.count : ""}`;
    if (paused) {
        el("phase").textContent = "PAUSED";
        el("prompt").textContent = "Practice paused";
        return;
    }
    el("phase").textContent = contextPending
        ? "ESTABLISH CONTEXT"
        : revealed
            ? graded
                ? "GRADED"
                : "REFERENCE"
            : isSequential(config)
                ? "ANTICIPATE"
                : isRecognition(config)
                    ? "RECOGNIZE"
                    : "AUDIATE";
    if (config.mode === "m1") {
        el("prompt").textContent = `Sing the ${targets[0].degree}`;
        el("instruction").textContent =
            "Imagine it, sing or play it, then reveal the reference.";
    }
    if (config.mode === "m3") {
        el("prompt").textContent = isRecognition(config)
            ? "One pitch. What changes?"
            : "Keep the same pitch through the changes";
        el("instruction").textContent = isRecognition(config)
            ? "Choose the role of the same melody note over each chord."
            : "Hear the starting pitch once, then hold it yourself over the chords. Reveal to compare.";
    }
    if (config.mode === "m2") {
        el("prompt").textContent = "Name the note's chord degree";
        el("instruction").textContent =
            "Listen to the chord and melody. Choose the melody's role in this chord.";
    }
    if (isSequential(config)) {
        el("prompt").textContent =
            `${config.showChords ? targets[step].chord.symbol : "Next chord"}: sing the ${targets[step].degree}`;
        el("instruction").textContent =
            `From ${targets[step - 1].chord.symbol}: ${targets[step - 1].name}. Sing the next target before hearing its chord.`;
    }
    if (revealed)
        el("answer").textContent =
            (config.mode === "m3" ? targets : [targets[step]])
                .map((t) => `${t.name} = ${t.degree} over ${t.chord.symbol}`)
                .join(" / ") +
                (config.mode === "m3" && targets.some((t) => t.degree === "11")
                    ? ". The 11 is a tension; its treatment depends on context."
                    : "");
}
function playContext() {
    if (!challenge)
        return;
    if (!revealed && !contextPending)
        elapsed += Math.max(0, performance.now() - started) / 1000;
    stopAudio();
    contextPending = true;
    const targets = isSequential(config)
        ? [challenge.targets[step - 1]]
        : challenge.targets;
    const duration = audio.play(targets, config, isSequential(config) || isRecognition(config), false, {
        countIn: config.countIn,
        repeats: config.mode === "m3" ? config.repeats : 1,
        seed: config.mode === "m3" && !isRecognition(config),
    });
    phaseTimer = window.setTimeout(() => {
        phaseTimer = 0;
        contextPending = false;
        started = performance.now();
        render();
        armPrediction();
    }, duration * 1000);
    render();
    followAudio(isSequential(config) ? step - 1 : 0);
    el("phase").textContent = "ESTABLISH CONTEXT";
}
function renderChoices() {
    const holder = el("choices");
    holder.replaceChildren();
    selected = [];
    if (!challenge || !isRecognition(config))
        return;
    challenge.targets.forEach((target, i) => {
        const label = document.createElement("label");
        label.textContent = config.showChords
            ? target.chord.symbol
            : `Chord ${i + 1}`;
        const select = document.createElement("select");
        select.setAttribute("aria-label", `Role over chord ${i + 1}`);
        select.append(new Option("Choose degree", ""), ...recognitionDegrees(target.chord).map((d) => new Option(d, d)));
        select.addEventListener("change", () => {
            selected[i] = select.value;
        });
        label.append(select);
        holder.append(label);
    });
}
function newQuestion() {
    stopAudio();
    challenge = generate(config, index, customs);
    step = isSequential(config) ? 1 : 0;
    revealed = false;
    graded = false;
    paused = false;
    replays = 0;
    elapsed = 0;
    referenceSeen = false;
    referenceAssisted = false;
    contextPending = true;
    started = performance.now();
    renderChoices();
    render();
    playContext();
    el("phase").textContent = "ESTABLISH CONTEXT";
    button("reveal", false);
    status(isSequential(config)
        ? "The next chord is held until you request it."
        : "Listen, then respond when ready.");
}
async function start() {
    if (busy)
        return;
    busy = true;
    button("start", false);
    try {
        const next = readConfig();
        const currentOperation = ++operation;
        await audio.ready();
        if (currentOperation !== operation)
            return;
        config = next;
        index = 0;
        completedQuestions = new Set();
        session = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            mode: config.mode,
            config: { ...config },
            questionCount: config.count,
            totalTime: 0,
            completedCount: 0,
            records: [],
        };
        newQuestion();
        store();
    }
    catch (error) {
        status(error.message);
    }
    finally {
        busy = false;
        render();
    }
}
function record(grade, source) {
    if (!challenge || !session || graded)
        return;
    const targets = isSequential(config)
        ? [challenge.targets[step]]
        : challenge.targets;
    const latency = elapsed + (revealed ? 0 : Math.max(0, performance.now() - started) / 1000);
    session.records.push({
        timestamp: new Date().toISOString(),
        mode: config.mode,
        config: { ...config },
        chords: targets.map((t) => t.chord.symbol),
        targets: targets.map((t) => t.degree),
        actualNotes: targets.map((t) => t.name),
        progressionId: challenge.progressionId,
        responseLatency: latency,
        gradingSource: source,
        grade,
        replayCount: replays,
        ...(source === "automatic" ? { selectedDegrees: [...selected] } : {}),
        referenceAssisted,
    });
    session.totalTime += latency;
    graded = true;
    if (grade !== "skipped" &&
        !completedQuestions.has(index) &&
        (!isSequential(config) || step === challenge.targets.length - 1)) {
        session.completedCount++;
        completedQuestions.add(index);
    }
    store();
    render();
    status(source === "automatic"
        ? grade === "correct"
            ? "Correct. Compare the target with its harmonic context."
            : "Compare your answers with the reference, then retry or continue."
        : `Self-assessment saved: ${grade}.`);
}
async function reveal() {
    if (!challenge || revealed || paused || phaseTimer)
        return;
    if (isRecognition(config) && challenge.targets.some((_, i) => !selected[i])) {
        status("Choose one degree for each chord first.");
        return;
    }
    const currentChallenge = challenge;
    await audio.ready();
    if (challenge !== currentChallenge || paused || revealed)
        return;
    stopAudio();
    elapsed += Math.max(0, performance.now() - started) / 1000;
    started = performance.now();
    revealed = true;
    referenceSeen = true;
    audio.play(config.mode === "m3" ? challenge.targets : [challenge.targets[step]], config, true);
    render();
    followAudio(config.mode === "m3" ? 0 : step);
    if (isRecognition(config))
        record(challenge.targets.every((t, i) => t.degree === selected[i])
            ? "correct"
            : "missed", "automatic");
    else
        status("Compare with the reference, then choose your self-assessment.");
}
function next() {
    if (!challenge || !graded)
        return;
    if (isSequential(config) && step < challenge.targets.length - 1) {
        stopAudio();
        step++;
        revealed = false;
        graded = false;
        replays = 0;
        elapsed = 0;
        referenceSeen = false;
        referenceAssisted = false;
        started = performance.now();
        render();
        status("Sing the next target; its chord has not played yet.");
        armPrediction();
        return;
    }
    index++;
    if (config.count && index >= config.count) {
        stopAudio();
        challenge = null;
        render();
        el("chart").replaceChildren();
        el("choices").replaceChildren();
        el("phase").textContent = "SESSION COMPLETE";
        el("prompt").textContent = "Practice complete";
        el("instruction").textContent =
            "Review your session or start another practice.";
        el("session-count").textContent = `${session?.completedCount} completed`;
        store();
        renderHistory();
        return;
    }
    newQuestion();
}
function togglePause() {
    if (!challenge)
        return;
    if (!paused) {
        if (!revealed && !contextPending)
            elapsed += Math.max(0, performance.now() - started) / 1000;
        if (predictionTimer)
            predictionRemaining = Math.max(0, (predictionDeadline - performance.now()) / 1000);
        stopAudio();
        paused = true;
    }
    else {
        paused = false;
        started = performance.now();
        if (contextPending)
            playContext();
        else if (!revealed)
            armPrediction(predictionRemaining);
    }
    render();
    status(paused
        ? "Audio stopped. Your challenge is preserved."
        : "Resumed. Replay context when ready.");
}
function resetChallenge() {
    operation++;
    stopAudio();
    challenge = null;
    session = null;
    revealed = false;
    graded = false;
    paused = false;
    contextPending = false;
    predictionRemaining = 0;
    el("chart").replaceChildren();
    el("choices").replaceChildren();
    el("answer").hidden = true;
    el("prompt").textContent = "Hear the harmony. Imagine the target.";
    el("phase").textContent = "READY";
    el("session-count").textContent = "No active session";
    render();
}
function renderHistory() {
    const sessions = loadSessions(localStorage), records = sessions.flatMap((s) => s.records);
    const self = records.filter((r) => r.gradingSource === "self" &&
        r.grade !== "skipped" &&
        !r.referenceAssisted), automatic = records.filter((r) => r.gradingSource === "automatic" &&
        r.grade !== "skipped" &&
        !r.referenceAssisted);
    el("history-summary").textContent =
        `${sessions.length} sessions. Self-assessment: ${self.filter((r) => r.grade === "correct").length} correct / ${self.length} ratings. Recognition question accuracy: ${automatic.length ? Math.round((100 * automatic.filter((r) => r.grade === "correct").length) / automatic.length) + "%" : "no results"}. Reference-assisted retries: ${records.filter((r) => r.referenceAssisted).length}.`;
    const list = el("history-list");
    list.replaceChildren();
    sessions
        .slice()
        .reverse()
        .forEach((s) => {
        const row = document.createElement("article");
        row.className = "session-row";
        const title = document.createElement("strong");
        title.textContent = `${s.mode.toUpperCase()} / ${new Date(s.timestamp).toLocaleString()}`;
        const detail = document.createElement("p");
        detail.textContent = `${s.completedCount} completed / ${s.records.length} assessments / ${s.totalTime.toFixed(1)}s response time`;
        row.append(title, detail);
        list.append(row);
    });
    el("recommendation").textContent = recommendation(sessions).text;
    renderInsights(sessions);
}
function renderInsights(sessions) {
    const grouping = el("insight-group").value;
    const stats = skillStats(sessions, grouping);
    const name = (id) => [...progressionBank, ...customs].find((p) => p.id === id)?.name ?? id;
    renderTable("skill-stats", [
        "Skill",
        "Assessment",
        "Results",
        "Mean question response",
        "Mean replays",
    ], stats.map((s) => [
        grouping === "progression" ? name(s.label) : s.label,
        s.source === "self" ? "Self-assessment" : "Recognition",
        s.source === "self"
            ? `${s.correct} correct / ${s.close} close / ${s.missed} missed`
            : `${s.correct}/${s.count} (${Math.round((s.correct / s.count) * 100)}%)`,
        `${(s.time / s.count).toFixed(2)}s`,
        (s.replays / s.count).toFixed(1),
    ]));
    renderTable("confusions", ["Expected", "Selected", "Count"], confusions(sessions.flatMap((s) => s.records)).map((row) => [
        row.expected,
        row.selected,
        String(row.count),
    ]));
}
function renderTable(id, headers, rows) {
    const holder = el(id);
    holder.replaceChildren();
    if (!rows.length) {
        const p = document.createElement("p");
        p.textContent = "No results yet.";
        holder.append(p);
        return;
    }
    const table = document.createElement("table"), head = document.createElement("thead"), tr = document.createElement("tr");
    headers.forEach((text) => {
        const th = document.createElement("th");
        th.scope = "col";
        th.textContent = text;
        tr.append(th);
    });
    head.append(tr);
    table.append(head);
    const body = document.createElement("tbody");
    rows.forEach((row) => {
        const tr = document.createElement("tr");
        row.forEach((text) => {
            const td = document.createElement("td");
            td.textContent = text;
            tr.append(td);
        });
        body.append(tr);
    });
    table.append(body);
    holder.append(table);
}
function editorUI() {
    const progression = customs.find((p) => p.id === config.progression);
    button("custom-delete", !!progression);
    el("custom-save").textContent = progression
        ? "Update progression"
        : "Save progression";
    if (progression) {
        el("custom-name").value = progression.name;
        el("custom-score").value = progression.chords
            .map((chord, i) => `${chord} ${progression.beats?.[i] ?? 4}`)
            .join("\n");
    }
}
function usePreset(mode, degree = "3", preset = {}) {
    resetChallenge();
    config = { ...defaults, ...preset, mode, degree };
    if (![...progressionBank, ...customs].some((p) => p.id === config.progression))
        config.progression = defaults.progression;
    populate();
    store();
    updateViews();
    status("Preset ready. Adjust settings or press Start.");
}
const paths = [
    ["A. Chord landmarks", "Produce 3rds and 7ths across roots.", "m1", "3"],
    ["B. Common tones", "Keep one pitch while the harmony changes.", "m3", "3"],
    ["C. Guided ii-V-I", "Anticipate each next target.", "m4", "3"],
    [
        "D. Harmonic movement",
        "Anticipate a continuous progression with clear harmonic rhythm.",
        "m5",
        "3",
    ],
    [
        "E. Modulation",
        "Hear local targets across three tonal centers.",
        "m5",
        "3",
    ],
    ["F. Jazz language", "Phrase and bass mapping modes are planned.", null, ""],
];
paths.forEach(([title, description, mode, degree]) => {
    const row = document.createElement("article");
    row.className = "path-row";
    const text = document.createElement("div"), heading = document.createElement("strong"), body = document.createElement("p");
    heading.textContent = title;
    body.textContent = description;
    text.append(heading, body);
    row.append(text);
    if (mode) {
        const action = document.createElement("button");
        action.textContent = "Practice";
        action.onclick = () => usePreset(mode, degree, title.startsWith("E")
            ? { progression: "giant-centers", path: "nearest" }
            : {});
        row.append(action);
    }
    else if (title.startsWith("D")) {
        const link = document.createElement("a");
        link.href = "../drone/";
        link.textContent = "Open drone";
        row.append(link);
    }
    el("path-list").append(row);
});
function safe(action) {
    return async () => {
        try {
            await action();
        }
        catch (error) {
            stopAudio();
            status(error.message);
        }
    };
}
el("start").onclick = safe(start);
el("reveal").onclick = safe(reveal);
el("replay").onclick = safe(async () => {
    const currentChallenge = challenge;
    await audio.ready();
    if (challenge !== currentChallenge || paused || !challenge)
        return;
    replays++;
    if (revealed && challenge) {
        stopAudio();
        audio.play(config.mode === "m3" ? challenge.targets : [challenge.targets[step]], config, true);
        followAudio(config.mode === "m3" ? 0 : step);
    }
    else
        playContext();
});
el("pause").onclick = togglePause;
el("next").onclick = safe(next);
el("skip").onclick = safe(() => {
    record("skipped", isRecognition(config) ? "automatic" : "self");
    next();
});
el("retry").onclick = safe(() => {
    if (!challenge)
        return;
    stopAudio();
    if (referenceSeen)
        referenceAssisted = true;
    revealed = false;
    graded = false;
    replays++;
    elapsed = 0;
    started = performance.now();
    contextPending = true;
    renderChoices();
    render();
    playContext();
});
document.querySelectorAll("[data-grade]").forEach((btn) => {
    btn.onclick = () => record(btn.dataset.grade, "self");
});
for (const view of ["free", "path", "history", "insights"])
    el(view + "-tab").onclick = () => updateViews(view);
el("recommended-start").onclick = () => {
    const rec = recommendation(loadSessions(localStorage));
    usePreset(rec.mode, rec.degree, rec.config);
};
el("insight-group").onchange = () => renderInsights(loadSessions(localStorage));
el("custom-form").onsubmit = (event) => {
    event.preventDefault();
    try {
        const existing = customs.find((p) => p.id === config.progression);
        const progression = parseProgression(el("custom-score").value, el("custom-name").value, existing?.id ?? "custom-" + crypto.randomUUID());
        const updated = [
            ...customs.filter((p) => p.id !== progression.id),
            progression,
        ];
        localStorage.setItem(keys.progressions, JSON.stringify(updated));
        resetChallenge();
        customs = updated;
        config.progression = progression.id;
        config.path = "nearest";
        config.span = 0;
        populate();
        store();
        el("custom-status").textContent = "Progression saved.";
    }
    catch (error) {
        el("custom-status").textContent = error.message;
    }
};
el("custom-new").onclick = () => {
    resetChallenge();
    config.progression = defaults.progression;
    populate();
    store();
    el("custom-name").value = "My progression";
    el("custom-score").value = "Dm7 4\nG7 4\nCmaj7 8";
    el("custom-status").textContent = "New progression ready to edit.";
};
el("custom-delete").onclick = () => {
    try {
        const updated = customs.filter((p) => p.id !== config.progression);
        localStorage.setItem(keys.progressions, JSON.stringify(updated));
        resetChallenge();
        customs = updated;
        config.progression = defaults.progression;
        populate();
        store();
        el("custom-status").textContent =
            "Progression deleted. Saved session results are preserved.";
    }
    catch (error) {
        el("custom-status").textContent = error.message;
    }
};
el("settings").onchange = () => {
    resetChallenge();
    try {
        const next = readConfig();
        config = next;
        modeUI();
        editorUI();
        store();
        status("Settings saved. Press Start for a new session.");
    }
    catch (error) {
        status(error.message);
    }
};
el("settings").onsubmit = (event) => event.preventDefault();
el("mode").onchange = () => {
    resetChallenge();
    config.mode = el("mode").value;
    modeUI();
    store();
};
document.addEventListener("visibilitychange", () => {
    if (document.hidden && challenge && !paused)
        togglePause();
});
window.addEventListener("pagehide", () => {
    stopAudio();
    store();
});
document.addEventListener("keydown", (event) => {
    if (event.target.matches("input,select,textarea,button,a") ||
        event.repeat)
        return;
    const id = event.key.toLowerCase() === "r"
        ? "replay"
        : event.key === " "
            ? "reveal"
            : event.key.toLowerCase() === "n"
                ? "next"
                : event.key.toLowerCase() === "p"
                    ? "pause"
                    : "";
    if (id && !el(id).disabled) {
        event.preventDefault();
        el(id).click();
    }
});
populate();
render();
renderHistory();
