import {
  degrees,
  recognitionDegrees,
  qualities,
  type Quality,
  parseChord,
  spellTarget,
} from "./theory.js";
import { phrases, phraseNoteName } from "./phrases.js";
import { drawBass, drawScore } from "./views.js";
import { bassTarget } from "./bass.js";
import { progressionBank, parseProgression } from "./progressions.js";
import { skillStats, confusions, type Grouping } from "./insights.js";
import {
  defaults,
  generate,
  keys,
  loadSessions,
  saveSession,
  recommendation,
  loadProgressions,
  validateConfig,
  isRecognition,
  isSequential,
  loadFavorites,
  type Config,
  type Challenge,
  type Session,
  type Grade,
  type Mode,
} from "./model.js";
import { AudioEngine } from "./audio.js";
import { sessionQuestion, createSession } from "./lifecycle.js";
import { installFlow } from "./flow.js";

const el = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T;
const audio = new AudioEngine();
let customs = loadProgressions(localStorage);
let config: Config = { ...defaults };
try {
  const saved = JSON.parse(localStorage.getItem(keys.config) || "null");
  if (saved && typeof saved === "object") config = { ...defaults, ...saved };
} catch {}
let challenge: Challenge | null = null,
  session: Session | null = null;
let step = 0,
  index = 0,
  replays = 0,
  started = 0,
  elapsed = 0;
let revealed = false,
  graded = false,
  paused = false,
  busy = false;
let phaseTimer = 0;
let predictionTimer = 0,
  visualFrame = 0,
  predictionDeadline = 0,
  predictionRemaining = 0;
let contextPending = false,
  operation = 0;
let selected: string[] = [];
let completedQuestions = new Set<number>();
let referenceSeen = false,
  referenceAssisted = false;
let selectedQualities: string[] = [];
let performanceRunning = false,
  phraseStage = 0,
  bassStage = 0,
  bassSelection: number | undefined;
let marks = new Set<number>(),
  pendingReview: Challenge | null = null;
const continuous = () =>
  config.mode === "m5" && config.runMode === "continuous";
let sessionStarted = 0,
  sessionPausedAt = 0,
  sessionPausedMs = 0;
