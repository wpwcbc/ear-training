# Ear Train Design System

Source: the user's two attached Ear Train / Donezo design specifications (2026-10-22).

## Direction

Quiet, work-focused music practice. Forest actions, mint selections, neutral surfaces.
Inset desktop shell, persistent sidebar, compact topbar; tablet icon rail and mobile drawer.
Active sessions remove the sidebar, retain playback controls, and keep the existing staged flow.
Mode cards are individual repeated items; page sections remain unframed.

## Implementation

`css/design-system.css` owns shared light/dark semantic tokens and responsive presentation.
`src/shell.ts` mounts navigation around the existing main, without replacing training DOM.
Lucide icons are local assets. Font stack is Inter / Segoe UI / system sans.
Spacing follows 4px increments; cards use 14-16px radii and the shell 28px.
Breakpoints: mobile <768px, tablet 768-1023px, expanded navigation >=1024px.
Desktop content uses available width up to the 1600px shell limit.

## Accessibility Adjustments

Muted small text uses gray 600 instead of gray 500; interactive borders and focus indicators
use stronger palette values to retain contrast. Tracking stays zero. Controls target 44px.
Dark primary controls use dark text on mint, rather than white on mint.
Heatmap performance buckets retain their independent evidence indicators and dark cell text.
Theme preference is isolated in `earTrain:ui:theme`; no training storage migration.
Mobile navigation supports Escape, a focus loop, inert closed content and focus return.
Reduced motion and system color preference are respected.

The Impeccable context launcher was unavailable; existing source and supplied specs were read directly.

## Critique Follow-up (2026-10-23)

The user selected all five critique priorities and action-first Insights with expandable evidence.
The leading recommendation keeps sample count, assessment grain and essential limitations visible.
Full scripted observations, citations and reconciliation remain available via native disclosure.
An unselected cell-detail pane does not reserve heatmap width. Overflowing matrices expose
column ranges and 44px labelled arrow controls, while retaining table view and sticky row labels.
Exercise choices use the entire card as one accessible button. Header and mode controls target 44px.
Recent remains actual recent configurations; supplied templates belong to Quick starts.
Harmony begins with maj7, m7, 7 and m7b5. All other qualities remain in an expandable catalogue;
existing advanced selections automatically expand, and edits preserve hidden selections.

## Quality Follow-up (2026-10-23)

Setup navigation focuses the current step heading; Insights keeps its own focus handling.
Draft write failures preserve in-memory choices, including leaving and returning to setup,
and expose a recoverable alert beside the persistent footer. Successful saves use a polite
status. Long saved names wrap without changing stored text. Configuration disclosures and
row-menu triggers target 44px, including mobile. Status notices use semantic full borders
and 14px secondary text; compact step labels remain whole at 320px.
In forced-color mode only masked icon fills opt out of automatic recoloring,
using CanvasText; the rest of the interface retains the user's system colors.
