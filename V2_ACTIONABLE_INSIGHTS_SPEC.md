# V2 Actionable Insights — Specification

Status: ready-for-agent (repository-local specification).
Synthesized 2026-10-29, Asia/Hong_Kong. Scope: all six V2 exercises.
Repository-local specification; not an implementation, visual-comp approval,
GitHub issue, applied external triage label, or deployment.

## Problem Statement

The musician can see accumulated scores but must interpret long lists of chord-degree
results, mixed practice conditions and technical caveats to decide what to practise.
Small samples occupy as much space as substantial evidence. The current overview does
not reliably distinguish a recurrent mistake from a gap in practice coverage, or a
change in practice difficulty from a change in recorded performance.

Play by Ear needs useful analysis by practice key, chord root, chord quality, full
chord and degree. Much of this context is recorded, but it is not organized into
clear observations and connected practice actions. Chord root is not progression
practice key, and whole-question completion delay cannot establish per-chord speed.

On mobile, long mode controls precede the main result. Repeated generic settings
buttons do not carry the observed musical problem into the next practice setup.

## Solution

Organize Insights as **recent performance → up to three practice priorities → musical
analysis → applicable completion efficiency → supporting evidence**. Preserve the
existing V2 visual identity while making interpretation and the next action primary.

Provide Overall, Degree Recognition, Degree Audiation and Play by Ear family views,
with Single Chord and Progression contexts. Show system-graded and self-rated results
explicitly, retain counts and unknown states, and keep the existing combined degree
accuracy available as a secondary mixed-practice total.

Allow progressive exploration of practice key, chord root, chord quality, full chord,
degree and recorded progression context. Carry filters through drill-down and into
an independent practice-configuration preview. Report only what the recorded data
and comparable conditions support; do not diagnose musical ability or invent missing
tags, timestamps, timing samples or synchronized history.

## User Stories

