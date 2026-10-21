import { enqueue } from "../jazz/analytics/repository.js";
import { stable } from "../jazz/analytics/types.js";
export type LegacySource =
  "degree" | "interval" | "chord-quality" | "progression-id";
export interface AnswerItem {
  degree?: string;
  quality?: string;
  label?: string;
}
export interface LegacyTrial {
  source: LegacySource;
  sessionId: string;
  questionId: string;
  config: unknown;
  task: string;
  question: unknown;
  expected: AnswerItem[];
  options: unknown;
  exposure: "fresh" | "exact-review";
  presentedAt: string;
  ordinal: number;
  selected: AnswerItem[];
  correct: boolean;
  components: { degree?: boolean; quality?: boolean; label?: boolean }[];
  committedAt: string;
  responseActiveMs: number | null;
  timingVersion: "legacy-active-decision-1";
  contextReplays: number;
}
export interface LegacyEvent {
  id: string;
  schemaVersion: 2;
  type: string;
  occurredAt: string;
  source: LegacySource;
  sessionId: string;
  questionId?: string;
  payload: unknown;
  trial?: LegacyTrial;
}
export class LegacyLogger {
  private sessionId = "";
  private config: unknown;
  private task = "";
  private exposure: "fresh" | "exact-review" = "fresh";
  private question: unknown;
  private expected: AnswerItem[] = [];
  private options: unknown;
  private questionId = "";
  private presentedAt = "";
  private counter = 0;
  private ordinal = 0;
  private replays = 0;
  private plays = 0;
  private startMs: number | null = null;
  private active = 0;
  private timer = 0;
  private interrupted = false;
  private resolved = false;
  constructor(readonly source: LegacySource) {
    if (typeof window !== "undefined") {
      window.addEventListener("pagehide", () => this.end("pagehide"));
      document.addEventListener("visibilitychange", () => {
        if (document.hidden && this.questionId) {
          this.suspend();
          this.interrupted = true;
          this.event("visibility_interrupted");
        }
      });
    }
  }
  private event(type: string, payload: unknown = {}, trial?: LegacyTrial) {
    if (!this.sessionId) return;
    const row: LegacyEvent = {
      id: `legacy:${this.source}:${crypto.randomUUID()}`,
      schemaVersion: 2,
      type,
      occurredAt: new Date().toISOString(),
      source: this.source,
      sessionId: this.sessionId,
      questionId: this.questionId || undefined,
      payload: structuredClone(payload),
      trial,
    };
    enqueue("events", row);
  }
  start(
    config: unknown,
    task: string,
    exposure: "fresh" | "exact-review" = "fresh",
  ) {
    this.end("restarted");
    this.sessionId = crypto.randomUUID();
    this.config = structuredClone(config);
    this.task = task;
    this.exposure = exposure;
    this.counter = 0;
    this.event("legacy_session_started", {
      config: this.config,
      task,
      exposure,
    });
  }
  present(question: unknown, expected: AnswerItem[], options: unknown) {
    if (!this.sessionId) return;
    this.suspend();
    clearTimeout(this.timer);
    this.questionId = this.sessionId + ":q" + this.counter++;
    this.question = structuredClone(question);
    this.expected = structuredClone(expected);
    this.options = structuredClone(options);
    this.presentedAt = new Date().toISOString();
    this.ordinal = 0;
    this.replays = 0;
    this.plays = 0;
    this.active = 0;
    this.interrupted = false;
    this.resolved = false;
    this.event("legacy_question_presented", {
      config: this.config,
      task: this.task,
      exposure: this.exposure,
      question: this.question,
      expected: this.expected,
      options: this.options,
    });
  }
  private suspend() {
    if (this.startMs !== null) {
      this.active += performance.now() - this.startMs;
      this.startMs = null;
    }
  }
  beginPlayback() {
    this.suspend();
    clearTimeout(this.timer);
  }
  audioFailed() {
    this.beginPlayback();
    this.interrupted = true;
    this.event("legacy_audio_failed");
  }
  play(durationMs: number) {
    if (!this.questionId || this.resolved) return;
    this.suspend();
    clearTimeout(this.timer);
    if (this.plays++) this.replays++;
    this.event(
      this.plays > 1
        ? "legacy_context_replayed"
        : "legacy_context_play_started",
      { scheduledDurationMs: durationMs },
    );
    const id = this.questionId;
    this.timer = window.setTimeout(() => {
      if (this.questionId !== id || this.resolved) return;
      this.event("legacy_context_play_ended");
      if (!document.hidden) {
        this.startMs = performance.now();
        this.event("legacy_response_window_opened");
      }
    }, durationMs);
  }
  answer(selected: AnswerItem[]): boolean | undefined {
    if (!this.questionId || this.resolved) return;
    const valid = this.startMs !== null && !this.interrupted;
    this.suspend();
    const components = this.expected.map(
      (expected, i) =>
        Object.fromEntries(
          Object.entries(expected).map(([key, value]) => [
            key,
            selected[i]?.[key as keyof AnswerItem] === value,
          ]),
        ) as LegacyTrial["components"][number],
    );
    const correct =
      selected.length === this.expected.length &&
      components.every((item) => Object.values(item).every(Boolean));
    const trial: LegacyTrial = {
      source: this.source,
      sessionId: this.sessionId,
      questionId: this.questionId,
      config: structuredClone(this.config),
      task: this.task,
      question: structuredClone(this.question),
      expected: structuredClone(this.expected),
      options: structuredClone(this.options),
      exposure: this.exposure,
      presentedAt: this.presentedAt,
      ordinal: ++this.ordinal,
      selected: structuredClone(selected),
      correct,
      components,
      committedAt: new Date().toISOString(),
      responseActiveMs: valid ? this.active : null,
      timingVersion: "legacy-active-decision-1",
      contextReplays: this.replays,
    };
    this.event("legacy_answer_committed", {}, trial);
    this.active = 0;
    this.resolved = correct;
    if (correct) clearTimeout(this.timer);
    else if (valid) this.startMs = performance.now();
    return correct;
  }
  end(reason: string) {
    if (!this.sessionId) return;
    this.suspend();
    clearTimeout(this.timer);
    this.event("legacy_session_ended", {
      reason,
      unresolvedQuestion:
        this.questionId && !this.resolved ? this.questionId : null,
    });
    this.questionId = "";
    this.sessionId = "";
  }
}
const loggers = new Map<LegacySource, LegacyLogger>();
if (
  typeof window !== "undefined" &&
  !location.pathname.includes("jazz-ear-lab")
)
  window.addEventListener("insights-storage-error", (event) => {
    let alert = document.getElementById("legacy-save-error");
    if (!alert) {
      alert = document.createElement("p");
      alert.id = "legacy-save-error";
      alert.setAttribute("role", "alert");
      document.body.prepend(alert);
    }
    alert.textContent = (event as CustomEvent<string>).detail;
  });
