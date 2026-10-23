# Jazz Ear Lab V2 — Audio & Practice UX Refinement Spec

> **Status:** Ready for agent implementation; decisions confirmed in GrillMe Q42–Q54.
> **Date:** 2026-10-23
> **Applies to:** Existing V2 Release 1 M1 Audiation and M2 Recognition.
> **Authority:** [Jazz Ear Lab Project Intent](jazz-ear-lab.md) → [V2 Release 1 Spec](V2_RELEASE_1_SPEC.md) → this focused UX refinement where it changes earlier implementation defaults.
> **Intent:** Transfer the parts of V1's musical sound and practice rhythm that the user valued **without recreating V1's complex settings or sacrificing V2's first-answer evidence**.
> **Type:** Behavioral specification only. This document does not implement or authorize Release 2.

## Problem Statement

As a practicing jazz musician using Jazz Ear Lab V2, I find that the newly implemented single-chord exercises are less natural and less fluid than the earlier V1 practice experience.

The V2 chord and reference sounds are short and abrupt, whereas V1's piano-like synthesis, envelope and longer-held chord context felt closer to a useful musical listening experience. V2 can require unnecessary clicks between questions. I also need M1 to demand **genuine audiation**, rather than incidentally making the target note audible as a tone within the initial chord voicing. Reference playback should express the relationship between the target and its chord, not merely sound an isolated target.

The desired improvement is **more musical audio, fewer unnecessary steps, and an unambiguous distinction between generating an answer, comparing it to the reference, and scoring the first attempt**. The interface should remain sparse; this is not a request to reimport all V1 options.

## Solution

Refine the shared single-chord audio and the two V2 practice flows.

**M1 Audiation:** Display the chord and requested degree. Play a naturally sustaining **target-excluded chord voicing**; permit Done from the moment chord playback begins. On Done, add the target pitch to any still-sounding chord without retriggering the chord, or start a complete chord-plus-target reference if the chord has already finished. After the reference is heard, accept binary self-rating. Correct advances automatically after the reference completes. Incorrect first asks which other degree was imagined (or Unknown), then advances automatically after that answer and the reference's natural completion.

**M2 Recognition:** Play the chord and target using the improved sound. Preserve first-response locking and non-revealing Incorrect feedback. A correct answer advances after a short transition (about one second), using a brief fade-out if the original sound is still active. An incorrect answer stays on the same question for retry/replay or Reveal. Reveal plays a **complete chord-plus-target reference** and advances only after that full reference completes.

**Shared:** Auto Advance is **on by default**, but can be turned **off in Practice Settings** to allow manual comparison/replay and Next. Keep **one piano-like timbre**, a natural approximately **2–3-second** sound envelope and minimal controls. Do not require BPM/Beats settings to control the length of a single chord.

### Confirmed primary transitions

| Situation | Result |
| --- | --- |
| M1 chord starts | Done is immediately available; latency runs while chord sounds. |
| M1 Done, chord audible | Keep current chord sounding and layer the target note; do not restart the chord. |
| M1 Done, chord ended (including context-off) | Play fresh chord + target reference. |
| M1 Correct | Record self-rating; wait until reference's natural end; auto-next when enabled. |
| M1 Incorrect | Show error-degree choices **only now**; selection of wrong degree / Unknown completes grading; auto-next when enabled **after** reference natural end. |
| M2 correct first answer or correct retry | Show Correct; about 1 second later next question with graceful audio fade if required. |
| M2 incorrect answer | Show Incorrect **without the correct answer**; stay for replay, retry or Reveal. |
| M2 Reveal Answer | Play full chord + target reference; wait for the reference to finish before auto-next. |
| Auto Advance off | Never automatically move to another question; user may replay and press Next when the question is resolved. |

## User Stories

The actor for these stories is a **Jazz Ear Lab V2 musician**, except where explicitly identified as an accessibility user or developer.

