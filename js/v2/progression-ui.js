import { AudioEngine } from "../jazz/audio.js";
import { parseChord, pitchClass, degrees, } from "../jazz/theory.js";
import { read, write, optionsFor, attempt, builtins, } from "./model.js";
import { defaults, templates, validate, generate, submit, rate, report, sequence, addQualityPools, } from "./progression.js";
const presetKey = "jazzEarLab:v2:progressionPresets", historyKey = "jazzEarLab:v2:progressionHistory";
let retainedRuns = null;
if (typeof window !== "undefined")
    window.addEventListener("beforeunload", (e) => {
        if (retainedRuns) {
            e.preventDefault();
            e.returnValue = "";
        }
    });
export function progressionEvidence() {
    const runs = retainedRuns ?? read(historyKey, []);
    return runs.flatMap((run) => run.questions.flatMap((q) => q.notes.map((n) => {
        const config = {
            ...structuredClone(builtins[0].config),
            exercise: q.config.mode === "singing" ? "m1" : "m2",
            method: "sung",
            roots: [n.chord.root],
            qualities: [n.chord.quality],
            targets: q.config.pools[n.chord.quality] ?? [n.degree],
            targetMode: "exact",
            voiceLevels: q.config.levels,
            volume: q.config.volume,
        };
        const a = attempt(config, {
            id: n.id,
            chord: n.chord,
            degree: n.degree,
            midi: n.midi,
            options: optionsFor(n.chord, n.degree),
            generatorVersion: "v2-progression-1",
        }, run.id, n.exposure ?? "previously-seen");
        return {
            ...a,
            id: n.id,
            exercise: q.config.mode === "singing"
                ? "progression-singing"
                : "progression-recognition",
            timingVersion: "progression-timing-not-recorded",
            progressionContext: JSON.stringify(q.config),
            replayQuestionId: q.id,
            replayEventsBefore: q.before,
            replayEventsAfter: q.after,
            firstCorrect: n.correct,
            firstAnswer: n.answer,
            imaginedWrongDegree: q.config.mode === "singing" && n.correct === false
                ? (n.answer ?? undefined)
                : undefined,
            replaysBeforeFirst: n.assisted ? 1 : 0,
            replaysAfterFirst: 0,
            timingValidity: "unavailable",
        };
    })));
}
export function mountProgression(root, initialMode = "recognition") {
    const host = document.createElement("div");
    host.className = "progression-work";
    const audio = new AudioEngine();
    let token = 0, closed = false, busy = false, heard = false, referenceHeard = false, view = "settings", activeRun = null, question = null, answers = [], frame = 0;
    const presets = read(presetKey, {}), runs = retainedRuns ?? read(historyKey, []);
    let mixOpen = false;
    let config = structuredClone(presets[initialMode] ?? { ...defaults, mode: initialMode }), message = retainedRuns
        ? "Unsaved progression results retained. Retry saving."
        : "";
    const el = (tag, text = "") => {
        const node = document.createElement(tag);
        node.textContent = text;
        return node;
    };
    let dirty = retainedRuns !== null, presetId = initialMode;
    const save = () => {
        retainedRuns = runs;
        dirty = true;
        write(historyKey, runs);
        dirty = false;
        retainedRuns = null;
    };
    const stopAudio = () => {
        token++;
        audio.stop();
        cancelAnimationFrame(frame);
        busy = false;
    };
    const button = (text, action, disabled = false) => {
        const b = el("button", text);
        b.type = "button";
        b.disabled = disabled;
        b.className = [
            "Start practice",
            "Submit all answers",
            "Done — hear full reference",
            "Next question",
            "Finish",
            "Retry saving",
        ].includes(text)
            ? ""
            : "secondary";
        b.onclick = () => {
            Promise.resolve()
                .then(() => {
                if (b.isConnected && !b.disabled)
                    return action();
            })
                .catch((e) => {
                message = String(e.message ?? e);
                render();
            });
        };
        return b;
    };
    const field = (text, value, change, type = "text") => {
        const label = el("label", text), input = el("input");
        input.dataset.control = String(control++);
        input.setAttribute("aria-label", text);
        input.type = type;
        input.value = value;
        input.onchange = () => {
            try {
                change(input.value);
                if (view === "settings") {
                    const valid = validate(config);
                    write(presetKey, { ...presets, [presetId]: valid });
                    presets[presetId] = valid;
                }
                message = "";
            }
            catch (e) {
                message = String(e.message);
            }
            if (type === "number") {
                let status = host.querySelector("#progression-save-status");
                if (!status) {
                    status = el("p");
                    status.id = "progression-save-status";
                    host.prepend(status);
                }
                status.textContent = message || "Changes saved to this preset.";
                status.setAttribute("role", message ? "alert" : "status");
            }
            else
                render();
        };
        label.append(input);
        return label;
    };
    const select = (text, value, values, change) => {
        const label = el("label", text), input = el("select");
        input.dataset.control = String(control++);
        input.setAttribute("aria-label", text);
        for (const v of values) {
            const labels = {
                unknown: "Don’t know",
                recognition: "Recognition",
                singing: "Guided Singing",
                major: "Major ii–V–I",
                minor: "Minor ii–V–i",
                backdoor: "Backdoor",
            };
            const option = el("option", labels[v] ?? v);
            option.value = v;
            input.append(option);
        }
        input.value = value;
        input.onchange = () => {
            try {
                change(input.value);
                message = "";
            }
            catch (e) {
                message = e.message;
            }
            render();
        };
        label.append(input);
        return label;
    };
    function persistConfig() {
        const valid = validate(config);
        write(presetKey, { ...presets, [presetId]: valid });
        presets[presetId] = valid;
    }
    function next() {
        stopAudio();
        question = generate(activeRun.config);
        const seen = new Set(runs.flatMap((run) => run.questions.flatMap((q) => q.notes.map((n) => n.chord.symbol + ":" + n.midi))));
        for (const note of question.notes) {
            const key = note.chord.symbol + ":" + note.midi;
            note.exposure = seen.has(key) ? "previously-seen" : "fresh";
            seen.add(key);
        }
        activeRun.questions.push(question);
        answers = question.notes.map(() => "");
        heard = false;
        referenceHeard = false;
        view = "practice";
        save();
        render();
        void play(false, false);
    }
    async function play(reference, replay) {
        stopAudio();
        const op = token, q = question;
        busy = true;
        message = "";
        render();
        try {
            await audio.ready();
            if (closed || op !== token)
                return;
            const plan = sequence(q, reference || q.config.mode === "recognition");
            const playback = audio.playSequence(plan.events, plan.countIn, plan.duration);
            if (replay &&
                (!reference || q.config.mode === "recognition" || q.referencePlayed)) {
                if (q.submitted || q.done)
                    q.after++;
                else
                    q.before++;
                save();
            }
            const follow = () => {
                if (closed || op !== token)
                    return;
                const index = plan.starts.filter((t) => audio.position >= t).length - 1;
                host
                    .querySelectorAll("[data-chord]")
                    .forEach((node, i) => (node.style.background = i === index ? "var(--signal)" : ""));
                frame = requestAnimationFrame(follow);
            };
            follow();
            const end = await playback.completed;
            if (closed || op !== token)
                return;
            cancelAnimationFrame(frame);
            busy = false;
            if (end === "completed") {
                if (reference) {
                    referenceHeard = true;
                    q.referencePlayed = true;
                    save();
                }
                else
                    heard = true;
            }
            else
                message =
                    "Playback interrupted. Retry the whole progression; answers are retained.";
            render();
        }
        catch (e) {
            if (op === token && !closed) {
                busy = false;
                message = e.message;
                render();
            }
        }
    }
    function finish() {
        stopAudio();
        activeRun.ended = true;
        view = "results";
        save();
        render();
    }
    function summary(questions) {
        const m = report(questions), section = el("section");
        section.append(el("h2", config.mode === "singing"
            ? "Self-rated accuracy"
            : "Recognition accuracy"), el("p", `${m.correct} / ${m.assessed} assessed notes · ${m.unassessed} unassessed`), el("p", `Replay-assisted: ${m.assisted} / ${m.assessed} assessed notes`));
        return section;
    }
    function render() {
        const focused = document.activeElement;
        const key = focused?.dataset.control;
        renderContent();
        host.dataset.view = view;
        const title = host.querySelector("h1");
        const aside = el("aside");
        aside.className = "progression-anchor";
        aside.append(el("h2", view === "settings"
            ? "Harmony & melody"
            : view === "results"
                ? "Practice results"
                : `Question ${activeRun?.questions.length ?? 0} / ${activeRun?.config.count || "Unlimited"}`), el("p", config.mode === "singing"
            ? "Sing the displayed degrees over full accompaniment. Individual self-ratings, not pitch verification."
            : "Listen to the whole progression, then fill the board in any order."), el("p", `${config.bpm} BPM · ${config.notes} notes per chord`));
        const split = el("div");
        split.className = "split-view";
        split.append(aside, host);
        root.replaceChildren(title, split);
        const start = Array.from(host.querySelectorAll("button")).find((b) => b.textContent === "Start practice");
        if (start) {
            start.classList.add("progression-start");
        }
        if (key)
            host
                .querySelector(`[data-control="${key}"]`)
                ?.focus({ preventScroll: true });
    }
    let control = 0;
    function renderContent() {
        control = 0;
        if (closed)
            return;
        host.replaceChildren();
        host.append(el("h1", "Progression " +
            (config.mode === "singing" ? "Guided Singing" : "Recognition")));
        if (message) {
            const error = el("p", message);
            error.setAttribute("role", "alert");
            host.append(error);
            if (dirty)
                host.append(button("Retry saving", () => {
                    save();
                    message = "";
                    render();
                }));
        }
        if (view === "settings") {
            host.append(select("Mode", config.mode, ["recognition", "singing"], (value) => {
                presetId = value;
                config = structuredClone(presets[value] ?? { ...defaults, mode: value });
            }));
            host.append(select("Saved preset", presetId, [...new Set([presetId, ...Object.keys(presets)])], (value) => {
                presetId = value;
                config = structuredClone(presets[value] ?? defaults);
            }), button("Save as new preset", () => {
                const name = prompt("Preset name");
                if (!name?.trim())
                    return;
                const valid = validate(config);
                presetId = config.mode + " / " + name.trim();
                if (presets[presetId])
                    throw Error("That preset name already exists.");
                write(presetKey, { ...presets, [presetId]: valid });
                presets[presetId] = valid;
                render();
            }));
            host.append(el("h2", "Progression"));
            host.append(select("Template", "Custom", ["Custom", "major", "minor", "backdoor"], (value) => {
                if (value !== "Custom") {
                    config.chords = templates[value].map((symbol) => ({ symbol, beats: 4 }));
                    addQualityPools(config);
                    persistConfig();
                }
            }));
            host.append(select("Transpose", "0", [
                "0",
                "-2",
                "-1",
                "1",
                "2",
                "3",
                "4",
                "5",
                "6",
                "7",
                "8",
                "9",
                "10",
                "11",
            ], (value) => {
                const names = [
                    "C",
                    "C#",
                    "D",
                    "Eb",
                    "E",
                    "F",
                    "F#",
                    "G",
                    "Ab",
                    "A",
                    "Bb",
                    "B",
                ];
                config.chords = config.chords.map((row) => {
                    const chord = parseChord(row.symbol);
                    return {
                        ...row,
                        symbol: names[(pitchClass(chord.root) + Number(value) + 12) % 12] +
                            chord.quality,
                    };
                });
                persistConfig();
            }));
            config.chords.forEach((row, i) => {
                const group = el("div");
                group.className = "actions";
                group.append(field(`Chord ${i + 1}`, row.symbol, (value) => {
                    row.symbol = value;
                    addQualityPools(config);
                }), field("Beats", String(row.beats), (value) => (row.beats = Number(value)), "number"), button("Up", () => {
                    [config.chords[i - 1], config.chords[i]] = [
                        config.chords[i],
                        config.chords[i - 1],
                    ];
                    persistConfig();
                    render();
                }, i === 0), button("Remove", () => {
                    config.chords.splice(i, 1);
                    try {
                        persistConfig();
                    }
                    catch (e) {
                        message = e.message;
                    }
                    render();
                }));
                host.append(group);
            });
            host.append(button("Add chord", () => {
                config.chords.push({ symbol: "Cmaj7", beats: 4 });
                addQualityPools(config);
                persistConfig();
                render();
            }));
            host.append(el("h2", "Practice settings"));
            const settings = el("div");
            settings.className = "actions";
            settings.append(field("BPM", String(config.bpm), (value) => (config.bpm = Number(value)), "number"), field("Notes per chord", String(config.notes), (value) => (config.notes = Number(value)), "number"), field("Questions (0 = Unlimited)", String(config.count), (value) => (config.count = Number(value)), "number"));
            host.append(settings, el("p", "One-bar count-in · targets evenly spaced within each chord"));
            host.append(el("h2", "Target pools"));
            for (const quality of [
                ...new Set(config.chords.flatMap((row) => {
                    try {
                        return [parseChord(row.symbol).quality];
                    }
                    catch {
                        return [];
                    }
                })),
            ]) {
                const group = el("fieldset");
                group.append(el("legend", quality));
                const pool = el("div");
                pool.className = "pool";
                for (const degree of degrees) {
                    const label = el("label"), check = el("input");
                    check.dataset.control = String(control++);
                    check.type = "checkbox";
                    check.checked = config.pools[quality]?.includes(degree) ?? false;
                    check.onchange = () => {
                        const values = new Set(config.pools[quality] ?? []);
                        check.checked ? values.add(degree) : values.delete(degree);
                        config.pools[quality] = [...values];
                        try {
                            persistConfig();
                            message = "";
                        }
                        catch (e) {
                            message = e.message;
                        }
                        render();
                    };
                    label.append(check, el("span", degree));
                    pool.append(label);
                }
                group.append(pool);
                host.append(group);
            }
            const mix = el("details");
            mix.open = mixOpen;
            mix.ontoggle = () => {
                if (mix.isConnected)
                    mixOpen = mix.open;
            };
            mix.append(el("summary", "Voicing mix & volume"));
            for (let i = 0; i < 5; i++)
                mix.append(field(`Voice ${i + 1} (%)`, String(config.levels[i] * 100), (value) => (config.levels[i] = Number(value) / 100), "number"));
            mix.append(field("Overall volume (%)", String(config.volume * 100), (value) => (config.volume = Number(value) / 100), "number"));
            host.append(mix);
            host.append(button("Start practice", () => {
                const valid = validate(config);
                activeRun = {
                    id: crypto.randomUUID(),
                    config: valid,
                    questions: [],
                    ended: false,
                };
                runs.push(activeRun);
                next();
            }));
            for (const run of runs.slice().reverse())
                host.append(button(`Results · ${run.config.mode} · ${run.questions.length} questions`, () => {
                    activeRun = run;
                    config = structuredClone(run.config);
                    view = "results";
                    render();
                }));
            return;
        }
        const run = activeRun;
        if (view === "results") {
            host.append(summary(run.questions), el("p", "Each assessed note contributes once to Overall accuracy. Progression speed is excluded from Overall timing."));
            for (const q of run.questions) {
                host.append(el("h2", "Progression " + (run.questions.indexOf(q) + 1)));
                host.append(el("p", `${q.before} pre-check replay events · ${q.after} review events`));
                for (const n of q.notes)
                    host.append(el("p", `${n.occurrence + 1} · ${n.chord.symbol} · note ${n.position + 1} · ${n.degree}: ${n.correct === null ? "Unassessed" : n.correct ? "Correct" : `Incorrect (${n.answer === "unknown" ? "Unknown" : n.answer})`}`));
                host.append(button("Replay whole reference", () => {
                    question = q;
                    return play(true, true);
                }));
            }
            host.append(button("Practice again", () => {
                config = structuredClone(run.config);
                view = "settings";
                render();
            }), button("Overall Insights", () => (location.hash = "insights")));
            return;
        }
        const q = question;
        host.append(el("p", `Question ${run.questions.length} / ${run.config.count || "Unlimited"} · ${busy ? "Playing" : "Ready"}`));
        const chords = el("div");
        chords.className = "actions";
        q.config.chords.forEach((row, i) => {
            const item = el("span", `${i + 1} · ${row.symbol} · ${row.beats} beats`);
            item.dataset.chord = String(i);
            chords.append(item);
        });
        host.append(chords);
        const checked = q.submitted || q.done;
        host.append(button(checked ? "Replay whole reference" : "Replay whole progression", () => play(checked, true), busy), button("Stop", finish));
        if (q.config.mode === "singing" && !q.done)
            host.append(button("Done — hear full reference", () => {
                q.done = true;
                save();
                return play(true, false);
            }, busy || !heard));
        if (q.config.mode === "recognition") {
            for (const n of q.notes) {
                const label = `${n.occurrence + 1} · ${n.chord.symbol} · note ${n.position + 1}`;
                if (!q.submitted) {
                    const control = select(label, answers[q.notes.indexOf(n)], ["", "unknown", ...optionsFor(n.chord, n.degree)], (value) => (answers[q.notes.indexOf(n)] = value));
                    control.querySelector("select").disabled = busy || !heard;
                    host.append(control);
                }
                else
                    host.append(el("p", `${label} · ${n.degree} → ${n.answer === "unknown" ? "Don’t know" : n.answer} · ${n.correct ? "Correct" : "Incorrect"}`));
            }
            if (!q.submitted)
                host.append(button("Submit all answers", () => {
                    submit(q, answers);
                    save();
                    render();
                }, busy || !heard || answers.some((value) => !value)));
        }
        else {
            host.append(el("p", "Individual self-ratings · no microphone verification"));
            q.notes.forEach((n, i) => {
                const row = el("section");
                row.append(el("h3", `${n.occurrence + 1} · ${n.chord.symbol} · note ${n.position + 1} · ${n.degree}`));
                if (referenceHeard) {
                    if (n.correct !== null)
                        row.append(el("p", n.correct ? "Correct" : `Incorrect · ${n.answer}`));
                    else {
                        const actions = el("div");
                        actions.className = "actions";
                        actions.append(button("Correct", () => {
                            rate(q, i, true);
                            save();
                            render();
                        }), button("Incorrect", () => {
                            n.answer = "unknown";
                            save();
                            render();
                        }));
                        if (n.answer !== null)
                            actions.append(select("Degree you sang", n.answer, [
                                "unknown",
                                ...optionsFor(n.chord, n.degree).filter((d) => d !== n.degree),
                            ], (value) => {
                                n.answer = value;
                                save();
                            }), button("Save incorrect rating", () => {
                                rate(q, i, false, n.answer ?? "unknown");
                                save();
                                render();
                            }));
                        row.append(actions, el("p", "Unassessed until rated."));
                    }
                }
                host.append(row);
            });
        }
        if (q.submitted || referenceHeard) {
            host.append(summary([q]));
            host.append(button(run.config.count && run.questions.length >= run.config.count
                ? "Finish"
                : "Next question", () => {
                if (run.config.count && run.questions.length >= run.config.count)
                    finish();
                else
                    next();
            }, busy));
        }
    }
    const hidden = () => {
        if (document.hidden && busy) {
            stopAudio();
            message =
                "Playback interrupted. Replay the whole progression; answers are retained.";
            render();
        }
    };
    document.addEventListener("visibilitychange", hidden);
    render();
    return () => {
        closed = true;
        stopAudio();
        document.removeEventListener("visibilitychange", hidden);
        audio.close();
    };
}
