import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ProjectExplorer } from "../src/components/project/ProjectExplorer.tsx";
import { I18nProvider } from "../src/i18n/I18nProvider.tsx";
import {
  addProjectFolder,
  createEmptySchemaDocument,
  createProjectFromSchema,
} from "../src/utils/projectExplorer.ts";
import { withTestLocale } from "./utils/i18nTestUtils.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

function renderExplorer() {
  const state = createProjectFromSchema("Project", createEmptySchemaDocument("Main schema.erschema"));
  return {
    state,
    markup: withTestLocale("en", () => renderToStaticMarkup(
      <I18nProvider>
        <ProjectExplorer
          project={state.project}
          files={state.files}
          view={state.view}
          onOpenFile={() => undefined}
          onCreateSchema={() => undefined}
          onCreateTextFile={() => undefined}
          onCreateSqlFile={() => undefined}
          onCreateFolder={() => undefined}
          onRename={() => undefined}
          onDelete={() => undefined}
          onMove={() => undefined}
          onSelectNode={() => undefined}
          onToggleFolder={() => undefined}
          onCollapseAll={() => undefined}
          onToggleOpen={() => undefined}
          onResizeStart={() => undefined}
        />
      </I18nProvider>,
    )),
  };
}

test("ProjectExplorer renderizza root, schema e file attivo", () => {
  const { markup } = renderExplorer();

  assert.match(markup, /Explorer/);
  assert.match(markup, /Project/);
  assert.match(markup, /project-explorer-meta/);
  assert.match(markup, /Main schema\.erschema/);
  assert.match(markup, /aria-current="page"/);
  assert.match(markup, /role="treeitem"/);
});

test("ProjectExplorer distingue active file e selected folder nel tree", () => {
  const state = createProjectFromSchema("Project", createEmptySchemaDocument("Main schema.erschema"));
  const folder = addProjectFolder(state, state.project.rootId, "Models");
  assert.equal(folder.ok, true);
  if (!folder.ok) return;
  const view = { ...folder.state.view, selectedNodeId: folder.nodeId };
  const markup = withTestLocale("en", () => renderToStaticMarkup(
    <I18nProvider>
      <ProjectExplorer
        project={folder.state.project}
        files={folder.state.files}
        view={view}
        onOpenFile={() => undefined}
        onCreateSchema={() => undefined}
        onCreateTextFile={() => undefined}
        onCreateSqlFile={() => undefined}
        onCreateFolder={() => undefined}
        onRename={() => undefined}
        onDelete={() => undefined}
          onMove={() => undefined}
        onSelectNode={() => undefined}
        onToggleFolder={() => undefined}
        onCollapseAll={() => undefined}
        onToggleOpen={() => undefined}
        onResizeStart={() => undefined}
      />
    </I18nProvider>,
  ));

  assert.match(markup, /project-explorer-item folder selected/);
  assert.match(markup, /project-explorer-item file active/);
  assert.match(markup, /aria-expanded="true"/);
  assert.match(markup, /aria-selected="true"/);
});

test("ProjectExplorer espone handler per apertura file e nuovo schema", () => {
  const source = readFileSync(new URL("../src/components/project/ProjectExplorerTreeItem.tsx", import.meta.url), "utf8");
  const shellSource = readFileSync(new URL("../src/components/project/ProjectExplorer.tsx", import.meta.url), "utf8");

  assert.match(source, /props\.onOpenFile\(props\.node\.fileId\)/);
  assert.match(source, /props\.onCreateSchema\(props\.node\.id\)/);
  assert.match(source, /event\.stopPropagation\(\)/);
  assert.match(source, /role="treeitem"/);
  assert.match(source, /aria-expanded/);
  assert.match(source, /aria-current/);
  assert.match(source, /onCreateSqlFile/);
  assert.match(source, /fileText/);
  assert.match(shellSource, /selectedTargetFolderId/);
  assert.match(shellSource, /ProjectExplorerContextMenu/);
  assert.match(shellSource, /projectExplorer\.actions\.close/);
  assert.doesNotMatch(shellSource, /project-explorer-more-menu/);
  assert.doesNotMatch(shellSource, /projectExplorer\.actions\.more/);
});

