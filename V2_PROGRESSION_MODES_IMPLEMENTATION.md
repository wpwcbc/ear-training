# V2 progression modes delivery

The user approved the composition direction on 2026-10-26. Progression Recognition
and Guided Singing are now available from separate buttons on the V2 Practice
homepage. The implementation retains Signal Route / Split Desk styling, uses the
existing theory/Web Audio primitives and adds no application dependency.

## Behavior

- Editable major/minor ii–V–I and backdoor templates; custom 2–32 chord occurrences,
  whole transposition, 1–16 beats per occurrence, BPM 20–300 and 1–4 sequential
  evenly spaced targets per chord. A four-beat count-in precedes playback.
- Independent per-quality target pools, repetitions allowed, overall volume and
  original-voice 0–200% levels. Named saved presets preserve independent settings.
- Recognition plays the entire sequence, then enables one answer board. Answers
  may be filled in any order and survive whole replay. Joint submission requires
  a degree or Don't know in every position; first results remain locked.
- Guided Singing displays all targets and plays full accompaniment without a
  separate melody. Done waits for the complete timeline, including silent sections.
  A whole reference precedes individual self-ratings; Unknown and unassessed remain
  distinct. No microphone grading is performed.
- Fixed sessions count progression questions; Unlimited supports Next until Stop.
  Next generates fresh question identities/material within the same progression.
  Results reference playback uses frozen settings and generated notes.
- Two new module views feed assessed note accuracy into Overall without an extra
  whole-question grade. Progression timing is unavailable and excluded from Overall
  speed. Assistance is per assessed note; replay event counts deduplicate by
  question even when the selected chord/root excludes the first note.
- Audio cancellation handles replay replacement, interruption, Stop and navigation;
  contexts close when the progression surface is disposed. Device interruption
  cannot fabricate completion. Unwritten results remain in memory across route
  changes, retain an unload warning and expose Retry saving on return.

## Persistence and compatibility

Progression presets and history use separate `jazzEarLab:v2:progressionPresets` and
`jazzEarLab:v2:progressionHistory` keys. Existing single-chord and Legacy records
are not rewritten. Stored progression snapshots include the actual harmony,
tempo, durations, pools, generated positions and sound settings. The reporting
adapter retains stable target-position identities, source and replay-question
identity; it does not fabricate single-note response times.

## Validation

- TypeScript builds; full Node suite: **141 passed**, no failures or skips.
- New progression browser flow passes in Chromium, starting from the homepage:
  arbitrary-order answer/replay retention, first submission, singing reference and
  partial ratings, Overall 1/7 with no timing sample, silent-sequence readiness,
  storage failure → navigation → retry, named-preset isolation, retained mix panel
  and checkbox/numeric keyboard focus, Unlimited next/Stop, and no mobile overflow.
- Real OfflineAudioContext rendering verifies a boosted four-note progression
  spanning three-/four-/five-voice chords stays below hard clipping at maximum
  overall volume. Existing single-chord voice-output browser checks also pass.
- Existing V2 lifecycle and target/mix browser regressions pass in Chromium.
  Existing Legacy/V2 entry regression also passed (seven Legacy modes remain reachable).
- Separate Standards and Spec reviews identified and resolved timeline completion,
  replay aggregation, focus, provenance, context disposal and unsaved-data defects.
  Follow-up confirmed the reported findings resolved.
- Desktop/mobile runtime captures were inspected against the approved direction;
  explicit states and musical behavior were exercised through the public browser
  flow, not inferred from static compositions.

Chromium results do not establish physical Safari/iOS behavior, screen-reader
speech, subjective timbre or measured singing accuracy. Hardware listening remains
manual. The broad legacy browser command was not rerun in full; its previously
recorded preset-delete baseline failure and outdated selectors are not described
as passing. No GitHub issue/PR creation or merge is implied by local delivery.
