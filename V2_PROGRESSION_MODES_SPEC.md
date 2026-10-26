# V2 Progression Recognition and Guided Singing — Specification

Status: Synthesized on 2026-10-26 from the final user-confirmed Q1–Q18 design.
Product decisions and testing seams are confirmed by the user on 2026-10-26.
This is a future implementation contract, not a claim of implemented behavior,
completed tests, issue publication or approved visual compositions.

## Problem Statement

Single-chord exercises do not train hearing or producing an ordered melody across
changing harmony. The musician needs to hear a complete progression, identify
several chord-relative degrees without being forced into linear answer order,
and practise singing a specified sequence before checking it as a whole.
Whole-run ratings cannot honestly describe which individual notes were correct.

## Solution

Add two independent V2 progression modes: Progression Recognition and Guided
Singing/Audiation. Use editable common progressions or a custom chord sequence,
visible harmony, configurable tempo/durations and one to four sequential target
notes per chord. Recognition answers occupy one board after the complete listen;
guided singing displays the degrees before an accompaniment-only performance pass.
Check the whole progression, grade target positions separately, preserve first
results and contribute per-note accuracy to Overall without progression speed.

## User Stories

1. As a musician, I want two directly accessible progression modes, so that I can practise recognition and guided singing independently.
2. As a musician, I want major ii–V–I, minor ii–V–i and backdoor presets, so that I can begin with common jazz harmony.
3. As a musician, I want to edit preset chord qualities, so that the progression matches my intended harmonic language.
4. As a musician, I want to enter my own chord symbols, so that I can practise other progressions.
5. As a musician, I want to add, remove and reorder chord occurrences, so that I can shape a complete progression.
6. As a musician, I want to transpose the entire progression, so that I can practise the same relationships in another key.
7. As a musician, I want the complete chord sequence visible, so that harmony is known rather than an additional guessing task.
8. As a musician, I want the sounding chord indicated, so that I can follow the progression.
9. As a musician, I want each target degree interpreted relative to its current chord, so that changing harmonic function is explicit.
10. As a musician, I want BPM adjustable in settings, so that I can choose the practice pace.
11. As a musician, I want an individual beat duration for each chord, so that harmonic rhythm is configurable.
12. As a musician, I want a one-bar count-in, so that I can prepare before the progression starts.
13. As a musician, I want one to four sequential targets per chord, so that I can increase melodic load.
14. As a musician, I want the targets evenly spaced within each chord, so that the initial rhythm stays predictable.
15. As a musician, I want per-quality target pools stored in the preset, so that each harmony uses my selected vocabulary.
16. As a musician, I want independent random targets with repetitions allowed, so that a small pool remains usable.
17. As a musician, I want to hear the whole recognition progression before answering, so that the melody is experienced continuously.
18. As a musician, I want all target positions on one answer board, so that I can inspect the entire response.
19. As a musician, I want to fill answers in any order, so that uncertain middle notes do not block confident beginning/end notes.
20. As a musician, I want whole-progression replay to retain my answers, so that I can refine uncertain choices.
21. As a musician, I want a Don't know choice, so that I can submit without inventing a degree.
22. As a musician, I want every answer filled before one joint submission, so that the first assessment covers the full recognition question.
23. As a musician, I want each recognition position graded separately, so that partial success is represented accurately.
24. As a musician, I want correct degrees and a full reference after submission, so that I can review the complete musical answer.
25. As a musician, I want every requested singing degree visible from the start, so that I can prepare the complete sequence.
26. As a musician, I want accompaniment without a separate target melody during singing, so that I produce the requested sequence myself.
27. As a musician, I want full chord accompaniment retained, so that multiple requested chord tones do not remove the harmony.
28. As a musician, I want Done available after the initial full pass, so that checking follows the complete performance.
29. As a musician, I want one whole-progression accompaniment-plus-melody reference, so that I can compare the sequence coherently.
30. As a musician, I want to self-rate each target position, so that singing results are not guessed from a whole-run rating.
31. As a musician, I want to record a wrong degree or Unknown for Incorrect, so that specific confusions remain distinguishable from missing detail.
32. As a musician, I want unassessed singing positions kept separate, so that missing ratings are not counted as wrong.
33. As a musician, I want first grades preserved across review, so that repeated checking cannot inflate initial accuracy.
34. As a musician, I want next question to keep the progression and generate new targets, so that I can repeat the harmonic context with varied material.
35. As a musician, I want fixed question counts or Unlimited practice, so that I can choose a bounded or open session.
36. As a musician, I want preset-owned voicing mix and volume, so that accompaniment balance stays consistent with the exercise.
37. As a musician, I want session settings and generated targets frozen, so that Results replay reproduces what I practised.
38. As a musician, I want separate module statistics and combined Overall accuracy, so that I can inspect both local and integrated outcomes.
39. As a musician, I want assessed notes weighted equally without duplicate whole-run grades, so that totals reflect the actual assessment grain.
40. As a musician, I want progression speed excluded from Overall timing, so that multi-note work is not treated as a single-note response.
41. As a musician, I want pre-check replay assistance recorded consistently, so that additional listening remains visible without changing correctness.
42. As a musician, I want explicit self-rating provenance, so that guided singing is not presented as verified pitch measurement.
43. As a musician, I want usable desktop/mobile and keyboard controls, so that the full answer board is accessible.
44. As a musician, I want existing M1/M2 and Legacy history preserved, so that the new modes do not damage earlier practice.

