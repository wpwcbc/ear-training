# V2 Configuration, Practice and Answering Layout Redesign

Status: Synthesized on 2026-10-27 from the user-confirmed Impeccable design briefs
and approved compositions. This is an implementation specification, not a claim
that the redesign is implemented, tested or deployed.

Triage recommendation: `ready-for-agent`. External issue publication is pending
repository-wide tracker configuration; this label has not been applied to an
external issue. The existing local progression-ticket convention is scoped to
that earlier feature, not a global tracker configuration.

## Problem Statement

The musician needs to configure a meaningful exercise, hear or produce its notes,
and answer without decoding the interface. V2's four modes have accumulated
separate settings layouts and practice compositions. Related musical information,
answers, feedback and controls are not consistently arranged; long option lists
and repeated metadata make configuration harder to scan. A large generic chord
count or a separate context column can consume space that the actual phrase and
its target positions need.

On a phone, the musician may hold the device to answer or leave it on a desk to
sing/play. A design that is tolerable with a mouse can require scrolling while
performing, hide the relationship between an answer and its chord, or obscure
controls with an attached action bar. Keyboard users also need their position to
survive editing, playback and feedback updates.

The user wants all four modes to feel deliberately designed together: simple to
operate, clear at a glance and visually comfortable, while preserving the musical
practice and honest evidence already implemented.

## Solution

Apply two complementary approved compositions to M1 Audiation, M2 Recognition,
Progression Recognition and Guided Singing:

- **Configuration: C + B.** Four independently accessible chapters—Harmony,
  Target degrees, Practice and Sound—with readable summaries and inline
  disclosure groups inside each chapter. Desktop keeps a concise This practice
  summary and Start beside the editor; mobile stacks readable content and
  reserves space for the Start/save-status area.
- **Practice and answering: A, Harmonic Board.** Associate the actual chord(s),
  requested degrees, target positions, responses and current-question feedback
  directly. Progression chords form columns on desktop and grouped rows on
  mobile; single-chord modes use one focused musical/response group.

Preserve the established V2 visual identity. Configuration grouping, disclosure,
summary and validation presentation may change as specified. Practice is a
layout redesign only: do not redefine playback, answer submission, self-rating,
retry/Reveal, automatic/manual transitions, scoring or recorded evidence.

## User Stories

