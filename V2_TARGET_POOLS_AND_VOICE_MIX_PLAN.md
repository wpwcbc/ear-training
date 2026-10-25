# V2 Per-Quality Targets and Voicing Mix

Status: Target-pool, voice-mix and audition decisions individually confirmed;
complete-design confirmation is still pending. On 2026-10-25 the user revised
the Insights direction instead of accepting the proposed strict grouping in
Q13. See [module and Overall Insights planning](V2_INSIGHTS_MODULE_ROLLUP_PLAN.md).
No runtime implementation is approved by this record.

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
Original low-to-high voice identity, preset ownership, attenuation range and
separation from the target voice are confirmed. This does not authorize changes
to the notes in a voicing or to playback timing.

## Confirmed Decisions

| ID | Decision | Consequence |
| --- | --- | --- |
| D1 | Target pools belong to chord qualities, not individual root/chord symbols. | A maj7 pool applies across selected roots; Root Pool stays independent. |
| D2 | Each quality's complete target pool is editable, including chord tones, extensions and alterations. | Unselected degrees are not generated for that quality; the user may explicitly select them later. |
| D3 | Pools are saved independently in each preset, not globally shared. | Editing one preset's vocabulary must not alter other presets. |
| D4 | One per-quality exact-degree editor replaces the global Functional/Exact switch. | Convert old presets without changing their eligible target material; retain historical records unchanged. |
| D5 | Balance selected chord qualities, then balance targets within each quality. | More eligible targets do not make a quality more frequent; individual quality/degree pairs need not have equal session counts. |
| D6 | Volume controls follow original low-to-high voicing voices, with actual degree labels. | Preserve existing 3-, 4- and 5-note voicings; M1 target exclusion does not reassign the remaining voices to different controls. |
| D7 | Each preset has one shared set of up to five original-voice levels for all its chord qualities. | Absent voices do not sound; other presets keep independent levels. |
| D8 | The new voice controls affect accompaniment only, not the independent target voice. | Keep the existing overall-volume/target relationship; do not add a target-level control or apply a same-pitch-class accompaniment level to the target. |
| D9 | Voice levels range from 0% to 100%, defaulting to 100%. | Zero mutes that voice; 100% retains its existing standard level. No extra amplification is approved. |
| D10 | A newly enabled quality without a saved pool starts with its own chord tones; re-enabling a previously configured quality retains its pool. | The user can edit every degree. Each enabled quality needs at least one target; do not silently skip an empty quality. |
| D11 | Reject a mix if any eligible quality/target combination has no non-target, non-muted accompaniment voice after target exclusion. | Identify the affected quality and target and block Start until corrected; never silently change gains or remove the affected material. |
| D12 | Mix editing and audition belong in Customize; session settings are fixed after Start. | No mid-session mix controls. Results replay uses the recorded session configuration, not later preset edits. |
| D14 (Q14) | Audition only the mixed complete chord accompaniment for one enabled quality, using the first root in Root Pool and showing the actual chord. | No independent target, simulated M1 omission or practice/exposure records. Replaying replaces the prior audition rather than layering it. |

Q13 is not an accepted strict-grouping decision. Its proposed addition of
mix-based groups was superseded by a new user request for module-first and
category-first Overall Insights; do not implement the rejected proposal from
the earlier interview question.

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

## Preserved Compatibility Rules

- Retain historical attempts, their configuration snapshots, first-response
  evidence and generator identities. Do not rewrite old sessions into the new
  format or pretend they followed the new sampling policy.
- Opening an old preset, or starting new practice from an old configuration,
  must retain its effective target material: resolve Functional roles for each
  selected quality; preserve Exact degrees for each selected quality. Missing
  voice levels mean the existing standard levels, not mute.
- D11 checks the structural voice mix, not device audibility. It does not
  change existing overall-volume behavior or claim control over device volume.
  Keep M1 pitch-class exclusion across octaves and original voice identities.
- Keep valid auto-save and invalid-draft protection. Empty pools and invalid
  mixes must not overwrite the last valid saved preset.
- Restore Default retains its existing whole-preset meaning: factory target
  material for that named preset and the standard voice levels. It does not
  change historical configurations.
- Focused presets retain the established handoff: inherit source conditions
  and mix, narrow the selected quality and degree, follow an active Root filter
  or otherwise retain the source Root Pool, and leave source/history unchanged.
- Root sampling remains independently balanced under the existing contract.
  D5 changes the quality/target distribution, not roots or scoring.

## Open Design Frontier

- Resolve the revised Insights hierarchy and cross-module aggregation rules in
  the linked plan, including source scope and response-method attribution.
- Obtain confirmation of the consolidated design before implementation.

Exact storage layout and helper boundaries are implementation details, not
additional product choices. New generation must identify its changed policy;
historical records keep their original policy. The complete design still
requires user confirmation before any runtime implementation.

## Existing Boundaries

Preserve stored first-response evidence, M1 self-assessment, M2 objective
grading, target exclusion, reference continuation, readiness, retries and
progression unless a specific change is approved. Preserve Legacy and local
history. No new exercise, progression/dictation release, synthesis editor or
automatic musical-validity classifier is approved by this request.

No new runtime settings or migration have been implemented. Continue the
interview, then obtain confirmation of the complete design before coding.