## Implementation Decisions

### Scope and existing interfaces

Extend the V2 preset/configuration, progression-question lifecycle, audio scheduling,
Results and reporting interfaces. Reuse chord parsing, degree/pitch conversion,
voicing, register handling, transpose and timing primitives where suitable.
Do not embed Legacy controllers or require its entire exercise configuration.
Existing progression helpers support one or two targets in some paths; do not
pretend they already support arbitrary ordered four-note sequences.

This is a new progression scope beyond Release 1. It supersedes the old proposed
one-target-per-chord initial limit, but does not authorize other future modules,
voice-leading, curated phrases or a new audio/analytics framework. Specific mode
IDs, storage shape and helper boundaries are implementation decisions. Preserve
existing visual identity and the approved comp-first process: produce desktop
and mobile compositions before visual implementation, with user review.

### Progression configuration and generation

- A progression is an ordered sequence of chord occurrences. Repeated symbols
  remain distinct occurrences; never identify a response solely by chord symbol.
- Provide editable major ii–V–I, minor ii–V–i and backdoor templates. Initial C
  examples: Dm7–G7–Cmaj7, Dm7b5–G7–Cm7, Fm7–Bb7–Cmaj7. Chord qualities are editable,
  including supported alternatives such as altered dominants.
- Custom editing supports actual chord symbols, insertion/removal/reordering,
  per-chord beat durations and whole-progression transposition. Retain chord-relative
  target degrees through transposition and keep displayed/sounding pitches aligned.
- Use one configurable BPM and default four beats per chord. Include a one-bar
  count-in. Uniform notes-per-chord is an integer from one to four; space sequential
  targets evenly across each occurrence's duration. Targets are not simultaneous
  chord notes. Complex rhythm and per-chord target-count variation are outside scope.
- Independently sample every target position from its chord quality's preset-owned
  selected pool. Repetitions are allowed even consecutively. Do not silently apply
  the single-chord quality-balancing policy to rearrange the chosen progression.
- Keep the established target/answer distinction and supported musical vocabulary.
  Validate playable targets, supported chords, positive timing and nonempty relevant
  pools before Start; report errors rather than changing selected material silently.
- Each preset owns pools, voicing mix, overall volume, BPM, chord durations and note
  count. Keep standard mix defaults and 0–200% original-voice controls where applicable.
  Freeze configuration and generated material at Start/question generation. Results
  replay uses snapshots rather than later edits to presets or templates.

### Shared playback and identity

Show all chord symbols and synchronize the current-chord marker to actual scheduled
audio. Degrees are relative to the chord at each target position, not the key.
One progression question contains the full sequence; each target position has a
stable occurrence/order identity for answering, playback and outcome recording.

Play the whole progression continuously. Whole replay repeats the same material
and retains answer drafts; it must not regenerate a melody. Do not add chord-local
or isolated-note replay. Cancel stale voices and callbacks on replay replacement,
question change, Stop and navigation. Playback failure/interruption must not fabricate
completion or grades; preserve committed evidence and offer recoverable playback.

Both modes retain full chord accompaniment, including chord notes that share target
pitch classes. This deliberately differs from single-chord M1 exclusion. Preserve
existing original-voice mix identity, independent target nominal level, output
headroom and cancellation/envelope behavior; do not transfer single-target omission
or its non-target-accompaniment validity rule blindly to these modes.

### Recognition lifecycle

