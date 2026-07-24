import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nProvider } from "../src/i18n/I18nProvider.tsx";
import { SqlExplorerPanel } from "../src/features/sql-playground/SqlExplorerPanel.tsx";
import { SqlExplorerTree } from "../src/features/sql-playground/SqlExplorerTree.tsx";
import { SqlPlaygroundSplitter } from "../src/features/sql-playground/SqlPlaygroundSplitter.tsx";
import { SqlPlaygroundManager } from "../src/features/sql-playground/SqlPlaygroundManager.ts";
import { createSqlPlaygroundSessionState } from "../src/utils/sqlPlayground.ts";
import type { SqlExplorerMetadata } from "../src/features/sql-playground/sqlExplorerTypes.ts";
import { withTestLocale } from "./utils/i18nTestUtils.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

function render(node: React.ReactNode): string {
  return withTestLocale("en", () => renderToStaticMarkup(<I18nProvider>{node}</I18nProvider>));
}

const metadata: SqlExplorerMetadata = {
  databases: [{
    sequence: 0,
    name: "main",
    file: "",
    tables: [{
      name: "STUDENT",
      sql: "CREATE TABLE STUDENT(id INTEGER PRIMARY KEY)",
      columns: [{ position: 0, name: "id", dataType: "INTEGER", notNull: true, defaultValue: null, primaryKeyPosition: 1, references: [] }],
      foreignKeys: [],
      indexes: [],
    }],
    views: [{ name: "STUDENT_NAMES", sql: "CREATE VIEW STUDENT_NAMES AS SELECT id FROM STUDENT" }],
    indexes: [],
    triggers: [],
  }],
};

test("SQL Explorer renders a semantic roving-tabindex tree with real counts", () => {
  const markup = render(<SqlExplorerTree metadata={metadata} schemaName="university.erschema" />);
  assert.match(markup, /role="tree"/);
  assert.match(markup, /role="treeitem"/);
  assert.match(markup, /aria-expanded="true"/);
  assert.match(markup, /tabindex="0"/);
  assert.match(markup, /main/);
  assert.match(markup, /Tabelle \(1\)|Tables \(1\)/);
  assert.match(markup, /Viste \(1\)|Views \(1\)/);
});

test("SQL Explorer empty states expose real navigation actions", () => {
  const markup = render(
    <SqlExplorerPanel
      manager={null}
      sessionId="project:schema"
      schemaName="university.erschema"
      hasProject
      hasSchema
      onOpenPlayground={() => undefined}
      onClose={() => undefined}
    />,
  );
  assert.match(markup, /Apri SQL Playground|Open SQL Playground/);
  assert.match(markup, /<button/);
  assert.match(markup, /SQL Explorer/);
  assert.match(markup, /Aggiungi database|Add database/);
  assert.match(markup, /sql-explorer-panel__toolbar/);
});

test("SQL Explorer distinguishes no project, no database, closed Playground, and missing database", () => {
  const noProject = render(
    <SqlExplorerPanel
      manager={null}
      sessionId={null}
      schemaName={null}
      hasProject={false}
      hasSchema={false}
      onOpenPlayground={() => undefined}
      onClose={() => undefined}
    />,
  );
  assert.match(noProject, /No project available/);
  assert.match(noProject, /Create or open a project to use SQL Explorer/);

  const noDatabase = render(
    <SqlExplorerPanel
      manager={null}
      sessionId={null}
      schemaName="main.erschema"
      hasProject
      hasSchema
      onOpenPlayground={() => undefined}
      onClose={() => undefined}
    />,
  );
  assert.match(noDatabase, /No database to explore/);
  assert.match(noDatabase, /Open in Playground|Open SQL Playground/);
  assert.match(noDatabase, /Add database/);

  const closed = render(
    <SqlExplorerPanel
      manager={null}
      sessionId="project:schema"
      schemaName="main.erschema"
      hasProject
      hasSchema
      onOpenPlayground={() => undefined}
      onClose={() => undefined}
    />,
  );
  assert.match(closed, /SQL Playground is not open/);

  const manager = new SqlPlaygroundManager();
  manager.setSessionState(createSqlPlaygroundSessionState({
    sessionId: "project:schema",
    projectId: "project",
    schemaFileId: "schema",
    schemaName: "main.erschema",
    currentGeneratedChecksum: "checksum",
  }));
  const missing = render(
    <SqlExplorerPanel
      manager={manager}
      sessionId="project:schema"
      schemaName="main.erschema"
      hasProject
      hasSchema
      onOpenPlayground={() => undefined}
      onClose={() => undefined}
    />,
  );
  assert.match(missing, /Database not available yet/);
  assert.match(missing, /Create the database in Playground/);
});

test("results splitter exposes horizontal ARIA values and keyboard-sized bounds", () => {
  const markup = render(<SqlPlaygroundSplitter value={240} min={104} max={520} onChange={() => undefined} onReset={() => undefined} />);
  assert.match(markup, /role="separator"/);
  assert.match(markup, /aria-orientation="horizontal"/);
  assert.match(markup, /aria-valuemin="104"/);
  assert.match(markup, /aria-valuemax="520"/);
  assert.match(markup, /aria-valuenow="240"/);
  assert.match(markup, /tabindex="0"/);
  const source = readFileSync(new URL("../src/features/sql-playground/SqlPlaygroundSplitter.tsx", import.meta.url), "utf8");
  assert.match(source, /setPointerCapture/);
  assert.match(source, /releasePointerCapture/);
  assert.match(source, /event\.shiftKey \? 24 : 8/);
  assert.match(source, /document\.body\.style\.userSelect = drag\.userSelect/);
});
