# V2 Progression Keys and Play by Ear — Specification

Status: ready-for-agent (repository-local specification).
Synthesized 2026-10-29, Asia/Hong_Kong, from the completed interview and the user's
instruction to resolve routine details without further questions. Explicit decisions
and engineering defaults are distinguished in Further Notes. This document does
not claim implementation, completed acceptance tests, GitHub issue publication
or deployment.

## Problem Statement

Changing practice key currently changes the progression's editable chord symbols.
The musician cannot keep one C-reference progression while choosing its sounding
key, nor practise a selected set of keys with predictable coverage and stable replay.

Existing Degree Recognition asks for labels, while Degree Audiation shows requested
degrees before the target reference. Neither provides the desired listen-first
instrumental task: hear a note or complete phrase, reproduce it on an instrument
with accompaniment, then self-assess the result without answering degree questions.
The musician also needs to see how much additional time was needed after the
performance accompaniment ended, without confusing that observation with verified
playing speed or existing recognition response time.

## Solution

Give every V2 progression mode an unchanged C-source progression and a separate
Fixed/Random practice-key setting. Random draws from selected keys, with All,
shuffled equal-coverage cycles and a stable key throughout each question/replay.

Add **Single Chord · Play by Ear** and **Progression · Play by Ear** beside the
existing Degree Audiation and Degree Recognition families. Automatically demonstrate
the sound, count in, then play accompaniment without the target melody. The user
plays by ear; target degrees stay hidden until the checking boundary. After the
performance accompaniment finishes, count additional completion time until Done.
Then play the full reference, expose the correct degrees and collect explicit
self-assessment through All correct or position-specific errors plus confirmation
that the remaining notes were correct.

Keep per-note accuracy and question-level completion delay separate. Show the
instrumental/self-assessed source, contribute assessed notes to Overall accuracy,
and keep this new delay out of existing Overall response-time statistics.

## User Stories

