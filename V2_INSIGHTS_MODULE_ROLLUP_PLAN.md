# Insights: V2 Module Totals and Overall Categories

Status: Reporting direction and all four information categories confirmed by
the user on 2026-10-25. Categories 1 and 2 are primary; 3 and 4 are secondary.
The user confirmed the consolidated targets/mix/Insights design on the same
date, amending only accompaniment voice gain to 0-200%. The Insights decisions
are unchanged. This record is not a claim of runtime implementation.

This replaces the earlier proposal to keep self-rated and automatically graded
outcomes out of a shared total. The user explicitly wants totals and trusts
self-assessment as a valid result, not a lower-weight or excluded substitute.

## Confirmed Scope and Hierarchy

- Only V2 records contribute. Currently this means M1 and M2. Legacy M1-M7,
  earlier trainers and drone activity are outside this integration.
- Overall organizes results by useful information categories and actually
  combines contributing modules' data, not merely separate module panels.
- Each module has its own integrated view and relevant subgroup details.
- Keep visible grouping minimal. Context, pools, mix, exposure and recording
  versions are metadata, not automatic top-level partitions of these totals.
- Each newly added V2 module must trigger a fresh review of useful categories
  and possible contributions. Do not freeze the category inventory around M1/M2
  or automatically put every future module into every existing chart.
- No new module or Release 2 implementation is approved by this discussion.

## Confirmed Assessment and Method Policy

M1 self-ratings and M2 selected-answer results are both valid assessed outcomes.
Include them equally in relevant cross-module totals. Do not reject, downweight
or forcibly separate a result simply because it came from self-assessment.

For M1 Insights, map existing reporting methods into two production categories:

| Stored M1 method | Reporting category |
| --- | --- |
| imagined | Imagined / sung |
| sung | Imagined / sung |
| played | Instrumental playing |

M1's default integrated view includes both categories. An All view is a total,
not a third production category. M2 does not require singing or playing, so do
not add these categories, an artificial Unknown method group, or a mandatory
method selector to M2.

This is an Insights mapping, not authorization to rewrite stored methods or
change practice's response-method controls. If a V2 record lacks method detail,
keep its valid grade in the M1 total without guessing its subgroup membership.
Source and method metadata remain available for traceability, not an obstacle
to aggregation. Do not relabel a stored self-rating as microphone verification.

## Current Data Actually Available

Reviewed [V2 assessment fields and metrics](src/v2/model.ts) and
[response/replay recording](src/v2/question.ts). This is a code-capability audit,
not analysis of the user's personal browser records or measured performance.

| Field or evidence | M1 | M2 | Possible shared use |
| --- | --- | --- | --- |
| Target chord root, quality, degree and MIDI | Recorded | Recorded | Chord-degree/target-relative interval breakdowns and coverage. |
| First correctness | Binary self-rating | Binary selection result | Equal-weight assessed result totals. |
| Wrong degree | Self-reported degree or Unknown | First selected degree | Combined expected-to-reported/chosen confusion directions. |
| First response time | Done time | First answer time | Combined mixed-practice response-time summary. |
| Timing validity and version | Recorded | Recorded | Exclude invalid times from timing only, retain valid grades. |
| Replays before/after first response | Recorded | Recorded | Shared listening/replay measures, retaining the existing attribution rules. |
| Educational retries | No M2-style retry list | Count and answer history | M2 detail; do not invent a retry opportunity or zero retry rate for M1. |
| Exercise and method | M1 plus imagined/sung/played | M2 plus degree-button | Module drilldown and the M1-only two-category mapping. |
| Session, timestamps and exposure | Recorded | Recorded | Counts, date scope and optional detail without mandatory group splitting. |

The interval information presently shared by these modules is the target's
relationship to the chord root (chord degree). The records do not establish
answers about intervals between successive melody notes.

## Selected Shared Information Categories

The user selected all four, with chord-degree performance and confusion
directions as the primary information; response efficiency and replay use are
secondary. All use existing M1/M2 records rather than inventing later modules
or requiring new performance capture. Exact visual composition follows the
existing comp-first process; consolidated-design confirmation is complete.

### 1. Chord-Degree Performance

A primary combined accuracy and degree-outcome view: how results vary by degree,
chord quality and root, with module detail available when wanted.

- Total correct: add M1 first-correct self-ratings and M2 first-correct answers.
- Total assessed: add recorded assessed questions from both modules.
- Combined accuracy: total correct divided by total assessed.
- Each assessed question has equal weight; do not average module percentages
  or impose equal module weights.
- Unassessed questions remain separate, not incorrect. Retries/reveals do not
  replace a wrong first result.
- Use actual target labels, including deliberate extensions/alterations.
  Do not silently collapse different musical labels into one new score.

### 2. Confusion Directions

Combine the target degree and M1's reported wrong degree or M2's first selected
wrong degree into one confusion view. Both types of recorded wrong answer count.

Unknown is still an incorrect assessed outcome for accuracy, but supplies no
specific confusion direction. Show its count without inventing a wrong note.
Do not infer a wrong degree from an unassessed question.

### 3. Response Efficiency

A combined median of valid first-correct response times from both
modules, optionally broken down by degree or chord context.

Calculate from the combined eligible raw times, not the average of module
medians. Invalid/missing times do not remove otherwise valid accuracy evidence.
Wrong answers earn no speed credit.

The pooled label would describe mixed-practice response time: M1 records Done
after chord onset; M2 records answer submission after answer readiness. Retain
these timing definitions in detail, without making separate module charts
mandatory. Do not call the pooled number pure mental recognition speed or a
measured vocal/instrument onset. The user selected this as secondary information.

### 4. Replay Use

Combine the assessed questions that used replay before the initial response,
alongside their assessed denominator. Context replay before M1 Done and replay
before M2's first choice retain their existing recording rules.

Mandatory initial/reference audio does not become an extra user replay. Keep
pre-response replay assistance distinct from post-response review totals.
Educational retry detail currently belongs to M2; its absence in M1 does not
create an artificial M1 retry rate.

Practice counts, assessed/unassessed counts and recorded date range can remain
compact context in the page header rather than another chart category.

## Aggregation Rules Already Settled

- Overall is a real M1+M2 rollup. Module views filter that same population by
  exercise; subgroup views narrow it only when relevant.
- Preserve source records, first-response evidence and original configurations.
  New reporting mapping must not rewrite historical assessment or method tags.
- Self versus automatic, imagined versus sung, or different target/mix settings
  must not silently prevent inclusion in the requested default combined totals.
- Deduplicate an assessment's identity; retries do not count as new first grades.
- Missing data is not a failure, a zero time or a fabricated response.
- Explain what a combined metric counts; do not replace these totals with a
  weighted mastery score or claim identical difficulty across all practice.
- Show sample counts and offer module/degree/context detail, without a compulsory
  chain of configuration-cohort selectors before the overview.

## Review Required Whenever a V2 Module Is Added

1. Identify what the module assesses and what it actually records.
2. Check contributions to current categories and consider better/new categories.
3. Define the correct numerator, denominator and any time boundary.
4. Add relevant method categories only if that module uses them.
5. Reconcile Overall, module totals and detail using recorded outcomes, without
   inventing independent answers from a whole-activity rating.

This is an integration-design checkpoint, not a request for a generic plugin
framework or future modules now.

## Confirmation Record

Category selection, priority and the complete consolidated plan are confirmed.
The final user amendment concerns the 0-200% accompaniment voice range, not
these Insights rules. Subsequent visual design and implementation must follow
this agreed basis without reopening the rejected mandatory group partitions.
