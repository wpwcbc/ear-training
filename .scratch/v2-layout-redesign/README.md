# V2 layout redesign tickets

The user approved this seven-ticket breakdown, its blocking edges and feature-local
Markdown publication on 2026-10-27. Each issue is a separate file with acceptance
criteria and status `ready-for-agent`. No implementation has started.

Source: [V2 layout redesign specification](../../V2_LAYOUT_REDESIGN_SPEC.md).
Design authority: [A practice/answering brief](../../jazz-ear-lab-v2/.impeccable/surfaces/v2-practice-layout.md)
and [C+B configuration brief](../../jazz-ear-lab-v2/.impeccable/surfaces/v2-config-layout.md),
including their approved desktop/mobile compositions and existing behavior contracts.
This ticket approval does not reopen the design decisions or authorize a new workflow.

## Work and dependencies

| Ticket | Deliverable | Blocked by |
| --- | --- | --- |
| [01](issues/01-single-chord-configuration.md) | M1/M2 configuration: chapters, disclosures and valid Start | None |
| [02](issues/02-progression-configuration.md) | Progression configuration: custom harmony to saved practice | None |
| [03](issues/03-m2-harmonic-board.md) | M2 Harmonic Board: listen, answer, retry and finish | None |
| [04](issues/04-m1-harmonic-board.md) | M1 Harmonic Board: target, reference and self-rating | 03 |
| [05](issues/05-progression-recognition-board.md) | Progression Recognition: complete harmonic answer board | None |
| [06](issues/06-guided-singing-board.md) | Guided Singing: visible phrase and per-position checking | 05 |
| [07](issues/07-cross-mode-journeys.md) | Integrated four-mode setup-to-evidence journeys | 01, 02, 04, 06 |

Initial frontier: **01, 02, 03, 05**. After 03, 04 becomes eligible; after 05,
06 becomes eligible. Ticket 07 waits for 01, 02, 04 and 06, which includes 03/05
transitively. `ready-for-agent` means the ticket is specified; its blockers must
still be completed before implementation begins.

Configuration and practice do not artificially block each other: the existing
preset entry/practice behavior lets each slice land independently. Ticket 04
reuses the proven single-chord board from 03; 06 reuses progression presentation
from 05. Those earlier slices preserve the other mode until it migrates.
Shared-file overlap is an implementation coordination concern, not an extra
product dependency or authorization for parallel agents.

No separate CSS foundation, speculative UI framework, wide prefactor or tests-only
prerequisite is needed. Necessary small presentation extraction happens first
inside its initial working slice. Every ticket owns its desktop/mobile, keyboard,
persistence and relevant behavior checks; 07 proves integration rather than
postponing all verification until the end.

## Tracking scope and delivery status

This is the approved repository-local tracker **for this feature only**. It does
not configure a global issue tracker, publish GitHub issues, close/modify a parent
issue, or mark any implementation complete. No application or specification was
changed while publishing these tickets.

For a future external tracker, run `/setup-matt-pocock-skills` and establish its
configuration/access before publication. These local Markdown files are the
actual ticket deliverable; a documentation PR is not an external implementation
issue or a claim that ready-for-agent labels were applied on GitHub.
