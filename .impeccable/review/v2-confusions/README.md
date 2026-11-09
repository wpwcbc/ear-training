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
