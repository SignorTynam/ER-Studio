# Responsive UI, accessibility, and canvas invariants

This document is mandatory for UI, layout, canvas, modal, panel, and responsive
work. Use it with [`docs/CODEX_UI_STYLE_GUIDE.md`](../CODEX_UI_STYLE_GUIDE.md)
and the real breakpoints in `src/styles/responsive.css`, `src/index.css`, and
feature styles.

## Required viewport matrix

At minimum, verify:

| Class | Viewport |
| --- | --- |
| Desktop | 1440 x 900 |
| Compact desktop | 1024 x 768 |
| Portrait tablet | 768 x 1024 |
| Mobile | 390 x 844 |
| Narrow mobile | 360 x 800 |

Existing Playwright suites also exercise breakpoint boundaries and 320 x 568.
Keep those tests. Current layout transitions include the canonical shell
breakpoints at 1180, 900, and 680 px plus feature boundaries such as 860 and
640 px. Reuse the closest existing breakpoint; do not add another without
evidence that the present layout cannot express the required behavior.

## UI invariants

Every UI change must preserve:

- no unintended document-level horizontal scroll, overlap, or unreachable
  controls;
- no essential text truncation without an accessible alternative; use ellipsis
  for intentionally single-line names;
- accessible, fully visible modals and usable reduced-width panels;
- drawers, collapse, or task-specific compact layouts where needed;
- no action available only on hover;
- adequate touch targets, visible focus, keyboard operation, preserved ARIA
  and screen-reader semantics, and WCAG AA contrast;
- `prefers-reduced-motion`;
- Italian, English, and Albanian with no visible hardcoded strings;
- design tokens from `src/styles/tokens.css` instead of hardcoded visual values
  when a token exists;
- reuse of shared UI primitives;
- a purpose-designed mobile arrangement, not merely a scaled desktop layout.

## Canvas and coordinate invariants

Diagram nodes and persisted positions use model/world coordinates. Viewport
translation and zoom map them to client coordinates. Preserve that separation:

- use explicit client-to-world and world-to-client transforms;
- divide pointer deltas by viewport zoom before changing model positions;
- never make persisted model coordinates depend only on desktop dimensions;
- resize and orientation changes may change viewport fit but must not rewrite
  logical positions;
- resize visual indicators without changing their represented data;
- support pointer and touch, including pan, zoom, pinch, drag, selection, and
  minimap navigation;
- keep projected points inside their interactive container;
- preserve logical positions through resize and orientation changes;
- add a regression test for coordinate, zoom, pan, drag, or fit defects.

The current canvas applies `translate(viewport.x, viewport.y) scale(viewport.zoom)`
to its world group and already has pointer/touch and viewport tests. Extend
those helpers rather than introducing a second coordinate model.

## Working method for UI tasks

If the user supplied clear behavior and visual requirements, implement them
without asking again. Ask only when aesthetic direction is missing, a
functional trade-off exists, the action is destructive, a dependency is
needed, or behavior would change beyond the request.

For each UI PR:

1. run focused component tests during development;
2. run relevant Playwright tests across desktop, tablet, and mobile;
3. run the full build;
4. provide before/after screenshots for visible changes;
5. state the exact viewports tested and any limitation.
