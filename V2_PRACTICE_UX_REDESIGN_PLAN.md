# V2 Practice UX Redesign Plan

Status: User-confirmed UX plan, 2026-10-24. Recorded at the user's request.
This is a planning record, not a claim of implementation or verification.
The user approved the scope and navigation change below, then confirmed the
complete proposed flow. No application changes are part of this documentation
update. The next design stage is desktop and mobile visual compositions
(comp-first), not immediate implementation.

## Purpose and Authority

Support a theory-literate jazz musician's repeated individual listening
practice, with cognitive simplicity, listening focus, predictable interaction
and minimal interruption. Desktop and mobile are both frequently used.
Accuracy comes before speed; self-assessed audiation is not objective pitch
verification.

Read this plan alongside:

- [Project intent](jazz-ear-lab.md): musical purpose and evidence boundaries.
- [Product context](PRODUCT.md): existing users, capabilities and constraints.
- [Release 1 specification](V2_RELEASE_1_SPEC.md): implementation contract.
- [UX/audio refinement](V2_UX_AUDIO_REFINEMENT.md): established single-chord
  playback and timing rules, superseding earlier defaults.
- [Question lifecycle](V2_QUESTION_LIFECYCLE.md): current behavior and ownership.
- [V2 design](jazz-ear-lab-v2/DESIGN.md): existing visual identity and conventions.

Except for the explicitly approved navigation change, this plan changes
presentation and flow clarity, not established exercise logic. A conflict with
musical, scoring or playback contracts must be raised, not silently resolved
by altering those contracts.

## Scope and Boundaries

Cover Customize -> M1/M2 Practice -> Session Results, including recovery and
navigation out of an active session. Keep the homepage's existing M1 Audiation
and M2 Recognition entry structure and Start/Customize actions.

Do not redesign Insights or Legacy, start Release 2, add modes, or introduce
Pause, Skip, undo-first-answer, session Resume, microphone grading or cloud
sync. Preserve preset compatibility, local history, generation, musical
labels, scoring, timing versions and analytics definitions. Do not restructure
the application or replace its visual identity as a side effect.

## UX Principles

1. One primary task at a time: listen, answer, self-rate or continue. This
   does not mean reducing M2 to one answer button or hiding needed choices.
2. Separate audible playback from response readiness. A sustaining sound is
   not a reason to disable an already-ready response.
3. Keep a stable listening workspace: chord, prompt, response and feedback
   have predictable locations across states.
4. Make feedback faithful to stored evidence: first correct, correct on retry,
   self-rated and unassessed outcomes are distinct.
5. Reveal information when relevant rather than displaying all settings,
   explanations and stages throughout every question.

## Customize

- Retain Harmony, Targets and Practice as independently accessible groups,
  not a mandatory sequential wizard.
- Present Root Pool, Chord Quality Pool and Functional / Exact Degree Pool
  independently. Do not silently change one pool when another is edited.
- Preserve general chord-degree practice, supported extensions/alterations
  and musically correct, unambiguous labeling. Identify invalid combinations
  beside the relevant choices; do not silently substitute targets.
- Retain automatic saving of valid edits to the same preset, including
  built-in overrides. Keep a stable Saved status through configuration
  rerenders. An invalid draft must not overwrite the last valid preset.
- Retain Restore Default as a secondary action.
- On mobile, use a single-column layout and a bottom Start action region
  with enough reserved space not to cover settings or keyboard focus.

## Practice Information Hierarchy

Use an unframed, fixed listening workspace within the existing visual system.
Do not introduce decorative panels or replace the established palette.

| Level | Content |
| --- | --- |
| Session header | M1/M2 identity, question progress, Stop. |
| Listening anchor | Known chord; requested degree for M1, recognition prompt for M2. |
| Response area | Only the current phase's answer or self-rating controls, with stable positioning. |
| Feedback region | Current outcome or the actual reason progression is waiting. |
| Secondary controls | Replay, applicable Reveal/Next, and expandable read-only settings summary. |

Do not repeat complete settings, long instructions or performance metrics in
the main listening area. A session uses its existing frozen configuration;
the summary is not a new mid-session editor. Keep the 12-choice answer grid
stable and preserve its canonical order and correct target spelling.

## Exercise States and Transitions

