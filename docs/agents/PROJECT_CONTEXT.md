# Project context and sources of truth

buildER is a browser-based editor for Chen-style Entity-Relationship diagrams.
It combines a responsive SVG modelling canvas, ERS source editing, conceptual
to logical and relational transformations, SQL reverse engineering, SQLite
workspaces, export, and local project history.

## Confirmed stack

- React 18, TypeScript, and Vite.
- SVG canvas rendering and pointer-based interaction.
- SQLite WebAssembly for SQL Playground and Database Workspace.
- Node's test runner through `tsx` for unit and integration tests.
- Playwright with Chromium and axe for end-to-end and accessibility coverage.
- CSS design tokens with a light theme.

The supported development runtime is Node.js 20 with npm 10 or newer. See
[`package.json`](../../package.json), [`README.md`](../../README.md), and
[`docs/ARCHITECTURE.md`](../ARCHITECTURE.md).

## Main application flows and directories

- `src/App.tsx` orchestrates workspace state and remains a high-risk integration
  point.
- `src/canvas/` renders and interacts with the conceptual ER diagram.
- `src/translation/` and `src/utils/erTranslation.ts` resolve conceptual
  generalizations and multivalued/composite attributes.
- `src/logical/` and `src/utils/logicalTranslation.ts` build the logical model,
  relational tables, constraints, primary keys, and foreign keys.
- `src/utils/ers.ts` parses and serializes live ERS source.
- `src/utils/projectFile.ts` handles multi-file `.ersp` projects.
- `src/utils/projectSchemaFile.ts` handles standalone `.erschema` schemas.
- `src/utils/sqlReverse*.ts` parse SQL and convert it through logical and ER
  previews.
- `src/features/sql-playground/` and `src/features/database-workspace/` manage
  real SQLite data in browser workers.
- `src/releases/` contains the application release catalog and localization
  metadata.
- `src/i18n/` contains the provider, locale state, and Italian, English, and
  Albanian dictionaries.
- `src/styles/tokens.css` is the canonical design-token source; legacy aliases
  map older surfaces to canonical tokens.
- `test/` contains unit and integration tests; `tests/e2e/` contains Playwright
  flows.

The placement rules are detailed in
[`docs/REPOSITORY_STRUCTURE.md`](../REPOSITORY_STRUCTURE.md).

## File formats and version concepts

- `.ersp` is the complete multi-file project format. Its current internal
  format version is defined by `CURRENT_PROJECT_FILE_VERSION` in
  `src/utils/projectFile.ts`; legacy project and diagram JSON are migrated.
- `.erschema` is a single-schema JSON document. Its format version is defined
  by `CURRENT_SCHEMA_FILE_VERSION` in `src/utils/projectSchemaFile.ts`.
- `.ers` is textual ERS source with parser/serializer round-trip coverage.
- `.sql` and `.txt` can live in the project tree.
- `.sqlite`, `.sqlite3`, and `.db` are opened as isolated database workspaces
  and are not serialized into `.ersp` project history.

Application SemVer in `package.json`, Git tags, GitHub Releases, diagram or
project format versions, and local `.ersp` commit history are distinct. Never
change one merely because another changes.

## Domain flows

The conceptual canvas models entities, weak entities, relationships,
attributes, cardinalities, identifiers, and ISA groups. ER translation
resolves generalizations and non-atomic or multivalued attributes. Logical
translation maps the result to tables, columns, PK/UNIQUE constraints, foreign
keys, and a relational schema. SQL reverse engineering travels in the opposite
direction from parsed DDL or SQLite metadata to logical and conceptual
previews.

Detailed invariants live in [`ER_DOMAIN.md`](ER_DOMAIN.md).

## Localization and design system

Visible UI strings use `useI18n()`/`t(...)` and must exist in all required
locales: Italian (`it`), English (`en`), and Albanian (`sq`). The exact locale
list is machine-readable in
[`config/repository-policy.json`](../../config/repository-policy.json).

`src/styles/tokens.css` is the visual source of truth for colors, spacing,
sizes, radii, shadows, focus, motion, and canvas tokens. Reuse shared UI
primitives and the patterns in
[`docs/CODEX_UI_STYLE_GUIDE.md`](../CODEX_UI_STYLE_GUIDE.md). Preserve visible
focus, keyboard behavior, ARIA semantics, WCAG AA contrast, touch access, and
`prefers-reduced-motion`.

## High-risk regression areas

- `.ersp`, `.erschema`, and ERS compatibility or silent field loss.
- cardinalities, internal/external/composite identifiers, and multivalued
  attributes;
- collapse-up, collapse-down, logical translation, PK, UNIQUE, and FK mapping;
- SQL parser spans, unsupported statements, and reverse conversion;
- model coordinates versus viewport transforms, zoom, pan, drag, resize, and
  minimap projection;
- local project versioning snapshots and restore;
- i18n key parity and visible hardcoded text;
- `src/App.tsx` integration and worker lifecycle.

Tests and implementation are evidence, but contradictions must be reconciled
in documentation rather than silently accepted.
