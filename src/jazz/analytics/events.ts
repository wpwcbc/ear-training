import type { Config, Session, Challenge } from "../model.js";
import type { Capture } from "./types.js";
import { enqueue, captureAssessment } from "./repository.js";
export class AttemptCapture {
  private start: number | null = null;
  private active = 0;
  private sequence = 0;
  private committed = false;
  private currentStage = -1;
  private stageStart: number | null = null;
  private stageActive = 0;
  value: Capture;
  constructor(
    readonly session: Session,
    readonly index: number,
    readonly step: number,
    config: Config,
    readonly challenge: Challenge,
    restored = false,
    attemptOrdinal?: number,
  ) {
    const previous = session.records.filter(
      (r) => r.questionIndex === index && r.chordStep === step,
    );
    const ordinal = attemptOrdinal ?? previous.length + 1,
      questionId = `${session.id}:q${index}`;
    this.value = {
      id: `${questionId}:s${step}:a${ordinal}`,
      questionId,
      attemptOrdinal: ordinal,
      createdAt: new Date().toISOString(),
      effectiveConfig: structuredClone(config),
      timingVersion:
        config.mode === "m6" && config.phraseFocus
          ? "phrase-stage-active-1"
          : "active-decision-1",
      activeMs: null,
      validity: restored ? "interrupted" : "unknown",
      reasons: restored ? ["lifecycle-restored"] : [],
      contextReplays: 0,
      referenceReplays: 0,
    };
    enqueue("questions", {
      id: questionId,
      ...{
        schemaVersion: 2,
        sessionId: session.id,
        challenge: structuredClone(challenge),
        config: structuredClone(config),
      },
    });
    enqueue("sessions", {
      id: session.id,
      ...{
        schemaVersion: 2,
        session: structuredClone({
          ...session,
          records: [],
          questions: undefined,
        }),
      },
    });
    this.event(restored ? "lifecycle_restored" : "question_presented");
    if (
      !restored &&
      index === 0 &&
      ordinal === 1 &&
      step === (["m4", "m5"].includes(config.mode) ? 1 : 0)
    )
      this.event("session_started");
  }
  event(type: string, payload: unknown = {}) {
    enqueue("events", {
      id: `${this.value.id}:${crypto.randomUUID()}`,
      ...{
        schemaVersion: 2,
        sessionId: this.session.id,
        questionId: this.value.questionId,
        attemptId: this.value.id,
        stepId: String(this.step),
        sequenceNumber: ++this.sequence,
        occurredAt: new Date().toISOString(),
        activeOffsetMs: this.active,
        type,
        payload,
      },
    });
  }
  suspend(type: string) {
    if (this.start !== null) {
      this.active += performance.now() - this.start;
      this.start = null;
    }
    if (this.stageStart !== null) {
      this.stageActive += performance.now() - this.stageStart;
      this.stageStart = null;
    }
    this.event(type);
  }
  open() {
    if (!this.committed) {
      this.start = performance.now();
      if (!this.value.reasons.length) this.value.validity = "valid";
      this.event("response_window_opened");
    }
  }
  restartWindow() {
    this.suspend("stage_context_completed");
    this.active = 0;
    this.committed = false;
    this.value.activeMs = null;
    this.open();
  }
  stage(stage: number) {
    if (this.currentStage !== stage) {
      this.currentStage = stage;
      this.stageActive = 0;
      this.stageStart = null;
      this.event("stage_started", { stage });
    }
    if (this.stageStart === null) this.stageStart = performance.now();
  }
  stageOutcome(
    stage: number,
    grade: "correct" | "close" | "missed",
    source: "self" | "automatic",
    assisted: boolean,
  ) {
    const names: Record<number, NonNullable<Config["phraseFocus"]>> = {
      1: "sing",
      2: "mark",
      3: "predict",
      5: "bass",
      6: "vary",
    };
    const focus = names[stage];
    if (!focus) return;
    const config = { ...this.value.effectiveConfig, phraseFocus: focus };
    const active = this.value.reasons.length
      ? null
      : this.stageActive +
        (this.stageStart === null ? 0 : performance.now() - this.stageStart);
    const capture = {
      ...this.snapshot(),
      id: this.value.id + ":stage" + stage,
      effectiveConfig: config,
      timingVersion: "phrase-stage-active-1",
      activeMs: active,
      validity: active === null ? ("interrupted" as const) : ("valid" as const),
    };
    const record = {
      analytics: capture,
      questionIndex: this.index,
      chordStep: this.step,
      timestamp: new Date().toISOString(),
      mode: config.mode,
      config,
      chords: this.challenge.targets.map((t) => t.chord.symbol),
      targets: this.challenge.targets.map((t) => t.degree),
      actualNotes: this.challenge.targets.map((t) => t.name),
      actualMidis: this.challenge.targets.map((t) => t.midi),
      progressionId: this.challenge.progressionId,
      responseLatency: 0,
      gradingSource: source,
      grade,
      replayCount: this.value.contextReplays,
      referenceAssisted: assisted,
    };
    captureAssessment({ ...this.session, records: [record] }, 0);
    return active;
  }
  mappingOutcome(assisted: boolean) {
    const position = this.value.position;
    if (!position) return;
    const config = this.value.effectiveConfig,
      target = this.challenge.targets[0],
      active =
        this.value.validity === "valid"
          ? this.active +
            (this.start === null ? 0 : performance.now() - this.start)
          : null;
    const capture = {
      ...this.snapshot(),
      id: this.value.id + ":mapping",
      assessmentSource: "visual" as const,
      timingVersion: "visual-mapping-active-1",
      activeMs: active,
    };
    const record = {
      analytics: capture,
      questionIndex: this.index,
      chordStep: this.step,
      timestamp: position.committedAt ?? new Date().toISOString(),
      mode: config.mode,
      config,
      chords: [target.chord.symbol],
      targets: [target.degree],
      actualNotes: [target.name],
      actualMidis: [target.midi],
      progressionId: this.challenge.progressionId,
      responseLatency: 0,
      gradingSource: "automatic" as const,
      grade:
        position.midi === target.midi
          ? ("correct" as const)
          : ("missed" as const),
      replayCount: this.value.contextReplays,
      referenceAssisted: assisted,
    };
    captureAssessment({ ...this.session, records: [record] }, 0);
  }
  lifecycle(type: string) {
    this.suspend(type);
    enqueue("sessions", {
      id: this.session.id,
      schemaVersion: 2,
      session: structuredClone({
        ...this.session,
        records: [],
        questions: undefined,
      }),
    } as { id: string });
  }
  play(replay: boolean, config: Config) {
    this.suspend(replay ? "context_replayed" : "context_play_started");
    if (replay && !this.committed) this.value.contextReplays++;
    this.value.effectiveConfig = structuredClone(config);
  }
  interrupt(reason: string) {
    if (this.committed && reason !== "whole-activity-no-reaction-time") {
      this.event(reason, { afterResponse: true });
      return;
    }
    this.suspend(reason);
    this.value.validity = "interrupted";
    this.value.activeMs = null;
    if (!this.value.reasons.includes(reason)) this.value.reasons.push(reason);
  }
  commit(type: string, timed = false) {
    if (this.committed) return;
    this.suspend(type);
    this.committed = true;
    this.value.activeMs =
      !timed && this.value.validity === "valid" ? this.active : null;
    if (timed) this.value.reasons.push("automatic-reveal-without-ready");
  }
  snapshot(): Capture {
    return structuredClone(this.value);
  }
}
