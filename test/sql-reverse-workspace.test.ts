import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createEmptyProjectExplorerState, createTextWorkspaceFile, addProjectFile } from "../src/utils/projectExplorer.ts";
import { ensureFileTabOpen } from "../src/utils/projectTabs.ts";
import { importSqlReverseSourceFile, updateSqlReverseSourceFile } from "../src/utils/sqlReverseWorkspace.ts";

test("Reverse upload adds a SQL file without opening or changing workspace tabs", () => {
  const state = createEmptyProjectExplorerState("Reverse");
  const beforeTabs = state.view.openTabs.map((tab) => tab.id);
  const beforeActiveTab = state.view.activeTabId;
  const result = importSqlReverseSourceFile(state, "schema.sql", "CREATE TABLE A (id INTEGER);");
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.deepEqual(result.state.view.openTabs.map((tab) => tab.id), beforeTabs);
  assert.equal(result.state.view.activeTabId, beforeActiveTab);
  assert.equal(result.state.project.activeFileId, null);
  assert.equal(result.state.files[result.binding.sourceFileId]?.kind, "sql");
  assert.equal(result.state.files[result.binding.sourceFileId]?.name, "schema.sql");
});

test("Reverse upload never overwrites the currently active SQL workspace file", () => {
  let state = createEmptyProjectExplorerState("Reverse");
  const workspaceSql = createTextWorkspaceFile("query.sql", "sql", "SELECT 1;");
  const added = addProjectFile(state, state.project.rootId, workspaceSql);
  assert.equal(added.ok, true);
  if (!added.ok) return;
  state = ensureFileTabOpen(added.state, workspaceSql.id);

  const result = importSqlReverseSourceFile(state, "import.sql", "CREATE TABLE Imported (id INTEGER);");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.state.files[workspaceSql.id]?.kind === "sql" ? result.state.files[workspaceSql.id].content : "", "SELECT 1;");
  assert.equal(result.state.view.activeFileId, workspaceSql.id);
  assert.equal(result.state.view.openTabs.some((tab) => tab.fileId === result.binding.sourceFileId), false);
});

test("Reverse draft updates only its explicit source binding", () => {
  let state = createEmptyProjectExplorerState("Reverse");
  const first = importSqlReverseSourceFile(state, "first.sql", "CREATE TABLE First (id INTEGER);");
  assert.equal(first.ok, true);
  if (!first.ok) return;
  state = first.state;
  const second = importSqlReverseSourceFile(state, "second.sql", "CREATE TABLE Second (id INTEGER);");
  assert.equal(second.ok, true);
  if (!second.ok) return;

  const updated = updateSqlReverseSourceFile(second.state, second.binding.sourceFileId, "CREATE TABLE Changed (id INTEGER);");
  assert.equal(updated.files[second.binding.sourceFileId]?.kind === "sql" ? updated.files[second.binding.sourceFileId].content : "", "CREATE TABLE Changed (id INTEGER);");
  assert.equal(updated.files[first.binding.sourceFileId]?.kind === "sql" ? updated.files[first.binding.sourceFileId].content : "", "CREATE TABLE First (id INTEGER);");
});

test("clearing an unbound Reverse draft leaves project files untouched", () => {
  const state = createEmptyProjectExplorerState("Reverse");
  assert.equal(updateSqlReverseSourceFile(state, null, "").files, state.files);
});

test("workspace SQL handlers do not open or mutate SQL Reverse implicitly", () => {
  const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const handlerNames = [
    "handleProjectExplorerOpenFile",
    "handleProjectFileTabSelect",
    "handleProjectFileTabClose",
    "applyProjectTabMutation",
    "handleActiveTextFileChange",
    "handleProjectExplorerCreateTextFile",
    "handleProjectExplorerCreateSqlFile",
  ];
  handlerNames.forEach((name) => {
    const start = source.indexOf(`function ${name}`);
    const nextMatch = /\n  (?:async )?function /.exec(source.slice(start + 1));
    const nextStart = nextMatch ? start + 1 + nextMatch.index : source.length;
    const handler = source.slice(start, nextStart);
    assert.doesNotMatch(handler, /setActiveActivityPanel\("reverse"\)/, name);
    assert.doesNotMatch(handler, /setSqlReverseWorkflow/, name);
  });
});

test("Reverse upload avoids ensureFileTabOpen and Clear does not mutate project files", () => {
  const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const upload = source.slice(source.indexOf("async function handleLoadSqlReverseFile"), source.indexOf("function handleClearSqlReverse"));
  const clear = source.slice(source.indexOf("function handleClearSqlReverse"), source.indexOf("function handleOpenErStage"));
  assert.doesNotMatch(upload, /ensureFileTabOpen/);
  assert.match(upload, /importSqlReverseSourceFile/);
  assert.doesNotMatch(clear, /setProjectExplorer|updateSqlReverseSourceFile/);
});

test("contextual SQL Reverse starts from the same file without upload or automatic analysis", () => {
  const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const start = source.indexOf("function handleStartSqlReverseFromFile");
  const end = source.indexOf("function handleCancelSqlReverseWorkflow", start);
  const handler = source.slice(start, end);
  assert.match(handler, /file\.content,\s*file\.id,\s*file\.name,\s*current\.dialect/);
  assert.match(handler, /setActiveActivityPanel\("reverse"\)/);
  assert.doesNotMatch(handler, /handleAnalyzeSqlReverseWorkflow|importSqlReverseSourceFile|createTextWorkspaceFile/);
});
