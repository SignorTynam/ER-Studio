import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ProjectTextFileModal } from "../src/components/project/ProjectTextFileModal.tsx";
import { I18nProvider } from "../src/i18n/I18nProvider.tsx";
import { withTestLocale } from "./utils/i18nTestUtils.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const renderInEnglish = (element: React.ReactElement): string =>
  withTestLocale("en", () => renderToStaticMarkup(element));

test("ProjectTextFileModal renderizza editor note per file txt", () => {
  const source = readFileSync(new URL("../src/components/project/ProjectTextFileModal.tsx", import.meta.url), "utf8");
  const markup = renderInEnglish(
    <I18nProvider>
      <ProjectTextFileModal
        open
        fileName="notes.txt"
        content="Project note"
        editable
        onChange={() => undefined}
        onClose={() => undefined}
      />
    </I18nProvider>,
  );

  assert.match(markup, /notes\.txt/);
  assert.match(markup, /textarea/);
  assert.match(markup, /Project note/);
  assert.match(markup, /project-text-file-modal/);
  // Fase C4b: Esc/backdrop/focus li gestisce la Modal shell condivisa.
  assert.match(source, /<Modal[\s\S]*onClose=\{onClose\}/);
  assert.match(markup, /role="dialog"/);
});

test("App apre txt e SQL nel WorkspaceTextEditor principale", () => {
  const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

  assert.match(source, /activeProjectFile && activeProjectFile\.kind !== "schema"/);
  assert.match(source, /<WorkspaceTextEditor/);
  assert.match(source, /onChange=\{handleActiveTextFileChange\}/);
  assert.doesNotMatch(source, /<ProjectTextFileModal/);
  assert.doesNotMatch(source, /<ProjectTextFilePanel/);
  assert.doesNotMatch(source, /note-file-panel/);
});
