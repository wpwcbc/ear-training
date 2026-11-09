# Progression keys and Play by Ear — tickets

Status: all six approved repository-local tickets are **done** (2026-10-29,
Asia/Hong_Kong). The user confirmed the breakdown and then invoked implement.
See [delivery, acceptance and independent review](../../V2_KEYS_AND_PLAY_BY_EAR_IMPLEMENTATION.md).
The parent specification remains unchanged; implementation does not imply deployment.

Source: [V2 Progression Keys and Play by Ear specification](../../V2_KEYS_AND_PLAY_BY_EAR_SPEC.md).
Vocabulary: [feature glossary](../../CONTEXT.md) and [general glossary](../../GLOSSARY.md).
The existing [local specification entry](spec.md) retains its specification-only
ready-for-agent status; implementation readiness is tracked by the separate tickets below.

## Approved slices

| Ticket | Demoable delivery | Blocked by |
| --- | --- | --- |
| [01](issues/01-fixed-progression-keys.md) | Configure a fixed key, practise transposed harmony and review it while C-source inputs stay unchanged | None |
| [02](issues/02-random-key-pool.md) | Select Random/All, practise shuffled key coverage and replay the original drawn question | 01 |
| [03](issues/03-single-chord-play-by-ear.md) | Single-chord listen → automatic count-in/backing → Done/reference → self-assessment → saved individual Results/delay | None |
| [04](issues/04-progression-play-by-ear.md) | Full fixed/random-key Play by Ear phrase, arbitrary error positions, joint self-assessment and saved phrase Results/delay | 02, 03 |
| [05](issues/05-instrumental-insights.md) | Module-specific correct-question delay summaries, note-grain Overall accuracy and unchanged old response-time metrics | 04 |
| [06](issues/06-integrated-history-journeys.md) | Unified matching history/frozen replay and complete saved/recovered six-mode journeys | 05 |

The approved initial frontier was **01 and 03**, followed by02 once01 completed,
04 after02/03, then05 and06. All six are now complete. These edges describe
prerequisites, not an instruction to spawn implementation agents in parallel.

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

Each ticket owns a narrow complete user behavior through presentation, supported
configuration/storage changes, generation/audio or evidence as applicable, and
verification at the approved user/public-interface seams. 03 and 04 include their
own save/replay/interruption handling and direct Results. 05 adds aggregate
reporting; 06 adds unified cross-mode history/recovery and proves integration.

Necessary small prefactors happen first inside 01 and 03, immediately exercised by
their working slice. No separate unused schema/audio/framework foundation, broad
mechanical refactor, speculative extend-contract migration or tests-only
prerequisite is proposed. Every slice owns desktop/mobile, keyboard and relevant
failure checks; final integration is not a substitute for them.

Across these tickets, all 64 stories and all 16 acceptance examples are assigned,
including the approved defaults. Shared-file overlap is a coordination concern,
not a reason for extra blockers. Original ticket publication changed no application
or parent specification; subsequent implementation is recorded in the delivery report.

## Approval and publication boundary

The user confirmed the six-ticket proposal without merges, splits or edge changes.
Each approved ticket is published as one file in the feature-local issues collection,
originally with ready-for-agent status and textual blocking edges, following this repository's
existing Markdown convention. A blocked ticket becomes eligible only after all its
blockers are done; ready-for-agent is not a claim that its blockers are complete.
Global tracker/triage setup is still absent; formal GitHub issue publication requires
`/setup-matt-pocock-skills` configuration/access. No GitHub issue, native blocking
relationship, applied remote label or parent closure is claimed here.
