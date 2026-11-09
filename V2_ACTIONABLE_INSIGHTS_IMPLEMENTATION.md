# Actionable V2 Insights — delivery and verification

Delivered locally 2026-10-29, Asia/Hong_Kong. All eight approved tickets completed.
Implementation is separate from merge/deployment; this report does not claim a live
Netlify release, a GitHub issue, external triage labels or cloud-synchronized history.

Contract: [specification](V2_ACTIONABLE_INSIGHTS_SPEC.md).
Source design: [information architecture](V2_INSIGHTS_INFORMATION_DESIGN.md).
Tracking: [eight approved local tickets](.scratch/v2-actionable-insights/README.md).
Actual UI: [desktop/mobile captures](.impeccable/review/v2-actionable-insights/README.md).
Shown fixture scores are synthetic, not the musician's actual records.

## Delivered behaviour

- Recent 7/28/90 local-calendar days or All, family/context navigation and
  correct/assessed, question/session, unassessed and assessment-source information.
  Overall keeps the six contexts separate; its accepted combined degree accuracy
  remains a secondary denominator-weighted mixed-practice total.
- Progressive actual-practice-key/root → chord quality/full chord → degree analysis,
  retained compatible filters, clear controls and distinct unknown/no-data states.
  A random pool does not multiply one drawn question across every eligible key.
- Up to three recurrent-error/coverage observations. Only assessed questions and
  sessions satisfy conservative presentation gates; a long phrase or unfinished
  practice cannot manufacture independent evidence. Overlapping observations merge.
  Coverage is explicitly tied to a selected recorded setup and its chosen domain.
- Setup actions validate an independent draft, keep the same exercise, C-source
  progression and supported rhythm/pool/mix settings, and disclose key/quality-wide
  narrowing. Edits do not overwrite source presets or start playback. Return restores
  the Insights investigation; clicking an already selected context is a no-op.
- Matched-condition trends use common pooled-sample weights and explicit sample
  coverage. Actual key/difficulty/generator/method differences cannot silently become
  a learning claim. Insufficient comparison is unavailable, not a fabricated zero.
- Applicable first-correct response timing remains separate by mode/method. Play by
  Ear retains one valid post-accompaniment delay per eligible question, including zero.
  Chord/root scope means containing questions; degree filters do not create degree
  times. Wrong, incomplete, replay-assisted and interrupted phrases do not earn normal
  timing credit.
- Complete key×chord, quality×degree and full chord×degree evidence, original chord
  spellings, directed confusions, readable source conditions, technical provenance and
  matching history links/reload. Unknown old tags remain unknown; old played Audiation
  remains Audiation. Hundreds of setups stay disclosed rather than becoming the page.

The read model is shared through the existing public model reporting seam. It adds
no second scoring store, analytics service, runtime dependency or destructive schema
migration. View preferences use session storage; independent drafts are temporary.
Reloading an unavailable temporary draft gives an explicit return-to-Insights path.
Existing audio, sampling, first-grade locks and Legacy implementation were not changed.

## Ticket acceptance

| Ticket | Delivered evidence |
|---|---|
| 01 Recent overview/periods | Browser mode/period/count journey; public dedup/date tests and DST boundary example; read failure/unknown dates |
| 02 Keys/roots | Actual Eb vs F-root attribution; twelve-key coverage and unknown-key history; compatible key comparison |
| 03 Chord/degree | Full-chord and degree drill-down; original spelling; directed confusion and keyboard focus; retained musical filters |
| 04 Priorities/coverage | Threshold, assessed-only independent samples, error merging, scoped coverage and assessed-stratum recency regressions |
| 05 Practice preview | Full C-source and fixed-key copy; private edits preserve source bytes; Single Chord and progression return journeys |
| 06 Comparable trends | Composition-shift zero-change and real +10 percentage-point worked examples; version/settings incompatibility |
| 07 Efficiency | One question/zero-delay eligibility and exclusion checks; explicit parent-question scope, no mixed speed metric |
| 08 Evidence/history | Full cross-tabs, matching result reload/return, 300 saved setups, old played Audiation and unknown-key/date states |

