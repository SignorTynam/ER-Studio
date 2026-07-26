# CSS and design-token debt

This document is the current, reproducible inventory for the CSS shipped by
buildER. It replaces the historical line-number inventory, which described a
checkout predating `50d1f19`.

## Audit baseline

- Branch: `feat/general-improvements`
- Starting SHA: `ef0f93d9b5d478d3550974aa0a70427aad210507`
- Starting commit: `fix(ci): grandfather legacy commit history`
- Last verified base SHA: `8013fd03bad7d019d79cadb2c119d06a08e702e6`
- Audit date: 2026-07-26
- Token source of truth: `src/styles/tokens.css`
- CSS entry point: src/main.tsx, which directly imports src/index.css
  and the stylesheets required from src/styles/.

The before counts retain the historical starting-SHA baseline. The after
counts describe the current working tree based on the last verified SHA,
including the strict-audit remediation. Rerun the command on any later
checkout instead of treating these numbers as timeless.

## Reproducing the audit

Run:

```bash
npm run styles:audit
```

For the complete machine-readable inventory:

```bash
npm run styles:audit -- --json
```

For CI-style enforcement of missing variables without fallbacks and unimported
CSS files:

```bash
npm run styles:audit -- --strict
```

`scripts/audit-css-tokens.ts` scans CSS plus TypeScript, TSX, HTML, tests, and
the relevant documentation. Results and file lists are sorted, so identical
input produces identical output. Exit code `0` means the audit completed,
`1` means invalid input or an execution failure, and strict mode uses `2` when
its enforcement conditions fail.

The audit automatically inventories:

- hex, `rgb()`/`rgba()`, `hsl()` and `color-mix()` colors;
- CSS shadows and SVG/filter shadow references;
- spacing, dimensions, radii, and font sizes;
- custom-property declarations, references, duplicates, aliases, and missing
  references;
- CSS classes with no exact token in runtime sources;
- theme markers, import order, and unimported CSS files.

This is deliberately a lexical audit, not a CSS parser or proof of runtime
reachability. Property-level spacing and shadow detection is line-oriented;
dynamic class construction can make a reported selector live; a custom
property declared in one scope is considered present globally; and inline
runtime custom properties are recognized only when the quoted name and
`style` attribute share a source line. Every deletion still requires cascade,
runtime, test, and browser evidence.

## Current inventory

### Summary

| Category | Before | After | Change |
| --- | ---: | ---: | ---: |
| Raw color literals, all CSS | 1,594 | 1,404 | -190 |
| Raw color literals outside `tokens.css` | 1,533 | 1,343 | -190 |
| `color-mix()` constructs | 212 | 214 | +2 |
| CSS shadow declarations | 314 | 308 | -6 |
| SVG/filter shadow references | 7 | 7 | 0 |
| Spacing literals | 2,417 | 2,218 | -199 |
| Dimension literals | 1,250 | 1,172 | -78 |
| Radius literals | 7 | 7 | 0 |
| Font-size literals | 791 | 732 | -59 |
| Legacy alias declarations | 84 | 66 | -18 |
| Aliases without consumers | 18 | 0 | -18 |
| CSS files not imported | 0 | 0 | 0 |

`color-mix()` is reported separately because it is an intentional
token-derived color operation, not equivalent to a raw color literal.

### Raw color literals by file

| File | Raw colors | `color-mix()` |
| --- | ---: | ---: |
| `src/index.css` | 945 | 12 |
| `src/styles/activity-rail.css` | 0 | 5 |
| `src/styles/app-command-bar.css` | 2 | 7 |
| `src/styles/canvas-navigation.css` | 0 | 7 |
| `src/styles/context-menu.css` | 0 | 0 |
| `src/styles/editor-refactor.css` | 322 | 51 |
| `src/styles/editor-tabs.css` | 0 | 0 |
| `src/styles/errors-panel.css` | 0 | 0 |
| `src/styles/foundations.css` | 0 | 0 |
| `src/styles/panels-workspace.css` | 0 | 4 |
| `src/styles/panels.css` | 54 | 60 |
| `src/styles/project-explorer.css` | 7 | 32 |
| `src/styles/releases.css` | 8 | 2 |
| `src/styles/responsive.css` | 1 | 0 |
| `src/styles/settings.css` | 0 | 0 |
| `src/styles/source-control-panel.css` | 0 | 2 |
| `src/styles/sql-playground.css` | 0 | 5 |
| `src/styles/tokens.css` | 61 | 0 |
| `src/styles/ui.css` | 0 | 12 |
| `src/styles/workspace-shell.css` | 4 | 15 |
| **Total** | **1,404** | **212** |

### Missing custom-property references

There are 23 references to 5 undeclared compatibility names, and every
reference has an explicit local fallback. The names are `--accent-soft` (1),
`--accent-strong` (1), `--editor-accent-contrast` (2), `--muted-text` (18),
and `--surface-panel` (1).

There are no missing custom-property references without a fallback.
`npm run styles:audit -- --strict` therefore exits successfully.

## Changes made