1. As a musician, I want to keep a progression entered relative to C, so that changing practice key never destroys my editable source.
2. As a musician, I want the same key controls in every progression mode, so that I can practise the same harmony across exercise families.
3. As a musician, I want to choose a fixed destination key, so that I can concentrate on one key.
4. As a musician, I want to choose Random and select eligible keys, so that I can practise a deliberate key set.
5. As a musician, I want an All button, so that I can select all twelve keys quickly.
6. As a musician, I want one selected random key to remain valid, so that a small key pool is usable.
7. As a musician, I want an empty random pool to block Start with a clear correction, so that practice never chooses an unintended key.
8. As a musician, I want selected keys covered once per shuffled cycle, so that random practice does not neglect some keys.
9. As a musician, I want adjacent cycles to avoid repeating the same key when alternatives exist, so that the next question changes key meaningfully.
10. As a musician, I want a key drawn once per new question, so that each complete phrase has one coherent harmonic context.
11. As a musician, I want replay and reference to retain that question's key and notes, so that I can review the same task.
12. As a musician, I want displayed practice chords to match sounding chords, so that the known harmony is trustworthy.
13. As a musician, I want minor and borrowed harmony transposed with its qualities intact, so that changing key preserves the progression's relationships.
14. As a musician, I want chord-relative target degrees retained through transposition, so that changing key does not change the requested function.
15. As a musician, I want templates and custom editing to remain available, so that key practice does not restrict my harmonic material.
16. As a musician, I want saved key settings to belong to the edited preset, so that unrelated practice presets remain unchanged.
17. As a musician, I want a C-reference default with no sounding transposition, so that existing presets do not suddenly change sound or become random.
18. As a musician, I want old chord symbols preserved without tonic guessing, so that my existing material remains recognizable.
19. As a musician, I want a dedicated Single Chord · Play by Ear entry, so that I can hear and imitate one target without choosing degree labels.
20. As a musician, I want a dedicated Progression · Play by Ear entry, so that I can hear and reproduce a whole phrase.
21. As a musician, I want both new modes to share the Play by Ear name, so that I understand their common task and different harmonic contexts.
22. As a musician, I want the existing Audiation and Recognition entries retained, so that the new instrumental tasks do not replace different exercises.
23. As a musician, I want the known chord or progression visible, so that identifying the harmony is not an extra hidden task.
24. As a musician, I want target degrees hidden during demonstration and my attempt, so that I reproduce the sound rather than read the answer.
25. As a musician, I want to hear the target before trying to play it, so that these modes are listen-first imitation rather than shown-degree audiation.
26. As a musician, I want the whole progression demonstrated continuously, so that I hear the phrase in context.
27. As a musician, I want demonstration followed automatically by count-in and backing, so that I do not need another Start playing action.
28. As a musician, I want backing without an independent target melody, so that I supply the melody myself.
29. As a musician, I want full chord accompaniment retained, so that a target that is also a chord tone does not hollow out the harmony.
30. As a musician, I want a one-bar count-in, so that I know when the instrumental performance pass starts.
31. As a musician, I want single-chord backing to last four beats with configurable BPM, so that its response opportunity is predictable.
32. As a musician, I want progression backing to use its configured BPM and chord durations, so that the instrumental task respects harmonic rhythm.
33. As a musician, I want Done unavailable before backing completes, so that every question has the same completion boundary.
34. As a musician, I want extra completion time measured after backing ends, so that time needed to continue thinking or playing is visible.
35. As a musician, I want the first Done action to freeze that time, so that listening to the reference and grading myself do not inflate it.
36. As a musician, I want full reference playback after Done, so that I can compare my performance with the demonstrated material.
37. As a musician, I want correct degrees revealed during checking, so that I can understand and annotate errors afterward.
38. As a musician, I want All correct, so that I can explicitly assess every target with one action when the whole attempt was correct.
39. As a musician, I want to mark incorrect positions on the complete harmonic board, so that I can identify scattered errors without serial screens.
40. As a musician, I want optional wrong-degree or Unknown annotations, so that I can record what I played without being forced into a degree quiz.
41. As a musician, I want Remaining notes correct and submit, so that I can assess the rest of a mostly correct phrase explicitly.
42. As a musician, I want drafts editable before submission and first submitted assessments retained, so that accidental draft selections and later review have distinct effects.
43. As a musician, I want unfinished self-assessment to remain unassessed, so that stopping early does not silently create correct or incorrect grades.
44. As a musician, I want to reproduce targets in a comfortable octave, so that the exercise is usable on my instrument.
45. As a musician, I want degree accuracy and additional completion time kept distinct from rhythm grading, so that the results describe what was actually assessed.
46. As a musician, I want full replay before checking, so that I can listen again without receiving new targets or another key.
47. As a musician, I want replay-assisted attempts identified separately, so that extra demonstrations are not presented as fresh unassisted performance.
48. As a musician, I want interrupted audio to offer recovery without fabricated completion or zero delay, so that technical problems do not improve my result.
49. As a musician, I want Stop, navigation and replacement playback to cancel obsolete sound and callbacks, so that one task cannot leak into another.
50. As a musician, I want fixed and Unlimited sessions, so that I can finish a set or continue until Stop.
51. As a musician, I want settings and material frozen for an active question, so that later preset edits cannot change its grading or reference.
52. As a musician, I want Results to identify my actual key, source settings and instrumental self-assessment, so that the evidence has understandable conditions.
53. As a musician, I want each assessed target counted once in accuracy, so that a whole-phrase action does not duplicate note outcomes.
54. As a musician, I want Play by Ear notes included in Overall accuracy with their source visible, so that the combined view retains honest provenance.
55. As a musician, I want one completion-delay sample per question, so that a longer phrase does not manufacture many speed samples.
56. As a musician, I want comparable all-correct-question delay summaries and sample counts, so that speed is not rewarded for incorrect or unassessed material.
57. As a musician, I want assisted and interrupted timing separated from ordinary timing, so that timing comparisons are not misleading.
58. As a musician, I want new delay metrics excluded from existing Overall response time, so that incompatible timing boundaries are not blended.
59. As a musician, I want old played-method audiation records kept in their original mode, so that they are not relabeled as listen-first performances.
60. As a musician, I want no invented timing for historical records, so that missing evidence remains unavailable rather than becoming zero.
61. As a musician, I want usable mobile and desktop key controls and assessment boards, so that the same task works on both devices.
62. As a keyboard user, I want contextual labels, visible focus and accurate phase announcements, so that automatic playback and bulk grading remain operable.
63. As a musician, I want failed saving shown with retry while my work is retained, so that new settings or self-assessments are not silently lost.
64. As a returning musician, I want Legacy, existing V2 modes, custom names, saved presets and history preserved, so that the feature does not damage previous practice.

