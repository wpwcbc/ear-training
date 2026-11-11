# Insights chart implementation review

Date: 2026-11-11. Issues #37 and #38, parent #34.

This is implementation evidence, not user acceptance. #36 was approved separately.
The original references at b35aefb remain unchanged.

## Implemented

- Three leading confusion directions, with the first root breakdown open.
- All confusions exposes every remaining direction without changing ranking.
- Source configuration and record IDs are inside evidence, not default row bodies.
- List and matrix share the existing quality-specific report and first-error counts.
- Matrix selection shows root contributions and target-group error counts. Closing
  a selected direction returns keyboard focus to its matrix cell.
- Source choice and scope-specific disclosure state survive the setup round trip.
- All seven reference heatmap columns fit at 1084px; the selected cell exposes
  counts and source evidence. Large vocabularies use bounded scrolling.
- Missing observations, unassessed cells and limited samples remain distinct.
- The heatmap's presentation colours and row order follow the approved reference;
  neither modifies accuracy, eligibility, ranking, scoring or stored records.

## Evidence

Run `node tests/browser-v2-chart-layout.mjs` with the project's Playwright settings.
The harness uses synthetic records, a fixed clock and isolated browser storage.
It writes native-size 1084px and 379px pairs, overlays and difference images,
a 320px screenshot, matrix/selected-cell captures and measured geometry.
The left half of each pair is the approved reference; the right is implementation.
No image is resized or masked. Matrix and selected-cell captures are diagnostics,
not same-size panel acceptance evidence.

The ordinary desktop table has client width 524px and content width 523px. All
seven degrees, including 9, are simultaneously visible. At 320px the table scrolls
inside a 278px region; the page does not overflow.

## Decisions and remaining fidelity work

- User approved the true count-ranked third direction: m7 b3 -> b7 (4), rather
  than the illustrative dominant-7 ninth -> root (3). See reference manifest.
- The coherent synthetic fixture has 225 questions rather than the board's 227;
  the 1274/1326 assessed-note result is unchanged. Never fabricate question counts.
- All confusions currently occupies a separate secondary line. This contributes
  to the mobile heatmap heading being lower than the reference. Its final placement
  and the remaining vertical spacing need refinement before visual acceptance.
- Matrix detail layout now separates the plot and selection, but is not yet an
  exact native-size match for the detail-flow panel. Legend geometry, title/scope
  composition and selected-detail typography remain to be aligned.
- Matrix bin labels are derived from actual counts, not copied illustrative labels.
- The old lower-page priorities/analysis remain unchanged, pending #39. They are
  deliberately not presented as approved final page content.

Do not close #37/#38 or parent #34 on functional tests alone.

## Verification

- TypeScript build and 178 unit tests passed.
- Full `npm run test:v2` passed, including practice, playback, lifecycle, settings,
  layout and Insights flows.
- Focused chart layout test passed at 1084, 379 and 320px.
- Insights regression covers 18-degree matrices, 200% zoom, evidence, preview,
  first outcomes and byte-for-byte history preservation.

## Independent review

Standards review found two issues, both corrected: matrix accounting now uses
the selected quality's population, and global unassessed totals are no longer
inserted into individual direction evidence. Keyboard tests assert both the
closed state and reopened state, plus return to the initiating matrix cell.
A regression fixture places unassessed records exclusively in another quality.

Spec review confirms the remaining mobile geometry and matrix-panel fidelity
issues above. Matrix footer wording has since been corrected; the remaining
panel-composition findings are still open. Neither review is user acceptance.
