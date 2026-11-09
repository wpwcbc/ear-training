# Performance heatmap (#29)

Synthetic fixtures only; no personal browser records read or changed.

Checks: TypeScript build and 176 Node tests passed; three existing Insights
browser suites passed; new heatmap browser journey passed in Edge. New tests
cover 15/30 aggregation rather than percentage averaging, deduplication,
immutable input, deliberate degree spellings, unassessed and zero-correct
states, exact evidence count, labelled source preview, selection on return,
keyboard close/focus restoration, mode scope and no whole-page overflow at
1440/390/320px. Screenshots are cropped to the new section, with bounded
horizontal table scrolling on narrow screens.

No audio/scoring changes. Full V2 playback regression was not rerun for this
ticket: the previous attempt stopped on a Roots uncheck timeout, as recorded
under v2-confusions. Physical phones, screen readers and 200% browser zoom
remain integration checks for #32. These checks do not certify the complete
summary-first composition: narrative summary and confusion matrix remain
separate tickets #31 and #30.

Standards review identified return focus, selected-colour specificity and
rounded-percentage band discrepancies; these were fixed. Spec review identified
source ambiguity/persistence, missing swatches and coverage limits. Added full
source settings, stored source choice, swatches and actual Back to Insights
navigation. Focused browser retest passed with selected-colour and return-focus
assertions. A complete six-mode/mixed-source/zoom matrix is still owed by #32;
the focused fixture is not presented as exhaustive integration coverage.
