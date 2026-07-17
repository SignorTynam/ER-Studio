import type { ProjectExplorerState } from "./projectExplorer";
import {
  addProjectFile,
  createTextWorkspaceFile,
  ensureProjectFileExtension,
  getUniqueProjectNodeName,
} from "./projectExplorer";
import { markProjectTabDirty } from "./projectTabs";

export interface SqlReverseSourceBinding {
  sourceFileId: string;
  sourceFileName: string;
}

export type ImportSqlReverseSourceResult =
  | { ok: true; state: ProjectExplorerState; binding: SqlReverseSourceBinding }
  | { ok: false; reason: string };

export function importSqlReverseSourceFile(
  state: ProjectExplorerState,
  requestedName: string,
  content: string,
): ImportSqlReverseSourceResult {
  const uniqueName = getUniqueProjectNodeName(
    state.project,
    state.project.rootId,
    ensureProjectFileExtension(requestedName || "schema.sql", "sql"),
  );
  const file = createTextWorkspaceFile(uniqueName, "sql", content);
  const result = addProjectFile(state, state.project.rootId, file);
  if (!result.ok) return { ok: false, reason: result.reason };
  return {
    ok: true,
    state: result.state,
    binding: { sourceFileId: file.id, sourceFileName: file.name },
  };
}

export function updateSqlReverseSourceFile(
  state: ProjectExplorerState,
  sourceFileId: string | null,
  content: string,
): ProjectExplorerState {
  if (!sourceFileId) return state;
  const file = state.files[sourceFileId];
  if (!file || file.kind !== "sql") return state;
  return markProjectTabDirty({
    ...state,
    files: {
      ...state.files,
      [sourceFileId]: {
        ...file,
        content,
        updatedAt: new Date().toISOString(),
      },
    },
  }, sourceFileId, true);
}
