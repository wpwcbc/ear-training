# V2 Question Lifecycle

User-approved architecture refinement, 2026-10-23. Domain language is recorded
in [GLOSSARY.md](GLOSSARY.md); musical behavior remains governed by
[V2_UX_AUDIO_REFINEMENT.md](V2_UX_AUDIO_REFINEMENT.md) under the confirmed
[project intent](jazz-ear-lab.md).

## Ownership

```text
Practice controls / visibility / pagehide
  -> QuestionLifecycle (one instance per question)
       -> existing AudioEngine / SinglePlayback
       -> existing answer / rate scoring functions
       -> save, render, error and advance notifications
  -> app retains question generation, session creation/end and persistence
```

`src/v2/question.ts` owns question readiness, Done, conditional self-rating,
reference intent, replay attribution, response timing, automatic advancement
and cancellation. Its interface is `act`, a copied read-only `view`, `interrupt`
and terminal `dispose`. The module never reads the DOM, routes or storage.

Depth comes from absorbing ordering obligations, not exposing setters for the
old flags. This gives locality to cancellation and resolution rules, and
leverage to every control that crosses the same question interface.

The browser adapter supplies whether practice is present and visible. Checking
this at awaited continuations also rejects stale work before a delayed browser
event is delivered. Visibility loss and page exit invalidate pending work;
leaving the question disposes its instance permanently. Disposal precedes the
request for the next question, preventing duplicate progression even if old
controls or playback promises are retained.

The app renders the view and sends semantic actions. Live-control checks stay
in the browser adapter so queued clicks on removed controls do not become
educational retries. Session count, untouched-question omission, exposure
retention, preset customization, storage retry, results review and Insights
remain app responsibilities. Results audio retains its separate cancellation
counter; it does not reuse the practice question's lifetime.

## Preserved Behavior

- M1 omits the target pitch class until Done. The existing audio module owns
  live target continuation versus a fresh full reference.
- M1 rating and natural reference completion must both precede auto-next.
  Incorrect opens the wrong-degree/Unknown choice; it does not submit a rating.
- M2 correct uses the existing one-second confirmation and fade. Incorrect
  stays non-revealing; explicit Reveal waits for its full harmonic reference.
- Auto Advance off retains resolved questions for manual Next/Finish.
- First answers, Done times, first-response replay evidence, timing versions
  and historical comparison groups are unchanged by retry or recovery.
- A never-ready mandatory reference is not a replay; additional listening to
  an already-heard reference remains a replay.
- No changes to audio synthesis, scoring calculations, the stored schema,
  Legacy behavior, UI design or exercise inventory. No new framework or runtime
  dependency, generic event bus, storage abstraction or Release 2 work.

## Tests and Verification

The existing browser acceptance seam remains the main end-to-end check. The
expanded lifecycle suite first passed against the old controller in `e4b3163`:
M1 and M2 reference waits cancel on navigation, hidden-tab and pagehide events,
and late successful reference readiness cannot change a replacement session.

`tests/v2-question.test.mjs` adds 13 direct tests at the module interface using
controllable playback handles, not another synth implementation. They cover
both M1 completion orderings, truthful rating, manual mode, M2 confirmation,
immutable retries, Reveal, delayed readiness, interruption and Retry,
first-evidence preservation, and cancellation before browser-event delivery.
Existing audio scheduling tests still exercise the real AudioEngine module.

A RED/GREEN test also caught a missed post-await lifetime check during the
extraction: disposing a question after reference readiness but before Reveal's
continuation must not publish a stale resolution. The continuation now checks
both the instance lifetime and playback operation before publishing.

Verified on the integrated checkout:

- TypeScript build and all 131 Node tests.
- All seven V2 browser suites, including the expanded lifecycle matrix.
- Legacy core and Release 3 browser smoke suites.
- Desktop/mobile entry navigation and enabled axe checks in the V2 suites.

The full Legacy browser battery was not rerun. These checks do not certify
physical speaker/headphone sound, hardware latency, Safari/iOS or human
screen-reader use. This is not a performance benchmark or a data migration.
