# V2 Per-Quality Targets, Voicing Mix and Overall Insights — Specification

Status: Specification synthesized on 2026-10-26 from the user-confirmed design
of 2026-10-25. Testing seams confirmed by the user on 2026-10-26. This document
specifies future work; it does not claim implementation, visual approval,
executed acceptance tests or issue-tracker publication.

## Problem Statement

A single target pool shared by every chord quality cannot express the musician's
chosen vocabulary for each quality. A musician may want one set of degrees for
maj7 and another for m7, including deliberate extensions and alterations, without
changing other presets or narrowing the available recognition answers.

The accompaniment currently lacks independently adjustable voicing voices.
Musicians need to change their balance and audition the result while retaining
voicing identity, M1 target withholding and the independent target sound.

Insights must provide useful module totals and an actual combined V2 view.
Mandatory setting partitions obstruct that overview. The musician explicitly
accepts M1 self-assessment and M2 selected-answer outcomes equally, while still
needing honest provenance, denominators and interpretation limits.

## Solution

Let each preset own per-quality target pools and a shared voicing mix. Balance
selected qualities, then their targets, with independent balanced roots. Offer
up to five original low-to-high voice levels from 0–200% in Customize and an
unassessed full-chord audition. Keep session configurations fixed after Start.

Provide module-first Insights with integrated and detailed evidence, plus a
category-first Overall view combining V2 M1 and M2. Lead with chord-degree
performance and confusion directions; make mixed-practice response time and
replay use secondary. Preserve historical records and explain each measure.

## User Stories

1. As a musician, I want separate target pools for each chord quality, so that my selected vocabulary suits each harmony.
2. As a musician, I want each quality's pool to apply across my selected roots, so that root selection stays independent.
3. As a musician, I want to select chord tones, extensions and alterations, so that intentional tensions remain available.
4. As a musician, I want unselected degrees excluded from generation for that quality, so that practice follows my choices.
5. As a musician, I want target pools stored per preset, so that editing one exercise does not change another.
6. As a musician, I want one per-quality degree editor, so that I need not manage a separate global Functional/Exact switch.
7. As a musician, I want old preset conversion to retain its eligible material, so that existing exercises remain recognizable.
8. As a musician, I want newly enabled qualities initialized with their chord tones, so that I can start from a usable pool.
9. As a musician, I want re-enabled qualities to retain their edited pools, so that temporary deselection does not erase work.
10. As a musician, I want empty enabled pools identified before Start, so that no selected quality is silently skipped.
11. As a musician, I want qualities balanced independently of pool size, so that larger pools do not dominate practice.
12. As a musician, I want targets balanced within each quality and roots independently balanced, so that coverage follows the selected policy.
13. As a musician, I want recognition answer options retained independently of target pools, so that a narrow exercise does not expose the answer.
14. As a musician, I want controls for each original low-to-high voicing voice, so that omission of a target does not shift my mix assignments.
15. As a musician, I want actual degree labels beside voice controls, so that I can understand the chord I am balancing.
16. As a musician, I want existing three-, four- and five-note voicings preserved, so that mixing does not rewrite the harmony.
17. As a musician, I want one set of up to five levels shared across a preset's qualities, so that balancing remains manageable.
18. As a musician, I want voice levels from 0–200%, so that I can mute or boost individual accompaniment voices.
19. As a musician, I want 100% and missing levels to preserve standard gain, so that old presets retain their normal sound.
20. As a musician, I want accompaniment mixing to leave the independent target unchanged, so that balancing does not alter the reference target control.
21. As a musician, I want an invalid mix identified by quality and target before Start, so that practice retains non-target accompaniment.
22. As a musician, I want to audition an enabled quality using the first selected root, so that I can hear the configured full-chord balance.
23. As a musician, I want a new audition to replace the previous one, so that previews do not layer or leak after navigation.
24. As a musician, I want audition excluded from practice records, so that trying settings does not inflate my evidence.
25. As a musician, I want valid edits saved and invalid drafts kept from replacing valid presets, so that configuration errors do not destroy working settings.
26. As a musician, I want Restore Default to restore the named preset's complete factory configuration, so that its meaning stays predictable.
27. As a musician, I want a session's settings frozen at Start and used for Results replay, so that later preset edits cannot change past practice.
28. As a musician, I want boosted playback protected against hard digital clipping, so that higher voice levels remain usable.
29. As a musician, I want M1 target exclusion and reference continuation preserved, so that mixing does not leak the target or reattack a live chord.
30. As a musician, I want Overall to combine V2 M1/M2 results, so that I can inspect integrated performance.
31. As a musician, I want every assessed question weighted equally, so that module sizes determine their actual contribution.
32. As a musician, I want self-ratings included equally while retaining their provenance, so that trusted self-assessment is counted without being called verified pitch measurement.
33. As a musician, I want each module's total and relevant detail, so that I can explore contributors to Overall.
34. As a musician, I want imagined and sung grouped together and instrumental playing separate in M1, so that production categories match my use.
35. As a musician, I want M2 free of irrelevant production selectors, so that recognition reporting remains simple.
36. As a musician, I want chord-degree performance and confusion directions prioritized, so that the overview answers my main musical questions.
37. As a musician, I want Unknown and unassessed outcomes handled honestly, so that missing information does not become a fabricated wrong note.
38. As a musician, I want retries and reveals separated from first grades, so that learning activity cannot inflate first-response accuracy.
39. As a musician, I want pooled valid first-correct times and their sample count, so that timing reflects contributing responses rather than averages of medians.
40. As a musician, I want mixed-practice timing labelled accurately, so that it is not mistaken for pure recognition speed or instrument onset.
41. As a musician, I want pre-response replay assistance separated from later review, so that their denominators and meanings remain clear.
42. As a musician, I want empty and sparse evidence displayed honestly, so that the app does not invent a weakness or mastery claim.
43. As a musician, I want focused presets to inherit the source mix and appropriate root scope, so that suggested practice matches the selected evidence.
44. As a musician, I want focus to open editable Customize rather than start automatically, so that I control the next exercise.
45. As a musician, I want desktop, mobile and keyboard-accessible controls, so that the configuration and evidence remain usable across my devices.
46. As a musician, I want Legacy and historical records preserved, so that new configuration and reporting do not erase or reinterpret previous work.

