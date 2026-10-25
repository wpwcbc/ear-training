# Ear Train

<!-- impeccable:product-schema 1 -->

Primary product-direction reference: [Jazz Ear Lab - Project Intent](jazz-ear-lab.md).
The user designated it as the focus for future work on 2026-10-23. It defines
musical intent and evidence boundaries, not approval of particular implementations.

This record describes an existing application, not a new product or a feature
proposal. The user reconfirmed the existing positioning and frequent use of both
desktop and mobile on 2026-10-24.

## Platform

web

## Users

The initial reference user is a theory-literate jazz bassist who wants to hear
and internally imagine pitches in their harmonic context without laboriously
calculating every note. The primary activity is repeated individual practice.
A broader public audience has not been decided.

## Product Purpose

Develop accurate, fast and increasingly automatic hearing of jazz melody within
known harmony: Continuous Harmonic Hearing. Accuracy comes before speed.
Single-chord recognition and audiation are current foundations, not proof that
the full long-term musical outcome has already been delivered.

Recognition, self-assessed audiation and instrumental execution are related but
distinct capabilities. Better in-app results do not establish fluent live
improvisation, verified singing pitch or bass execution.

## Positioning

The confirmed mechanism is hearing a target degree against a known chord, or
internally producing that degree before comparison with its harmonic reference.
The purpose is hearing music in harmony, not merely identifying abstract theory
labels. Public-market positioning and competitive superiority claims are not
established.

## Operating Context

- Desktop and mobile are both frequently used; neither has been selected as the
  exclusive or primary device class. Mobile means the existing browser app,
  not a separately approved native app.
- The V2 loop is choose a preset -> optionally customize -> practice -> review
  session results -> inspect comparable evidence in Insights -> practice again.
- Start launches a valid preset directly. Customize offers independently
  accessible Harmony, Targets and Practice steps; valid edits auto-save to the
  same preset, including editable built-ins with Restore Default.
- Root Pool, Chord Quality Pool and Functional / Exact Degree Pool are
  independent. Chord context audio, question count, volume and Auto Advance are
  practice settings; imagined/sung/played tags apply only to M1.
- Fixed sessions end at the selected count; Unlimited continues until Stop.
  Auto Advance defaults on and can be disabled for manual review and Next.
- Sound is synthesized in the browser. Audio availability can require a user
  action, and interruption must offer recovery without rewriting first evidence.
- Presets and history are browser-local. Frequent desktop and mobile use does
  not imply synchronization between devices or browser profiles.

## Capabilities and Constraints

### Current V2 Practice

V2 Release 1 has an independent entry at `jazz-ear-lab-v2/`. Its implementation
contract is [V2_RELEASE_1_SPEC.md](V2_RELEASE_1_SPEC.md); the confirmed audio and
flow refinements in [V2_UX_AUDIO_REFINEMENT.md](V2_UX_AUDIO_REFINEMENT.md)
supersede the earlier single-chord timing and playback defaults.

- **M1 Audiation:** show the chord and requested degree; initial audible context
  omits the target pitch class. The user imagines, sings or plays the target,
  then presses Done to hear its harmonic reference. Correct/Incorrect is
  self-assessed; Incorrect requires a different imagined degree or Unknown.
  Auto-next waits for both the rating and natural reference completion.
- **M2 Recognition:** hear the target, with chord context when enabled, and
  submit its degree. First-answer correctness and latency remain locked across
  educational retries. Incorrect does not reveal the answer; a correct response
  uses brief confirmation/fade, while explicit Reveal plays a full harmonic
  reference before automatic progression.
- Both exercises support general degree practice, not only Thirds or Guide
  Tones. Functional targets follow chord quality; Exact targets preserve their
  selected degree. Supported extensions and alterations must sound and be
  labelled correctly, with unambiguous answer choices.
- M1 Audiation and M2 Recognition are the primary entry points, each with Start
  and Customize. Saved and focused presets remain secondary. No redundant
  degree-support badges, explanatory homepage copy or mandatory onboarding.
- Results and Insights distinguish self-rated M1 from objectively scored M2,
  correct from incorrect/unassessed outcomes, first responses from retries,
  replay assistance from review, and comparable from incompatible settings.
  Timing versions and sample sizes matter; wrong answers earn no speed credit.
