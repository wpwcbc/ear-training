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
  of being distributed across target notes. Degree marginals remain descriptive
  unless at least two sufficiently supported quality strata pass comparability,
  root coverage, 70% maximum quality share and reversal guards. Their breakdown
  is inspectable; executable recommendations still use specific quality targets.
- Recognition confusion grids include correct diagonals and actual committed
  selections with expected-row denominators. Table/heatmap values and evidence
  agree. Legacy Degree, Interval and Chord Quality use their own restricted axes;
  Chord Quality has inversion/playback facets. Combined `m6m7b5` is retained.
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
  sets cannot support a matched M2 claim. Exact choice-set matching is retained
  for existing records. New M2 settings can explicitly choose 2-7 fixed distractor
  roles, separate from tested targets and canonical for every selected quality.
  Actual displayed choices, counts and `recognition-choice-family-1` policy are
  recorded at commit. Only validated metadata permits tested-label substitution;
  different distractors/counts/settings or missing metadata remain unmatched.
  A focused drill cannot silently turn a fixed distractor into a target.
- Timing and outcome charts are separate, with their own samples/units, daily
  gaps and tables. Period statements retain exact v2 cohorts and separately
  identified current/prior references. Faster/lower accuracy is a trade-off.
- Mixed-settings history is a separate collapsed descriptive view, labelled as
  changed practice mix rather than improvement. Source, task, assessment unit
  and timing version stay separate; no matched confidence range is shown.
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

Measured on this Windows host (AMD Ryzen 7 7735HS), Node v22.20.0 and headless Microsoft Edge,
using synthetic 10,000-assessment data:

- Selector p95: 379ms over 20 uncached computations, cached p95 0.38ms over 30
  calls. First cold call was 575ms in that run; another run measured 496ms cold
  and 409ms uncached p95. This is not a cold-start p95 across fresh processes.
- Date parsing/bucketing, repeated sorting and projection serialization are
  reduced. Empty matched-period pairs skip unnecessary aggregate construction.
  Presentation revision/policy versions changed; exact evidence keys did not.
- Full-suite browser worker check: 941ms including transport, with 39 UI timer
  ticks. CDP 4x page CPU throttling measured 2398ms and 52 ticks. Throttling is a
  simulation, not a physical mid-range-device result or worker speed guarantee.
- The local selector p95 budgets are met in these runs. Cold-start and browser
  transport can exceed 500ms; worker/progress handling remains active. Physical
  mid-range-device budgets and cached full-page/tab-render p95 remain unverified.
  Do not equate cached selector timing with full UI rendering.

Reproduce using `npm run benchmark:summary` and `tests/browser-smart-summary.mjs`.
All browser fixtures use isolated profiles and leave user history untouched.

## Verification And Limits

Verified `npm test`: 91 passing tests. Verified `npm run test:browser`: all twelve
suites passed, including 300-context/25-assessment pagination and the 10,000-row
worker check. The new fixtures cover the 113/112/110
reconciliation example, sparse children versus supported parents, root diversity
and dominance, timing absence, grain, source/choice capability gates, matched
comparisons, separate period citations, locale, cache invalidation, worker
responsiveness, keyboard drilldown and mobile layout. Existing music/audio,
practice, retention, import/export and legacy suites remain enabled.

Additional browser fixtures verify real M2 choice-policy capture, cross-quality
drilldown, mixed-history captions, confusion diagonals and table/heatmap parity,
Legacy facets and original raw-row indices. An isolated test-only extension sets
actual browser zoom to 200% (`chrome.tabs.getZoom` confirms 2); physical viewport
widths 1280/780/390 become 640/390/195 CSS pixels without document overflow.
The original 320px body floor was removed, and narrow navigation scrolls locally.
Deuteranopia, protanopia and achromatopsia screenshots preserve explicit values
and reliability labels. Native surface screenshots are checked for nonblank
pixels. These checks supplement, not certify, full WCAG or real assistive-device QA.

Historical unknowns remain unknown. Missing snapshots, unsupported contrasts,
unplayable positions and insufficient evidence remain explicit limitations;
neither a placeholder nor a self-rating is a measured singing/playing result.
