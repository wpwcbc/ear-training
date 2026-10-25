# V2 Insights UX and Information Architecture Redesign Plan

Revision in discussion, 2026-10-25: the user now requests module-first views
with integrated and detailed evidence, plus a category-first Overall view and
fewer visible setting-based groups. See
[the new planning record](V2_INSIGHTS_MODULE_ROLLUP_PLAN.md). The older approval
below remains historical context, not authorization to ignore this revision.
The user has since confirmed V2-only scope and actual M1+M2 totals, accepting
self-ratings equally with selected-answer grades. M1's reporting categories
are imagined/sung together and instrumental playing; M2 has no forced method
grouping. These decisions supersede the older mandatory partitions below for
the revised default totals. All four information categories and the consolidated
plan are now confirmed, with chord-degree performance and confusion primary,
and response efficiency and replay use secondary. No runtime change or
historical-data rewrite is implied by this planning update.

Status: User-confirmed UX plan, 2026-10-24. Recorded at the user's request.
The user confirmed architecture A and its information priorities, reliability
rules and focused-preset behavior below. This is a planning record, not a
claim of implementation or verification. This update changes documentation
only. The next design stage follows the saved comp-first preference: desktop
and mobile visual compositions before implementation.

## Purpose and Authority

Help jazz musicians understand their recorded performance, identify meaningful
patterns, choose what to practise next and explore evidence when needed.
Post-practice review and pre-practice decision-making are equally important.
Desktop and mobile both matter. Accuracy comes before speed; self-assessed
audiation is not objectively verified recognition or instrumental execution.

Read alongside:

- [Project intent](jazz-ear-lab.md): musical purpose and measurement boundaries.
- [Product context](PRODUCT.md): existing capabilities and browser-local data.
- [Release 1 specification](V2_RELEASE_1_SPEC.md): evidence and Insights contract.
- [UX/audio refinement](V2_UX_AUDIO_REFINEMENT.md): timing and replay semantics.
- [V2 design](jazz-ear-lab-v2/DESIGN.md): existing visual identity and conventions.
- [Practice UX plan](V2_PRACTICE_UX_REDESIGN_PLAN.md): separately approved
  Customize, Practice and Results flow, not superseded by this plan.

Source review covered the definitions in [model.ts](src/v2/model.ts), the
current Insights rendering and focus action in [app.ts](src/v2/app.ts), and
existing first-evidence/cohort tests in [v2.test.mjs](tests/v2.test.mjs).
It did not analyze the user's personal practice records or establish actual
individual weaknesses, progress or data quality in their browser history.

## Scope and Boundaries

Redesign the V2 Insights hierarchy and the handoff to existing focused-preset
customization. Preserve Legacy, V1/V2 history isolation, saved records,
exercise logic, metric calculations, timing versions and comparison semantics.

Reuse the existing visual system. Do not add modes, begin Release 2, introduce
automatic adaptation, invent a mastery score, merge incompatible evidence,
or claim verified singing, bass fluency or live improvisation gains. This is
not authorization for a new analytics service, data migration or framework.

## Reviewed Metrics and Data Sources

The source is browser-local V2 sessions containing question-level attempts
with immutable configuration/target snapshots and first-response evidence.

| Metric | Existing source and meaning | Proposed priority |
| --- | --- | --- |
| M2 first-answer accuracy | Correct `firstCorrect` values divided by assessed first responses. Retries never overwrite first correctness. | Primary. |
| M1 self-rated accuracy | The same assessed-denominator logic, based on the user's rating. | Primary, always explicitly self-rated. |
| Pre-first-response replay assistance | Assessed questions with `replaysBeforeFirst > 0`, divided by assessed questions. | Supporting overview evidence. |
| Correct response median | `firstResponseMs` from first-correct attempts with valid timing; show its own eligible sample count. | Secondary to accuracy. |
| Degree confusions | Target degree to M2 first chosen degree or M1 self-reported wrong degree. | Diagnostic detail; Unknown remains separate. |
| Retries, post-first replays, reveal activity | Learning/review records, not replacement first-answer success. | Detailed evidence. |
| Fresh / previously seen | Existing exposure marker based on chord symbol and target MIDI material already encountered. | Comparison context, not proof of novel-melody transfer. |
| Unassessed records | Attempts without a committed first grade. | Visible alongside the primary denominator, never counted as wrong. |

Existing total replay counts sum the selected records, including unassessed
ones. They must not be presented as though they use the same denominator as
replay assistance among assessed first responses. Mandatory initial playback
and first-reference playback retain their established attribution rules.

The current correct-time median can exist with only one eligible response;
the number alone does not establish reliability. Correctness and timing sample
counts can differ. M1 timing is self-indicated and method-specific; all response
times include interaction rather than measuring pure mental recognition speed.

The current page provides no longitudinal trend analysis. Its aggregate
historical accuracy must not be relabeled as recent performance.

## Alternative Hierarchies and Decision

| Architecture | Sequence | Benefit | Tradeoff |
| --- | --- | --- | --- |
| A: Performance-to-decision, selected | Conditions -> performance -> supported patterns -> next practice -> detail. | Builds understanding before action; serves review and planning. | Requires restraint to prevent overview overload. |
| B: Practice-decision first | Suggested practice -> evidence -> overall performance -> detail. | Fastest for deciding the next exercise. | Thin evidence can appear to be an authoritative diagnosis. |
| C: Exploration first | Filters -> tables/charts -> interpretation -> practice. | Strongest for self-directed analytical exploration. | Higher cognitive cost for quick review and mobile use. |

