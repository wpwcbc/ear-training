# V2 configuration — C chapters with B inline disclosures

Status: Design brief confirmed on 2026-10-27. Visitor mode: Operate.
The user selected C's independently accessible chapter tabs and B's inline
summary/disclosure groups within each chapter, then confirmed the integrated
brief. This completes shape; application implementation is not part of this step.

Approved composition examples:
- [Progression](../../../.impeccable/mocks/decision/v2-config-shape-2026-10-27/CB-progression.png)
- [Single chord](../../../.impeccable/mocks/decision/v2-config-shape-2026-10-27/CB-single-chord.png)

The paired JSON files record approval and generation prompts. Standalone A, B
and C images are unapproved exploration alternatives. Images demonstrate the
selected composition; this brief and existing musical contracts govern actual
labels, values, supported choices, control availability and behavior. Generated
sample lettering or checkbox differences must not become new musical rules.

## Job and outcome

Help a theory-literate musician quickly understand the current practice and
change it confidently. Support both small changes to existing presets and full
editing of harmony, target pools and progressions. Desktop and mobile are both
important, including hand-held operation and a phone placed on a desk.

Success means the user can locate the relevant setting, see what is selected
without opening every group, understand save/validation status, and start the
intended exercise. Simplicity must come from grouping and hierarchy, not removing
supported choices or silently substituting settings.

## Scope and visual authority

Cover config for M1 Audiation, M2 Recognition, Progression Recognition and Guided
Singing. Regrouping, chapter/disclosure navigation and presentation changes are
approved. Inherit the black/yellow V2 identity, Source Sans 3, cool open ground,
white controls and flat separators from `../../DESIGN.md`.

Preserve musical functionality, scoring, actual per-mode capabilities, valid
change auto-save, local records and preset ownership. Do not add settings merely
to make all modes look identical. This config brief is separate from the already
approved [A practice/answering layout](v2-practice-layout.md). Practice runtime,
full session Results, Insights and Legacy are outside this design scope.

## Shared structure

Four independently accessible chapters: **Harmony / Target degrees / Practice /
Sound**. These are categories, not sequential wizard steps. A valid preset can
start from any chapter; no mandatory Next-step path.

Inside each chapter, use labelled inline disclosure groups. A collapsed header
retains the current selected values/counts; expanding reveals full editing
controls. Allow multiple groups open for comparison. Initially open the main
editing group of the active chapter and retain editing position/disclosure state
when switching chapters. Do not reduce a complex configuration to unreadable
serialized text or hide errors in closed groups.

Desktop puts editing in a broad region and a concise This practice summary/Start
area to its right. Mobile uses one readable column, a concise summary with access
to the full conditions, and a reserved bottom Start/save-status region. Reserve
space so fixed actions never obscure fields, options or error messages. Keep
actual navigation available; no invented hamburger menu.

## Four-mode field mapping

| Chapter | M1 Audiation | M2 Recognition | Progression Recognition / Guided Singing |
| --- | --- | --- | --- |
| Harmony | Independent root and chord-quality pools; retain All 12 Keys. | Same independent pools. | Common templates, free chord-symbol entry, occurrence order/add/remove, per-chord beats and whole-progression transpose. |
| Target degrees | One disclosure group per selected quality, visible selected-degree summary and full legal pool on expansion. | Same grouping. | One group per quality used by the progression; qualities derive from the actual chords, not an additional enable/disable switch. |
| Practice | Questions/Unlimited, audible context, Auto Advance and self-assessed imagined/sung/played response method. | Questions/Unlimited, audible context and Auto Advance; no M1 response-method field. | BPM, notes per chord and Questions/Unlimited; clearly describe count-in. Do not add single-chord Auto Advance/context switches or M1 method fields. |
| Sound | Overall volume, original-voice levels and existing unrecorded accompaniment audition. | Same existing capabilities. | Overall volume and original-voice levels; do not invent an audition feature not currently supported. |

Suggested internal groups: Harmony uses Roots and Chord qualities for single-chord
modes, Template/transpose and Chord sequence for progression. Practice groups
session length separately from applicable listening/response behavior or
progression tempo/note density. Sound keeps overall output easy to adjust and
voice balance separately expandable. These groups must not change musical meaning.

## Interactions, data ranges and states

- Selected roots, qualities and degree pools remain readable in summaries; full
  options remain accessible. Preserve the complete supported root/quality/degree
  vocabulary. Never silently select hidden defaults to make an empty pool valid.
- Progression chord symbols remain editable text. Each occurrence retains its own
  beats and order, even when chord symbols repeat. Support 2–32 chords, 1–16 beats
  per chord, 20–300 BPM, 1–4 notes/chord and the existing transpose semantics.
- Questions supports 0–200 with 0 representing Unlimited. Use understandable
  Unlimited wording without changing its stored meaning. Original-voice levels
  support 0–200%; overall volume supports 0–100%.
- On mobile keep chord and beats adjacent, placing reorder/remove controls where
  they fit. Long chord lists and expanded pools scroll vertically; do not shrink
  controls or require a fixed-size viewport to show every setting simultaneously.
- Show which preset is being edited and saved. Auto-save valid changes with clear
  saved/saving/unsaved states. Retain existing last-valid saved data and drafts
  during correction; never show an invalid draft as already saved.
- Invalid chord symbols, empty required pools or out-of-range values open their
  relevant group and get nearby actionable errors. Disable Start while the draft
  is invalid and explain why. A saving failure needs an explicit recovery state;
  avoid disguising unavailable saving as validation success.
- Preserve focus through updates, visible keyboard position, labelled controls,
  chord/quality context, live save/error status and adequate touch areas. Chapter
  selection and disclosure state must be conveyed beyond color alone.
- Preset management, restore/delete and past sessions remain secondary to Start.
  Expose only actions supported for that preset/mode; do not fabricate shared
  rename/delete/copy capabilities. Auditions remain unrecorded where supported.

## Delivery limits

These are design mockups and a confirmed brief, not implemented screens or browser
verification. The examples do not claim every chapter/state has a finished comp.
An eventual implementation must exercise root/quality/target edits, progression
editing, sound controls, auto-save/error recovery, chapter/disclosure focus and
Start on desktop and narrow mobile, including long-content cases.

The Impeccable concept/decision helpers are absent (actual attempts exited 127),
so alternatives and the hybrid were presented inline and confirmed in chat. No
automated roll, served decision page or embedded-prompt-helper success is claimed.
Prompt provenance remains in adjacent JSON files. No application code or existing
feature specification was modified by this shape step.
