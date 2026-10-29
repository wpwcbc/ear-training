# Actionable V2 Insights — runtime captures

Captured 2026-10-29 from the implemented local V2 app in headless Chromium.
All shown scores are **synthetic browser-test fixtures**, not the user's history,
learning gains or pitch-verified instrumental performance.

One initial desktop/mobile inspection batch was followed by one confirmation
batch. All six final images were opened and inspected. No page-level horizontal
overflow was observed at 320, 390 or 1440 CSS pixels; detail tables scroll locally.
This is limited runtime evidence, not Safari/iOS or screen-reader certification.

| Surface | Desktop | Mobile | Narrow mobile |
|---|---|---|---|
| Play by Ear: recent result, priorities, actual keys and whole-question delay | [1440](play-insights-1440.png) | [390](play-insights-390.png) | [320](play-insights-320.png) |
| Overall: three families, separate contexts and secondary combined total | [1440](overall-1440.png) | [390](overall-390.png) | [320](overall-320.png) |

Reproduce with the Actionable Insights browser journey and
`V2_INSIGHT_SCREENSHOTS=<output-directory>`. The companion state journey covers
unknown historical dates/keys, original Dbm7 spelling, old played Audiation,
300 saved setups, bounded initial evidence and byte-preserved history.

The optional Impeccable CLI launcher/detector is absent; no automated design-scan
certification or live overlay is claimed. See
[implementation, testing and two-axis review](../../../V2_ACTIONABLE_INSIGHTS_IMPLEMENTATION.md).