1. As a musician, I want M1's chord name and requested degree visible, so that I know the harmony and audiation target before producing it.
2. As a musician, I want the initial M1 chord to omit the target's sounding pitch class, so that the prompt does not supply the very pitch I must imagine.
3. As a musician, I want target exclusion across octaves, so that a voicing does not leak the target in another register.
4. As a musician, I want an incomplete voicing to remain acceptable when omission removes a root, third or seventh, so that target withholding takes precedence over fully spelling the chord aloud.
5. As a musician, I want the chord symbol to stay visible when its voicing is incomplete, so that harmonic identity remains explicit.
6. As a musician, I want an out-of-chord tension target not to cause unrelated chord notes to disappear, so that the context remains meaningful.
7. As a musician, I want M1's isolated target voice withheld until I press Done, so that I cannot simply imitate a prompted answer.
8. As a musician, I want the M1 chord to start with a natural piano-like attack, so that I hear it as harmony rather than an artificial click.
9. As a musician, I want notes to decay and release naturally, so that their ending does not sound chopped off.
10. As a musician, I want approximately 2–3 seconds of natural sound for a single-chord presentation, so that I have time to listen without a forced short beep.
11. As a musician, I want that natural duration without having to configure BPM and Beats, so that I can start ordinary single-chord practice quickly.
12. As a musician, I want the piano-like sound to be the only timbre in V2 for now, so that I am not distracted by unnecessary timbre selectors.
13. As a musician, I want to press Done as soon as chord playback starts, so that fast audiation is never artificially delayed until the chord finishes.
14. As a musician, I want M1's response timer to begin at chord onset rather than at the end of its sustain, so that the measured interval corresponds to the time I was free to respond.
15. As a musician, I want to press Done while the chord still rings, so that comparison can happen without an audio interruption.
16. As a musician, I want the target layered onto the current chord after Done, so that the reference sounds like a melody note joining the live harmony.
17. As a musician, I want the original chord not to reattack when Done is pressed mid-sustain, so that the comparison feels continuous.
18. As a musician, I want the whole chord and target played afresh if the old chord has already ended, so that the reference remains harmonically intelligible.
19. As a musician, I want M1's first Done time locked before reference playback, so that listening to the answer cannot improve my response-time record.
20. As a musician, I want to rate M1 only after the reference is available, so that Correct/Incorrect reflects an actual comparison.
21. As a musician, I want only Correct and Incorrect self-rating buttons, so that grading is simple.
22. As a musician, I want a Correct self-rating to complete grading with one click, so that frequent correct answers are efficient.
23. As a musician, I want the wrong-degree selector hidden before I press Incorrect, so that normal practice stays visually uncluttered.
24. As a musician, I want to choose which degree I imagined after pressing Incorrect, so that my self-reported confusion can be analyzed.
25. As a musician, I want an Unknown option for that confusion, so that I am never forced to fabricate an incorrect degree.
26. As a musician, I want M1 to wait for the natural reference tail before automatically advancing, so that my comparison audio is not truncated.
27. As a musician, I want M2 to hear the full chord and the target note in the question phase, so that I identify the audible chord-relative degree.
28. As a musician, I want M2's first submitted answer preserved permanently for that question, so that retries do not rewrite my accuracy or reaction time.
29. As a musician, I want M2 to show Incorrect without revealing the target degree, so that I can listen and recognize it again.
30. As a musician, I want M2 replay and retry to remain available after a wrong answer, so that I can learn before seeing the answer.
31. As a musician, I want a correctly answered M2 question to advance without automatically replaying the reference, so that rapid recognition practice remains fast.
32. As a musician, I want a brief Correct confirmation before M2 moves on, so that I see my result without having to press Next.
33. As a musician, I want lingering M2 audio faded out smoothly before the next question sounds, so that successive chords do not overlap or end abruptly.
34. As a musician, I want M2 Reveal Answer to play a full chord-plus-target reference, so that I can establish the correct harmonic sound after a failure.
35. As a musician, I want M2 Reveal Answer to finish its natural sustain before automatic advancement, so that correction receives proper listening time.
36. As a musician, I want a successful retry to remain separately recorded from the first wrong answer, so that practice improvement does not inflate first-answer accuracy.
37. As a musician, I want Auto Advance enabled by default, so that everyday repeated practice does not require a redundant Next click.
38. As a musician, I want to disable Auto Advance in Practice Settings, so that I can pause on one question and replay before manually moving on.
39. As a musician, I want Auto Advance off to offer Next only when a question has been resolved, so that I cannot accidentally bypass the required comparison or error report.
40. As a musician, I want switching Auto Advance not to change my locked answer, first-response time or replay counts, so that my historical evidence remains honest.
41. As a musician, I want completion of a fixed question count to show the session results rather than an extra question, so that the session ends at the intended point.
42. As a musician, I want Unlimited practice to continue until I stop, so that auto-next cannot silently impose a finite limit.
43. As a musician, I want Stop, navigation and session completion to cancel any pending auto-next transition, so that an old timer cannot start another question.
44. As a musician, I want replay while audio is playing to be safe and predictable, so that duplicate sounds and stale callbacks never accumulate.
45. As a musician, I want an audio error to pause the flow and explain how to retry, so that a broken playback does not produce an invalid answer or automatic skip.
46. As a keyboard or screen-reader user, I want focusable actions and accessible status changes, so that rapid automatic transitions remain usable without the pointer.
47. As a musician, I want replay counts and timing validity preserved distinctly from reference playback, so that extra learning listens are not mistaken for first-attempt evidence.
48. As a musician, I want V1 practice and saved history unchanged, so that improving V2 never removes working Legacy behavior.
49. As a developer, I want playback completion and cancellation to have an explicit lifecycle, so that the user-visible rules can be tested without arbitrary timer races.
50. As a developer, I want M1's changed timing policy versioned, so that old and newly measured M1 response times are never silently treated as comparable.