- Supported observations can lead to a user-chosen focused preset, not hidden
  adaptive difficulty or an invented composite mastery score.

### Compatibility and Scope

Keep the existing static TypeScript/browser delivery model and stable shared
musical primitives. V2 has independent flow and `jazzEarLab:v2:*` records;
Legacy uses its existing records, including `jazzEarLab:v1:*`. Do not merge,
reset or silently reinterpret either history.

Preserve local records, presets, routes and preferences. UI work must not
silently change audio, question generation, scoring or analytics definitions.
Insights are scripted and evidence-aware, not an AI coaching endpoint.

Release 2 has not started. Progression audiation/recognition and dictation are
future priorities, not current V2 capabilities or authorization to implement
them. No accounts, cloud sync, collaboration, microphone/MIDI pitch grading,
automatic difficulty progression or AI summary service is in Release 1 scope.

### Open Decisions

Broader audience, public distribution, monetization, competitive positioning
and future instrumental/pitch-verification workflows remain undecided. The
user's usual headphones versus speakers and preferred M1 response method were
not confirmed; do not infer them from the implemented choices.

## Legacy Context

The existing `jazz-ear-lab/` experience retains seven accessible modes:

- M1 Hear a Chord Degree: chord-degree audiation/production.
- M2 Identify a Chord Degree: harmonic-role recognition.
- M3 Same Note, New Chord: common-tone recontextualization.
- M4 Anticipate Next Chord Tone: anticipatory audiation.
- M5 Follow a Progression: hearing/production through changing harmony.
- M6 Bebop Phrase Lab: listen, sing, predict, compare and vary original phrases.
- M7 Ear to Bass: connect heard/imagined pitches to bass fingerboard locations.

Legacy also retains the original scale-degree, interval, chord-quality and
progression trainers, drone/metronome tools and heatmap. Its established loop
is Practice -> configuration -> session -> results -> history. Legacy feature
expansion is frozen except necessary fixes; existing M3-M7 capabilities must
not be presented as already implemented in V2. Production and physical playing
remain self-assessed rather than microphone-verified.

## Brand Commitments

Preserve the existing Ear Train / Jazz Ear Lab naming unless a change is
explicitly requested. The supplied Donezo-inspired reference concerns the
existing visual system, not business features or product scope. Existing
visual decisions remain in the relevant DESIGN.md; this product record does
not replace or extend them.

## Evidence on Hand

- Confirmed musical intent and measurement limits: `jazz-ear-lab.md`.
- V2 contracts and delivery evidence: `V2_RELEASE_1_SPEC.md`,
  `V2_RELEASE_1_IMPLEMENTATION.md`, `V2_UX_AUDIO_REFINEMENT.md`,
  `V2_UX_AUDIO_REFINEMENT_IMPLEMENTATION.md` and `V2_QUESTION_LIFECYCLE.md`.
- Existing implementation: `src/v2/app.ts`, `src/v2/model.ts`,
  `src/v2/question.ts`, shared theory/audio and the preserved Legacy app.
- Automated browser, model and audio-scheduling checks in `tests/` establish
  defined interaction/data behavior, not subjective sound quality or learning
  efficacy. Hardware listening, Safari/iOS and human screen-reader verification
  are not established by headless checks.
- Local practice records support descriptive observations only at their actual
  assessment grain. Do not invent testimonials, validated learning gains,
  clinical/cognitive measurements or proof of live musical transfer.

## Product Principles

1. Accuracy before speed; interpret correct-response latency alongside accuracy.
2. Train hearing within meaningful harmony, not labels detached from sound.
3. Keep objective recognition, self-assessed audiation and bass execution distinct.
4. Preserve musical continuity and direct repeatable practice with minimal steps.
5. Report only what comparable recorded evidence supports; never inflate claims.

## Accessibility & Inclusion

Preserve keyboard and touch operation on desktop and mobile, visible focus,
accessible status/error feedback and sensible focus through question changes.
Controls and evidence must remain usable on narrow screens, and feedback must
not depend on color alone. No additional user-specific accessibility need was
established in this interview; do not present automated checks as certification.