1. As a musician, I want the first screen to show recent results, so that I can understand my practice without reading a raw breakdown.
2. As a musician, I want the selected exercise and reporting period visible, so that I know what the figures describe.
3. As a musician, I want system-graded and self-rated results labelled, so that I do not confuse self-assessment with verified pitch accuracy.
4. As a musician, I want correct and assessed note counts beside percentages, so that I can judge their scale.
5. As a musician, I want question and session counts, so that one long phrase does not look like many independent practice occasions.
6. As a musician, I want unassessed notes separate, so that incomplete grading is neither a wrong answer nor a zero score.
7. As a musician, I want Overall organized by three exercise families, so that I understand the different skills represented.
8. As a musician, I want both harmonic contexts shown within each family, so that single-chord and progression tasks remain distinguishable.
9. As a musician, I want a family view with two context choices, so that seven long mode buttons do not dominate the page.
10. As a musician, I want existing combined degree accuracy retained as secondary detail, so that I can still inspect the accepted cross-module total.
11. As a musician, I want that combined total labelled as mixed practice including self-ratings, so that it is not presented as an objective ability score.
12. As a musician, I want the last 28 local calendar days by default, so that Insights describes recent practice.
13. As a musician, I want 7-day, 28-day, 90-day and all-time periods, so that I can choose the appropriate reporting window.
14. As a musician, I want the reporting interval shown explicitly, so that a period label is not ambiguous.
15. As a musician, I want this-browser history labelled, so that I do not assume my other devices are included.
16. As a musician, I want no more than three practice priorities, so that the page helps me choose rather than adding another list to interpret.
17. As a musician, I want recurrent errors separated from coverage gaps, so that unpractised material is not called a weakness.
18. As a musician, I want every recurrent-error observation to state its sample and conditions, so that I can inspect its basis.
19. As a musician, I want tiny samples marked as insufficient, so that 0/1 does not become a confident diagnosis.
20. As a musician, I want repeated evidence across questions and sessions, so that one long phrase cannot trigger a recurrent-error claim.
21. As a musician, I want duplicate observations about the same mistakes merged, so that one issue does not occupy all three priority slots.
22. As a musician, I want an honest insufficient-data state, so that the page does not manufacture recommendations.
23. As a musician, I want coverage measured against an explicit practice setup, so that keys I deliberately excluded are not described as neglected.
24. As a musician, I want a review-evidence action beside a priority, so that I can verify its samples and context.
25. As a musician, I want a corresponding practice-setup action, so that I can act without rebuilding the settings manually.
26. As a musician, I want that action to open a configuration preview, so that practice does not start unexpectedly.
27. As a musician, I want my source preset preserved, so that exploring a suggestion cannot silently overwrite it.
28. As a musician, I want a progression suggestion to retain the whole C-source progression, so that practising one troublesome part preserves its harmonic context.
29. As a musician, I want the suggested practice key, pools, BPM and voicing settings visible, so that the preview matches the observation.
30. As a musician, I want any per-quality targeting limitation explained, so that a suggestion does not pretend to isolate a single chord occurrence.
31. As a musician, I want to return to my previous Insights selection, so that trying a practice setup does not lose my investigation.
32. As a musician, I want practice-key results for each progression mode, so that I can inspect performance across actual sounding keys.
33. As a musician, I want random-key questions attributed only to their drawn key, so that a pool of twelve keys does not create twelve observations from one question.
34. As a musician, I want practice key distinguished from chord root, so that Eb-key Fm7 evidence is correctly understood.
35. As a musician, I want Single Chord results grouped by chord root rather than inferred key, so that the page does not invent tonality.
36. As a musician, I want a twelve-key distribution in a stable musical order, so that I can scan practice coverage.
37. As a musician, I want absent and insufficient key records distinguished, so that neither is displayed as 0% ability.
38. As a musician, I want an explicit comparable-conditions key view, so that differences in phrase content are not mistaken for key effects.
39. As a musician, I want root, quality and full-chord views, so that Fm7 and all minor-seventh chords can be investigated separately.
40. As a musician, I want chord rows to show accuracy and sample size compactly, so that repeated large buttons do not obscure results.
41. As a musician, I want no more than five initial chord rows with an All option, so that the analysis remains readable.
42. As a musician, I want chord sorting by errors, practice volume or musical name, so that I can explore different questions.
43. As a musician, I want a chord's degrees and recorded progression contexts available on drill-down, so that an aggregate can be explained.
44. As a musician, I want degree analysis tied to chord quality, so that identical degree labels in different harmonic contexts are not conflated.
45. As a musician, I want key and full-chord filters retained when examining degree, so that I can inspect Eb key → Fm7 → b7.
46. As a musician, I want an all-chord degree summary labelled as mixed context, so that I do not mistake it for controlled evidence.
47. As a musician, I want directed confusion counts with their musical and assessment context, so that b7 → 1 has an intelligible meaning.
48. As a musician, I want Unknown, missing wrong-degree annotations and unassessed outcomes distinguished, so that missing annotations do not hide errors.
49. As a musician, I want readable active filters and clear-all controls, so that I always know which subset I am inspecting.
50. As a musician, I want one analysis dimension at a time, so that a giant key-by-chord-by-degree grid is not the default experience.
51. As a musician, I want complete cross-tabulations in details, so that advanced inspection remains possible.
52. As a musician, I want trends restricted to compatible conditions, so that changing BPM or target pools does not produce a misleading improvement claim.
53. As a musician, I want the compared subset and its coverage visible, so that a narrow comparison is not represented as my whole history.
54. As a musician, I want percentage-point differences described as recorded observations, so that the app does not claim proven learning or transfer.
55. As a musician, I want generator and timing versions respected, so that algorithm changes do not look like changes in my ability.
56. As a musician, I want no manufactured trend when comparison data is insufficient, so that unavailable evidence is not displayed as zero change.
57. As a musician, I want applicable speed measures subordinate to accuracy, so that fast mistakes receive no positive speed credit.
58. As a musician, I want Single Chord Recognition response time kept separate from Audiation Done time, so that different response boundaries are not blended.
59. As a musician, I want Play by Ear post-accompaniment completion delay measured per question, so that it is not mislabelled as each note's speed.
60. As a musician, I want actual zero completion delay retained as a valid value, so that zero is not confused with missing data.
61. As a musician, I want the timing section's own scope visible, so that note-level filters cannot silently change the meaning of whole-question time.
62. As a musician, I want irrelevant unavailable timing panels omitted, so that non-timed modes do not waste the main screen.
63. As a musician, I want assessed replay-assisted notes retained and their share visible, so that descriptive accuracy and assistance remain interpretable.
64. As a musician, I want retries and review to preserve first results, so that later learning does not rewrite earlier evidence.
65. As a musician, I want stable IDs deduplicated across every grouping, so that re-entering Insights does not inflate totals.
66. As a musician, I want older records readable with explicit missing context, so that history remains useful without invented tags.
67. As a musician, I want original chord spellings preserved for display, so that normalization does not unnecessarily rename my material.
68. As a musician, I want existing source conditions and versions available on demand, so that simplified summaries remain auditable.
69. As a musician, I want filtered matching sessions linked from the evidence, so that I can inspect original results and reference playback.
70. As a musician, I want an empty-period state distinct from no history, so that I know whether to widen the period or begin practising.
71. As a musician, I want storage failures distinguished from empty history, so that a read error cannot erase or misrepresent my records.
72. As a mobile musician, I want results before long controls and detail lists, so that I can understand the page without excessive scrolling.
73. As a keyboard user, I want named controls, visible focus and a stable drill-down path, so that the investigation is usable without a pointer.
74. As a musician, I want record counts and labels in addition to colour, so that meaning remains accessible without relying on red and green.
75. As a musician, I want narrow-screen detail tables to scroll locally, so that the whole page does not overflow horizontally.
76. As a musician, I want Legacy history, exercise behaviour and current presets unchanged, so that this reporting redesign does not alter my practice data.

