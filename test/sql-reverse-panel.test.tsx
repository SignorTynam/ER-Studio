import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SqlReversePanel } from "../src/components/reverse/SqlReversePanel.tsx";
import { I18nProvider } from "../src/i18n/I18nProvider.tsx";
import { withTestLocale } from "./utils/i18nTestUtils.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const renderInEnglish = (element: React.ReactElement): string =>
  withTestLocale("en", () => renderToStaticMarkup(element));

test("SqlReversePanel usa header ed editor condivisi senza progress bar", () => {
  const markup = renderInEnglish(
    <I18nProvider>
      <SqlReversePanel
        sql="CREATE TABLE course (id INT);"
        errorMessage=""
        issues={[{
          id: "sql-issue-1",
          level: "error",
          code: "MISSING_COLUMN_TYPE",
          message: "Missing type",
          sourceSpan: { start: 21, end: 23, line: 1, column: 22 },
        }]}
        logicalIssues={[]}
        tableCount={1}
        unsupportedStatementCount={0}
        isPreviewReady={false}
        sourceFileName="course.sql"
        onSqlChange={() => undefined}
        onAnalyze={() => undefined}
        onLoadFile={() => undefined}
        onClear={() => undefined}
      />
    </I18nProvider>,
  );

  assert.match(markup, /SQL Reverse/);
  assert.match(markup, /<header class="workspace-panel__header/);
  assert.match(markup, /panel-icon-button/);
  assert.match(markup, /designer-code-line-numbers/);
  assert.match(markup, /designer-code-highlight/);
  assert.match(markup, /designer-code-input/);
  assert.match(markup, /sql-token-keyword/);
  assert.match(markup, /code-editor-line--error/);
  assert.match(markup, /code-editor-diagnostic-popover/);
  assert.doesNotMatch(markup, /readOnly=""/i);
  assert.match(markup, /Import SQL file/);
  assert.match(markup, /Analyze code/);
  assert.match(markup, /Clear/);
  assert.doesNotMatch(markup, /sql-reverse-progress/);
  assert.doesNotMatch(markup, />Validate</);
  assert.doesNotMatch(markup, /sql-reverse-panel__issues/);
  assert.doesNotMatch(markup, /sql-reverse-panel__error/);
  assert.doesNotMatch(markup, /Open SQL Reverse workflow/);
});

test("Reverse inline workflow non usa piu SqlReverseInputModal in App", () => {
  const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(appSource, /<SqlReverseInputModal/);
  assert.match(appSource, /<SqlReversePanel/);
});

test("SQL Reverse non usa piu textarea e stili legacy separati", () => {
  const componentSource = readFileSync(new URL("../src/components/reverse/SqlReversePanel.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/styles/project-explorer.css", import.meta.url), "utf8");

  assert.match(componentSource, /<CodeEditorSurface/);
  assert.match(componentSource, /<PanelIconButton/);
  assert.doesNotMatch(componentSource, /<textarea/);
  assert.doesNotMatch(componentSource, /sql-reverse-progress/);
  assert.doesNotMatch(css, /\.sql-reverse-panel__editor\s*\{/);
  assert.doesNotMatch(css, /\.sql-reverse-panel__issues\s*\{/);
});

test("Code e Reverse condividono il solo contratto header canonico", () => {
  const legacyCss = readFileSync(new URL("../src/styles/project-explorer.css", import.meta.url), "utf8");
  const sharedCss = readFileSync(new URL("../src/styles/panels-workspace.css", import.meta.url), "utf8");
  const codeHeader = readFileSync(new URL("../src/components/project/ProjectActivityPanelHeader.tsx", import.meta.url), "utf8");
  const reversePanel = readFileSync(new URL("../src/components/reverse/SqlReversePanel.tsx", import.meta.url), "utf8");

  assert.match(sharedCss, /\.workspace-panel__header\s*\{[^}]*height:\s*var\(--size-panel-header\)/);
  assert.doesNotMatch(legacyCss, /\.project-activity-section__header\s*\{/);
  assert.doesNotMatch(legacyCss, /\.sql-reverse-panel__header\s*\{/);
  assert.match(codeHeader, /<WorkspacePanelHeader/);
  assert.match(reversePanel, /<WorkspacePanelHeader/);
});