1. As a musician, I want the four V2 modes to use a coherent layout, so that learning the interface once helps me use every mode.
2. As a musician, I want configuration and practice to share the established visual identity, so that moving between them feels familiar.
3. As a musician, I want to see which mode and preset I am editing, so that I do not change the wrong exercise.
4. As a musician, I want Harmony, Target degrees, Practice and Sound to be independently accessible, so that I can go straight to the setting I need.
5. As a musician, I want to start a valid preset from any configuration chapter, so that setup does not become a mandatory wizard.
6. As a musician, I want collapsed setting groups to show their selected conditions, so that I can understand the configuration without opening everything.
7. As a musician, I want to expand the complete controls for a setting group, so that a simplified overview does not remove musical choices.
8. As a musician, I want multiple groups to remain open, so that I can compare and edit related settings.
9. As a musician, I want my editing position and expanded groups retained when switching chapters, so that I do not repeatedly find my place.
10. As a musician, I want a concise This practice summary, so that I can verify the exercise before starting.
11. As a desktop musician, I want the summary and Start near the editor, so that I can inspect settings and begin without searching.
12. As a mobile musician, I want Start and save status accessible without covering fields, so that I can finish setup using touch.
13. As an M1 or M2 musician, I want root and chord-quality pools edited independently, so that my selected keys do not accidentally redefine chord types.
14. As an M1 or M2 musician, I want the complete supported root and quality choices retained, so that the redesign does not narrow my practice vocabulary.
15. As an M1 or M2 musician, I want All 12 Keys retained, so that I can quickly restore broad root coverage.
16. As a progression musician, I want common templates and custom chords available in Harmony, so that I can start quickly or edit a specific progression.
17. As a progression musician, I want free chord-symbol entry, so that a fixed dropdown does not restrict supported harmony.
18. As a progression musician, I want each chord occurrence's position and beat duration clear, so that repeated symbols remain distinct musical events.
19. As a progression musician, I want to add, remove, reorder and transpose with the existing semantics, so that I can shape the sequence without relearning its musical behavior.
20. As a musician, I want per-quality target pools grouped by quality, so that I can associate each selected degree with the correct harmony.
21. As a musician, I want selected degree summaries visible while a pool is collapsed, so that I can quickly inspect what may be generated.
22. As a musician, I want all legal target degrees available on expansion, so that extensions and alterations remain accessible.
23. As a progression musician, I want target-pool groups derived from my actual chords, so that there is no second quality switch contradicting the progression.
24. As an M1 musician, I want my self-assessed response method accessible in Practice, so that imagined, sung and played responses retain their meaning.
25. As an M2 musician, I want only relevant practice options, so that a production-method control does not imply that recognition is self-rated.
26. As a single-chord musician, I want chord-context and Auto Advance settings retained, so that my established practice rhythm remains configurable.
27. As a progression musician, I want tempo and notes per chord grouped clearly, so that I can adjust melodic load and pace together.
28. As a progression musician, I want count-in explained without a fabricated new setting, so that I understand the existing performance preparation.
29. As a musician, I want fixed question counts and Unlimited expressed clearly, so that I understand session length without interpreting an internal zero.
30. As a musician, I want overall volume separate from voicing mix, so that accompaniment balance is not mistaken for target volume.
31. As a musician, I want each original voicing voice labelled with its own level, so that changing a target does not redefine the voice I adjust.
32. As an M1 or M2 musician, I want the existing unrecorded audition retained, so that I can hear accompaniment without creating practice evidence.
33. As a progression musician, I want the settings UI to expose actual supported capabilities, so that it does not promise an audition or method feature that is absent.
34. As a musician, I want valid changes saved to the identified preset, so that I can tell what will persist.
35. As a musician, I want unsaved changes distinguished from validation errors, so that I know whether to correct input or retry saving.
36. As a musician, I want invalid fields explained inside the relevant group, so that I can correct them without searching hidden sections.
37. As a musician, I want invalid drafts and the last valid saved preset kept distinct, so that a failed edit does not destroy working settings.
38. As a musician, I want Start disabled for an invalid draft with a visible reason, so that I cannot unknowingly launch different settings.
39. As a musician, I want existing preset-management and history actions available but secondary, so that they do not compete with starting practice.
40. As a musician, I want mode, question count and Stop in a compact task band, so that session control stays predictable.
41. As a musician, I want the actual music to lead the practice screen, so that a generic chord-count heading does not displace the task.
42. As an M1 musician, I want the chord and requested degree in one focused group, so that I can read the target before producing it.
43. As an M1 musician, I want Done and reference status associated with the target, so that checking does not make the music jump elsewhere.
44. As an M1 musician, I want Correct and Incorrect to have equal visual weight, so that the layout does not bias my self-rating.
45. As an M1 musician, I want the existing wrong-degree or Unknown choice near the rating controls, so that I can record an incorrect response clearly.
46. As an M2 musician, I want the known chord above the complete existing answer-option grid, so that I can choose a degree directly.
47. As an M2 musician, I want stable feedback beside the answer area, so that I can distinguish first correctness from a successful retry.
48. As an M2 musician, I want Replay, Reveal and Next/Finish only in their established states, so that visual redesign does not change the exercise.
49. As a progression-recognition musician, I want every target position directly associated with its chord, so that I do not mentally match separate lists.
50. As a progression-recognition musician, I want the complete answer board available in any order, so that uncertain middle notes do not block confident answers.
51. As a progression-recognition musician, I want replay to retain my selected answers, so that another listen does not erase my work.
52. As a progression-recognition musician, I want one joint submission and separate note outcomes, so that partial correctness is represented accurately.
53. As a progression-recognition musician, I want my response and correct degree compared at the same target position, so that checking follows the original music.
54. As a guided-singing musician, I want the entire requested phrase visible from the start, so that I can prepare before the accompaniment pass.
55. As a guided-singing musician, I want Done after the phrase and subject to existing readiness, so that checking follows the complete performance.
56. As a guided-singing musician, I want self-rating controls immediately below their target degrees, so that each note retains its musical context.
57. As a guided-singing musician, I want unrated positions visibly distinct, so that partial self-rating is not presented as a whole-run verdict.
58. As a musician, I want playback, readiness, checking and interruption states clearly expressed, so that I know what I can do next.
59. As a mobile musician, I want neighbouring target positions arranged readably, so that I can follow or answer a phrase without tiny controls.
60. As a musician with a long progression, I want the same board to scroll naturally, so that no notes disappear behind pagination or forced serial editing.
61. As a keyboard user, I want reading order, focus and disclosure state to remain coherent, so that I can configure and complete practice without restarting navigation.
62. As a musician, I want clear labels and text-based feedback, so that colors and icons are not the only explanation of a state.
63. As a musician, I want existing first-answer and first-rating evidence preserved, so that retries or layout changes cannot inflate my results.
64. As a returning musician, I want presets, sessions and historical replay preserved, so that the redesign does not damage earlier practice.
65. As a musician, I want recognition, self-rated production and unassessed positions distinguished, so that the interface does not claim verified singing accuracy.
66. As a musician, I want desktop and phone layouts checked with real controls and long content, so that attractive design examples do not hide unusable states.