## Implementation Decisions

The following decisions are confirmed behavior except for explicitly marked minimal engineering defaults. **Do not treat this as authorization for new exercise modes or a UI redesign.** Avoid naming implementation files in the implementation contract; use conceptual boundaries.

### 1. Scope and shared primitives

- Refine the **existing V2 M1/M2 practice controller** and the **shared Web Audio engine** at their current interfaces, rather than cloning the V1 app or adding a new audio framework.
- Reuse the proven V1 **piano-like synthesized voice** (currently based on a triangle oscillator and gain envelope), but use an improved note envelope and a longer single-chord plan. **Fixed note duration is approximately 2–3 seconds**, including an audible natural release. Tune envelope proportions for a plausible piano-like response; no requirement to emulate a sampled acoustic piano.
- Use the piano-like sound for chord and target. Do not expose Pad, custom ADSR, BPM, or Beats as mandatory single-chord configuration fields.
- Keep any Legacy audio controls and scheduling paths functioning as before. Do not globally change the behavior of older multi-chord modes by modifying shared defaults without isolating the V2 behavior.
- Use the existing chord spelling / pitch-class / voicing helpers where they produce correct musical results; do not copy duplicate music-theory tables into V2.

### 2. Question and reference audio policies

- **M1 question chord:** derive a chord voicing and remove **every note whose MIDI pitch class equals the target's pitch class**. This removal is mandatory even if the remaining voicing lacks essential chord tones. Keep the written chord symbol unchanged.
- **M1 question target:** never play it as a separate melody note and never leave the same sounding pitch class embedded in the question voicing.
- **M2 question:** play the full chord context plus audible target (subject to the already existing context-on/off choice); the M1 omission rule must **not** affect M2.
- **M1 reference when initial chord still sounds:** preserve the current chord voices and add the target voice without replaying or reattacking the original chord. The added target restores any withheld chord tone to the composite sound; it also adds non-chord degrees/tensions correctly.
- **M1 reference when initial chord has ended or no chord was played:** start the full chord plus target together with natural envelope/tail.
- **M2 explicit Reveal:** start a fresh full chord plus target reference with its own natural envelope/tail.
- Avoid accidental duplicated pitch classes in the reference from a forced chord restart. Chord + Target here means the listener hears the harmonic reference, not that a pitch class must be doubled in separate oscillators.
- A *completion event* (end of the audible planned reference, including release) controls M1 and M2 Reveal auto-next. It must not be approximated by an unrelated UI delay.

### 3. Timing contracts and result integrity

