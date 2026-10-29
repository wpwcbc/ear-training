# 02: Random-key pool, All and balanced question draws

**What to build:** Choose Random and an eligible key set in progression configuration, practise a balanced shuffled cycle, and replay each question in its original drawn key.

**Blocked by:** 01 — C-source progression and fixed practice keys

**Status:** done

- [x] Provide Fixed/Random with twelve distinct pitch-class choices and All. Initially select all twelve when Random is first chosen; preserve subsequent pool edits and retain the pool while temporarily using Fixed.
- [x] A singleton pool is valid. An empty pool disables Start with a correction route, retaining the invalid draft and last valid saved preset; do not silently substitute C or All.
- [x] Freeze the session key pool. Draw each selected key once per shuffled cycle; at cycle boundaries avoid immediate repetition when multiple keys exist. A new session may initialize a new bag.
- [x] Only generation of a new question consumes a draw. Replay, reference, rerender, saving and completed-Results reload neither consume another draw nor regenerate the actual key or melody.
- [x] Carry actual drawn key and source/policy snapshots through practice, direct Results/reference and preset reload; preserve independent target sampling and allow repeated target degrees.
- [x] Keep the controls and key policy reusable by the later Progression Play by Ear path, without requiring that new mode to exist before this slice can be demonstrated.
- [x] Verify {C, Eb, F#} over multiple cycles, All uniqueness, singleton/empty pools, Fixed/Random switching, preset isolation, frozen active settings and stable replay through UI plus existing public generation boundaries.
- [x] Own desktop/mobile, keyboard, autosave/validation and regression checks. Existing progression outcomes and Overall response-time statistics remain unchanged.

**Spec user-story coverage:** 4–11, 16, 51, 61–63.

**Spec acceptance-example coverage:** 3–4, 14–16.


Delivery and acceptance: [implementation report](../../../V2_KEYS_AND_PLAY_BY_EAR_IMPLEMENTATION.md). Completed locally on 2026-10-29; deployment is separate.
