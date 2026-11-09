# Insights review boards

Parent specification: https://github.com/wpwcbc/ear-training/issues/26
Design ticket: https://github.com/wpwcbc/ear-training/issues/27

Status: overview direction accepted; detail and state boards awaiting approval.
These are generated composition previews, not implemented UI or validated
responsive screenshots. Ticket 27 remains open. No exercise logic changed.

## Boards

- 01-overview.png: summary-first desktop/mobile composition, primary confusion
  list and quality-by-degree performance heatmap.
- 02-detail-flow.png: confusion matrix, selected-direction evidence, recorded
  practice-source selection, Customize handoff and retained return scope.
- 03-data-states.png: no records, empty period, unassessed-only, limited sample,
  all-correct and errors without a specified wrong degree.

All data are illustrative. Do not hard-code these numbers or treat the boards
as a complete, internally reconciled dataset. For example, the detail matrix
does not enumerate every error in the selected target's denominator.

## Binding implementation corrections

- Preserve existing navigation including Legacy. The generated Settings item
  is an image-generation error, not an approved feature or navigation change.
- Keep the existing yellow underline navigation treatment, flat surfaces and
  small control corners; generated shadows/gradients are not design changes.
- Replace 'notes awaiting assessment' with 'unassessed recorded notes'; do not
  promise historical regrading or invent a recovery workflow.
- Do not add an unnecessary intermediate page: the illustrated setup review
  can live within the existing preview/Customize handoff.
- Every finding needs its own exact evidence scope and applicable practice
  action. One generic summary button must not select an unexplained finding.
- Show assessed-note denominator, question/session support and Unknown scope
  explicitly. Matrix cell totals must reconcile with the list and details.
- Keep graph degree spelling intact. Missing observations are not zero scores.

## Interaction and verification contract

Keyboard activation must open the same detail as pointer/touch. Use semantic
table headings and labelled cell controls, visible focus, and restore focus to
the originating cell or finding when detail closes. Provide values without
hover and without colour dependence. Changing quality updates both matrix
and its selected evidence, never leaves stale detail behind.

Mobile leads with summary and the confusion list. A matrix may scroll inside
its own labelled region, not the whole page. Check real renders at 1440, 390
and 320 pixels and at 200% zoom during implementation; these raster boards do
not demonstrate those checks. Preserve scope and selection across Customize
and return. Inspecting evidence must not start playback or write attempts.

## Provenance and review limits

Created with the built-in image generation tool for this conversation on
2026-11-09. Overview prompt requested existing Split Desk identity, summary,
cross-root confusion list and performance heatmap. Detail prompt requested
matrix -> evidence -> recorded setup -> return. State prompt requested six
distinct honest data states. Full prompts are in the conversation tool calls.
Original generated files were copied, not modified.

Visual inspection found the corrections above. Runtime typechecking, tests,
browser accessibility and pixel measurements were not run: no runtime code
was edited. Approval is a design gate, not evidence of functional completion.
