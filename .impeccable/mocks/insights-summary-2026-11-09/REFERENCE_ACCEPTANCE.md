# Reference acceptance inventory

Parent: #34. Delivery ticket: #35. This package establishes the reference and
rejected-build baseline. It is not acceptance of the current implementation.

## Authority

The adjacent reference manifest records original board-pixel crop rectangles,
overview region bounds and transcribed visible copy. Coordinates within regions
are relative to their cropped screen. Source boards remain pinned to b35aefb.
Do not rescale boards to simulate viewports. Detail/state boards contain panels;
their crops must not be represented as approved complete desktop pages.

Copy slots represent actual recorded values. They do not authorize rewriting the
surrounding sentence or adding explanations. Some helper sentences really are
present in the approved boards: retain those, not newly invented small print.
The board's malformed punctuation is recorded rather than silently corrected.
Existing generated-image corrections are enumerated in the manifest.

## Reproduction

Run `node scripts/insights-reference-crops.mjs` with the existing browser-test
environment variables `PLAYWRIGHT_MODULE` and
`PLAYWRIGHT_CHROMIUM_EXECUTABLE`. The script checks each source against the
pinned git revision, rejects out-of-bounds crops and writes twelve unscaled
PNG references plus SHA-256 source provenance under `references/`.

The extraction command passed for all twelve crops. Build and the existing
178 unit tests passed. These checks do not certify visual fidelity.

## Baseline evidence

- All twelve extracted crops have been visually inspected; panel boundaries
  retain the original content without the surrounding board headings.
- `MEASUREMENTS.md` records raster geometry, text estimates, controls and panel
  regions, explicitly distinguishing observed glyph heights from source CSS.
- `tests/fixtures/insights-reference.mjs` defines isolated overview and data-state
  records. Mapping limitations are documented in the comparison README.
- `tests/browser-v2-reference-baseline.mjs` generates native overview captures,
  pair/overlay/difference and region images, 1440/390/320 captures and state
  observations. It checks totals, directed root contributions and preservation
  of stored history through existing browser/reporting boundaries.
- `.impeccable/review/insights-reference-baseline/` contains generated evidence,
  actual region bounds/text and the per-region mismatch ledger. All current
  UI mismatches remain failures assigned to #36-40.

## Gate for subsequent implementation

Zero unapproved structural or copy deviations. Explicit approval is required
for a tolerance that would waive a mismatch. Font rasterization noise is not
permission to move, resize, omit or clip content. No global similarity score
can override a failed region. Never regenerate the baseline from the build.

The desktop reference must show degree 9 and every ordinary reference column
together. No-page-overflow tests alone do not demonstrate this. Summary, list,
matrix and selected evidence must reconcile without changing scoring, sample
gates, first outcomes, history or preset source configuration.

The final implementation needs a new user review of same-size comparisons;
approval of these source boards is not acceptance of the later code.

## Review status

Independent Standards review found no actionable documentation issues. Spec
review correctly identified incomplete dynamic-copy coverage and missing
viewport metadata; those fields were expanded. The continuation adds geometry,
fixtures and current-build comparisons. Passing the baseline workflow is not
visual acceptance of the application; #34 remains open.
