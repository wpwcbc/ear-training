import { exerciseNames, progressionModes, progressionName, progressionExercise, isPlayByEar, type ProgressionMode } from "./exercise-names.js";
import { configurationChapters, configurationGroup, rememberGroups, practiceSummary, type ConfigurationChapter } from "./configuration.js";
import { AudioEngine } from "../jazz/audio.js";
import {
  parseChord,
  qualities,
  type Quality,
  degrees,
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
  defaultConfig, performanceComplete, finishPerformance, assessPerformance, completionTiming,
  practiceKeys,
  templates,
  validate,
  questionStream,
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
            (q.config.mode === progressionModes.degreeAudiation || isPlayByEar(q.config.mode)) ? ("m1" as const) : ("m2" as const),
          method: isPlayByEar(q.config.mode) ? "played" as const : "sung" as const,
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
            generatorVersion: q.generatorVersion ?? "v2-progression-1",
          },
          run.id,
          n.exposure ?? "previously-seen",
        );
        return {
          ...a,
          id: n.id,
          exercise: progressionExercise(q.config.mode),
          timingVersion: isPlayByEar(q.config.mode) ? q.completionTimingVersion ?? "v2-play-after-backing-1" : "progression-timing-not-recorded",
          progressionContext: JSON.stringify(q.source && q.config.mode !== progressionModes.singlePlayByEar ? {...q.config, sourceChords:q.source.chords, practiceKey:q.practiceKey} : q.config),
          replayQuestionId: q.id,
          replayEventsBefore: q.before,
          replayEventsAfter: q.after,
          firstCorrect: n.correct,
          firstAnswer: n.answer,
          imaginedWrongDegree:
            (q.config.mode === progressionModes.degreeAudiation || isPlayByEar(q.config.mode)) && n.correct === false
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
    label: progressionName(run.config.mode),
    count: run.questions.length,
    unit: run.config.mode === progressionModes.singlePlayByEar ? (run.questions.length === 1 ? "question" : "questions") : (run.questions.length === 1 ? "progression" : "progressions"),
    ended: run.ended,
    href: `#progression/${run.config.mode}/results/${encodeURIComponent(run.id)}`,
  }));
}
export function instrumentalQuestions(exercise?: string) {
  return (retainedRuns ?? read<Run[]>(historyKey, [])).flatMap(run => run.questions).filter(q => isPlayByEar(q.config.mode) && (!exercise || progressionExercise(q.config.mode) === exercise));
}
export function completionSummary(questions: ProgressionQuestion[]) {
  const report = completionTiming(questions), section = document.createElement("section"); section.className = "completion-summary";
  const title = document.createElement("h2"); title.textContent = "Post-accompaniment completion delay"; section.append(title);
  const note = document.createElement("p"); note.textContent = "Whole-question timing · all-correct, unassisted attempts only · includes button interaction · separate from Overall response time."; section.append(note);
  if (!report.groups.length) { const p = document.createElement("p"); p.textContent = "Unavailable · n=0 eligible questions"; section.append(p); }
  for (const group of report.groups) {
    const p = document.createElement("p"), value = document.createElement("strong"); value.textContent = `${(group.median / 1000).toFixed(2)}s median · n=${group.n}`;
    p.append(value, document.createTextNode(" · " + group.label)); section.append(p);
  }
  const excluded = document.createElement("p"); excluded.textContent = `${report.excluded} excluded: incomplete, incorrect, unavailable, replay-assisted or interrupted questions.`; section.append(excluded); return section;
}
export function progressionConditions(context: string): string {
  try {
    const stored = JSON.parse(context) as ProgressionConfig & {practiceKey?:string;sourceChords?:ProgressionConfig["chords"]};
    const c = validate(stored);
    const pools = Object.entries(c.pools).map(([quality, pool]) => `${quality}: ${pool!.join(", ")}`).join("; ");
    return `${progressionName(c.mode)} · ${c.chords.map(row => `${row.symbol} (${row.beats} beats)`).join(" → ")} · ${c.bpm} BPM · ${c.notes} ${c.notes === 1 ? "note" : "notes"} per chord · Targets: ${pools} · Voice mix: ${c.levels.map(level => Math.round(level * 100) + "%").join(", ")} · Volume: ${Math.round(c.volume * 100)}% · ${isPlayByEar(c.mode) ? "Instrumental playing · Self-assessed · Separate post-accompaniment delay" : "Progression timing unavailable"}${stored.practiceKey ? " · Practice key: " + stored.practiceKey : ""}${stored.sourceChords ? " · C source: " + stored.sourceChords.map(row=>row.symbol).join(" → ") : ""}`;
  } catch {
    return "Progression · stored conditions unavailable";
  }
}
export function mountProgression(
  root: HTMLElement,
  initialMode: ProgressionMode = progressionModes.degreeRecognition,
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
  let newQuestion: (() => ProgressionQuestion) | null = null;
  const presets = read<Record<string, ProgressionConfig>>(presetKey, {}),
    runs = retainedRuns ?? read<Run[]>(historyKey, []);
  const configGroups = new Map<string, boolean>();
  let configUnsaved = false, settingsStep: ConfigurationChapter = "Harmony";
  const buttonCounts = new Map<string, number>();
  let ratingFocus = false, feedback = "", phase = "";
  let errorDraft: Record<string,string> = {};
  let config = structuredClone(
      presets[initialMode] ?? defaultConfig(initialMode),
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
    if (message.startsWith("Could not save V2 data")) message = "";
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
    input.dataset.control = "field:" + text;
    input.setAttribute("aria-label", text);
    input.type = type;
    if (type === "range") {
      label.className = "voice-control";
      input.min = "0";
      input.max = text.startsWith("Voice") ? "200" : "100";
      input.step = "5";
      const output = el("output", value + "%");
      input.oninput = () => (output.textContent = input.value + "%");
      label.append(output);
    }
    input.value = value;
    input.onchange = () => {
      try {
        change(type === "number" && input.value === "" ? "NaN" : input.value);
        if (view === "settings") persistConfig();
        message = "";
      } catch (e) { message = (e as Error).message; }
      render();
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
    input.dataset.control = "field:" + text;
    input.setAttribute("aria-label", text);
    for (const v of values) {
      const labels: Record<string, string> = {
        unknown: "Don’t know", fixed: "Fixed key", random: "Random key",
        [progressionModes.degreeRecognition]: exerciseNames["progression-recognition"],
        [progressionModes.degreeAudiation]: exerciseNames["progression-singing"],
        [progressionModes.singlePlayByEar]: exerciseNames["single-play-by-ear"],
        [progressionModes.playByEar]: exerciseNames["progression-play-by-ear"],
        major: "Major ii–V–I",
        minor: "Minor ii–V–i",
        backdoor: "Backdoor",
      };
      const mode = Object.values(progressionModes).find(mode => v === mode || v.startsWith(mode + " / "));
      const option = el("option", labels[v] ?? (mode ? progressionName(mode) + v.slice(mode.length) : v));
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
    configUnsaved = true;
    write(presetKey, { ...presets, [presetId]: valid });
    presets[presetId] = valid;
    configUnsaved = false;
    if (!dirty) message = "";
  }
  function startPractice() {
    const valid = validate(config);
    activeRun = {
      id: crypto.randomUUID(),
      config: valid,
      questions: [],
      ended: false,
    };
    newQuestion = questionStream(valid);
    runs.push(activeRun);
    next();
  }
  function next() {
    stopAudio();
    question = newQuestion!();
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
    answers = question.notes.map(() => ""); errorDraft = {};
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
    if (!dirty) message = "";
    render();
    const savePlaybackProgress = () => { try { save(); } catch (e) { message = (e as Error).message; } };
    try {
      await audio.ready();
      if (closed || op !== token) return;
      const instrumental = isPlayByEar(q.config.mode);
      if (instrumental && !reference) { delete q.performanceEndedAt; heard = false; referenceHeard = false; }
      if (replay && (!reference || q.config.mode === progressionModes.degreeRecognition || q.referencePlayed)) {
        if (q.submitted || q.done) q.after++; else q.before++;
        savePlaybackProgress();
      }
      const passes = instrumental && !reference ? [true, false] : [reference || q.config.mode === progressionModes.degreeRecognition];
      for (const melody of passes) {
        phase = reference ? "Reference playing" : instrumental ? melody ? "Demonstration" : "Playing accompaniment" : "Playing";
        render();
        const plan = sequence(q, melody);
        const playback = audio.playSequence(plan.events, plan.countIn, plan.duration);
        const follow = () => {
          if (closed || op !== token) return;
          const index = plan.starts.filter(t => audio.position >= t).length - 1;
          const active = root.querySelector<HTMLElement>("[data-active-chord]");
          if (active) active.textContent = index < 0 ? "Count-in" : q.config.chords[index].symbol;
          host.querySelectorAll<HTMLElement>("[data-chord]").forEach((node,i) => node.style.background = i === index ? "var(--signal)" : "");
          const status = host.querySelector<HTMLElement>("[data-playback-status]");
          if (status && instrumental) status.textContent = phase + (index < 0 ? " · Count-in" : "");
          frame = requestAnimationFrame(follow);
        };
        follow();
        const end = await playback.completed;
        if (closed || op !== token) return;
        cancelAnimationFrame(frame);
        if (end !== "completed") {
          if (instrumental && !q.done) q.interrupted = true;
          throw Error("Playback interrupted. Retry the whole progression; answers are retained.");
        }
        if (instrumental && !reference && !melody) performanceComplete(q, performance.now() - Math.max(0, audio.position - plan.duration) * 1000);
      }
      busy = false; phase = "";
      if (reference) { referenceHeard = true; q.referencePlayed = true; savePlaybackProgress(); }
      else { heard = true; savePlaybackProgress(); }
      render();
    } catch (e) {
      if (op === token && !closed) {
        busy = false;
        if (isPlayByEar(q.config.mode) && !q.done) q.interrupted = true;
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
        (config.mode === progressionModes.degreeAudiation || isPlayByEar(config.mode))
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
    if (config.mode === progressionModes.degreeAudiation || isPlayByEar(config.mode))
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
      el("p", config.mode === progressionModes.singlePlayByEar ? "Questions" : "Progressions"),
      el("strong", String(questions.length)),
    );
    support.append(replay, total);
    if (isPlayByEar(config.mode)) {
      const delay = el("div"); delay.className = "supporting-metric";
      delay.append(el("p", "Post-accompaniment completion delay"));
      for (const q of questions.length === 1 ? questions : []) delay.append(el("p", `${q.completionDelayMs === undefined ? "Unavailable" : (q.completionDelayMs / 1000).toFixed(2) + "s"} · ${q.interrupted ? "Interrupted/recovered" : q.before ? "Replay-assisted" : "Unassisted"}`));
      delay.append(el("p", "Whole-question delay includes button interaction. It is separate from Overall response time.")); support.append(delay, completionSummary(questions));
    }
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
  function configIssue(): { chapter: ConfigurationChapter; group: string; message: string; field?: string } | null {
    try { validate(config); return null; } catch (e) {
      const message = (e as Error).message;
      if (/practice key|random key/.test(message)) return { chapter: "Harmony", group: "keys", message };
      if (config.mode === progressionModes.singlePlayByEar && /roots|qualities/.test(message)) return { chapter: "Harmony", group: "single", message };
      if (config.mode !== progressionModes.singlePlayByEar && (config.chords.length < 2 || config.chords.length > 32)) return { chapter: "Harmony", group: "chords", message };
      for (let i = 0; i < config.chords.length; i++) {
        const row = config.chords[i];
        try { parseChord(row.symbol); } catch { return { chapter: "Harmony", group: "chords", field: `Chord ${i + 1}`, message }; }
        if (!Number.isInteger(row.beats) || row.beats < 1 || row.beats > 16)
          return { chapter: "Harmony", group: "chords", field: `Chord ${i + 1} beats`, message };
      }
      if (!Number.isFinite(config.bpm) || config.bpm < 20 || config.bpm > 300)
        return { chapter: "Practice", group: "tempo", field: "BPM", message };
      if (!Number.isInteger(config.notes) || config.notes < 1 || config.notes > 4)
        return { chapter: "Practice", group: "tempo", field: "Notes per chord", message };
      if (!Number.isInteger(config.count) || config.count < 0 || config.count > 200)
        return { chapter: "Practice", group: "length", field: "Questions (0 = Unlimited)", message };
      for (const quality of config.mode === progressionModes.singlePlayByEar ? config.qualities! : config.chords.map(row => parseChord(row.symbol).quality)) {
        if (!config.pools[quality]?.length) return { chapter: "Target degrees", group: "pool:" + quality, message };
      }
      return { chapter: "Sound", group: !Number.isFinite(config.volume) || config.volume < 0 || config.volume > 1 ? "volume" : "mix", message };
    }
  }
  function organizeSettings(title: HTMLElement) {
    const issue = configIssue(), nodes = Array.from(host.children) as HTMLElement[];
    const page = el("section"), header = el("header"), layout = el("div"), side = el("aside"), tabs = el("nav");
    page.className = "config-page"; header.className = "config-header"; layout.className = "config-layout"; side.className = "config-summary";
    host.className = "progression-work config-editor";
    title.textContent = "Customize " + progressionName(config.mode);
    const label = (name: string) => nodes.find(node => node.tagName === "LABEL" && node.querySelector("[aria-label]")?.getAttribute("aria-label") === name)!;
    const action = (name: string) => nodes.find(node => node.tagName === "BUTTON" && node.textContent === name)!;
    const presetControls = el("div"); presetControls.className = "config-preset-controls";
    presetControls.append(label("Mode"), label("Saved preset"), action("Save as new preset"));
    header.append(title, presetControls);
    tabs.className = "steps config-tabs"; tabs.setAttribute("aria-label", "Configuration chapters");
    for (const name of configurationChapters) {
      const tab = button(name, () => { settingsStep = name; render(); });
      if (settingsStep === name) tab.setAttribute("aria-current", "page");
      tabs.append(tab);
    }
    const content: HTMLElement[] = [tabs];
    const group = (key: string, name: string, selected: string, children: HTMLElement[], open = false) => {
      const id = presetId + ":" + key;
      if (issue?.group === key) configGroups.set(id, true);
      const node = configurationGroup(configGroups, id, name, selected, children, open);
      if (issue?.group === key) {
        const error = el("p", issue.message + " Last valid saved preset unchanged.");
        error.className = "config-field-error"; error.id = "progression-validation"; error.setAttribute("role", "alert");
        node.lastElementChild!.prepend(error);
        node.querySelectorAll("input,select,fieldset").forEach(field => {
          if (issue.field && field.getAttribute("aria-label") !== issue.field) return;
          field.setAttribute("aria-invalid", "true"); field.setAttribute("aria-describedby", error.id);
        });
      }
      return node;
    };
    if (message && message !== issue?.message) {
      const notice = el("p", message); notice.setAttribute("role", "alert"); content.push(notice);
      if (dirty) content.push(button("Retry saving", () => { save(); message = ""; render(); }));
    }
    if (issue && issue.chapter !== settingsStep) content.push(el("p", issue.message), button("Review invalid settings: " + issue.chapter, () => {
      settingsStep = issue.chapter; render(); root.querySelector<HTMLElement>("input[aria-invalid='true'],select[aria-invalid='true']")?.focus();
    }));
    const single = config.mode === progressionModes.singlePlayByEar;
    if (settingsStep === "Harmony" && single) {
      const controls: HTMLElement[] = [];
      for (const [name, values, selected] of [["Roots", practiceKeys, config.roots!], ["Chord qualities", qualities, config.qualities!]] as const) {
        const fieldset = el("fieldset"); fieldset.append(el("legend", name)); const pool = el("div"); pool.className = "pool";
        for (const value of values) {
          const item = el("label"), check = el("input"); check.type = "checkbox"; check.checked = selected.includes(value as never); check.dataset.control = name + ":" + value;
          check.onchange = () => { const next = new Set<string>(selected); check.checked ? next.add(value) : next.delete(value); if (name === "Roots") config.roots = [...next]; else { config.qualities = [...next] as Quality[]; addQualityPools(config); } try { persistConfig(); message = ""; } catch(e) { message = (e as Error).message; } render(); };
          item.append(check, el("span", value)); pool.append(item);
        }
        fieldset.append(pool); controls.push(fieldset);
      }
      controls.push(button("All 12 Keys", () => { config.roots = [...practiceKeys]; persistConfig(); render(); }));
      content.push(group("single", "Roots and chord qualities", `${config.roots!.join(", ")} · ${config.qualities!.join(", ")}`, controls, true));
    }
    if (settingsStep === "Harmony" && !single) {
      const template = el("div"); template.className = "config-fields"; template.append(label("Template"));
      const keyControls = el("div"); keyControls.className = "config-fields";
      keyControls.append(select("Key mode", config.keyMode ?? "fixed", ["fixed", "random"], value => { config.keyMode = value as "fixed" | "random"; config.keyPool ??= [...practiceKeys]; persistConfig(); }));
      if (config.keyMode !== "random") keyControls.append(label("Practice key"));
      else {
        const pool = el("fieldset"); pool.className = "key-pool"; pool.append(el("legend", "Random keys"));
        const choices = el("div"); choices.className = "pool";
        for (const key of practiceKeys) {
          const item = el("label"), check = el("input"); check.type = "checkbox"; check.dataset.control = "key:" + key;
          check.checked = (config.keyPool ?? practiceKeys).includes(key);
          check.onchange = () => { const values = new Set(config.keyPool ?? practiceKeys); check.checked ? values.add(key) : values.delete(key); config.keyPool = [...values]; try { persistConfig(); message = ""; } catch(e) { message = (e as Error).message; } render(); };
          item.append(check, el("span", key)); choices.append(item);
        }
        pool.append(choices, button("All", () => { config.keyPool = [...practiceKeys]; persistConfig(); render(); })); keyControls.append(pool);
      }
      content.push(group("keys", "Practice key", config.keyMode === "random" ? "Random: " + (config.keyPool ?? practiceKeys).join(", ") : "Fixed " + (config.key ?? "C"), [keyControls], true));
      const chords = nodes.filter(node => node.classList.contains("actions") && Array.from(node.querySelectorAll("input[aria-label]")).some(field => /^Chord \d+$/.test(field.getAttribute("aria-label")!)));
      chords.forEach((row, i) => {
        row.className = "chord-editor-row"; row.setAttribute("role", "group"); row.setAttribute("aria-label", "Chord " + (i + 1) + " settings");
        row.querySelectorAll("button").forEach(b => { b.setAttribute("aria-label", b.textContent!); b.textContent = b.textContent?.startsWith("Move") ? "Up" : "Remove"; });
      });
      content.push(group("template", "Template and key", config.chords.map(row => row.symbol).join(" → "), [template], true),
        group("chords", "Chord sequence", `${config.chords.length} chords · ${config.chords.map(row => row.beats).join(" / ")} beats`, [...chords, action("Add chord")], true));
    }
    if (settingsStep === "Target degrees") {
      content.push(el("p", "Choose the degrees to practise against each chord quality."));
      nodes.filter(node => node.tagName === "FIELDSET").forEach((pool, i) => {
        const quality = pool.querySelector("legend")!.textContent!;
        content.push(group("pool:" + quality, quality, config.pools[quality as keyof typeof config.pools]?.join(", ") || "None selected", [pool], i === 0));
      });
    }
    if (settingsStep === "Practice") {
      const fields = nodes.find(node => node.classList.contains("actions") && node.querySelector("input[aria-label='BPM']"))!;
      const labels = Array.from(fields.children) as HTMLElement[];
      const tempo = el("div"); tempo.className = "config-fields"; tempo.append(labels[0], ...(single ? [] : [labels[1]]));
      content.push(group("tempo", "Tempo and notes", `${config.bpm} BPM · ${config.notes} notes per chord`, [tempo, el("p", "One-bar count-in · targets evenly spaced within each chord")], true),
        group("length", "Session length", config.count === 0 ? "Unlimited" : `${config.count} questions`, [labels[2]], true));
    }
    if (settingsStep === "Sound") {
      const mix = nodes.find(node => node.tagName === "DETAILS" && node.querySelector("summary")?.textContent === "Voicing mix & volume")!;
      const levels = Array.from(mix.querySelectorAll<HTMLElement>("label"));
      content.push(group("volume", "Overall volume", Math.round(config.volume * 100) + "%", [levels.pop()!], true),
        group("mix", "Voicing mix", config.levels.map(v => Math.round(v * 100) + "%").join(", "), [el("p", "Original voices, low to high. Accompaniment only; 0% mutes, 100% is standard, 200% is double nominal gain."), ...levels]));
    }
    side.append(el("p", "Practice key: " + (config.keyMode === "random" ? "Random · " + (config.keyPool ?? practiceKeys).join(", ") : config.key ?? "C")), el("h2", "This practice"), el("h3", single ? "Chord pools" : "C-source progression"), el("p", single ? `${config.roots!.join(", ")} · ${config.qualities!.join(", ")}` : config.chords.map(row => `${row.symbol} (${row.beats} beats)`).join(" → ")), el("h3", "Target degrees"));
    const used = new Set(single ? config.qualities! : config.chords.flatMap(row => { try { return [parseChord(row.symbol).quality]; } catch { return []; } }));
    for (const quality of used) side.append(el("p", `${quality}: ${config.pools[quality]?.join(", ") || "None selected"}`));
    side.append(el("h3", "Practice"), el("p", `${config.bpm} BPM · ${config.notes} notes per chord · ${config.count === 0 ? "Unlimited" : config.count + " questions"}`),
      el("h3", "Sound"), el("p", `Voice mix: ${config.levels.map(v => Math.round(v * 100) + "%").join(", ")}`), el("p", `Volume: ${Math.round(config.volume * 100)}%`));
    if (single) side.firstElementChild?.remove();
    const summaryContent = Array.from(side.children) as HTMLElement[];
    side.replaceChildren(practiceSummary(configGroups, presetId + ":overview", summaryContent));
    const compact = el("p", `${single ? config.roots!.join(", ") + " · " + config.qualities!.join(", ") : config.chords.map(row => row.symbol).join(" → ")} · ${config.bpm} BPM · ${config.notes} notes/chord · ${config.count === 0 ? "Unlimited" : config.count + " questions"}`);
    compact.className = "config-mobile-overview"; header.append(compact);
    const launch = el("div"); launch.className = "config-launch";
    const start = action("Start practice") as HTMLButtonElement; start.disabled = Boolean(issue);
    const status = el("p", issue ? "Invalid settings. Review the highlighted group." : configUnsaved ? `Not saved to ${presetId}. Retry saving.` : `Saved preset: ${Object.values(progressionModes).includes(presetId as ProgressionMode) ? progressionName(presetId as ProgressionMode) : presetId}`);
    status.id = "progression-save-status"; status.className = "notice";
    status.dataset.state = issue ? "invalid" : configUnsaved ? "unsaved" : "saved"; status.setAttribute("role", "status");
    launch.append(start, status); side.append(launch);
    if (configUnsaved) side.append(button("Retry saving preset", () => { persistConfig(); message = ""; render(); }));
    const history = el("details"); history.append(el("summary", "Past sessions"));
    nodes.filter(node => node.tagName === "BUTTON" && node.textContent?.startsWith("Results ·")).forEach(node => history.append(node));
    if (history.children.length > 1) side.append(history);
    host.replaceChildren(...content); layout.append(host, side); page.append(header, layout);
    return page;
  }

  function presentHarmonicBoard(top: HTMLElement) {
    const board = host.querySelector<HTMLElement>(".progression-answer-board")!;
    const status = host.querySelector<HTMLElement>("[data-playback-status]")!;
    const playback = host.querySelector<HTMLElement>(".progression-playback")!;
    const footer = el("div"); footer.className = "harmonic-actions";
    const primary = Array.from(host.querySelectorAll("button")).filter(b => ["Submit all answers", "Done — hear full reference", "Next question", "Finish"].includes(b.textContent!));
    footer.append(playback, ...primary);
    const notes = el("p", `${config.bpm} BPM · ${config.notes} ${config.notes === 1 ? "note" : "notes"} per chord${question?.practiceKey ? " · Key " + question.practiceKey : ""}`);
    notes.className = "harmonic-meta";
    const score = host.querySelector<HTMLElement>(":scope > .evidence-summary");
    const provenance = (config.mode === progressionModes.degreeAudiation || isPlayByEar(config.mode)) ? [el("p", "Individual self-ratings · no microphone verification")] : [];
    const recovery = Array.from(host.children).filter(node => node.getAttribute("role") === "alert" || (node.tagName === "BUTTON" && node.textContent === "Retry saving"));
    host.classList.add("harmonic-progression");
    host.classList.toggle("single-performance", config.mode === progressionModes.singlePlayByEar);
    host.replaceChildren(...recovery, status, ...provenance, board, notes, footer, ...(score ? [score] : []));
    root.replaceChildren(top, host);
  }

  function render() {
    const focused = document.activeElement as HTMLElement | null;
    const key = focused?.dataset.control;
    const priorView = host.dataset.view;
    rememberGroups(root, configGroups);
    const scroll = window.scrollY;
    const openDetails = new Set(Array.from(root.querySelectorAll<HTMLDetailsElement>("details[data-disclosure]")).filter(node => node.open).map(node => node.dataset.disclosure));
    renderContent();
    host.dataset.view = view;
    const title = host.querySelector("h1")!;
    if (view === "settings") {
      root.replaceChildren(organizeSettings(title));
    } else if (view === "practice") {
      host.classList.remove("config-work", "config-editor", "harmonic-progression");
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
      presentHarmonicBoard(top);
    } else {
      host.classList.remove("config-work", "config-editor", "response-area", "harmonic-progression");
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
    if (view === "settings" && priorView === "settings") window.scrollTo(0, scroll);
    const announcement = document.getElementById("practice-announcement");
    const state = message || (view === "practice"
      ? `${progressionName(config.mode)}. Question ${activeRun!.questions.length}. ${busy ? phase || "Playing" : question!.submitted ? "Answers checked" : referenceHeard ? "Reference complete. Rate your response" : heard ? config.mode === progressionModes.degreeAudiation ? "Ready to sing or hear full reference" : "Ready to answer" : "Ready"}. ${feedback}`
      : view === "results" ? `${progressionName(config.mode)} results. ${busy ? "Reference playing" : "Playback stopped"}` : `Progression settings. ${settingsStep}`);
    if (announcement && announcement.textContent !== state) announcement.textContent = state;
  }
  function renderContent() {
    buttonCounts.clear();
    if (closed) return;
    host.replaceChildren();
    host.append(
      el(
        "h1",
        progressionName(config.mode),
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
        select("Mode", config.mode, Object.values(progressionModes), (value) => {
          presetId = value;
          configUnsaved = false;
          config = structuredClone(
            presets[value] ?? defaultConfig(value as ProgressionMode),
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
            configUnsaved = false;
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
      host.append(select("Practice key", config.key ?? "C", practiceKeys, value => { config.key = value; persistConfig(); }));
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
      for (const quality of config.mode === progressionModes.singlePlayByEar ? config.qualities! : [
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
          check.dataset.control = `pool:${quality}:${degree}`;
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
            `Results · ${progressionName(run.config.mode)} · ${run.questions.length} ${run.questions.length === 1 ? "question" : "questions"}`,
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
        item.append(el("p", q.config.mode === progressionModes.singlePlayByEar ? "Chord: " + q.config.chords[0].symbol : "Practice key: " + (q.practiceKey ?? "Stored original")));
        item.append(
          el(
            "summary",
            `${run.config.mode === progressionModes.singlePlayByEar ? "Question" : "Progression"} ${run.questions.indexOf(q) + 1} · ${m.correct} / ${m.assessed} assessed`,
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
    if (isPlayByEar(q.config.mode)) { renderInstrument(q); return; }
    const status = el("p", busy ? "Playing" : referenceHeard ? "Reference complete · rate each note" : heard ? config.mode === progressionModes.degreeAudiation ? "Ready to sing" : "Ready to answer" : "Ready");
    status.dataset.playbackStatus = "";
    status.dataset.control = "playback-status";
    status.className = "playback-status";
    host.append(status, el("p", "Practice key: " + (q.practiceKey ?? "Stored original")));
    const chords = el("div");
    chords.className = "actions";
    q.config.chords.forEach((row, i) => {
      const item = el("span", `${i + 1} · ${row.symbol} · ${row.beats} beats`);
      item.dataset.chord = String(i);
      chords.append(item);
    });
    if (q.config.mode === progressionModes.degreeRecognition) host.append(chords);
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
    if (q.config.mode === progressionModes.degreeAudiation && !q.done)
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
    if (q.config.mode === progressionModes.degreeRecognition) {
      for (const n of q.notes) {
        const label = `${n.occurrence + 1} · ${n.chord.symbol} · note ${n.position + 1}`;
        if (!q.submitted) {
          const control = select(
            label,
            answers[q.notes.indexOf(n)],
            ["", "unknown", ...optionsFor(n.chord, n.degree)],
            (value) => (answers[q.notes.indexOf(n)] = value),
          );
          control.firstChild!.textContent = `Note ${n.position + 1}`;
          control.querySelector("select")!.disabled = busy || !heard;
          host.append(control);
        } else {
          const outcome = el("section");
          outcome.dataset.noteOutcome = ""; outcome.setAttribute("aria-label", label);
          outcome.append(el("h3", `Note ${n.position + 1}`), el("p", "Your answer: " + (n.answer === "unknown" ? "Don’t know" : n.answer)), el("p", "Correct degree: " + n.degree), el("strong", n.correct ? "Correct" : "Incorrect"));
          host.append(outcome);
        }
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
      q.config.mode === progressionModes.degreeAudiation ? "Degree audiation targets" : "Your answers",
    );
    board.append(
      el(
        "h2",
        q.config.mode === progressionModes.degreeAudiation ? "Sing this sequence" : q.submitted ? "Check your answers" : "Identify each chord degree",
      ),
    );
    if (q.config.mode === progressionModes.degreeRecognition) {
      const controls = Array.from(host.children).filter(
        (node) =>
          node.tagName === "LABEL" ||
          node.hasAttribute("data-note-outcome"),
      );
      q.config.chords.forEach((chord, occurrence) => {
        const group = el("fieldset");
        group.className = "progression-chord-group";
        const legend = el("legend", `${occurrence + 1} · ${chord.symbol}`);
        legend.dataset.chord = String(occurrence);
        const duration = el("span", `${chord.beats} beats`); duration.className = "chord-duration";
        legend.append(duration); group.append(legend);
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
        const legend = el("legend", `${occurrence + 1} · ${chord.symbol}`);
        legend.dataset.chord = String(occurrence);
        const duration = el("span", `${chord.beats} beats`); duration.className = "chord-duration";
        legend.append(duration); group.append(legend);
        const grid = el("div");
        grid.className = "progression-note-grid";
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
  function renderInstrument(q: ProgressionQuestion) {
    const status = el("p", busy ? phase || "Playing" : q.submitted ? "Answers checked" : referenceHeard ? "Reference complete · self-assess your playing" : q.done ? "Retry full reference" : heard ? "Ready to finish · additional completion time is being recorded" : "Replay demonstration to recover");
    status.dataset.playbackStatus = ""; status.className = "playback-status"; host.append(status);
    const playback = el("div"); playback.className = "actions progression-playback";
    playback.append(button(q.done ? "Replay whole reference" : "Replay demonstration", () => play(q.done,true), busy), button("Stop", finish)); host.append(playback);
    if (!q.done) host.append(button("Done — hear full reference", () => { finishPerformance(q,performance.now()); save(); return play(true,false); }, busy || !heard || q.performanceEndedAt === undefined));
    const board = el("section"); board.className = "progression-answer-board instrumental-board"; board.setAttribute("aria-label", "Instrumental reproduction board");
    board.append(el("h2", q.done && referenceHeard ? "Check your playing" : "Listen, then play by ear"));
    q.config.chords.forEach((chord, occurrence) => {
      const group = el("fieldset"), legend = el("legend", `${occurrence + 1} · ${chord.symbol}`); group.className = "progression-chord-group"; legend.dataset.chord = String(occurrence);
      const duration = el("span", `${chord.beats} beats`); duration.className = "chord-duration"; legend.append(duration); group.append(legend);
      const grid = el("div"); grid.className = "progression-note-grid";
      q.notes.filter(n => n.occurrence === occurrence).forEach(n => {
        const row = el("section"); row.setAttribute("role","group"); row.setAttribute("aria-label", `${occurrence + 1} · ${chord.symbol} · note ${n.position + 1}`);
        row.append(el("h3", `Note ${n.position + 1}`));
        if (referenceHeard || q.submitted) {
          const degree = el("p",n.degree); degree.className = "progression-target-degree"; row.append(degree);
          if (q.submitted) row.append(el("p", n.correct ? "Correct · self-rated" : `Incorrect · ${n.answer === "unknown" ? "Unknown" : n.answer}`));
          else {
            const item = el("label"), check = el("input"); check.type = "checkbox"; check.checked = n.id in errorDraft; check.dataset.control = "error:" + n.id;
            check.onchange = () => { if(check.checked) errorDraft[n.id] = "unknown"; else delete errorDraft[n.id]; render(); };
            item.append(check,el("span","Incorrect")); row.append(item);
            if (check.checked) row.append(select("Degree you played · " + (occurrence + 1) + "/" + (n.position + 1), errorDraft[n.id], ["unknown", ...optionsFor(n.chord,n.degree).filter(d=>d!==n.degree)], value => { errorDraft[n.id] = value; }));
          }
        } else row.append(el("p","Target hidden"));
        grid.append(row);
      });
      group.append(grid); board.append(group);
    });
    if (referenceHeard && !q.submitted) {
      const controls = el("div"); controls.className = "actions";
      const commit = (errors: Record<string,string>) => { assessPerformance(q,errors); save(); render(); };
      controls.append(button("All correct",()=>commit({})), button("Remaining notes correct and submit",()=>commit(errorDraft))); board.append(controls);
    }
    const title = board.querySelector("h2")!; title.dataset.control = "answer-board-title"; title.tabIndex = -1;
    host.append(board);
    if (q.submitted) host.append(summary([q]), button(activeRun!.config.count && activeRun!.questions.length >= activeRun!.config.count ? "Finish" : "Next question", () => { if(activeRun!.config.count && activeRun!.questions.length >= activeRun!.config.count) finish(); else next(); }, busy));
  }
  const hidden = () => {
    if (document.hidden && (busy || (question && isPlayByEar(question.config.mode) && !question.done && view === "practice"))) {
      if (question && isPlayByEar(question.config.mode) && !question.done) { question.interrupted = true; delete question.performanceEndedAt; heard = false; }
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
