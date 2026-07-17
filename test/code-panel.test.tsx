import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CodePanel } from "../src/components/CodePanel.tsx";
import { I18nProvider } from "../src/i18n/I18nProvider.tsx";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

test("CodePanel embedded non mostra caption CODE ne bottone close", () => {
  const markup = renderToStaticMarkup(
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
  assert.match(markup, /textarea/);
  assert.doesNotMatch(markup, />CODE</);
  assert.doesNotMatch(markup, /designer-panel-close/);
});

test("CodePanel evidenzia ERS editabile come default", () => {
  const markup = renderToStaticMarkup(
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
  const markup = renderToStaticMarkup(
    <I18nProvider>
      <CodePanel
        embedded
        showHeader={false}
        language="sql"
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
  assert.match(markup, /readOnly=""/i);
});

test("CodePanel mostra schema relazionale read-only", () => {
  const markup = renderToStaticMarkup(
    <I18nProvider>
      <CodePanel
        embedded
        showHeader={false}
        language="relational"
        code={"COURSE( i\u0332d\u0332, code )"}
        editable
        onCodeChange={() => undefined}
      />
    </I18nProvider>,
  );

  assert.match(markup, /designer-relational-schema-table/);
  assert.match(markup, /designer-relational-schema-punctuation/);
  assert.match(markup, /readOnly=""/i);
});

test("CodePanel embedded CSS rimuove padding e occupa altezza completa", () => {
  const css = readFileSync(new URL("../src/styles/project-explorer.css", import.meta.url), "utf8");

  assert.match(css, /\.project-activity-content \.diagram-code-panel\.embedded\s*\{[^}]*height:\s*100%/);
  assert.doesNotMatch(css, /\.project-activity-content \.diagram-code-panel\.embedded\s*\{[^}]*height:\s*auto/);
  assert.match(css, /\.diagram-code-panel\.embedded\s*\{[\s\S]*padding:\s*0/);
  assert.match(css, /\.diagram-code-panel\.embedded \.designer-code-editor\s*\{[^}]*height:\s*100%/);
  assert.match(css, /\.diagram-code-panel\.embedded \.designer-code-editor\s*\{[^}]*flex:\s*1 1 0/);
  assert.match(css, /\.diagram-code-panel\.embedded \.designer-code-editor\s*\{[\s\S]*padding:\s*0/);
  assert.match(css, /\.diagram-code-panel\.embedded \.designer-code-editor\s*\{[\s\S]*--embedded-code-gutter-width:\s*clamp/);
  assert.match(css, /\.diagram-code-panel\.embedded \.designer-code-editor\s*\{[\s\S]*grid-template-columns:\s*var\(--embedded-code-gutter-width\) minmax\(0,\s*1fr\)/);
  assert.match(css, /\.diagram-code-panel\.embedded \.designer-code-editor\s*\{[\s\S]*background:[\s\S]*rgba\(238,\s*242,\s*237,\s*0\.86\)/);
  assert.match(css, /\.diagram-code-panel\.embedded \.designer-code-scroll-layer\s*\{[\s\S]*height:\s*100%/);
  assert.match(css, /\.diagram-code-panel\.embedded \.designer-code-line-numbers\s*\{[\s\S]*max-width:\s*40px/);
  assert.match(css, /\.diagram-code-panel\.embedded \.designer-code-line-numbers\s*\{[\s\S]*height:\s*100%/);
  assert.match(css, /\.diagram-code-panel\.embedded \.designer-code-line-numbers\s*\{[\s\S]*background:\s*transparent/);
  assert.match(css, /\.diagram-code-panel\.embedded \.designer-code-line-numbers::after\s*\{[\s\S]*flex:\s*1 1 auto/);
  assert.match(css, /--line-number-digits/);
});
