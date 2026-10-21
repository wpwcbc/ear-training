# Insights v2

Implements the Jazz-first release of the supplied Insights design, using native
TypeScript and the existing static application. No remote analytics, account,
microphone or physical performance measurement is introduced.

## Delivered

- `#/insights` overview and M1-M7 detail routes, including mandatory M2, M3,
  M4, M5 and M7 task splits; query filters survive navigation and drill return.
- Separate recognition components, self-rating distributions, sequence/run
  coverage, transition snapshots, phrase marking precision/recall and optional
  stage self-ratings, and pre-reference bass string/fret/MIDI mapping. Automatic,
  visual mapping and physical self-rating evidence remain separate throughout.
- Actual-context evidence tables, historical timing labels, source/exposure
  filters, explicit missing/unknown states, and exact stored-question review.
- Versioned Wilson thresholds, independent question sampling, cross-session/day
  sufficiency, stale-evidence checks and deterministic priority categories.
  No universal slow-answer threshold, pooled ear-training score or mastery claim.
- Matching 28-day outcome comparisons keep task/settings/measurement versions
  and fresh/targeted/exact-review exposure separate. Unsupported speed diagnosis
  is not inferred from old response timers. Matched new timing has its own
  cross-session/day gates and labels faster/lower-accuracy trade-offs.
- IndexedDB `earTrainingInsights` with sessions, questions, events, assessments,
  imports, drillPlans and metadata. Durable localStorage outbox plus stable IDs
  reconciles completed submissions. Submission events retain the immutable
  assessment payload to rebuild projections. v1 mirrors use the same ID.
- One-time read-only historical import retains source bytes and row indices,
  including legitimate identical records. New evidence survives v1 retention.
- Local JSON backup/restore, validation, scoped clear, visible save errors and
  data health. Clearing Insights does not erase original trainer history.
- Monotonic decision timing excludes context playback and explicit pauses;
  reload/settings changes invalidate timing, not valid outcomes. Timed reveal
  without Ready has no response duration. Continuous/phrase runs never claim
  first-answer speed. M4 Ready is declared readiness, not pitch correctness.
- M1/M2/M7 single-quality/degree drills validate ten actual snapshots before
  launch: normally 7 focus and 3 contrasts; an observed M2 degree confusion
  uses a balanced 5/5 pair. M1/M2/M7 diagnostics balance ten questions across up
  to five compatible cells. Root scope is explicitly narrowed to the observed
  context. Actual UI answer choices remain independent of generation pools.
- Dedicated drill sessions, unchanged Saved presets, Recent updates, Repeat
  focus, Matched check, Save settings and Return to insight summary actions.
- Legacy Degree, Interval, Chord Quality and Progression ID compatibility
  panels. Historical solved-only first-try rates are qualified; historical
  Progression ID rows never create independent correctness claims. New trials
  and Drone activity use the capture described below.

## Completed Follow-up

The previously deferred implementation items are now available:

- M2 hidden-quality confusion sets balance five expected examples of each
  quality and verify the actual degree/quality of all ten questions.
- M3 focuses a selected or incorrectly recognized role pair using an explicit
  held MIDI constraint. Seven forward pairs contrast with three reverse pairs.
  A production run's overall self-rating is never assigned to its individual
  notes; pair diagnostics are labelled accordingly.
- M4 preserves stored source/destination targets, motion and prediction window
  as explicitly labelled exact transition review. Longer originals supply three
  full-progression contrasts; two-chord originals receive ten exact reviews.
- M5 offers self-reported trouble spots and selected section loops. Seven
  single-pass sections contrast with three complete original runs, keeping the
  original step/continuous task, target pattern, tempo and full-run repeats.
- M6 supports Sing, Mark, Predict, Bass and Vary focus with required listening.
  Optional stage self-ratings and committed marks save immediately as independent
  stage assessments, including when the overall activity is later abandoned.
- M7 commits visual mapping independently from the physical self-rating, records
  tuning/valid-position context, and supports a selected alternate string/fret
  with note names hidden. Diagram accuracy is never instrument accuracy.
- All M1-M7 modes have bounded, validated ten-question diagnostic schedules.
  Stored per-question presentation settings preserve actual contrast settings.
- Correct-but-slow priorities require sufficient valid timing and a matched
  personal baseline. Replay experiments have an explicit one-replay limit.
- Quality/degree matrices have outcome/time/sample views, keyboard-accessible
  cells, context filters, and exact cohort details. Whole-run data stays coverage
  only. M1 explanations and M3 role-transition tables retain their source labels.
- New Degree, Interval, Chord Quality and Progression ID logging stores every
  committed answer, complete question/settings snapshots, wrong attempts, replay,
  exit and scheduled decision-window boundaries. Progression ID is one joint
  trial with two independently stored answer-item components, not two questions.
- Legacy same-settings and exact-question launch adapters remain within the
  original trainer. Exact review is labelled and kept out of fresh baselines.
- Drone logs foreground playback segments and musical context as activity only.
  Stopped legacy runs cancel pending question advancement.

Policy `insights-2.2` and cohort definition v2 retain timing/scoring source
separation, including transition/step scope. Earlier stored cohorts remain
separate rather than being silently treated as matched new measurements.

Missing original snapshots, incompatible target/quality combinations and
unplayable positions still produce explicit unavailable reasons. They are data
or musical constraints, not substituted exercises. Historic unknown values stay
unknown. Microphones, cloud sync and machine-learning scheduling remain outside
this specification. Policy thresholds remain proposed product defaults.

## Verification

- `npm test`: 60 music/audio/storage tests and focused synthetic analytics
  fixtures covering Wilson gates, M2 component errors, M3 grain, retries, unknown
  exposure, snapshot alignment, M6 precision/recall, legacy data, timezone/DST,
  future dates, cohort identity and deterministic drill eligibility.
- `npm run test:browser`: existing six suites plus `browser-insights.mjs` for
  real practice capture, reload idempotence, 7/3 drills, presets, M4/M7 commits,
  isolated storage backup/restore, retention and desktop/mobile screenshots.
- `jazz-insights-completion.test.mjs` verifies all-mode diagnostics, preserved
  held pitch/transition/pair/position constraints, balanced quality contrasts,
  missing-snapshot rejection, matched speed priorities and joint legacy grain.
- `browser-insights-completion.mjs` exercises each advanced focus through the
  dedicated session route, stage persistence and physical/mapping separation.
- `browser-legacy-insights.mjs` exercises wrong/correct retries in all four
  original trainers, scheduled timing, source-specific exact review and Drone
  activity. Tone is mocked for these UI/logging checks; hardware output is not
  measured.
- Browser tests use isolated profiles. No user history is cleared for testing.

All original v1 storage keys retain their format. Added `analytics` fields are
optional; generated reference pitches remain explicitly reference truth.