## Implementation Decisions

### 1. Authority and boundaries

The confirmed per-quality targets/voice-mix plan and module/Overall Insights
plan govern this change. They supersede earlier mandatory partitions that
would exclude self-ratings or different methods/settings from default combined
totals. Their explicit reporting exception does not erase source distinctions
or authorize claims of objectively measured singing or instrumental execution.

Retain the static TypeScript/browser architecture, existing theory helpers,
question lifecycle, configuration/preset flow, playback interfaces, Results
and Insights. Do not introduce an analytics service, new framework or generic
future-module integration system. Existing comp-first preferences remain in
force: desktop/mobile compositions precede visual implementation. This spec
is not approval of an unreviewed composition or a wider Practice redesign.

### 2. Per-quality target pools and sampling

- Replace the global Functional/Exact target editor with an editable exact-degree
  pool per enabled chord quality. Roots remain a separate pool.
- Pools belong to presets, apply across roots and may explicitly include supported
  chord tones, extensions and alterations. Do not silently sanitize unusual choices.
- A newly enabled quality with no saved pool starts with its chord tones; retain
  a previously configured pool across disable/re-enable.
- Require at least one target for every enabled quality. Report errors before
  Start and preserve the last valid saved preset when a draft is invalid.
- Convert old Functional roles into their eligible degrees for each quality;
  retain old Exact degrees for each selected quality. Preserve eligible material,
  while acknowledging the newly approved sampling distribution changes.
- Balance selected qualities first, targets within each quality second; retain
  independently balanced root sampling. Do not promise equal counts for every
  quality/degree pair in a short session.
- Identify the changed generation policy in new records. Never regenerate old
  attempts or relabel their historical sampling policy.
- Keep M2's reasonably complete, pitch-class-unambiguous answer options separate
  from the generation pools. Preserve existing labels and supported pitch/register.

