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

## Confirmed round 2 (Q6–Q9)

- Replay is whole-progression replay only. Do not add chord-local or isolated-note
  replay from the earlier recommendation. Preserve all entered answers on replay.
- BPM is adjustable in settings. One shared tempo; each chord has its own beat
  duration (default four beats). Uniform 1–4 sequential notes per chord evenly
  divide its duration. Include the agreed one-bar count-in.
- Guided singing does not require target-pitch-class exclusion from accompaniment.
  Keep the full chord accompaniment; only the separate target melody is withheld
  until reference checking. Do not carry M1's single-target omission rule into
  this mode or remove all accompaniment when several chord tones are targets.
- Custom progressions use actual chord symbols with add/remove/reorder and
  per-chord duration, and support whole-progression transposition. Common presets
  are editable: major ii–V–I, minor ii–V–i and backdoor. Initial C examples are
  Dm7–G7–Cmaj7, Dm7b5–G7–Cm7 and Fm7–Bb7–Cmaj7; users may edit chord qualities.

## Next decisions

Per-quality target generation, within-chord repetition, incomplete answers,
self-rated wrong-degree detail, repeated progression questions and Insights
contribution are not settled by Q6–Q9. Earlier open-question bullets are resolved
only to the extent explicitly recorded in the confirmed rounds above.

## Confirmed round 3 (Q10–Q13)

- Each target position is independently generated from its chord quality's
  selected degree pool. Repeated degrees, including consecutive repetitions,
  are allowed. No initial voice-leading or curated-phrase generation.
- Recognition uses one board with arbitrary fill order and whole replay. Every
  position must contain a degree or explicit Don't know before joint submission.
  Don't know is incorrect but has no fabricated confusion direction. Answers
  may change freely before the first submission; preserve that first submission.
- Guided singing self-rates each target position Correct/Incorrect. Incorrect
  records the reported wrong degree or Unknown, like M1. Unassessed is supported
  and is not incorrect. Do not claim microphone-verified accuracy.
- A question is the entire progression. After grading it, next question retains
  the progression and generates new target material. Sessions support a fixed
  question count or Unlimited. No automatic progression switching initially.

## Confirmed round 4 (Q14–Q17)

- Recognition joint submission reveals per-position correctness and correct
  degrees; a whole-progression reference is available. Review replay does not
  change first grades.
- Guided singing waits for the initial full accompaniment pass to finish before
  Done can trigger the full accompaniment-plus-target reference. Per-position
  self-rating follows reference checking.
- Each new mode has its own results and contributes per-note accuracy to Overall.
  Each assessed target position has equal weight; do not add a duplicate
  whole-progression grade. Keep automatic versus self-rated provenance visible.
- The user's explicit timing boundary: progression speed does not contribute to
  Overall, while progression accuracy does. Do not feed any whole-progression
  timing into the M1/M2 single-note response-time median or invent per-note latency.
  Whether to display a progression-only completion-time statistic is not needed
  for the initial accuracy scope and remains deferred rather than an agreed
  extra metric. Whole-replay assistance attribution was proposed but was not
  explicitly confirmed by this timing-focused reply; do not silently treat it
  as settled.
- Each progression preset owns its per-quality target pools, voicing mix,
  overall volume, BPM and notes-per-chord count. Freeze settings at Start;
  Results replay reads the recorded configuration. Both modes retain chord
  accompaniment; guided singing adds the separate target melody only in reference.

## Discovery status after Q17

The main practice flow, generation, per-note grades and Overall accuracy boundary
are confirmed. Final consolidated confirmation is pending. Replay-assistance
attribution still needs an explicit decision if included in initial Insights.
No implementation, spec conversion or ticket execution has begun in this interview.
