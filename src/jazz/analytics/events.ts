import type { Config, Session, Challenge } from "../model.js";
import type { Capture } from "./types.js";
import { enqueue } from "./repository.js";
export class AttemptCapture {
  private start: number | null = null;
  private active = 0;
  private sequence = 0;
  private committed = false;
  value: Capture;
  constructor(
    readonly session: Session,
    readonly index: number,
    readonly step: number,
    config: Config,
    challenge: Challenge,
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
      timingVersion: "active-decision-1",
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
    this.event(type);
  }
  open() {
    if (!this.committed) {
      this.start = performance.now();
      if (!this.value.reasons.length) this.value.validity = "valid";
      this.event("response_window_opened");
    }
  }
  play(replay: boolean, config: Config) {
    this.suspend(replay ? "context_replayed" : "context_play_started");
    if (replay && !this.committed) this.value.contextReplays++;
    this.value.effectiveConfig = structuredClone(config);
  }
  interrupt(reason: string) {
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
