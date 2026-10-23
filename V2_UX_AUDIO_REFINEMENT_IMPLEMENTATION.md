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
Final commands and results will be recorded after integration and code review.

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
