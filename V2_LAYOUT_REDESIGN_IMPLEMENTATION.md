# V2 layout redesign implementation

Completed 2026-10-27 on `feat/v2-layout-redesign`, against baseline
`c3296fe442844853b99db2d2a9f2a6631daaadc3`.

The four modes now use the approved A harmonic practice boards and C+B
configuration compositions. Signal Route typography, colors and controls remain.
No domain model, audio engine, storage schema, Legacy application code or parent
specification changed. Results and Insights retain their existing presentation.

Authority: [specification](V2_LAYOUT_REDESIGN_SPEC.md),
[A practice brief](jazz-ear-lab-v2/.impeccable/surfaces/v2-practice-layout.md),
[C+B configuration brief](jazz-ear-lab-v2/.impeccable/surfaces/v2-config-layout.md)
and [approved local tickets](.scratch/v2-layout-redesign/README.md).

## Delivered acceptance

| Ticket | Delivery | Verification |
| --- | --- | --- |
| 01 | M1/M2 Harmony, Target degrees, Practice and Sound; summary-bearing native disclosures; desktop editor/summary and mobile Start/status | Draft/focus/disclosure retention, independent pools, invalid Start/recovery, save failure/retry, audition without records, preset isolation and custom mode identity |
| 02 | Both progression modes use the same chapter structure, contextual chord editor and mode-supported controls | Templates/custom/repeated chords, exact invalid-field recovery, persisted mix, range fixtures, final field above attached Start |
| 03 | Centered, bounded M2 chord/response board and compact task band | Full legal answers, initial listen, retry, Reveal, replay, automatic/manual transitions and first-answer evidence regressions |
| 04 | M1 chord and requested degree precede Done and equal-weight self-rating | Existing reference/rating order, grading, Auto Advance, interruption and lifecycle regressions |
| 05 | Recognition chord columns on desktop, stacked chord groups on mobile, checked degrees at their original positions | Arbitrary/partial answering, retained replay, joint check, first grades, save recovery and note-grain Overall |
| 06 | Guided Singing targets and ratings share each chord group | All targets visible before reference, full/partial Correct/Incorrect/Unknown, unassessed counts and first-rating preservation |
| 07 | Combined configuration-to-practice journeys and acceptance evidence | Desktop/mobile, keyboard controls, storage failures, Results/Overall, Legacy entry, source build and independent reviews |

Configuration keeps each edited preset isolated. Invalid drafts remain editable;
Start is disabled and correction routes open/focus the affected chapter/group/field.
Valid unsaved drafts retain existing practice-entry policy, with explicit save
status/retry. Selected conditions remain visible in closed summaries. The small
shared `configuration.ts` helper owns native disclosure/summary presentation;
existing controllers continue to own persistence and exercise behavior.

Practice retains lifecycle ownership, frozen session settings, original audio
scheduling, replay attribution and first-answer/self-rating evidence. Progression
speed remains excluded from Overall timing. Visible interruption/save alerts and
Retry saving survive board assembly. Custom single-chord preset headings include
the actual M1/M2 mode.

## Verification

Passed in local Chromium using the running server at `127.0.0.1:4173`:

- `npm test`: TypeScript build and all 16 test-file subtests passed, zero failures.
- Both `test:v2:layout` scripts passed. The final expanded
  `browser-v2-layout-state.mjs` run also passed after review fixes: custom preset
  identity, visible practice save failure/retry, retained grades and interruption.
- Layout fixtures cover all four modes at 1440, 390 and 320px. Progression typical
  3×2 boards and both modes at minimum 2×1 and maximum 32×4 were exercised,
  including repeated/altered chord symbols. Additional config checks passed at
  700/701/768px and 200% CSS zoom, with no horizontal overflow. The final chord
  field remains above the attached Start control when focused.
- Affected browser regressions passed: progression, M1 grading, target/mix,
  Auto Advance, Reveal, lifecycle and V2 critique fixes. They exercise reference,
  replay, partial assessment, save recovery and first-evidence behavior.
- `browser-entry.mjs` passed desktop/mobile V2 entry and Legacy reachability with
  all seven modes and its history entry. This is an entry smoke check, not a full
  Legacy recertification.

Cloud runner example (Playwright/Chromium are provided by this environment):

```sh
PLAYWRIGHT_MODULE=/tmp/eartrain-playwright-chromium.mjs npm run test:v2:layout
```

