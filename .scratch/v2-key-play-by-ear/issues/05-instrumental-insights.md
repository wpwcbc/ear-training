# 05: Play by Ear Insights: honest note accuracy and phrase-level delay

**What to build:** Review both new instrumental modules in Results/Insights, understand comparable all-correct completion delays, and include their self-assessed note accuracy in Overall without changing existing response-time statistics.

**Blocked by:** 04 — Progression Play by Ear: reproduce and self-assess the whole phrase

**Status:** done

- [x] Expose both new modules consistently in Insights, Results conditions and production provenance. Keep instrumental self-assessment separate from system grades, existing sung progression and old played-method Audiation.
- [x] Count each committed target once across reporting, reload and retry. Existing 15/30 plus new 4/6 yields Overall 19/36; do not average module percentages or add a phrase grade on top of target grades.
- [x] Only fully assessed all-correct, valid, unassisted/uninterrupted questions join the normal module-specific delay median. Keep assisted/recovered timing separately identified; incorrect, unassessed, interrupted and missing legacy intervals yield no positive normal timing sample.
- [x] One six-target phrase contributes one timing sample, never six. Comparable delays 1, 3 and 5 seconds produce a median of 3 seconds with n=3; show actual sample counts and unavailable/exclusion reasons.
- [x] Expose actual key and meaningful frozen comparison conditions: mode, timing/generation version, harmony/target difficulty, BPM, durations, notes per chord, key policy/pool and relevant playback conditions. Label mixed-key/condition observations without unsupported like-for-like improvement claims.
- [x] Keep new delay out of old per-note response-time fields and Overall response-time samples/cohorts/median. Adding new instrumental outcomes changes eligible accuracy only; no synthesized or divided per-note latency and no historical zero-fill.
- [x] Report replay-assisted note counts versus question-grain replay events correctly; mandatory demonstration, backing and first reference are phases, not requested replay events. Review activity cannot replace first evidence.
- [x] Verify Practice → committed check → Results → module Insights → Overall through isolated synthetic records. Use existing public reporting seams only for denominators, deduplication, cohort/median and unchanged-legacy timing assertions that UI alone cannot establish.
- [x] Own desktop/mobile readable conditions, keyboard controls and empty/insufficient-evidence states. The preceding slices already save and display individual question results; this slice adds cross-question/module evidence rather than delaying all verification.

**Spec user-story coverage:** 52–60, 61–64 (reporting scope).

**Spec acceptance-example coverage:** 12–13, 15–16.


Delivery and acceptance: [implementation report](../../../V2_KEYS_AND_PLAY_BY_EAR_IMPLEMENTATION.md). Completed locally on 2026-10-29; deployment is separate.
