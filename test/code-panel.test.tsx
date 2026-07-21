import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CodePanel } from "../src/components/CodePanel.tsx";
import { I18nProvider } from "../src/i18n/I18nProvider.tsx";
import { withTestLocale } from "./utils/i18nTestUtils.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const renderInItalian = (element: React.ReactElement): string =>
  withTestLocale("it", () => renderToStaticMarkup(element));

test("CodePanel embedded non mostra caption CODE ne bottone close", () => {
  const markup = renderInItalian(
    <I18nProvider>
      <CodePanel
        embedded
        showHeader={false}
        showCloseButton={false}
        code="entity Course"
        editable
        onCodeChange={() => undefined}
        onClose={() => undefined}
      />
    </I18nProvider>,
  );

  assert.match(markup, /diagram-code-panel embedded/);
  assert.match(markup, /--line-number-digits:1/);
  assert.match(markup, /designer-code-line-numbers/);
  assert.match(markup, /designer-code-highlight/);
  assert.match(markup, /designer-code-input/);
  assert.match(markup, /<textarea[^>]*wrap="off"/);
  assert.doesNotMatch(markup, />CODE</);
  assert.doesNotMatch(markup, /designer-panel-close/);
});

test("CodePanel evidenzia ERS editabile come default", () => {
  const markup = renderInItalian(
    <I18nProvider>
      <CodePanel
        embedded
        showHeader={false}
        code="entity Course"
        editable
        onCodeChange={() => undefined}
      />
    </I18nProvider>,
  );

  assert.match(markup, /ers-token-keyword/);
  assert.doesNotMatch(markup, /readOnly=""/);
  assert.doesNotMatch(markup, /readonly=""/);
});

test("CodePanel mostra SQL read-only con evidenziazione SQL", () => {
  const markup = renderInItalian(
    <I18nProvider>
      <CodePanel
        embedded
        showHeader={false}
        language="sql"
        readOnly
        code={"-- generated\nCREATE TABLE Course (\n  id INTEGER NOT NULL,\n  PRIMARY KEY (id)\n);"}
        editable
        onCodeChange={() => undefined}
      />
    </I18nProvider>,
  );

  assert.match(markup, /sql-token-comment/);
  assert.match(markup, /sql-token-keyword/);
  assert.match(markup, /sql-token-type/);
  assert.match(markup, /sql-token-modifier/);
  assert.match(markup, /sql-token-punctuation/);
  assert.match(markup, /readOnly=""/i);
});

test("CodePanel mostra schema relazionale read-only", () => {
  const markup = renderInItalian(
    <I18nProvider>
      <CodePanel
        embedded
        showHeader={false}
        language="relational"
        code={"COURSE(\n  i\u0332d\u0332,\n  department_id:DEPARTMENT\n)"}
        readOnly
        editable
        onCodeChange={() => undefined}
      />
    </I18nProvider>,
  );

  assert.match(markup, /designer-relational-schema-table/);
  assert.match(markup, /designer-relational-schema-punctuation/);
  assert.match(markup, /designer-relational-schema-primary-key/);
  assert.match(markup, /designer-relational-schema-foreign-key/);
  assert.match(markup, /designer-relational-schema-reference-separator/);
  assert.match(markup, /designer-relational-schema-reference/);
  assert.match(markup, /readOnly=""/i);
});

test("CodePanel usa diagnostica inline senza blocco errore inferiore", () => {
  const markup = renderInItalian(
    <I18nProvider>
      <CodePanel
        embedded
        code={"entity A {\n  broken\n}"}
        editable
        onCodeChange={() => undefined}
        diagnostics={[{ id: "ers:2", level: "error", line: 2, message: "Sintassi non valida" }]}
      />
    </I18nProvider>,
  );

  assert.match(markup, /code-editor-line--error/);
  assert.match(markup, /code-editor-gutter-line--error/);
  assert.match(markup, /code-editor-diagnostic-popover/);
  assert.match(markup, /Sintassi non valida/);
  assert.doesNotMatch(markup, /designer-code-error/);
});

