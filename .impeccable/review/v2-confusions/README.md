# Confusion list verification (#28)

Synthetic isolated browser storage only. No personal records were accessed.

Implemented quality/target/reported-degree grouping across roots, first-outcome
deduplication, normalized root spelling detail, Unknown/unspecified/unassessed
counts, exact inline record evidence, source-labelled practice preview, retained
scope/disclosure and return focus. Existing assessment and audio are unchanged.

Checked: TypeScript build; 175 Node tests; both existing actionable Insights
browser suites; new confusion browser test using Edge at 1440/390/320px.
The new browser journey checks keyboard disclosure, nine exact evidence links,
mode-labelled source, preview navigation, return and unchanged history bytes.
Screenshots show synthetic Overall with the evidence deliberately expanded.
They do not certify the complete approved summary/heatmap layout, which belongs
to later tickets. Physical mobile, screen reader and 200% zoom remain unchecked.

Full `test:v2` attempt stopped in its first script on a Roots checkbox uncheck
timeout. Remaining scripts in that chained suite did not run. Do not treat
the focused Insights passes as a full V2 playback regression certification.

Independent standards/spec reviews found source ambiguity, absent source labels
in mixed evidence, root spelling grouping and insufficient evidence identity.
These were corrected. Added unit/browser assertions cover the new totals and
workflow; broader integration remains ticket #32.

## Matrix extension (#30)

Added an explicit List/Matrix presentation. Matrix is quality-specific, uses
the existing first-error groups by reference, and opens the same evidence and
practice action as the list. Unknown/unspecified/unassessed are scope totals
outside its cells. Diagonals are not correctness values. Matrix selection and
quality survive practice return independently of list disclosure preferences.
Mobile starts list-first; explicitly opened matrix/evidence are reordered
with the evidence/list ahead of the grid and bounded table scrolling.

Build and 177 Node tests passed. Four Insights browser suites passed after the
extension. New checks cover keyboard opening from a closed disclosure,
quality switching, sparse/diagonal cells, active Root filtering, matrix/list
count agreement, selected practice return and no page overflow. Reporting
tests include duplicates, missing qualities, empty population, deliberate
#11/b5 spellings and filtered counts. Screenshots now include the matrix.

Standards/spec review identified simultaneous duplicate presentations, matrix
actions overwriting list preferences, mobile ordering and missing test cases.
The mode behavior, separate preferences and mobile ordering were corrected;
focused tests were expanded and rerun. Exhaustive six-mode, large-matrix,
physical-device, screen-reader and 200% zoom checks remain #32. The prior full
V2 Roots timeout is not represented as fixed by this reporting-only change.
