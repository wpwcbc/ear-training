# Ear Train UX Principles

Status: Consolidation of user-approved UX decisions, 2026-10-24.

Insights revision recorded 2026-10-25: the user now requires V2 Overall totals
across modules, counting M1 self-ratings and M2 answers equally. M1 reporting
combines imagined/sung and separates instrumental playing; M2 has no forced
production grouping. See [the current planning record](V2_INSIGHTS_MODULE_ROLLUP_PLAN.md).
Earlier requirements below to partition these default totals by module,
grading source or every configuration cohort describe the previous design and
are superseded for this planned revision. Raw metadata and history remain;
category selection and consolidated-design confirmation are still pending.
This notice is not a runtime implementation or test-completion claim.

This is a **custom project document explicitly requested by the user**. It is
not a file that Impeccable necessarily creates automatically, a plugin schema,
or a generated design contract. Its filename and role are project conventions.

This document records approved direction and future acceptance requirements,
not an implementation or test-completion report. Creating it does not modify
the application or authorize unrelated work. Desktop and mobile visual
compositions precede implementation (the confirmed comp-first workflow).

## Authority and Scope

- [Project intent](jazz-ear-lab.md) governs musical purpose and measurement
  boundaries; [PRODUCT.md](PRODUCT.md) records existing product context.
- [V2_RELEASE_1_SPEC.md](V2_RELEASE_1_SPEC.md) and the superseding single-chord
  refinements in [V2_UX_AUDIO_REFINEMENT.md](V2_UX_AUDIO_REFINEMENT.md) govern
  exercise behavior, timing, scoring and data semantics.
- [V2_PRACTICE_UX_REDESIGN_PLAN.md](V2_PRACTICE_UX_REDESIGN_PLAN.md) and
  [V2_INSIGHTS_UX_REDESIGN_PLAN.md](V2_INSIGHTS_UX_REDESIGN_PLAN.md) contain
  the confirmed detailed UX decisions summarized here.
- [V2 design](jazz-ear-lab-v2/DESIGN.md) governs the existing visual identity;
  [V2 question lifecycle](V2_QUESTION_LIFECYCLE.md) records current ownership.

This consolidation does not supersede those sources or resolve conflicts by
changing exercise logic. Raise conflicts explicitly. The scope is V2 Release 1:
Customize, M1/M2 Practice, Results handoff and Insights. Preserve Legacy and
its records; global principles here do not authorize a Legacy redesign.
Do not start Release 2 or add modes, Pause, Skip, undo-first-answer, active
session Resume, pitch capture, cloud sync or automatic difficulty adaptation.

## Approved Global Principles

1. **Accuracy before speed.** Correct-response time supports interpretation;
   it never compensates for incorrect answers.
2. **Listening before interface management.** Keep one primary task clear at
   each moment, without adding confirmation steps or arbitrary delays.
3. **Stable workspace.** Keep chord, prompt, response and feedback in
   predictable locations with stable dimensions and no disruptive shifts.
4. **Readiness is not silence.** Sustaining audio must not block a response
   that is already ready under the established playback contract.
5. **Faithful feedback.** Distinguish first correct, correct on retry,
   self-rated, revealed and unassessed outcomes. Preserve first evidence.
6. **Progressive disclosure.** Show what supports the current task; keep
   complete settings, diagnostic detail and general methodology secondary.
   Material limitations remain beside the conclusions they qualify.
7. **Independent configuration and user control.** Preserve independent
   root/quality/target pools, valid auto-save, invalid-draft protection and
   Restore Default. Suggestions lead to editable presets, not automatic starts.
8. **Evidence before diagnosis.** Show populations, denominators, sample
   counts and comparable conditions; do not invent mastery or transfer claims.
9. **Desktop and mobile parity.** Both support complete workflows. Preserve
   keyboard operation, visible focus, at least 44px targets, readable inputs
   and feedback that does not depend on color alone.
10. **Preservation over scope expansion.** Reuse the visual system and static
    browser delivery. Preserve records, presets, routes and musical labels;
    no redesign-driven migrations or unnecessary restructuring.

## Customize and Screen Hierarchy

Keep Harmony, Targets and Practice independently accessible, not a forced
wizard. Root Pool, Chord Quality Pool and Functional / Exact Degree Pool remain
independent and support general degrees, extensions and alterations with
correct labels. Explain invalid combinations locally without substituting
targets or overwriting the last valid saved preset. Saved status persists
through rerenders; Restore Default remains secondary. Mobile uses one column
and an accessible bottom Start region with reserved space, not an overlay
that obscures settings or focus.

The homepage retains only M1 Audiation and M2 Recognition as primary entries,
each with Start and Customize; saved/focused presets stay secondary. Do not
add redundant support badges or explanatory homepage copy.