## Implementation Decisions

### 1. Authority, scope and ownership

- Implement the confirmed A practice/answering composition and C+B configuration
  composition, not the discarded alternatives. Preserve their topology and
  information hierarchy rather than merely borrowing colors.
- This specification replaces older three-category configuration presentation
  and separate context/response practice composition where they conflict with
  these approved layouts. It does not supersede musical, audio, generation,
  lifecycle, assessment, storage or analytics contracts.
- Existing V2 configuration/preset presentation, single-chord practice adapter,
  progression presentation, shared visual primitives and browser acceptance
  coverage are the affected areas. Reuse the current model, validators, question
  lifecycle and audio interfaces; no replacement state machine or audio engine.
- A shared presentation vocabulary must not imply identical capabilities or a
  merged exercise model. Keep mode identity explicit and expose only supported
  controls. Retain existing direct Start and Customize entry semantics.
- No data-schema, API, record migration or synchronization change is required.
  Keep display/disclosure state separate from musical configuration and records.

### 2. Visual translation and common components

- Retain Source Sans 3, black navigation, restrained signal yellow, cool open
  ground, white controls, fine rules and flat modest corners. Do not add a new
  identity, decorative graphics, nested dashboard cards or invented mastery
  metrics. Yellow identifies the active task/category or primary action.
- All navigation remains available on mobile; no new hamburger/hidden-menu flow.
  Render labels and controls semantically, never as a raster of the comp.
- Body copy and control values remain readable at narrow widths. Interactive
  targets have at least the established 44px touch floor; disclosure headers
  are fully operable. Preserve visible focus, sufficient contrast and text/state
  semantics beyond color alone.
- Generated example values, wording glitches, duplicated/misordered choices,
  disabled appearances or miniature preview proportions are not behavioral
  authority. Actual legal choices, labels, states and counts come from the
  existing musical contracts and the accessible runtime UI.

### 3. Configuration chapters and inline disclosures

- Use Harmony, Target degrees, Practice and Sound as independent categories, not
  wizard steps. A valid preset can start from any chapter without visiting others.
- Each chapter contains labelled disclosure groups. Collapsed headers show current
  selected conditions/counts; expanded groups provide complete editing controls.
  Multiple groups may stay open. Selecting a chapter does not mutate music or save
  a different preset merely because a panel became visible.
- Initially open the main editing group for a chapter. Preserve group expansion,
  editing position and focus when switching chapters or updating controls within
  the current editing context. This does not require new cross-device or permanent
  browser-storage preferences.
- Summaries and full controls must describe the same draft. Keep complete selected
  content available when long; do not silently drop degrees or replace a custom
  progression with a convenient preset to shorten the overview.
