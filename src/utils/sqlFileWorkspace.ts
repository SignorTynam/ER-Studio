import type { ProjectWorkspaceFile } from "../types/projectExplorer";

export type SqlPlaygroundSchemaResolution =
  | { status: "resolved"; schemaFileId: string }
  | { status: "missing" }
  | { status: "ambiguous" };

interface ResolveSqlPlaygroundSchemaOptions {
  files: Record<string, ProjectWorkspaceFile>;
  activePlaygroundSchemaId: string | null;
  lastPlaygroundSchemaId: string | null;
}

function isSchemaFile(
  files: Record<string, ProjectWorkspaceFile>,
  fileId: string | null,
): fileId is string {
  return Boolean(fileId && files[fileId]?.kind === "schema");
}

/**
 * Resolves the schema context for a project SQL file without depending on
 * object insertion order. A previous Playground context wins; otherwise the
 * only project schema is safe to select.
 */
export function resolveSqlPlaygroundSchema({
  files,
  activePlaygroundSchemaId,
  lastPlaygroundSchemaId,
}: ResolveSqlPlaygroundSchemaOptions): SqlPlaygroundSchemaResolution {
  if (isSchemaFile(files, activePlaygroundSchemaId)) {
    return { status: "resolved", schemaFileId: activePlaygroundSchemaId };
  }
  if (isSchemaFile(files, lastPlaygroundSchemaId)) {
    return { status: "resolved", schemaFileId: lastPlaygroundSchemaId };
  }

  const schemaFileIds = Object.values(files)
    .filter((file) => file.kind === "schema")
    .map((file) => file.id);
  if (schemaFileIds.length === 0) {
    return { status: "missing" };
  }
  if (schemaFileIds.length === 1) {
    return { status: "resolved", schemaFileId: schemaFileIds[0] };
  }
  return { status: "ambiguous" };
}