1. Generate a question and play full accompaniment plus its target melody.
2. After the complete initial listen, enable the whole answer board. Do not expose
   target degrees in recognition before checking.
3. Show one slot per target position, grouped in progression order, on the same
   response surface. Allow arbitrary fill/edit order; no forced cursor order,
   per-note screen or graded intermediate submission.
4. Allow whole replay without erasing drafts or revealing correct degrees.
5. Require a supported degree or explicit Don't know in every slot before joint
   submission. Lock the first submitted set and compute each note's first outcome.
6. Reveal per-position correctness and correct degrees, plus a whole reference
   playback action. Don't know is incorrect but creates no specific confusion pair.
   Review or later corrections must not overwrite the first outcomes.

### Guided singing lifecycle

1. Display all target degrees with their chord occurrences before the initial pass.
2. Play full accompaniment without a separate target melody while the user sings.
   Keep embedded chord tones; do not simulate M1 target exclusion.
3. Enable Done after the initial accompaniment pass completes. Done establishes
   the pre-check replay boundary and triggers a complete accompaniment-plus-target
   reference, not isolated note checks or per-chord checking.
4. After the reference has been heard, allow separate Correct/Incorrect ratings
   for every position. Incorrect requires a different supported wrong degree or
   Unknown. Preserve unassessed positions separately rather than auto-filling them.
5. These are self-ratings. Do not claim microphone grading, measured singing onset
   or objectively verified pitch. Do not generate individual grades from one overall
   rating. Repeated reference/review does not create additional first grades.

### Session, Results and evidence

Fixed counts count progression questions, not target notes. Unlimited continues
until Stop. Next question retains the progression and generates new target material;
there is no initial automatic progression switching. Permit explicit progression
question progression without adding an unconfirmed Auto Advance policy.

Store enough provenance to reconstruct ordered targets, chord occurrences, exercise,
source, first responses/ratings, Don't know/Unknown/unassessed distinctions and
pre-check versus review replay activity. Each target position contributes at most
one first assessed outcome. Preserve unfinished work as unassessed and historical
snapshots unchanged; generated-target identity must survive repeated chord symbols.

Results expose per-note evidence and derived chord/progression summaries. Any
whole-question summary derives from the note outcomes and is not an extra assessment.
Preserve V2/Legacy isolation and existing records; do not reset browser data or
reinterpret previous outcomes to claim progression evidence they never recorded.

### Overall and module reporting

- Add separate views for both new modules and integrate assessed note outcomes into
  Overall accuracy alongside existing contributors. Every assessed note has equal
  weight; source remains traceable. Do not average module percentages, downweight
  self-ratings or add duplicate progression-level grades.
- Example: existing modules 15/30 plus progression 4/6 gives 19/36, not an average
  of percentages and not 20/37 from an extra whole-run assessment.
- Unknown/Don't know can count as incorrect without a fabricated wrong-degree
  direction; unassessed is excluded from assessed denominators. Known wrong-degree
  evidence may contribute to applicable confusion reporting with source detail.
- Progression speed contributes nothing to Overall response-time statistics. Do
  not infer per-note latency from whole-board completion or singing Done. A separate
  progression completion-time feature is deferred, not required in initial scope.
- A whole replay before Recognition's first submission or guided singing's Done
  means all assessed positions in that question received replay assistance.
  Assistance numerator counts assessed positions, not replay clicks. Unassessed
  positions do not enter its assessed denominator.
- Initial playback and the first mandatory reference are not user replays.
  After-boundary replay is review activity, separate from pre-check assistance.
  Keep question-level replay counts distinguishable from note-level assistance
  counts; one replay of six assessed notes is one replay event and six assisted notes.
- Explain the represented assessment grain, contributing modules and relevant
  limitations. Do not claim note outcomes from a whole-activity rating, causal
  learning gains, musical transfer or verified singing. This is the required new
  V2 module integration review, not a generic plugin-system requirement.

## Testing Decisions

User-confirmed seam (2026-10-26): existing V2 user flow from
progression settings through complete playback/replay, answer-board submission or
self-rating, Results and Overall. Use the existing V2 browser testing family.
Only add public model/audio contract checks for deterministic musical generation,
statistics or scheduling/output behavior that cannot be reliably observed through
that flow. Follow existing model, configuration, question-lifecycle and rendered
Web Audio output tests rather than introducing a separate test framework.

Tests verify externally observable behavior, using independent worked examples;
never mirror private structures or recompute expected values with production logic.
The following acceptance checks are future obligations, not executed results:

