# V2 progression mode tickets

The user approved this eight-ticket breakdown and repository-local Markdown
tracking on 2026-10-26. Each issue has its own file with acceptance criteria and
explicit blocking edges. This does not configure the repository's global issue
tracker, create GitHub issues, approve compositions or start implementation.

Source: [V2 progression specification](../../V2_PROGRESSION_MODES_SPEC.md),
including its user-confirmed testing seams. Product design Q1–Q18 is settled;
keep implementation and visual review within that scope.

| Ticket | Deliverable | Blocked by |
| --- | --- | --- |
| [01](issues/01-desktop-mobile-compositions.md) | Reviewed desktop/mobile compositions | None |
| [02](issues/02-recognition-end-to-end.md) | Recognition minimal complete flow | 01 |
| [03](issues/03-progression-editor-multiple-targets.md) | Custom progression and multi-note practice | 02 |
| [04](issues/04-guided-singing.md) | Guided Singing complete flow | 03 |
| [05](issues/05-mix-session-results.md) | Mix, sessions and historical Results | 03, 04 |
| [06](issues/06-overall-note-accuracy.md) | Module/Overall note accuracy | 04 |
| [07](issues/07-replay-assistance.md) | Assistance and review attribution | 06 |
| [08](issues/08-integration-regressions.md) | Integration and regression acceptance | 05, 07 |

All issues use the agreed template status `ready-for-agent`; blocking edges still
apply. The initial frontier is 01 only. After 04, 05 and 06 may proceed in parallel.
Every implementation ticket owns its own checks; 08 covers integration rather
than deferring all testing until the end. Do not close or modify a parent issue.

For GitHub/another external tracker later, run `/setup-matt-pocock-skills` and
establish working API access before publication. These local files are the current
ticket deliverable, not evidence of external issue creation.

## Delivery

All eight tickets are implemented, reviewed and marked done. See [implementation evidence](../../V2_PROGRESSION_MODES_IMPLEMENTATION.md) for actual checks and remaining manual verification. Earlier frontier notes above describe the approved implementation order, not remaining blockers.
