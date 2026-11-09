import { answer, rate } from "./model.js";
// One instance owns one question, including all work still waiting on its audio.
export class QuestionLifecycle {
    constructor(record, audio, effects) {
        this.record = record;
        this.audio = audio;
        this.effects = effects;
        this.state = {
            busy: false,
            ready: false,
            done: false,
            choosingWrong: false,
            resolved: false,
            feedback: "",
        };
        this.playback = null;
        this.referencePending = false;
        this.started = 0;
        this.begun = false;
        this.disposed = false;
        this.operation = 0;
        this.transition = 0;
    }
    get view() {
        return { ...this.state, sounding: !this.disposed && this.state.ready && (this.playback?.activeVoices ?? 0) > 0, reference: this.referencePending };
    }
    async act(action) {
        if (!this.active())
            return;
        if (action.type === "start") {
            if (this.begun)
                return;
            this.begun = true;
            await this.play(false);
            return;
        }
        if (!this.begun)
            return;
        const a = this.record, s = this.state;
        switch (action.type) {
            case "listen": {
                const reference = s.done || s.resolved || this.referencePending;
                if (a.exercise === "m2" && this.referencePending && !s.resolved)
                    await this.reveal();
                else
                    await this.play(this.started > 0 && (!reference || a.revealedReference), reference);
                break;
            }
            case "answer": {
                if (a.exercise !== "m2" || !this.canRespond() || s.resolved)
                    return;
                const correct = answer(a, action.degree, this.elapsed());
                if (correct)
                    a.revealedReference = true;
                s.resolved = correct;
                s.feedback = correct ? "Correct" : "Incorrect";
                this.publish(true);
                if (correct)
                    this.scheduleAdvance({ delayMs: 1000, fade: true });
                break;
            }
            case "done":
                if (a.exercise !== "m1" || s.done || !this.canRespond())
                    return;
                a.firstResponseMs = this.elapsed();
                s.done = true;
                this.effects.save();
                await this.play(false, true);
                break;
            case "incorrect":
                if (a.exercise !== "m1" || !s.done || !a.revealedReference ||
                    !this.canRespond() || s.resolved || s.choosingWrong)
                    return;
                s.choosingWrong = true;
                s.feedback = "Incorrect";
                this.publish();
                break;
            case "rate":
                if (a.exercise !== "m1" || !s.done || !a.revealedReference ||
                    !this.canRespond() || s.resolved || a.firstCorrect !== null ||
                    (action.correct ? s.choosingWrong : !s.choosingWrong))
                    return;
                rate(a, action.correct, action.wrong);
                s.resolved = true;
                s.feedback = action.correct ? "Self-rated Correct" : "Self-rated Incorrect";
                this.publish(true);
                if (this.playback)
                    this.scheduleAdvance({ after: this.playback.completed });
                break;
            case "reveal":
                if (a.exercise === "m2" && a.firstAnswer !== null && !s.resolved && !s.busy)
                    await this.reveal();
                break;
            case "next":
                if (s.resolved && this.canRespond())
                    this.advance();
                break;
        }
    }
    interrupt(reason) {
        if (this.disposed)
            return;
        this.invalidate();
        this.state.busy = false;
        this.state.ready = false;
        if (!this.state.done && this.record.firstAnswer === null)
            this.record.timingValidity = "interrupted";
        if (reason === "hidden")
            this.state.feedback =
                "Practice interrupted; unsubmitted timing excluded. Retry audio to continue.";
        this.effects.save();
        if (reason === "hidden")
            this.effects.change();
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.invalidate();
    }
    active() {
        return !this.disposed && this.effects.present();
    }
    canRespond() {
        return this.state.ready && !this.state.busy;
    }
    publish(save = false) {
        if (save)
            this.effects.save();
        this.effects.change();
    }
    cancelAdvance() {
        this.transition++;
        clearTimeout(this.timer);
        this.timer = undefined;
    }
    invalidate() {
        this.cancelAdvance();
        this.operation++;
        this.audio.stop();
    }
    advance() {
        if (!this.active())
            return;
        this.dispose();
        this.effects.advance();
    }
    scheduleAdvance({ after, delayMs = 0, fade = false, }) {
        this.cancelAdvance();
        if (!this.state.resolved ||
            this.record.configurationSnapshot.autoAdvance === false)
            return;
        const token = this.transition, operation = this.operation;
        const active = () => this.active() && token === this.transition && operation === this.operation;
        const advance = async () => {
            try {
                if (after && (await after) !== "completed")
                    return;
                if (!active())
                    return;
                if (fade && this.playback) {
                    const end = await this.playback.fadeOut();
                    if (end !== "completed" && end !== "faded")
                        return;
                }
                if (active())
                    this.advance();
            }
            catch (error) {
                if (active()) {
                    this.cancelAdvance();
                    this.state.ready = false;
                    this.state.feedback = "Audio unavailable. Retry audio before continuing.";
                    this.effects.change();
                    this.effects.error(error);
                }
            }
        };
        if (delayMs)
            this.timer = setTimeout(() => void advance(), delayMs);
        else
            void advance();
    }
    elapsed() {
        return this.record.timingValidity === "valid" && this.started
            ? Math.max(0, performance.now() - this.started)
            : null;
    }
    async play(replay, reference = false) {
        if (!this.active() || this.state.busy)
            return false;
        this.cancelAdvance();
        const a = this.record, c = a.configurationSnapshot, s = this.state;
        const token = ++this.operation;
        const active = () => this.active() && token === this.operation;
        if (reference)
            this.referencePending = true;
        s.busy = true;
        if (!s.ready)
            s.feedback = "";
        s.ready = false;
        this.effects.change();
        try {
            if (c.exercise === "m1" && !c.context && !reference) {
                if (!this.started) {
                    this.started = performance.now();
                    if (a.timingValidity !== "interrupted")
                        a.timingValidity = "valid";
                }
                s.ready = true;
                return true;
            }
            await this.audio.ready();
            if (!active())
                return false;
            const plan = reference
                ? this.audio.playReference(a.target.chord, a.target.midi, c.volume, c.exercise === "m1" && !replay ? this.playback : null, c.voiceLevels)
                : this.audio.playSingle(a.target.chord, c.exercise === "m2" ? a.target.midi : null, c.volume, c.context, { ...(c.exercise === "m1" ? { excludeTarget: a.target.midi } : {}), voiceLevels: c.voiceLevels });
            this.playback = plan;
            void plan.completed.then((end) => {
                if (end === "interrupted" && active())
                    this.audioUnavailable(new Error("Audio playback interrupted. Press Retry audio."));
                else if (active())
                    this.effects.change();
            });
            if (replay) {
                if (s.done || a.firstAnswer !== null)
                    a.replaysAfterFirst++;
                else
                    a.replaysBeforeFirst++;
            }
            if (!(await plan.ready) || !active())
                return false;
            if (!this.started && !reference) {
                this.started = performance.now();
                if (a.timingValidity !== "interrupted")
                    a.timingValidity = "valid";
            }
            if (reference)
                a.revealedReference = true;
            s.ready = true;
            this.effects.save();
            if (reference && s.resolved)
                this.scheduleAdvance({ after: plan.completed });
            return true;
        }
        catch (error) {
            if (active())
                this.audioUnavailable(error);
            return false;
        }
        finally {
            if (active()) {
                s.busy = false;
                this.effects.change();
            }
        }
    }
    audioUnavailable(error) {
        this.invalidate();
        this.playback = null;
        this.state.ready = false;
        this.state.busy = false;
        if (!this.state.done && this.record.firstAnswer === null)
            this.record.timingValidity = "interrupted";
        this.effects.save();
        this.state.feedback = "Audio unavailable. Retry audio before responding.";
        this.effects.error(error);
        this.effects.change();
    }
    async reveal() {
        const pending = this.play(this.started > 0 && this.record.revealedReference, true);
        const token = this.operation;
        if ((await pending) && this.active() && token === this.operation) {
            this.state.resolved = true;
            this.state.feedback = "Reference revealed. First answer unchanged.";
            this.publish(true);
            if (this.playback)
                this.scheduleAdvance({ after: this.playback.completed });
        }
    }
}
