import {insightPractice,type InsightPreview} from "./insights.js";
import {renderInsights} from "./insights-ui.js";
import { exerciseNames, progressionModes, progressionName } from "./exercise-names.js";
import { configurationChapters, configurationGroup, rememberGroups, practiceSummary, type ConfigurationChapter } from "./configuration.js";
import {mountProgression, progressionRuns, progressionEvidence} from "./progression-ui.js";
import { AudioEngine } from "../jazz/audio.js";
import { parseChord, chordNotes, chordToneDegrees, degreeForPc } from "../jazz/theory.js";
import { QuestionLifecycle } from "./question.js";
import {
  builtins,
  primaryPresets,
  roots,
  qualities,
  degrees,
  validate,
  editableConfig,
  targetsFor,
  stream,
  attempt,
  read,
  write,
  keys,
  metrics,
  type Config,
  type Preset,
  type Question,
  type Attempt,
  type Session,
} from "./model.js";
const host = document.getElementById("app")!,
  error = document.getElementById("error")!;
const audio = new AudioEngine();
let question: QuestionLifecycle | null = null;
let reviewOperation = 0;
let seenMaterial = new Set<string>();
let presets: Preset[] = [],
  sessions: Session[] = [],
  activeId = builtins[0].id,
  draft: Config;
let session: Session | null = null,
  current: Attempt | null = null,
  generate: (() => Question) | null = null;
const configGroups = new Map<string, boolean>();
let step: ConfigurationChapter = "Harmony";
let dirty = false,
  fatal = false;
let auditionQuality = "";
let insightPreview:InsightPreview|null=null;
const inInsightPreview=()=>location.hash==="#insight-setup"&&insightPreview?.kind==="single";
let headingFocus = true, lastRoute = "", savedPresetId = "";
let practiceSignature = "";

function restoreControl(key?: string) {
  if (!key) return;
  Array.from(host.querySelectorAll<HTMLElement>("[data-focus-key]")).find((node) => node.dataset.focusKey === key && !(node as HTMLButtonElement).disabled)?.focus({ preventScroll: true });
}

function splitView(anchor: HTMLElement, work: HTMLElement, cls = "") {
  const split = el("div", "", "split-view " + cls);
  split.append(anchor, work);
  return split;
}