### 3. Voicing mix and compatibility

- A voicing voice is its original low-to-high position in the complete chord,
  before any target exclusion; it is not a surviving-array index or a fixed degree.
- Preserve existing three-, four- and five-note voicings. Display actual degree
  labels. One preset owns a shared set of up to five voice levels across qualities;
  nonexistent voices do not sound. Other presets remain independent.
- Levels span 0–200% inclusive, default 100%. Zero mutes; 100% retains nominal
  voice gain; 200% doubles nominal gain, not perceived loudness. Reject invalid
  levels. Missing historical levels mean standard gain, not mute.
- Apply the mapping only to accompaniment. Preserve the existing overall-volume
  range and independent target's nominal gain relationship; add no target control.
- Preserve original voice identities through M1 exclusion of every occurrence of
  the target pitch class, across octaves. Preserve live-reference continuation
  without chord reattack and established fresh-reference behavior.
- Validate every eligible quality/target combination against the mix after target
  exclusion. If none of its non-target accompaniment voices remain non-muted,
  identify the quality/target and block Start. Never silently restore gain or
  remove selected targets. This structural check does not guarantee device audibility
  or change existing context-off and overall-volume behavior.
- Prevent hard digital clipping for boosted full voicings plus target at maximum
  overall volume, including question, fresh-reference, live-reference and audition
  playback. Select and verify an internal headroom/protection mechanism without
  silently capping a selected 200% level at 100%, flattening the mix, changing default
  sound, envelopes/timing, or altering Legacy playback. No new synthesis-effect UI.

### 4. Customize, audition and immutable sessions

Mix editing and audition live in Customize, not mid-session settings. Audition
plays only the complete mixed accompaniment of one enabled quality at the first
selected root and displays the actual chord. It has no independent target,
simulated M1 omission, assessment, practice attempt or target-exposure record.
Replaying replaces the previous audition; leaving its context or starting practice
cancels stale audio and pending preview work.

Retain valid auto-save and invalid-draft protection. Restore Default restores
the named preset's factory target material and standard voice levels with its
existing whole-preset meaning. Starting practice freezes the configuration;
Results replay reads that snapshot, not the current preset. Later edits/default
restoration cannot rewrite sessions, first responses or historical configurations.

### 5. Overall population and module views

Only V2 M1/M2 contribute now. Exclude Legacy, earlier trainers and drone activity.
Deduplicate first-assessment identities; retries/reveals are not extra first grades.
The Overall view combines these records; module views select contributors from
the same population. Each assessed question has equal weight regardless of
self-rating versus automatic selection grade.

Retain raw methods, source, versions, context, pools, mix and exposure as traceable
metadata and optional detail. They must not become compulsory top-level partitions
or silently exclude records from the requested totals. A pooled summary describes
mixed practice, not equal difficulty or a causal comparison of unlike conditions.
Keep relevant caveats near any stronger pattern claim.

M1 maps imagined and sung to **Imagined / sung**, and played to **Instrumental
playing**. Its default total includes both; All is a total, not a third production
category. Missing method detail retains a valid grade in M1 totals without a guessed
subgroup. M2 gains no production selector or artificial Unknown method group.
Do not rewrite stored response methods or practice method controls.

### 6. Four information categories

| Category | Priority | Contract |
| --- | --- | --- |
| Chord-degree performance | Primary | Sum first-correct outcomes divided by summed assessed questions; support actual degree, quality and root detail. Do not average module percentages or impose equal module weights. Unassessed stays separate. |
| Confusion directions | Primary | Combine expected degree with M1 reported wrong degree or M2 first chosen wrong degree. Unknown remains incorrect for accuracy but supplies no invented direction; show its count separately. |
| Response efficiency | Secondary | Median of the pooled raw valid first-correct times, with its own eligible sample count; never average module medians. Wrong answers earn no speed credit. Missing/invalid timing does not erase valid accuracy. |
| Replay use | Secondary | Assessed questions using replay before first response divided by assessed questions. Retain existing M1-before-Done and M2-before-choice attribution; initial/mandatory reference audio is not a replay. |