### SOSTITUIBILE

Three white-on-accent release declarations now use
`var(--color-text-on-accent)`. The token has the same computed value and the
role is unambiguous: release badge, dark announcement surface, and primary
release action.

The strict-audit follow-up migrates all 28 missing references without
fallbacks to canonical tokens:

- legacy editor spacing uses `--space-3` and `--space-4`;
- strong accent text uses `--color-accent-hover`;
- panel and muted surfaces use `--editor-panel-strong` and
  `--editor-panel-muted`;
- legacy canvas fills use `--diagram-canvas-fill` or retain their explicit
  panel fallback where that was the existing computed behavior;
- soft shadows use the shared `--studio-shadow-panel`;
- diagnostic and SQL surfaces use `--color-bg-panel` and `--color-bg-hover`;
- compact control heights use `--size-button-sm`;
- the existing tag-chip reference is backed by the new semantic
  `--radius-pill` token.

### ALIAS DA CONSOLIDARE

The initial `src/index.css` root duplicated the canonical studio/editor/diagram
token layer imported later from `tokens.css`. Those earlier declarations were
removed because the later canonical declarations always won in the same root
scope.

`--diagram-version-layout` is now canonicalized in `tokens.css` as an alias of
`--diagram-version-modified`. This preserves its existing fallback value and
its TypeScript consumer.

The following aliases had no consumers and were removed:

- `--editor-bg`, `--editor-danger`, `--editor-success`;
- `--editor-radius-sm`, `--editor-radius-md`, `--editor-radius-lg`;
- `--editor-shadow-panel`;
- `--studio-radius-sm`, `--studio-radius-md`, `--studio-radius-lg`,
  `--studio-radius-xl`, `--studio-radius-panel`;
- `--studio-space-xs`, `--studio-space-sm`, `--studio-space-md`,
  `--studio-space-lg`, `--studio-space-xl`;
- `--studio-line-strong`, including its unused Unibo-scoped override.

The remaining 66 legacy aliases all have consumers and remain compatibility
bridges to canonical values.

### CSS MORTO

Removed 1,678 physical lines of unreachable landing-page and old diagram
preview rules:

- 1,575 lines from `src/index.css`;
- 12 lines from `src/styles/editor-refactor.css`;
- 91 lines from `src/styles/panels.css`.

The deleted families were `landing-*` and the obsolete
`preview-node`/`preview-entity`/`preview-relationship`/
`preview-attribute`/`preview-line`/`preview-cardinality` implementation.
Current welcome pages use `workspace-*` components and the active diagram
previews use separate component-specific class families.

Evidence used before deletion:

1. repository-wide searches across CSS, TypeScript, TSX, tests, and relevant
   docs found no runtime class, template, or attribute consumers;
2. the audit independently classified these exact class families as potential
   dead selectors;
3. `src/main.tsx` and the CSS import chain confirmed that the deleted rules
   were not alternate entry-point assets;
4. current Welcome, workspace, and ER-canvas flows were exercised before the
   deletion, then the same flows and viewports were repeated after it;
5. focused tests, the production build, and the full unit/E2E suites form the
   final reachability and regression check recorded in the delivery report.

Including the redundant root declarations and unused aliases, the edited CSS
files contain 1,754 fewer physical lines than the starting SHA.

## Intentional residuals

### RESIDUO INTENZIONALE

- Raw colors in `tokens.css` are the canonical palette definitions.
- Canvas/SVG/export colors remain literal where they represent serialized
  output, alpha compositing over a specific background, diagram semantics, or
  syntax-highlighting roles not safely interchangeable with UI chrome.
- One-off responsive dimensions, diagram geometry, hairlines, optical offsets,
  and typography values remain literal when promoting them would create a
  value-named token rather than a shared decision.
- Local runtime properties such as `--project-explorer-depth`,
  `--sql-explorer-level`, `--sql-playground-results-height`, and
  `--workspace-toast-duration` remain component-owned inputs.
- Compatibility fallbacks remain where they protect older layered selectors.

### FUORI SCOPE

- Optional consolidation of the 23 compatibility references that already
  have explicit local fallbacks;
- broad conversion of the remaining 1,343 raw colors without semantic review;
- complete normalization of editor/panel spacing and typography;
- removal of any of the 644 other automatically flagged selectors without
  runtime proof;
- dark/system themes, density controls, or a redesign;
- changes to diagram, SQL, SQLite, versioning, project formats, exports, or
  application behavior.

## Manual regression checklist

The final delivery records the exact commands, screenshots, and outcomes. The
required browser review covers 1440×900, 1024×768, 768×1024, 390×844, and
360×800, plus Welcome/empty workspace, Project Explorer, activity rail,
conceptual canvas, Inspector, Errors, Notes, Code, Translation, Logical, SQL
output/reverse/playground/explorer, Database Workspace, Settings, command
palette, dialogs, source control, and version compare. Special attention is
given to focus, contrast, reduced motion, breakpoints, SVG/canvas output,
alpha colors, local properties, and dynamic selectors.