## Implementation Decisions

### 1. Scope, vocabulary and evidence grains

- Cover all six current V2 exercise identities; keep stable stored IDs and matching-history routes.
- Use the domain terms Practice key, C-source progression, Chord quality, Per-quality target pool, Progression note outcome, Wrong-degree annotation and Post-accompaniment completion delay.
- UI may say playback key, but it means the question's recorded Practice key, not the root of its first chord.
- Note outcome, question and session are different grains. A progression contributes one note outcome per target position and one completion-delay sample per question.
- Accuracy = distinct first-correct assessed note outcomes / distinct assessed note outcomes. Single Chord contributes one note outcome per question. Unknown first responses are assessed incorrect; unassessed remains separate.
- Combined degree accuracy remains a weighted-by-assessed-count total, never an average of module percentages. Keep it secondary and explicitly mixed/self-rated; do not use it to rank priorities or compare skills.
- Keep the old Audiation played response method in Audiation. Do not reclassify it into listen-first Play by Ear. Retain the existing Imagined / sung versus Instrumental playing production-category filter for Single Chord Audiation, with raw imagined/sung/played provenance preserved.

### 2. Shared analytical read model

- Extend the existing analytics/model and progression-evidence boundary, rather than creating a parallel scoring store or recomputing first grades in the UI.
- Normalize note identity, parent question/session, exercise/family/context, grading source, response method, actual chord root/quality/symbol, target degree, first outcome, wrong-degree annotation and assistance.
- Normalize question practice key, fixed/random policy, eligible pool snapshot, C-source and actual progression, chord occurrences/durations, notes per chord, BPM, target pools, voicing mix/volume, exposure provenance and generator/timing versions where reliably recorded.
- Use raw structured snapshots. Do not parse a human-readable conditions string to reconstruct facts.
- Deduplicate note outcomes by stable note/attempt ID; deduplicate replay events, eligible delays, question counts and session counts at their own grain.
- Read normalization may supply derived group keys from trustworthy theory primitives; preserve original chord labels for display. Never infer tonic, a missing C-source, or a template identity from the first chord or a suggestive name.
- Equivalent supported root spellings may share a pitch-class group. Preserve degree labels and their chord-relative meaning; do not turn distinct permitted degree labels into an unlabelled common interval bucket.
- Missing tags remain unknown, visible and independently countable. Unknown is not C, zero, a known old generator version, fresh exposure, or a valid comparison value.
- Retain original records and stores. Any additive metadata for future records is optional for reading old records and must not trigger destructive history migration.