Label pooled time **mixed-practice response time**. Explain that M1 measures Done
from chord onset (visual readiness with context off) and M2 measures submission
from answer readiness. Preserve actual recorded timing definitions/versions; do
not call it pure mental recognition speed or measured vocal/instrument onset.

Post-first/review replay totals may include a different population, including
unassessed records; show their actual scope rather than borrowing the replay-assistance
denominator. Educational retries remain M2 detail; no fabricated M1 zero retry rate.

Practice counts, assessed/unassessed counts and recorded date range can be compact
header context. Use actual musical degree labels, including deliberate tensions;
do not silently collapse distinct labels into a new score. No weighted mastery score.

### 7. Evidence presentation and next practice

Provide useful Overall categories and module totals with progressively available
detail, without a compulsory chain of condition selectors. Keep filters, totals,
patterns and detail aligned to the same selected population. Do not label aggregate
history as recent performance or invent trends or unsupported strongest/weakest
claims from sparse/tied evidence. Show sample counts and missing timing honestly.

No records should offer an existing practice entry; no matching records should
identify the filtered scope and offer reset. Retain readable numerical evidence,
keyboard operation, visible focus, textual errors and non-color-only feedback on
desktop/mobile; keep wide evidence scrolling local rather than overflowing the page.

Focused presets inherit source conditions and mix, narrow the selected quality and
degree, use the active Root filter when present, and otherwise retain the source
Root Pool. Open editable Customize; do not auto-start, widen roots silently or
mutate source presets/history. Keep relevant source provenance when choosing focus.

### 8. Future-module integration checkpoint

Whenever a V2 module is added later, review its actual assessment grain, recorded
fields, useful existing/new categories, numerators/denominators, time boundaries and
relevant methods. Reconcile its contribution without inventing independent answers
from whole-activity ratings. This is a future design checkpoint, not authorization
to build Release 2 or a plugin abstraction now.

## Testing Decisions

### Confirmed seams and prior art

The user confirmed the primary public seam on 2026-10-26: the existing V2 browser
flow **Customize → audition → Practice → Results → Insights**. Test behavior visible
through it, preserving existing browser V2 configuration, lifecycle, grading,
reveal and split-desk regression families. Use existing V2 model/configuration and
audio-contract test patterns only for generation/statistics and voice gain/headroom
that the UI cannot reliably expose. Reuse current test tooling and public interfaces;
do not inspect private structures or invent a separate browser framework.

Tests must fail when the specified behavior breaks and use independently worked
expected outcomes. Do not mirror implementation formulas as assertions. The following
are future acceptance obligations; none has been executed for this documentation task.

### Acceptance matrix

1. Configure distinct quality pools across roots, save/reopen, switch presets and
   disable/re-enable qualities. Assert generated targets follow each pool and
   changes never bleed to another preset.
2. Convert representative old Functional and Exact presets. Verify eligible material
   is unchanged; a newly enabled quality receives its chord tones. Empty enabled
   pools block Start without replacing the last valid preset.
3. Verify quality frequency independently of unequal pool lengths, balanced targets
   within each quality and independently balanced roots using deterministic generator
   fixtures. Verify a new policy identity while historical attempts remain byte-for-byte
   unchanged. Do not require impossible short-session equalities.
4. Verify M2 answer options remain complete and unambiguous independently of target pools.
5. Exercise actual three-, four- and five-note voicings. Mute/boost original voices;
   verify 0/100/200% endpoints and reject out-of-range levels. Missing levels retain
   standard sound; target nominal gain remains outside the accompaniment mapping.
6. Verify original voice identities survive M1 cross-octave pitch-class omission,
   live target addition and fresh reference. Preserve readiness, timing, envelopes,
   retry/reveal behavior and both context-on/off paths.
7. At maximum overall volume, render or otherwise measure the actual combined output
   for boosted voicings plus target, including live continuation; assert no hard digital
   clipping. Check default-level behavior and unaffected Legacy audio. A synthetic
   gain ratio alone is insufficient evidence that the combined output is protected.
8. Test invalid mix combinations, including loss of all non-target accompaniment;
   errors name affected quality/target, block Start and preserve valid saved state.
