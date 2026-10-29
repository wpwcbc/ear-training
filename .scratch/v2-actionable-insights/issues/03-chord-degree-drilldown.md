# 03: Chord and degree drill-down with contextual confusions

**What to build:** Explore chord quality, full chord and degree, keep scope visible, and understand recorded directed mistakes without a long list of generic settings buttons or an initial giant cross-tabulation.

**Blocked by:** 01 — Recent-performance overview and period scope.

**Status:** done

- [x] Support quality/full-chord views and root filtering; initial chord list is capped at five rows with All and specified descriptive sort/tie-break options.
- [x] Drill into a chord's degrees and recorded progression occurrences/context. Degree defaults to quality × degree; all-chord degree summaries are explicitly mixed.
- [x] Retain applicable active selections while changing dimension. Consume the shared analysis-selection state; after 02 is present, key selection carries through automatically rather than requiring a separate chord/degree screen implementation.
- [x] Confusions use first wrong answers or self-rated wrong-degree annotations with provenance. Explicit Unknown, absent annotation and unassessed remain distinct.
- [x] Keep first outcomes immutable across retries/review and deduplicate musical groups. Unsupported labels/source functions remain unknown rather than guessed.
- [x] Verify the delivered user journey through the confirmed V2 browser seam; supplement only unobservable calculations at existing public model/progression interfaces. Own relevant storage/empty/unknown states, keyboard/focus and 320/390/1440 responsive checks in this slice; preserve source presets, first evidence, histories, Legacy, audio and sampling.

**Spec user-story coverage:** 39–50, 64, 67.
**Spec acceptance-example coverage:** chord/degree portion of 8, 14; slice portion of 16.

Shared contract: the approved Actionable Insights specification owns exact defaults, eligibility, compatibility, scope and acceptance examples; the local ticket index records the dependency graph. A ready-for-agent ticket is startable only after its blockers are done. This ticket does not authorize unrelated frameworks, new grading/timing semantics or destructive history migration.

Delivery: [implementation and verification](../../../V2_ACTIONABLE_INSIGHTS_IMPLEMENTATION.md). Completed locally on 2026-10-29; merge/deployment remain separate.
