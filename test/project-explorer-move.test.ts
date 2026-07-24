import assert from "node:assert/strict";
import test from "node:test";

import {
  addProjectFile,
  addProjectFolder,
  createEmptyProjectExplorerState,
  createSchemaWorkspaceFile,
  findProjectNode,
  getProjectNodeChildren,
  getValidMoveDestinations,
  moveNode,
  validateProjectTreeIntegrity,
} from "../src/utils/projectExplorer.ts";
import type { ProjectExplorerOperationResult } from "../src/utils/projectExplorer.ts";

function expectOk(result: ProjectExplorerOperationResult) {
  assert.equal(result.ok, true, result.ok ? "" : `expected ok, got ${result.reason}`);
  if (!result.ok) throw new Error("unreachable");
  return result;
}

/**
 * Albero:
 *   root
 *    ├─ Alpha (folder)
 *    │   └─ Alpha One (folder)
 *    ├─ Bravo (folder)
 *    └─ Report.erschema (file)
 */
function build() {
  let state = createEmptyProjectExplorerState("Move Project");
  const rootId = state.project.rootId;
  const alpha = expectOk(addProjectFolder(state, rootId, "Alpha"));
  state = alpha.state;
  const alphaOne = expectOk(addProjectFolder(state, alpha.nodeId!, "Alpha One"));
  state = alphaOne.state;
  const bravo = expectOk(addProjectFolder(state, rootId, "Bravo"));
  state = bravo.state;
  const file = expectOk(addProjectFile(state, rootId, createSchemaWorkspaceFile("Report.erschema")));
  state = file.state;
  return {
    state,
    rootId,
    folderAlpha: alpha.nodeId!,
    folderAlphaOne: alphaOne.nodeId!,
    folderBravo: bravo.nodeId!,
    file: file.nodeId!,
  };
}

test("moveNode reparents a file into a folder, updating both parent and children links", () => {
  const { state, rootId, folderAlpha, file } = build();
  const before = JSON.stringify(state);

  const result = expectOk(moveNode(state, file, folderAlpha));

  // Input non mutato: lo spostamento è reversibile con un singolo undo.
  assert.equal(JSON.stringify(state), before);

  const moved = findProjectNode(result.state.project, file);
  assert.equal(moved?.parentId, folderAlpha);
  assert.ok(getProjectNodeChildren(result.state.project, folderAlpha).some((node) => node.id === file));
  assert.ok(!getProjectNodeChildren(result.state.project, rootId).some((node) => node.id === file));
  assert.deepEqual(validateProjectTreeIntegrity(result.state.project).errors, []);
});

test("moveNode reparents a folder into another folder", () => {
  const { state, folderAlpha, folderBravo } = build();
  const next = expectOk(moveNode(state, folderBravo, folderAlpha)).state.project;
  assert.equal(findProjectNode(next, folderBravo)?.parentId, folderAlpha);
  assert.ok(findProjectNode(next, folderAlpha)?.children?.includes(folderBravo));
  assert.deepEqual(validateProjectTreeIntegrity(next).errors, []);
});

test("moveNode rejects moving a folder into itself", () => {
  const { state, folderAlpha } = build();
  assert.deepEqual(moveNode(state, folderAlpha, folderAlpha), { ok: false, reason: "invalid-move" });
});

test("moveNode rejects moving a folder into its own descendant", () => {
  const { state, folderAlpha, folderAlphaOne } = build();
  assert.deepEqual(moveNode(state, folderAlpha, folderAlphaOne), { ok: false, reason: "invalid-move" });
});

test("moveNode rejects a destination that is not a folder", () => {
  const { state, folderBravo, file } = build();
  assert.deepEqual(moveNode(state, folderBravo, file), { ok: false, reason: "missing-parent" });
});

test("moveNode rejects a duplicate name in the destination (no overwrite, no auto-rename)", () => {
  let { state, folderAlpha, file } = build();
  state = expectOk(addProjectFile(state, folderAlpha, createSchemaWorkspaceFile("Report.erschema"))).state;
  assert.deepEqual(moveNode(state, file, folderAlpha), { ok: false, reason: "duplicate-name" });
});

test("moveNode is a no-op when the node is already in the destination (same state reference)", () => {
  const { state, rootId, file } = build();
  const result = expectOk(moveNode(state, file, rootId));
  assert.equal(result.state, state);
});

test("moveNode rejects moving the root", () => {
  const { state, rootId, folderAlpha } = build();
  assert.deepEqual(moveNode(state, rootId, folderAlpha), { ok: false, reason: "invalid-move" });
});

test("moveNode rejects a missing node", () => {
  const { state, rootId } = build();
  assert.deepEqual(moveNode(state, "does-not-exist", rootId), { ok: false, reason: "missing-node" });
});

test("getValidMoveDestinations excludes self, descendants and the current parent", () => {
  const { state, rootId, folderAlpha, folderAlphaOne, folderBravo, file } = build();

  // Il file è nella root: destinazioni valide = le cartelle, non la root (parent attuale).
  const fileDestinations = getValidMoveDestinations(state, file).map((destination) => destination.id);
  assert.ok(!fileDestinations.includes(rootId));
  assert.ok(fileDestinations.includes(folderAlpha));
  assert.ok(fileDestinations.includes(folderAlphaOne));
  assert.ok(fileDestinations.includes(folderBravo));

  // La cartella Alpha (in root): valida solo Bravo — non root (già lì), non sé stessa né i discendenti.
  const alphaDestinations = getValidMoveDestinations(state, folderAlpha).map((destination) => destination.id);
  assert.deepEqual(alphaDestinations, [folderBravo]);
});

test("moveNode expands and selects the destination in the view", () => {
  const { state, folderAlpha, file } = build();
  const next = expectOk(moveNode(state, file, folderAlpha)).state;
  assert.ok(next.view.expandedFolderIds.includes(folderAlpha));
  assert.equal(next.view.selectedNodeId, file);
});
