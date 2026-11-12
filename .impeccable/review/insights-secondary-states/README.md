# Insights secondary disclosures and data states (#39)

The left side of each pair is the approved reference pinned at `b35aefb`; the right side is the browser capture. Images are compared at their original pixel dimensions, without scaling or masks. Only synthetic practice records were used. The original crops were not modified.

| Region | Native size | Comparison | Browser measurement and remaining differences |
| --- | --- | --- | --- |
| Closed disclosures, desktop | 1084 × 956 | [Pair](overview-desktop-pair.png) · [Overlay](overview-desktop-overlay.png) · [Difference](overview-desktop-difference.png) | Starts at x26/y851; width 1037. Text, borders and chevrons use the app's rendered font and strokes. |
| Closed disclosures, mobile | 379 × 956 | [Pair](overview-mobile-pair.png) · [Overlay](overview-mobile-overlay.png) · [Difference](overview-mobile-difference.png) | Starts at x21/y876.5; width 340. Both rows are closed and retain the approved words and order. |
| No records | 470 × 374 | [Pair](no-records-pair.png) · [Overlay](no-records-overlay.png) · [Difference](no-records-difference.png) | Action x91/y301 vs x91/y302. Document icon shape and weight differ. |
| Empty period | 470 × 374 | [Pair](empty-period-pair.png) · [Overlay](empty-period-overlay.png) · [Difference](empty-period-difference.png) | Action x81/y301 vs the reference at about x86/y300. Calendar icon uses round rather than square marks. |
| Unassessed | 471 × 375 | [Pair](unassessed-pair.png) · [Overlay](unassessed-overlay.png) · [Difference](unassessed-difference.png) | The approved factual copy replaces the generated regrading implication. The lower rule is around 5px higher and footer text is slightly narrower. |
| Limited sample | 470 × 453 | [Pair](limited-pair.png) · [Overlay](limited-overlay.png) · [Difference](limited-difference.png) | Rule y276 and action x91/y389 vs y275 and x91/y387. Badge width and line wrapping vary with type. |
| All correct | 470 × 453 | [Pair](all-correct-pair.png) · [Overlay](all-correct-overlay.png) · [Difference](all-correct-difference.png) | Rule y289 vs y292. The action starts at x81/y380 vs about x79/y382. |
| Unknown direction | 471 × 452 | [Pair](unknown-direction-pair.png) · [Overlay](unknown-direction-overlay.png) · [Difference](unknown-direction-difference.png) | Rule y289 vs y288. The explanation and action remain adjacent; their glyphs and baseline are not pixel-identical. |

The state panels retain the flat app background and Legacy navigation, both documented corrections. Source Sans 3, the native select arrow, the navigation underline, and Lucide symbols leave visible differences from the generated reference. The close-state row heights (42px desktop, 31px mobile including rules) intentionally follow this approved composition, not the older general 48px disclosure guideline. Both disclosures support keyboard activation. No new Settings route or extra default explanatory copy was added.

## Actions and retained details

- No records leads to Practice; an empty period widens the current selection to All time. The existing no-match messages are kept for an exercise or filter with no matching history. Plurals outside the illustrated counts use normal singular/plural inflection; they are not separately approved copy.
- Unassessed opens read-only Sessions. Limited and unknown open matching recorded notes only. All-correct focuses the heatmap. Assessment, timing, aggregation, practice generation and historical records are unchanged.
- [Expanded desktop](expanded-1084.png) and [expanded mobile](expanded-379.png) are diagnostic captures. No separate approved reference exists for these expanded contents. Timing exclusions, matched changes, filters, setup, source conditions and exact session links are reachable here without duplicating the overview.
- `tests/browser-v2-insights-secondary.mjs` checks keyboard disclosure, timing grain, filters, nested provenance, and return focus. `tests/browser-v2-insights-states.mjs` checks exact native example copy, all six actions, keyboard and touch, 320/390/1440px widths, and unchanged record bytes. With `INSIGHTS_STATE_ARTIFACTS` set it also captures the images and, when configured, runs the WCAG A/AA axe checks.

This is visual evidence for review, not a claim of pixel identity or approval. #39 remains open for review; #40 is the integrated acceptance pass.
