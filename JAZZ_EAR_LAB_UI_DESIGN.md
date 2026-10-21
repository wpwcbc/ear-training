# Jazz Ear Lab UI / UX refresh

This update applies the agreed interface plan to the existing dashboard, wizard, practice, summary and history routes.

## Design decisions

- Jazz Ear Lab has its own stylesheet and system-font typography. It no longer inherits the legacy trainers' heading, navigation or form styling. White and neutral surfaces use a green action accent; amber/red distinguish assessment outcomes.
- Common commands use locally vendored Lucide icons with accessible names and hover titles for icon-only controls. Assets and their ISC license live in `jazz-ear-lab/icons/`; there is no runtime CDN requirement. The static development server now serves SVG with its correct image MIME type.
- Dashboard prioritizes the most recent unfinished session and New session. Recent initially shows five distinct configurations, with explicit Show all / Show fewer controls. Named presets retain their settings and history behavior. Edit/save/rename/duplicate/favorite/delete live in dismissible per-row menus.
- Empty-state quick starts have direct Practice and separate Customize actions. Starting practice no longer requires the five-step wizard. Zero-valued activity totals are omitted until practice exists. Configuration summaries use progression names, musical targets and concise metadata; labelled details replace raw JSON.
- Wizard uses a compact stepper, a clear current-step heading and grouped chord landmarks versus extensions/tensions. Settings scroll within their own area; Back/Continue and Save Draft remain in a separate action bar. The narrow layout reduces repeated headers to preserve usable settings space.
- Practice gives fixed locations to session progress, pause, exercise, harmonic context, prompt, reference and actions. Listen/Imagine/Compare/Assess indicators reflect the existing engine phase. A completion meter represents completed questions; Endless runs do not show an invented completion percentage.
- The practice dock separates self-assessment from playback/Next controls. Starting a new M1 session with Practice or Start Practice automatically plays the first context, using that action to unlock audio. Replay context remains available. Other modes retain their initial Play context action. Reloading/restoring does not start audio; a blocked audio context keeps a manual retry button. Absolute target names retain the existing reveal gates.
- Next automatically plays context for each new question and each step in M4/step-mode M5. Sequential context uses the previous known chord and target; the upcoming answer stays silent until reveal. Replay context remains available, and timed anticipation starts after context finishes.
- Summary shows completion and active time before outcome distributions. Self-assessed ratings and automatic recognition accuracy remain separate. When missed questions exist, Review Missed is the primary action. Question details use a horizontally contained table.
- History uses compact rows, status labels and existing filters. Tab arrows, Home/End navigation, menu Escape dismissal and outside-click dismissal work with keyboard and pointer input.

## Daily-practice refinement (2026-10-22)

- Four primary destinations: Practice, History, Insights and Review. Exercise discovery lives in Practice's Exercises tab; the existing `#/suggested` link still opens that same discovery view. No exercise is locked or removed.
- The session header keeps exercise, question number, pause and a named actions menu together at 320px and wider. Finish Session and Save for review are secondary menu actions. The menu supports Space/Enter, Escape, outside dismissal and focus return. Session shortcuts do not consume native control activation; R/N remain usable when an action button has focus.
- Context playback, ready, paused and assessed states have explicit text alongside the existing stage indicator. Recognition uses Answer instead of Imagine. Routine duplicated instructions remain available to screen readers without occupying a second visible line; failures and other feedback stay visible. No playback scheduling, grading or capture timing changes.
- Desktop controls sit near the task rather than below a large fixed-height gap. Phone controls retain a lower action dock, minimum 44px icon targets, safe-area padding and wrapping for multi-action bass/phrase states. Existing notation and fretboard assets remain the actual task content.
- Insights uses a named exercise selector, retained period/language links, readable task labels and a collapsed advanced-filter control with an active-filter count. Summary and the first actionable recommendation share the desktop decision area; additional recommendations expand separately. Sampling/source caveats remain explicit, while policy/timezone details move into About these results.
- Exact-context and citation inspection use side-aligned native modal dialogs, not appended page sections. Tab/Shift+Tab stay within the open inspection, Escape/close/backdrop dismiss it, and background scrolling is suspended. Nested evidence returns to its selected cell; closing the cell or browser Back restores the matrix control. Navigation closes inspections and invalidates pending Insights renders so that launching a drill cannot leave the practice page inert. Tables still scroll locally and keep existing pagination/search.
- This is a presentation change. Exact cohorts, sample eligibility, citation IDs, drill validation, original histories, presets and audio rules are not redefined.

## Changed modules

`src/jazz/ui.ts` provides command icons and readable date/duration formatting. `src/jazz/flow.ts` builds the revised presentation on the existing session bridge. `src/jazz/app.ts` hides the redundant initial Replay action. `jazz-ear-lab/lab.css` owns the responsive visual design. Native TypeScript, hash routes, stored sessions and musical generation remain the project's architecture.

## Verification

- `npm test`: 91 theory, generation, evidence, persistence and managed-audio tests.
- `npm run test:browser`: thirteen browser suites, including all existing musical/Insights/legacy checks and `tests/browser-ux-refinement.mjs`. The autoplay suite uses the browser's default audio policy to check the first M1 question, Recent, Next, replay, failed-audio recovery, reload and preparation cancellation.
- The design suite checks actual SVG rendering, recent-list limits, keyboard menus/tabs, outside-click dismissal, 320/390/768/1440px overflow, settings/action-bar geometry and practice phase/assessment layout.
- The daily-practice suite verifies direct quick starts, playback state feedback, 320/390px header and touch geometry, native keyboard menu activation, repeat/resume flows, shortcut behavior, desktop first-viewport actions, modal Tab cycling/nested Escape/focus return, period retention and unchanged session/preset payloads during inspection.
- Desktop and phone-sized screenshots are inspected. Artifacts are saved in the OS temporary directory as `jazz-ux-home-desktop.png`, `jazz-ux-session-desktop.png`, `jazz-ux-session-mobile.png`, `jazz-ux-insights-desktop.png`, `jazz-ux-insights-mobile.png` and `jazz-ux-cell-mobile.png`. The existing 200% browser-zoom and vision-emulation suite remains enabled.

Browser validation uses desktop Microsoft Edge with emulated viewport sizes; physical iOS/Android audio and touch latency are not measured by these checks.
