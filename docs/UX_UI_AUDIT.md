# buildER UX/UI audit — `ui-fixes`

Date: 2026-07-15  
Comparison base: `main`  
Audited branch: `ui-fixes`

## Outcome

The branch now presents one coherent desktop-editor shell instead of several overlapping generations of UI. The completed pass establishes canonical light and dark tokens, a persistent activity rail, a keyboard-operable Explorer and tab system, main-column SQL/text editors, shared panel primitives, visible project/file/save context, a functional status bar, and overlay behavior for narrow screens.

The implementation preserves project serialization, diagram transforms, session restoration, version snapshots, translation flows, and export behavior. The work was incremental: the large domain coordinator in `App.tsx` remains in place, while new presentation responsibilities were extracted behind focused components and styles.

## Evidence reviewed

- Branch status, `main...ui-fixes` history, and diff.
- Workspace shell, Explorer, tabs, versioning, SQL Reverse, welcome, dialog, layout-state, i18n, and test sources.
- Browser flows at 1440×900, 1180×760, and 720×760.
- No-project, project welcome, schema, SQL, text, Source Control, compare, dirty tabs, Explorer context menu, light theme, dark theme, laptop, and narrow states.
- Automated component/domain suite, production build, and Playwright E2E suite.

## Findings and resolution

| Severity | Area | Initial problem | Resolution | Status |
| --- | --- | --- | --- | --- |
| Critical | Canvas / workspace shell | Empty canvases could render as a black surface in Chromium captures. | Unified canvas surfaces under theme tokens and isolated paint boundaries for the SVG/editor regions. | Completed |
| High | CSS architecture | Competing tokens and repeated overrides made hierarchy and theming inconsistent. | Added canonical tokens plus focused foundation, shell, rail, tab, menu, panel, and responsive layers loaded last. | Completed |
| High | SQL/text documents | SQL opened beside an empty editor and text opened in a modal. | Both file types now open as editable documents in the main editor column; SQL Reverse remains a secondary tool. | Completed |
| High | Activity rail | The active tool could not toggle closed and the last tool was not remembered. | Active-button toggle, persisted last activity, resizable panel, and keyboard separator behavior. | Completed |
| High | Explorer | Missing desktop tree keys, inline editing, useful create actions, and robust menus. | Added roving tree focus, arrows/Home/End/F2/Delete/context key, inline create/rename validation, semantic actions, and measured keyboard menus. | Completed |
| High | Tabs | No overflow navigation, open-tabs menu, context actions, reorder, or honest dirty-close flow. | Added scrollers, tab list, context and bulk actions, reveal/copy-path, drag reorder, keyboard navigation, stable dirty slots, and custom confirmation. | Completed |
| High | Dirty state | Tab dirty flags could remain stale after a project commit. | Dirty presentation is resynchronized from version state after commit and tab mutations. | Completed |
| Medium | Header | Project/file/save context and command access were weak. | Added compact project/file state, central command trigger, theme control, and clearer global/document grouping. | Completed |
| Medium | Editor navigation | Active-file context was not visible below the tabs. | Added a truncatable breadcrumb, file type, Reveal action, and schema view segments. | Completed |
| Medium | Panels | Reverse, Problems, and Source Control repeated header and empty-state structures. | Introduced shared panel, header, and empty-state primitives and migrated the main workspace panels. | Completed |
| Medium | Status bar | The existing component was not mounted in the active shell. | Mounted a compact status bar with project, file, workspace, zoom, validation, and version data only. | Completed |
| Medium | Welcome / empty states | States read as decorative landing pages and used oversized cards. | Flattened surfaces, reduced radius/elevation, prioritized actions, and made Explorer empty guidance compact. | Completed |
| Medium | Responsive layout | Desktop columns compressed at narrow widths. | Below 900px the active panel behaves as a drawer with backdrop; header, tabs, and status content simplify progressively. | Completed |
| Medium | Theme | Acceptance required both light and dark verification. | Added persisted light/dark preferences using dedicated semantic tokens, not inversion. | Completed |
| Medium | Dialog accessibility | Focus was not consistently trapped or restored. | Added safe initial focus, Tab trapping, Escape/cancel handling, and trigger restoration. | Completed |
| Low | Localization | New workspace chrome was incomplete outside English. | Added all new strings and coverage for EN, IT, and SQ. | Completed |

## Deliberate deferrals

| Item | Reason |
| --- | --- |
| Explorer drag-and-drop moves | Safe nested moves require cycle prevention, undo semantics, and project-corruption tests. Shipping an incomplete transform would be riskier than leaving the action out. |
| Preview tabs | The existing preview flag predates consistent SQL/text document semantics. It should follow as a separate, tested behavior increment. |
| Full `App.tsx` decomposition | Presentation components were extracted, but moving domain state and persistence in the same visual pass would unnecessarily increase regression risk. |
| Bundle splitting | The production build still reports a large main chunk. Route/tool-level lazy loading is a performance follow-up, separate from the interaction redesign. |
| Recent-project list | No trustworthy recent-project data source exists; the UI does not fabricate history. |

## Visual evidence

The required before/after and responsive states were captured during browser QA. Those generated PNG files and Playwright session snapshots are intentionally excluded from version control; this audit records the durable findings and verification results.

## Verification

- Component/domain tests: 626 total, 624 passed, 2 skipped, 0 failed.
- Playwright E2E: 4 passed, 0 failed.
- Production build: passed; Vite reports only the existing large-chunk advisory.
- `git diff --check`: passed.

## Design rules established

- Compact controls and tree rows; one teal accent plus semantic status colors.
- Borders and surface contrast before elevation; strong shadows reserved for menus/dialogs.
- Separate selected Explorer node, active document, open tab, and modified-file state.
- Keyboard and focus behavior are component contracts, not CSS-only polish.
- User-visible actions must perform a real action; unavailable history or data is not simulated.