### 3. Navigation, periods and visible hierarchy

- Four family entries: Overall, Degree Recognition, Degree Audiation and Play by Ear. Family detail has Single Chord/Progression context selection and a complete mode title.
- Overall has three compact family sections, each with distinct results for its two contexts. Do not show a combined family ability score or a six-mode leaderboard.
- Default to the inclusive last 28 local calendar days, with 7/28/90 days and All. For a rolling N-day period, the start is local midnight N−1 calendar days before today; end is tomorrow's local midnight, exclusive. Derive calendar boundaries, not multiples of 24 hours across DST.
- Compare against the immediately preceding N local calendar days only for finite periods. All has no automatic previous-period delta.
- Date attribution: prefer a reliably stored question-presentation timestamp; for existing progression questions use recorded creation time; for existing Single Chord use valid attempt completion time, otherwise valid parent-session start with its coarser attribution disclosed. No usable timestamp means the record remains in All/unknown-date evidence, not in a guessed finite period.
- Date fallback provenance is part of comparable reporting; do not silently compare precise question-time records against session-start-only records as though their time attribution were identical.
- Display date range and this-browser scope. Date labels and filtering must use the same local-date interpretation.
- Initial order: recent performance, priorities, musical dimensions, applicable efficiency, supporting evidence. Shared scope controls stay compact; advanced filters and technical conditions are disclosed.
- Keep active family/context/period and compatible filters while exploring dimensions. Reset only incompatible filters when changing family/context, and disclose that change.
- Preserve an Insights return-state snapshot through the configuration-preview handoff and a matching-history visit. Reload a history result using the existing stable result identity.

### 4. Musical dimensions and progressive drill-down

- Progression exposes Key/Chord/Degree views. Single Chord replaces Key with Chord root and explains that tonality is not inferred.
- Key/root distribution uses the established twelve pitch-class order. Show all twelve coverage cells; distinguish no records, unassessed-only, insufficient sample and eligible descriptive evidence.
- Practice key reads the question's actual draw. A twelve-key pool does not attribute a question to twelve keys. The C-source progression is a reference, not the sounding-key label.
- Key cells show correct/assessed and percentage when defined, plus distinct question counts. Session count and evidence status are available without exposing raw technical data.
- Chord supports quality/full-chord views and an optional root filter. Show percentage, correct/assessed, distinct questions/sessions and evidence status.
- Initial chord list has at most five rows, with All chords. Sort choices: recorded error proportion, assessed practice volume, or musical name. Resolve equal values by error count, assessed count and canonical musical name to keep ordering stable.
- Low-sample and mixed-condition rows stay labelled; sorting is not a diagnosis or a controlled cross-chord ability ranking.
- Degree defaults to chord-quality × degree, with full-chord/key filters retained. All-chord degree aggregation is explicitly mixed harmonic context.
- Clicking a musical group filters/reveals its next useful view in the same workspace, with readable removable filter labels and a back/clear path. Do not open another equally dense dashboard.
- Full key×chord and chord×degree tables are available in detailed evidence, not on the initial screen. Keep counts, headers and missing-data states.
- Directed confusions use the recorded first wrong choice or wrong-degree annotation with assessment and harmonic scope. Distinguish explicit Unknown, incorrect with unspecified wrong degree, and unassessed. A missing annotation is not a missing error.
- Phrase position/context can explain where a chord occurred when recorded. Do not invent Roman-numeral functions, fingerings or causal explanations.

