# V2 Per-Quality Targets and Voicing Mix

Status: Design interview in progress. Three target-pool decisions confirmed
by the user; no implementation or complete-design approval yet.

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
What identifies a voice and how its level relates to the target are not yet
decided. This is not authorization to change voicings or playback timing.

## Confirmed Decisions

| ID | Decision | Consequence |
| --- | --- | --- |
| D1 | Target pools belong to chord qualities, not individual root/chord symbols. | A maj7 pool applies across selected roots; Root Pool stays independent. |
| D2 | Each quality's complete target pool is editable, including chord tones, extensions and alterations. | Unselected degrees are not generated for that quality; the user may explicitly select them later. |
| D3 | Pools are saved independently in each preset, not globally shared. | Editing one preset's vocabulary must not alter other presets. |

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

- Whether the per-quality editor replaces the global Functional/Exact control
  or coexists with it, and how old presets retain their effective content.
- Whether sampling balances chord qualities or every eligible quality/degree
  pair when qualities have different-sized target pools.
- Voice identity: original low-to-high voicing slot versus chord-relative degree;
  coverage of current 3-, 4- and 5-note voicings remains to be confirmed.
- Voice/master/target level relationships, mute/range/default behavior,
  preset ownership and when changes can be auditioned or take effect.
- Empty-pool validation, quality selection changes and restoration defaults.
- Historical configuration snapshots, comparability of different pools/mixes,
  focused-preset handoff and compatibility of saved presets.

## Existing Boundaries

Preserve stored first-response evidence, M1 self-assessment, M2 objective
grading, target exclusion, reference continuation, readiness, retries and
progression unless a specific change is approved. Preserve Legacy and local
history. No new exercise, progression/dictation release, synthesis editor or
automatic musical-validity classifier is approved by this request.

No new runtime settings or migration have been implemented. Continue the
interview, then obtain confirmation of the complete design before coding.
