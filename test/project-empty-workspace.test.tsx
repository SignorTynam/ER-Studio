import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { NoProjectWelcomePage } from "../src/components/workspace/NoProjectWelcomePage.tsx";
import { WorkspaceEmptyEditor } from "../src/components/workspace/WorkspaceEmptyEditor.tsx";
import { WorkspaceWelcomePage } from "../src/components/workspace/WorkspaceWelcomePage.tsx";
import { I18nProvider } from "../src/i18n/I18nProvider.tsx";
import { withTestLocale } from "./utils/i18nTestUtils.ts";
import { createEmptyProjectExplorerState } from "../src/utils/projectExplorer.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const renderInEnglish = (element: React.ReactElement): string =>
  withTestLocale("en", () => renderToStaticMarkup(element));

test("WorkspaceWelcomePage renderizza start actions senza canvas", () => {
  const markup = renderInEnglish(
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
  const markup = renderInEnglish(
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
  const markup = renderInEnglish(
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
  assert.match(responsiveCss, /min-width: var\(--size-activity-rail\)/);
  assert.match(responsiveCss, /max-width: var\(--size-activity-rail\)/);
  assert.match(responsiveCss, /\.project-activity-scrim \{/);
});

test("the modal drawer scrim is a real dismissible element, not a pseudo-element", () => {
  const panelSource = readFileSync(
    new URL("../src/components/project/ProjectActivityPanel.tsx", import.meta.url),
    "utf8",
  );
  const responsiveCss = readFileSync(new URL("../src/styles/responsive.css", import.meta.url), "utf8");

  // Regressione: uno scrim ::after copriva la toolbar del canvas e ne
  // inghiottiva i click senza chiudere il drawer, lasciando gli strumenti
  // irraggiungibili sotto i 900px.
  assert.doesNotMatch(responsiveCss, /project-activity-panel--collapsed\)::after/);
  assert.match(panelSource, /className="project-activity-scrim"/);
  assert.match(panelSource, /useMediaQuery\(MODAL_DRAWER_QUERY\)/);
  assert.match(panelSource, /const MODAL_DRAWER_QUERY = "\(max-width: 900px\)"/);
  // Esc chiude il drawer solo quando e modale e solo se nessun dialogo
  // modale ha la precedenza.
  assert.match(panelSource, /event\.key !== "Escape"/);
  assert.match(panelSource, /aria-modal="true"/);

  // Scrim ed Esc devono CHIUDERE, non invertire: `onToggleOpen` inverte lo
  // stato catturato al render, quindi un listener registrato una volta
  // riaprirebbe un drawer gia aperto. Entrambi passano da `dismissDrawer`,
  // che legge lo stato corrente da un ref ed e idempotente.
  assert.match(panelSource, /onClick=\{dismissDrawer\}/);
  assert.match(panelSource, /dismissDrawer\(\);/);
  assert.match(panelSource, /const \{ open, onToggleOpen \} = latestRef\.current;/);
  assert.doesNotMatch(panelSource, /onClick=\{onToggleOpen\}/);
});

test("the shell z-index scale is tokenized and ordered", () => {
  const tokensCss = readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8");
  const responsiveCss = readFileSync(new URL("../src/styles/responsive.css", import.meta.url), "utf8");
  const panelsCss = readFileSync(new URL("../src/styles/panels.css", import.meta.url), "utf8");
  const commandBarCss = readFileSync(new URL("../src/styles/app-command-bar.css", import.meta.url), "utf8");

  const layers = [
    "--z-canvas-toolbar",
    "--z-workspace-drawer-scrim",
    "--z-workspace-drawer",
    "--z-workspace-onboarding",
    "--z-workspace-toast",
    "--z-editor-diagnostic-popover",
    "--z-app-topbar",
  ];

  const values = layers.map((name) => {
    const match = tokensCss.match(new RegExp(`${name}:\\s*(\\d+);`));
    assert.ok(match, `token ${name} non dichiarato in tokens.css`);
    return Number(match[1]);
  });

  for (let index = 1; index < values.length; index += 1) {
    assert.ok(
      values[index] > values[index - 1],
      `${layers[index]} (${values[index]}) deve stare sopra ${layers[index - 1]} (${values[index - 1]})`,
    );
  }

  // I layer che competevano nel difetto originale non usano piu numeri nudi.
  assert.match(responsiveCss, /z-index: var\(--z-workspace-drawer\)/);
  assert.match(responsiveCss, /z-index: var\(--z-workspace-drawer-scrim\)/);
  assert.match(panelsCss, /z-index: var\(--z-canvas-toolbar\)/);
  assert.match(commandBarCss, /z-index: var\(--z-app-topbar\)/);
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