| State | Presentation and permitted interaction |
| --- | --- |
| Start / next question | Automatically play the existing context/question. Gate responses only until their established readiness point, not until the audible tail ends. |
| M1 before Done | Emphasize chord and requested degree. Context omits the target pitch class. Done becomes available at chord onset; with context off, it is available at visual readiness. |
| M1 Done | Lock the first completion time before reference playback. If context is still live, add the target without reattacking the chord; otherwise play the existing fresh full reference. Self-rating is available from reference readiness. |
| M1 Correct | Commit the self-rating once and show that it was recorded, without implying objective pitch verification. |
| M1 Incorrect selection | Expand the wrong-degree choices in place. Exclude the correct degree and retain Unknown. Opening the selector alone does not submit a rating. |
| M1 rated, auto on | Advance only after both committed rating and natural reference completion. Explain a remaining reference wait without freezing already-valid controls. |
| M2 ready | Keep all 12 answers directly actionable. One click submits; no new select-then-confirm step. |
| M2 first incorrect | Show Incorrect without revealing the answer. Remain on the same question with retry, Replay and Reveal. |
| M2 retry correct | Show Correct on retry, distinct from first-answer correctness. Preserve the original incorrect answer and latency. |
| M2 correct, auto on | Preserve the existing approximately one-second confirmation, fade and next-question transition. Do not add a second reference playback. |
| M2 Reveal | Play a fresh full chord/target reference even if question context is off. Show the answer at reference readiness. Automatic progression waits for natural reference completion, not the correct-answer fast path. |
| Replay | Preserve the question and committed evidence. Distinguish question replay from reference replay in labels according to the current phase, without changing actual playback or replay attribution. |
| Resolved, auto off | Retain the question for review and Replay. Next/Finish is the main progression action. |
| Resolved, auto on | Keep existing manual Next/Finish as a secondary action. Do not remove it or make it wait for reference completion when current manual behavior allows earlier progression. |
| Last fixed question | Apply the same established completion gates, then show Results without generating another question. |
| Unlimited / Stop | Continue until Stop. Stop ends the session, cancels pending work and audio, saves records and opens Results. |

The natural-reference-completion requirement gates automatic progression;
it must not be mistakenly imposed on existing manual Next behavior. Replay,
retry and recovery must not rewrite Done time, first-answer correctness,
latency or first-response replay evidence. Do not add countdowns, confirmation
steps or extra delays to the established progression rules.

## Recovery and Navigation

- Backgrounding or playback failure: retain the same question and offer
  Retry audio. Do not automatically skip, invent valid timing for an
  interrupted response, or rewrite already-committed evidence.
- Preserve the existing distinction between a mandatory reference that was
  never heard and an actual repeat listen when attributing replays.
- Storage failure: keep available records in memory, retain a visible
  unsaved/error state and Retry saving, and never display Saved prematurely.
  Present this separately from local audio recovery; do not freeze practice
  as a new side effect. Preserve existing unsaved-data protection.
- Reload: keep persisted history available, but do not imply that active
  same-question session continuation or valid response timing is restored.
- **Approved behavior change:** when leaving active practice through a
  navigation link, end and save the session, cancel its audio/pending work,
  and go directly to the clicked destination instead of forcing Results
  first. Preserve data and a visible warning if saving fails. Stop continues
  to open Results. No additional navigation confirmation step is planned.

## Results Handoff

Lead with M2 first-answer performance or explicitly self-rated M1 outcomes,
according to the exercise. Keep retry success, revealed answers and
unassessed questions distinct from first-response correctness. Do not treat
unassessed records as incorrect or alter established metric denominators.

Keep detailed records secondary and preserve existing follow-up actions.
Do not redesign Insights, invent a new mastery metric, blend M1/M2 scoring,
or claim objective singing accuracy or musical transfer.

## Accessibility, Responsive Behavior and Acceptance

- Complete the whole flow on desktop and mobile without primary controls
  being obscured, answer-grid shifts or overlapping content.
- Retain at least 44px control targets, readable inputs, visible focus and
  stable dimensions for variable labels and feedback.
- Keep all controls keyboard-operable. Move focus meaningfully when the
  task changes, not for incidental save/status updates.
- Expose important feedback and errors to assistive technology without
  relying on color or repeatedly announcing irrelevant playback changes.
- Verify M1 with context on/off, both rating/reference completion orderings,
  Incorrect/Unknown, replay and manual/automatic progression.
- Verify M2 first correct, first wrong, repeated retries, retry correct,
  Reveal, replay and manual/automatic progression without evidence changes.
- Verify fixed-count completion, Unlimited/Stop, navigation cancellation,
  audio interruption/recovery, storage failure and preserved local records.
- Verify independent pools, valid auto-save, invalid drafts and Restore
  Default. Preserve Legacy behavior and Release 1 comparison semantics.

These are future acceptance requirements, not tests performed for this
documentation-only update. Visual compositions precede implementation;
approval of this plan does not mean the redesigned screens already exist.
