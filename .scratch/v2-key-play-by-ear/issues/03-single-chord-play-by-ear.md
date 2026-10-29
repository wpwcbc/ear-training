# 03: Single Chord Play by Ear: listen, play, check and record

**What to build:** Launch a dedicated single-chord instrumental reproduction task, automatically hear and imitate its target, self-assess it after reference, and review the saved first outcome and additional completion delay.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Add the canonical Single Chord · Play by Ear entry without replacing existing entries or reclassifying old played-method Audiation. Reuse applicable root/quality/degree-pool, voice mix, volume and session controls, with BPM 20–300.
- [x] Use one chord and one target. Show known harmony but hide target degrees and degree-answer inputs during demonstration and performance. Demonstrate sound before imitation; do not reuse shown-degree M1 as the task.
- [x] Naturally complete demonstration → one four-beat count-in → one four-beat accompaniment-only performance bar automatically, with no Start playing action. Retain full accompaniment, target-independent levels, original-voice mix and headroom.
- [x] Gate Done on natural backing completion, start a monotonic additional-delay interval there, and freeze it on first Done. A controlled 2.4-second interval records 2.4 seconds independent of reference/self-rating duration; valid silent backing retains its scheduled duration.
- [x] Done starts the full reference. Only after its natural completion reveal the degree and allow explicit All correct or incorrect-position/optional different-degree-or-Unknown plus Remaining notes correct and submit.
- [x] Keep assessment drafts editable; do not grade on error selection alone. All correct can replace uncommitted drafts. Freeze the first committed self-rating, preserve unassessed on early Stop, and permit comfortable octave-equivalent playing without rhythm grading.
- [x] Provide fixed/Unlimited sessions and manual Next/Finish. Direct Results display instrumental/self-assessed provenance, the one target outcome, individual question delay/validity and frozen reference; save/retry and completed-session reload preserve them.
- [x] Own whole-cycle pre-Done replay assistance, explicit interruption recovery, cancellation on Stop/navigation, no manufactured zero/Done on failure, and reference retry that preserves the first Done interval. Separate new delay from legacy response-time fields from the outset.
- [x] Perform any necessary small common Play by Ear phase/timing/assessment extraction before adding the single-chord behavior, then exercise it in this live slice. The later progression slice reuses that proven contract; do not build a general exercise framework.
- [x] Verify the end-to-end single-target route, timing/audio boundaries via existing public interfaces where necessary, exact-once persistence, old-mode grading/audio regressions, desktop/mobile, keyboard focus and visible recovery.

**Spec user-story coverage:** 19, 21–25, 27–31, 33–51, 52–53, 59–64 (single-chord scope).

**Spec acceptance-example coverage:** 5–8, 10–11, 14–16 (single-chord scope).


Delivery and acceptance: [implementation report](../../../V2_KEYS_AND_PLAY_BY_EAR_IMPLEMENTATION.md). Completed locally on 2026-10-29; deployment is separate.