test("CodePanel embedded CSS rimuove padding e occupa altezza completa", () => {
  const embeddedCss = readFileSync(new URL("../src/styles/project-explorer.css", import.meta.url), "utf8");
  const editorCss = readFileSync(new URL("../src/styles/editor-refactor.css", import.meta.url), "utf8");

  assert.match(embeddedCss, /\.project-activity-content \.diagram-code-panel\.embedded\s*\{[^}]*height:\s*100%/);
  assert.doesNotMatch(embeddedCss, /\.project-activity-content \.diagram-code-panel\.embedded\s*\{[^}]*height:\s*auto/);
  assert.match(embeddedCss, /\.diagram-code-panel\.embedded\s*\{[\s\S]*padding:\s*0/);
  assert.match(embeddedCss, /\.diagram-code-panel\.embedded \.designer-code-editor\s*\{[^}]*height:\s*100%/);
  assert.match(embeddedCss, /\.diagram-code-panel\.embedded \.designer-code-editor\s*\{[^}]*flex:\s*1 1 0/);
  assert.match(embeddedCss, /\.diagram-code-panel\.embedded \.designer-code-editor\s*\{[\s\S]*padding:\s*0/);
  assert.match(embeddedCss, /\.diagram-code-panel\.embedded \.designer-code-editor\s*\{[\s\S]*--embedded-code-gutter-width:\s*clamp/);
  assert.match(embeddedCss, /\.diagram-code-panel\.embedded \.designer-code-editor\s*\{[\s\S]*grid-template-columns:\s*var\(--embedded-code-gutter-width\) minmax\(0,\s*1fr\)/);
  assert.match(embeddedCss, /\.diagram-code-panel\.embedded \.designer-code-editor\s*\{[\s\S]*background:[\s\S]*rgba\(238,\s*242,\s*237,\s*0\.86\)/);
  assert.match(embeddedCss, /\.diagram-code-panel\.embedded \.designer-code-scroll-layer\s*\{[^}]*position:\s*relative/);
  assert.match(embeddedCss, /\.diagram-code-panel\.embedded \.designer-code-scroll-layer\s*\{[^}]*width:\s*100%/);
  assert.match(embeddedCss, /\.diagram-code-panel\.embedded \.designer-code-scroll-layer\s*\{[^}]*height:\s*100%/);
  assert.match(embeddedCss, /\.diagram-code-panel\.embedded \.designer-code-scroll-layer\s*\{[^}]*overflow:\s*hidden/);
  assert.match(editorCss, /\.designer-code-scroll-layer > \.designer-code-highlight,[\s\S]*?\.designer-code-scroll-layer > \.designer-code-input\s*\{[^}]*position:\s*absolute/);
  assert.match(editorCss, /\.designer-code-scroll-layer > \.designer-code-highlight,[\s\S]*?\.designer-code-scroll-layer > \.designer-code-input\s*\{[^}]*inset:\s*0/);
  assert.match(editorCss, /\.designer-code-scroll-layer > \.designer-code-highlight,[\s\S]*?\.designer-code-scroll-layer > \.designer-code-input\s*\{[^}]*width:\s*100%/);
  assert.match(editorCss, /\.designer-code-scroll-layer > \.designer-code-highlight,[\s\S]*?\.designer-code-scroll-layer > \.designer-code-input\s*\{[^}]*height:\s*100%/);
  assert.match(editorCss, /\.designer-code-scroll-layer > \.designer-code-highlight,[\s\S]*?\.designer-code-scroll-layer > \.designer-code-input\s*\{[^}]*font:\s*inherit/);
  assert.match(editorCss, /\.designer-code-scroll-layer > \.designer-code-highlight\s*\{[^}]*overflow:\s*hidden/);
  assert.match(editorCss, /\.designer-code-scroll-layer > \.designer-code-input\s*\{[^}]*overflow:\s*auto/);
  assert.match(editorCss, /\.designer-code-scroll-layer > \.designer-code-input\s*\{[^}]*resize:\s*none/);
  assert.match(embeddedCss, /\.diagram-code-panel\.embedded \.designer-code-line-numbers\s*\{[\s\S]*max-width:\s*40px/);
  assert.match(embeddedCss, /\.diagram-code-panel\.embedded \.designer-code-line-numbers\s*\{[\s\S]*height:\s*100%/);
  assert.match(embeddedCss, /\.diagram-code-panel\.embedded \.designer-code-line-numbers\s*\{[\s\S]*background:\s*transparent/);
  assert.match(embeddedCss, /\.diagram-code-panel\.embedded \.designer-code-line-numbers::after\s*\{[\s\S]*flex:\s*1 1 auto/);
  assert.match(embeddedCss, /--line-number-digits/);
});
