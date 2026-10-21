import { enqueue } from "../jazz/analytics/repository.js";
export class PlaybackActivity {
    constructor() {
        this.sessionId = "";
        this.started = null;
        this.at = "";
        this.timer = 0;
        this.deadline = Infinity;
        this.playing = false;
        if (typeof window !== "undefined") {
            window.addEventListener("pagehide", () => this.stop());
            document.addEventListener("visibilitychange", () => {
                if (document.hidden)
                    this.close("background");
                else if (this.playing && this.deadline > performance.now())
                    this.open();
            });
        }
    }
    start(config, task) {
        this.stop();
        this.sessionId = crypto.randomUUID();
        this.config = structuredClone({ config, task });
        this.playing = true;
    }
    begin(context, durationMs) {
        this.close("context-change");
        this.context = structuredClone(context);
        this.deadline =
            durationMs === undefined ? Infinity : performance.now() + durationMs;
        this.playing = true;
        if (!document.hidden)
            this.open();
    }
    open() {
        if (!this.sessionId || this.started !== null)
            return;
        this.started = performance.now();
        this.at = new Date().toISOString();
        clearTimeout(this.timer);
        if (Number.isFinite(this.deadline))
            this.timer = window.setTimeout(() => {
                this.close("scheduled-end");
                this.playing = false;
            }, Math.max(0, this.deadline - performance.now()));
    }
    close(reason) {
        clearTimeout(this.timer);
        if (this.started === null)
            return;
        const activeMs = Math.max(0, Math.min(performance.now(), this.deadline) - this.started);
        enqueue("events", {
            id: "drone:" + crypto.randomUUID(),
            ...{
                schemaVersion: 2,
                type: "drone_activity_segment",
                source: "drone",
                sessionId: this.sessionId,
                occurredAt: new Date().toISOString(),
                payload: {
                    startedAt: this.at,
                    activeMs,
                    context: this.context,
                    settings: this.config,
                    reason,
                    definitionVersion: "foreground-playback-1",
                },
            },
        });
        this.started = null;
    }
    stop() {
        this.close("stopped");
        this.playing = false;
        this.sessionId = "";
        this.context = undefined;
    }
}
export const droneActivity = new PlaybackActivity();