1. Load/edit each common template; add/remove/reorder custom chord occurrences,
   change durations and transpose. Correct symbols, pitches, degrees and timing
   stay aligned. Repeated occurrences of the same symbol retain distinct positions.
2. Validate empty/unsupported settings without losing the last valid preset. Sample
   one to four targets per chord from the appropriate pools; allow repeated degrees
   and singleton pools, with no accidental voice-leading or progression reordering.
3. Verify count-in, BPM and equal within-chord note spacing against audio scheduling;
   test one- and four-target configurations and unequal chord durations.
4. Recognition exposes every slot together after the complete initial playback,
   hides answers beforehand, permits filling last/first/middle out of order, and
   retains those drafts across whole replays. Missing slots block submission;
   Don't know permits submission and counts as wrong without a confusion pair.
5. Joint submission produces independently correct/incorrect note outcomes, reveals
   correct degrees and offers full reference. Repeated submission/review cannot
   duplicate or replace the first grade set.
6. Guided singing displays all requested degrees, plays full accompaniment without
   separate melody, gates Done until the initial pass ends, and plays one complete
   reference. A target set covering all chord tones does not remove accompaniment.
7. Singing grades are individually self-rated with wrong-degree/Unknown handling.
   Unassessed stays separate; a whole-run rating cannot fabricate per-note results.
8. Verify fixed progression-question counts, Unlimited/Stop, next-question generation,
   cancellation/navigation and recoverable interruptions without stale sound,
   invalid completion or rewriting first evidence.
9. Change a preset after practice; Results playback still reproduces frozen material,
   tempo, durations, volume and mix. Existing single-chord M1/M2 and Legacy behavior
   and stored records remain intact.
10. Reconcile note, chord, question, module and Overall totals. Existing 15/30 plus
    progression 4/6 yields 19/36; no whole-question double count. Deduplicate stable
    outcome identities and preserve sources. Missing ratings do not become errors.
11. Hold existing M1/M2 timing fixtures fixed while adding progression outcomes;
    Overall timing must remain unchanged. Never create target-position times from
    board completion or evenly divide a whole-question duration into fake latencies.
12. A pre-check whole replay of six assessed positions yields six replay-assisted
    notes from one replay event. Additional replays do not increase that assisted
    numerator beyond six. Initial/reference audio is excluded; review replay and
    unassessed outcomes retain their separate scope. Test both mode boundaries.
13. Check valid per-voice mute/boost, target independence and combined-output headroom
    across sequential note playback, chord transitions and reference. Do not infer
    subjective sound quality from scheduling/gain checks alone.
14. Verify desktop/mobile compositions and complete answer-board keyboard operation,
    visible focus, readable errors, stable filled answers and textual results. Keep
    wide progression detail locally scrollable without overflowing the whole page.
15. Reuse relevant existing regression suites. Physical Safari/iOS, real assistive
    technology, headphone/speaker timbre and actual singing quality require separate
    human checks; automated results must not be described as those checks.

## Out of Scope

- Application implementation, ticket execution or the setup workflow in this task.
- Chord-local/isolated-note replay, complex rhythm or varying target counts per chord.
- Voice-leading, curated phrases, improvisation, interval-between-melody-note grading,
  pitch capture or microphone/MIDI verification.
- Progression speed in Overall, fabricated per-note latency or a new progression-only
  timing feature. No composite mastery score or automatic difficulty adaptation.
- Automatic progression switching, a new module-ID convention or an unconfirmed
  automatic question-advancement policy.
- A new synthesis/analytics framework, accounts, cloud sync, Legacy redesign or
  historical data rewriting.

## Further Notes

The final consolidated progression design and project glossary are the product
source of truth for this feature. Confirmed Q6 limits replay to complete progressions;
Q8 retains full accompaniment; Q16 excludes progression speed from Overall; Q18
settles replay assistance. Do not implement rejected earlier suggestions from the
interview as if they were accepted requirements. Existing engineering defaults may
resolve numeric validation bounds and storage/helper design within this contract;
they are not grounds to reopen settled musical/product choices.

The issue tracker and triage vocabulary are not configured in this repository.
Run `/setup-matt-pocock-skills` separately to configure them before publication.
The current GitHub API read returned Forbidden. This local specification can be
committed and pushed, but issue publication with ready-for-agent remains pending
working tracker configuration and API access. No secret values should be put in chat.