- Desktop uses a broad editor and a concise This practice/Start area beside it.
  Mobile uses one readable column, a concise summary with access to full
  conditions, and a bottom Start/save-status region with reserved content space.
  Keyboard focus, open groups and validation messages must never be obscured.

### 4. Configuration field mapping

| Chapter | M1 Audiation | M2 Recognition | Progression Recognition / Guided Singing |
| --- | --- | --- | --- |
| Harmony | Independent root and chord-quality pools; preserve All 12 Keys. | Same independent pools. | Common templates; free chord-symbol inputs; per-occurrence beats; add, remove, reorder and transpose. |
| Target degrees | Per-quality target-pool disclosures for selected qualities, with selected-degree summaries and all legal choices. | Same grouping; answer options remain a different concept from eligible targets. | Groups derive from qualities used by the progression; no separate quality-enable switches. |
| Practice | Fixed questions/Unlimited, audible context, Auto Advance and the self-assessed imagined/sung/played method. | Fixed questions/Unlimited, audible context and Auto Advance; no M1 method control. | BPM, targets per chord, fixed questions/Unlimited and count-in explanation; no fabricated M1 method or single-chord context/Auto Advance switch. |
| Sound | Overall volume, original-voice voicing mix and the existing unrecorded accompaniment audition. | Same existing sound capabilities. | Overall volume and original-voice mix; do not add unsupported audition controls. |

- Group single-chord Harmony into Roots and Chord qualities. Group progression
  Harmony into template/transpose and editable chord sequence. Preserve the full
  supported vocabulary and independent root/quality selections.
- Each progression row retains its occurrence identity, chord input, beats and
  contextual action names. Repeated symbols remain separate occurrences. Chord
  entry is free text for supported symbols, not a newly restricted dropdown.
- Practice separates session length from relevant response/listening behavior
  or progression tempo/note density. Sound keeps overall output easy to adjust
  and original-voice balance separately expandable; voicing mix is not melody
  volume. Existing single-chord audition remains unrecorded practice.
- Preserve ranges: 0–200 questions (0 = Unlimited); 2–32 progression occurrences;
  1–16 beats per occurrence; 20–300 BPM; 1–4 target positions per chord; five
  original-voice levels at 0–200%; overall volume at 0–100%. Keep existing
  transpose, voice identity, supported degree and chord-quality semantics.

### 5. Presets, draft validity, saving and Start

- Identify the mode/preset being edited and where valid changes are saved.
  Preserve automatic saving to that preset and last-valid saved-data protection.
  Do not replace auto-save with a new Save/Next workflow.
- Preserve the draft through chapter/disclosure changes and correctable errors.
  Update summaries from it without labelling an invalid or failed write as saved.
- Missing required pools, invalid chord symbols and out-of-range values expose
  nearby actionable errors in their relevant chapter/group. Automatically reveal
  the affected group; when another chapter owns the error, provide an explicit
  route to it rather than a hidden off-panel failure. Disable Start while the
  current draft is invalid and explain the reason.
- Storage failure is distinct from musical validation. Keep the intended draft,
  show unsaved status and an explicit retry/recovery path. Preserve the existing
  policy for a valid-but-unsaved draft; do not invent a requirement that every
  valid practice session must first achieve durable storage.
- Keep restore/delete/rename, save-as-new and session-history actions subordinate
  and only where supported for that mode/preset. Retain existing confirmations,
  data-preservation semantics and preset isolation. No fabricated shared manager.

### 6. A practice composition: common harmonic board

- A compact task band shows mode, question count/Unlimited and Stop. The working
  board contains actual chord symbols and target positions; do not lead with an
  oversized generic chord-count placeholder or a redundant context sidebar.
- On desktop, progression chord occurrences form columns, with their ordered note
  positions, targets/responses and current-question outcomes directly underneath.
  Longer sequences may wrap into further groups/rows; preserve musical order.
- On mobile, stack chord groups vertically and put neighbouring positions side by
  side where readable. Four-note groups may use two rows. Maintain one complete
  progression answer board; native vertical scrolling is allowed for long content.
