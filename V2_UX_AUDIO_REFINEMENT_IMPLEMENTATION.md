# V2 Audio and Practice Refinement Delivery

Contract: [V2_UX_AUDIO_REFINEMENT.md](V2_UX_AUDIO_REFINEMENT.md), under
[jazz-ear-lab.md](jazz-ear-lab.md) and [V2_RELEASE_1_SPEC.md](V2_RELEASE_1_SPEC.md).
Integration branch: `v2/ux-audio-refinement`, based on `b261b9d`.

## Ticket graph

| Ticket | Deliverable | Blocked by |
| --- | --- | --- |
| [1](https://github.com/wpwcbc/ear-training/issues/1) | V2 natural sound and playback lifecycle | None |
| [2](https://github.com/wpwcbc/ear-training/issues/2) | Default-on Auto Advance and M2 correct transition | 1 |
| [3](https://github.com/wpwcbc/ear-training/issues/3) | M2 correction and full harmonic Reveal | 2 |
| [4](https://github.com/wpwcbc/ear-training/issues/4) | M1 target withholding, continuation and onset timing | 1 |
| [5](https://github.com/wpwcbc/ear-training/issues/5) | Conditional M1 confusion and reference-gated transition | 2, 4 |
| [6](https://github.com/wpwcbc/ear-training/issues/6) | Interruption recovery, races and regression acceptance | 3, 5 |

## Verification contract

The specification already selects the existing V2 browser acceptance boundary:
Start, observable audio lifecycle, user actions, question progression and saved
outcomes. Small audio scheduling contract tests may verify pitch-class omission,
voice continuation, completion and fade where browser actions cannot inspect
those musical details reliably. Do not test private UI timers or exact envelope
coefficients. Use red/green increments within each ticket.

Baseline before application edits: TypeScript build and 110 unit tests passed.

## Runtime decisions

- V2 voices use the existing triangle-based synthesis with a natural 2.5-second
  envelope. Legacy callers keep their original envelope and beat scheduling.
  M2 question readiness remains the original 120ms target-onset boundary.
- A single-chord playback handle separates answer readiness from audible
  completion, owns cancellation/fade, and resolves completion from source-ended
  events. Suspending the audio clock cannot satisfy a reference completion gate.
- M1 question voicings omit every target pitch class. Done is usable from
  chord onset (40ms scheduling lead), or visual readiness with context off.
  Live reference adds the target without reattacking the existing chord; after
  its tail/context-off, a full harmonic reference is started. Fresh references
  avoid doubling the target class in chord and melody voices.
- New M1 attempts use `v2-m1-chord-onset-2`; older stored versions/times are
  unchanged. Existing cohort keys separate these measurements. M2 retains
  `v2-answer-ready-1`. Singing/playing remain self-reported, not pitch-verified.
- `autoAdvance` is an optional boolean in persisted configurations. Missing
  values mean on; explicit off remains off after reload. Validation clones
  input rather than rewriting historical snapshots. Preset overrides/Restore
  Default and all independent pools remain intact.
- M2 Correct/correct retry shows about one second of confirmation, fades active
  outgoing voices, then advances without another reference. Wrong stays for
  retry. Explicit Reveal always includes harmony, even with question context
  off, and finishes its natural tail before advancing.
- M1 Correct is one click. Incorrect only opens the non-target/Unknown chooser;
  selection completes the self-rating. Auto-next requires both completed grading
  and reference completion, whichever happens last. Manual off keeps review and
  Next/Finish available. Final fixed questions use the same completion gate.
- Initial question/mandatory first reference are not replays. Explicit review
  listens are post-first replays. Retries and references cannot replace first
  answers, first latencies or pre-first replay evidence; historical counters
  are not retroactively rewritten.
- The question/session-scoped transition is cancelled by replay, manual Next,
  Stop, navigation, visibility loss, playback failure and session completion.
  A resolved Replay gets a new full-reference completion gate, not the old fast
  confirmation deadline. Removed/disabled buttons cannot execute queued actions.

## Acceptance coverage

`npm run test:v2` runs the existing browser family plus the focused acceptance
files, all using the existing Edge/Playwright boundary and real browser audio:

| Spec cases | Checks |
| --- | --- |
| 1-6: withholding, onset and continuation | M1 browser and small audio scheduling contracts; cross-octave pitch omission, tension preservation, queued end-event edge case, live/fresh/context-off references |
| 7-9: self-rating and natural completion | M1 grading browser; early/late wrong selection, Unknown, one-click Correct, suspended audio, fixed/Unlimited and manual mode |
| 10-15: recognition and Reveal | Auto Advance and Reveal browser files; first-answer lock, retries, no early answer leak, fade ordering, full harmonic reference and mandatory-reference attribution |
| 16-19: cancellation, races and sessions | Lifecycle plus Auto Advance/M1 grading browser checks; stale actions, Stop/navigation/visibility, failed restart, actual completion and finite/Unlimited boundaries |
| 20-21: persistence and timing cohorts | Configuration/model tests, M1 browser, existing V2 acceptance/homepage; old snapshots preserved, optional setting reload/restore and separated timing policies |
| 22-23: accessibility and Legacy | Keyboard grading/choice/Next focus, narrow layout and optional axe, byte-preserved V1 records and existing Legacy M1/M2/history/audio smoke |

The original V2 browser fixtures were updated to exercise the new contracts,
not disabled: audio spies forward all policy arguments, Correct becomes usable
before reference completion, and Incorrect opens a chooser instead of producing
a validation error. Dedicated default-on and manual cases remain separate.

## Verified delivery

- `npm test`: TypeScript build and 118 unit tests passed.
- `npm run test:v2`: all seven browser acceptance files passed, including
  persistence/errors, pools, source isolation, real completion gates, keyboard
  focus, races and all M1 response methods.
- Legacy core and Release 3 browser smoke passed, including M1/M2, history,
  replay/cancellation and persistence. The full 14-file Legacy battery was not
  rerun for this focused change.
- Captured V2 desktop/mobile states and the conditional mobile chooser passed
  the enabled axe WCAG A/AA tag checks. Desktop settings/reference and mobile
  chooser were inspected in one batch and a confirmation round. The final
  batch removed duplicate chooser copy and gave Practice checkbox labels 44px
  hit areas; focused grading and Auto Advance tests passed again.
- RED/GREEN regression checks reproduced queued stale answers being counted as
  retries and resolved Replay losing auto-next. Removed controls are now ignored,
  and successful reference replay/Retry gets its own real completion gate.

Final code review compares the integration branch with baseline `b261b9d` on
the Standards and Spec axes before the draft PR is marked ready. Tickets are
linked for automatic closure when that PR is merged; this delivery does not
silently merge the integration branch into `main`.

## Manual listening limits

Automated scheduling and browser checks do not establish subjective acoustic
quality. Actual headphones/speakers should verify:

- A natural attack, decay and release, with about 2-3 seconds of audible sound.
- G7/Third M1 context contains no B before Done; G7/b9 retains unrelated tones.
- Done during sustain adds the target without another chord attack.
- Done after the tail and context-off produce a complete harmonic reference.
- M1 and M2 Reveal retain the full comparison tail before advancing.
- Fast M2 correct transitions fade without clicks or overlapping new chords.

No physical-device, human pitch, hardware latency, Safari/iOS or screen-reader
certification is implied by synthetic/headless tests. No Release 2 work is in
scope, and Legacy data must remain unchanged.