The temporary adapter redirects historical `channel: msedge` requests to
`/usr/bin/chromium`; it is environment setup, not an application dependency.
The new layout scripts also accept `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

The historical aggregate `npm run test:v2` is **not claimed green**. Baseline
failures reproduced on untouched main include the general browser suite's
configure-render race, homepage's obsolete two-exercise expectation and Split
Desk's 70% versus 71% assertion/old composition assumptions. See the existing
[V2 critique verification history](V2_CRITIQUE_FIXES.md). Affected chapter labels
and relocated controls were adapted without weakening musical/evidence checks.

## Runtime visual evidence

[Capture directory](.impeccable/review/v2-layout-redesign/) contains representative
1440px desktop and 320px narrow-screen config, invalid config, practice and rated
states from the final confirmation capture batch. The browser exercised 390px
as well. These are actual local runtime screenshots using isolated synthetic
fixtures, not personal practice data or generated design mockups.

| Surface | Desktop | Narrow mobile |
| --- | --- | --- |
| Single-chord Harmony | [1440](.impeccable/review/v2-layout-redesign/single-config-harmony-1440.png) | [320](.impeccable/review/v2-layout-redesign/single-config-harmony-320.png) |
| Single-chord Sound | [1440](.impeccable/review/v2-layout-redesign/single-config-sound-1440.png) | [320](.impeccable/review/v2-layout-redesign/single-config-sound-320.png) |
| Progression Harmony | [1440](.impeccable/review/v2-layout-redesign/progression-config-harmony-1440.png) | [320](.impeccable/review/v2-layout-redesign/progression-config-harmony-320.png) |
| Progression invalid | [1440](.impeccable/review/v2-layout-redesign/progression-config-invalid-1440.png) | [320](.impeccable/review/v2-layout-redesign/progression-config-invalid-320.png) |
| M1 | [1440](.impeccable/review/v2-layout-redesign/m1-practice-1440.png) | [320](.impeccable/review/v2-layout-redesign/m1-practice-320.png) |
| M2 | [1440](.impeccable/review/v2-layout-redesign/m2-practice-1440.png) | [320](.impeccable/review/v2-layout-redesign/m2-practice-320.png) |
| Recognition | [1440](.impeccable/review/v2-layout-redesign/recognition-practice-1440.png) | [320](.impeccable/review/v2-layout-redesign/recognition-practice-320.png) |
| Guided Singing | [1440](.impeccable/review/v2-layout-redesign/singing-practice-1440.png) | [320](.impeccable/review/v2-layout-redesign/singing-practice-320.png) |
| Singing rated | [1440](.impeccable/review/v2-layout-redesign/singing-rated-1440.png) | [320](.impeccable/review/v2-layout-redesign/singing-rated-320.png) |

One initial visual inspection and one confirmation batch were used. The
confirmation removed excess mobile summary/blank space. Later review fixes
changed error/custom-name states; those have functional browser verification.
A full-page capture can place a viewport-fixed Start strip midway through its
image; reachability was checked separately by focused-field geometry.

## Standards

Independent Standards review compared `git diff c3296fe...HEAD` at `6328657`,
then checked the corrective `97a5751` commit. It found one P1: board assembly
removed the visible alert/Retry saving even though the announcer retained its
message. The reviewer confirmed that retaining these nodes restores storage and
interruption recovery, generated JavaScript agrees, and public-UI tests cover
both failures. No material regression was identified.

Two nonblocking heuristic observations remain: duplicated invalid-group
decoration across controllers (possible Duplicated Code), and progression's
presentation organizer depending on control text/order (possible Shotgun Surgery).
These are maintenance opportunities, not documented-standard violations or
acceptance blockers. No broad controller refactor was added to this layout task.

## Spec

Independent Spec review used the same baseline and approved layout spec. It
found the same P1 and a P2: a renamed/custom single-chord preset obscured its
actual M1/M2 mode. Both were corrected at `97a5751`. The reviewer confirmed
visible recovery, explicit custom-preset mode, no duplicated canonical name,
matching generated JavaScript and regression coverage. No material regression
was identified in follow-up source/test review.

Review totals: Standards initially 1 blocking finding plus 2 nonblocking
heuristics; 0 blocking findings remain. Spec initially 2 findings; both resolved,
0 remain. Follow-up reviewers did not run additional browser capture rounds.

## Limits and delivery

Physical listening quality, Safari/iOS behavior and screen-reader operation
still require real-device/human checks. CSS zoom checks are not a complete
browser-zoom accessibility audit. Impeccable's optional detector helpers were
unavailable; no detector gate or accessibility certification is claimed.
Automated synthetic flows do not demonstrate learning effectiveness.

Implementation commits: `6328657` (boards/configuration), `97a5751` (review
corrections), followed by the acceptance/evidence documentation commit containing
this report. Publication to GitHub and deployment status must be reported
separately; local acceptance does not imply a deployed site.
