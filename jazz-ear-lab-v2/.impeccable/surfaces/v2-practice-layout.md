# V2 practice and answering layout — A: Harmonic Board

Status: Design brief confirmed on 2026-10-27. The user selected **A** after
reviewing desktop/mobile concepts and the four-mode brief. Visitor mode: Operate.
This completes the shape step; no application implementation is included.

Approved composition:
[Harmonic Board](../../../.impeccable/mocks/decision/v2-practice-shape-2026-10-27/A-harmonic-board.png).
The adjacent JSON records approval and generation prompts. Concepts B and C are
unapproved alternatives. The approved example depicts Progression Recognition;
its layout grammar applies to the other modes as specified below, not as a claim
that complete mode/state compositions or working screens have already shipped.

## Job, audience and outcome

A theory-literate musician repeatedly hears or produces chord-relative notes,
then answers or self-rates. Desktop and mobile matter equally. On a phone,
support both hand-held answering and viewing from a desk while singing/playing.
Music, response and feedback must stay spatially associated without navigating
between separate note editors or remembering which chord an answer belongs to.

## Scope and visual authority

Redesign the practice and current-question checking layouts for M1 Audiation,
M2 Recognition, Progression Recognition and Guided Singing. Inherit the established
black/yellow V2 identity, Source Sans 3, cool open ground, white controls and flat
rules from `../../DESIGN.md`. Replace the current practice composition where needed.

The user explicitly chose **layout only**. Preserve existing playback/count-in,
readiness/disabled states, reference completion, answer submission, self-rating,
retry/Reveal, automatic/manual next-question behavior and scoring definitions.
Do not introduce a different workflow or treat layout approval as authorization
to change these contracts. Preserve audio, generation, records, presets and Legacy.
Settings, full session Results and Insights are outside this redesign scope.

## Shared composition

1. A compact task band holds mode, question count/Unlimited and Stop.
2. A harmonic board carries the actual known chord(s), target positions and
   responses. Do not substitute an oversized generic chord-count heading for music.
3. Playback status and current-question feedback sit beside the relevant task.
4. Primary operation follows the board. Replay is secondary; settings remain
   subordinate. Preserve access to actual existing controls in their valid states.

On desktop, progression chords form columns with their note positions directly
underneath. One-chord tasks use a focused, sensibly bounded group rather than
stretching a solitary control across an empty multi-column grid. Musical order
and keyboard/reading order must agree.

## Four-mode mapping

| Mode | Practice and response | Current-question check |
| --- | --- | --- |
| M1 Audiation | Known chord and requested degree are one focused musical group; response-method/self-rating provenance stays subordinate; Done follows the group. | Reference status remains near the target. Correct/Incorrect are equal-weight adjacent controls. A wrong-degree choice expands below in its existing state; retain the existing submission and auto-next behavior. |
| M2 Recognition | Known chord above the full existing legal degree-button grid; Replay remains near the musical context. | Reserve a stable feedback area near the answers. Preserve first-answer evidence, retries, Reveal and existing automatic/manual transitions. |
| Progression Recognition | Each chord and all its note answers occupy the same group. Keep the complete board available for arbitrary answer order and replay with retained choices. | One joint submission; reveal per-note answer/correct-degree comparison in the same positions. Keep reference and Next/Finish associated with this board. |
| Guided Singing | Show all requested degrees in their chord groups from the start; place Done after the complete phrase. | After the existing whole-reference boundary, put each note's self-rating controls immediately below its degree. Distinguish rated from unassessed positions without moving the music or introducing pitch-verification claims. |

## Responsiveness, states and ranges

- On mobile, stack chord groups vertically, with neighbouring note positions
  side by side inside each group. Four-note groups may use two rows instead of
  squeezing native selects and labels into unreadable widths.
- Prioritize simultaneously seeing the typical three-chord/six-note phrase.
  Progressions support 2–32 chords and 1–4 targets per chord; long content can
  scroll vertically on the same board. Do not add pagination, hide required notes,
  force serial completion or shrink type to promise that 128 positions fit a phone.
- Keep touch areas usable, focus visible and context unambiguous. Restore focus
  across view updates; live feedback must match the visible current state.
- Cover preparing/playing, count-in, ready, selected/unfilled responses, checking,
  correct/incorrect/retry, reference playback, unassessed/partial self-ratings,
  Next/Finish/automatic transition, audio interruption/retry and saving failure.
  Layout changes must preserve the existing availability rules in every state.
- Place primary actions near the work without covering note positions or controls.
  Maintain real navigation on mobile; do not invent a hamburger or hidden menu.

## Translation limits

The comp is a visual reference, not executable UI or a new scoring specification.
Its sample degrees and selected values are illustrative. Actual labels, legal
choices, enablement, counts and feedback come from the existing model/lifecycle.
Do not rasterize UI text or controls. Verify responsive extremes and real content
in implementation; do not claim browser, audio or accessibility validation from
this design-only step.

The Impeccable concept/decision-page helpers are absent (exit 127), so the three
concepts were presented inline and selected in chat. No automated roll, served
decision page or embedded-prompt helper success is claimed; prompt sidecars remain
available beside each image. No application files were changed for this shape step.