- **M1 response window:** starts when chord playback actually begins (or when the visual prompt is answer-ready if audible context is disabled), **not** after full chord playback. Done is enabled from that readiness boundary while the chord sustains.
- The clock measures user-indicated completion, not verified cognitive audiation or vocal pitch accuracy. Keep all M1 grades self-rated, and keep Imagined/Sung/Played response methods separate.
- Because M1's start boundary differs from the original Release 1 implementation, assign a **new M1 timing policy/version** for newly created questions. Do not mutate previously saved response times. Historical Insight cohorts must not silently merge old and new M1 latency.
- Maintain the existing M2 first-target-onset/answer-ready timing interpretation unless its audio onset contract is changed. If changed, version it too; never retroactively "repair" old latencies.
- Commit Done/first answer exactly once. A chord continuation, fade-out, retry, reveal, rating, or auto-next must not remeasure, reset, or overwrite the original response.
- Track **pre-first-response replays** separately from **post-first/review replays**. The first automatic question playback and mandatory first reference do not count as user-requested replays.
- Store and compare objective M2 correctness independently of M1 self-rated correctness, and preserve Unknown confusion without inventing a degree.

### 4. M1 state flow

- **Question playing / Audiating:** chord context may still be sustaining; Done already enabled. No target pitch audible.
- **Done committed:** first attempt time is locked; begin/continue harmonic reference as above. Allow grading when the reference has become available; do not require full sustain to end before rating.
- **Correct:** commit self-rated correct once; if Auto Advance on, advance after current reference completion. If off, remain for review/Next.
- **Incorrect:** disclose the wrong-degree/Unknown selector **only after** the Incorrect click. The click alone does **not** finish the confusion record. The user must select a valid **non-target** degree or Unknown. Complete the graded outcome and, if Auto Advance is on, advance only after this selection **and** reference completion. If off, remain for review/Next.
- Avoid a persistent wrong-degree selector next to the Correct/Incorrect buttons; the one-click Correct path must remain clean.
- If a user rates early, hold the completed state and wait for reference playback to end before auto-next. The listener must not suffer a cut reference.

### 5. M2 state flow

- **Question playing / Recognizing:** chord plus audible target, relevant degree choices enabled when the first target is ready.
- **First correct:** lock answer and timing, show Correct, wait approximately **1 second** of result visibility, gently fade remaining question audio, then advance. **Do not automatically replay the reference.**
- **First incorrect:** lock first evidence and show only Incorrect. Remain on the same question; allow replay and retries, or explicit Reveal Answer. Never auto-advance at this point.
- **Retry correct:** retain the original incorrect first answer and separately record educational retries; transition like a correct response (short confirmation and fade-out).
- **Reveal Answer:** play fresh full chord plus target; show answer only as part of this resolution; allow the complete natural reference to sound before auto-next.
- M2's reveal behavior is not the same as a correct response; do not apply the one-second fast transition to a Reveal.
- If Auto Advance is off, a resolved M2 question exposes manual review/replay and Next.

### 6. Auto Advance and lifecycle

- Add **one** boolean **Auto Advance** setting for V2 single-chord practice, **default on**. It is a setting, not a separate practice/assessment mode.
- With Auto Advance **off**, do not schedule any automatic Next. Preserve Replay and user-driven Next after resolution. Do not add additional wizard pages or redundant explanations just for this toggle.
- Define an automatic-transition scheduler that is **question/session scoped**, cancellable, and idempotent. Only the active unresolved transition is allowed to advance that question.
- Cancel pending completion/auto-next callbacks when moving manually, stopping, completing a fixed session, starting new audio playback, abandoning practice or navigating away.
- Handle rapid clicks, audio restart, tab visibility change, playback failure and a setting change without double-advancement, stale reference leakage, ghost sound or invalid timing.
- Use Web Audio playback lifecycle / fade-out at the audio-voice level (not merely visual state changes) when ending M2 sound early. Any short fade should be smooth enough to avoid clicks and prevent overlap with the new chord.
- Prefer a small explicit state/lifecycle extension to complex timers scattered through the UI. The *user-visible* flow above is the contract, not the exact scheduling implementation.

### 7. Existing constraints preserved