### 5. Recurrent errors, coverage gaps and priority selection

- At most three priorities in the currently selected exercise context and period; family/Overall does not rank incomparable skills against each other.
- Overall presents the family/context summaries and routes to a context's priorities. It does not mix six independent candidate lists into one weakest-skill ranking.
- First-version eligibility is a conservative presentation policy: at least 20 assessed note outcomes, 10 distinct questions and 3 sessions for the candidate; at least 3 first errors spread across at least 2 sessions.
- These are defaults synthesized from the design proposal, not statistical confidence, mastery thresholds, graduation rules or restrictions on practice.
- Recurrent-error candidates are scoped to a specific compatible practice stratum and musical group. Within that stratum, sort descending by first-error proportion, then first-error count, then assessed count; deterministic ties use musical labels.
- Do not compare priority scores across incompatible strata. When several strata qualify, choose the stratum with the most recent assessed question, tie-break by assessed count, and name its musical conditions; other strata remain inspectable in evidence. This avoids an implicit global worst-condition ranking.
- Merge overlapping ancestor/descendant observations when they concern the same set of error IDs. Prefer the most specific actionable group with enough evidence; include its parent key/chord context in the same observation. Do not fill three slots with the same mistakes.
- Fill recurrent-error slots first. Remaining slots may show coverage gaps only when a selected recorded practice-setup snapshot establishes the intended domain.
- Coverage baseline is explicit: a selected snapshot compatible with the current mode and filters. If several setups exist, let the musician choose one or use the latest compatible recorded setup with its label shown. No trustworthy baseline means no invented missing-key recommendation.
- Coverage uses eligible keys/roots/chords within that setup. Within the candidate domain, order absent records before insufficient records, then lowest assessed count, with canonical musical order as tie-break. Excluded keys are not coverage gaps.
- A gap says insufficient coverage, not weakness. A low mixed-condition percentage may be a descriptive observation, but does not qualify as a controlled recurrent-error priority.
- No eligible candidates means an honest insufficient-evidence message, not filler coaching. Every observation exposes its period, numerator/denominator, question/session counts, assistance and musical conditions.

### 6. Comparable trends and conditions

- Separate descriptive current-period aggregation from comparable-period analysis. Mixed current-period totals remain visible and labelled.
- Comparison strata include exercise, grading source, response method, recorded exposure category, generator version, relevant timing version/date-attribution provenance, musical content, target pools, rhythm and accompaniment conditions.
- For progression, compare the same reliably recorded C-source symbols/order/durations, notes per chord, BPM, target pools, mix/volume, key policy and random-key pool. Do not identify equivalent source material by guessing tonic from sounded chords.
- For Single Chord, retain configured root/quality pools, resolved target-pool definition, context/accompaniment and method. Known defaults may only be used when an existing storage contract establishes them; missing critical context otherwise prevents comparison.
- In a key comparison, actual drawn key and the corresponding transposed actual chords are the analytical variable, not matching requirements; keep other policy/pool and C-source conditions fixed. For an overall trend, retain key distribution as comparable strata rather than letting a shift toward easier keys create a gain.
- Chord/degree comparisons remain descriptive unless other relevant recorded context is held compatible. Different source progressions are not controlled evidence simply because they contain the same chord.
- Each stratum must have at least 20 assessed notes, 10 distinct questions and 3 sessions in each period. All groups failing that rule remain in descriptive totals but not the trend delta.
- For multiple eligible matched strata, use the same weights in both periods: each stratum's assessed notes in both periods combined, divided by the combined assessed notes across all eligible strata. Calculate each period's weighted accuracy, then subtract in percentage points. Do not average individual percentages without denominator-aware weights.
- Show each period's matched note/question/session counts and the matched subset's share of the current-period assessed total. A trend headline never replaces the all-matching current-period percentage with an unlabelled matched-only number.
- Describe the delta as recorded higher/lower by X percentage points, not proven improvement, decline, transfer or statistical significance. No eligible matched subset means no directional arrow or zero delta.
- Missing critical versions/settings cannot be silently treated as compatible. Algorithm changes, including the revised randomized phrase generator, stay distinct.

