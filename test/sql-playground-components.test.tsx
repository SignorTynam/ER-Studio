import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nProvider } from "../src/i18n/I18nProvider.tsx";
import { SqlPlaygroundEditor } from "../src/features/sql-playground/SqlPlaygroundEditor.tsx";
import { SqlPlaygroundError } from "../src/features/sql-playground/SqlPlaygroundError.tsx";
import { SqlPlaygroundResults } from "../src/features/sql-playground/SqlPlaygroundResults.tsx";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

function render(node: React.ReactNode): string {
  return renderToStaticMarkup(<I18nProvider>{node}</I18nProvider>);
}

test("SQL playground editor has an accessible multiline input and real execute action", () => {
  const markup = render(
    <SqlPlaygroundEditor value="SELECT 1;" running={false} executeDisabled={false} onChange={() => undefined} onExecute={() => undefined} />,
  );
  assert.match(markup, /<textarea/);
  assert.match(markup, /Editor query SQL|SQL query editor/);
  assert.match(markup, /Esegui|Run/);
  assert.match(markup, /Ctrl\/Cmd\+(?:Invio|Enter)/);
});

test("SQL playground renders multiple semantic result sets, NULL, BLOB and DML summaries", () => {
  const markup = render(<SqlPlaygroundResults results={[
    {
      statementIndex: 0,
      sql: "SELECT a, b FROM t;",
      kind: "rows",
      columns: ["a", "b"],
      rows: [[null, { kind: "blob", byteLength: 8 }]],
      rowCount: 1,
      truncated: false,
      changes: 0,
      durationMs: 1,
    },
    {
      statementIndex: 1,
      sql: "INSERT INTO t VALUES (1);",
      kind: "changes",
      columns: [],
      rows: [],
      rowCount: 0,
      truncated: false,
      changes: 1,
      lastInsertRowId: "1",
      durationMs: 2,
    },
  ]} />);
  assert.match(markup, /<table>/);
  assert.match(markup, /<th scope="col">a<\/th>/);
  assert.match(markup, /NULL/);
  assert.match(markup, /\[BLOB · 8 byte\]/);
  assert.match(markup, /Righe modificate|Rows changed/);
  assert.match(markup, /Ultimo ID inserito|Last inserted ID/);
  assert.match(markup, /Istruzione 2|Statement 2/);
});

test("SQL playground errors expose a useful SQLite detail through a polite live region", () => {
  const markup = render(<SqlPlaygroundError error={{ operation: "execute", message: "UNIQUE constraint failed: student.id", statementIndex: 0, recoverable: true }} />);
  assert.match(markup, /aria-live="polite"/);
  assert.match(markup, /La query non è stata eseguita|The query was not run/);
  assert.match(markup, /UNIQUE constraint failed/);
  assert.match(markup, /Errore nell&#x27;istruzione 1|Error in statement 1/);
});
