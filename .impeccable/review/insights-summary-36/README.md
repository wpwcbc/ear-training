# Issue 36 implementation review

The user approved one wording exception on 2026-11-10: strength claims must
include their actual degree (for example, maj7 fifths), not generalize to the
whole chord quality. Recorded in the copy manifest; scoring/ranking unchanged.

Implemented: compact family/context/period controls, outcome line, unified
three-line narrative, evidence disclosure, finding-specific setup/source
handoff and return, and Insights-only collapsible mobile navigation.
Methodology and date details remain available through disclosures. Unknown
source findings cannot offer a dead-end setup action. Legacy and exercise
generation/playback/scoring are untouched.

Verification: focused browser layout/return/source-availability test, all six
Insights browser suites, build and 178 unit tests passed. Existing tests were
updated to inspect selected scope/compact totals instead of removed redundant
headings, and to open the newly nested evidence disclosure. No score or history
assertions were removed. Standards review findings on source eligibility,
date-warning reachability and nested tests were addressed; the separate Spec
review agent was unavailable, so visual/spec checks were performed locally.

Native comparisons: 1084 x 956 and 379 x 956; additional 320px reflow check.
Pairs put reference on the left, implementation on the right. Reference images
are unchanged; the approved strength-wording exception and coherent 225-question
fixture (instead of the illustrative 227) are intentional content differences.
The new test's layout bounds are regression checks, NOT permission to waive a
visual mismatch.

## Remaining visual acceptance

The desktop summary starts at y271.4 and ends at y492.0; mobile at y220.4 and
y394.0, matching the measured section extents closely. Typography, individual
control widths, narrative wrapping and action positions still need final
same-size user review. No claim of pixel-identical completion is made.

Degree-confusion rows, heatmap and secondary content remain the old layouts,
assigned to #37-39. Their visible differences are not concealed in these full
viewport comparisons. #36 remains open pending its visual acceptance; #34
remains open. Physical-device and screen-reader checks were not performed.
