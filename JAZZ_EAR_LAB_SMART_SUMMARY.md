# Insights UX And Smart Summary

Implements the presentation addendum on top of Insights v2. Native TypeScript,
static hosting, existing practice routes, original storage and v2 evidence remain
the authority. No inference endpoint, telemetry, microphone or account is added.

## Presentation

- Decision-first Overview and task-specific dashboards. Advanced filters are
  collapsed; period and mandatory task remain visible. Routes retain source,
  timeframe, metric, cell, root drilldown and summary language.
- Rule-based English and Traditional Chinese summaries precede matrices.
  Supported, tentative and coverage recommendations are visibly distinct and
  limited to three. A lone miss or correct answer is not a weakness or strength.
- Compact mode rows, content-height recommendation cards, one useful empty-state
  action and one explanation per unavailable timing/trend capability.
- Quality/degree matrices share their diagnostic sample with the summary and
  evidence. Whole sequence/run/phrase outcomes use task-specific contexts instead
  of being distributed across target notes. Degree marginals remain descriptive.
- Semantic tables, keyboard-operable cells, escaped text, labelled local scroll
  regions, root drilldown, 12-context pages and 25-assessment evidence pages.
  Search, ordering, full counts, Escape focus return and browser Back are retained.

## Evidence And Rules

- Hierarchy recomputes ID unions, retains exact leaf cohorts and separates
  diagnostic questions from descriptive item/assessment counts. A reconciliation
  ledger distinguishes retained assessments, non-skipped outcomes, eligible
  observations, retries and repeated questions. Exclusions are exclusive within
  each reconciliation stage.
- Root-collapsed projections are not new v2 cohort keys. Supported broad claims
  need compatible settings, three roots, five questions per root and at most 60%
  from one root, in addition to v2 sufficiency. Fixed-root claims name their root.
  Mixed parents remain descriptive; sufficiently supported compatible subsets
  cite both their subset and the broader parent evidence.
- Six fact categories: weakness, relative strength, recorded confusion, specific
  difficulty, comparable trend and coverage. Typed templates veto missing facts;
  deterministic ranking and parent/child suppression retain inspection reasons.
- Peer comparisons retain matching context strata, actual choice sets, coverage,
  mix/reversal guards, Wilson ranges and minimum effect size. Unknown option
  sets cannot support a matched M2 claim. Current instrumentation supports exact
  choice-set comparison; changed distractor sets are conservatively unmatched,
  not treated as an undocumented tested-label substitution policy.
- Timing and outcome charts are separate, with their own samples/units, daily
  gaps and tables. Period statements retain exact v2 cohorts and separately
  identified current/prior references. Faster/lower accuracy is a trade-off.
- Immutable local citation payloads expose assessment/item/question IDs, exact
  leaf keys, filter/window snapshots, revision, exclusions and policy version.
  They can be exported independently; IDs are not placed in shareable URLs.
  Legacy provenance uses import batch/source/raw index, not fabricated question
  identity, dates or roots.
- The drill compiler validates all ten actual tasks again at launch, checks
  response choices and preserves observed-root schedules for single-target focus.
  A directional confusion retains its selected label. Unsupported sequence-level
  single-label contrasts give a reason rather than an unrelated exercise.
  Repeated material stays targeted/exact review, outside fresh baselines.

## Cache And Performance

The disposable memory cache is keyed by data revision, validated query, policy,
generator and local date/timezone. No derived cache is an evidence store. Clearing
it does not delete practice history. Large histories (1,000+ assessments) run in
a native module worker with a visible preparing state and stale-route guards.

Measured on this Windows host with Node v22.20.0 and headless Microsoft Edge,
using synthetic 10,000-assessment data:

- Final selector benchmark: 1.80-1.93 seconds after optimization;
  cached selector p95 approximately 0.50ms over 30 cache calls.
- Browser worker checks: approximately 1.7-1.9 seconds including transport, with 78-84
  independent UI timer ticks while the worker ran.
- These are local measurements, not mid-range-device guarantees or full-page
  render p95. The proposed 500ms uncached budget is **not met**. Worker execution
  prevents that calculation from blocking the UI; hardware benchmarking remains
  a release-performance limitation, not a hidden success claim.

Reproduce using `npm run benchmark:summary` and `tests/browser-smart-summary.mjs`.
All browser fixtures use isolated profiles and leave user history untouched.

## Verification And Limits

Verified `npm test`: 80 passing tests. Verified `npm run test:browser`: all ten
suites passed, including 300-context/25-assessment pagination and the 10,000-row
worker check. The new fixtures cover the 113/112/110
reconciliation example, sparse children versus supported parents, root diversity
and dominance, timing absence, grain, source/choice capability gates, matched
comparisons, separate period citations, locale, cache invalidation, worker
responsiveness, keyboard drilldown and mobile layout. Existing music/audio,
practice, retention, import/export and legacy suites remain enabled.

Historical unknowns remain unknown. Missing snapshots, unsupported contrasts,
unplayable positions and insufficient evidence remain explicit limitations;
neither a placeholder nor a self-rating is a measured singing/playing result.