test("ProjectExplorer context menu usa sezioni e azione danger", () => {
  const source = readFileSync(new URL("../src/components/project/ProjectExplorerContextMenu.tsx", import.meta.url), "utf8");

  assert.match(source, /project-explorer-context-menu__section/);
  assert.match(source, /project-explorer-context-menu__item/);
  assert.match(source, /project-explorer-context-menu__danger/);
  assert.match(source, /menuRef\.current\?\.offsetWidth/);
  assert.match(source, /viewportWidth - menuWidth - 4/);
  assert.match(source, /ArrowDown/);
  assert.match(source, /querySelector<HTMLButtonElement>/);
});

test("file txt apre una tab e usa l'editor principale senza sostituire Explorer", () => {
  const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const filePanelStart = appSource.indexOf('activeActivityPanel === "file"');
  const filePanelEnd = appSource.indexOf(') : activeActivityPanel === "code"', filePanelStart);
  const filePanelSource = appSource.slice(filePanelStart, filePanelEnd);

  assert.match(appSource, /ensureFileTabOpen\(selectProjectExplorerNode\(synced, nodeId\), fileId\)/);
  assert.match(appSource, /<WorkspaceTextEditor/);
  assert.doesNotMatch(appSource, /<ProjectTextFileModal/);
  assert.match(filePanelSource, /<ProjectExplorer/);
  assert.doesNotMatch(filePanelSource, /ProjectTextFilePanel/);
  assert.doesNotMatch(filePanelSource, /<CodePanel/);
});

test("Explorer supporta navigazione completa, rename e create inline", () => {
  const treeSource = readFileSync(new URL("../src/components/project/ProjectExplorerTreeItem.tsx", import.meta.url), "utf8");
  const explorerSource = readFileSync(new URL("../src/components/project/ProjectExplorer.tsx", import.meta.url), "utf8");

  for (const key of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "F2", "Delete", "ContextMenu"]) {
    assert.match(treeSource, new RegExp(key));
  }
  assert.match(treeSource, /project-explorer-item--create/);
  assert.match(treeSource, /autoFocus/);
  assert.match(treeSource, /onCreateDraftSubmit/);
  assert.match(treeSource, /onCreateDraftCancel/);
  assert.match(explorerSource, /startInlineCreate/);
  assert.match(explorerSource, /duplicate-name/);
  assert.match(explorerSource, /submitInlineCreate/);
});

test("Explorer usa una sola griglia di indentazione per file e cartelle", () => {
  const treeSource = readFileSync(new URL("../src/components/project/ProjectExplorerTreeItem.tsx", import.meta.url), "utf8");
  const explorerStyles = readFileSync(new URL("../src/styles/project-explorer.css", import.meta.url), "utf8");
  const workspaceStyles = readFileSync(new URL("../src/styles/panels-workspace.css", import.meta.url), "utf8");

  assert.match(treeSource, /data-depth=\{props\.depth\}/);
  assert.match(treeSource, /data-depth=\{depth\}/);
  assert.match(explorerStyles, /--project-explorer-indent-size:\s*18px/);
  assert.match(explorerStyles, /\.project-explorer-children\s*\{[^}]*margin-left:\s*0;[^}]*border-left:\s*0;/s);
  assert.match(workspaceStyles, /padding-left:\s*calc\(var\(--space-1\) \+ var\(--project-explorer-depth, 0\) \* var\(--project-explorer-indent-size\)\)/);
  assert.match(workspaceStyles, /\.project-explorer-item\[data-depth\]:not\(\[data-depth="0"\]\) \.project-explorer-item__main::before/);
  assert.doesNotMatch(
    workspaceStyles.match(/\.project-explorer-item--create\s*\{[^}]*\}/s)?.[0] ?? "",
    /padding-left/,
  );
});
