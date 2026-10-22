# Insights October 22 Polish

Presentation policy: `insights-polish/2026-10-22.1`. Base evidence policy remains `insights-2.2`.

The implementation follows the authorized October 22 polish handoff on top of the
existing native TypeScript pages, repository, summary selector and practice engine.
No new analytics service, storage migration or framework was introduced.

## Delivered Behavior

- M1 summaries lead with an observation, then counts and a visible limitation.
  Self-ratings remain distinct from measured performance. Descriptive peer samples
  retain separate evidence references; one paragraph link opens both samples.
- Retained ratings, independent diagnostic questions and local dates have separate
  labels. Reconciliation exposes actual excluded assessment IDs and representative
  membership. Unknown identities do not become independent questions.
- Five observed-rate colors use unrounded values. Evidence status, mixed settings,
  stale results and unknown identities remain independent of fill. Table and heatmap
  use the same cells, selection and evidence references.
- The M1 Suggested Diagnostic uses profile `m1-suggested/2026-10-22.1`, cloned module
  defaults and explicit overrides. Its default roots are C/D/F/G, MIDI 48-72,
  full context/hints, manual reveal and 72 BPM.
- Each focus/contrast slot is generated with singleton target pools, verified against
  the actual snapshot, and then deterministically shuffled as a slot/snapshot pair.
  The example contains exactly seven dominant-seventh thirds and three flat sevenths.
  Previewing is silent. Start uses the validated snapshots without regenerating them.
- Mixed or missing historical settings do not block the new profile. Optional historical
  checks accept complete captured effective settings only and preserve original sampling.
  They have independent controls and are not labeled as 7/3 diagnostics.
- Customize copies the proposed profile and revalidates edited roots, range and tempo.
  Invalid ranges produce an error with no partial session or silent range expansion.
- Launch persists the plan, snapshots and origin before navigation. A shared launch lock
  prevents duplicate sessions. Retrying a failed save reuses the pending session,
  including its live origin metadata. Recent updates once; Saved presets are unchanged.
- Completion labels source-specific results and targeted exposure. Repeat increments
  the recorded variation index; return restores the originating query and scroll.
  Completing ten questions today does not inflate the fresh baseline or cross-day gates.
- Two recorded days use a compact three-column results table. Existing calendar/DST,
  freshness, prior-period and missing-timing safeguards remain in place.
- Desktop uses a 320px detail column at viewport width 1280px and above; smaller screens
  place details below the matrix. Tables scroll locally. Selection has a check mark,
  an accent outline and separate keyboard focus. English/Traditional Chinese primary
  summaries and diagnostic controls use the same factual data and schedule.
- Fixed overflowing long row headers and tooltip positioning that could cover controls.
  Evidence remains a native modal; ordinary cell details remain nonmodal.

## Acceptance Coverage

| Handoff IDs | Implementation / verification |
| --- | --- |
| N01-N03 | Existing synthetic ledger, refinement tests, exact ID reconciliation and browser results table |
| N04-N07, N11, N14 | Summary templates/editorial ordering, source-qualified counts, deterministic selectors and polish tests |
| N08-N10, N12-N13, N15 | Existing policy/summary tests plus mixed known/unknown identity regression; no sufficiency gate changes |
| H01-H04 | Raw bucket-boundary tests, independent status labels, integrity/unknown/coverage rendering |
| H05-H09 | Existing refinement browser checks: selection, local roots, table parity, modal focus and deleted-reference rejection |
| D01-D05, D09, D11, D14 | Pure compiler checks and browser preview/customization/error/snapshot parity |
| D06-D08 | Separate historical controls, synchronous bounded preparation, render request tokens and shared launch lock |
| D10, D12-D13 | Browser save-failure/retry, actual ten-question completion, targeted membership, fresh count and return flow |
| U01-U05 | Existing window/DST/density tests and compact daily results assertions |
| U06-U10 | Seven viewport sizes, actual browser 200%/400% zoom, forced colors, reduced motion, contrast and keyboard checks |
| U11-U13 | Existing Settings import/clear safeguards, global save error and source/preset immutability checks |

These are coverage mappings, not a claim that every criterion has a separate automated
test. Physical-device audio, manual screen-reader certification and full WCAG certification
were not performed.

## Validation

The test scripts are `npm test`, `npm run test:browser` and `npm run benchmark:summary`.
Browser tests use isolated profiles and synthetic storage. They never clear or seed the
user's live browser profile. Generated `js/` output is committed with its TypeScript.

Synthetic fixture: 113 retained assessments; 112 ratings (101 correct, 0 close, 11 missed);
110 diagnostic questions (99 correct, 11 missed); October 20: 23/29; October 21: 76/81.
The two extra correct reassessments and one skipped record are an explicit reconstruction,
not an inferred explanation of the user's actual exclusions.

Screenshots are in `tests/fixtures/insights-polish/`: default 320/390/768/1024/1280/1440/1920px,
selected detail, table, validated-diagnostic error and Traditional Chinese views.

Validation results: 105 unit tests and the full 14-script browser suite passed. After the
last presentation changes the relevant refinement and polish browser checks were rerun.
Actual 200% and 400% Edge zoom, forced colors and reduced motion were exercised.

10k summary benchmark, Node 22.20.0, Ryzen 7 7735HS: uncached P95 661.3ms, cold 696.5ms,
cached P95 0.48ms. The uncached 500ms budget remains unmet. In the complete browser run,
the 10k background worker took 1370ms with 58 responsiveness ticks; 4x CDP CPU throttling
took 3178ms with 61 ticks. These are synthetic measurements, not physical-device audio
or full-page performance guarantees. A cached selector measurement uses a fixed as-of
snapshot and does not imply every live page render will hit that cache.
