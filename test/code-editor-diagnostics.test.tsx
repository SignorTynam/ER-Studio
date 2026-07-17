import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CodeEditorSurface } from "../src/components/editor/CodeEditorSurface.tsx";
import { I18nProvider } from "../src/i18n/I18nProvider.tsx";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

function renderSurface(readOnly: boolean) {
  return renderToStaticMarkup(
    <I18nProvider>
      <CodeEditorSurface
        value={"CREATE TABLE Course (\n  id INTEGER\n);"}
        language="sql"
        readOnly={readOnly}
        onChange={() => undefined}
        ariaLabel="SQL test editor"
        diagnostics={[{ id: "sql:2", level: "warning", line: 2, column: 3, message: "Type warning" }]}
      />
    </I18nProvider>,
  );
}

test("shared code editor renders one scroll surface with gutter, highlight and textarea", () => {
  const markup = renderSurface(false);
  assert.match(markup, /designer-code-line-numbers/);
  assert.match(markup, /designer-code-scroll-layer/);
  assert.match(markup, /designer-code-highlight/);
  assert.match(markup, /designer-code-input/);
  assert.match(markup, /wrap="off"/);
  assert.doesNotMatch(markup, /readOnly=""/i);
});

test("shared code editor exposes explicit read-only mode", () => {
  assert.match(renderSurface(true), /readOnly=""/i);
});

test("shared code editor renders warning line, gutter marker and accessible popup", () => {
  const markup = renderSurface(false);
  assert.match(markup, /code-editor-line--warning/);
  assert.match(markup, /code-editor-gutter-line--warning/);
  assert.match(markup, /code-editor-diagnostic-popover level-warning/);
  assert.match(markup, /role="status"/);
  assert.match(markup, /Type warning/);
});

test("shared code editor CSS keeps input and highlight perfectly overlaid", () => {
  const css = readFileSync(new URL("../src/styles/editor-refactor.css", import.meta.url), "utf8");
  assert.match(css, /\.designer-code-scroll-layer > \.designer-code-highlight,[\s\S]*\.designer-code-scroll-layer > \.designer-code-input\s*\{[^}]*position:\s*absolute/);
  assert.match(css, /\.designer-code-scroll-layer > \.designer-code-highlight,[\s\S]*\.designer-code-scroll-layer > \.designer-code-input\s*\{[^}]*inset:\s*0/);
  assert.match(css, /\.designer-code-scroll-layer > \.designer-code-highlight\s*\{[^}]*overflow:\s*hidden/);
  assert.match(css, /\.designer-code-scroll-layer > \.designer-code-input\s*\{[^}]*overflow:\s*auto/);
  assert.match(css, /\.code-editor-diagnostic-popover\s*\{[^}]*position:\s*absolute/);
  assert.doesNotMatch(css, /\.designer-code-error\s*\{/);
});
