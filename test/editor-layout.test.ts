import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const workspaceLayoutStateSource = readFileSync(
  new URL("../src/hooks/useWorkspaceLayoutState.ts", import.meta.url),
  "utf8",
);
const editorCssSource = readFileSync(new URL("../src/styles/editor-refactor.css", import.meta.url), "utf8");
const panelsCssSource = readFileSync(new URL("../src/styles/panels.css", import.meta.url), "utf8");
const projectExplorerCssSource = readFileSync(new URL("../src/styles/project-explorer.css", import.meta.url), "utf8");
const appCommandCssSource = readFileSync(new URL("../src/styles/app-command-bar.css", import.meta.url), "utf8");
const workspaceShellCssSource = readFileSync(new URL("../src/styles/workspace-shell.css", import.meta.url), "utf8");
const tokensCssSource = readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8");
const diagramCanvasSource = readFileSync(new URL("../src/canvas/DiagramCanvas.tsx", import.meta.url), "utf8");
const allCssSource = `${editorCssSource}\n${panelsCssSource}\n${projectExplorerCssSource}`;

function cssBlockFrom(source: string, selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escapedSelector}\\s*\\{[\\s\\S]*?\\}`));
  assert.ok(match, `${selector} should exist`);
  return match[0];
}

function cssBlock(selector: string): string {
  return cssBlockFrom(editorCssSource, selector);
}

test("app shell aligns every workspace view directly below the header", () => {
  assert.match(workspaceShellCssSource, /\.app-shell\.app-shell-view-er,/);
  assert.match(workspaceShellCssSource, /\.app-shell\.app-shell-view-translation,/);
  assert.match(workspaceShellCssSource, /\.app-shell\.app-shell-view-logical\s*\{/);
  assert.match(
    workspaceShellCssSource,
    /grid-template-rows:\s*var\(--size-header\)\s+minmax\(0,\s*1fr\)\s+auto\s*!important/,
  );
});

test("ER code panel renders inside the unified workspace activity panel", () => {
  assert.doesNotMatch(appSource, /designer-workspace code-open/);
  assert.match(appSource, /<div className="designer-workspace">/);
  assert.match(appSource, /<ProjectActivityPanel/);
  assert.match(appSource, /<ProjectFileTabs/);
  assert.match(appSource, /className="project-main-area"/);

  const activityContentStart = appSource.indexOf("const activityPanelContent");
  const codePanelStart = appSource.indexOf("<CodePanel", activityContentStart);
  const activityPanelStart = appSource.indexOf("<ProjectActivityPanel", codePanelStart);
  const erWorkspaceStart = appSource.indexOf('<div className="designer-workspace">', codePanelStart);
  const canvasRegionStart = appSource.indexOf('className="designer-canvas-region"', erWorkspaceStart);

  assert.notEqual(activityContentStart, -1, "activity panel content should be defined");
  assert.notEqual(codePanelStart, -1, "CodePanel should be rendered in the activity panel content");
  assert.notEqual(activityPanelStart, -1, "workspace activity panel should exist");
  assert.notEqual(erWorkspaceStart, -1, "ER designer workspace should exist");
  assert.notEqual(canvasRegionStart, -1, "ER canvas region should remain plain");
  assert.ok(codePanelStart > activityContentStart);
  assert.ok(activityPanelStart > codePanelStart);
  assert.ok(erWorkspaceStart > codePanelStart);
  assert.ok(canvasRegionStart > erWorkspaceStart);
  assert.doesNotMatch(appSource, /designer-code-drawer/);
  assert.doesNotMatch(appSource, /designer-quick-actions-bar/);
});

test("ER code activity panel does not activate the legacy technical side panel layout", () => {
  assert.doesNotMatch(workspaceLayoutStateSource, /const technicalPanelVisible = technicalPanelOpen;/);
  assert.match(
    workspaceLayoutStateSource,
    /const technicalPanelVisible = technicalPanelOpen && technicalPanelTab !== "code";/,
  );

  const erShellBlock = cssBlock(".app-shell-view-er .er-workspace-shell");
  assert.match(erShellBlock, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*!important/);
  assert.doesNotMatch(erShellBlock, /--technical-panel-width/);
  assert.doesNotMatch(erShellBlock, /--technical-panel-resizer-width/);

  const erShellClassStart = appSource.indexOf("const erWorkspaceShellClassName = [");
  const structuredShellClassStart = appSource.indexOf("const structuredWorkspaceShellClassName = [", erShellClassStart);
  const erShellClassBlock = appSource.slice(erShellClassStart, structuredShellClassStart);
  assert.doesNotMatch(erShellClassBlock, /technical-workspace-shell/);
});

test("ER code activity panel CSS keeps the workspace at one canvas column", () => {
  assert.doesNotMatch(allCssSource, /designer-workspace\.code-open[\s\S]*grid-template-columns:\s*minmax\(320px,\s*25vw\)\s+minmax\(0,\s*1fr\)/);
  assert.match(projectExplorerCssSource, /\.project-activity-panel\s*\{/);
  assert.match(projectExplorerCssSource, /\.project-activity-content \.designer-code-dock\s*\{/);
  assert.match(projectExplorerCssSource, /\.project-file-tabs\s*\{/);
  assert.match(projectExplorerCssSource, /\.code-activity-panel__body\s*\{/);

  const workspaceBlock = cssBlock(".designer-workspace");
  assert.match(workspaceBlock, /display:\s*grid/);
  assert.match(workspaceBlock, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});

test("logical SQL is routed to the workspace activity Code panel", () => {
  const logicalWorkspaceSource = readFileSync(
    new URL("../src/logical/LogicalTranslationWorkspace.tsx", import.meta.url),
    "utf8",
  );

  assert.match(appSource, /const logicalSqlRequested =/);
  assert.match(appSource, /logicalPanelMode === "sql" \|\| activeActivityPanel === "code"/);
  assert.match(appSource, /setActiveActivityPanel\("code"\)/);
  assert.match(appSource, /setWorkspaceActivityOpen\(true\)/);
  assert.match(appSource, /setCodePanelOpen\(true\)/);
  assert.match(appSource, /generateLogicalRelationalSchema/);
  assert.match(appSource, /logicalCodePreviewMode === "sql" \? logicalSqlCode : logicalRelationalSchemaCode/);
  assert.match(appSource, /codePanelMode === "relational" \? logicalRelationalSchemaCode : codeDraft/);
  assert.match(appSource, /onCodeChange=\{codePanelMode === "ers" \? updateCodeDraft : undefined\}/);
  assert.match(appSource, /onPanelModeChange=\{handleLogicalPanelModeChange\}/);
  assert.match(projectExplorerCssSource, /\.code-activity-panel__toolbar\s*\{/);
  assert.match(projectExplorerCssSource, /\.project-activity-section\.code-activity-panel\s*\{[\s\S]*display:\s*flex/);
  assert.match(projectExplorerCssSource, /\.project-activity-section\.code-activity-panel\s*\{[\s\S]*flex-direction:\s*column/);
  assert.match(projectExplorerCssSource, /\.code-activity-panel__mode-tabs\s*\{/);
  assert.match(projectExplorerCssSource, /\.code-activity-panel__dialect\s*\{/);
  assert.doesNotMatch(logicalWorkspaceSource, /designer-sql-dock/);
  assert.doesNotMatch(logicalWorkspaceSource, /designer-sql-output/);
  assert.doesNotMatch(logicalWorkspaceSource, /hideSql/);
  assert.doesNotMatch(logicalWorkspaceSource, /showSql/);
});

test("ER code panel body fills available height even when SQL toolbar is absent", () => {
  assert.match(appSource, /codePanelMode !== "ers" \? \(/);
  assert.match(appSource, /<div className="code-activity-panel__body">/);

  const codeActivityPanelBlock = cssBlockFrom(
    projectExplorerCssSource,
    ".project-activity-section.code-activity-panel",
  );
  assert.match(codeActivityPanelBlock, /display:\s*flex/);
  assert.match(codeActivityPanelBlock, /flex-direction:\s*column/);
  assert.doesNotMatch(codeActivityPanelBlock, /grid-template-rows:\s*auto auto minmax\(0,\s*1fr\)/);

  assert.match(
    projectExplorerCssSource,
    /\.project-activity-section\.code-activity-panel > \.workspace-panel__header,\s*\.project-activity-section\.code-activity-panel > \.code-activity-panel__toolbar\s*\{[\s\S]*flex:\s*0 0 auto/,
  );

  const codeActivityBodyBlock = cssBlockFrom(projectExplorerCssSource, ".code-activity-panel__body");
  assert.match(codeActivityBodyBlock, /flex:\s*1 1 auto/);
  assert.match(codeActivityBodyBlock, /display:\s*flex/);
  assert.match(codeActivityBodyBlock, /min-height:\s*0/);
  assert.match(codeActivityBodyBlock, /overflow:\s*hidden/);
});

test("ER canvas region remains full size with the activity panel open", () => {
  const canvasRegionBlock = cssBlock(".designer-canvas-region");

  assert.match(canvasRegionBlock, /position:\s*relative/);
  assert.match(canvasRegionBlock, /width:\s*100%/);
  assert.match(canvasRegionBlock, /height:\s*100%/);
  assert.match(canvasRegionBlock, /min-width:\s*0/);
  assert.match(canvasRegionBlock, /min-height:\s*0/);
  assert.match(canvasRegionBlock, /overflow:\s*hidden/);
  assert.doesNotMatch(appSource, /code-drawer-open/);
  assert.doesNotMatch(editorCssSource, /\.designer-canvas-region\.code-drawer-open \.designer-context-toolbar/);
  assert.doesNotMatch(editorCssSource, /\.designer-canvas-region\.code-drawer-open \.designer-quick-actions-bar/);
});

test("empty workspace renders welcome instead of canvas tooling", () => {
  assert.match(appSource, /const hasOpenSchema = Boolean\(activeSchemaFile\)/);
  assert.match(appSource, /!hasOpenSchema \? \(/);
  assert.match(appSource, /<WorkspaceWelcomePage/);

  const welcomeStart = appSource.indexOf("<WorkspaceWelcomePage");
  const toolbarStart = appSource.indexOf("<Toolbar", welcomeStart);
  assert.ok(toolbarStart > welcomeStart, "Toolbar must stay in the schema-only branch after welcome");
});

test("File menu stacking is above workspace activity and canvas controls", () => {
  assert.match(appCommandCssSource, /\.app-command-topbar[\s\S]*z-index:\s*1000/);
  assert.match(appCommandCssSource, /\.app-file-menu__panel[\s\S]*z-index:\s*10000/);
  assert.doesNotMatch(projectExplorerCssSource, /z-index:\s*10000/);
});

test("Conceptual and Translation use the historical canvas token without changing Logical", () => {
  assert.match(tokensCssSource, /--color-bg-diagram-canvas:\s*#dfe3dc\s*;/i);
  assert.doesNotMatch(workspaceShellCssSource, /--diagram-canvas-fill:\s*var\(--color-bg-editor\)/);

  const restoreStart = workspaceShellCssSource.indexOf("/* Historical canvas surface");
  const restoreEnd = workspaceShellCssSource.indexOf("svg.diagram-canvas", restoreStart);
  assert.notEqual(restoreStart, -1, "historical canvas block should exist");
  assert.ok(restoreEnd > restoreStart, "historical canvas block should end before generic SVG safeguards");
  const restoreBlock = workspaceShellCssSource.slice(restoreStart, restoreEnd);

  assert.match(restoreBlock, /\.app-shell-view-er[\s\S]*--diagram-canvas-fill:\s*var\(--color-bg-diagram-canvas\)/);
  assert.match(restoreBlock, /\.app-shell-view-translation[\s\S]*--diagram-canvas-fill:\s*var\(--color-bg-diagram-canvas\)/);
  assert.doesNotMatch(restoreBlock, /--diagram-node-fill:\s*var\(--color-bg-elevated\)/);
  assert.equal(
    (restoreBlock.match(/--diagram-node-fill:\s*var\(--color-bg-diagram-canvas\)/g) ?? []).length,
    2,
    "Conceptual and Translation nodes should inherit the historical canvas fill",
  );
  assert.doesNotMatch(restoreBlock, /\.app-shell-view-logical/);
  assert.doesNotMatch(restoreBlock, /var\(--color-bg-editor\)/);

  const backgroundStart = diagramCanvasSource.indexOf('data-export-background="true"');
  assert.notEqual(backgroundStart, -1, "interactive SVG background must remain present");
  const backgroundRect = diagramCanvasSource.slice(backgroundStart - 160, backgroundStart + 520);
  assert.match(backgroundRect, /<rect/);
  assert.match(backgroundRect, /fill="var\(--diagram-canvas-fill\)"/);
  assert.match(backgroundRect, /onPointerDown=\{handleCanvasPointerDown\}/);
  assert.doesNotMatch(backgroundRect, /pointerEvents="none"/);
});
