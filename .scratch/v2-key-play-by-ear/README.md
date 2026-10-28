# Progression keys and Play by Ear — proposed ticket breakdown

Status: six concrete drafts, awaiting approval of granularity/blocking edges.
This proposal is not a published implementation-ticket set and is not authorization
to execute the engineering workflows. The parent specification remains unchanged.

Source: [V2 Progression Keys and Play by Ear specification](../../V2_KEYS_AND_PLAY_BY_EAR_SPEC.md).
Vocabulary: [feature glossary](../../CONTEXT.md) and [general glossary](../../GLOSSARY.md).
The existing [local specification entry](spec.md) retains its specification-only
ready-for-agent status; that is not approval of the ticket breakdown.

## Proposed slices

| Draft | Demoable delivery | Blocked by |
| --- | --- | --- |
| [01](ticket-drafts/01-fixed-progression-keys.md) | Configure a fixed key, practise transposed harmony and review it while C-source inputs stay unchanged | None |
| [02](ticket-drafts/02-random-key-pool.md) | Select Random/All, practise shuffled key coverage and replay the original drawn question | 01 |
| [03](ticket-drafts/03-single-chord-play-by-ear.md) | Single-chord listen → automatic count-in/backing → Done/reference → self-assessment → saved individual Results/delay | None |
| [04](ticket-drafts/04-progression-play-by-ear.md) | Full fixed/random-key Play by Ear phrase, arbitrary error positions, joint self-assessment and saved phrase Results/delay | 02, 03 |
| [05](ticket-drafts/05-instrumental-insights.md) | Module-specific correct-question delay summaries, note-grain Overall accuracy and unchanged old response-time metrics | 04 |
| [06](ticket-drafts/06-integrated-history-journeys.md) | Unified matching history/frozen replay and complete saved/recovered six-mode journeys | 05 |

Initial frontier: **01 and 03**. After 01, 02 is available. After 02 and 03,
04 is available; then 05 and 06. These are dependencies, not an instruction to
spawn implementation agents in parallel.

## Why these blocking edges

- 02 requires the source/sounding-harmony and fixed-key ownership path established
  by 01; it adds actual Random configuration and per-question draw behavior.
- 03 is independent of progression keys: it uses the existing single-chord root
  pool and proves the complete Play by Ear phase/timing/self-assessment contract.
- 04 requires the completed Fixed/Random progression key contract from 02 and the
  live Play by Ear lifecycle from 03. It must not introduce a separate, divergent
  imitation/clock workflow for the progression variant.
- 05 requires both kinds of saved instrumental evidence from 04/its 03 blocker.
  03 is therefore not listed again as a redundant direct dependency.
- 06 requires the complete module/Overall evidence journey from 05. The earlier
  slices are transitively required; their own acceptance is not postponed here.

## Scope and sizing

Each draft owns a narrow complete user behavior through presentation, supported
configuration/storage changes, generation/audio or evidence as applicable, and
verification at the approved user/public-interface seams. 03 and 04 include their
own save/replay/interruption handling and direct Results. 05 adds aggregate
reporting; 06 adds unified cross-mode history/recovery and proves integration.

Necessary small prefactors happen first inside 01 and 03, immediately exercised by
their working slice. No separate unused schema/audio/framework foundation, broad
mechanical refactor, speculative extend-contract migration or tests-only
prerequisite is proposed. Every slice owns desktop/mobile, keyboard and relevant
failure checks; final integration is not a substitute for them.

Across these drafts, all 64 stories and all 16 acceptance examples are assigned,
including the approved defaults. Shared-file overlap is a coordination concern,
not a reason for extra blockers. No application or parent-spec changes are made.

## Approval and publication boundary

The invoked to-tickets skill explicitly says: "Iterate until the user approves
the breakdown." This is one approval of the concrete work split, not a reopening
of musical requirements or routine engineering defaults. The user can approve
as-is or request merged/smaller slices before actual ticket publication.

On approval, use one approved ticket per file in the feature-local issues
collection, with ready-for-agent status and textual blocking edges, following
this repository's existing Markdown convention. Global tracker/triage setup is
still absent; formal GitHub issue publication requires
`/setup-matt-pocock-skills` configuration/access. No GitHub issue, native blocking
relationship, applied remote label or parent closure is claimed here.
