# Actionable V2 Insights — approved tickets

Status: all eight approved repository-local tickets **done**.
Approved, published and implemented 2026-10-29, Asia/Hong_Kong.
See [delivery, actual captures, testing and independent review](../../V2_ACTIONABLE_INSIGHTS_IMPLEMENTATION.md). Merge/deployment are separate.

Source: [specification](../../V2_ACTIONABLE_INSIGHTS_SPEC.md).
Design: [information architecture](../../V2_INSIGHTS_INFORMATION_DESIGN.md).
Detailed rationale and coverage: [approved breakdown](ticket-proposal.md).
[Local specification entry](spec.md) records specification readiness separately;
it does not claim that these implementation tickets are done.

## Approved delivery order

| Ticket | Demoable delivery | Blocked by | Status |
|---|---|---|---|
| [01](issues/01-recent-performance-periods.md) | Recent-performance overview and period scope | None (can start immediately) | done |
| [02](issues/02-practice-key-root-analysis.md) | Actual practice-key and single-chord root analysis | 01 — Recent-performance overview and period scope | done |
| [03](issues/03-chord-degree-drilldown.md) | Chord and degree drill-down with contextual confusions | 01 — Recent-performance overview and period scope | done |
| [04](issues/04-priorities-coverage.md) | Evidence-based priorities and coverage gaps | 02 — Practice-key/root analysis; 03 — Chord/degree drill-down | done |
| [05](issues/05-practice-preview-return.md) | Faithful practice-configuration preview and return | 04 — Evidence-based priorities and coverage gaps | done |
| [06](issues/06-comparable-trends.md) | Comparable-condition key analysis and period trends | 02 — Practice-key/root analysis | done |
| [07](issues/07-completion-efficiency.md) | Grain-correct completion efficiency and assistance | 02 — Practice-key/root analysis; 03 — Chord/degree drill-down | done |
| [08](issues/08-evidence-history-journeys.md) | Complete evidence explorer and faithful history journeys | 05 — Configuration preview; 06 — Comparable trends; 07 — Efficiency | done |

The approved initial eligible frontier was **01 only**. It unlocked 02/03,
then 06 after 02, 04/07 after 02/03, 05 after 04, and 08 after 05/06/07.
All are now complete. These edges record prerequisites, not an instruction to
spawn implementation agents. Separate Standards/Spec review ran under the invoked
code-review skill after implementation.

## Shared delivery and verification

- Each ticket is an end-to-end user-visible slice with its own acceptance checks,
  not an isolated schema, analytics or UI layer. Necessary small shared prefactors
  happen first within 01 and are immediately exercised by its rendered results.
- Follow the user-confirmed browser-first test seam: overview → family/context and
  period → musical dimensions → practice preview/return → matching history/reload.
  Public model/progression checks cover calculations the UI cannot reliably expose.
- Every slice owns its relevant desktop/mobile, keyboard, storage and old-record
  behaviour. Ticket 08 delivers full evidence/history UI and integrated journeys;
  it is not permission to defer the earlier tickets' verification.
- Maintain shared analysis-selection/context contracts so 02 and 03 integrate even
  though they are sibling slices. Shared files are a coordination concern, not an
  invented dependency. 06 is independent of priorities, and 07 needs no weighted
  trend implementation.
- The specification's 28-day default, conservative sample thresholds, weights,
  tie-breaks and grain boundaries are fixed first-version requirements. Presentation
  thresholds are not statistical significance or mastery criteria.
- Preserve audio, question sampling, first grading, Legacy, source presets and all
  historical records. No hidden tag inference, source-preset overwrite, duplicate
  note/delay attribution, invented per-chord speed or external analytics service.
- Cover all 76 stories and 17 acceptance examples as assigned by the approved
  breakdown. Adapt obsolete UI selectors without discarding behavioural assertions.

## Publication boundary

The user confirmed the proposed eight slices without merges, splits or blocking-edge
changes. Each was published as a separate ready-for-agent issue with textual blockers.
The later implement invocation authorized runtime delivery; ticket acceptance is
now checked and status is done. Parent spec and source design remain unchanged.

This is the established feature-local tracker convention only. Global tracker and
triage setup remain absent; external publication requires `/setup-matt-pocock-skills`
configuration/access. No remote issue, GitHub triage label, native blocking link,
parent closure, deployment or global tracker configuration is claimed.
