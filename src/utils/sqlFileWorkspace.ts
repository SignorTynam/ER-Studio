import type { ProjectWorkspaceFile } from "../types/projectExplorer";

export type SqlPlaygroundSchemaResolution =
  | { status: "resolved"; schemaFileId: string }
  | { status: "missing" }
  | { status: "ambiguous" };

const SQL_IDENTIFIER = String.raw`(?:` + "`(?:``|[^`])+`" + String.raw`|"(?:[^"]|"")+"|\[(?:[^\]]|\]\])+\]|[A-Za-z_][\w$-]*)`;

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

function normalizeSqlIdentifier(identifier: string): string {
  if (identifier.startsWith("`") && identifier.endsWith("`")) {
    return identifier.slice(1, -1).replace(/``/g, "`").trim();
  }
  if (identifier.startsWith("\"") && identifier.endsWith("\"")) {
    return identifier.slice(1, -1).replace(/""/g, "\"").trim();
  }
  if (identifier.startsWith("[") && identifier.endsWith("]")) {
    return identifier.slice(1, -1).replace(/\]\]/g, "]").trim();
  }
  return identifier.trim();
}

/**
 * Reads an explicit database context from common SQL forms. Declarations win
 * over qualified object names so the user is prompted only when the source
 * genuinely leaves the database unnamed.
 */
export function resolveSqlFileDatabaseName(sourceSql: string): string | null {
  const sql = sourceSql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\r\n]*/g, " ")
    .replace(/#[^\r\n]*/g, " ");
  const patterns = [
    new RegExp(String.raw`\bCREATE\s+DATABASE(?:\s+IF\s+NOT\s+EXISTS)?\s+(${SQL_IDENTIFIER})`, "i"),
    new RegExp(String.raw`\bUSE\s+(${SQL_IDENTIFIER})`, "i"),
    new RegExp(String.raw`\bATTACH\s+(?:DATABASE\s+)?(?:'(?:''|[^'])*'|"(?:[^"]|"")*")\s+AS\s+(${SQL_IDENTIFIER})`, "i"),
    new RegExp(String.raw`\b(?:FROM|JOIN|INTO|UPDATE|TABLE)\s+(${SQL_IDENTIFIER})\s*\.\s*${SQL_IDENTIFIER}`, "i"),
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(sql);
    const name = match?.[1] ? normalizeSqlIdentifier(match[1]) : "";
    if (name) return name;
  }
  return null;
}

/**
 * Removes database-selection statements that SQLite cannot execute inside the
 * in-memory database. Table and data statements remain untouched.
 */
export function stripSqlFileDatabaseContext(sourceSql: string): string {
  const statements = [
    new RegExp(String.raw`\bCREATE\s+DATABASE(?:\s+IF\s+NOT\s+EXISTS)?\s+${SQL_IDENTIFIER}\s*;?`, "gi"),
    new RegExp(String.raw`\bUSE\s+${SQL_IDENTIFIER}\s*;?`, "gi"),
    new RegExp(String.raw`\bATTACH\s+(?:DATABASE\s+)?(?:'(?:''|[^'])*'|"(?:[^"]|"")*")\s+AS\s+${SQL_IDENTIFIER}\s*;?`, "gi"),
  ];
  return statements
    .reduce((sql, pattern) => sql.replace(pattern, " "), sourceSql)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
