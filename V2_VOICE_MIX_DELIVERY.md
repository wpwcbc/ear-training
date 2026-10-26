# V2 target pools, voice mix and Insights delivery

The user approved the desktop/mobile composition direction on 2026-10-26.
The implementation retains the existing Signal Route / Split Desk design.

Customize now edits per-quality target pools and original-voice levels (0–200%)
with degree labels and full-chord audition. Old presets resolve their original
eligible material on editing/new practice; historical sessions are not rewritten.
New sessions use quality-balanced generation. Frozen voice levels drive question
and reference playback and Results replay. Focused presets inherit source mix,
selected quality/degree and the active root filter, and remain editable.

Insights defaults to actual V2 Overall totals with M1/M2 views and M1-only
production categories. Chord-degree observations and confusions precede supporting
mixed-practice timing/replay evidence. Source details remain available without
compulsory cohort selection. Unknown and unassessed outcomes retain their meanings.

Validation: 137 Node tests passed. The new browser-v2-target-mix script verifies
Customize persistence, unrecorded audition, practice, Results, Overall navigation,
and narrow-screen overflow under Chromium. The prior core output-rendering and
lifecycle tests are documented in the composition checkpoint. Screenshots were
inspected at desktop and mobile widths; illustrative comps are not practice data.

Limitations: human listening and physical Safari/iOS checks remain manual. The
existing broad V2 browser suite has old global-target/cohort selectors that need
updating for the intentionally replaced controls; its baseline preset-delete
failure was separately reproduced before these UI changes. No claim of all old
browser suites passing is made. No new dependency or tracker workflow was added.