Use A as the primary architecture. Bring B's direct practice action beside its
supporting pattern, and retain C's capabilities in the detailed exploration
layer. Do not expose all three as new app modes.

## Selected Hierarchy and Progressive Disclosure

1. **Comparison scope.** Make M1/M2, M1 response method, chord context and the
   represented date range understandable. Put full pools and technical version
   details in expandable conditions without concealing important differences.
   Replace opaque long condition labels with a readable summary and accessible
   full details; preserve the actual cohort boundaries.
2. **Performance in this scope.** Lead with correct/assessed, percentage and
   unassessed count. Replay assistance supports the interpretation; correct
   response time is less prominent. Do not call all-history data recent.
3. **Patterns worth attention.** Show a small number of supported quality/degree
   patterns, each with correct/assessed and replay context. Do not manufacture a
   weakness ranking when the data cannot meaningfully distinguish groups.
4. **Next practice.** Place the relevant Customize focus action beside the
   pattern and evidence, not at the far edge of a wide analytics table.
5. **Explore details.** Keep the complete breakdown, confusion records,
   time/replay detail and session history accessible but secondary. Provide a
   direct route to the latest session's existing Results for immediate review;
   do not blend that session with aggregate history into a new score.

Root and quality filters update the overview, patterns and breakdown together.
Keep active filters visible and keyboard focus on the relevant control rather
than moving it to the page heading after each change. All scoped metrics and
conclusions must refer to the same selected population.

## Chart and Label Choices

- Overview: use readable numbers and numerator/denominator, not gauges,
  decorative rings or radar charts.
- Quality x Degree: use horizontal bars for a small comparison, with directly
  labeled accuracy and sample counts. Retain the complete numeric table for
  exploration and accessible alternatives. Missing evidence is not a zero bar.
- Confusion: prefer a sorted expected-degree -> first-chosen/self-reported
  degree list over a sparse 12 x 12 heatmap. Keep Unknown separate and do not
  fabricate a specific wrong degree from it.
- Timing: begin with the median, units and eligible sample count in text.
  Availability of timestamps alone does not justify a line chart.
- Trends: exclude from the first redesign scope. New time grouping, periods
  and comparison baselines need separate confirmation; never draw apparent
  improvement by pooling incompatible settings.
- Use factual labels such as First-answer accuracy, Self-rated accuracy,
  Replay-assisted first responses and Correct-response median. Labels for
  patterns must communicate descriptive evidence, not diagnosed mastery.

## Statistical Reliability and Interpretation

- Preserve comparison separation by exercise, grading source, response method,
  context, pools, target policy, exposure, timing/generator versions and answer
  policy. Simpler controls must not silently simplify the underlying grouping.
- The existing minimum of 10 assessed attempts per quality/degree cell is a
  descriptive screening threshold, not a confidence guarantee or learning
  standard. Do not promote sparse, tied or only-one-supported-cell results
  into a strongest/weakest conclusion.
- Matching selected root pools does not imply equal observed root distributions
  or equal replay usage within every cell. Describe differences without
  claiming they are caused by ability alone.
- Attempts, unique material and independent evidence are not interchangeable.
  Repeated questions and first-seen material do not establish musical transfer.
- Unassessed is not incorrect; unavailable timing is not zero. Wrong responses
  receive no speed credit. Do not change metric denominators for presentation.
- Keep self-report separate from objective scoring and distinguish replay-free
  from replay-assisted evidence in detail. Do not imply causal learning gains.
- Keep material sample and comparability caveats close to the conclusion they
  qualify; move general methodology to expandable details, not critical limits.
- Do not add arbitrary proficiency thresholds, weighted composite scores,
  statistical-significance badges or automatic difficulty changes.

## Approved Focused-Preset Behavior Change

When creating a focused preset from a Root-filtered result, carry the active
Root filter into the preset's Root Pool. Without a Root filter, preserve the
source configuration's Root Pool. Continue focusing on the selected cell's
chord quality and exact degree using the established preset workflow.

Show the resulting pools clearly in Customize and allow editing before Start.
Do not automatically launch practice, mutate the source preset/history or
silently widen the selected root. Preserve valid auto-save and Restore Default
behavior as applicable to existing preset types.

This change was explicitly approved during discovery. It is not implemented
by recording this plan; existing focus behavior currently retains the source
Root Pool even when the viewed evidence is filtered to one root.

## States, Accessibility and Acceptance

- No records: provide an existing practice entry, not a zero-score dashboard.
- No matching records: identify the empty filtered scope and offer filter reset.
- Few samples: show the observations honestly without unsupported rankings.
- Missing/invalid times: retain available accuracy and mark only timing as
  unavailable; show timing's eligible sample count when present.
- On mobile, show overview and practice actions before wide tables; confine
  horizontal scrolling to detailed evidence, not the main page or action path.
- Retain labeled keyboard-operable controls, visible focus, at least 44px
  interaction targets and textual chart values. Do not rely on color alone.
- Verify that summary, patterns and detail reconcile to the same filtered
  attempts with correct assessment/timing denominators and replay attribution.
- Verify context/method/version/exposure isolation, Unknown handling,
  interrupted records, tie/sparse cases and unchanged persisted history.
- Verify that focused preset roots follow active filtering, remain editable
  in Customize and preserve the source Root Pool when no root is selected.

These are future acceptance requirements, not checks executed for this
documentation update. Existing calculations and tests were reviewed for the
proposal; this record does not certify personal data, statistical reliability,
physical-device accessibility or an implemented redesign.
