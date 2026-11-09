# V2 Progression Keys and Play by Ear — implementation

Completed 2026-10-29 (Asia/Hong_Kong), on `feat/v2-layout-redesign`.
Review baseline: `d4593774ff2b4f431baa0cff18cbcbf109360300`.

The approved [specification](V2_KEYS_AND_PLAY_BY_EAR_SPEC.md) and
[six local tickets](.scratch/v2-key-play-by-ear/README.md) are implemented.
This extends the existing V2 model/controller, public audio scheduling and
reporting seams; no new dependencies, synthesis engine or Legacy code changes.

## Delivered behavior

| Ticket | End-to-end delivery |
| --- | --- |
| 01 | Progression C-source remains unchanged while Fixed key derives actual practice harmony; zero-offset legacy symbols remain literal. |
| 02 | Random/All pool, empty/singleton validation, per-question shuffled coverage, no multi-key cycle-boundary repeat and stable question replay. |
| 03 | Single Chord · Play by Ear: root/quality pools, automatic demonstration/count-in/four-beat backing, hidden target, Done/reference, explicit self-assessment and saved individual delay/outcome. |
| 04 | Progression · Play by Ear: fixed/random actual key, whole phrase, configurable durations/targets, one harmonic board and explicit mixed-position joint self-assessment. |
| 05 | Instrumental/self-assessed module evidence, note-grain Overall accuracy and comparable all-correct whole-question delay summaries; existing Overall response time unchanged. |
| 06 | Frozen history/reference, matching-session reload, save retry, audio/background recovery, six-mode navigation and integration/regression acceptance. |

C-source transposition is a reference offset, not tonic detection. Minor, borrowed,
altered and repeated chords keep their qualities, durations and ordered positions.
Fixed C preserves legacy input spelling and sound; Random covers eligible pitch
classes once per shuffled cycle. A new question consumes a draw; replay does not.

The two Play by Ear modes share the existing progression controller's automatic
performance path, storage/focus effects and board adapter. Single-chord selection
uses the existing balanced single-chord generator behind that path. Its root pool
is separate from progression destination keys. Existing Degree Audiation and Degree
Recognition remain distinct, with their original grading and completion policies.

Natural backing completion establishes a monotonic interval origin; first Done
freezes the additional delay before reference/self-assessment. The implementation
uses the audio completion/position boundary rather than a nominal UI timer.
One phrase contributes at most one delay sample; no delay is copied into note-level
response-time fields. Instrumental note evidence is explicitly played/self-assessed.

All correct or Remaining notes correct and submit explicitly commits one first
outcome per position. Error checkboxes and optional wrong-degree/Unknown selections
are drafts until submission. Stop before commit leaves the positions unassessed.
Replay assistance and pre-Done audio interruption exclude normal unassisted timing.
Storage failure is separate: healthy backing plus quota failure retains its valid
interval and can become an eligible sample after Retry saving. Reference recovery
after Done cannot rewrite that frozen interval.

## Verification

Passed in local Chromium with synthetic isolated browser storage:

- `npm test`: TypeScript build and all **17 test-file subtests**, zero failures.
- `test:v2:keys-play`: source/fixed/random/All UI, both automatic instrumental
  cycles, 4/6 mixed self-ratings, combined Overall5/7, excluded incorrect timing,
  frozen matching history/reload, whole-cycle assisted replay, waiting-phase
  background interruption/recovery, visible quota/retry, draft-versus-grade
  boundaries and minimum2×1/full-cycle through maximum32×4 altered/repeated progression at320px.
- New public-model tests establish C-source versus Eb sounding harmony, shuffled
  key coverage and singleton/empty pools, Done gating and a literal2400ms frozen
  interval, immutable explicit first outcomes, three eligible phrase samples
  (1/3/5 seconds → median3 seconds, n=3), literal zero-offset Dbmaj7/C spelling,
  and standalone random generation constrained to its eligible pool.
- Review regressions reproduced failures before fixes: non-placeholder m7 pool
  recovery originally routed to Sound; quota during healthy backing originally
  excluded the attempt from n=1 timing; zero-offset chord spelling was canonicalized.
  All now pass. Omitted wrong-degree detail remains Unknown; no specific confusion
  pair is invented for Unknown.
- Existing browser suites passed: progression recognition/audiation, V2 critique
  (keyboard/history/reference), layout and configuration state, M1 grading,
  Auto Advance, lifecycle/interruption, target/mix and Legacy entry. Legacy entry
  verifies all seven existing modes and its history route; it is not a full
  recertification of every Legacy interaction.

The existing entry test still used earlier M1/M2 names; its selectors now use the
already-shipped canonical names. The progression history test was adapted to the
shared Past sessions disclosure and readable canonical session labels. Neither
change relaxes grading, audio, evidence or denominator assertions. The public
progression adapter test now checks the actual sounding/source snapshots rather
than requiring the old config JSON shape without additive key metadata.

Historical aggregate V2 browser baseline failures (including old homepage count,
configure-render assumptions and Split Desk composition/percentage assertions)
remain documented in earlier implementation reports. The aggregate `test:v2` is
**not claimed green**. Only the named checks above are claimed passing.