Practice hierarchy: compact exercise/progress/Stop header -> known chord and
prompt -> current response controls -> fixed feedback region -> Replay,
applicable Reveal/Next and expandable read-only configuration. Do not expose a
new mid-question editor or reduce the intended 12-choice recognition task.

## Practice State Flow

### M1 Audiation

```text
Start / next question
  -> show chord + requested degree
  -> context on: play chord without target pitch class; Done ready at onset
     context off: Done ready with the visual prompt
  -> Done: lock first completion time, then play reference
  -> reference ready: enable self-rating, even while sound sustains
     Correct -> commit self-rating once
     Incorrect -> choose non-target degree or Unknown -> commit self-rating
  -> auto on: rating committed AND reference naturally completed -> next/results
     auto off: remain for Replay and manual Next/Finish
```

If the original context still sounds, reference adds the target without
reattacking the chord; otherwise it plays the established fresh full reference.
Incorrect alone does not commit a rating. Unknown must not become an invented
specific confusion. M1 outcomes are self-assessed, never verified pitch grades.

### M2 Recognition

```text
Start / next question -> automatically play question -> answer readiness
  -> direct submission from stable 12-choice grid; lock first evidence once
     first correct -> existing brief confirmation/fade -> next/results (auto on)
     first incorrect -> non-revealing Incorrect; remain on same question
       -> Replay and/or retry
          retry correct -> Correct on retry; same correct-transition policy
       -> Reveal -> full harmonic reference; show answer at reference readiness
          -> natural reference completion -> next/results (auto on)
  -> auto off: resolved question remains for Replay and manual Next/Finish
```

Keep the approximately one-second correct-answer transition; do not play an
extra automatic reference after a correct answer. Reveal uses a fresh full
chord/target reference even with context off, not the fast-correct path.
Retries never replace the original answer, correctness, latency or replay
evidence. Keep canonical answer ordering and exact target spelling.

### Shared Transitions and Recovery

- Automatically present the next question's existing context/question audio;
  no extra Play gate. Only response readiness, not the audible tail, gates input.
- Distinguish question Replay from reference Replay in labels while preserving
  actual playback and pre-first/post-first attribution. An unheard mandatory
  reference is not an extra replay.
- Keep manual Next/Finish after resolution even with auto on, as a secondary
  action. Natural-reference completion gates automatic progression, not an
  already-permitted manual Next that can interrupt the reference.
- At the final fixed question, apply normal completion gates then Results;
  do not generate an extra question. Unlimited continues until Stop.
- Stop cancels audio/pending work, ends and saves the session, then opens
  Results. Results prioritize M2 first-answer or explicitly self-rated M1
  outcomes; detailed review stays secondary.
- On backgrounding or audio failure, retain the question and offer Retry audio.
  Do not silently skip or fabricate valid interrupted timing. Preserve committed
  evidence and cancellation of stale operations or duplicate progression.
- Storage failure retains available data and a visible unsaved/error state
  with Retry saving, separate from audio recovery. Do not claim Saved or add
  a new practice freeze. Preserve existing unsaved-data protection.
- Reload preserves saved history, not a promise of same-question continuation
  or restored valid response timing.

## Insights Information Architecture

Use approved **architecture A: performance-to-decision**, serving post-practice
review and pre-practice planning equally. Keep decision-first actions beside
their evidence and exploration-first tools in the detail layer, not new modes.

| Priority | Information and interaction |
| --- | --- |
| 1. Comparison scope | Readable exercise, M1 method, context and represented date range; expandable full pools/versions. Preserve actual cohort boundaries. |
| 2. Performance | Correct/assessed, percentage and unassessed count first; replay assistance supports interpretation; correct-response time is secondary. |
| 3. Patterns worth attention | A small number of supported Quality x Degree patterns with sample and replay context; no forced weakness ranking. |
| 4. Next practice | Customize focus adjacent to its reason, accessible without scrolling to the far edge of a wide table. |
| 5. Detailed evidence | Complete breakdown, confusion list, timing/replay detail and session history; link to existing latest-session Results for immediate review. |

Root and quality filters update overview, patterns and detail consistently.
Keep active scope visible and retain focus at the operated control. Historical
aggregates are not recent performance; do not blend session and historical
data into a new score.

### Metrics, Charts and Reliability

- Data remains browser-local V2 attempts and configuration/target snapshots.
  M2 uses objectively scored first answers; M1 always says self-rated.
- Accuracy uses correct/assessed, not all recorded questions. Unassessed is
  not wrong. Correct-time median uses only first-correct, valid-timing records
  and displays its own eligible sample count; missing time is not zero.
- Replay-assisted first-response share uses assessed questions. Total before/
  after replay counts can include unassessed records and must not appear to
  share that denominator. Retries/review/reveals do not repair first accuracy.