## Implementation Decisions

### Scope and shared contracts

Extend existing V2 preset/configuration, generation, playback lifecycle, persistence,
Results and Insights contracts. Reuse existing chord parsing, pitch/degree conversion,
voicing, audio completion/cancellation, local saving and public model/reporting
interfaces. Do not introduce an alternative synthesis engine, test-only state
machine, microphone grading or a general exercise framework.

Keep the shared public vocabulary consistent across entry, configuration, practice,
Results and Insights. Retain existing exercise IDs, stored response-method meaning
and routes for existing modes. New mode identifiers and additive storage details
are implementation choices; do not overload an existing recognition/audiation ID
or infer a new exercise solely from an old played response-method tag.

Use the approved A harmonic-board and C+B configuration patterns and the existing
Signal Route typography, colors, touch targets and disclosure behavior. This feature
adds relevant controls and two entries; it does not authorize another visual-world
replacement. Show key policy in the Harmony chapter and summaries. Single-chord
roots remain their existing selection concept; the new C-source key policy applies
to progression modes, not a rewrite of single-chord root selection.

### C-source and sounding progression

- Treat the C-source as a transposition reference, not a requirement to prove a
  progression's tonic or forbid chromatic/borrowed chords. Accept the existing
  supported chord vocabulary and preserve source qualities, order and durations.
- Derive actual practice chords from the source plus one destination-key policy.
  Do not successively mutate already-transposed roots or apply both an old
  destructive offset and the new destination setting. Keep source inputs stable
  when changing key, key policy, chapters, or replaying practice.
- Example: source Dm7–G7–Cmaj7 with fixed Eb sounds and displays Fm7–Bb7–Ebmaj7;
  returning to C restores the original sound without rebuilding the source.
  Minor and backdoor examples follow the same semitone/root transformation.
- Keep chord-relative degrees and per-quality target pools unchanged by root
  transposition. Generate playable target pitches and voicings using existing
  register conventions; do not introduce a new contour/voice-leading promise.
  Displayed symbols, actual pitch classes and note outcomes must agree.
- Offer twelve distinct pitch-class keys with established supported root spellings;
  enharmonic aliases must not create duplicate lottery entries. No new key-signature
  spelling engine is required. Preserve altered/extended quality suffixes.
- Fixed C means zero transposition. Older presets with missing key fields retain
  their literal chord symbols and sound at zero offset. Do not guess their tonic
  or silently convert their original sequence into a different C progression.

### Random keys, validation and preset ownership

- Random uses a nonempty, duplicate-free pool. All selects all twelve keys.
  One selected key is valid; an empty pool disables Start with an actionable
  chapter/group error while retaining the invalid draft and last valid preset.
- Default new/legacy-compatible settings to Fixed C. On first selecting Random,
  initialize all twelve selected keys; thereafter retain the user's saved pool.
  Preserve the pool when temporarily switching back to Fixed.
- For an active session's frozen pool, shuffle a bag containing each eligible key
  once. Consume one draw per new question; refill only after exhaustion. When the
  pool contains multiple keys, the first draw in a new bag cannot equal the last
  draw of the preceding bag. A one-key pool intentionally repeats that key.
- Replay, reference, rerendering and saving do not consume draws. Starting a new
  session may initialize a new bag; no cross-session key-balance guarantee is needed.
  Configuration edits do not mutate the active session's frozen selection.