### 7. Applicable response efficiency and assistance

- Single Chord Recognition retains its existing valid first-correct response-time eligibility and median; label it submission time including interaction.
- Single Chord Audiation retains its existing valid first-self-correct Done-time eligibility, response method and median; do not blend imagined/sung with played for a comparable time.
- Progression Recognition/Audiation have no newly invented response-speed measure. Omit their inapplicable large unavailable timing panels.
- Both Play by Ear contexts use Post-accompaniment completion delay, separately from all note-response times. Eligible questions are submitted, all target positions first-rated correct, no pre-Done replay, no interruption, finite non-negative delay with known valid timing provenance.
- Preserve existing validity rules; this spec does not redefine the audio completion boundary, first Done lock, first ratings or retry grading.
- Use one delay per distinct question, median plus eligible question count. A genuine zero is valid; missing/invalid is unavailable. Include compact exclusion counts with optional reasons.
- Timing comparisons additionally retain timing version and complete difficulty/condition strata; never provide one mixed all-mode response-speed statistic.
- Practice-key filtering applies to whole progression questions by their actual key. Full-chord/root filtering may select whole questions containing a matching chord, explicitly labelled as containing that chord; it is not time spent on that chord.
- A note-degree filter has no per-note Play by Ear time. Show no filtered degree-speed value; efficiency can offer an explicitly separate parent-question scope with visible conditions, or be collapsed if there is no meaningful scope.
- Assessed replay-assisted notes remain in descriptive accuracy, with their assessed share stated. Assistance and review events are distinct, and a question replay is not multiplied by its number of notes.

### 8. Practice configuration handoff

- Each priority has one primary Setup this practice action and one secondary View evidence action.
- The setup action carries a structured, validated context snapshot into an independent configuration draft. Do not use a display label as the handoff contract.
- Keep the original exercise identity; include the source musical material, actual selected destination key or intentional root pool, valid per-quality target pools, BPM, duration, notes per chord, accompaniment/mix and supported method settings as applicable.
- A key-specific suggestion may make a fixed-key practice draft; disclose that it was narrowed from random practice. The source random pool remains unchanged.
- The preview identifies the source observation and every narrowed condition. It neither starts playback nor overwrites an existing preset. Existing autosave behaviour must write only the independent draft, never the source preset; saving as new or starting practice follows an explicit existing user action.
- Progression retains the complete C-source sequence, order and durations. It must not collapse into one chord or silently become Single Chord practice.
- A per-quality target restriction affects all occurrences of that quality and must say so. If an observation cannot be represented exactly by existing settings, present the supported broader practice with its limitation; do not claim occurrence-specific targeting.
- Without a trustworthy source configuration, View evidence remains available but a misleading Setup action is not offered. Never guess an old C-source from a sounded first chord.
- Returning to Insights restores family/context, period, active filters and exploration dimension; source records and first outcomes are unchanged.

### 9. Detailed evidence, states and presentation

- Retain matching session/result links, full dimension tables, directed confusions and source conditions/versions as progressive disclosure. Source conditions use musical wording; technical versions stay secondary.
- Distinguish: no saved records; empty period; unassessed-only records; low sample; mixed conditions; unknown tags/dates; empty filtered subset; unavailable timing; and storage read failure.
- Unknown-date evidence remains accessible in All. Unknown-key evidence remains accessible as unknown, not hidden or assigned to C.
- An empty finite period offers a wider period. Empty filters offer clear filters. A read failure preserves history and offers retry/the existing recovery path rather than fabricating empty history or resetting storage.
- Hundreds of condition strata must not produce hundreds of default paragraphs. Initial content stays bounded by three priorities and five chord rows; expanded evidence remains navigable.
- Reuse the current V2 black/yellow/light-ground identity, typography roles, flat rules, labelled native controls and disclosed detail conventions. Do not redesign Legacy.
- Desktop shows recent performance and priorities together when space permits; mobile keeps semantic order and uses compact family selection plus two context controls. Advanced filtering comes after the main result, not seven large mode rows before it.
- Verify 320, 390 and 1440 CSS-pixel widths. Page-level horizontal overflow is prohibited; detail tables may scroll within a labelled region with headers/caption.
- Keyboard, focus restoration, labels and textual selected/evidence states are required. Colour is supplementary. Demo content must be explicitly marked illustrative and never read as actual history.

