import assert from "node:assert/strict";
import test from "node:test";

import {
  addProjectFile,
  addProjectFolder,
  createEmptyProjectExplorerState,
  createEmptySchemaDocument,
  createProjectFromSchema,
  createSchemaWorkspaceFile,
  deleteProjectNode,
  getUniqueProjectNodeName,
  normalizeProjectNodeName,
  renameProjectNode,
  resolveExplorerCreationParent,
} from "../src/utils/projectExplorer.ts";

function createState() {
  return createProjectFromSchema("Project", createEmptySchemaDocument("Main schema.erschema"));
}

test("normalizeProjectNodeName rifiuta/sanitizza nomi vuoti e caratteri non validi", () => {
  assert.equal(normalizeProjectNodeName("   "), "");
  assert.equal(normalizeProjectNodeName(" bad/name?.erschema "), "bad name .erschema");
});

test("createEmptyProjectExplorerState crea root folder senza file attivo", () => {
  const state = createEmptyProjectExplorerState("Empty Project");

  assert.equal(state.project.name, "Empty Project");
  assert.equal(state.project.activeFileId, null);
  assert.equal(state.view.activeFileId, null);
  assert.deepEqual(state.files, {});
  assert.equal(state.project.fileTree.length, 1);
  assert.equal(state.project.fileTree[0].kind, "folder");
  assert.deepEqual(state.project.fileTree[0].children, []);
  assert.deepEqual(state.view.expandedFolderIds, [state.project.rootId]);
});

test("i nuovi id di progetto usano UUID crittograficamente sicuri", () => {
  const state = createState();
  const uuidSuffix = /^[a-z]+-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  assert.match(state.project.id, uuidSuffix);
  assert.match(state.project.rootId, uuidSuffix);
  assert.match(state.project.activeFileId ?? "", uuidSuffix);
});

test("getUniqueProjectNodeName gestisce duplicati nella stessa cartella", () => {
  const state = createState();
  const rootId = state.project.rootId;
  const existing = state.project.fileTree.find((node) => node.fileId === state.project.activeFileId);
  assert.ok(existing);

  assert.equal(getUniqueProjectNodeName(state.project, rootId, existing.name), "Main schema 2.erschema");
});

test("addProjectFolder impedisce nomi duplicati nella stessa cartella", () => {
  const state = createState();
  const first = addProjectFolder(state, state.project.rootId, "Models");
  assert.equal(first.ok, true);
  if (!first.ok) {
    return;
  }

  const duplicate = addProjectFolder(first.state, first.state.project.rootId, "Models");
  assert.deepEqual(duplicate, { ok: false, reason: "duplicate-name" });
});

test("renameProjectNode aggiorna file schema e nome diagramma", () => {
  const state = createState();
  const schemaNode = state.project.fileTree.find((node) => node.fileId === state.project.activeFileId);
  assert.ok(schemaNode);

  const result = renameProjectNode(state, schemaNode.id, "Orders.erschema");
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  const file = result.state.files[state.project.activeFileId ?? ""];
  assert.equal(file?.name, "Orders.erschema");
  assert.equal(file?.kind === "schema" ? file.schema.diagram.meta.name : "", "Orders");
});

test("deleteProjectNode impedisce eliminazione root folder", () => {
  const state = createState();
  assert.deepEqual(deleteProjectNode(state, state.project.rootId), { ok: false, reason: "root-delete" });
});

test("deleteProjectNode sceglie un nuovo schema attivo o lascia il progetto senza schema", () => {
  const state = createState();
  const secondFile = createSchemaWorkspaceFile("Second.erschema");
  const added = addProjectFile(state, state.project.rootId, secondFile);
  assert.equal(added.ok, true);
  if (!added.ok) {
    return;
  }

  const firstSchemaNode = added.state.project.fileTree.find((node) => node.fileId === state.project.activeFileId);
  assert.ok(firstSchemaNode);
  const deletedFirst = deleteProjectNode(added.state, firstSchemaNode.id);
  assert.equal(deletedFirst.ok, true);
  if (!deletedFirst.ok) {
    return;
  }
  assert.equal(deletedFirst.state.project.activeFileId, secondFile.id);

  const secondSchemaNode = deletedFirst.state.project.fileTree.find((node) => node.fileId === secondFile.id);
  assert.ok(secondSchemaNode);
  const deletedLast = deleteProjectNode(deletedFirst.state, secondSchemaNode.id);
  assert.equal(deletedLast.ok, true);
  if (!deletedLast.ok) {
    return;
  }
  assert.equal(deletedLast.state.project.activeFileId, null);
  assert.equal(deletedLast.state.view.activeFileId, null);
  assert.equal(Object.values(deletedLast.state.files).filter((file) => file.kind === "schema").length, 0);
});

test("regressione: creare in Folder A non usa la sottocartella piu profonda espansa", () => {
  const empty = createEmptyProjectExplorerState("Nested project");
  const folderAResult = addProjectFolder(empty, empty.project.rootId, "Nuova cartella");
  assert.equal(folderAResult.ok, true);
  if (!folderAResult.ok) return;

  const folderAId = folderAResult.nodeId;
  assert.ok(folderAId);
  const folderBResult = addProjectFolder(folderAResult.state, folderAId, "Nuova cartella2");
  assert.equal(folderBResult.ok, true);
  if (!folderBResult.ok) return;

  const resolvedParentId = resolveExplorerCreationParent({
    project: folderBResult.state.project,
    selectedNodeId: folderAId,
  });
  const file = createSchemaWorkspaceFile("test.erschema");
  const created = addProjectFile(folderBResult.state, resolvedParentId, file);
  assert.equal(created.ok, true);
  if (!created.ok) return;

  const fileNode = created.state.project.fileTree.find((node) => node.fileId === file.id);
  assert.equal(fileNode?.parentId, folderAId);
  assert.equal(created.state.project.fileTree.find((node) => node.id === folderAId)?.children?.includes(fileNode?.id ?? ""), true);
  assert.equal(created.state.project.fileTree.find((node) => node.id === folderBResult.nodeId)?.children?.includes(fileNode?.id ?? ""), false);
});