- Preserve current progression ranges: 2–32 chord occurrences, 1–16 beats each,
  20–300 BPM, 1–4 targets per chord and 0–200 questions, with zero Unlimited.
  Preserve supported target pools, voice levels 0–200% and output volume 0–100%.
  Keep existing preset isolation, autosave, unsaved-state/retry and invalid-draft
  behavior. Do not add unrelated audition or independent quality-enable controls.

### Play by Ear material and configuration

Single Chord · Play by Ear contains one known chord and one demonstrated target.
Reuse applicable single-chord root/quality and degree-pool selection, voice mix,
output volume and session controls, with configurable BPM in the progression's
supported range. The selected target pool controls demonstration material; it is
not a visible answer selector. Its performance backing is one four-beat bar after
one four-beat count-in.

Progression · Play by Ear reuses progression templates/custom harmony, source/key
policy, target pools, notes per chord, chord durations, BPM, voice mix, volume and
session controls. Targets remain sequential and evenly spaced within their chord
occurrence, with repeated targets and repeated chord symbols supported.

Both new modes demonstrate accompaniment plus independent target sound, then use
accompaniment without the independent target melody for the performance pass.
Retain full accompaniment voicing and original-voice mix identity even when a
chord tone matches a target. Do not inherit M1's target-pitch-class omission or
mark the new modes as sung. Existing voice mute/boost, target independence, output
headroom and cancellation contracts remain applicable. Do not expose a setting
that silently bypasses the required performance-accompaniment phase.

### Automatic phases and checking boundaries

1. Freeze the generated material, selected key, sounding harmony and configuration.
   Show known harmony, target-position placeholders and current phase without
   exposing target degree labels. Start the full demonstration using existing
   playback conventions and readiness/error handling.
2. Natural demonstration completion automatically starts a one-bar count-in,
   followed immediately by the accompaniment-only performance pass. Require no
   intervening user action and add no arbitrary thinking pause between phases.
3. Follow actual scheduled playback for chord/phase indication. Natural completion
   of the performance backing enables Done and establishes the delay origin.
   A merely elapsed UI timeout, canceled playback or a muted accompaniment is
   not a reason to fabricate a different phase duration. Valid voice muting does
   not prevent the scheduled performance phase from completing naturally.
4. First Done freezes the additional completion delay, ends the pre-check replay
   boundary and starts one complete accompaniment-plus-target reference. Do not
   include reference listening, self-assessment or later review time in that delay.
5. After natural reference completion, reveal correct degrees in the harmonic
   target positions and enable self-assessment. Reference failure is recoverable;
   retrying it does not replace the already frozen Done time.
6. Keep the full progression on one assessment surface. On desktop, group notes
   beneath their chords; on mobile, retain chord-group order and readable adjacent
   target positions. Do not require serial answer screens or degree quiz fields.
7. After committed assessment, use existing manual Next/Finish progression-style
   review behavior. Fixed counts count questions, not notes; Unlimited runs until
   Stop. Do not add a new automatic-advance setting or change existing modes'
   automatic/manual policies as an incidental part of this feature.

### Bulk self-assessment and immutable evidence

- All correct is an explicit assertion about every target position, not an
  inference from a vague overall performance score. It commits one correct
  self-assessment per position; repeated activation cannot duplicate evidence.
- Alternatively, the user marks incorrect positions in any order and may annotate
  each with a different supported chord-relative degree or Unknown. Omitted
  wrong-degree detail becomes Unknown rather than blocking submission.
  Known incorrect plus Unknown remains assessed incorrect, with no invented
  specific confusion pair.
- Remaining notes correct and submit explicitly commits marked positions as
  incorrect and all other positions as correct. Before that action, selections
  are editable assessment drafts, not first grades. This confirmation must not
  be inferred merely because an incorrect position was selected.
- An explicit All correct action can replace uncommitted error drafts; committed
  first outcomes cannot subsequently be overwritten by reference, retries,
  repeated submission, later self-correction or Results playback.