- Keep root/quality/functional-or-exact degree pools, balanced generator, preset editing, Quick Start, fixed/unlimited sessions, evidence-aware Insights, isolated V2 storage and intact Legacy history.
- Retain Q31–Q35: M1 Correct/Incorrect and wrong degree/Unknown; M2 first-answer correctness immutable, broader unambiguous answer set, incorrect-first retry without early reveal.
- Do not introduce user-facing **All Degrees** badges or explanatory homepage copy. The primary homepage remains M1 Audiation and M2 Recognition, with Start/Customize; no homepage redesign is requested.
- Any changes to stored V2 configuration should be **backwards-compatible** with existing presets and sessions, including a default-on setting when the new optional field is absent. Do not reset or discard saved data.

## Testing Decisions

### Primary test seam

**Prefer one high-level integration seam:** the existing **V2 browser practice acceptance harness**, exercising the whole interaction from Start to question completion with controllable audio timing. Assert **observable behavior and persisted results**, not private timers, implementation-specific DOM structure or exact envelope constant values.

Use the current **browser V2** test family and the existing TypeScript + Node tests as prior art. Extend the existing tests rather than adding an unrelated browser test system. Keep a small audio-engine contract test only where the browser seam cannot reliably observe target omission, voice continuation, fade, or playback-completion events.

### Behavioral tests (minimum required)

1. **M1 pitch withholding:** a G7 question targeting the third audibly/scheduledly excludes all B pitch classes (regardless of octave), still displays G7, and never sounds a separate B before Done.
2. **M1 tension:** G7 targeting b9 leaves nonmatching G7 chord tones intact before Done.
3. **M1 chord incompleteness:** targeting G7 root or third still omits the target pitch even if the written chord quality becomes acoustically less complete.
4. **M1 immediate response:** Done becomes usable at the initial chord onset; a Done before the 2–3-second tail still commits a valid response time and begins reference correctly.
5. **M1 continuation:** Done while chord is active adds target without reattacking chord voices; old chord and new target end naturally.
6. **M1 post-tail reference:** Done after chord ends (or with context off) starts a fresh chord+target reference.
7. **M1 rating:** Correct is one click; Incorrect first opens choices and only a valid wrong degree or Unknown resolves it; no early selector.
8. **M1 natural completion:** grade during a sustaining reference does not advance early; after reference finishes, Auto Advance leads to exactly one next question.
9. **M1 manual mode:** disabling Auto Advance leaves resolved question reviewable until Next.
10. **M2 early correct:** the first correct choice locks answer and time, displays Correct and automatically advances after approximately one second **without replaying reference**.
11. **M2 fade:** when M2 is answered during its sound, outgoing audio fades smoothly without overlap with next question.
12. **M2 incorrect:** first incorrect reveals no correct label, does not advance, and still allows replay and retry.
13. **M2 retry:** a correct retry advances, while first-answer incorrect, first selected degree, original latency and replay attribution remain unchanged.
14. **M2 reveal:** after an incorrect answer, Reveal sounds chord+target through the full natural duration and only then advances.
15. **M2 manual mode:** with Auto Advance off, corrected/revealed questions remain accessible for Replay/Next; no timer fires.
16. **Cancellation:** Stop, navigation, manual Next and session end prevent callbacks from moving any later question or creating ghost audio.
17. **Rapid interaction:** double-clicking grade, Done, reveal or Next cannot generate duplicate answers, duplicate records or skipped questions.
18. **Audio fault:** failure to start/restart playback shows a recoverable status and cannot silently mark a successful graded/timed response or jump ahead.
19. **Fixed/unlimited:** auto-next respects finite question count and manual stop for unlimited practice.
20. **Persistence:** the new Auto Advance default and user overrides survive reload; existing V2 presets and history still load; first-response and replay analytics remain numerically consistent.
21. **Timing version:** newly captured M1 records have the changed timing policy; old records remain unchanged and cannot be combined into like-for-like latency comparisons.
22. **Accessibility:** keyboard-only grading and the timed transition remain understandable and navigable; focus lands in the new question sensibly; feedback is not exclusively visual/color-coded.
23. **Legacy regression:** existing V1 M1/M2 and historical storage continue to work. Changes to V2 note duration do not silently change V1 playback scheduling.