- Single-chord modes use one focused, bounded musical/response group. Do not create
  empty progression columns or stretch one control across a vacant desktop region.
- Keep playback/readiness and current-question feedback near the relevant task;
  the primary operation follows the musical/response board. Replay and session
  settings are subordinate. Reserve stable feedback space and preserve target
  context across checking, without unnecessary whole-page repositioning.

### 7. Mode-specific practice and checking

| Mode | Practice layout | Checking layout and invariant behavior |
| --- | --- | --- |
| M1 Audiation | Known chord and requested degree together; subordinate response-method/self-rating provenance; Done after this group. | Keep reference status near the same target. Correct/Incorrect are equal-weight adjacent controls. Wrong-degree/Unknown selection expands near them in the existing state. Preserve readiness, reference completion and auto-next/manual-next boundaries. |
| M2 Recognition | Known chord above the full legal degree-button grid; Replay near musical context. | Stable nearby feedback, including correct-on-retry distinction. Preserve first response, retries and Reveal behavior; do not reveal an answer merely because layout state changed or trim answer options to the target pool. |
| Progression Recognition | Every target position and its answer control within the corresponding chord group; all positions available for arbitrary answer order after the complete listen. | Replay retains choices. Preserve Don't know, complete-answer joint submission and separate note outcomes. Compare selected/correct degrees at the same target positions; retain established reference and Next/Finish behavior. |
| Guided Singing | All requested degrees in their chord groups from the start, before the accompaniment pass; Done after the complete phrase. | Preserve the initial-pass Done gate and full-reference boundary. Then put individual self-rating controls immediately below their degrees. Retain wrong-degree/Unknown and partial/unassessed states; do not substitute a whole-run rating or verified-pitch claim. |

- Practice is layout-only: no new selection drawer, forced per-note screen,
  pagination, serial answer gating, hidden target, different reference sequence,
  additional required submit action or altered automatic transition.
- Musical/keyboard reading order must agree. Every answer/rating has unambiguous
  chord-occurrence and target-position context, including repeated chords.
- Maintain button enablement and existing first-evidence locking across all
  preparation, playing, ready, answer, retry, Reveal, reference, rating,
  Next/Finish, interruption and unsaved-error states.

### 8. Responsive, keyboard and assistive behavior

- Desktop and mobile are equal requirements. The musical target and controls must
  support both hand-held answering and viewing from a desk while singing/playing.
- Prioritize simultaneous reading of the default three-chord/six-note phrase on
  a typical 390px phone. At 320px, retain readable labels, full legal controls and
  access to all positions; do not shrink them to guarantee an impossible fit for
  every device/content combination. Do not promise 128 positions in one viewport.
- Long settings/pools, chord lists and practice boards may scroll vertically.
  Do not introduce whole-document horizontal overflow, clipped critical labels,
  covered input/error regions or unreachable final controls. Any existing detailed
  evidence scroll region outside this scope remains local to that evidence.
- Provide native/appropriate accessible chapter and disclosure semantics,
  explicit selected/expanded states and labelled field/fieldset relationships.
  Repeated beats, reorder/remove and rating controls carry musical context.
- Preserve focus after settings/answer updates and intentionally move it when a
  completed action disappears, including to the next unrated position or existing
  Next/Finish as appropriate. Bring the target into view without disruptive scroll
  on unchanged controls. Playback completion must not send users back to BODY.
- Keep visible status and persistent live feedback consistent with the current
  mode/question; clear obsolete announcements on navigation. Do not announce
  every animation frame or replace visible state with an audio-only message.

### 9. Evidence and compatibility

- Keep existing audio scheduling, generator behavior and target/voicing separation.
  Preserve context exclusion/reference policy, replay assistance versus review,
  correct-response timing boundaries and interruption validity.
- Recognition remains objectively selection-graded; M1 and Guided Singing remain
  self-assessed. Preserve correct/incorrect/unassessed distinctions, first-response
  evidence, frozen session configuration and historical replay.
- Preserve existing Results/Overall totals, including per-note progression
  accuracy and exclusion of progression speed. These views receive compatibility
  regression checks, not a new visual redesign under this specification.