- Stopping before a self-assessment commit leaves those targets unassessed.
  Preserve unsaved/draft work for supported recovery without counting it as
  committed correct, incorrect or a positive timing result. Existing audiation's
  individually committed partial ratings keep their current behavior.
- Default the self-rating criterion to correct pitch class/chord-relative degree
  in target order, permitting octave-equivalent playing in a comfortable register.
  There is no independent rhythm, exact-octave, fingering or motor-verification
  grade. The UI must describe these as instrumental self-ratings.

### Completion delay, replay and interruption

- Measure elapsed time from natural performance-accompaniment completion until
  the first accepted Done. Use existing public audio completion signals and a
  monotonic timebase; do not measure from demonstration onset, count-in onset,
  the end of reference, or the grading submission.
- Done is disabled before performance backing naturally finishes. A near-zero
  result means no material additional completion time; it does not prove the
  musician played accurately or in time during the backing.
- Replay before Done restarts the whole demonstration/count-in/backing cycle,
  retaining material and actual key. For a completed restarted cycle, record the
  final performance-backing end to first Done as replay-assisted descriptive
  delay. Keep it separate from the normal unassisted timing summary.
- Audio failure, backgrounding or interrupted pre-Done playback must not create
  completion, a zero sample or a valid unassisted timing result. Provide explicit
  whole-cycle recovery with preserved question identity/material. Identify such
  recovered timing separately; do not erase the interruption by rerunning audio.
- An interruption after Done affects reference recovery, not the already frozen
  measurement interval. Repeated reference/review is post-check activity and
  neither improves the original delay nor changes first grades.
- Stop/navigation/new question cancels active sound and stale phase callbacks.
  Incomplete questions and incomplete intervals remain unassessed/unavailable as
  appropriate; do not synthesize a Done timestamp at Stop.

### Persistence, Results and Insights

- Persist additive source/key settings and freeze both source reference and actual
  sounding harmony/targets for new questions. Reference/history replay must use
  the original snapshot, independent of subsequent preset or template edits.
- Preserve existing stored records, identifiers, routes and custom names. Do not
  recategorize historical played-method Degree Audiation as Play by Ear, replace
  old sung progression provenance, or fill missing key/timing evidence with
  fabricated historical facts. Missing new delay values mean unavailable, not zero.
- Each target contributes at most one assessed accuracy outcome, keyed by its
  existing question/occurrence/position identity. Deduplicate across reload,
  repeated bulk actions, save retry and reporting. Unassessed is not incorrect.
- Expose both new modules and instrumental/self-assessed provenance throughout
  Results, history and Insights. Overall accuracy includes their assessed targets
  under the existing combined-degree-accuracy definition, not a mean of module
  percentages and not an extra whole-phrase grade on top of note outcomes.
- Store completion delay at question/phrase grain. An eligible normal summary
  sample requires all target positions explicitly assessed correct, a complete
  valid interval, and an unassisted/uninterrupted attempt. Wrong, incomplete,
  unavailable, interrupted and assisted samples do not enter that median.
  Show sample counts and identify why timing is unavailable or separated.
- Summarize comparable conditions within each Play by Ear context: mode, timing
  and generation version, harmony/target difficulty, BPM, durations, notes per
  chord, key policy/pool and relevant playback conditions. Expose actual key;
  label mixed-key/condition observations rather than presenting incompatible
  results as like-for-like improvement. Do not invent a progression speed score.
- Do not copy or divide one phrase delay into per-note first-response fields.
  Existing recognition/audiation timing versions, cohorts and Overall response
  statistics must be unchanged when only new Play by Ear evidence is added.
- Show replay-assisted note outcomes and question-grain replay event counts at
  their actual grain. Demonstration, required performance backing and the first
  checking reference are phases, not user-requested replay events. Review events
  remain separate from pre-Done assistance.
- Retain useful in-memory data and explicit Retry saving on storage failure;
  do not silently mark a failed save successful, destroy old saved data, or
  duplicate evidence when the retry succeeds.

## Testing Decisions

### Standing seam agreement