function disclosure(label: string, ...content: HTMLElement[]) {
  const details = el("details");
  details.append(el("summary", label), ...content);
  return details;
}
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text = "",
  cls = "",
) {
  const e = document.createElement(tag);
  e.textContent = text;
  e.className = cls;
  return e;
}
function report(e: unknown) {
  error.hidden = false;
  error.replaceChildren(
    el("span", e instanceof Error ? e.message : String(e)),
    button(fatal ? "Retry loading" : dirty ? "Retry saving" : "Dismiss", () =>
      fatal ? location.reload() : dirty ? saveAll() : clearError(),
    ),
  );
}
function clearError() {
  error.hidden = true;
  error.replaceChildren();
}
function button(
  label: string,
  fn: () => unknown,
  secondary = true,
  disabled = false,
) {
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
        if (b.isConnected && !b.disabled) return fn();
      })
      .catch(report);
  };
  return b;
}
function actions(...items: HTMLElement[]) {
  const e = el("div", "", "actions");
  e.append(...items);
  return e;
}
function heading(text: string) {
  const h = el("h1", text);
  h.tabIndex = -1;
  host.append(h);
  if (headingFocus) h.focus({ preventScroll: true });
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
  } catch (e) {
    report(e);
  }
}
function load() {
  try {
    const saved = read<Preset[]>(keys.presets, []);
    sessions = read<Session[]>(keys.sessions, []);
    const exposures = read<string[]>(keys.exposures, []);
    if (
      !Array.isArray(exposures) ||
      exposures.some((v) => typeof v !== "string")
    )
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
      if (!Array.isArray(s.attempts)) throw new Error("Invalid saved session.");
    }
    presets = [
      ...builtins.map((b) => {
        const p = structuredClone(saved.find((p) => p.id === b.id) ?? b);
        if ((p.id === "m1-general" && p.name === "M1 Audiation") ||
            (p.id === "m2-general" && p.name === "M2 Recognition")) p.name = b.name;
        return p;
      }),
      ...saved.filter((p) => !builtins.some((b) => b.id === p.id)),
    ];
    activeId = read(keys.last, presets[0].id);
    draft = structuredClone(preset().config);
    render();
  } catch (e) {
    fatal = true;
    host.replaceChildren(el("h1", "V2 data could not be loaded"));
    report(e);
  }
}
function describe(c: Config) {
  return `${exerciseNames[c.exercise]} / ${c.roots.join(", ")} / ${c.qualities.join(", ")} / ${c.qualities.map(q => q + ": " + targetsFor(c, q).join(", ")).join("; ")} / mix ${(c.voiceLevels ?? [1,1,1,1,1]).map(v => Math.round(v * 100) + "%").join(", ")} / context ${c.context ? "on" : "off"} / ${c.count || "Unlimited"} questions${c.exercise === "m1" ? " / " + c.method : ""}`;
}
function customize(p: Preset) {
  activeId = p.id;
  draft = editableConfig(p.config);
  location.hash = "configure";
  if (location.hash === "#configure") render();
}
function exerciseTitle(name: string) {
  const title = el("h2");
  const [context, assessment] = name.split(" · ");
  title.append(el("span", context, "exercise-context"), el("span", " · ", "sr-only"), el("span", assessment));
  return title;
}
function home() {
  heading("Practice");
  const grid = el("div", "", "exercises");
  grid.setAttribute("aria-label", "Exercises");
  for (const definition of primaryPresets) {
    const p = presets.find((p) => p.id === definition.id)!;
    const card = el("article", "", "exercise");
    const title = exerciseTitle(definition.name);
    title.id = definition.id;
    card.dataset.presetId = p.id;
    card.setAttribute("aria-labelledby", title.id);
    card.append(
      title,
      actions(
        button("Start", () => start(p), false),
        button("Customize", () => customize(p)),
      ),
    );
    grid.append(card);
  }
  for(const mode of Object.values(progressionModes)){
    const name = progressionName(mode);
    const card=el("article","","exercise"),title=exerciseTitle(name);
    title.id="progression-"+mode;card.setAttribute("aria-labelledby",title.id);
    card.append(title,actions(
      button("Start",()=>location.hash="progression/"+mode+"/start",false),
      button("Customize",()=>location.hash="progression/"+mode),
    ));grid.append(card);
  }
  host.append(grid);
  const secondary = el("section", "", "saved-presets");
  secondary.setAttribute("aria-labelledby", "saved-presets-title");
  const title = el("h2", "Saved presets");
  title.id = "saved-presets-title";
  const savedHeading = el("div", "", "saved-heading");
  savedHeading.append(
    title,
    button("New preset", () => {
      const name = prompt("Preset name", "My practice");
      if (!name?.trim()) return;
      const p = {
        id: crypto.randomUUID(),
        name: name.trim().slice(0, 100),
        config: structuredClone(preset().config),
      };
      presets.push(p);
      persist();
      customize(p);
    }),
  );
  secondary.append(savedHeading);
  for (const p of presets) {
    if (primaryPresets.some((d) => d.id === p.id)) continue;
    const card = el("article", "", "preset-row");
    card.dataset.presetId = p.id;
    card.append(
      el("h3", p.name),
      actions(
        button("Start", () => start(p)),
        button("Customize", () => customize(p)),
      ),
    );
    secondary.append(card);
  }
  host.append(secondary);
  const pageTitle = host.querySelector("h1")!, work = el("div", "", "home-work");
  work.append(el("h2", "Exercises"), grid, secondary);
  host.replaceChildren(splitView(pageTitle, work, "home-layout"));
}
function select<T extends string>(
  label: string,
  value: T,
  options: readonly T[],
  update: (v: T) => void,
) {
  const l = el("label", label),
    s = el("select");
  options.forEach((v) => {
    const o = el("option", v === "m1" || v === "m2" ? exerciseNames[v as Config["exercise"]] : v === "all" ? "All" : v === "imagined-sung" ? "Imagined / sung" : v === "played" ? "Instrumental playing" : v === "All selected roots" ? "All roots" : v === "All selected qualities" ? "All qualities" : v);
    o.value = v;
    s.append(o);
  });
  s.value = value;
  s.setAttribute("aria-label", label);
  s.dataset.focusKey = label;
  s.onchange = () => update(s.value as T);
  l.append(s);
  return l;
}
function autoSave() {
  reviewOperation++; audio.stop();
  const status = document.getElementById("config-status")!;
  try {
    const c = validate(draft);
    if(inInsightPreview()&&insightPreview?.kind==="single"){insightPreview.config=c;status.textContent="Independent draft · source preset unchanged";configRender();return;}
    preset().config = c;
    persist();
    status.textContent = dirty
      ? "Not saved. Keep this page open and Retry saving."
      : "Changes saved to this preset.";
    status.dataset.state = dirty ? "unsaved" : "saved";
    if (!dirty) savedPresetId = activeId;
  } catch (e) {
    status.dataset.state = "invalid";
    status.textContent = `${(e as Error).message} Last valid saved preset unchanged.`;
  }
  configRender();
}
function configurationSummary() {
  return [
    el("h3", "Harmony"), el("p", `Roots: ${draft.roots.join(", ") || "None selected"}`), el("p", `Qualities: ${draft.qualities.join(", ") || "None selected"}`),
    el("h3", "Target degrees"), ...draft.qualities.map(q => el("p", q + ": " + (targetsFor(draft, q).join(", ") || "None selected"))),
    el("h3", "Practice"), el("p", `${draft.count === 0 ? "Unlimited" : draft.count + " questions"} · Context ${draft.context ? "on" : "off"} · Auto Advance ${draft.autoAdvance !== false ? "on" : "off"}`),
    ...(draft.exercise === "m1" ? [el("p", "Self-rated · " + draft.method)] : []),
    el("h3", "Sound"), el("p", `Voice mix: ${(draft.voiceLevels ?? [1,1,1,1,1]).map(v => Math.round(v * 100) + "%").join(", ")}`), el("p", `Volume: ${Math.round(draft.volume * 100)}%`),
  ];
}
function pool(
  label: string,
  options: readonly string[],
  values: string[],
  update: (items: string[]) => void,
) {
  const f = el("fieldset"),
    group = el("div", "", "pool");
  f.append(el("legend", label), group);
  for (const value of options) {
    const l = el("label"),
      input = el("input");
    input.type = "checkbox";
    input.value = value;
    input.dataset.focusKey = `pool:${label}:${value}`;
    input.checked = values.includes(value);
    input.onchange = () => {
      update(
        Array.from(
          group.querySelectorAll<HTMLInputElement>("input:checked"),
        ).map((i) => i.value),
      );
      autoSave();
    };
    l.append(input, el("span", value));
    group.append(l);
  }
  return f;
}
function configIssue(): { chapter: ConfigurationChapter; group: string; message: string } | null {
  try { validate(draft); return null; } catch (e) {
    const message = (e as Error).message;
    if (!draft.roots.length) return { chapter: "Harmony", group: "roots", message };
    if (!draft.qualities.length) return { chapter: "Harmony", group: "qualities", message };
    const missing = draft.qualities.find(q => !targetsFor(draft, q).length);
    if (missing) return { chapter: "Target degrees", group: "pool:" + missing, message };
    if (!Number.isInteger(draft.count) || draft.count < 0 || draft.count > 200)
      return { chapter: "Practice", group: "length", message };
    return { chapter: "Sound", group: !Number.isFinite(draft.volume) || draft.volume < 0 || draft.volume > 1 ? "volume" : "mix", message };
  }
}
function config() {
  draft = editableConfig(draft);
  const issue = configIssue();
  const page = el("section", "", "config-page"), header = el("header", "", "config-header");
  const modeName = exerciseNames[draft.exercise];
  const title = heading(inInsightPreview()?"Customize "+modeName:"Customize " + preset().name + (preset().name === modeName ? "" : " — " + modeName));
  header.append(title);
  if(inInsightPreview())header.append(el("p","Insights practice: "+insightPreview!.label+". Independent draft; source presets unchanged."),button("Back to Insights",()=>location.hash="insights"));
  const editor = el("section", "", "config-editor"), side = el("aside", "", "config-summary");
  editor.setAttribute("aria-label", "Preset settings");
  const tabs = el("nav", "", "steps config-tabs");
  tabs.setAttribute("aria-label", "Configuration chapters");
  for (const name of configurationChapters) {
    const tab = button(name, () => { step = name; configRender(); });
    if (step === name) tab.setAttribute("aria-current", "page");
    tabs.append(tab);
  }
  editor.append(tabs);
  const group = (key: string, label: string, selected: string, content: HTMLElement[], open = false) => {
    const id = activeId + ":" + key;
    if (issue?.group === key) configGroups.set(id, true);
    const node = configurationGroup(configGroups, id, label, selected, content, open);
    if (issue?.group === key) {
      const error = el("p", issue.message + " Last valid saved preset unchanged.", "config-field-error");
      error.id = "config-validation";
      error.setAttribute("role", "alert");
      node.lastElementChild!.prepend(error);
      node.querySelectorAll("input,select,fieldset").forEach(control => {
        control.setAttribute("aria-invalid", "true");
        control.setAttribute("aria-describedby", error.id);
      });
    }
    return node;
  };
  if (issue && issue.chapter !== step) {
    editor.append(el("p", issue.message, "config-field-error"), button("Review invalid settings: " + issue.chapter, () => {
      step = issue.chapter; configRender();
      host.querySelector<HTMLElement>("input[aria-invalid='true'],select[aria-invalid='true']")?.focus();
    }));
  }
  if (step === "Harmony") {
    editor.append(group("roots", "Roots", `${draft.roots.join(", ") || "None selected"} · ${draft.roots.length} / 12 selected`, [
      pool("Roots", roots, draft.roots, values => draft.roots = values),
      button("All 12 Keys", () => { draft.roots = [...roots]; autoSave(); }),
    ], true), group("qualities", "Chord qualities", draft.qualities.join(", ") || "None selected", [
      pool("Chord qualities", qualities, draft.qualities, values => {
        draft.qualities = values as Config["qualities"];
        for (const q of draft.qualities) draft.targetPools![q] ??= chordToneDegrees(parseChord("C" + q));
      }),
    ]));
  }
  if (step === "Target degrees") {
    editor.append(el("p", "Choose the degrees to practise against each chord quality.", "muted"));
    draft.qualities.forEach((quality, i) => editor.append(group("pool:" + quality, quality, targetsFor(draft, quality).join(", ") || "None selected", [
      pool(quality, degrees, targetsFor(draft, quality), values => draft.targetPools![quality] = values),
    ], i === 0)));
  }
  if (step === "Practice") {
    const countLabel = el("label", "Questions (0 = Unlimited)"), count = el("input");
    count.type = "number"; count.min = "0"; count.max = "200";
    count.value = Number.isNaN(draft.count) ? "" : String(draft.count);
    count.dataset.focusKey = "question-count";
    count.onchange = () => { draft.count = count.value === "" ? NaN : Number(count.value); autoSave(); };
    countLabel.append(count);
    editor.append(group("length", "Session length", draft.count === 0 ? "Unlimited" : `${Number.isNaN(draft.count) ? "Invalid" : draft.count} questions`, [countLabel], true));
    const options: HTMLElement[] = [];
    if (!inInsightPreview() && !primaryPresets.some(p => p.id === activeId)) options.push(select("Exercise", draft.exercise, ["m1", "m2"], value => { draft.exercise = value; autoSave(); }));
    if (draft.exercise === "m1") options.push(select("Response method (self-assessed)", draft.method, ["imagined", "sung", "played"], value => { draft.method = value; autoSave(); }));
    for (const [label, value, change] of [
      ["Audible chord context", draft.context, (checked: boolean) => draft.context = checked],
      ["Auto Advance", draft.autoAdvance !== false, (checked: boolean) => draft.autoAdvance = checked],
    ] as const) {
      const row = el("label", "", "check-row"), check = el("input");
      check.type = "checkbox"; check.checked = value; check.dataset.focusKey = label;
      check.onchange = () => { change(check.checked); autoSave(); };
      row.append(check, el("span", label)); options.push(row);
    }
    editor.append(group("behavior", "Response and playback", `${draft.exercise === "m1" ? draft.method + " · Self-assessed · " : ""}Context ${draft.context ? "on" : "off"} · Auto Advance ${draft.autoAdvance !== false ? "on" : "off"}`, options, true));
  }
  if (step === "Sound") {
    const label = el("label", "Volume", "voice-control"), input = el("input"), output = el("output", Math.round(draft.volume * 100) + "%");
    input.type = "range"; input.min = "0"; input.max = "1"; input.step = "0.05"; input.value = String(draft.volume);
    input.setAttribute("aria-label", "Volume"); input.dataset.focusKey = "volume";
    input.oninput = () => output.textContent = Math.round(Number(input.value) * 100) + "%";
    input.onchange = () => { draft.volume = Number(input.value); autoSave(); };
    label.append(input, output);
    editor.append(group("volume", "Overall volume", Math.round(draft.volume * 100) + "%", [label], true));
    const controls: HTMLElement[] = [el("p", "Original voices, low to high. 0% mutes; 100% standard; 200% double nominal gain. Accompaniment only.", "muted")];
    if (!draft.qualities.includes(auditionQuality as Config["qualities"][number])) auditionQuality = draft.qualities[0] ?? "";
    if (auditionQuality && draft.roots.length) {
      controls.push(select("Audition quality", auditionQuality, draft.qualities, value => { auditionQuality = value; configRender(); }));
      const chord = parseChord(draft.roots[0] + auditionQuality), notes = chordNotes(chord);
      controls.push(el("p", "Preview chord: " + chord.symbol));
      for (let i = 0; i < 5; i++) {
        const row = el("label", `Voice ${i + 1} · ${notes[i] === undefined ? "absent" : degreeForPc(chord, notes[i] % 12)}`, "voice-control"), voice = el("input"), value = el("output", Math.round(draft.voiceLevels![i] * 100) + "%");
        voice.type = "range"; voice.min = "0"; voice.max = "200"; voice.step = "5"; voice.value = String(draft.voiceLevels![i] * 100);
        voice.setAttribute("aria-label", `Voice ${i + 1} volume`); voice.dataset.focusKey = "voice-" + i;
        voice.oninput = () => value.textContent = voice.value + "%";
        voice.onchange = () => { draft.voiceLevels![i] = Number(voice.value) / 100; autoSave(); };
        row.append(voice, value); controls.push(row);
      }
      controls.push(button("Audition " + chord.symbol, async () => {
        const c = validate(draft), token = ++reviewOperation;
        audio.stop(); await audio.ready();
        if (token !== reviewOperation || location.hash !== "#configure") return;
        audio.playSingle(chord, null, c.volume, true, { voiceLevels: c.voiceLevels });
      }), el("p", "Full accompaniment only · no practice record", "muted"));
    }
    editor.append(group("mix", "Voicing mix", draft.voiceLevels!.map(v => Math.round(v * 100) + "%").join(", "), controls));
  }
  const overview = el("div"); overview.id = "config-overview"; overview.append(...configurationSummary());
  const full = el("p", describe(draft)); full.id = "config-summary";
  side.append(practiceSummary(configGroups, activeId + ":overview", [el("h2", "This practice"), overview, disclosure("Full configuration", full)]));
  const mobileSummary = el("p", `${draft.roots.length} roots · ${draft.qualities.join(", ") || "No qualities"} · ${draft.count === 0 ? "Unlimited" : draft.count + " questions"}`, "config-mobile-overview");
  header.append(mobileSummary);
  const status = el("p", issue ? "Invalid settings. Review the highlighted group." : dirty ? "Not saved. Retry saving." : savedPresetId === activeId ? "Changes saved to this preset." : "Preset ready", "notice");
  status.id = "config-status"; status.dataset.state = issue ? "invalid" : dirty ? "unsaved" : "saved"; status.setAttribute("role", "status");
  const launch = el("div", "", "config-launch");
  launch.append(button("Start practice", () => {if(inInsightPreview()){const p={id:crypto.randomUUID(),name:"Insights: "+insightPreview!.label,config:validate(draft)};presets.push(p);return start(p);}else return start({ ...preset(), config: validate(draft) });}, false, Boolean(issue)), status);
  if(inInsightPreview())status.textContent="Independent draft · source preset unchanged";
  side.append(launch);
  const management = disclosure("Preset actions", button("Back to presets", () => location.hash = "home"));
  if (!primaryPresets.some(p => p.id === activeId)) management.append(button("Rename", () => {
    const name = prompt("Preset name", preset().name);
    if (name?.trim()) { preset().name = name.trim().slice(0, 100); persist(); configRender(); }
  }));
  const original = builtins.find(p => p.id === activeId);
  management.append(button(original ? "Restore Default" : "Delete preset", () => {
    if (!confirm(original ? "Restore this built-in preset?" : "Delete this preset? Practice history will be kept.")) return;
    if (original) { presets[presets.findIndex(p => p.id === activeId)] = structuredClone(original); draft = editableConfig(original.config); persist(); configRender(); }
    else { presets = presets.filter(p => p.id !== activeId); activeId = presets[0].id; persist(); location.hash = "home"; }
  }));
  if(!inInsightPreview())side.append(management);
  else side.append(button("Save as new preset",()=>{const p={id:crypto.randomUUID(),name:"Insights: "+insightPreview!.label,config:validate(draft)};presets.push(p);persist();}));
  const layout = el("div", "", "config-layout"); layout.append(editor, side);
  page.append(header, layout); host.replaceChildren(page);
}

