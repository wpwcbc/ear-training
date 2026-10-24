# V2 Split Desk Implementation

2026-10-24. User-approved Signal Route identity, C - Split Desk composition
and three full-flow extension boards. See the
[approval record](.impeccable/decisions/2026-10-24-split-desk-flow.md).
Independent finish review returned five material fixes. The same reviewer
scored all five resolved after recapture, disposition **ship** at that fix-list
scope. See [review and verdict](.impeccable/review/finish-review.md). The
verification below is not a claim of device or accessibility certification.

## Delivered Scope

- V2-only typography, palette, navigation and component language. Desktop
  separates task/outcome from response/evidence; mobile stacks the same order.
- M1/M2 entry points retain only Start and Customize; saved presets remain
  secondary. Customize keeps independent pools, existing valid auto-save,
  invalid-draft protection and Restore Default.
- Practice keeps existing lifecycle rules. Playback status reflects real
  voices rather than treating a sustaining chord as blocked input. Natural
  audio completion updates the indicator without replacing live selectors.
- M1 retains Done, reference, equal-weight self-rating, conditional wrong
  degree/Unknown and existing manual/automatic progression. M2 retains
  immutable first answers, retries, Reveal and correct-answer confirmation.
- Results prioritize accuracy, assessed/unassessed counts and continuation.
  Replay assistance and valid-correct response timing retain distinct samples.
- Insights follows scope -> performance -> supported descriptive patterns
  with adjacent focus action -> collapsible breakdown/confusions/history.
  Sparse, tied or single-supported-cell observations do not receive a ranking.

## Explicitly Approved Behavior Changes

1. Leaving active practice saves and ends the session, then goes directly to
   the selected destination. Stop still opens that session's Results.
2. Creating a focused preset carries the active Root filter into its Root
   Pool. Without a Root filter, the source pool is preserved. Quality and exact
   degree focus, editable customization and source/history isolation remain.

No model/schema migration, analytics formula, cohort definition, target
generation, synthesis or Legacy change. No Release 2 work, new mode, pause,
resume, pitch verification, trend score or automatic adaptation.

## Verification

- TypeScript build and 131 Node tests passed.
- All eight V2 browser suites passed, including new Split Desk regressions:
  consistent filtered populations, separate timing-policy cohorts, independent
  denominators, focus Root inheritance, source isolation, saved/invalid drafts,
  immutable retries, direct navigation and stale-event cancellation.
- M1 reference-time grading and stable native wrong-degree controls passed.
- The primary mobile focus button is fully visible inside the tested 844px
  viewport. Separate M1 target prominence, rating-state copy and the 44px
  comparison disclosure target are checked by the new browser suite.
- Desktop 1440x1000 and phone 390x844 captures cover home, customization,
  M1/M2 practice, self-rating, Results and populated Insights. Additional
  320/768 layout checks and last-quality reachability above the mobile footer
  passed. Capture fixtures use isolated synthetic data, not personal history.
- Axe WCAG A/AA scans passed on captured states. Keyboard focus checks cover
  filter refreshes, conditional rating and progression controls.
- V2 entry suite and two Legacy browser smoke suites passed.

The exact 1077x422 approved Practice viewport comparison scores 90% match;
paired crops are under `.impeccable/review/diff/final/`. The generated C7
mockup's b3 is rendered as the existing musically correct #9 choice, rather
than changing domain spelling to match generated lettering. Lucide replaces
generated icon approximations. Source Sans 3 is locally hosted under OFL.

The automated responsive image gate cannot align its fixed-pixel desktop
regions after scaling a 1440-wide screenshot into the 1077-wide reference;
it reports real visible controls as missing. This gate was not forced or
reported as passed. Actual desktop/mobile captures and browser reachability
checks are separate evidence supplied for independent review.

The one detector warning is the 4px active navigation-tab underline, which
has explicit zero radius, not a rounded-card accent. No second detector run
or automated suppression was used.

Physical iOS/Safari, assistive-technology walkthroughs and subjective acoustic
verification remain manual checks. Browser automation does not certify them.

## Repeating the Checks

`npm test` builds TypeScript and runs the Node tests. `npm run test:v2` runs
the eight V2 browser suites; `npm run test:entry` checks V2/Legacy entry routes.
Browser tests follow the existing project setup: Playwright with Microsoft
Edge, optionally selected through `PLAYWRIGHT_MODULE`; `QUALITY_AXE_PATH`
points to the available axe-core browser script. No new project dependency
was introduced for this redesign.

Set `V2_SCREENSHOTS=1` when running `tests/browser-v2-split-desk.mjs` to replace
the isolated fixture captures under `.impeccable/review/`, including the exact
comparison viewport. It does not read or modify the user's browser profile.