- Existing approved briefs settle the composition and mode mappings. Additional
  states use that grammar and the current lifecycle contract; lack of a standalone
  comp for every state is not permission to invent another layout or workflow.

## Testing Decisions

### Primary seam and confirmation provenance

Reuse the user's previously confirmed highest-level V2 flow: **Customize →
optional existing audition → Practice → current-question check/self-rating →
Results → Overall Insights**. Apply the new chapter/disclosure and board
acceptance through the existing browser-rendered interface. This specification
adds no new audio/model test seam and does not reopen that confirmed choice.

Test public observable behavior using labelled fields, headings, groups, buttons,
visible status, focus and resulting saved records. Do not test helper structure,
private component state or a particular CSS class hierarchy. Existing public
model/audio checks remain regression evidence where timing, synthesis gain or
statistics cannot be reliably inferred from the UI; do not add layout-driven
unit tests that merely mirror markup or CSS.

### Acceptance coverage

| Case | Observable acceptance |
| --- | --- |
| T1: Four-mode config | All four chapters are independently reachable in every mode; correct mode-specific fields appear; supported settings are accessible; a valid preset starts from any chapter. |
| T2: Summaries/disclosures | Collapsed summaries match selected draft values, full options expand, multiple groups remain open, and chapter changes preserve position/values without saving unrelated configuration. |
| T3: Single-chord editing | Independent roots/qualities, All 12 Keys, per-quality targets, relevant Practice options, volume/mix and existing unrecorded audition work; no BPM/progression-only controls appear. |
| T4: Progression editing | Common/custom/repeated chords, beats, add/remove/order/transpose, target pools, tempo/note density, count and mix remain correct; no quality-enable, M1-method or unsupported audition controls appear. |
| T5: Invalid/unsaved recovery | Empty required selections, invalid symbols and range violations expose the right field/group and block Start; draft survives navigation; save failure shows unsaved/retry and retains the last valid saved preset. |
| T6: M1 layout/state | Chord/degree stay associated; Done, reference, equal-weight self-rating, wrong-degree/Unknown and fixed/Unlimited automatic/manual transitions retain existing behavior and first evidence. |
| T7: M2 layout/state | Full legal answer options, stable first/retry feedback, replay, explicit Reveal and established transition gates remain intact; target-pool edits do not silently trim response options. |
| T8: Progression Recognition | Whole initial pass gates answering; early/late/middle entries can be selected in arbitrary order; replay retains choices; missing positions prevent joint submission; per-note checking retains board alignment and first grades. |
| T9: Guided Singing | Degrees are available before the performance pass; default phrase is readable; Done/reference gates remain; per-note controls stay with targets; partial ratings leave other positions unassessed. |
| T10: Keyboard/status | Chapters, disclosures, repeated chord controls, answers and ratings are keyboard operable; focus survives updates, playback and disappearing controls; visible/live state matches the current task. |
| T11: Responsive/content | Desktop, 390px and 320px layouts preserve hierarchy, labels and access; final controls/errors are not covered; long pools and 32-chord/four-target content remain operable without page overflow or forced pagination. |
| T12: Records/regression | Existing presets/history/reload, direct Start/Customize, interruption recovery, first evidence, note-grain Overall accuracy and unavailable progression timing remain consistent. |

Exercise minimum, typical and maximum progression content: 2 chords × 1 target,
3 chords × 2 targets and 32 chords × 4 targets, including repeated symbols and
long supported altered/extended chord labels. Check range boundaries and an
invalid value rather than only happy-path examples. Use isolated synthetic data
and storage-failure injection; never alter a user's browser records for tests.

Capture desktop 1440×1000 and phone 390×844/320×844 representative config,
practice, answer/check and error states. Compare the actual runtime composition
with the approved boards and inspect touch/focus visibility and content overflow.
Use representative tab-to-stack boundary and zoom checks when adapting the
layout; avoid repeated screenshot polishing after a bounded inspect/fix/confirm
pass. Pixel equality with generated mockups is not a behavioral test, and their
sample lettering is not a golden source of musical data.

### Prior art and release evidence