- Separate exercise, source, method, context, pools, target/answer policies,
  exposure and timing/generator versions. Matching pools does not guarantee
  balanced observed root distributions or replay usage within each cell.
- Existing 10-assessed-per-cell screening is descriptive, not a statistical
  confidence guarantee. Sparse, tied or only-one-supported-cell data does not
  justify strongest/weakest claims. Repeated attempts are not independent
  novel material; fresh exposure is not proof of musical transfer.
- Use numbers and numerator/denominator for overview, not gauges or radar
  charts. Small Quality x Degree comparisons may use directly labeled
  horizontal bars with sample counts; retain a full numeric table. Missing
  evidence is not a zero bar.
- Prefer a sorted expected -> chosen/self-reported confusion list over a
  sparse 12 x 12 heatmap; keep Unknown separate. Timing starts as median,
  units and sample count in text, not a gratuitous line chart.
- Time-window aggregation, trend baselines and progress curves are outside
  this first redesign scope and require separate confirmation. Do not add
  proficiency thresholds, significance badges or a weighted mastery score.
- No records offers an existing practice entry; no filtered matches offers
  filter reset. Few samples stay descriptive. Missing timing affects timing,
  not available accuracy. Confine horizontal scrolling to detailed evidence.

## Explicitly Approved Behavior Changes

These are approved design requirements, not claims that implementation exists:

| Change | Required behavior |
| --- | --- |
| Leaving active Practice by navigation | End/save, cancel audio and pending work, then honor the clicked destination instead of forcing Results first. Preserve data and a visible warning on save failure. Stop still opens Results; no new confirmation step. |
| Focused preset from Root-filtered Insights | Carry the active root into the new preset's Root Pool. Without a root filter, retain the source Root Pool. Keep the selected cell's quality/exact degree, show editable pools in Customize, and require the existing user Start action. Do not mutate source history/preset. |

## Acceptance Criteria

The following are future checks, **not completed-test assertions**. Each
criterion must be verified against the detailed plans and preserved contracts.

| ID | Acceptance criterion |
| --- | --- |
| UX-01 | Desktop/mobile users can complete Customize -> Practice -> Results and Insights -> Customize focus -> Start, without occluded controls, incoherent overlap or disruptive layout shifts. |
| UX-02 | Primary controls have at least 44px targets, visible keyboard focus and meaningful labels; states are available to assistive technology and never color-only. Incidental updates do not steal focus. |
| CFG-01 | Root/quality/functional-or-exact target pools remain independent and musically valid; valid edits auto-save, invalid drafts preserve last valid data, Saved feedback remains visible and Restore Default works. |
| M1-01 | Context on/off, target omission, onset/visual Done readiness and reference continuation/fresh-reference behavior match established timing contracts. |
| M1-02 | Correct and Incorrect -> non-target/Unknown flows commit once; both rating-before-tail and tail-before-rating orderings wait for both gates when auto on. |
| M2-01 | First correct, first incorrect, repeated retries and retry correct retain direct 12-choice interaction, non-revealing feedback and immutable first evidence. |
| M2-02 | Correct uses the existing brief fade transition without extra reference; Reveal shows the answer at reference readiness and waits for natural completion for auto-next, including context off. |
| FLOW-01 | Auto off keeps manual review; auto on retains manual Next/Finish. Fixed completion, Unlimited, Stop, replay attribution and next-question autoplay work without duplicate/stale progression. |
| REC-01 | Background/page exit, audio failure/retry and navigation cancel stale work without changing committed evidence. Storage errors preserve data and visible recovery; reload does not promise active-session resume. |
| NAV-01 | Navigation out of Practice saves/ends and honors the clicked destination; Stop goes to Results, including truthful save-failure feedback. |
| INS-01 | Overview, supported patterns and detail reconcile to the same filtered attempts; assessment and timing denominators, replay attribution and cohort separation are unchanged. |
| INS-02 | Empty, no-match, sparse, tied, Unknown, interrupted and unavailable-time cases are honest; no unsupported ranking, zero substitution, mastery or transfer claim appears. |
| INS-03 | Practice actions are adjacent to evidence and usable on mobile; chart values have textual equivalents, and only detailed tables require horizontal scrolling. |
| FOCUS-01 | Focused presets inherit an active Root filter, retain original roots without one, remain editable before Start and preserve source presets/history. |
| COMPAT-01 | Legacy, isolated V1/V2 records, saved presets, first-response evidence, timing versions and analytics definitions remain compatible; no migration, new mode or Release 2 work is introduced. |

Record actual implementation and verification outcomes separately, with the
tested scope and remaining gaps. Do not mark this plan or the acceptance table
complete merely because the documentation has been committed.
