# Jazz Ear Lab UI / UX refresh

This update applies the agreed interface plan to the existing dashboard, wizard, practice, summary and history routes.

## Design decisions

- Jazz Ear Lab has its own stylesheet and system-font typography. It no longer inherits the legacy trainers' heading, navigation or form styling. White and neutral surfaces use a green action accent; amber/red distinguish assessment outcomes.
- Common commands use locally vendored Lucide icons with accessible names and hover titles for icon-only controls. Assets and their ISC license live in `jazz-ear-lab/icons/`; there is no runtime CDN requirement. The static development server now serves SVG with its correct image MIME type.
- Dashboard prioritizes the most recent unfinished session and Start Practicing. Recent initially shows five distinct configurations, with explicit Show all / Show fewer controls. Named presets retain their settings and history behavior. Edit/save/rename/duplicate/favorite/delete live in dismissible per-row menus.
- Empty-state quick starts are three repeated items rather than three full-width sections. Configuration summaries use progression names, musical targets and concise metadata. Configuration detail displays labelled parameters instead of raw configuration JSON.
- Wizard uses a compact stepper, a clear current-step heading and grouped chord landmarks versus extensions/tensions. Settings scroll within their own area; Back/Continue and Save Draft remain in a separate action bar. The narrow layout reduces repeated headers to preserve usable settings space.
- Practice gives fixed locations to session progress, pause, exercise, harmonic context, prompt, reference and actions. Listen/Imagine/Compare/Assess indicators reflect the existing engine phase. A completion meter represents completed questions; Endless runs do not show an invented completion percentage.
- The practice dock separates self-assessment from playback/Next controls. Reference and optional tools remain available. Replay is omitted before the first context playback; Play context is the initial action. Absolute target names retain the existing reveal gates.
- Summary shows completion and active time before outcome distributions. Self-assessed ratings and automatic recognition accuracy remain separate. When missed questions exist, Review Missed is the primary action. Question details use a horizontally contained table.
- History uses compact rows, status labels and existing filters. Tab arrows, Home/End navigation, menu Escape dismissal and outside-click dismissal work with keyboard and pointer input.

## Changed modules

`src/jazz/ui.ts` provides command icons and readable date/duration formatting. `src/jazz/flow.ts` builds the revised presentation on the existing session bridge. `src/jazz/app.ts` hides the redundant initial Replay action. `jazz-ear-lab/lab.css` owns the responsive visual design. Native TypeScript, hash routes, stored sessions and musical generation remain the project's architecture.

## Verification

- `npm test`: 32 theory, generation, persistence and managed-audio tests.
- `npm run test:browser`: the four existing musical/UX browser suites plus `tests/browser-design.mjs`.
- The design suite checks actual SVG rendering, recent-list limits, keyboard menus/tabs, outside-click dismissal, 320/390/768/1440px overflow, settings/action-bar geometry and practice phase/assessment layout.
- Desktop and phone-sized screenshots are inspected. Artifacts are saved in the OS temporary directory, including `jazz-design-home.png`, `jazz-design-recent.png`, `jazz-design-wizard-mobile.png`, `jazz-design-session-mobile.png`, and the existing `jazz-ux-*.png` captures.

Browser validation uses desktop Microsoft Edge with emulated viewport sizes; physical iOS/Android audio and touch latency are not measured by these checks.
