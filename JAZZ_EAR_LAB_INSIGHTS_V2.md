# Insights v2

Implements the Jazz-first release of the supplied Insights design, using native
TypeScript and the existing static application. No remote analytics, account,
microphone or physical performance measurement is introduced.

## Delivered

- `#/insights` overview and M1-M7 detail routes, including mandatory M2, M3,
  M4, M5 and M7 task splits; query filters survive navigation and drill return.
- Separate recognition components, self-rating distributions, sequence/run
  coverage, transition snapshots, phrase marking precision/recall and optional
  stage self-ratings, and pre-reference bass string/fret/MIDI mapping.
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
  uses a balanced 5/5 pair. Empty M1/M2/M7 views offer five-cell diagnostics,
  with two questions per cell. Root scope is explicitly narrowed to the observed
  context. Actual UI answer choices remain independent of generation pools.
- Dedicated drill sessions, unchanged Saved presets, Recent updates, Repeat
  focus, Matched check, Save settings and Return to insight summary actions.
- Legacy Degree, Interval, Chord Quality and Progression ID compatibility
  panels. Solved-only first-try rates are qualified; Progression ID rows never
  create independent correctness claims. Drone reports unrecorded activity.

## Capability limits and deferred scope

The spec explicitly permits shipping only validated focus generators. Direct
focused generation for M3 held-pitch pairs, M4 constrained transitions, M5
trouble sections, M6 stage-only execution and M2 quality-confusion pairs remains
unavailable. Those contexts offer Customize and exact stored-question review;
they never silently substitute another task. Multi-sequence under-sampled
diagnostic schedulers and advanced mapping-position constraints remain future work.

Phase D live logging/setup adapters for the four legacy trainers, Drone activity,
optional M5 trouble tags and deeper M6 stage-focus refinements are deferred.
Historical compatibility panels are available now. No invented historical dates,
stage ratings, string/fret selections, full performance timing or vocal accuracy.

Comparable cohorts have aligned daily outcome/time plots with accessible tables;
overview speed-priority cards remain unavailable. Detailed timing requires successful new capture, and the
policy thresholds are product defaults, not validated learning standards.

## Verification

- `npm test`: existing music/audio/storage tests and focused synthetic analytics
  fixtures covering Wilson gates, M2 component errors, M3 grain, retries, unknown
  exposure, snapshot alignment, M6 precision/recall, legacy data, timezone/DST,
  future dates, cohort identity and deterministic drill eligibility.
- `npm run test:browser`: existing six suites plus `browser-insights.mjs` for
  real practice capture, reload idempotence, 7/3 drills, presets, M4/M7 commits,
  isolated storage backup/restore, retention and desktop/mobile screenshots.
- Browser tests use isolated profiles. No user history is cleared for testing.

All original v1 storage keys retain their format. Added `analytics` fields are
optional; generated reference pitches remain explicitly reference truth.