export function legacyLogger(source: LegacySource): LegacyLogger {
  let logger = loggers.get(source);
  if (!logger) {
    logger = new LegacyLogger(source);
    loggers.set(source, logger);
  }
  return logger;
}
export function legacySummary(events: LegacyEvent[], source: LegacySource) {
  const trials = events
    .filter(
      (e) =>
        e.source === source && e.type === "legacy_answer_committed" && e.trial,
    )
    .map((e) => e.trial!);
  const first = trials.filter((t) => t.ordinal === 1 && t.exposure === "fresh"),
    presented = new Set(
      events
        .filter(
          (e) => e.source === source && e.type === "legacy_question_presented",
        )
        .flatMap((e) => (e.questionId ? [e.questionId] : [])),
    );
  const answered = new Set(trials.map((t) => t.questionId));
  const confusion = new Map<
    string,
    { expected: string; selected: string; count: number }
  >();
  first.forEach((t) =>
    t.expected.forEach((item, i) => {
      const expected = stable(item),
        selected = stable(t.selected[i]);
      if (expected === selected) return;
      const key = expected + ">" + selected,
        row = confusion.get(key) ?? { expected, selected, count: 0 };
      row.count++;
      confusion.set(key, row);
    }),
  );
  return {
    first,
    correct: first.filter((t) => t.correct).length,
    count: first.length,
    unresolved: [...presented].filter((id) => !answered.has(id)).length,
    trials,
    confusions: [...confusion.values()],
  };
}
export interface LegacyLaunch {
  id: string;
  source: LegacySource;
  config: unknown;
  task: string;
  question?: unknown;
  reason: string;
}
const launchKey = (source: LegacySource) =>
  "eartrain:insights:launch:" + source;
export function prepareLegacyLaunch(
  trial: LegacyTrial,
  exact: boolean,
): string {
  const launch: LegacyLaunch = {
    id: crypto.randomUUID(),
    source: trial.source,
    config: trial.config,
    task: trial.task,
    question: exact ? trial.question : undefined,
    reason: exact
      ? "Exact saved question review"
      : "Practice with the original settings",
  };
  localStorage.setItem(launchKey(trial.source), JSON.stringify(launch));
  const directory =
    trial.source === "degree"
      ? "degree-trainer"
      : trial.source === "interval"
        ? "interval-trainer"
        : trial.source;
  return `../${directory}/?insight=${encodeURIComponent(launch.id)}`;
}
export function installLegacyLaunch(
  source: LegacySource,
  start: (launch: LegacyLaunch) => Promise<void>,
) {
  const token = new URLSearchParams(location.search).get("insight");
  if (!token) return;
  try {
    const launch = JSON.parse(
      localStorage.getItem(launchKey(source)) ?? "null",
    ) as LegacyLaunch | null;
    if (
      !launch ||
      launch.id !== token ||
      launch.source !== source ||
      !launch.config
    )
      throw new Error("This saved practice setup is unavailable.");
    const panel = document.createElement("section"),
      heading = document.createElement("h2"),
      button = document.createElement("button"),
      status = document.createElement("p");
    heading.textContent = launch.reason;
    button.textContent = "Start focused practice";
    button.type = "button";
    status.setAttribute("role", "status");
    button.onclick = async () => {
      button.disabled = true;
      try {
        await start(launch);
        panel.hidden = true;
      } catch (error) {
        status.textContent = String(error);
        button.disabled = false;
      }
    };
    panel.append(heading, button, status);
    (document.querySelector("main") ?? document.body).prepend(panel);
  } catch (error) {
    const alert = document.createElement("p");
    alert.setAttribute("role", "alert");
    alert.textContent = String(error);
    document.body.prepend(alert);
  }
}
