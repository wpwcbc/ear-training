import { degrees, progressions } from "./theory.js";
import { defaults, generate, keys, loadSessions, saveSession, recommendation, } from "./model.js";
import { AudioEngine } from "./audio.js";
const el = (id) => document.getElementById(id);
const audio = new AudioEngine();
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
let selected = [];
let completedQuestions = new Set();
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
    for (const name of ["free", "path", "history"]) {
        el(name + "-view").hidden = name !== view;
        el(name + "-tab").setAttribute("aria-selected", String(name === view));
    }
    if (view !== "free" && challenge && !paused)
        togglePause();
    renderHistory();
}
function populate() {
    el("degree").replaceChildren(...degrees.map((degree) => new Option(degree, degree)));
    el("progression").replaceChildren(...progressions.map((p) => new Option(p.name, p.id)));
    for (const key of Object.keys(defaults)) {
        const input = el(key);
        if (key === "showChords")
            input.checked = config.showChords;
        else
            input.value = String(config[key]);
    }
    modeUI();
}
function modeUI() {
    el("single-settings").hidden = config.mode !== "m1";
    el("progression-settings").hidden = config.mode === "m1";
    el("path-setting").hidden = config.mode !== "m4";
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
    if (next.low > next.high || next.high - next.low < 11)
        throw new Error("Choose a target range of at least 12 semitones.");
    if (next.bpm < 30 ||
        next.bpm > 240 ||
        next.beats < 1 ||
        next.beats > 8 ||
        !Number.isFinite(next.bpm) ||
        !Number.isFinite(next.beats))
        throw new Error("Tempo must be 30-240 and beats must be 1-8.");
    if (![0, 5, 10, 20].includes(next.count))
        throw new Error("Select a question count.");
    if (!next.showChords && next.context !== "full")
        throw new Error("Root and shell contexts need visible chord symbols. Enable symbols or choose Full chord.");
    if (next.mode === "m3")
        next.context = "full";
    generate(next, 0);
    return next;
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
        !active || !revealed || graded || paused || config.mode === "m3";
    el("choices").hidden = !active || paused || config.mode !== "m3" || revealed;
    el("answer").hidden = !active || !revealed || paused;
    el("pause").textContent = paused ? "Resume" : "Pause";
    el("reveal").textContent =
        config.mode === "m4"
            ? "Hear next chord"
            : config.mode === "m3"
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
    el("phase").textContent = revealed
        ? graded
            ? "GRADED"
            : "REFERENCE"
        : config.mode === "m4"
            ? "ANTICIPATE"
            : config.mode === "m3"
                ? "RECOGNIZE"
                : "AUDIATE";
    if (config.mode === "m1") {
        el("prompt").textContent = `Sing the ${targets[0].degree}`;
        el("instruction").textContent =
            "Imagine it, sing or play it, then reveal the reference.";
    }
    if (config.mode === "m3") {
        el("prompt").textContent = "One pitch. What changes?";
        el("instruction").textContent =
            "Choose the role of the same melody note over each chord.";
    }
    if (config.mode === "m4") {
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
    stopAudio();
    if (config.mode === "m4")
        audio.play([challenge.targets[step - 1]], config, true);
    else
        audio.play(challenge.targets, config, config.mode === "m3");
    const duration = (60 / config.bpm) *
        config.beats *
        (config.mode === "m3" ? challenge.targets.length : 1);
    phaseTimer = window.setTimeout(() => {
        phaseTimer = 0;
        render();
    }, duration * 1000);
    render();
    el("phase").textContent = "ESTABLISH CONTEXT";
}
function renderChoices() {
    const holder = el("choices");
    holder.replaceChildren();
    selected = [];
    if (!challenge || config.mode !== "m3")
        return;
    challenge.targets.forEach((target, i) => {
        const label = document.createElement("label");
        label.textContent = config.showChords
            ? target.chord.symbol
            : `Chord ${i + 1}`;
        const select = document.createElement("select");
        select.setAttribute("aria-label", `Role over chord ${i + 1}`);
        select.append(new Option("Choose degree", ""), ...degrees.filter((d) => d !== "#9").map((d) => new Option(d, d)));
        select.addEventListener("change", () => {
            selected[i] = select.value;
        });
        label.append(select);
        holder.append(label);
    });
}
function newQuestion() {
    stopAudio();
    challenge = generate(config, index);
    step = config.mode === "m4" ? 1 : 0;
    revealed = false;
    graded = false;
    paused = false;
    replays = 0;
    elapsed = 0;
    renderChoices();
    render();
    playContext();
    const duration = (60 / config.bpm) *
        config.beats *
        (config.mode === "m3" ? challenge.targets.length : 1);
    started = performance.now() + duration * 1000;
    el("phase").textContent = "ESTABLISH CONTEXT";
    button("reveal", false);
    status(config.mode === "m4"
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
        await audio.ready();
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
    const targets = config.mode === "m4" ? [challenge.targets[step]] : challenge.targets;
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
    });
    session.totalTime += latency;
    graded = true;
    if (grade !== "skipped" &&
        !completedQuestions.has(index) &&
        (config.mode !== "m4" || step === challenge.targets.length - 1)) {
        session.completedCount++;
        completedQuestions.add(index);
    }
    store();
    render();
    status(source === "automatic"
        ? grade === "correct"
            ? "Correct. Each chord changes the role of this pitch."
            : "Compare your answers with the reference, then retry or continue."
        : `Self-assessment saved: ${grade}.`);
}
async function reveal() {
    if (!challenge || revealed || paused || phaseTimer)
        return;
    if (config.mode === "m3" && challenge.targets.some((_, i) => !selected[i])) {
        status("Choose one degree for each chord first.");
        return;
    }
    await audio.ready();
    stopAudio();
    elapsed += Math.max(0, performance.now() - started) / 1000;
    started = performance.now();
    revealed = true;
    audio.play(config.mode === "m3" ? challenge.targets : [challenge.targets[step]], config, true);
    render();
    if (config.mode === "m3")
        record(challenge.targets.every((t, i) => t.degree === selected[i])
            ? "correct"
            : "missed", "automatic");
    else
        status("Compare with the reference, then choose your self-assessment.");
}
function next() {
    if (!challenge || !graded)
        return;
    if (config.mode === "m4" && step < challenge.targets.length - 1) {
        stopAudio();
        step++;
        revealed = false;
        graded = false;
        replays = 0;
        elapsed = 0;
        started = performance.now();
        render();
        status("Sing the next target; its chord has not played yet.");
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
        if (!revealed)
            elapsed += Math.max(0, performance.now() - started) / 1000;
        stopAudio();
        paused = true;
    }
    else {
        paused = false;
        started = performance.now();
    }
    render();
    status(paused
        ? "Audio stopped. Your challenge is preserved."
        : "Resumed. Replay context when ready.");
}
function resetChallenge() {
    stopAudio();
    challenge = null;
    session = null;
    revealed = false;
    graded = false;
    paused = false;
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
    const self = records.filter((r) => r.gradingSource === "self" && r.grade !== "skipped"), automatic = records.filter((r) => r.gradingSource === "automatic" && r.grade !== "skipped");
    el("history-summary").textContent =
        `${sessions.length} sessions. Self-assessment: ${self.filter((r) => r.grade === "correct").length} correct / ${self.length} ratings. Recognition accuracy: ${automatic.length ? Math.round((100 * automatic.filter((r) => r.grade === "correct").length) / automatic.length) + "%" : "no results"}.`;
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
}
function usePreset(mode, degree = "3") {
    resetChallenge();
    config = { ...config, mode, degree };
    populate();
    store();
    updateViews();
    status("Preset ready. Adjust settings or press Start.");
}
const paths = [
    ["A. Chord landmarks", "Produce 3rds and 7ths across roots.", "m1", "3"],
    ["B. Common tones", "Keep one pitch while the harmony changes.", "m3", "3"],
    ["C. Guided ii-V-I", "Anticipate each next target.", "m4", "3"],
    ["D. Harmonic movement", "Explore the existing progression tools.", null, ""],
    ["E. Modulation", "Further progression training is planned.", null, ""],
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
        action.onclick = () => usePreset(mode, degree);
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
    await audio.ready();
    replays++;
    if (revealed && challenge) {
        stopAudio();
        audio.play(config.mode === "m3" ? challenge.targets : [challenge.targets[step]], config, true);
    }
    else
        playContext();
});
el("pause").onclick = togglePause;
el("next").onclick = safe(next);
el("skip").onclick = safe(() => {
    record("skipped", config.mode === "m3" ? "automatic" : "self");
    next();
});
el("retry").onclick = safe(() => {
    if (!challenge)
        return;
    stopAudio();
    revealed = false;
    graded = false;
    replays++;
    elapsed = 0;
    started = performance.now();
    renderChoices();
    render();
    playContext();
});
document.querySelectorAll("[data-grade]").forEach((btn) => {
    btn.onclick = () => record(btn.dataset.grade, "self");
});
for (const view of ["free", "path", "history"])
    el(view + "-tab").onclick = () => updateViews(view);
el("recommended-start").onclick = () => {
    const rec = recommendation(loadSessions(localStorage));
    usePreset(rec.mode, rec.degree);
};
el("settings").onchange = () => {
    resetChallenge();
    try {
        const next = readConfig();
        config = next;
        modeUI();
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
