# Ear Train UI Redesign (2026-10-22)

## Delivered

- Shared Donezo-inspired forest/mint/gray semantic tokens, intentional light/dark surfaces,
  stronger accessible muted text and control boundaries, shared typography and spacing.
- Inset desktop shell with active navigation, contextual topbar, theme switch and local Lucide icons.
- Compact tablet rail with a working tool-directory entry; mobile drawer with inert closed
  navigation, background isolation, Escape dismissal, focus containment and focus return.
- Seven mode cards with descriptions, recent practice dates when available and working
  configuration entry points. Desktop Recent/Saved/Quick starts sit beside the mode library;
  compact layouts have direct Recent/Saved shortcuts.
- Progressive wizard, focused session without sidebar distractions, and consistent History,
  Review, Settings, root tool directory and all six legacy tool pages.
- Insights summary, snapshot, heatmap, inline details, suggested practice, trends and advanced
  evidence retain their original order and definitions. Heatmap bucket colors remain separate
  from evidence reliability. Canvas trends redraw from the same points when the theme changes.
- No framework migration, runtime dependency, data migration, training-engine change,
  question-generation change or analytics-formula change.

## Verification

- `npm test`: build and 105 unit tests.
- `npm run test:browser`: 14 existing browser suites, adapted only where the replaced navigation
  deliberately changed selectors. Includes all modes, playback, M1 autoplay, wizard, presets,
  history, resume, review, evidence, targeted practice and accessibility workflows.
- `npm run test:redesign`: all seven mode-card entry points; light/dark persistence and storage
  isolation; navigation and mobile keyboard focus; audio replay/advance across a theme change;
  exact synthetic Insights reconciliation; shared pages and no page overflow at 320-1920px.
- Focused visible-text contrast checks cover navigation, mode descriptions, tab controls,
  citations and suggested-practice actions in both themes. This is not a full WCAG audit.
- Two batched visual inspection rounds cover desktop/mobile, both themes, wizard, session,
  populated Insights and legacy tools. Screenshots are local QA output, not fabricated user data.

Run browser scripts with `PLAYWRIGHT_MODULE` pointing to an installed Playwright module;
the existing harness uses Microsoft Edge. Set `REDESIGN_SCREENSHOTS=1` to capture the redesign
batch under the OS temporary directory `eartrain-redesign`.

## Limits

Responsive/device checks are browser emulation, not physical iPhone/iPad or Safari validation.
Web Audio scheduling and controls were exercised automatically; physical speaker output was
not assessed by a human. Existing browser-local storage and no-sync limitations are unchanged.
System fonts provide the documented fallback where Inter is not installed.
