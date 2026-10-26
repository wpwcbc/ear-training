import { AudioEngine } from "../jazz/audio.js";
import {
  parseChord,
  pitchClass,
  degrees,
  chordToneDegrees,
} from "../jazz/theory.js";
import {
  read,
  write,
  optionsFor,
  attempt,
  builtins,
  type Attempt,
} from "./model.js";
import {
  defaults,
  templates,
  validate,
  generate,
  submit,
  rate,
  report,
  sequence,
  addQualityPools,
  type ProgressionConfig,
  type ProgressionQuestion,
} from "./progression.js";
interface Run {
  id: string;
  config: ProgressionConfig;
  questions: ProgressionQuestion[];
  ended: boolean;
}
const presetKey = "jazzEarLab:v2:progressionPresets",
  historyKey = "jazzEarLab:v2:progressionHistory";
let retainedRuns: Run[] | null = null;
if (typeof window !== "undefined")
  window.addEventListener("beforeunload", (e) => {
    if (retainedRuns) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
export function progressionEvidence(): Attempt[] {
  const runs = retainedRuns ?? read<Run[]>(historyKey, []);
  return runs.flatMap((run) =>
    run.questions.flatMap((q) =>
      q.notes.map((n) => {
        const config = {
          ...structuredClone(builtins[0].config),
          exercise:
            q.config.mode === "singing" ? ("m1" as const) : ("m2" as const),
          method: "sung" as const,
          roots: [n.chord.root],
          qualities: [n.chord.quality],
          targets: q.config.pools[n.chord.quality] ?? [n.degree],
          targetMode: "exact" as const,
          voiceLevels: q.config.levels,
          volume: q.config.volume,
        };
        const a = attempt(
          config,
          {
            id: n.id,
            chord: n.chord,
            degree: n.degree,
            midi: n.midi,
            options: optionsFor(n.chord, n.degree),
            generatorVersion: "v2-progression-1",
          },
          run.id,
          n.exposure ?? "previously-seen",
        );
        return {
          ...a,
          id: n.id,
          exercise:
            q.config.mode === "singing"
              ? "progression-singing"
              : "progression-recognition",
          timingVersion: "progression-timing-not-recorded",
          progressionContext: JSON.stringify(q.config),
          replayQuestionId: q.id,
          replayEventsBefore: q.before,
          replayEventsAfter: q.after,
          firstCorrect: n.correct,
          firstAnswer: n.answer,
          imaginedWrongDegree:
            q.config.mode === "singing" && n.correct === false
              ? (n.answer ?? undefined)
              : undefined,
          replaysBeforeFirst: n.assisted ? 1 : 0,
          replaysAfterFirst: 0,
          timingValidity: "unavailable" as const,
        };
      }),
    ),
  ) as Attempt[];
}
export function progressionSessions() {
  return (retainedRuns ?? read<Run[]>(historyKey, [])).map((run) => ({
    id: run.id,
    startedAt: run.questions[0]?.created ?? "",
    label: run.config.mode === "singing" ? "Guided Singing" : "Progression Recognition",
    count: run.questions.length,
    ended: run.ended,
    href: `#progression/${run.config.mode}/results/${encodeURIComponent(run.id)}`,
  }));
}
export function progressionConditions(context: string): string {
  try {
    const c = validate(JSON.parse(context) as ProgressionConfig);
    const pools = Object.entries(c.pools).map(([quality, pool]) => `${quality}: ${pool!.join(", ")}`).join("; ");
    return `${c.mode === "singing" ? "Guided Singing" : "Progression Recognition"} · ${c.chords.map(row => `${row.symbol} (${row.beats} beats)`).join(" → ")} · ${c.bpm} BPM · ${c.notes} ${c.notes === 1 ? "note" : "notes"} per chord · Targets: ${pools} · Voice mix: ${c.levels.map(level => Math.round(level * 100) + "%").join(", ")} · Volume: ${Math.round(c.volume * 100)}% · Progression timing unavailable`;
  } catch {
    return "Progression · stored conditions unavailable";
  }
}
export function mountProgression(
  root: HTMLElement,
  initialMode: "recognition" | "singing" = "recognition",
  autoStart = false,
  resultId?: string,
) {
  const host = document.createElement("div");
  host.className = "progression-work";
  const audio = new AudioEngine();
  let token = 0,
    closed = false,
    busy = false,
    heard = false,
    referenceHeard = false,
    view: "settings" | "practice" | "results" = "settings",
    activeRun: Run | null = null,
    question: ProgressionQuestion | null = null,
    answers: string[] = [],
    frame = 0;
  const presets = read<Record<string, ProgressionConfig>>(presetKey, {}),
    runs = retainedRuns ?? read<Run[]>(historyKey, []);
  let mixOpen = false,
    settingsStep = "Harmony";
  const buttonCounts = new Map<string, number>();
  let ratingFocus = false, feedback = "";
  let config = structuredClone(
      presets[initialMode] ?? { ...defaults, mode: initialMode },
    ),
    message = retainedRuns
      ? "Unsaved progression results retained. Retry saving."
      : "";
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text = "") => {
    const node = document.createElement(tag);
    node.textContent = text;
    return node;
  };
  let dirty = retainedRuns !== null,
    presetId: string = initialMode;
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
  const button = (text: string, action: () => unknown, disabled = false) => {
    const b = el("button", text);
    b.type = "button";
    const occurrence = buttonCounts.get(text) ?? 0;
    buttonCounts.set(text, occurrence + 1);
    b.dataset.control = `button:${text}:${occurrence}`;
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
          if (b.isConnected && !b.disabled) return action();
        })
        .catch((e) => {
          message = String(e.message ?? e);
          render();
        });
    };
    return b;
  };
  const field = (
    text: string,
    value: string,
    change: (value: string) => void,
    type = "text",
  ) => {
    const label = el("label", text),
      input = el("input");
    input.dataset.control = String(control++);
    input.setAttribute("aria-label", text);
    input.type = type;
    input.value = value;
    if (type === "range") {
      label.className = "voice-control";
      input.min = "0";
      input.max = text.startsWith("Voice") ? "200" : "100";
      input.step = "5";
      const output = el("output", value + "%");
      input.oninput = () => (output.textContent = input.value + "%");
      label.append(output);
    }
    input.onchange = () => {
      try {
        change(input.value);
        if (view === "settings") {
          const valid = validate(config);
          write(presetKey, { ...presets, [presetId]: valid });
          presets[presetId] = valid;
        }
        message = "";
      } catch (e) {
        message = String((e as Error).message);
      }
      if (type === "number" || type === "range") {
        let status = host.querySelector<HTMLElement>(
          "#progression-save-status",
        );
        if (!status) {
          status = el("p");
          status.id = "progression-save-status";
          host.prepend(status);
        }
        status.textContent = message || "Changes saved to this preset.";
        status.setAttribute("role", message ? "alert" : "status");
      } else render();
    };
    if (type === "range")
      label.insertBefore(input, label.querySelector("output"));
    else label.append(input);
    return label;
  };
  const select = (
    text: string,
    value: string,
    values: string[],
    change: (value: string) => void,
  ) => {
    const label = el("label", text),
      input = el("select");
    input.dataset.control = String(control++);
    input.setAttribute("aria-label", text);
    for (const v of values) {
      const labels: Record<string, string> = {
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
      } catch (e) {
        message = (e as Error).message;
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
  function startPractice() {
    const valid = validate(config);
    activeRun = {
      id: crypto.randomUUID(),
      config: valid,
      questions: [],
      ended: false,
    };
    runs.push(activeRun);
    next();
  }
  function next() {
    stopAudio();
    question = generate(activeRun!.config);
    const seen = new Set(
      runs.flatMap((run) =>
        run.questions.flatMap((q) =>
          q.notes.map((n) => n.chord.symbol + ":" + n.midi),
        ),
      ),
    );
    for (const note of question.notes) {
      const key = note.chord.symbol + ":" + note.midi;
      note.exposure = seen.has(key) ? "previously-seen" : "fresh";
      seen.add(key);
    }
    activeRun!.questions.push(question);
    answers = question.notes.map(() => "");
    heard = false;
    referenceHeard = false;
    feedback = "";
    ratingFocus = false;
    view = "practice";
    save();
    render();
    void play(false, false);
  }
  async function play(reference: boolean, replay: boolean) {
    stopAudio();
    const op = token,
      q = question!;
    busy = true;
    message = "";
    render();
    try {
      await audio.ready();
      if (closed || op !== token) return;
      const plan = sequence(q, reference || q.config.mode === "recognition");
      const playback = audio.playSequence(
        plan.events,
        plan.countIn,
        plan.duration,
      );
      if (
        replay &&
        (!reference || q.config.mode === "recognition" || q.referencePlayed)
      ) {
        if (q.submitted || q.done) q.after++;
        else q.before++;
        save();
      }
      const follow = () => {
        if (closed || op !== token) return;
        const index = plan.starts.filter((t) => audio.position >= t).length - 1;
        const active = root.querySelector<HTMLElement>("[data-active-chord]");
        if (active)
          active.textContent =
            index < 0 ? "Count-in" : q.config.chords[index].symbol;
        host
          .querySelectorAll<HTMLElement>("[data-chord]")
          .forEach(
            (node, i) =>
              (node.style.background = i === index ? "var(--signal)" : ""),
          );
        frame = requestAnimationFrame(follow);
      };
      follow();
      const end = await playback.completed;
      if (closed || op !== token) return;
      cancelAnimationFrame(frame);
      busy = false;
      if (end === "completed") {
        if (reference) {
          referenceHeard = true;
          q.referencePlayed = true;
          save();
        } else heard = true;
      } else
        message =
          "Playback interrupted. Retry the whole progression; answers are retained.";
      render();
    } catch (e) {
      if (op === token && !closed) {
        busy = false;
        message = (e as Error).message;
        render();
      }
    }
  }
  function finish() {
    stopAudio();
    activeRun!.ended = true;
    view = "results";
    save();
    render();
  }
  function summary(questions: ProgressionQuestion[]) {
    const m = report(questions),
      section = el("section"),
      outcome = el("section"),
      body = el("div"),
      support = el("div");
    section.className = "evidence-summary";
    outcome.className = "outcome";
    outcome.dataset.assessed = String(m.assessed);
    outcome.dataset.correct = String(m.correct);
    body.className = "evidence-body";
    support.className = "supporting-metrics";
    outcome.append(
      el(
        "h2",
        config.mode === "singing"
          ? "Self-rated accuracy"
          : "Recognition accuracy",
      ),
    );
    const percentage = el(
      "p",
      m.assessed ? Math.round((100 * m.correct) / m.assessed) + "%" : "—",
    );
    percentage.className = "metric-number";
    const count = el("p", `${m.correct} / ${m.assessed} assessed notes`);
    count.className = "assessment-count";
    const unassessed = el("p", `${m.unassessed} unassessed`);
    unassessed.className = "unassessed";
    outcome.append(percentage, count, unassessed);
    if (config.mode === "singing")
      outcome.append(el("p", "Self-rated · not pitch-verified"));
    const replay = el("div");
    replay.className = "supporting-metric";
    replay.append(
      el("p", "Replay-assisted notes"),
      el("strong", `${m.assisted} / ${m.assessed}`),
    );
    const total = el("div");
    total.className = "supporting-metric";
    total.append(
      el("p", "Progressions"),
      el("strong", String(questions.length)),
    );
    support.append(replay, total);
    body.append(
      support,
      el(
        "p",
        "Each assessed note contributes once to Overall accuracy. Progression speed is excluded from Overall timing.",
      ),
    );
    section.append(outcome, body);
    return section;
  }
  function organizeSettings() {
    const panels = new Map<string, HTMLElement>();
    for (const name of ["Harmony", "Targets", "Practice"]) {
      const panel = el("section");
      panel.className = "progression-config-section";
      panel.hidden = settingsStep !== name;
      panel.id = "progression-settings-" + name;
      panels.set(name, panel);
    }
    const tabs = el("nav");
    tabs.className = "steps";
    tabs.setAttribute("aria-label", "Configuration steps");
    for (const name of panels.keys()) {
      const tab = button(name, () => {
        settingsStep = name;
        render();
      });
      tab.setAttribute(
        "aria-current",
        name === settingsStep ? "step" : "false",
      );
      tabs.append(tab);
    }
    const footer = el("div");
    footer.className = "actions config-actions";
    const history = el("details");
    history.append(el("summary", "Past progression sessions"));
    const status: HTMLElement[] = [];
    let group = "Harmony";
    for (const node of Array.from(host.children) as HTMLElement[]) {
      if (node.tagName === "H1") continue;
      if (node.tagName === "H2" && node.textContent === "Practice settings")
        group = "Practice";
      if (node.tagName === "H2" && node.textContent === "Target pools")
        group = "Targets";
      if (
        node.getAttribute("role") === "alert" ||
        node.id === "progression-save-status" ||
        (node.tagName === "BUTTON" && node.textContent === "Retry saving")
      ) {
        status.push(node);
        continue;
      }
      if (node.tagName === "BUTTON" && node.textContent === "Start practice") {
        footer.append(node);
        continue;
      }
      if (
        node.tagName === "BUTTON" &&
        node.textContent?.startsWith("Results ·")
      ) {
        history.append(node);
        continue;
      }
      if (
        node.tagName === "DETAILS" &&
        node.querySelector("summary")?.textContent === "Voicing mix & volume"
      )
        panels.get("Targets")!.append(node);
      else panels.get(group)!.append(node);
    }
    host.replaceChildren(tabs, ...status, ...panels.values(), footer);
    if (history.children.length > 1) host.append(history);
  }
  function render() {
    const focused = document.activeElement as HTMLElement | null;
    const key = focused?.dataset.control;
    const priorView = host.dataset.view;
    const openDetails = new Set(Array.from(root.querySelectorAll<HTMLDetailsElement>("details[data-disclosure]")).filter(node => node.open).map(node => node.dataset.disclosure));
    renderContent();
    host.dataset.view = view;
    const title = host.querySelector("h1")!;
    if (view === "settings") {
      organizeSettings();
      host.classList.remove("response-area");
      host.classList.add("config-work");
      const aside = el("aside");
      aside.className = "config-anchor";
      aside.append(
        title,
        el(
          "p",
          config.mode === "singing"
            ? "Guided Singing · self-assessed"
            : "Progression Recognition",
        ),
        el(
          "p",
          `${config.chords.length} chords · ${config.notes} ${config.notes === 1 ? "note" : "notes"} per chord`,
        ),
      );
      const split = el("div");
      split.className = "split-view configuration";
      split.append(aside, host);
      root.replaceChildren(split);
    } else if (view === "practice") {
      host.classList.remove("config-work");
      host.classList.add("response-area");
      const top = el("div");
      top.className = "session-top";
      const count = el(
        "p",
        `${activeRun!.questions.length} / ${activeRun!.config.count || "Unlimited"}`,
      );
      count.className = "session-count";
      const stop = Array.from(host.querySelectorAll("button")).find(
        (b) => b.textContent === "Stop",
      )!;
      top.append(title, count, stop);
      const anchor = el("section");
      anchor.className = "question";
      const caption = el("p", "Progression");
      caption.className = "chord-label";
      const musical = el("h2", `${question!.config.chords.length} chords`);
      musical.dataset.activeChord = "";
      anchor.append(
        caption,
        musical,
        el(
          "p",
          config.mode === "singing"
            ? "Sing the displayed degrees."
            : "Listen, then fill every note in any order.",
        ),
      );
      const playback = host.querySelector(".progression-playback");
      if (playback) anchor.append(playback);
      const workspace = el("div");
      workspace.className = "practice-workspace" + (config.mode === "singing" ? " progression-singing" : "");
      workspace.append(anchor, host);
      root.replaceChildren(top, workspace);
    } else {
      host.classList.remove("config-work", "response-area");
      title.className = "page-band";
      const overview = host.querySelector(".evidence-summary")!;
      const actions = el("div");
      actions.className = "actions";
      for (const b of Array.from(host.querySelectorAll("button")))
        if (
          b.textContent === "Practice again" ||
          b.textContent === "Overall Insights"
        )
          actions.append(b);
      overview.querySelector(".outcome")!.append(actions);
      title.remove();
      root.replaceChildren(title, ...Array.from(host.children));
    }
    for (const node of Array.from(root.querySelectorAll<HTMLDetailsElement>("details[data-disclosure]")))
      node.open = openDetails.has(node.dataset.disclosure);
    const controls = Array.from(root.querySelectorAll<HTMLElement>("[data-control]"));
    let target: HTMLElement | null | undefined = controls.find(node => node.dataset.control === key && !(node as HTMLButtonElement).disabled);
    const moveToRating = ratingFocus && referenceHeard;
    if (moveToRating) {
      target = root.querySelector<HTMLElement>("[data-unrated] button") ?? controls.find(node => node.textContent === "Next question" || node.textContent === "Finish");
      ratingFocus = false;
    }
    if (!target && key?.startsWith("review-") && question)
      target = controls.find(node => node.dataset.control === `${busy ? "review-stop" : "review-replay"}:${question!.id}`);
    if (!target && (key || priorView !== view)) {
      target = root.querySelector<HTMLElement>(view === "results" || view === "settings" ? "h1" : busy ? "[data-playback-status]" : ".progression-answer-board h2");
    }
    if (target && (key || priorView !== view || document.activeElement === document.body)) {
      if (!target.matches("button,input,select,summary,a")) target.tabIndex = -1;
      target.focus({ preventScroll: true });
      if (moveToRating) target.scrollIntoView({ block: "nearest" });
    }
    const announcement = document.getElementById("practice-announcement");
    const state = message || (view === "practice"
      ? `${config.mode === "singing" ? "Guided Singing" : "Progression Recognition"}. Question ${activeRun!.questions.length}. ${busy ? "Playing" : question!.submitted ? "Answers checked" : referenceHeard ? "Reference complete. Rate your response" : heard ? config.mode === "singing" ? "Ready to sing or hear full reference" : "Ready to answer" : "Ready"}. ${feedback}`
      : view === "results" ? `${config.mode === "singing" ? "Guided Singing" : "Progression Recognition"} results. ${busy ? "Reference playing" : "Playback stopped"}` : `Progression settings. ${settingsStep}`);
    if (announcement && announcement.textContent !== state) announcement.textContent = state;
  }
  let control = 0;
  function renderContent() {
    control = 0;
    buttonCounts.clear();
    if (closed) return;
    host.replaceChildren();
    host.append(
      el(
        "h1",
        "Progression " +
          (config.mode === "singing" ? "Guided Singing" : "Recognition"),
      ),
    );
    if (message) {
      const error = el("p", message);
      error.setAttribute("role", "alert");
      host.append(error);
      if (dirty)
        host.append(
          button("Retry saving", () => {
            save();
            message = "";
            render();
          }),
        );
    }
    if (view === "settings") {
      host.append(
        select("Mode", config.mode, ["recognition", "singing"], (value) => {
          presetId = value;
          config = structuredClone(
            presets[value] ?? { ...defaults, mode: value },
          );
        }),
      );
      host.append(
        select(
          "Saved preset",
          presetId,
          [...new Set([presetId, ...Object.keys(presets)])],
          (value) => {
            presetId = value;
            config = structuredClone(presets[value] ?? defaults);
          },
        ),
        button("Save as new preset", () => {
          const name = prompt("Preset name");
          if (!name?.trim()) return;
          const valid = validate(config);
          presetId = config.mode + " / " + name.trim();
          if (presets[presetId])
            throw Error("That preset name already exists.");
          write(presetKey, { ...presets, [presetId]: valid });
          presets[presetId] = valid;
          render();
        }),
      );
      host.append(el("h2", "Progression"));
      host.append(
        select(
          "Template",
          "Custom",
          ["Custom", "major", "minor", "backdoor"],
          (value) => {
            if (value !== "Custom") {
              config.chords = templates[value as keyof typeof templates].map(
                (symbol) => ({ symbol, beats: 4 }),
              );
              addQualityPools(config);
              persistConfig();
            }
          },
        ),
      );
      host.append(
        select(
          "Transpose",
          "0",
          [
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
          ],
          (value) => {
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
                symbol:
                  names[(pitchClass(chord.root) + Number(value) + 12) % 12] +
                  chord.quality,
              };
            });
            persistConfig();
          },
        ),
      );
      config.chords.forEach((row, i) => {
        const group = el("div");
        group.className = "actions";
        group.append(
          field(`Chord ${i + 1}`, row.symbol, (value) => {
            row.symbol = value;
            addQualityPools(config);
          }),
          field(
            `Chord ${i + 1} beats`,
            String(row.beats),
            (value) => (row.beats = Number(value)),
            "number",
          ),
          button(
            `Move chord ${i + 1} up`,
            () => {
              [config.chords[i - 1], config.chords[i]] = [
                config.chords[i],
                config.chords[i - 1],
              ];
              persistConfig();
              render();
            },
            i === 0,
          ),
          button(`Remove chord ${i + 1}`, () => {
            config.chords.splice(i, 1);
            try {
              persistConfig();
            } catch (e) {
              message = (e as Error).message;
            }
            render();
          }),
        );
        host.append(group);
      });
      host.append(
        button("Add chord", () => {
          config.chords.push({ symbol: "Cmaj7", beats: 4 });
          addQualityPools(config);
          persistConfig();
          render();
        }),
      );
      host.append(el("h2", "Practice settings"));
      const settings = el("div");
      settings.className = "actions";
      settings.append(
        field(
          "BPM",
          String(config.bpm),
          (value) => (config.bpm = Number(value)),
          "number",
        ),
        field(
          "Notes per chord",
          String(config.notes),
          (value) => (config.notes = Number(value)),
          "number",
        ),
        field(
          "Questions (0 = Unlimited)",
          String(config.count),
          (value) => (config.count = Number(value)),
          "number",
        ),
      );
      host.append(
        settings,
        el("p", "One-bar count-in · targets evenly spaced within each chord"),
      );
      host.append(el("h2", "Target pools"));
      for (const quality of [
        ...new Set(
          config.chords.flatMap((row) => {
            try {
              return [parseChord(row.symbol).quality];
            } catch {
              return [];
            }
          }),
        ),
      ]) {
        const group = el("fieldset");
        group.append(el("legend", quality));
        const pool = el("div");
        pool.className = "pool";
        for (const degree of degrees) {
          const label = el("label"),
            check = el("input");
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
            } catch (e) {
              message = (e as Error).message;
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
        if (mix.isConnected) mixOpen = mix.open;
      };
      mix.append(el("summary", "Voicing mix & volume"));
      for (let i = 0; i < 5; i++)
        mix.append(
          field(
            `Voice ${i + 1} (%)`,
            String(config.levels[i] * 100),
            (value) => (config.levels[i] = Number(value) / 100),
            "range",
          ),
        );
      mix.append(
        field(
          "Overall volume (%)",
          String(config.volume * 100),
          (value) => (config.volume = Number(value) / 100),
          "range",
        ),
      );
      host.append(mix);
      host.append(button("Start practice", startPractice));
      for (const run of runs.slice().reverse())
        host.append(
          button(
            `Results · ${run.config.mode} · ${run.questions.length} questions`,
            () => {
              activeRun = run;
              config = structuredClone(run.config);
              view = "results";
              render();
            },
          ),
        );
      return;
    }
    const run = activeRun!;
    if (view === "results") {
      host.append(summary(run.questions));
      const review = el("details");
      review.className = "question-review";
      review.dataset.disclosure = "question-review";
      review.append(el("summary", "Question review"));
      for (const q of run.questions) {
        const item = el("details");
        item.className = "progression-review-group";
        item.dataset.disclosure = q.id;
        const m = report([q]);
        item.append(
          el(
            "summary",
            `Progression ${run.questions.indexOf(q) + 1} · ${m.correct} / ${m.assessed} assessed`,
          ),
          el(
            "p",
            `${q.before} pre-check replay events · ${q.after} review events`,
          ),
        );
        const table = el("table"),
          head = el("tr");
        for (const name of [
          "Chord / note",
          "Target",
          "Your response",
          "Result",
        ]) {
          const th = el("th", name);
          th.scope = "col";
          head.append(th);
        }
        const thead = el("thead");
        thead.append(head);
        table.append(thead);
        const body = el("tbody");
        for (const n of q.notes) {
          const row = el("tr");
          for (const text of [
            `${n.occurrence + 1} · ${n.chord.symbol} · note ${n.position + 1}`,
            n.degree,
            n.answer === "unknown" ? "Unknown" : (n.answer ?? "—"),
            n.correct === null
              ? "Unassessed"
              : n.correct
                ? "Correct"
                : "Incorrect",
          ])
            row.append(el("td", text));
          body.append(row);
        }
        table.append(body);
        const scroll = el("div");
        scroll.className = "table-scroll";
        scroll.tabIndex = 0;
        scroll.setAttribute("role", "region");
        scroll.setAttribute("aria-label", "Progression note outcomes");
        scroll.append(table);
        const replay = button("Replay whole reference", () => {
          question = q;
          return play(true, true);
        }, busy);
        replay.dataset.control = "review-replay:" + q.id;
        const playback = el("div");
        playback.className = "actions";
        playback.append(replay);
        if (busy && question?.id === q.id) {
          const stop = button("Stop reference", () => { stopAudio(); render(); });
          stop.dataset.control = "review-stop:" + q.id;
          playback.append(stop);
          const status = el("p", "Reference playing");
          status.className = "playback-status";
          status.dataset.playbackStatus = "";
          item.append(status);
        }
        item.append(scroll, playback);
        review.append(item);
      }
      host.append(review);
      host.append(
        button("Practice again", () => {
          config = structuredClone(run.config);
          settingsStep = "Harmony";
          view = "settings";
          render();
        }),
        button("Overall Insights", () => (location.hash = "insights")),
      );
      return;
    }
    const q = question!;
    const status = el("p", busy ? "Playing" : referenceHeard ? "Reference complete · rate each note" : heard ? config.mode === "singing" ? "Ready to sing" : "Ready to answer" : "Ready");
    status.dataset.playbackStatus = "";
    status.dataset.control = "playback-status";
    status.className = "playback-status";
    host.append(status);
    const chords = el("div");
    chords.className = "actions";
    q.config.chords.forEach((row, i) => {
      const item = el("span", `${i + 1} · ${row.symbol} · ${row.beats} beats`);
      item.dataset.chord = String(i);
      chords.append(item);
    });
    if (q.config.mode === "recognition") host.append(chords);
    const checked = q.submitted || q.done;
    const playback = el("div");
    playback.className = "actions progression-playback";
    playback.append(
      button(
        checked ? "Replay whole reference" : "Replay whole progression",
        () => play(checked, true),
        busy,
      ),
      button("Stop", finish),
    );
    host.append(playback);
    if (q.config.mode === "singing" && !q.done)
      host.append(
        button(
          "Done — hear full reference",
          () => {
            q.done = true;
            ratingFocus = true;
            save();
            return play(true, false);
          },
          busy || !heard,
        ),
      );
    if (q.config.mode === "recognition") {
      for (const n of q.notes) {
        const label = `${n.occurrence + 1} · ${n.chord.symbol} · note ${n.position + 1}`;
        if (!q.submitted) {
          const control = select(
            label,
            answers[q.notes.indexOf(n)],
            ["", "unknown", ...optionsFor(n.chord, n.degree)],
            (value) => (answers[q.notes.indexOf(n)] = value),
          );
          control.querySelector("select")!.disabled = busy || !heard;
          host.append(control);
        } else
          host.append(
            el(
              "p",
              `${label} · ${n.degree} → ${n.answer === "unknown" ? "Don’t know" : n.answer} · ${n.correct ? "Correct" : "Incorrect"}`,
            ),
          );
      }
      if (!q.submitted)
        host.append(
          button(
            "Submit all answers",
            () => {
              submit(q, answers);
              save();
              render();
            },
            busy || !heard || answers.some((value) => !value),
          ),
        );
    } else {
      host.append(
        el("p", "Individual self-ratings · no microphone verification"),
      );
      q.notes.forEach((n, i) => {
        const row = el("section");
        row.dataset.note = String(i);
        row.setAttribute("role", "group");
        row.setAttribute("aria-label", `${n.occurrence + 1} · ${n.chord.symbol} · note ${n.position + 1}`);
        if (n.correct === null) row.dataset.unrated = "";
        row.append(
          el(
            "h3",
            `Note ${n.position + 1}`,
          ),
        );
        const target = el("p", n.degree);
        target.className = "progression-target-degree";
        row.append(target);
        if (referenceHeard) {
          if (n.correct !== null)
            row.append(
              el("p", n.correct ? "Correct" : `Incorrect · ${n.answer}`),
            );
          else {
            const actions = el("div");
            actions.className = "actions";
            actions.append(
              button("Correct", () => {
                rate(q, i, true);
                feedback = `Chord ${n.occurrence + 1}, note ${n.position + 1}: self-rated correct.`;
                ratingFocus = true;
                save();
                render();
              }),
              button("Incorrect", () => {
                n.answer = "unknown";
                save();
                render();
              }),
            );
            if (n.answer !== null)
              actions.append(
                select(
                  "Degree you sang",
                  n.answer,
                  [
                    "unknown",
                    ...optionsFor(n.chord, n.degree).filter(
                      (d) => d !== n.degree,
                    ),
                  ],
                  (value) => {
                    n.answer = value;
                    save();
                  },
                ),
                button("Save incorrect rating", () => {
                  rate(q, i, false, n.answer ?? "unknown");
                  feedback = `Chord ${n.occurrence + 1}, note ${n.position + 1}: self-rated incorrect.`;
                  ratingFocus = true;
                  save();
                  render();
                }),
              );
            for (const action of Array.from(actions.querySelectorAll<HTMLElement>("button,select")))
              action.dataset.control = `note:${n.id}:${action.textContent?.startsWith("Correct") ? "correct" : action.tagName === "SELECT" ? "answer" : action.textContent}`;
            row.append(actions, el("p", "Unassessed until rated."));
          }
        }
        host.append(row);
      });
    }
    const board = el("section");
    board.className = "progression-answer-board";
    board.setAttribute(
      "aria-label",
      q.config.mode === "singing" ? "Guided singing notes" : "Your answers",
    );
    board.append(
      el(
        "h2",
        q.config.mode === "singing" ? "Sing this sequence" : "Your answers",
      ),
    );
    if (q.config.mode === "recognition") {
      const controls = Array.from(host.children).filter(
        (node) =>
          node.tagName === "LABEL" ||
          (node.tagName === "P" && node.textContent?.includes(" · note ")),
      );
      q.config.chords.forEach((chord, occurrence) => {
        const group = el("fieldset");
        group.className = "progression-chord-group";
        group.append(el("legend", `${occurrence + 1} · ${chord.symbol}`));
        const grid = el("div");
        grid.className = "progression-note-grid";
        for (let i = 0; i < q.config.notes; i++) {
          const node = controls[occurrence * q.config.notes + i];
          if (node) grid.append(node);
        }
        group.append(grid);
        board.append(group);
      });
    } else {
      const rows = Array.from(host.querySelectorAll<HTMLElement>(":scope > section[data-note]"));
      q.config.chords.forEach((chord, occurrence) => {
        const group = el("fieldset");
        group.className = "progression-chord-group";
        group.append(el("legend", `${occurrence + 1} · ${chord.symbol} · ${chord.beats} beats`));
        const grid = el("div");
        grid.className = "progression-note-grid";
        grid.style.gridTemplateColumns = `repeat(${q.config.notes}, minmax(0, 1fr))`;
        for (const row of rows.slice(occurrence * q.config.notes, (occurrence + 1) * q.config.notes)) grid.append(row);
        group.append(grid);
        board.append(group);
      });
    }
    const submitButton = Array.from(
      host.querySelectorAll(":scope > button"),
    ).find((b) => b.textContent === "Submit all answers");
    const doneButton = Array.from(
      host.querySelectorAll(":scope > button"),
    ).find((b) => b.textContent === "Done — hear full reference");
    if (doneButton) doneButton.classList.add("done-action");
    const boardTitle = board.querySelector("h2")!;
    boardTitle.dataset.control = "answer-board-title";
    boardTitle.tabIndex = -1;
    if (doneButton) host.insertBefore(board, doneButton);
    else host.append(board);
    if (submitButton) {
      const row = el("div");
      row.className = "actions";
      row.append(submitButton);
      host.append(row);
    }
    if (q.submitted || referenceHeard) {
      host.append(summary([q]));
      host.append(
        button(
          run.config.count && run.questions.length >= run.config.count
            ? "Finish"
            : "Next question",
          () => {
            if (run.config.count && run.questions.length >= run.config.count)
              finish();
            else next();
          },
          busy,
        ),
      );
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
  if (resultId) {
    const saved = runs.find(run => run.id === resultId);
    if (saved) {
      activeRun = saved;
      config = structuredClone(saved.config);
      view = "results";
    } else message = "This progression session is not available in this browser. Choose a preset to practice.";
  }
  render();
  if (autoStart && !resultId) {
    try {
      startPractice();
    } catch (e) {
      message = (e as Error).message;
      render();
    }
  }
  return () => {
    closed = true;
    stopAudio();
    document.removeEventListener("visibilitychange", hidden);
    audio.close();
  };
}