Use the user's previously approved V2 seam: Configure → existing optional audition
where supported → Practice/replay → check/self-assessment → Results → Overall.
The new tasks fit those existing user-facing routes. Reuse public audio/model
interfaces only for scheduling, elapsed-time validity, sampling and reporting
facts that UI observations cannot reliably establish. No additional seam or
approval interview is needed; do not add an audition that a mode does not support.

A good test asserts observable behavior, musical outputs or public evidence—not
private phase flags, DOM construction order, helper calls or a copied version of
the implementation. Prefer complete high-level examples; use deterministic random
and monotonic/audio-clock control through existing public boundaries where needed.

Prior art is the existing V2 progression browser flow, harmonic-board/configuration
layout and state suites, lifecycle/interruption and grading suites, and public
progression, audio, configuration, target/mix and metrics tests. Reuse these seams
rather than introducing a parallel test-only controller or framework.

### Required acceptance examples

1. In every progression mode, enter Dm7–G7–Cmaj7, select Eb, verify Fm7–Bb7–Ebmaj7
   in practice and corresponding pitch classes, then return to the unchanged
   C-source editor. Repeat with minor/backdoor/altered qualities and repeated
   chord occurrences; beat durations, degrees, pools and order remain intact.
2. Switching fixed keys repeatedly does not accumulate offsets. Root edits at a
   non-C practice key edit the C-reference source, not its derived sounding copy.
   Saved preset reload retains the source and key policy, without altering a
   different preset. Old already-transposed symbols at zero offset still sound
   exactly as stored, without tonic guessing or destructive migration.