function configRender() {
  reviewOperation++; audio.stop();
  const key = (document.activeElement as HTMLElement)?.dataset.focusKey;
  headingFocus = false;
  rememberGroups(host, configGroups);
  const scroll = window.scrollY;
  host.replaceChildren();
  config();
  restoreControl(key);
  window.scrollTo(0, scroll);
}
async function start(p: Preset) {
  if (session) return;
  reviewOperation++; audio.stop();
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
function material(a: Attempt) {
  return `${a.target.chord.symbol}:${a.target.midi}`;
}
function next() {
  if (!session || !generate) return;
  if (question) question.dispose();
  else audio.stop();
  reviewOperation++;
  if (session.config.count && session.attempts.length >= session.config.count) {
    finish();
    return;
  }
  const q = generate(),
    signature = `${q.chord.symbol}:${q.midi}`,
    seen =
      seenMaterial.has(signature) ||
      sessions
        .flatMap((s) => s.attempts)
        .some((a) => material(a) === signature);
  seenMaterial.add(signature);
  current = attempt(
    session.config,
    q,
    session.id,
    seen ? "previously-seen" : "fresh",
  );
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
function finish(destination?: string | null) {
  if (!session) return;
  question?.dispose();
  // A displayed but untouched question is not a submitted attempt.
  if (
    current &&
    !question?.view.done &&
    current.firstAnswer === null &&
    !current.replaysBeforeFirst
  )
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
  if (location.hash !== "#practice" || !session || !current || !question) return;
  const focusedKey = (document.activeElement as HTMLElement)?.dataset.focusKey;
  const lifecycle = question,
    { busy, ready, done, choosingWrong, resolved, feedback, sounding, reference } = lifecycle.view;
  const soundText = sounding ? reference ? "Reference playing" : session.config.exercise === "m1" ? "Context playing" : session.config.context ? "Question playing" : "Target playing" : "";
  const signature = JSON.stringify([current.id, busy, ready, done, choosingWrong, resolved, feedback, current.firstCorrect, current.retryCount]);
  // A natural audio tail changes the indicator, not the user's live controls.
  if (signature === practiceSignature && host.querySelector(".playback-status")) {
    host.querySelector(".playback-status")!.textContent = soundText;
    return;
  }
  practiceSignature = signature;
  host.replaceChildren();
  const c = session.config,
    a = current;
  const top = el("div", "", "session-top");
  top.append(
    el("h1", exerciseNames[c.exercise]),
    button("Stop", finish),
  );
  host.append(top);
  const count = el(
      "p",
      `Question ${session.attempts.length}${c.count ? " / " + c.count : " / Unlimited"}`,
      "session-count",
  );
  top.insertBefore(count, top.lastElementChild);
  const questionElement = el("section", "", "question");
  questionElement.append(el("p", "Known chord", "chord-label"), el("h2", a.target.chord.symbol));
  if (c.exercise === "m1") {
    const target = el("p", "Target ", "question-prompt");
    target.append(el("span", a.target.degree, "target-degree"));
    questionElement.append(target, el("p", "Self-rated / " + c.method, "method"));
  } else
    questionElement.append(
      el("p", resolved ? "Answer: " + a.target.degree : "Which chord degree?", "question-prompt"),
    );
  host.append(questionElement);
  let statusText = feedback || (ready ? c.exercise === "m1" && done ? "Rate your response" : "Your turn" : "Audio not ready");
  if (busy) statusText = "Preparing audio...";
  else if (feedback === "Correct" && a.firstCorrect === false) statusText = "Correct on retry";
  const status = el("p", statusText);
  status.id = "feedback";
  host.append(status);
  if (!(c.exercise === "m1" && !c.context && !done))
    host.append(
      actions(
        button(
          ready ? c.exercise === "m1" ? done ? "Replay reference" : "Replay context" : resolved ? "Replay reference" : "Replay" : "Retry audio",
          () => lifecycle.act({ type: "listen" }),
          true,
          busy,
        ),
      ),
    );
  if (c.exercise === "m2") {
    if (!resolved) {
      const answers = el("div", "", "answers");
      for (const choice of a.target.options)
        answers.append(
          button(
            choice,
            () => lifecycle.act({ type: "answer", degree: choice }),
            true,
            !ready || busy,
          ),
        );
      host.append(answers);
    }
    if (a.firstAnswer !== null && !resolved)
      host.append(
        button(
          "Reveal Answer",
          () => lifecycle.act({ type: "reveal" }),
          true,
          busy,
        ),
      );
  } else if (!done) {
    host.append(
      button(
        "Done",
        () => lifecycle.act({ type: "done" }),
        false,
        !ready || busy,
      ),
    );
  } else if (a.revealedReference && a.firstCorrect === null) {
    if (choosingWrong) {
      const wrongLabel = el("label", "Which degree did you imagine?"),
        wrong = el("select");
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
        if (
          wrong.value &&
          wrong.value !== a.target.degree &&
          (wrong.value === "unknown" || a.target.options.includes(wrong.value))
        )
          void lifecycle
            .act({ type: "rate", correct: false, wrong: wrong.value })
            .catch(report);
      };
      wrongLabel.append(wrong);
      host.append(wrongLabel);
    } else {
      host.append(
        actions(
          button(
            "Correct",
            () => lifecycle.act({ type: "rate", correct: true }),
            true,
            busy,
          ),
          button(
            "Incorrect",
            () => lifecycle.act({ type: "incorrect" }),
            true,
            busy,
          ),
        ),
      );
    }
  }
  if (resolved)
    host.append(
      button(
        c.count && session.attempts.length >= c.count
          ? "Finish session"
          : "Next",
        () => lifecycle.act({ type: "next" }),
        false,
        busy || !ready,
      ),
    );
  const workspace = el("div", "", "practice-workspace harmonic-workspace single-chord"),
    response = el("section", "", "response-area"),
    settings = el("details", "", "session-settings");
  response.setAttribute("aria-label", "Response");
  const controls = Array.from(host.children).filter((node) => node !== top && node !== questionElement);
  const playbackStatus = el("p", soundText, "playback-status");
  if (c.exercise === "m2") {
    const line = el("div", "", "feedback-line");
    line.append(status, playbackStatus);
    questionElement.append(line);
    const replay = controls.find((node) => node.classList.contains("actions"));
    if (replay) questionElement.append(replay);
    response.append(...controls.filter((node) => node !== status && node !== replay));
  } else {
    response.append(...controls);
    status.after(playbackStatus);
    const replay = response.querySelector(".actions");
    if (replay) response.append(replay);
    response.querySelectorAll("button").forEach((b) => {
      if (b.textContent?.startsWith("Done")) b.classList.add("done-action");
    });
    if (done) response.querySelector(".actions:has(button[data-focus-key='Correct'])")?.classList.add("rating-actions");
  }
  settings.append(el("summary", "Session settings"), el("p", describe(c)));
  if (c.exercise === "m1") settings.append(el("p", "Self-assessment only; singing and playing are not pitch-verified. Completion time includes your response and interaction."));
  workspace.append(questionElement, response);
  host.replaceChildren(top, workspace, settings);
  restoreControl(focusedKey);
  const announcement = document.getElementById("practice-announcement")!;
  const message = `${count.textContent}. ${a.target.chord.symbol}. ${status.textContent}`;
  if (announcement.textContent !== message) announcement.textContent = message;
  if (!busy && document.activeElement === document.body) {
    const buttons = Array.from(
      host.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
    );
    const focus = resolved
      ? buttons.find(
          (b) => b.textContent === "Next" || b.textContent === "Finish session",
        )
      : done
        ? (host.querySelector<HTMLElement>("#wrong-degree") ??
          buttons.find((b) => b.textContent === "Correct"))
        : c.exercise === "m2"
          ? host.querySelector<HTMLElement>(".answers button:not(:disabled)")
          : buttons.find((b) => b.textContent?.startsWith("Done"));
    focus?.focus({ preventScroll: true });
  }
}
function confusions(rows: Attempt[]) {
  const section = el("section", "", "confusions"), mistakes = new Map<string, number>();
  let unknown = 0;
  for (const a of rows.filter((a) => a.firstCorrect === false)) {
    const chosen = a.exercise === "m1" ? a.imaginedWrongDegree : a.firstAnswer;
    if (!chosen || chosen === "unknown") { unknown++; continue; }
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
  if (unknown) section.append(el("p", `Unknown / Don’t know: ${unknown}. No specific wrong degree was reported.`));
  return section;
}
function summary(rows: Attempt[], c: Config, showConfusions = true) {
  const m = metrics(rows), block = el("section", "", "evidence-summary"),
    outcome = el("section", "", "outcome"), body = el("div", "", "evidence-body"),
    supporting = el("div", "", "supporting-metrics");
  outcome.dataset.correct = String(m.correct);
  outcome.dataset.assessed = String(m.n);
  outcome.append(
    el("h2", c.exercise === "m1" ? "Self-rated Accuracy" : "First-answer Accuracy"),
    el("p", m.n ? Math.round(m.correct / m.n * 100) + "%" : "—", "metric-number"),
    el("p", `${m.correct} / ${m.n} assessed`, "assessment-count"),
    el("p", `${m.unassessed} unassessed`, "unassessed"),
  );
  if (c.exercise === "m1") outcome.append(el("p", "Self-rated / " + c.method, "assessment-source"));
  for (const [label, value, note] of [
    ["Replay-assisted first responses", `${m.replayed} / ${m.n}`, ""],
    [c.exercise === "m1" ? "Correct self-rated response median" : "Correct-response median",
      m.median === null ? "Unavailable" : (m.median / 1000).toFixed(2) + " s", `n=${m.timed} valid correct responses`],
  ]) {
    const item = el("div", "", "supporting-metric");
    item.append(el("p", label), el("strong", value));
    if (note) item.append(el("small", note));
    supporting.append(item);
  }
  const notes = disclosure("Timing and replay detail",
    el("p", `Replay totals across all ${rows.length} records: ${m.before} before the first response; ${m.after} after. The assisted-response share above uses assessed questions only.`),
    el("p", `Exposure: ${rows.filter((a) => a.exposure === "fresh").length} fresh, ${rows.filter((a) => a.exposure === "previously-seen").length} previously seen. Repetition is not evidence of transfer.`),
    el("p", c.exercise === "m1"
      ? `Self-rated ${c.method}; time is self-indicated and includes interaction${c.method === "played" ? " and instrument execution" : ""}. Singing and playing are not pitch-verified.`
      : "Submission time includes listening, reasoning and interaction; it is not pure mental recognition speed. Correct-response times exclude invalid timing and first incorrect answers."),
  );
  notes.className = "evidence-notes";
  body.append(supporting);
  if (showConfusions) body.append(confusions(rows));
  body.append(notes);
  block.append(outcome, body);
  return block;
}
function results(id: string) {
  const s = sessions.find((s) => s.id === id);
  if (!s) { heading("Session not found"); return; }
  heading(s.endedAt ? "Session results" : "Interrupted session - saved attempts").className = "page-band";
  const overview = () => {
    const block = summary(s.attempts, s.config);
    block.querySelector(".outcome")!.append(actions(
      button("Practice again", () => start({ id: s.presetId, name: "Similar practice", config: s.config }), false),
      button("Customize", () => {
        activeId = presets.some((p) => p.id === s.presetId) ? s.presetId : presets[0].id;
        draft = editableConfig(s.config); location.hash = "configure";
      }),
      button("Presets", () => location.hash = "home"),
    ));
    return block;
  };
  host.append(el("p", `${exerciseNames[s.config.exercise]} / ${s.config.exercise === "m1" ? "Self-rated " + s.config.method : "First answers"} · ${s.attempts.length} ${s.attempts.length === 1 ? "record" : "records"}`, "results-context"),
    disclosure("Session conditions", el("p", describe(s.config))), overview());
  const review = disclosure("Question review");
  review.className = "question-review";
  for (const a of s.attempts) {
    const item = el("section");
    item.append(el("h3", `${a.target.chord.symbol} / ${a.target.degree}`), el("p",
      `${a.gradingSource === "self" ? "Self-rated" : "First answer"}: ${a.firstAnswer ?? "Unassessed"}. Recorded response: ${a.firstResponseMs === null ? "Unavailable" : (a.firstResponseMs / 1000).toFixed(2) + "s"} (${a.timingValidity}, descriptive only). Retries: ${a.retryCount}.`));
    const replay = button("Replay reference", async () => {
      const token = ++reviewOperation;
      replay.disabled = true;
      try {
        await audio.ready();
        if (token !== reviewOperation || location.hash !== "#results/" + s.id) return;
        audio.playReference(a.target.chord, a.target.midi, s.config.volume, null, s.config.voiceLevels);
        a.replaysAfterFirst++; a.revealedReference = true; persist();
        host.querySelector(".evidence-summary")?.replaceWith(overview());
      } catch (e) { if (token === reviewOperation) throw e; }
      finally { replay.disabled = false; }
    });
    item.append(replay); review.append(item);
  }
  host.append(review);
}
function insights() {
  heading("Insights");
  const work=el("div");host.append(work);
  try {renderInsights(work,sessions,progressionRuns(),progressionEvidence(),(record,label,filters)=>{insightPreview=insightPractice(record,filters,label);if(insightPreview.kind==="single")draft=editableConfig(insightPreview.config);step="Harmony";location.hash="insight-setup";});}
  catch(e){work.append(el("p","Insights records could not be read. Existing history was preserved."),button("Retry Insights",()=>{clearError();render();}));report(e);}
}
let disposeProgression: (()=>void) | undefined;
function render() {
  disposeProgression?.(); disposeProgression=undefined;
  if (fatal) return;
  const route = location.hash.slice(1) || "home";
  if (route !== "practice") document.getElementById("practice-announcement")!.textContent = "";
  if (session && route !== "practice") {
    finish(route);
    return;
  }
  const focusedKey = (document.activeElement as HTMLElement)?.dataset.focusKey;
  headingFocus = route !== lastRoute;
  lastRoute = route;
  document
    .querySelectorAll<HTMLAnchorElement>("nav[aria-label='Primary'] a")
    .forEach((link) => {
      const active =
        link.hash ===
        (route === "insights" || route.startsWith("results/")
          ? "#insights"
          : "#home");
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  if (!session) {
    reviewOperation++;
    audio.stop();
  }
  host.replaceChildren();
  if(route==="insight-setup"&&insightPreview){if(insightPreview.kind==="progression")disposeProgression=mountProgression(host,insightPreview.config.mode,false,undefined,insightPreview);else config();}
  else if(route==="insight-setup"){host.append(el("p","This temporary draft is no longer available. Return to its Insights evidence."),button("Back to Insights",()=>location.hash="insights"));}
  else if (route === "progression" || route.startsWith("progression/")) { try {disposeProgression=mountProgression(host,Object.values(progressionModes).find(mode => mode === route.split("/")[1]) ?? progressionModes.degreeRecognition,route.endsWith("/start"),route.split("/")[2] === "results" ? decodeURIComponent(route.split("/")[3] ?? "") : undefined);} catch(e){report(e);} }
  else if (route === "practice" && session) renderPractice();
  else if (route === "configure") config();
  else if (route === "insights") insights();
  else if (route.startsWith("results/")) results(route.slice(8));
  else home();
  if (!headingFocus) restoreControl(focusedKey);
}
document.querySelector<HTMLAnchorElement>(".skip-link")!.addEventListener("click", (event) => {
  event.preventDefault();
  host.focus();
});
document.querySelector<HTMLAnchorElement>("nav[aria-label='Primary'] a[href='../jazz-ear-lab/']")!.addEventListener("click", (event) => {
  if (!session) return;
  finish(null);
  if (dirty) {
    event.preventDefault();
    location.hash = "results/" + sessions[sessions.length - 1].id;
    render();
  }
});
window.addEventListener("hashchange", render);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) question?.interrupt("hidden");
});
window.addEventListener("pagehide", () => {
  reviewOperation++;
  if (question) question.interrupt("pagehide");
  else audio.stop();
});
window.addEventListener("beforeunload", (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});
load();
