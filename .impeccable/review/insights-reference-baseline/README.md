# Rejected-build baseline, issue #35

Run `node tests/browser-v2-reference-baseline.mjs` with the existing Playwright
environment variables and the local server (BASE_URL defaults to port 4173).
This creates a new isolated browser context, never attaches to personal storage.
Clock: 2026-11-09 12:00 UTC. Record date: November 8. Device scale: 1.

## Evidence

For each overview, `actual` is the complete native-size build viewport; `pair`
places the unchanged reference left and build right; `overlay` is 50/50; and
`difference` is the absolute RGB canvas difference. Named region pairs use the
same fixed coordinate rectangle on both images, not relocated build elements.
The complete viewport is retained. Separate diagnostic full-page and element
captures expose offscreen content without moving it into the reference-position
comparison. Observed document-coordinate bounds and exact rendered text are in
`observed-regions.json`.
There is deliberately no global score or automatic visual-pass claim.

Detail/state comparison sets use each source panel's native extent as a
diagnostic viewport, with the corresponding real interaction/state active.
They do not invent approval for that viewport as a complete page. Full-page
and element diagnostics accompany them because the current implementation
places corresponding content far below the panel's reference position.
Setup uses the existing Customize handoff, an explicitly authorized correction.

Review follow-up: both Standards and Spec reviews identified missing offscreen
evidence; full-page and element diagnostics now cover it. Additional review
findings were addressed by comparing storage against the original serialized
seed and asserting all thirteen cell pairs, question/session counts and the
leading confusion counts through the reporting boundary. The complete browser
baseline rerun and all 178 unit tests pass; this is not a visual-pass claim.

## Fixture reconciliation

225 complete six-note progression questions, 21 sessions, 1350 positions:
1326 assessed, 1274 correct, 24 unassessed. The board says 227 questions; this
synthetic fixture does not falsify two extra questions to match that illustrative
number. It preserves all thirteen heatmap numerator/denominator pairs, 96%
rounded overall accuracy, 17 Unknown errors, and the major confusion directions.
The m7 fifth -> root group is 9, with Dm7 7 / Am7 1 / Gm7 1. These values are
asserted through the existing reporting/browser boundaries. There are no replay
or timing claims in this fixture. Histories are checked unchanged after inspection.

The overview board's third visible confusion is 7 ninth -> root (3), while the
recorded m7 b3 -> b7 group has 4. Do not change ranking semantics or silently
drop that group to fake a screenshot match. This content conflict must be
resolved explicitly during #37; the baseline exposes it rather than masking it.

Named state fixtures cover no records, out-of-period records, unassessed-only,
limited sample, all correct and unknown-direction errors. Counts are genuine
dynamic substitutions: two full six-note questions yield 12 positions, rather
than inventing the limited board's four notes. All-correct uses 60 positions
across ten questions and four sessions. Unknown-direction uses five Unknown
and two unannotated errors. State screenshots are current-build observations,
not new approved references or full-page matches to cropped source panels.

## Region mismatch ledger

| Region | Current mismatch | Delivery |
| --- | --- | --- |
| Navigation | mobile two-row full navigation instead of compact header; excess height | #36 |
| Scope/totals | additional family labels, date line, context heading, provenance paragraph and replay line displace summary | #36 |
| Summary | independent tall findings with repeated counts/evidence and mixed-setting caveat; no reference accent/action composition | #36 |
| Confusions | starts below first viewport, tall disclosures, repeated rules and source controls instead of compact expanded root list | #37 |
| Matrix | selected evidence needs reference-specific panel verification; overview screenshot cannot certify it | #37 |
| Performance | below viewport; oversized cells and additional numerator text; ordinary columns do not fit reference composition | #38 |
| Legend | extra numeric-band wording instead of compact approved labels | #38 |
| Secondary | duplicated recommendations/exploration occupy primary space; disclosures far below reference position | #39 |
| Data states | current screenshots must be rebuilt to corresponding panel copy/geometry, not treated as accepted | #39 |

Every row remains a visual failure. Passing this baseline script means the
fixture and evidence pipeline work, not that the UI passes #34. Final approval
requires the user's same-size comparison review after #36-39 and #40.
