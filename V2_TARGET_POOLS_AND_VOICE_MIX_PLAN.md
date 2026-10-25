# V2 Per-Quality Targets and Voicing Mix

Status: Target-pool, voice-mix and audition decisions individually confirmed;
Insights scope, pooling, method mapping and four-category selection are also
confirmed. Complete-design confirmation is still pending. On 2026-10-25 the user revised
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
| D13, Q15-Q17 revision | V2 Overall combines module outcomes, treating self-ratings as valid results. M1 reporting merges imagined/sung and keeps instrumental playing separate; M2 gets no forced production grouping. | Only current V2 M1/M2 contribute now. Review integration categories again whenever a V2 module is added; retain raw history and metadata without making every setting a mandatory group. |
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

## Consolidated Insights Selection

Overall totals use V2 M1/M2 only, counting self-assessed and selected-answer
results equally. Module pages offer their own total and relevant detail.
Only M1 has the two reporting categories Imagined / sung and Instrumental
playing; M2 has no forced production grouping. Raw methods remain unchanged.

The user selected all four shared information categories:

1. Chord-degree performance: primary.
2. Confusion directions: primary.
3. Valid-correct mixed-practice response time: secondary.
4. Replay use: secondary; educational retry detail currently belongs to M2.

See the linked Insights plan for definitions and the required integration
review whenever a V2 module is added. Do not reopen V2-only scope, equal
treatment of self-ratings or the M1-only method mapping as default questions.

## Consolidated Acceptance Checks

These are future implementation checks, not a report that tests were executed.

- Each selected quality has its own eligible target list across selected roots.
  Unselected degrees are not generated; old preset conversion retains its
  actual eligible content rather than silently sanitizing unusual choices.
- Quality frequency is balanced independently of target-list length; targets
  within each quality are balanced, with independent existing root sampling.
- Missing new voice levels preserve current sound. Existing 3/4/5-note
  voicings and original voice identities survive M1 pitch-class exclusion.
- Zero-level voices are silent, other levels never amplify beyond standard,
  and accompaniment levels never change the independent target level.
- Every enabled quality has a target and every eligible combination retains
  non-target accompaniment under the mix check. Errors identify the affected
  material, block Start and preserve the last valid saved preset.
- Customize auditions the chosen enabled quality with the first selected
  root, only as mixed full accompaniment. Replays replace rather than layer;
  leaving audition/start contexts must not leak stale preview sound or work.
  Audition never creates assessment or exposure evidence.
- Sessions retain their starting settings; Results replay uses that snapshot.
  Later preset edits and Restore Default do not rewrite historical records.
- Overall assessed/correct counts reconcile to the sum of its V2 module
  contributors. M1 self-ratings have the same question weight as M2 results.
  Retries/reveals do not replace first grades or create additional first grades.
- M1 imagined and sung combine into one reporting category; played is the
  other. Its total includes both. M2 does not acquire a method grouping.
- Unknown wrong degrees count as incorrect but never become fabricated
  confusion pairs. Unassessed questions do not count as incorrect.
- Timing is recomputed from combined valid first-correct raw times, not module
  medians; timing exclusions do not erase accuracy evidence. Replay assistance
  uses its assessed denominator, distinct from all-record review totals.
- Legacy records do not enter these totals; source history remains unchanged.
  New module work includes an explicit category/contribution design review.

Illustrative future fixtures, not personal practice results:

- M1 6/10 plus M2 9/20 gives Overall 15/30 = 50%, not the 52.5% average of the
  two module percentages.
- M1 correct-valid times [1000] ms plus M2 [2000, 3000, 4000] ms give a combined
  median of 2500 ms, not the 2000 ms average of their separate medians.

## Final Confirmation

The individual design decisions and information-category selection are settled.
Obtain confirmation of this consolidated plan before visual design or runtime
implementation; do not add further product requirements by assumption.

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