Reuse the existing V2 browser coverage for target pools/voicing mix/Overall, M1
grading and lifecycle, progression replay/answer order/self-ratings, and recent
critique fixes for keyboard focus, session links and narrow-screen content.
Update assertions that explicitly depend on replaced labels/layout while keeping
the musical and evidence expectations. A screenshot of a new arrangement alone
is not a completed test of these flows.

Run the normal TypeScript build, meaningful unit/model/audio regression coverage
and affected browser suites during implementation. Report inherited baseline
failures separately; do not weaken unrelated assertions to manufacture a pass.
Browser tests do not establish physical audio quality, Safari/iOS behavior, human
screen-reader usability or learning efficacy. This documentation step has not
run or passed future implementation acceptance.

## Out of Scope

- Implementing the redesign, generating tickets or executing an engineering
  workflow as part of this spec-writing task.
- New modes, Legacy redesign, homepage redesign, a full session Results/Insights
  redesign or a new brand/visual identity.
- Changes to note generation, chord parsing semantics, voicing, audio sequence,
  target register, rhythm/count-in rules, scoring, assistance/timing definitions,
  statistics or historical-data interpretation.
- Microphone/MIDI pitch grading, verified-singing claims, instrumental assessment,
  adaptive difficulty, cloud sync/accounts or a new persistence/audio framework.
- Mandatory wizard steps, per-note question screens, forced serial progression
  answers, pagination hiding targets, removed legal degree choices or fabricated
  controls added to make modes look uniform.
- Treating discarded comps, generated example values or historical screenshot
  defects as new product requirements.

## Further Notes

### Approved design sources

The three approved images were opened and visually inspected while synthesizing
this specification; their paired JSON approval flags and generation provenance
must remain available to implementers.

- [Practice/answering A brief](jazz-ear-lab-v2/.impeccable/surfaces/v2-practice-layout.md)
- [Approved A desktop/mobile composition](.impeccable/mocks/decision/v2-practice-shape-2026-10-27/A-harmonic-board.png)
- [Configuration C+B brief](jazz-ear-lab-v2/.impeccable/surfaces/v2-config-layout.md)
- [Approved C+B progression composition](.impeccable/mocks/decision/v2-config-shape-2026-10-27/CB-progression.png)
- [Approved C+B single-chord composition](.impeccable/mocks/decision/v2-config-shape-2026-10-27/CB-single-chord.png)
- [Established V2 design system](jazz-ear-lab-v2/DESIGN.md)

### Product, vocabulary and existing behavior

- [Confirmed product intent](jazz-ear-lab.md)
- [Domain glossary](GLOSSARY.md)
- [Single-chord specification](V2_RELEASE_1_SPEC.md)
- [Audio/UX refinement contract](V2_UX_AUDIO_REFINEMENT.md)
- [Question lifecycle ownership](V2_QUESTION_LIFECYCLE.md)
- [Per-quality targets, mix and Insights contract](V2_TARGET_POOLS_VOICE_MIX_INSIGHTS_SPEC.md)
- [Progression behavior contract](V2_PROGRESSION_MODES_SPEC.md)
- [Existing critique-fix behavior and validation limits](V2_CRITIQUE_FIXES.md)

Use glossary terms such as chord quality, per-quality target pool, answer options,
voicing voice, audition, progression question, target position and progression
note outcome consistently. No ADR directory or global domain-agent configuration
was found; do not invent ADR decisions. Older product documentation that calls
progression a future priority does not invalidate its subsequently approved and
implemented behavior.

### Publication and readiness

There is no repository-wide issue-tracker/triage configuration. Run
`/setup-matt-pocock-skills` before external publication as required by `to-spec`;
the earlier repository-local progression ticket agreement is explicitly limited
to that feature. The local spec is complete and its intended triage role is
`ready-for-agent`; an external issue and label are not claimed to exist.

The Impeccable helper was unavailable during design exploration. Approved images,
chat confirmations and briefs are the authority; no automated concept selection,
visual-detector pass or completed runtime redesign is implied. This specification
requires no new design interview and changes no existing application source.