## Testing Decisions

Test seam confirmed by the user on 2026-10-29: reuse the V2 high-level browser
journeys, supplemented only where calculations cannot be reliably established
through visible UI by existing public analytics/model and progression interfaces.
No new audio, storage-service or component-private seam.

Good tests assert observable outcomes, count attribution, retained history and
honest statements. They do not assert private helper names, DOM construction
order, exact CSS pixel coordinates or a copy of the ranking implementation.

### Modules and prior art

- V2 Insights/controller: scope selection, period filters, drill-down, details,
  focus setup and return/history journeys. Existing V2 critique, layout/state,
  homepage focus and key/Play by Ear browser checks provide the patterns.
- Shared analytics/model and progression evidence: identity deduplication,
  distinct counts, normalized tags, ranking/coverage eligibility, compatible
  strata, weighted deltas, unknown states and direction of wrong annotations.
  Existing V2 model, target-pool/mix and progression/key tests provide prior art.
- Progression timing summary: whole-question scope and valid delay eligibility,
  relying on existing model/audio-lifecycle contracts rather than retesting synthesis.
- Browser fixtures must use valid persisted snapshot shapes, cover all six modes
  and old records, and identify synthetic data explicitly. No external API is needed.

### Acceptance examples

1. **Actual key vs chord root:** A random-key pool includes C/Eb/G. A question actually in Eb has Fm7/Bb7/Ebmaj7 and six assessed targets. Key Eb gets six notes; other keys get none. An Fm7 note is root F/quality m7/full chord Fm7. Total combined assessed remains six, not eighteen.
2. **Single Chord without tonic:** A Single Chord Play by Ear Fm7 target is grouped under root F and Fm7, with self-rated provenance. A default config key of C does not create C-key evidence.
3. **Weighted overall accuracy:** Single Chord Recognition has 9/10 and Play by Ear has 1/2 assessed notes. Secondary combined degree accuracy is 10/12, not the mean of 90% and 50%; each mode retains its own source label.
4. **Sparse and unassessed:** 0/1 shows one assessed error and insufficient sample; 0/0 shows unavailable, not 0%. An unassessed-only session shows its unassessed count without a recurrent-error claim.
5. **Boundary eligibility:** 20 assessed notes across 10 questions and 3 sessions, with 3 errors in 2 sessions, qualify within one compatible stratum. The same notes in 1 question/1 session do not. Nineteen assessed notes do not qualify.
6. **Priority merging and coverage:** Eligible Eb, Fm7 and Fm7/b7 observations refer to the same error IDs. They produce one contextual priority. A setup allowing only C/Eb does not suggest unpractised Ab; without a reliable setup, no twelve-key coverage target is invented.
7. **Scoped practice preview:** Selecting Eb-key Fm7/b7 practice opens the same progression mode with the whole C-source and compatible settings. The draft may use fixed Eb and a narrowed m7 pool, visibly affecting every m7 occurrence. No playback starts and the original random-key preset is byte-for-byte unchanged.
8. **Nested filters and return:** Key Eb → Full chord Fm7 → Degree b7 shows readable active filters. Viewing evidence, opening a matching session, reloading that session and returning preserves the original scope without duplicate outcomes.
9. **Composition-shift protection:** Prior period has stratum A 90/100 and B 5/20; current has A 18/20 and B 25/100. Both strata satisfy question/session thresholds and conditions. Raw totals change 95/120 to 43/120, but within each stratum accuracy is unchanged. Equal pooled weights yield zero percentage-point matched change; the UI does not report ability decline from the changed practice mix.
10. **Real matched change:** Prior A=16/20 and B=10/20; current A=18/20 and B=12/20, with eligible matching questions/sessions. Pooled weights are one half each; matched accuracy goes 65% to 75%, a recorded +10 percentage points. Display denominators and subset coverage, not a claim of proven improvement.
11. **Incompatible versions or difficulty:** Current and prior records differ in generator version, BPM, per-quality target pool or grading method. They remain in current descriptive totals but are not silently combined for a trend. No eligible subset means unavailable comparison, not 0 change.
12. **Timing grain and zero:** A six-note all-correct eligible Play by Ear question with 0 ms delay contributes one valid zero sample. Filtering Fm7 may show a whole question containing Fm7; filtering b7 cannot display a b7 completion time. Wrong, incomplete, pre-Done-replayed or interrupted questions add no normal eligible delay sample.
13. **Dates and missing metadata:** A record exactly at the inclusive local start is included; one at the exclusive end is not. Local calendar boundaries work across DST. Unknown-date records appear only in All/unknown-date evidence; unknown key does not become C. A disclosed session-start date fallback does not pretend to be exact question time.
14. **First evidence and annotation:** Review/retry does not change first outcome or inflate counts. An incorrect self-rating with Unknown is counted incorrect with unspecified degree, distinct from an unassessed position. Stored valid wrong-degree annotation contributes its directed confusion once.
15. **Read failure and empty period:** A storage read exception yields a retry/recovery state while preserving bytes, never a no-records screen. A valid history with no recent notes instead offers period expansion.
16. **Bounded readable presentation:** At 320/390/1440 widths, the main result precedes detailed lists, priorities never exceed three, the initial chord list never exceeds five, and keyboard operation reaches details and setup with visible focus. Hundreds of strata do not become default paragraphs or page-level horizontal overflow.
17. **Old history and identity:** Previously stored played Audiation remains Audiation. Old missing C-source/key/version data stays readable with unknown labels and restricted comparisons; original history/presets and Legacy remain unchanged.

