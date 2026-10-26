# V2 Progression Recognition and Guided Audiation — discovery

Status: Design interview opened on 2026-10-26. No implementation authorized by
this document; unsettled choices remain explicit. This is a new V2 progression
scope beyond Release 1, not a request to replace Legacy progression exercises.

## User request

- Two progression-based modes, with custom progressions and common presets such
  as major ii–V–I, minor ii–V–i and backdoor progressions.
- Recognition: one to several target notes per chord, play the entire progression
  continuously, then answer their chord-relative degrees.
- Guided singing: display the requested degrees for the entire progression,
  perform them, then check the whole progression together, similar to M1.
## Confirmed round 1 (Q1–Q5)

- Degree is relative to the chord sounding at that target position, not the
  progression's key. Show the full chord sequence and current-chord indication.
- Targets within a chord are sequential melody notes, not a simultaneous chord.
  Initial scope: a configurable uniform 1–4 notes per chord, evenly distributed
  within that chord's duration; complex rhythms are not initially required.
- Recognition plays the whole progression before answering. All target positions
  remain on one answer board. The user may fill confident beginning/end answers
  before resolving uncertain middle positions; do not impose linear submission
  or separate per-note screens. Submit the board together, grade every note
  independently, and preserve first-submission evidence across later corrections.
- Guided singing displays all requested degrees up front. The initial pass plays
  accompaniment without a separate target melody while the user sings. Done
  triggers a whole-progression accompaniment-plus-target reference.
- After hearing the reference, the user self-rates every target note separately.
  Recognition grades and singing self-ratings remain distinct in provenance.
  Per-chord and whole-progression results may summarize those per-note outcomes;
  a whole-run self-rating must never be expanded into fabricated note grades.

## Questions still open

- Replay scope, answer preservation and playback/answer interaction.
- Multi-target accompaniment exclusion: whether to omit all target pitch classes,
  and how to handle a chord with no accompaniment left.
- Progression editor, transposition, preset contents and harmonic durations.
- Target generation/pools, voice mix, replay/latency and Overall integration.
- Incomplete submissions, skipped/self-unassessed notes and correction flow.

Existing Release 2 notes proposed one target per chord initially. This new request
explicitly extends discovery to multiple notes per chord; do not silently constrain
it to that older one-note proposal. No microphone verification, new mode IDs or
automatic grading of sung pitch is assumed.