let hasPlayed = false;
let autoTimer = 0;
let flow: ReturnType<typeof installFlow> | undefined;
let playbackOverrides: Partial<Config> = {};
const playbackConfig = () => ({ ...config, ...playbackOverrides });
const status = (text: string) => {
  el("status").textContent = text;
};
const button = (id: string, enabled: boolean) => {
  el<HTMLButtonElement>(id).disabled = !enabled;
};
function stopAudio(): void {
  window.clearTimeout(autoTimer);
  autoTimer = 0;
  performanceRunning = false;
  audio.stop();
  window.clearTimeout(phaseTimer);
  phaseTimer = 0;
  window.clearInterval(predictionTimer);
  predictionTimer = 0;
  window.cancelAnimationFrame(visualFrame);
  visualFrame = 0;
  el("countdown").textContent = "";
}
function armPrediction(
  seconds = config.mode === "m5"
    ? (config.gapBeats * 60) / config.bpm
    : config.predictionUnit === "beats"
      ? ((config.predictionBeats ?? 2) * 60) /
        (playbackOverrides.bpm ?? config.bpm)
      : config.predictionSeconds,
): void {
  if (
    !challenge ||
    revealed ||
    paused ||
    !isSequential(config) ||
    config.revealMode !== "timed"
  )
    return;
  predictionRemaining = seconds;
  predictionDeadline = performance.now() + seconds * 1000;
  const update = () => {
    predictionRemaining = Math.max(
      0,
      (predictionDeadline - performance.now()) / 1000,
    );
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
function followAudio(offset = 0): void {
  const update = () => {
    const position = audio.position;
    const event = audio.plan.events.find(
      (e) => position >= e.start && position < e.start + e.duration,
    );
    el("chart")
      .querySelectorAll("span")
      .forEach((span, i) =>
        span.classList.toggle("active", !!event && i === event.index + offset),
      );
    if (position < audio.plan.duration)
      visualFrame = requestAnimationFrame(update);
  };
  visualFrame = requestAnimationFrame(update);
}
function startPerformance(): void {
  if (!challenge) return;
  contextPending = false;
  performanceRunning = true;
  revealed = false;
  audio.play(challenge.targets, playbackConfig(), true, false, {
    countIn: config.countIn,
    gapBeats: config.gapBeats,
  });
  render();
  followPerformance();
  status("Continuous run: anticipate each target before its chord.");
}
function followPerformance(): void {
  const update = () => {
    if (!challenge || paused || !performanceRunning) return;
    const position = audio.position,
      events = audio.plan.events;
    if (position >= audio.plan.duration) {
      performanceRunning = false;
      revealed = true;
      referenceSeen = true;
      elapsed = Math.max(0, position);
      step = challenge.targets.length - 1;
      el("countdown").textContent = "";
      render();
      status(
        "Run complete. Compare the line and assess the whole performance.",
      );
      return;
    }
    const upcoming = events.find((event) => event.start > position);
    const sounding = events.find(
      (event) =>
        position >= event.start && position < event.start + event.duration,
    );
    const index = upcoming?.index ?? events[events.length - 1].index,
      target = challenge.targets[index];
    el("phase").textContent =
      position < 0 || position < audio.plan.countIn ? "COUNT IN" : "ANTICIPATE";
    el("prompt").textContent =
      `${config.showChords ? target.chord.symbol : "Next chord"}: ${target.degree}${target.secondDegree ? " + " + target.secondDegree : ""}`;
    el("countdown").textContent = upcoming
      ? `${(((upcoming.start - position) * config.bpm) / 60).toFixed(1)} beats until the next chord`
      : "Complete the final chord.";
    const played = events.filter((event) => position >= event.start);
    if (played.length) referenceSeen = true;
    el("run-reference").textContent = played
      .map((event) => {
        const t = challenge!.targets[event.index];
        return `${t.chord.symbol}: ${t.name}${t.secondDegree && position >= event.start + event.duration / 2 ? " / " + spellTarget(t.chord, t.secondDegree) : ""}`;
      })
      .join(" | ");
    el("chart")
      .querySelectorAll("span")
      .forEach((span, i) =>
        span.classList.toggle("active", i === sounding?.index),
      );
    visualFrame = requestAnimationFrame(update);
  };
  visualFrame = requestAnimationFrame(update);
}
function renderPhrase(): void {
  const phrase = challenge?.phrase;
  if (!phrase) return;
  const stages = [
    "Listen without notation",
    "Sing the phrase back",
    "Mark the structural targets",
    "Predict the next chord target",
    "Compare the phrase",
    "Play the phrase on bass",
    "Vary the phrase",
  ];
  el("prompt").textContent = stages[phraseStage];
  el("instruction").textContent =
    phraseStage === 3
      ? `${phrase.chords[1]}: sing the ${challenge!.targets[1].degree} before revealing.`
      : phraseStage === 2
        ? "Mark the attacks that sound like structural targets."
        : "Listen, sing, predict, then compare and play.";
  el("phrase-credit").textContent = phrase.license;
  const button = el<HTMLButtonElement>("phrase-step");
  button.hidden = phraseStage === 3;
  button.disabled = !!phaseTimer || !hasPlayed;
  button.textContent =
    phraseStage === 6
      ? "Apply next variation"
      : stages[Math.min(6, phraseStage + 1)];
  const holder = el("phrase-marks");
  holder.replaceChildren();
  if (phraseStage === 2) {
    let beat = 1;
    phrase.notes.forEach((note, i) => {
      const button = document.createElement("button");
      button.className = "secondary";
      button.textContent = `Beat ${beat}`;
      button.setAttribute("aria-pressed", String(marks.has(i)));
      button.onclick = () => {
        if (marks.has(i)) marks.delete(i);
        else marks.add(i);
        renderPhrase();
        store();
      };
      holder.append(button);
      beat += note.beats;
    });
  }
  if (phraseStage >= 4) drawScore(el("phrase-score"), phrase, marks);
  else el("phrase-score").replaceChildren();
  if (phraseStage >= 5) {
    const target = challenge!.targets[0];
    const midi = bassTarget(
      target.midi % 12,
      config.bassLow,
      config.bassHigh,
      config.fretLow,
      config.fretHigh,
    );
    el("fretboard").hidden = false;
    drawBass(
      el("fretboard"),
      config.fretLow,
      config.fretHigh,
      config.fretNames,
      midi,
      bassSelection,
      (chosen) => {
        bassSelection = chosen;
        renderPhrase();
        store();
      },
    );
    el("bass-stage").hidden = true;
    el("bass-result").textContent =
      "Start from a highlighted target position, then transfer the complete phrase by ear.";
  }
}
function renderBassTask(): void {
  const target = challenge?.targets[0];
  if (!target) return;
  const sing = config.bassTask === "sing-play" && bassStage === 0;
  el("prompt").textContent = sing
    ? "Sing it before finding it on bass"
    : config.bassTask === "next-beat"
      ? "Play the target on the cue"
      : "Find the target on bass";
  el("instruction").textContent = sing
    ? "Hear the target, sing it, then move to the instrument."
    : "Keep the sound in mind and find it in your selected position.";
  el("bass-stage").hidden = !sing;
  el("bass-stage").textContent = "I sang it";
  el<HTMLButtonElement>("bass-stage").disabled = !!phaseTimer || !hasPlayed;
  el("fretboard").hidden = sing;
  if (!sing)
    drawBass(
      el("fretboard"),
      config.fretLow,
      config.fretHigh,
      config.fretNames,
      revealed ? target.midi : undefined,
      bassSelection,
      (midi) => {
        bassSelection = midi;
        renderBassTask();
        store();
      },
    );
  el("bass-result").textContent = !revealed
    ? bassSelection === undefined
      ? ""
      : "Position selected."
    : bassSelection === undefined
      ? "Reference positions highlighted. Self-assess your playing."
      : bassSelection % 12 === target.midi % 12
        ? "Selected pitch class matches the reference. Self-assess your playing."
        : "Selected pitch class differs from the reference. Compare and try again.";
}
function renderReferences(): void {
  const holder = el("reference-tools");
  holder.replaceChildren();
  if (!challenge) return;
  challenge.targets
    .filter((_, i) => !isSequential(config) || continuous() || i <= step)
    .forEach((target) => {
      for (const [label, melody, only] of [
        ["Chord", false, false],
        ["Target", true, true],
        ["Together", true, false],
      ] as const) {
        const button = document.createElement("button");
        button.className = "secondary";
        button.textContent = `${target.chord.symbol}: ${label}`;
        button.onclick = safe(async () => {
          await audio.ready();
          stopAudio();
          audio.play([target], playbackConfig(), melody, only);
        });
        holder.append(button);
      }
    });
}
function renderReview(): void {
  const holder = el("review-list");
  holder.replaceChildren();
  const favorites = loadFavorites(localStorage);
  if (!favorites.length) {
    holder.textContent = "No saved challenges yet.";
    return;
  }
  favorites.forEach((favorite) => {
    const row = document.createElement("article");
    row.className = "path-row";
    const title = document.createElement("strong");
    title.textContent = `${favorite.config.mode.toUpperCase()} / ${favorite.challenge.targets.map((t) => t.chord.symbol).join(" / ")}`;
    const practice = document.createElement("button");
    practice.textContent = "Practice";
    practice.onclick = safe(async () => {
      if (flow) {
        await flow.practiceFavorite(favorite);
        return;
      }
      resetChallenge();
      config = { ...defaults, ...favorite.config };
      if (
        ![...progressionBank, ...customs].some(
          (p) => p.id === config.progression,
        )
      )
        config.progression = defaults.progression;
      populate();
      updateViews();
      pendingReview = favorite.challenge;
      await start();
    });
    const remove = document.createElement("button");
    remove.className = "secondary";
    remove.textContent = "Remove";
    remove.onclick = safe(() => {
      localStorage.setItem(
        keys.favorites,
        JSON.stringify(
          loadFavorites(localStorage).filter((f) => f.id !== favorite.id),
        ),
      );
      renderReview();
    });
    row.append(title, practice, remove);
    holder.append(row);
  });
}
function store(): void {
  try {
    localStorage.setItem(keys.config, JSON.stringify(config));
    if (session) {
      if (sessionStarted && session.timeSource === "active-session")
        session.totalTime = Math.max(
          0,
          (performance.now() -
            sessionStarted -
            sessionPausedMs -
            (paused && sessionPausedAt
              ? performance.now() - sessionPausedAt
              : 0)) /
            1000,
        );
      if (challenge)
        session.progress = {
          index,
          step,
          revealed,
          graded,
          replays,
          elapsed,
          referenceSeen,
          referenceAssisted,
          selected: [...selected],
          selectedQualities: [...selectedQualities],
          phraseStage,
          bassStage,
          bassSelection,
          marks: [...marks],
          hasPlayed,
          completedQuestions: [...completedQuestions],
          contextPending,
        };
      saveSession(localStorage, session);
    }
  } catch {
    status(
      "Browser storage is unavailable or full. This session may not survive a refresh.",
    );
  }
}
function updateViews(view = "free"): void {
  for (const name of ["free", "path", "history", "insights", "review"]) {
    el(name + "-view").hidden = name !== view;
    el(name + "-tab").setAttribute("aria-selected", String(name === view));
  }
  if (view !== "free" && challenge && !paused) togglePause();
  renderHistory();
  renderReview();
}
function populate(): void {
  el<HTMLSelectElement>("quality").replaceChildren(
    ...qualities.map((q) => new Option(q, q)),
  );
  el<HTMLSelectElement>("phraseId").replaceChildren(
    ...phrases.map((p) => new Option(p.name, p.id)),
  );
  el<HTMLSelectElement>("degree").replaceChildren(
    ...degrees.map((degree) => new Option(degree, degree)),
  );
  el<HTMLSelectElement>("progression").replaceChildren(
    ...[...progressionBank, ...customs].map((p) => new Option(p.name, p.id)),
  );
  for (const key of Object.keys(defaults) as (keyof Config)[]) {
    const input = el<HTMLInputElement | HTMLSelectElement>(key);
    if (typeof defaults[key] === "boolean")
      (input as HTMLInputElement).checked = Boolean(config[key]);
    else input.value = String(config[key]);
  }
  modeUI();
  editorUI();
}
function modeUI(): void {
  const single =
    config.mode === "m1" || config.mode === "m2" || config.mode === "m7";
  const progression = ["m3", "m4", "m5"].includes(config.mode);
  el("single-settings").hidden = !single;
  el("degree-setting").hidden = config.mode !== "m1" && config.mode !== "m7";
  el("recognition-setting").hidden = config.mode !== "m2";
  el("blind-quality-setting").hidden =
    config.mode !== "m2" || config.showChords;
  el("quality").closest("label")!.hidden =
    config.mode === "m2" && !config.showChords;
  el("progression-settings").hidden = !progression;
  el("sequence-settings").hidden = !progression;
  el("path-setting").hidden = !isSequential(config);
  el<HTMLSelectElement>("path").querySelector<HTMLOptionElement>(
    'option[value="nearest"]',
  )!.textContent = ["chord", "tensions"].includes(config.targetLimit)
    ? "Nearest allowed target"
    : "Nearest 3rd / 7th";
  el("common-mode-setting").hidden = config.mode !== "m3";
  el("reveal-mode-setting").hidden = !isSequential(config);
  el("prediction-setting").hidden = config.mode !== "m4";
  el("gap-setting").hidden = config.mode !== "m5";
  el("custom-editor").hidden = !progression;
  el("performance-settings").hidden = config.mode !== "m5";
  el("target-limit-setting").hidden = !isSequential(config);
  el("phrase-settings").hidden = config.mode !== "m6";
  el("bass-settings").hidden = config.mode !== "m7" && config.mode !== "m6";
  el("bassTask").closest("label")!.hidden = config.mode !== "m7";
  el("recognize").hidden = config.mode !== "m1";
  el<HTMLSelectElement>("context").disabled = config.mode === "m3";
}
function readConfig(): Config {
  const next = { ...config };
  for (const key of Object.keys(defaults) as (keyof Config)[]) {
    const input = el<HTMLInputElement | HTMLSelectElement>(key);
    const value =
      typeof defaults[key] === "boolean"
        ? (input as HTMLInputElement).checked
        : typeof defaults[key] === "number"
          ? Number(input.value)
          : input.value;
    (next as unknown as Record<string, unknown>)[key] = value;
  }
  if (next.rangePreset === "voice") {
    next.low = next.vocalLow;
    next.high = next.vocalHigh;
  }
  if (next.rangePreset === "bass") {
    next.low = next.bassLow;
    next.high = next.bassHigh;
  }
  return validateConfig(next, customs);
}
function render(): void {
  const active = !!challenge;
  for (const id of ["pause", "retry", "skip", "favorite", "context-only"])
    el(id).hidden = !active;
  el("retry").hidden = !active || !hasPlayed || (!revealed && !graded);
  el("favorite").hidden = !active || !revealed;
  el("skip").hidden = !active || graded;
  el("reveal").hidden = revealed;
  el("next").hidden = !graded;
  el("replay").textContent = revealed ? "Replay both" : "Replay context";
  button("start", !busy);
  el("start").textContent = active ? "Play context" : "Start";
  el("start").hidden = active && hasPlayed;
  button("pause", active);
  button("retry", active && !paused);
  button("skip", active && !paused);
  button("replay", active && !paused);
  button("reveal", active && hasPlayed && !paused && !revealed && !phaseTimer);
  button("next", active && !paused && graded);
  button("favorite", active && !paused);
  button("context-only", active && !paused);
  el("phrase-panel").hidden = !active || config.mode !== "m6" || paused;
  el("bass-panel").hidden =
    !active ||
    paused ||
    !(config.mode === "m7" || (config.mode === "m6" && phraseStage >= 5));
  el("reference-tools").hidden = !active || paused || !revealed;
  el("reference-details").hidden = !active || paused || !revealed;
  el("run-reference").hidden = !active || paused || !continuous();
  if (performanceRunning) {
    button("reveal", false);
    button("retry", false);
    button("replay", false);
    button("context-only", false);
  }
  if (config.mode === "m6" && phraseStage < 3) button("reveal", false);
  if (
    config.mode === "m7" &&
    bassStage === 0 &&
    config.bassTask === "sing-play"
  )
    button("reveal", false);
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
  if (!challenge) return;
  const targets = challenge.targets;
  const chart = el("chart");
  chart.hidden =
    !config.showProgression ||
    !!(
      config.hideChartAfterListening &&
      hasPlayed &&
      !contextPending &&
      !revealed &&
      !performanceRunning
    );
  chart.replaceChildren();
  targets.forEach((target, i) => {
    const span = document.createElement("span");
    span.textContent = config.showChords
      ? `${target.bar ? "Bar " + target.bar + ": " : ""}${target.chord.symbol}`
      : `Chord ${i + 1}`;
    span.className = i === step ? "active" : "";
    chart.append(span);
  });
  el("session-count").textContent =
    `Question ${index + 1}${session?.questionCount ? " / " + session.questionCount : ""}`;
  if (paused) {
    el("phase").textContent = "PAUSED";
    el("prompt").textContent = "Practice paused";
    flow?.onRender();
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
    el("instruction").textContent = config.showChords
      ? "Listen to the chord and melody. Choose the melody's role in this chord."
      : "Hear the root, chord and melody. Choose the quality, then the degree.";
  }
  if (isSequential(config)) {
    el("prompt").textContent =
      `${config.showChords ? targets[step].chord.symbol : "Next chord"}: sing the ${targets[step].degree}`;
    el("instruction").textContent =
      config.hintLevel === "minimal"
        ? "Sing the next target before hearing its chord."
        : `From ${config.showChords ? targets[step - 1].chord.symbol : "the current note"}: ${targets[step - 1].name}. Sing the next target before hearing its chord.`;
  }
  if (continuous() && !revealed) {
    el("prompt").textContent = "Sing each next target before its chord";
    el("instruction").textContent =
      "Keep the line moving. Assess the complete run afterwards.";
  }
  if (config.mode === "m6") renderPhrase();
  if (config.mode === "m7") renderBassTask();
  if (revealed)
    el("answer").textContent =
      (config.mode === "m3" || continuous() || config.mode === "m6"
        ? targets
        : [targets[step]]
      )
        .map(
          (t) =>
            `${t.name} = ${t.degree}${t.secondDegree ? " + " + spellTarget(t.chord, t.secondDegree) + " = " + t.secondDegree : ""} over ${t.chord.symbol}`,
        )
        .join(" / ") +
      (config.mode === "m3" && targets.some((t) => t.degree === "11")
        ? ". The 11 is a tension; its treatment depends on context."
        : "");
  if (revealed) renderReferences();
  store();
  flow?.onRender();
}
function playContext(): void {
  if (!challenge) return;
  hasPlayed = true;
  status("Listen to the context, then respond.");
  if (!revealed && !contextPending)
    elapsed += Math.max(0, performance.now() - started) / 1000;
  stopAudio();
  if (continuous()) {
    startPerformance();
    return;
  }
  contextPending = true;
  const targets = isSequential(config)
    ? [challenge.targets[step - 1]]
    : challenge.targets;
  const duration =
    config.mode === "m6" && challenge.phrase
      ? audio.playPhrase(challenge.phrase, playbackConfig(), phraseStage === 3)
      : audio.play(
          targets,
          playbackConfig(),
          isSequential(config) || isRecognition(config) || config.mode === "m7",
          false,
          {
            countIn: config.countIn,
            repeats: config.mode === "m3" ? config.repeats : 1,
            seed: config.mode === "m3" && !isRecognition(config),
            cueAtEnd: config.mode === "m7" && config.bassTask === "next-beat",
            rootAnchor: config.mode === "m2" && !config.showChords,
          },
        );
  phaseTimer = window.setTimeout(() => {
    phaseTimer = 0;
    contextPending = false;
    started = performance.now();
    render();
    armPrediction();
    status(
      isRecognition(config)
        ? "Choose your answer, then check it."
        : "Sing or play the target, then reveal the reference.",
    );
    if (config.mode === "m7" && config.bassTask === "next-beat")
      status("Play now.");
  }, duration * 1000);
  render();
  followAudio(isSequential(config) ? step - 1 : 0);
  el("phase").textContent = "ESTABLISH CONTEXT";
}
function renderChoices(): void {
  const holder = el("choices");
  holder.replaceChildren();
  selected = [];
  selectedQualities = [];
  if (!challenge || !isRecognition(config)) return;
  challenge.targets.forEach((target, i) => {
    const label = document.createElement("label");
    label.textContent = config.showChords
      ? target.chord.symbol
      : `Chord ${i + 1}`;
    const select = document.createElement("select");
    select.setAttribute("aria-label", `Role over chord ${i + 1}`);
    const fillOptions = (quality: Quality) => {
      select.replaceChildren(
        new Option("Choose degree", ""),
        ...recognitionDegrees({ ...target.chord, quality }).map(
          (d) => new Option(d, d),
        ),
      );
    };
    if (!config.showChords) {
      const qualitySelect = document.createElement("select");
      qualitySelect.setAttribute("aria-label", `Quality of chord ${i + 1}`);
      qualitySelect.append(
        new Option("Choose quality", ""),
        ...qualities.map((q) => new Option(q, q)),
      );
      select.disabled = true;
      qualitySelect.onchange = () => {
        selectedQualities[i] = qualitySelect.value;
        selected[i] = "";
        select.disabled = !qualitySelect.value;
        if (qualitySelect.value) fillOptions(qualitySelect.value as Quality);
        store();
      };
      label.append(qualitySelect);
    } else fillOptions(target.chord.quality);
    select.addEventListener("change", () => {
      selected[i] = select.value;
      store();
    });
    label.append(select);
    holder.append(label);
  });
}
function newQuestion(play = true): void {
  stopAudio();
  challenge =
    pendingReview ??
    (session
      ? sessionQuestion(session, index)
      : generate(config, index, customs));
  pendingReview = null;
  step = isSequential(config) ? 1 : 0;
  revealed = false;
  graded = false;
  paused = false;
  replays = 0;
  elapsed = 0;
  referenceSeen = false;
  referenceAssisted = false;
  contextPending = true;
  hasPlayed = false;
  phraseStage = 0;
  bassStage = 0;
  bassSelection = undefined;
  marks = new Set();
  el("run-reference").textContent = "";
  started = performance.now();
  renderChoices();
  render();
  if (play) playContext();
  else {
    el("phase").textContent = "READY";
    status("Press Play context when ready.");
    store();
    return;
  }
  el("phase").textContent = "ESTABLISH CONTEXT";
  button("reveal", false);
  status(
    continuous()
      ? "Continuous performance is running."
      : isSequential(config)
        ? "The next chord is held until you request it."
        : "Listen, then respond when ready.",
  );
}
async function start(): Promise<void> {
  if (challenge && session) {
    await audio.ready();
    if (paused) await togglePause();
    playContext();
    return;
  }
  if (busy) return;
  busy = true;
  button("start", false);
  try {
    const next = readConfig();
    const currentOperation = ++operation;
    await audio.ready();
    if (currentOperation !== operation) return;
    if (session) store();
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
      timeSource: "active-session",
    };
    sessionStarted = performance.now();
    sessionPausedAt = 0;
    sessionPausedMs = 0;
    newQuestion();
    store();
  } catch (error) {
    status((error as Error).message);
  } finally {
    busy = false;
    render();
  }
}
function record(grade: Grade, source: "self" | "automatic"): void {
  if (!challenge || !session || graded) return;
  const targets = (
    isSequential(config) && !continuous()
      ? [challenge.targets[step]]
      : challenge.targets
  ).flatMap((t) =>
    t.secondDegree && t.secondMidi !== undefined
      ? [
          t,
          {
            ...t,
            degree: t.secondDegree,
            midi: t.secondMidi,
            name: spellTarget(t.chord, t.secondDegree),
          },
        ]
      : [t],
  );
  const latency =
    elapsed + (revealed ? 0 : Math.max(0, performance.now() - started) / 1000);
  session.records.push({
    questionIndex: index,
    chordStep: step,
    timestamp: new Date().toISOString(),
    mode: config.mode,
    config: { ...config },
    chords: targets.map((t) => t.chord.symbol),
    targets: targets.map((t) => t.degree),
    actualNotes: targets.map((t) => t.name),
    actualMidis: targets.map((t) => t.midi),
    ...(config.mode === "m7" && bassSelection !== undefined
      ? { selectedPosition: bassSelection }
      : {}),
    progressionId: challenge.progressionId,
    responseLatency: latency,
    gradingSource: source,
    grade,
    replayCount: replays,
    ...(source === "automatic"
      ? {
          selectedDegrees: [...selected],
          ...(!config.showChords
            ? { selectedQualities: [...selectedQualities] }
            : {}),
        }
      : {}),
    referenceAssisted,
  });
  graded = true;
  if (
    !completedQuestions.has(index) &&
    (!isSequential(config) ||
      continuous() ||
      step === challenge.targets.length - 1)
  ) {
    session.completedCount++;
    completedQuestions.add(index);
  }
  store();
  render();
  status(
    source === "automatic"
      ? grade === "correct"
        ? "Correct. Compare the target with its harmonic context."
        : "Compare your answers with the reference, then retry or continue."
      : `Self-assessment saved: ${grade}.`,
  );
  if (config.autoAdvance && !paused)
    autoTimer = window.setTimeout(() => {
      if (graded && !paused) safe(next)();
    }, 1200);
}
async function reveal(): Promise<void> {
  if (!challenge || !hasPlayed || revealed || paused || phaseTimer) return;
  if (performanceRunning) return;
  if (config.mode === "m6" && phraseStage < 3) return;
  if (
    config.mode === "m7" &&
    bassStage === 0 &&
    config.bassTask === "sing-play"
  )
    return;
  if (isRecognition(config) && challenge.targets.some((_, i) => !selected[i])) {
    status("Choose one degree for each chord first.");
    return;
  }
  const currentChallenge = challenge;
  await audio.ready();
  if (challenge !== currentChallenge || paused || revealed) return;
  stopAudio();
  elapsed += Math.max(0, performance.now() - started) / 1000;
  started = performance.now();
  revealed = true;
  referenceSeen = true;
  if (config.mode === "m6" && challenge.phrase) {
    phraseStage = 4;
    audio.playPhrase(challenge.phrase, playbackConfig());
  } else
    audio.play(
      config.mode === "m3" ? challenge.targets : [challenge.targets[step]],
      playbackConfig(),
      true,
    );
  render();
  followAudio(config.mode === "m3" ? 0 : step);
  if (isRecognition(config))
    record(
      challenge.targets.every(
        (t, i) =>
          t.degree === selected[i] &&
          (config.showChords || selectedQualities[i] === t.chord.quality),
      )
        ? "correct"
        : "missed",
      "automatic",
    );
  else status("Compare with the reference, then choose your self-assessment.");
}
function next(): void {
  if (!challenge || !graded) return;
  if (
    isSequential(config) &&
    !continuous() &&
    step < challenge.targets.length - 1
  ) {
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
  if (session?.questionCount && index >= session.questionCount) {
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
    sessionStarted = 0;
    if (session) {
      session.status = "completed";
      session.endedAt = new Date().toISOString();
      saveSession(localStorage, session);
      flow?.showSummary(session.id);
    }
    renderHistory();
    return;
  }
  newQuestion();
}
async function togglePause(): Promise<void> {
  if (!challenge) return;
  if (!paused) sessionPausedAt = performance.now();
  else if (sessionPausedAt) {
    sessionPausedMs += performance.now() - sessionPausedAt;
    sessionPausedAt = 0;
  }
  if (performanceRunning) {
    if (!paused) {
      paused = true;
      cancelAnimationFrame(visualFrame);
      await audio.pause();
    } else {
      await audio.ready();
      paused = false;
      followPerformance();
    }
    render();
    status(paused ? "Performance paused." : "Performance resumed.");
    if (session) session.status = paused ? "paused" : "active";
    store();
    return;
  }
  if (!paused) {
    if (!revealed && !contextPending)
      elapsed += Math.max(0, performance.now() - started) / 1000;
    if (predictionTimer)
      predictionRemaining = Math.max(
        0,
        (predictionDeadline - performance.now()) / 1000,
      );
    stopAudio();
    paused = true;
  } else {
    paused = false;
    started = performance.now();
    if (contextPending && hasPlayed) playContext();
    else if (!revealed) armPrediction(predictionRemaining);
  }
  render();
  if (session) session.status = paused ? "paused" : "active";
  store();
  status(
    paused
      ? "Audio stopped. Your challenge is preserved."
      : "Resumed. Replay context when ready.",
  );
}
function resetChallenge(): void {
  operation++;
  if (session) store();
  sessionStarted = 0;
  stopAudio();
  challenge = null;
  session = null;
  revealed = false;
  graded = false;
  paused = false;
  contextPending = false;
  predictionRemaining = 0;
  pendingReview = null;
  phraseStage = 0;
  bassStage = 0;
  el("phrase-score").replaceChildren();
  el("fretboard").replaceChildren();
  el("reference-tools").replaceChildren();
  el("run-reference").textContent = "";
  el("chart").replaceChildren();
  el("choices").replaceChildren();
  el("answer").hidden = true;
  el("prompt").textContent = "Hear the harmony. Imagine the target.";
  el("phase").textContent = "READY";
  el("session-count").textContent = "No active session";
  render();
}
function renderHistory(): void {
  const sessions = loadSessions(localStorage),
    records = sessions.flatMap((s) => s.records);
  const self = records.filter(
      (r) =>
        r.gradingSource === "self" &&
        r.grade !== "skipped" &&
        !r.referenceAssisted,
    ),
    automatic = records.filter(
      (r) =>
        r.gradingSource === "automatic" &&
        r.grade !== "skipped" &&
        !r.referenceAssisted,
    );
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
      detail.textContent = `${s.completedCount} completed / ${s.records.length} assessments / ${s.totalTime.toFixed(1)}s ${s.timeSource === "active-session" ? "active practice" : "recorded response time"}`;
      row.append(title, detail);
      list.append(row);
    });
  el("recommendation").textContent = recommendation(sessions).text;
  renderInsights(sessions);
}
function renderInsights(sessions: Session[]): void {
  const grouping = el<HTMLSelectElement>("insight-group").value as Grouping;
  const stats = skillStats(sessions, grouping);
  const name = (id: string) =>
    [...progressionBank, ...customs].find((p) => p.id === id)?.name ?? id;
  renderTable(
    "skill-stats",
    [
      "Mode",
      "Skill",
      "Assessment",
      "Results",
      "Mean question response",
      "Mean replays",
    ],
    stats.map((s) => [
      s.mode.toUpperCase(),
      grouping === "progression" ? name(s.label) : s.label,
      s.source === "self" ? "Self-assessment" : "Recognition",
      s.source === "self"
        ? `${s.correct} correct / ${s.close} close / ${s.missed} missed`
        : `${s.correct}/${s.count} (${Math.round((s.correct / s.count) * 100)}%)`,
      `${(s.time / s.count).toFixed(2)}s`,
      (s.replays / s.count).toFixed(1),
    ]),
  );
  renderTable(
    "confusions",
    ["Expected", "Selected", "Count"],
    confusions(sessions.flatMap((s) => s.records)).map((row) => [
      row.expected,
      row.selected,
      String(row.count),
    ]),
  );
}
function renderTable(id: string, headers: string[], rows: string[][]): void {
  const holder = el(id);
  holder.replaceChildren();
  if (!rows.length) {
    const p = document.createElement("p");
    p.textContent = "No results yet.";
    holder.append(p);
    return;
  }
  const table = document.createElement("table"),
    head = document.createElement("thead"),
    tr = document.createElement("tr");
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
function editorUI(): void {
  const progression = customs.find((p) => p.id === config.progression);
  button("custom-delete", !!progression);
  el("custom-save").textContent = progression
    ? "Update progression"
    : "Save progression";
  if (progression) {
    el<HTMLInputElement>("custom-name").value = progression.name;
    el<HTMLTextAreaElement>("custom-score").value = progression.chords
      .map((chord, i) => `${chord} ${progression.beats?.[i] ?? 4}`)
      .join("\n");
  }
}
function usePreset(
  mode: Mode,
  degree = "3",
  preset: Partial<Config> = {},
): void {
  resetChallenge();
  config = { ...defaults, ...preset, mode, degree };
  if (
    ![...progressionBank, ...customs].some((p) => p.id === config.progression)
  )
    config.progression = defaults.progression;
  populate();
  store();
  updateViews();
  status("Preset ready. Adjust settings or press Start.");
}
const paths: [string, string, Mode | null, string][] = [
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
  [
    "F. Jazz language",
    "Original phrases, target anticipation and bass mapping.",
    "m6",
    "3",
  ],
  [
    "G. Ear to bass",
    "Sing, locate and play in your selected bass position.",
    "m7",
    "3",
  ],
];
paths.forEach(([title, description, mode, degree]) => {
  const row = document.createElement("article");
  row.className = "path-row";
  const text = document.createElement("div"),
    heading = document.createElement("strong"),
    body = document.createElement("p");
  heading.textContent = title;
  body.textContent = description;
  text.append(heading, body);
  row.append(text);
  if (mode) {
    const action = document.createElement("button");
    action.textContent = "Practice";
    action.onclick = () =>
      usePreset(
        mode,
        degree,
        title.startsWith("E")
          ? {
              progression: "giant-centers",
              path: "nearest",
              runMode: "continuous",
            }
          : title.startsWith("D")
            ? { runMode: "continuous", path: "nearest" }
            : {},
      );
    row.append(action);
  } else if (title.startsWith("D")) {
    const link = document.createElement("a");
    link.href = "../drone/";
    link.textContent = "Open drone";
    row.append(link);
  }
  el("path-list").append(row);
});
function safe(action: () => void | Promise<void>): () => Promise<void> {
  return async () => {
    try {
      await action();
    } catch (error) {
      stopAudio();
      status((error as Error).message);
    }
  };
}
el("start").onclick = safe(start);
el("recognize").onclick = (event) => {
  event.preventDefault();
  usePreset("m2", config.degree, {
    ...config,
    recognitionPool: defaults.recognitionPool,
  });
};
el("reveal").onclick = safe(reveal);
el("replay").onclick = safe(async () => {
  if (config.replayLimit && replays >= config.replayLimit) {
    status("Replay limit reached. Reveal or finish this question.");
    return;
  }
  const currentChallenge = challenge;
  await audio.ready();
  if (challenge !== currentChallenge || paused || !challenge) return;
  replays++;
  if (revealed && challenge) {
    stopAudio();
    if (config.mode === "m6" && challenge.phrase)
      audio.playPhrase(challenge.phrase, playbackConfig());
    else
      audio.play(
        config.mode === "m3" || continuous()
          ? challenge.targets
          : [challenge.targets[step]],
        playbackConfig(),
        true,
      );
    followAudio(
      config.mode === "m3" || continuous() || config.mode === "m6" ? 0 : step,
    );
  } else playContext();
});
el("pause").onclick = safe(togglePause);
el("next").onclick = safe(next);
el("skip").onclick = safe(() => {
  record("skipped", isRecognition(config) ? "automatic" : "self");
  next();
});
el("retry").onclick = safe(() => {
  if (!challenge) return;
  stopAudio();
  if (referenceSeen) referenceAssisted = true;
  revealed = false;
  graded = false;
  replays++;
  elapsed = 0;
  started = performance.now();
  contextPending = true;
  if (config.mode === "m6") {
    phraseStage = 0;
    marks = new Set();
  }
  if (config.mode === "m7") {
    bassStage = 0;
    bassSelection = undefined;
  }
  renderChoices();
  render();
  playContext();
});
document.querySelectorAll<HTMLButtonElement>("[data-grade]").forEach((btn) => {
  btn.onclick = () => record(btn.dataset.grade as Grade, "self");
});
for (const view of ["free", "path", "history", "insights", "review"])
  el(view + "-tab").onclick = () => updateViews(view);
el("recommended-start").onclick = () => {
  const rec = recommendation(loadSessions(localStorage));
  usePreset(rec.mode, rec.degree, rec.config);
};
el("insight-group").onchange = () => renderInsights(loadSessions(localStorage));
el("phrase-step").onclick = safe(async () => {
  if (!challenge?.phrase || paused) return;
  if (phraseStage === 6) {
    const variants = ["rhythm", "approach", "enclosure", "original"] as const;
    const next =
      variants[
        (variants.indexOf(config.variation as (typeof variants)[number]) + 1) %
          variants.length
      ];
    if (flow) {
      await flow.varyPhrase(next);
      return;
    }
    resetChallenge();
    config.variation = next;
    populate();
    store();
    await start();
    return;
  }
  stopAudio();
  phraseStage = Math.min(6, phraseStage + 1);
  if (phraseStage === 3) {
    revealed = false;
    playContext();
  } else render();
});
el("bass-stage").onclick = () => {
  bassStage = 1;
  render();
};
el("context-only").onclick = safe(async () => {
  if (!challenge) return;
  const current = challenge;
  await audio.ready();
  if (challenge !== current || paused) return;
  stopAudio();
  audio.play(
    isSequential(config)
      ? [challenge.targets[Math.max(0, step - 1)]]
      : challenge.targets,
    playbackConfig(),
    false,
  );
  replays++;
});
el("favorite").onclick = safe(() => {
  if (!challenge) return;
  const saved = loadFavorites(localStorage);
  const id = JSON.stringify([config, challenge]);
  if (!saved.some((f) => f.id === id)) {
    localStorage.setItem(
      keys.favorites,
      JSON.stringify(
        [
          ...saved,
          {
            id,
            timestamp: new Date().toISOString(),
            config: { ...config },
            challenge,
          },
        ].slice(-100),
      ),
    );
  }
  status("Saved for review.");
  renderReview();
});
el("custom-form").onsubmit = (event) => {
  event.preventDefault();
  try {
    const existing = customs.find((p) => p.id === config.progression);
    const progression = parseProgression(
      el<HTMLTextAreaElement>("custom-score").value,
      el<HTMLInputElement>("custom-name").value,
      existing?.id ?? "custom-" + crypto.randomUUID(),
    );
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
  } catch (error) {
    el("custom-status").textContent = (error as Error).message;
  }
};
el("custom-new").onclick = () => {
  resetChallenge();
  config.progression = defaults.progression;
  populate();
  store();
  el<HTMLInputElement>("custom-name").value = "My progression";
  el<HTMLTextAreaElement>("custom-score").value = "Dm7 4\nG7 4\nCmaj7 8";
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
  } catch (error) {
    el("custom-status").textContent = (error as Error).message;
  }
};
el("settings").onchange = () => {
  if (flow) return;
  resetChallenge();
  try {
    const next = readConfig();
    config = next;
    el<HTMLInputElement>("low").value = String(config.low);
    el<HTMLInputElement>("high").value = String(config.high);
    el<HTMLSelectElement>("context").value = config.context;
    el<HTMLSelectElement>("path").value = config.path;
    el<HTMLSelectElement>("targetLimit").value = config.targetLimit;
    modeUI();
    editorUI();
    store();
    status("Settings saved. Press Start for a new session.");
  } catch (error) {
    status((error as Error).message);
  }
};
el("settings").onsubmit = (event) => event.preventDefault();
el("mode").onchange = () => {
  resetChallenge();
  config.mode = el<HTMLSelectElement>("mode").value as Mode;
  modeUI();
  store();
};
document.addEventListener("visibilitychange", () => {
  if (document.hidden && challenge && !paused) togglePause();
});
window.addEventListener("pagehide", () => {
  stopAudio();
  store();
});
document.addEventListener("keydown", (event) => {
  if (flow) return;
  if (
    (event.target as HTMLElement).matches("input,select,textarea,button,a") ||
    event.repeat
  )
    return;
  const id =
    event.key.toLowerCase() === "r"
      ? "replay"
      : event.key === " "
        ? "reveal"
        : event.key.toLowerCase() === "n"
          ? "next"
          : event.key.toLowerCase() === "p"
            ? "pause"
            : "";
  if (id && !el<HTMLButtonElement>(id).disabled) {
    event.preventDefault();
    el<HTMLButtonElement>(id).click();
  }
});
populate();
render();
renderHistory();
flow = installFlow({
  getConfig: () => structuredClone(config),
  setConfig: (next) => {
    config = structuredClone(next);
    populate();
  },
  getCustoms: () => structuredClone(customs),
  setCustoms: (next) => {
    customs = next;
    populate();
  },
  readConfig,
  getSession: () => session,
  async create(next, source, presetId, exact) {
    const created = createSession(next, customs, source, presetId);
    if (exact?.length) {
      created.questions = structuredClone(exact);
      created.questionCount = exact.length;
    }
    resetChallenge();
    session = created;
    config = structuredClone(created.config);
    playbackOverrides = {};
    index = 0;
    completedQuestions = new Set();
    sessionStarted = performance.now();
    sessionPausedAt = 0;
    sessionPausedMs = 0;
    newQuestion(false);
    store();
    saveSession(localStorage, created);
    return created;
  },
  resume(saved) {
    resetChallenge();
    session = structuredClone(saved);
    config = { ...defaults, ...session.config };
    playbackOverrides = {};
    populate();
    const p = session.progress;
    index = p?.index ?? 0;
    challenge = sessionQuestion(session, index);
    step = p?.step ?? (isSequential(config) ? 1 : 0);
    revealed = p?.revealed ?? false;
    graded = p?.graded ?? false;
    replays = p?.replays ?? 0;
    elapsed = p?.elapsed ?? 0;
    referenceSeen = p?.referenceSeen ?? false;
    referenceAssisted = p?.referenceAssisted ?? false;
    phraseStage = p?.phraseStage ?? 0;
    bassStage = p?.bassStage ?? 0;
    bassSelection = p?.bassSelection;
    marks = new Set(p?.marks ?? []);
    completedQuestions = new Set(p?.completedQuestions ?? []);
    hasPlayed = (p?.hasPlayed ?? false) && !p?.contextPending;
    contextPending = false;
    paused = false;
    session.status = "active";
    sessionStarted = performance.now() - session.totalTime * 1000;
    sessionPausedMs = 0;
    sessionPausedAt = 0;
    started = performance.now();
    renderChoices();
    selected = p?.selected ?? [];
    selectedQualities = p?.selectedQualities ?? [];
    el("choices")
      .querySelectorAll("label")
      .forEach((label, i) => {
        const selects = label.querySelectorAll("select");
        if (selects.length === 2 && selectedQualities[i]) {
          selects[0].value = selectedQualities[i];
          selects[0].dispatchEvent(new Event("change"));
        }
        selects[selects.length - 1].value = p?.selected[i] ?? "";
      });
    selected = p?.selected ?? [];
    render();
    store();
    status("Session restored. Replay context when ready.");
  },
  leave(end = false) {
    operation++;
    stopAudio();
    if (
      session &&
      challenge &&
      session.status !== "completed" &&
      session.status !== "abandoned"
    ) {
      if (!paused) {
        if (!revealed && !contextPending && hasPlayed)
          elapsed += Math.max(0, performance.now() - started) / 1000;
        sessionPausedAt = performance.now();
        paused = true;
      }
      session.status = end ? "abandoned" : "paused";
      if (end) session.endedAt = new Date().toISOString();
      store();
    }
    sessionStarted = 0;
  },
  compact(next) {
    stopAudio();
    contextPending = false;
    if (continuous() && !revealed) hasPlayed = false;
    if (config.mode === "m6" && !revealed) hasPlayed = false;
    playbackOverrides = { ...playbackOverrides, ...next };
    render();
    status("Playback settings updated. Replay context when ready.");
  },
  pause: togglePause,
  unlock: () => audio.ready(),
  refreshViews: () => {
    renderHistory();
    renderReview();
  },
  play: async () => {
    await audio.ready();
    if (paused) await togglePause();
    playContext();
  },
});