## Out of Scope

- Runtime implementation, ticket decomposition, PR creation or deployment in this specification-writing step.
- Changing the question generator, target pools, audio scheduling, performance-accompaniment completion boundary, first-response grading, or existing practice lifecycle.
- New exercise modes, hidden adaptive difficulty, microphone/MIDI capture, pitch verification, fingerings, per-note instrumental timing or causal diagnosis.
- Statistical significance claims, mastery levels, global ability scores or evidence of live musical transfer.
- Accounts, cloud sync, merging device histories, new analytics services or AI-generated coaching.
- Inferring missing tonics, source progressions, template identity, timestamps or version tags; destructive migrations or resetting historical data.
- Replacing the approved V2 visual identity or modifying Legacy.

## Further Notes

Source design: [V2 Insights information design](V2_INSIGHTS_INFORMATION_DESIGN.md).
Vocabulary: [domain glossary](GLOSSARY.md) and [key/instrumental terms](CONTEXT.md).
Product authority: [Jazz Ear Lab intent](jazz-ear-lab.md).

The user's invocation requests synthesis of the preceding design into a spec.
The 28-day default, presentation thresholds and tie-breaks are specified first-version
engineering defaults, not claims of prior separate statistical approval. Acceptance
numbers are synthetic examples, not the musician's current performance.

No relevant ADR or global tracker configuration was found. Follow the existing
feature-local specification-index pattern for this work only. External issue
publication/triage awaits `/setup-matt-pocock-skills`; do not claim a GitHub issue
or applied external label. The user confirmed the proposed test seam; the
repository-local specification is ready for subsequent ticket decomposition.
This readiness does not authorize starting runtime implementation.