Cloud runner: Chromium is `/usr/bin/chromium`; the new scripts accept the normal
Playwright module override and Chromium executable override. The environment's
Playwright module was used directly; a temporary adapter redirected historical
msedge-channel test requests to installed Chromium. It is not an app dependency.

## Visual evidence

[Runtime capture directory](.impeccable/review/v2-keys-play-by-ear/README.md)
contains1440px desktop and320px mobile representatives from the single final
confirmation batch;390px was also checked. One initial inspection led to one
batch of key-grid/stale-error fixes, then one confirmation. No new comps or
open-ended cosmetic loop were used.

| Surface | Desktop | Mobile |
| --- | --- | --- |
| Fixed key | [1440](.impeccable/review/v2-keys-play-by-ear/fixed-key-config-1440.png) | [320](.impeccable/review/v2-keys-play-by-ear/fixed-key-config-320.png) |
| Random/All | [1440](.impeccable/review/v2-keys-play-by-ear/random-key-config-1440.png) | [320](.impeccable/review/v2-keys-play-by-ear/random-key-config-320.png) |
| Invalid pool | [1440](.impeccable/review/v2-keys-play-by-ear/empty-key-pool-1440.png) | [320](.impeccable/review/v2-keys-play-by-ear/empty-key-pool-320.png) |
| Single performance/check | [performance](.impeccable/review/v2-keys-play-by-ear/single-performance-1440.png) | [check](.impeccable/review/v2-keys-play-by-ear/single-check-320.png) |
| Progression performance/check | [performance](.impeccable/review/v2-keys-play-by-ear/progression-performance-1440.png) | [check](.impeccable/review/v2-keys-play-by-ear/progression-check-320.png) |
| Results | [1440](.impeccable/review/v2-keys-play-by-ear/progression-results-1440.png) | [320](.impeccable/review/v2-keys-play-by-ear/progression-results-320.png) |
| Module Insights | [1440](.impeccable/review/v2-keys-play-by-ear/play-insights-1440.png) | [320](.impeccable/review/v2-keys-play-by-ear/play-insights-320.png) |

Full-page captures may composite the attached config action strip midway through
an image. Reachability was checked separately by focused-final-field geometry,
not inferred from a full-page compositor artifact. Existing layout-state checks
also cover700/701/768px boundaries and200% config CSS zoom. The captures are actual
synthetic runtime UI, not personal practice or machine-verified performance data.

## Standards

Independent Standards review compared `git diff d459377...HEAD` through `77aa2f5`.
It reported two P2 correctness/contract findings:

1. Single-chord pool errors used the placeholder chord instead of selected
   qualities, routing non-placeholder empty pools to Sound rather than Target degrees.
2. Healthy audio completion followed by a storage exception entered the audio
   interruption catch, incorrectly excluding valid unassisted timing.

Both were corrected at `972e8e6`; the reviewer confirmed selected-quality recovery,
separate persistence handling, matching generated JavaScript and the new UI
regressions, with no material regression in follow-up source/test review.

One nonblocking **possible Duplicated Code** judgment remains: chord-group board
construction repeats the fieldset/legend/note-grid shape across existing and new
practice rendering. A small future presentation extraction could reduce divergence;
no framework or broad controller refactor was added to this feature for that reason.

Standards total:2 initial P2 findings, both resolved;0 outstanding correctness/
blocking findings,1 nonblocking heuristic. No extra browser/cosmetic review loop.

## Spec

Independent Spec review used the same baseline and the full approved spec/tickets.
It reported three P2 findings: the same incorrect pool-recovery route and storage/
interruption classification, plus zero-offset generation rewriting Dbmaj7/C into
canonical C#maj7/Cmaj despite the legacy literal-spelling contract.

All three were corrected at `972e8e6`. The reviewer confirmed the corresponding
public-model and UI regressions, eligible-key guard and no material regression
in the corrective source/test diff. No scope creep was identified.

Spec total:3 initial P2 findings, all resolved;0 outstanding. Source/test follow-up
only; no additional browser capture round was performed by the reviewer.

## Delivery and limits

Implementation commits: `853e420` (keys), `7d62b7e` (shared Play by Ear),
`77aa2f5` (instrumental evidence), `972e8e6` (review/regression corrections).
The following completion/documentation commit contains this report and local
ready-for-agent→done ticket updates. The source specification remains unchanged. Remote main was fetched; it adds
only merges of the preceding layout/naming/typeset delivery, with no conflicting
application edits against this work.

No microphone/MIDI capture, exact-octave or rhythm grading, new dependencies,
Legacy code changes, old-record rewriting, global tracker configuration or new
per-note latency were introduced. Existing records are preserved; unknown new
historical timing remains unavailable rather than zero.

Physical listening quality, real instrument playing, Safari/iOS and human
screen-reader checks remain separate. Automation verifies defined scheduling,
interaction and evidence behavior, not learning effectiveness or measured motor
fluency. Impeccable's optional launcher/detector was unavailable in this environment;
no detector gate or accessibility certification is claimed. Remote branch/PR and
deployment outcomes must be reported separately; local acceptance is not a claim
that the live site has been deployed.