### Quality criteria and what **not** to test

- Test duration at the **behavioral level**: longer natural chord than current sub-second sound; expected approximately 2–3 seconds; reference completion gating and nonclicking fade.
- Do not assert a particular triangle gain-ramp formula or hard-code sample-perfect perceived loudness, which a synthetic/headless test cannot verify.
- A browser audio simulation can verify scheduling, state and playback events, **not subjective timbre quality**. Subjective listening on actual speakers/headphones remains a separate manual check.
- If an additional test seam is necessary, favor the existing audio scheduling API rather than introducing dependency-injection frameworks or a second fake synth implementation.

## Out of Scope

- Release 2 Progression Audiation/Recognition, phrase generation, transcription, or any new exercise modes.
- Restoring the entire V1 wizard, chord settings, metronome, BPM/Beats configuration and other historical controls.
- User-configurable ADSR, sound synthesis editor, selectable Pad voice, sampled piano libraries, SoundFont or external audio dependencies.
- Human pitch detection, microphone grading, MIDI/bass instrument capture or verified singing proficiency.
- Changing V2 default degree coverage, exercise/preset identity, homepage badges/copy, preset semantics or independent chord/degree pools.
- Legacy data migration or mixing V1 and V2 history/Insights.
- Automatically changing difficulty or introducing separate Assessment Mode.
- Reworking session analytics unrelated to the new timing policy and replay/reference attribution.
- Guaranteed precise acoustic onset timing on every physical device.

## Further Notes

### Decision provenance (GrillMe Q42–Q54)

| Decision | Confirmed outcome |
| --- | --- |
| Q42 | M1 exclude target pitch class from initial chord |
| Q43 | Fixed natural approximately 2–3-second piano-like voice; no BPM/Beats for single-chord length |
| Q44 | Auto Advance only after the answer/learning resolution; M2 incorrect first stays for retry |
| Q45 | M2 correct does not trigger a second reference playback |
| Q46 | M1 reference is allowed to end naturally before auto-next |
| Q47 | M1 Done and its clock start at initial chord onset |
| Q48 | If chord rings, layer target on top; if ended, restart full chord + target |
| Q49 | M1 wrong-degree/Unknown chooser is revealed only after Incorrect |
| Q50 | M1 excludes target even when the chord becomes incomplete |
| Q51 | M2 correct uses a short result pause and smooth fade-out to next question |
| Q52 | Auto Advance on by default but switchable off in Practice Settings |
| Q53 | Only piano-like timbre, no Pad toggle |
| Q54 | M2 Reveal Answer plays the complete chord+target reference before auto-next |

### Priority and conflict rules

- The confirmed Project Intent still controls musical learning goals and evidence claims.
- Earlier Release 1 defaults assumed sub-second audio and M1 timing after initial chord presentation. **This spec deliberately supersedes those defaults for new V2 attempts**, requiring a new M1 timing version and honest historical comparison.
- Existing M2 first-answer locking, retry semantics, degree confusion, response-method separation and results evidence remain in force.
- The measured interval must reflect an available Done action; **do not** keep Done blocked until a 2–3-second chord is finished.
- The product preference is **minimal controls, natural audio and unbroken practice rhythm**. If an implementation choice adds an extra step or an unrelated configuration control, first look for a simpler implementation.
- Targeted behavior changes should be implemented and tested incrementally without rewriting V1 or V2 as a new application.

### Ready-for-agent completion checklist

- [ ] M1 question never exposes its target; Done available from chord onset.
- [ ] M1 target layer / fresh reference transitions produce complete harmonic comparison.
- [ ] M1 Correct and completed Incorrect advance after natural reference end.
- [ ] M2 correct advances quickly without reference replay, using a smooth audio fade.
- [ ] M2 incorrect retry and full-duration Reveal are preserved.
- [ ] Auto Advance defaults on, can be disabled, and never causes stale/double transitions.
- [ ] Piano-like single-chord sound is approximately 2–3 seconds and musically less abrupt.
- [ ] Data, timing cohorts, replay attribution and Legacy regression checks pass.
- [ ] No extra modes, unnecessary UI text or unrelated settings are introduced.