All 76 stories and 17 acceptance examples are assigned in the approved ticket
breakdown. Behavioural checks and independent review establish the stated software
contracts, not musical-learning efficacy or manually verified instrumental accuracy.

## Verification

- `npm test`: TypeScript build and **19 test-file subtests passed, zero failures**.
- The new public-model suite contains **13 behaviour cases**, including independent
  assessed-sample gates, unassessed-recency protection, original Db7 spelling, key
  attribution, protected handoff, weighted trends, valid zero delay and DST.
- Both new browser journeys passed: the full overview/drill-down/private-preview/
  return/history-reload path and empty/old/unknown/dense-history states. Their runnable
  entry point is `npm run test:v2:insights`.
- Existing progression browser, critique/keyboard/history and key/Play by Ear browser
  regressions passed with selectors adapted to family/context navigation. Combined
  counts remain 1/7 and 5/7 in their respective worked histories; existing grading,
  replay/reference and first-outcome behaviour remain covered.
- Existing Single Chord Audiation grading and V2 lifecycle browser checks passed:
  completion orderings, fixed counts, manual review, locked evidence, stale actions,
  keyboard focus, interruption/recovery, replay gating and Stop cancellation. The
  local adapter uses installed Chromium in place of the historical Edge channel.
  Source model/audio/lifecycle tests are included in `npm test`.
- Final captures at 1440/390/320 were inspected; no document-level horizontal overflow.
  `git diff --check` and local documentation-link/status checks passed.

No claim is made that the historical aggregate `test:v2` browser command is fully
updated: it contains unrelated older UI assumptions. The checks above are the named
checks actually run. Safari/iOS, human screen-reader operation and real-instrument
listening remain manual validation; headless Chromium does not establish those.
The optional Impeccable CLI launcher/detector is absent, so no detector certification
or human-visible overlay is claimed.

## Standards

Independent review: `actionable_insights_standards`, fixed baseline
`2cdd6376bf8aa0e26f925f7161a639bfcd26487c`, implementation `e78b620`, follow-up
`368bd3f`. Standards sources: root agent guidance, musical product intent and the
incumbent V2 design system.

> Documented-standard breaches: None substantiated. Legacy files/storage are
> untouched, assessment families remain explicitly distinguished, and timing retains
> accuracy-first eligibility and honest interaction caveats.
>
> Heuristic smells: No material maintainability defects substantiated. Optional
> opportunities in the dense renderer and repeated sample thresholds are not
> actionable findings on their own.

The follow-up found no new material documented-standard breaches or heuristic
maintainability concerns in the review fixes. A final scoped check also confirmed
that returning the Start promise preserves the existing wrapper’s asynchronous
error reporting in both source and compiled JavaScript. These are scoped review findings,
not a promise that every possible future refactor is unnecessary.

## Spec

Independent review: `actionable_insights_spec`, same fixed baseline and initial
implementation; follow-ups through `16d1642`.

The initial review found one P1 and five P2 contract gaps, no demonstrated scope creep:

| Finding | Resolution and proof |
|---|---|
| Unassessed questions/sessions padded eligibility | Gate on distinct assessed questions/sessions; public red→green regression |
| New unfinished question elevated an old stratum | Select latest assessed timestamp; public red→green regression |
| Canonical roots discarded original spelling | Keep original root/chord labels alongside canonical grouping keys; Db7 regression |
| Missing full chord×degree evidence | Add independent full-chord/degree table with original display labels; browser check |
| Disappearing Inspect control lost keyboard focus | Focusable analysis-heading fallback; Enter-driven Key→Chord→Degree checks |
| Compatible filters erased on scope changes | Preserve compatible musical scope and announce incompatible removal; browser check |

The first follow-up verified five resolved and one partial: clicking the already
selected context still cleared its condition scope. A no-op guard and a browser
regression fixed that residual. Final focused verification at `16d1642`:

> All six original findings are now resolved. No remaining issue identified within
> this focused verification; browser execution was not repeated by the reviewer.

The root agent separately executed the passing browser checks. The reviewer's own
initial browser launch was sandbox-blocked; this report does not attribute root
browser verification to that independent reviewer.

Review totals: Standards **0 material findings**; Spec **6 initial findings, all
resolved** within the reported follow-up scope.
