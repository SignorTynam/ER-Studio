import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { NoProjectWelcomePage } from "../src/components/workspace/NoProjectWelcomePage.tsx";
import { WorkspaceEmptyEditor } from "../src/components/workspace/WorkspaceEmptyEditor.tsx";
import { WorkspaceWelcomePage } from "../src/components/workspace/WorkspaceWelcomePage.tsx";
import { I18nProvider } from "../src/i18n/I18nProvider.tsx";
import { createEmptyProjectExplorerState } from "../src/utils/projectExplorer.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

test("WorkspaceWelcomePage renderizza start actions senza canvas", () => {
  const markup = renderToStaticMarkup(
    <I18nProvider>
      <WorkspaceWelcomePage
        projectName="Empty Project"
        onNewSchema={() => undefined}
        onNewNote={() => undefined}
        onNewSql={() => undefined}
        onOpenProject={() => undefined}
        onImportSchema={() => undefined}
      />
    </I18nProvider>,
  );

  assert.match(markup, /buildER/);
  assert.match(markup, /buildER(?:%20| )no(?:%20| )text(?:%20| )no(?:%20| )background\.png/);
  assert.doesNotMatch(markup, />ER<\/span>/);
  assert.match(markup, /New schema|Nuovo schema/);
  assert.match(markup, /New note|Nuova nota/);
  assert.match(markup, /workspace-welcome-tips/);
  assert.doesNotMatch(markup, /workspace-welcome-workflow/);
  assert.doesNotMatch(markup, /diagram-canvas/);
});

test("NoProjectWelcomePage mostra solo azioni globali senza contesto progetto", () => {
  const markup = renderToStaticMarkup(
    <I18nProvider>
      <NoProjectWelcomePage
        onNewProject={() => undefined}
        onOpenProject={() => undefined}
        onImportSchema={() => undefined}
      />
    </I18nProvider>,
  );

  assert.match(markup, /Apri o crea un progetto|Open or create a project/);
  assert.match(markup, /buildER(?:%20| )no(?:%20| )text(?:%20| )no(?:%20| )background\.png/);
  assert.doesNotMatch(markup, />ER<\/span>/);
  assert.match(markup, /Crea nuovo progetto|Create new project/);
  assert.match(markup, /Apri progetto \.ersp|Open project \.ersp/);
  assert.match(markup, /Importa schema \.erschema|Import schema \.erschema/);
  assert.doesNotMatch(markup, /Nuovo diagramma/);
  assert.doesNotMatch(markup, /Nuovo progetto/);
  assert.doesNotMatch(markup, /Nessun file nel progetto/);
  assert.doesNotMatch(markup, /file, .*cartelle/);
});

test("WorkspaceEmptyEditor mostra logo e tre azioni compatte", () => {
  const markup = renderToStaticMarkup(
    <I18nProvider>
      <WorkspaceEmptyEditor
        onNewSchema={() => undefined}
        onNewSql={() => undefined}
        onOpenWelcome={() => undefined}
      />
    </I18nProvider>,
  );

  assert.match(markup, /buildER(?:%20| )no(?:%20| )text(?:%20| )no(?:%20| )background\.png/);
  assert.match(markup, /New schema|Nuovo schema/);
  assert.match(markup, /New SQL|Nuovo SQL/);
  assert.match(markup, /Back to Welcome|Torna alla Welcome/);
  assert.equal((markup.match(/workspace-empty-editor__button/g) ?? []).length, 3);
});

test("New Project usa progetto vuoto senza erschema automatico", () => {
  const state = createEmptyProjectExplorerState("New Project");

  assert.equal(state.project.activeFileId, null);
  assert.equal(state.view.activeFileId, null);
  assert.equal(Object.keys(state.files).length, 0);

  const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const newProjectStart = appSource.indexOf("async function handleNewProject");
  const newProjectEnd = appSource.indexOf("function handleCreateNode", newProjectStart);
  const newProjectSource = appSource.slice(newProjectStart, newProjectEnd);

  assert.match(newProjectSource, /createEmptyProjectExplorerState/);
  assert.doesNotMatch(newProjectSource, /createProjectFromSchema/);
  assert.doesNotMatch(newProjectSource, /createSchemaWorkspaceFile/);
});

test("Close Project usa handler dedicato e renderizza no-project senza Explorer", () => {
  const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const headerStart = appSource.indexOf("<AppHeader");
  const headerEnd = appSource.indexOf("/>", headerStart);
  const headerSource = appSource.slice(headerStart, headerEnd);
  const noProjectComponentStart = appSource.indexOf("<NoProjectWelcomePage");
  const noProjectRenderStart = appSource.lastIndexOf(") : (", noProjectComponentStart);
  const noProjectRenderEnd = appSource.indexOf(")}", noProjectComponentStart);
  const noProjectBranch = appSource.slice(noProjectRenderStart, noProjectRenderEnd);

  assert.match(appSource, /async function handleCloseProject/);
  assert.match(headerSource, /onCloseProject=\{handleCloseProject\}/);
  assert.doesNotMatch(headerSource, /onCloseProject=\{handleNewProject\}/);
  assert.match(noProjectBranch, /<NoProjectWelcomePage/);
  assert.doesNotMatch(noProjectBranch, /<ProjectExplorer/);
  assert.doesNotMatch(noProjectBranch, /<ProjectFileTabs/);
  assert.doesNotMatch(noProjectBranch, /<DiagramCanvas/);
});

test("workspace senza schema aperto e senza tab mostra EmptyEditor e non renderizza Toolbar o DiagramCanvas", () => {
  const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const welcomeStart = appSource.indexOf("!hasOpenSchema ? (");
  const schemaBranchStart = appSource.indexOf("<div", welcomeStart);
  const welcomeBranch = appSource.slice(welcomeStart, schemaBranchStart);

  assert.match(appSource, /const hasOpenSchema = Boolean\(activeSchemaFile\)/);
  assert.match(appSource, /welcomeTabActive/);
  assert.match(appSource, /<WorkspaceWelcomePage/);
  assert.match(welcomeBranch, /<WorkspaceEmptyEditor/);
  assert.doesNotMatch(welcomeBranch, /<Toolbar/);
  assert.doesNotMatch(welcomeBranch, /<DiagramCanvas/);
});

test("workspace mounts a compact status bar and responsive drawer rules", () => {
  const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const statusSource = readFileSync(new URL("../src/components/BottomStatusBar.tsx", import.meta.url), "utf8");
  const responsiveCss = readFileSync(new URL("../src/styles/responsive.css", import.meta.url), "utf8");

  assert.match(appSource, /<BottomStatusBar/);
  assert.match(statusSource, /projectName/);
  assert.match(statusSource, /activeFileName/);
  assert.match(statusSource, /zoomPercent/);
  assert.match(responsiveCss, /@media \(max-width: 900px\)/);
  assert.match(responsiveCss, /position: absolute/);
  assert.match(responsiveCss, /project-activity-panel:not\(\.project-activity-panel--collapsed\)::after/);
});

test("application dialogs trap focus and restore it to the trigger", () => {
  const source = readFileSync(new URL("../src/hooks/useAppDialogs.ts", import.meta.url), "utf8");
  const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

  assert.match(source, /function trapFocus/);
  assert.match(source, /event\.key !== "Tab"/);
  assert.match(source, /returnFocusRef/);
  assert.match(source, /target\?\.isConnected/);
  assert.match(appSource, /data-dialog-safe/);
});
