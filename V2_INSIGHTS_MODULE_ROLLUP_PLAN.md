# Insights: Module Views and Overall Categories

Status: Revised user direction recorded on 2026-10-25; source-capability audit
completed, aggregation and source-scope decisions still open. No UI, metric,
storage or exercise implementation is authorized by this planning record.

The user explicitly revised Q13 of the
[targets and mix interview](V2_TARGET_POOLS_AND_VOICE_MIX_PLAN.md). The proposed
strict proliferation of setting/mix-based groups was not accepted.

## Confirmed Direction

- Minimize visible groups rather than exposing every configuration cohort as
  a primary destination.
- Organize by exercise module. A module page should show its integrated
  evidence and allow examination of smaller subgroups.
- Overall should start with useful information categories, then identify
  which modules' evidence can contribute to each category's charts.
- The user specifically wants singing and instrumental playing distinguished
  as major response categories. Placement of imagined audiation, button-based
  recognition and unrecorded response methods needs clarification.

This does not yet determine whether Overall includes only V2, Legacy M1-M7,
or also the original scale/interval/chord-quality/progression trainers. Reading
their source code is not approval to combine their records or redesign Legacy.

## Source Audit and Its Limits

Inspected the committed models, record-write paths and analytics adapters,
not the user's browser history. Availability means the code can record a
field; it does not prove every historical record contains it. No observed
performance values, personal weaknesses or learning gains are claimed here.

V2 sources: [record model and metrics](src/v2/model.ts),
[current Insights adapter](src/v2/app.ts). Legacy sources:
[assessment grain and evidence types](src/jazz/analytics/types.ts),
[record creation](src/jazz/app.ts),
[metric eligibility](src/jazz/analytics/metrics.ts),
[outcome registry](src/jazz/analytics/summary/registry.ts),
[historical adapters](src/jazz/analytics/adapters.ts).

| Module/source | Recorded outcome unit | Potential contribution and important limit |
| --- | --- | --- |
| V2 M1 | One target, binary self-rating | Degree/chord context, imagined/sung/played, Done time and replay attribution. Not measured vocal/instrument pitch. |
| V2 M2 | One target, objectively scored first answer | Degree selection/confusion, locked first evidence, valid-correct timing, replay assistance. Button response is not a singing/playing method. |
| Legacy M1 | One target, correct/close/missed self-rating | Degree-context self-report; no explicit imagined/sung/played method axis. Close is not the V2 binary incorrect category. |
| Legacy M2 | Recognition selections, including quality when hidden | Degree/quality/joint outcomes where captured; component and first-answer eligibility require their actual evidence. |
| Legacy M3 | Sequence; recognition also has selected item answers | Eligible recognition items can support degree analysis. One production sequence rating cannot become independent per-chord grades. |
| Legacy M4 | Transition/target step self-rating | Transition, target and prediction-window context; no measured produced pitch. |
| Legacy M5 | Transition, target pair or entire run | Outcome stays at its actual unit. Whole-run or pair ratings do not identify which individual note was wrong. |
| Legacy M6 | Activity or phrase-stage self-rating; objective landmark marking | Stage/phrase/variation evidence; marking selected indices is not singing or playing accuracy. |
| Legacy M7 | Target production self-rating plus visual mapping selection | MIDI-position match can be objective; it is not verified physical instrument execution. |

Other trainers use [separate assessment logging](src/analytics/legacy.ts).
[Drone activity](src/analytics/activity.ts) records foreground playback activity,
not assessed hearing ability. Inclusion remains a scope decision.

The Legacy `actualNotes` and `actualMidis` fields are populated from challenge
targets, not captured user performance. Do not mistake those names for pitch
verification. Likewise, intended task/stage names cannot supply a missing
historical singing/playing tag.

## Candidate Information Categories

These are proposals for user review, not a selected dashboard inventory.
Prefer a small useful set to one chart for every available field.

| Candidate | Why it helps | Eligible material and boundary |
| --- | --- | --- |
| Harmonic degree outcomes | Find which degrees/chord contexts need practice across exercises. | V2 M1/M2; eligible Legacy M1/M2, M3 recognition and M7 production evidence if included. Keep objective and self-report identities; do not distribute run grades to individual notes. |
| Continuity and phrase work | Understand difficulty over transitions, runs and phrase stages. | Legacy M3 production, M4, M5 and M6 if included. Place module/unit-specific results together where useful, but do not pool a step, pair and whole run as equivalent events. V2 does not yet implement these tasks. |
| Assistance and review | Understand reliance on replay, reference or retries. | V2 has before/after-first attribution; Legacy eligibility depends on capture. Unknown attribution is not zero assistance. Total replay counts are not the same measure as pre-first-response assistance. |
| Practice activity and coverage | Show participation and which material has been encountered, without calling it mastery. | Module/session/date/target-context fields where available; namespace and deduplicate sources. Target exposure alone is not a correct answer. |

Correct-response timing is supporting evidence, not a universal Overall speed
score. V2 M1 chord-onset-to-Done timing, V2 M2 answer-ready timing and Legacy
active decision/sequence timings must retain their definitions and valid sample
counts. Do not average existing medians into a new global median.

Visual bass mapping and phrase-landmark marking have useful module-specific
outcomes but are not interchangeable with each other or with heard-degree
recognition. Intended target MIDI sequences alone cannot establish performed
melodic-interval or motion accuracy; do not fabricate those Overall charts.

## Proposed Presentation, Not Yet Final

Navigation: Overall -> chosen module. Module pages lead with integrated
descriptive results, then subgroup detail. Overall charts begin with the
information category, not with a list of storage versions or configuration
hashes. Keep relevant metadata available for explanation and drilldown rather
than automatically turning every difference into a visible top-level group.

Same chart is not necessarily same denominator. Compatible observations may
be candidates for pooling; different sources/measurement units may instead
need named series or parallel summaries. The precise choice remains open.
Neither presentation should imply a controlled improvement comparison merely
because mixed historical observations have been summarized.

## Unresolved Decisions

1. Which current sources does "all modules" include? V2 and Legacy must not
   silently become one source or duplicate the same evidence.
2. How should imagined audiation and button recognition sit alongside singing
   and instrumental playing? Do not force-tag unrecorded historical methods.
3. When compatible data exists, should a category lead with a pooled metric
   and module breakdown, or module series in one chart without a pooled rate?

## Preserved Evidence Boundaries

- Keep immutable history, grading source, assessment unit, method when known,
  replay attribution, timing validity and version metadata.
- Objective choice accuracy, self-rating, visual mapping and stage/run grades
  remain distinguishable even when navigation is simpler.
- Do not transform Legacy close ratings into binary V2 failures, or missing
  evidence into incorrect/zero. Any newly proposed conversion needs approval.
- A parent's self-rating is not independent per-note success or confusion.
- Do not infer singing, instrument execution or actual pitch from task names,
  challenge MIDI or a correct visual selection.
- Review source-specific numerator, denominator, first-answer eligibility and
  coverage before pooling. Module labels or shared field names are insufficient.
- No single global mastery score, new exercise or Release 2 implementation is
  requested by this architecture discussion.

The current runtime and existing older plan remain unchanged while this
revision is clarified. Obtain confirmation of the consolidated proposal before
designing or implementing the changed Insights experience.
