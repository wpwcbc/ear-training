# V2 Per-Quality Targets and Voicing Mix

Status: Design interview in progress. Six target-pool and voice-identity
decisions confirmed by the user; no implementation or complete-design approval
yet.

Read alongside [project intent](jazz-ear-lab.md), [product context](PRODUCT.md),
[Release 1](V2_RELEASE_1_SPEC.md), [audio refinement](V2_UX_AUDIO_REFINEMENT.md)
and [domain language](GLOSSARY.md). Existing behavior remains authoritative
except where the user explicitly approves a change in this interview.

## Problem

One global Exact target list currently applies to every selected chord quality.
It can therefore generate combinations the user does not want in that exercise,
such as a b7 target against maj7. The requested control is a user-selected
musical vocabulary, not a universal rule that an unselected tension is invalid.

The user also requests individual volume control over chord voicing notes.
Original low-to-high voice identity is confirmed; its level relationship to
the target is not yet decided. This does not authorize changes to voicings or
playback timing.

## Confirmed Decisions

| ID | Decision | Consequence |
| --- | --- | --- |
| D1 | Target pools belong to chord qualities, not individual root/chord symbols. | A maj7 pool applies across selected roots; Root Pool stays independent. |
| D2 | Each quality's complete target pool is editable, including chord tones, extensions and alterations. | Unselected degrees are not generated for that quality; the user may explicitly select them later. |
| D3 | Pools are saved independently in each preset, not globally shared. | Editing one preset's vocabulary must not alter other presets. |
| D4 | One per-quality exact-degree editor replaces the global Functional/Exact switch. | Convert old presets without changing their eligible target material; retain historical records unchanged. |
| D5 | Balance selected chord qualities, then balance targets within each quality. | More eligible targets do not make a quality more frequent; individual quality/degree pairs need not have equal session counts. |
| D6 | Volume controls follow original low-to-high voicing voices, with actual degree labels. | Preserve existing 3-, 4- and 5-note voicings; M1 target exclusion does not reassign the remaining voices to different controls. |

D4 preserves eligible content, not the old pair-balanced frequency policy:
D5 explicitly changes that policy for the new design. Do not regenerate,
rewrite or relabel old attempts to imply they used the new sampling policy.

These decisions concern generated targets. M2's reasonably complete,
pitch-class-unambiguous answer options remain separate under the existing
contract; this change does not narrow the answer buttons to the target pool.

## Code Facts

- `src/v2/model.ts` stores one `targets` list with a Functional or Exact policy.
  The generator balances resolved quality/degree pairs, then draws roots.
- `src/v2/app.ts` exposes a global target selector and one preset volume.
- `src/jazz/theory.ts` currently supplies 3-, 4- or 5-note voicings, depending
  on quality. There is not a universal four-voice chord.
- `src/jazz/audio.ts` uses a common multiplier per chord note, with a separate
  fixed target multiplier; no individual voice levels are configurable.
- M1 removes all target-pitch-class notes before Done. Remaining array
  positions can shift, so a voice's identity must not be inferred from its
  position after exclusion. Live reference adds a target without reattacking
  still-sounding chord voices; fresh references follow existing exclusion.

These facts describe the current code, not approved implementation choices.

## Open Design Frontier

- Whether one voice-level set applies to all qualities in a preset, or each
  quality has its own levels; the levels' ownership still needs confirmation.
- Voice/master/target level relationships, mute/range/default behavior and
  when changes can be auditioned or take effect.
- Empty-pool validation, quality selection changes and restoration defaults.
- Historical configuration snapshots, comparability of different pools/mixes,
  focused-preset handoff, generator versioning and detailed compatibility of
  saved presets under the confirmed content-preservation rule.

## Existing Boundaries

Preserve stored first-response evidence, M1 self-assessment, M2 objective
grading, target exclusion, reference continuation, readiness, retries and
progression unless a specific change is approved. Preserve Legacy and local
history. No new exercise, progression/dictation release, synthesis editor or
automatic musical-validity classifier is approved by this request.

No new runtime settings or migration have been implemented. Continue the
interview, then obtain confirmation of the complete design before coding.