3. Random {C, Eb, F#} gives each key once per cycle, none outside the pool and no
   adjacent cycle-boundary repeat. All contains twelve unique pitch classes;
   singleton pools work, empty pools block Start, invalid drafts survive chapter
   changes, and switching Fixed/Random preserves the user's selected pool.
4. A replay/reference/reload of a completed question preserves its actual key,
   melody, chord occurrences and durations even after later preset changes.
   A new question consumes one draw; replay and saving do not consume extra draws.
5. Both Play by Ear entries are directly accessible and clearly distinct from
   the existing four entries. Demonstration includes target sound, initial
   practice exposes known harmony but no target degrees/answer selects, and no
   manual Start playing step appears between automatic phases.
6. Public scheduling verifies demonstration → four-beat count-in → backing,
   required target absence as an independent performance voice, retained full
   chord accompaniment, proper BPM/durations, current-chord indication and
   headroom under valid mute/boost settings. Single-chord performance is exactly
   four beats; progression supports unequal chord durations and 1–4 targets.
7. Done remains disabled until natural backing completion. With a controlled
   completion origin and Done 2.4 seconds later, the question delay is 2.4 seconds;
   a longer reference or grading delay does not change it. Cancellation does
   not start the timer. Valid silent backing still follows its scheduled duration.
8. Done starts the full reference; targets and self-assessment appear only at the
   checking boundary. Reference interruption can be retried without another
   delay measurement or loss of the first Done value.
9. A six-target All correct produces exactly six correct self-rated outcomes,
   once. Marking positions 2 and 5 wrong, choosing a wrong degree for one and
   Unknown for the other, then Remaining notes correct and submit yields 4/6
   correct with accurate positions and only the specific supported confusion pair.
10. Error drafts can be changed before submission; merely marking one wrong does
    not assess the other five. Stopping before commit leaves the question's
    positions unassessed. Repeated submit, save retry, reload and review cannot
    duplicate or replace the first committed grades.
11. Pre-Done replay retains key/targets, reruns the complete cycle and produces
    assisted evidence rather than a new unassisted timing sample. Interruption
    in demonstration, count-in, backing or waiting-for-Done cannot fabricate
    completion, zero time, hidden grades or stale audio after navigation.
12. One correct six-note phrase with a valid 2.4-second delay yields one timing
    sample, not six. Incorrect, partially/unassessed, interrupted, assisted and
    legacy-missing timing cases do not join the normal median. Compatible correct
    samples of 1, 3 and 5 seconds yield a 3-second median with n=3.
13. Existing 15/30 plus 4/6 new instrumental note outcomes gives Overall 19/36,
    without extra phrase-level accuracy. Existing Overall response-time samples
    and median are unchanged. Old played audiation and sung progression records
    keep their original modules, provenance, timing and replay behavior.
14. Exercise fixed counts/Unlimited, manual Next/Finish, Stop during every phase,
    cross-mode/preset navigation, unsaved config/history failures and successful
    retry. Reopening completed Results uses frozen actual harmony/material and
    does not need the preset's current values to reproduce the reference.
15. Verify configuration, hidden-target performance, revealed assessment and
    readable evidence at desktop 1440 and mobile 390/320 widths. Cover typical
    six-target phrases and 2×1 through 32×4 progression extremes, keyboard focus,
    native disclosures, full-board arbitrary error marking, long names, enlarged
    text, and no field/note/error covered by attached Start/status regions.
16. Run the TypeScript build, normal meaningful tests and affected existing V2/
    Legacy-entry regressions. Report inherited baseline failures independently;
    do not weaken existing musical/evidence checks or claim a fully green
    aggregate browser suite without evidence. Real-device audio, Safari/iOS and
    assistive-technology checks remain separate from local synthetic automation.

## Out of Scope

- Application implementation or ticket execution during this specification task.
- Further interviews about already settled requirements or routine defaults.
- Replacing Degree Audiation/Recognition with instrumental imitation, or requiring
  Play by Ear users to fill degree-answer fields.
- Microphone/MIDI capture, automatic pitch verification, exact-octave/fingering
  grading, independent rhythm scoring or proof of instrumental transfer.
- A new melody/voice-leading engine, curated phrases, complex rhythm, per-chord
  target-count variation, isolated-note/chord-local replay or a key-spelling engine.
- Applying the progression C-source policy to single-chord roots, changing
  existing modes' audio/grading/Auto Advance semantics, or adding new controls
  to existing single-chord modes solely for the new performance timer.
- Putting Play by Ear delay into Overall response time, manufacturing per-note
  latency or historical timing, composite mastery/speed scores and adaptive levels.
- Accounts, cloud sync, new analytics/synthesis frameworks, a Legacy redesign,
  clearing stored data, global tracker setup or external publication claims.

## Further Notes

Source decisions and chronology: [completed interview](V2_KEY_AND_INSTRUMENT_MODES_PLAN.md).
Domain language: [general glossary](GLOSSARY.md) and [feature glossary](CONTEXT.md).
Product direction remains [Continuous Harmonic Hearing](jazz-ear-lab.md).

The user's Q4 correction wins over the earlier audiation suggestion: both new
modes demonstrate sound before instrumental imitation. Q7's automatic-phase
correction and Q12–Q15's accepted timing boundaries win over earlier manual-start
or no-instrumental-timing recommendations. Existing progression modes still do
not gain this new instrumental completion-delay metric merely by supporting keys.

The replay/interruption policy, octave/rhythm criterion, Fixed-C/Random defaults,
empty-pool validation and non-destructive legacy behavior were published as
agent-selected defaults after the user asked to stop routine questions; they
are not falsely attributed to explicit yes answers to Q16–Q19. Manual post-check
Next/Finish and reuse of existing supported numeric ranges are operational
engineering defaults, not new musical claims. No ADR is warranted for these
reversible feature choices.

Existing progression and layout specifications retain authority for behavior
outside these changes. This specification supersedes destructive progression
transposition, permits two new listen-first instrumental modules and defines a
new module-specific completion-delay metric; it does not supersede the existing
ban on mixing progression/phrase time into Overall response time. Preserve
approved A/C+B compositions and current typography without another shape round.

Publication is repository-local, following prior feature-local Markdown practice.
The local status ready-for-agent records specification readiness; no GitHub issue
or remote triage label has been created. Global issue-tracker/triage configuration
is absent. Run `/setup-matt-pocock-skills` before formal external issue publication;
this does not block review or use of the completed local specification.
