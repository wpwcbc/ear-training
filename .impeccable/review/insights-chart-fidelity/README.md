# Insights chart fidelity review

2026-11-11. Issues #37 and #38 under #34. This is an implementation review
package, not user visual acceptance. The approved boards at `b35aefb`, their
native crops, and the previous implementation captures remain unchanged.

## Native comparisons

Every pair shows the approved reference on the left and the current browser
render on the right, at the reference's original device scale of 1. The overlay
and difference images use those same pixels without resizing, masking or
alignment offsets. `geometry.json` records the observed DOM bounds and copy.

| Reference | Native size | Comparison | Observed geometry |
| --- | --- | --- | --- |
| Desktop overview | 1084 x 956 | [Pair](overview-desktop-pair.png), [expanded confusions](overview-desktop-confusions.png), [heatmap](overview-desktop-performance.png) | List starts y584; data grid x537, y610-730; all seven degree columns fit. |
| Mobile overview | 379 x 956 | [Pair](overview-mobile-pair.png), [expanded confusions](overview-mobile-confusions.png), [heatmap](overview-mobile-performance.png) | List starts y454; heatmap divider y634; data rows y711-798. |
| Selected matrix | 971 x 503 | [Pair](matrix-pair.png) | Quality and tabs share y118; matrix rows y248-412; selection divider x624, y185-486. |
| Direction evidence | 448 x 503 | [Pair](evidence-pair.png) | Root rows begin y223; source picker y364-399; action y439-481. |
| Recorded setup review | 971 x 373 | [Pair](setup-preview-pair.png) | Readout starts y115; action rule y297 and buttons y312-353. |

The screenshot harness also captures 1440/390/320px responsive examples
and the selected heatmap cell. The source boards do not contain a selected
heatmap evidence panel, so that capture is an implementation diagnostic,
not a fabricated same-state reference. Expanded-direction crops are from the
full same-size overview pairs, which remain available for context.

## Scope and differences

- Overview retains three real count-ranked directions. The existing List
  control discloses the complete list without adding another visible line.
  The third direction is the approved `m7 b3 -> b7 (4)`, not the example third
  direction. The coherent fixture has 225 questions, not the illustrated 227.
- Matrix accounting is for the selected quality: 9 Unknown and 8 unassessed
  in the synthetic `m7` population. The overview retains the 17/24 totals.
  The `5 -> b7` count and the available `C, G, F` source keys are recorded data.
- At 379px all seven columns already fit. The app does not draw the reference's
  partial scrollbar thumb when there is nothing to scroll. At 320px and with
  wider vocabularies, the labelled table scrolls locally. This visual difference
  is shown for user review rather than waived by a pixel threshold.
- Source Sans 3, native select glyphs, flat fills and the existing yellow
  navigation underline are used. The generated typography and raster colour
  variations are not pixel-identical to browser-rendered controls.
- The compact recorded setup readout sits above the existing independent
  progression Customize editor on the same route. Open Customize moves focus
  to the editor; it does not open a new page. Back to evidence restores the
  recorded source and initiating control. Back to Insights restores the
  selected direction in the originating list or matrix, rather than requiring
  a separate illustrated return panel.
- Source pickers distinguish fixed C, G and F setups even when every other
  setting matches. Changing this UI identity does not change condition-based
  grouping or analytics. Both pickers retain their recorded source on return.
  An old positional preference resolves through its former source ordering.
  When a key filter narrows the draft, the Keys field shows the before/after
  values. Reopening the review via browser history retains its evidence return.
- The old below-chart sections are still present. The secondary disclosures and
  alternate data-state work belong to #39 and are not included in this review.

## Reproduction

Use the existing Playwright environment and local static server. Run
`node tests/browser-v2-chart-layout.mjs` for exact-copy, keyboard/touch, native
comparison and responsive checks. Set `INSIGHTS_CHART_ARTIFACTS` to write the
images elsewhere. All screenshots use synthetic records and a fixed clock,
in an isolated browser context. The test verifies unchanged stored history.

The selected-source round trip, first outcomes, 18-degree vocabulary, 200%
content reflow and absence of audio writes are covered by the V2 browser suite.
Hardware, Safari and human screen-reader acceptance are not established.

## Verification

- `npm test`: TypeScript build and all 178 unit tests passed.
- `npm run test:v2`: full V2 browser suite passed, with automated accessibility
  checks enabled on Insights. The native chart harness also passed with axe
  enabled on the selected matrix and evidence views.
- `npm run test:v2:keys-play`: fixed/random keys, both Play by Ear contexts and
  session/preview persistence passed. An old compact-outcome locator was updated
  to the approved #36 copy; the assessed result remains 4/6.
- `node tests/browser-legacy-insights.mjs`: Legacy Insights passed.

The design scan reported the existing approved summary accent and measured
chart-specific type/colour values outside the general design ramp. These are
reference-driven; the app-wide design tokens and #36 were not changed.

## Spec review follow-up

Independent review found the fixed-key identity collision and missing setup
readout. Both were reproduced in browser tests and corrected. The matrix's
target-axis position and desktop heatmap legend divider were aligned; tests
now check the complete visible list copy and keyboard access to the last
heatmap column in the 18-degree fixture. The absent 379px scrollbar thumb,
direct return behaviour and generated typography differences remain visible
in the evidence package for user review. No ticket has been closed on the
strength of automated checks alone.

The independent standards review's three follow-ups (old selection identity,
repeated browser return, and key narrowing disclosure) were fixed. The full
Insights browser suite and the native chart harness passed again afterward.