9. Audition uses the first selected root and selected enabled quality, full mixed
   accompaniment only. Replace playback on repeat; navigation/Start cancels pending
   audition. Verify no attempts, assessments or exposure records are created.
10. Verify frozen session settings, historical Results replay, independent preset
    edits, Restore Default and focused-preset inheritance of mix and root scope.
11. Reconcile Overall with module contributors using M1 6/10 and M2 9/20: **15/30 =
    50%**, not 52.5%. Include self-ratings equally, exclude Legacy, retain unassessed
    separately and deduplicate assessment identities without counting retries twice.
12. Verify M1 imagined/sung combined and played separate, including missing method
    grades in the total without guessed membership. Assert no M2 production grouping
    and no persisted method/grade/configuration rewrite.
13. Verify known wrong-degree directions across both modules; Unknown remains incorrect
    without an invented direction. Retries/reveals do not replace the first wrong grade.
14. Pool valid first-correct times of M1 [1000] ms and M2 [2000, 3000, 4000] ms:
    **2500 ms**, not the 2000 ms average of module medians. Invalid/missing times and
    wrong answers receive no timing credit; their otherwise valid grades still count.
15. Verify assessed replay-assistance denominators separately from all-record review
    totals; initial/reference audio is not a user replay. M2 retry detail must not
    fabricate M1 retry opportunities.
16. Test no records, no matching records, sparse/tied cells, interrupted attempts,
    missing timing, filter reconciliation and actual musical labels. No missing-data
    zeroes, fabricated rankings, automatic adaptation or mastery claims.
17. Verify desktop/mobile, keyboard/touch, visible focus, labeled controls/errors,
    textual evidence and page overflow. Follow the approved comp-first process before
    implementing layouts. Automated checks do not certify physical Safari/iOS,
    screen-reader speech or subjective sound quality.
18. Run relevant existing Legacy and V2 regressions. Preserve first-response evidence,
    cancellation/recovery, M1 reference gates, M2 retries/reveal, fixed/Unlimited
    sessions, local history, existing presets and source records.

Human headphone/speaker listening remains a separate check for timbre, perceived
balance and audible release. Headless scheduling/output tests cannot establish
subjective musical quality, real learning gains or device loudness.

## Out of Scope

- Running implementation, TDD, ticket decomposition or the setup workflow in this task.
- New exercises, Release 2, progression/dictation work or generic module plugins.
- Accounts, server analytics, cloud synchronization or a new audio framework.
- Editing voicing pitches, target-volume controls, custom synthesis/ADSR editors,
  new playback timing or mid-session mix editing.
- Rewriting/migrating historical assessments, mixing Legacy into V2 totals or
  relabeling self-assessment as measured pitch verification.
- Automatic difficulty changes, weighted mastery scores, new trend/grouping
  policies or unsupported causal/transfer claims.
- A broader Practice redesign beyond the interactions explicitly required here;
  separate approved UX plans retain their own scope and visual-review process.

## Further Notes

Source authority: the confirmed per-quality targets/voicing-mix design, the
module/Overall Insights design, the domain glossary, project intent, Release 1
and its audio/lifecycle refinements. Earlier Insights UX partitions remain
historical where superseded by the explicit combined-total decision. Keep
non-conflicting evidence, accessibility and focused-preset requirements.

The final confirmed voice-level amendment is **0–200%**, replacing 0–100%.
Do not reopen settled V2-only scope, equal treatment of assessed outcomes,
M1-only production mapping, category priorities or target-pool ownership as
default product questions. Internal storage shape, helper seams and headroom
mechanism are implementation choices to select and verify within this contract.

Repository skill tracker settings and triage-label vocabulary have not been
configured. Run `/setup-matt-pocock-skills` in a subsequent task to configure them;
this specification task does not run that workflow or create tracker settings
by assumption. Publish this specification to the configured issue tracker with
`ready-for-agent` when tracker configuration and authenticated API access are
available. Local commit/push does not constitute issue publication. The current
GitHub API request returned `Forbidden`; publication remains pending.
