import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ProjectFileTabs } from "../src/components/project/ProjectFileTabs.tsx";
import { I18nProvider } from "../src/i18n/I18nProvider.tsx";
import { createTextWorkspaceFile } from "../src/utils/projectExplorer.ts";
import { createWelcomeTab } from "../src/utils/projectTabs.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

test("ProjectFileTabs renders Welcome and file tabs with tab roles", () => {
  const note = createTextWorkspaceFile("notes.txt", "text", "hello");
  const markup = renderToStaticMarkup(
    <I18nProvider>
      <ProjectFileTabs
        tabs={[createWelcomeTab(), { id: `file:${note.id}`, kind: "file", fileId: note.id, title: note.name, dirty: true }]}
        activeTabId={`file:${note.id}`}
        files={{ [note.id]: note }}
        onSelectTab={() => undefined}
        onCloseTab={() => undefined}
        onNewFile={() => undefined}
      />
    </I18nProvider>,
  );

  // Fase D1: tab-documento in stile editor, non tab ARIA (nessun tabpanel
  // esiste): pattern toolbar con roving tabindex + aria-current sull'attiva.
  assert.match(markup, /role="toolbar"/);
  assert.doesNotMatch(markup, /role="tab"/);
  assert.doesNotMatch(markup, /aria-selected/);
  assert.match(markup, /Welcome/);
  assert.match(markup, /notes\.txt/);
  assert.match(markup, /aria-current="page"/);
  assert.match(markup, /aria-label="Unsaved changes"|aria-label="Modifiche non salvate"/);
});

test("ProjectFileTabs supports many tabs with scroller and stable new button", () => {
  const files = Object.fromEntries(
    Array.from({ length: 20 }, (_, index) => {
      const file = createTextWorkspaceFile(`notes-${index}.txt`, "text", "hello");
      return [file.id, file];
    }),
  );
  const tabs = Object.values(files).map((file) => ({
    id: `file:${file.id}`,
    kind: "file" as const,
    fileId: file.id,
    title: file.name,
    dirty: file.name === "notes-3.txt",
  }));
  const markup = renderToStaticMarkup(
    <I18nProvider>
      <ProjectFileTabs
        tabs={tabs}
        activeTabId={tabs[4].id}
        files={files}
        onSelectTab={() => undefined}
        onCloseTab={() => undefined}
        onNewFile={() => undefined}
      />
    </I18nProvider>,
  );

  assert.match(markup, /project-file-tabs__scroller/);
  assert.match(markup, /project-file-tabs__new/);
  assert.match(markup, /project-file-tab active/);
  assert.match(markup, /project-file-tab dirty/);
});

test("ProjectFileTabs close button stops tab selection propagation", () => {
  const source = readFileSync(new URL("../src/components/project/ProjectFileTabs.tsx", import.meta.url), "utf8");

  assert.match(source, /event\.stopPropagation\(\)/);
  assert.match(source, /event\.button === 1/);
  assert.match(source, /onCloseTab\(tab\.id\)/);
});

test("ProjectFileTabs exposes overflow, bulk close, reveal, copy path, reorder and keyboard navigation", () => {
  const source = readFileSync(new URL("../src/components/project/ProjectFileTabs.tsx", import.meta.url), "utf8");

  assert.match(source, /project-file-tabs__open-menu/);
  assert.match(source, /closeOthers\(contextTab\.id\)/);
  assert.match(source, /closeToRight\(contextTab\.id\)/);
  assert.match(source, /onRevealFile/);
  assert.match(source, /navigator\.clipboard\.writeText/);
  assert.match(source, /application\/x-builder-tab/);
  assert.match(source, /handleTabKeyDown/);
  assert.match(source, /contextMenuRef\.current.*offsetWidth/s);
  assert.match(source, /handleMenuKeyDown/);
});

test("App confirms closing a dirty tab without claiming edits are discarded", () => {
  const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

  assert.match(source, /if \(tab\?\.dirty\)/);
  assert.match(source, /projectTabs\.closeModifiedTitle/);
  assert.match(source, /projectTabs\.closeModifiedMessage/);
  assert.match(source, /requestConfirmDialog/);
});
