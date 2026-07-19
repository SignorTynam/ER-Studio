import type {
  SqlBlobValue,
  SqlPlaygroundErrorPayload,
  SqlResultValue,
  SqlStatementResult,
} from "../features/sql-playground/sqlPlaygroundProtocol";
import type {
  SqlPlaygroundSessionState,
  SqlPlaygroundStatus,
} from "../features/sql-playground/sqlPlaygroundState";

export const SQL_PLAYGROUND_MAX_ROWS = 500;
export const SQL_PLAYGROUND_DEFAULT_RESULTS_HEIGHT = 264;
export const SQL_PLAYGROUND_DEFAULT_QUERY = `SELECT name
FROM sqlite_master
WHERE type = 'table'
ORDER BY name;`;

export function buildSqlPlaygroundSessionId(projectId: string, schemaFileId: string): string {
  return `${projectId}:${schemaFileId}`;
}

export function hashSqlSchema(sql: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  const bytes = new TextEncoder().encode(sql.replace(/\r\n/g, "\n"));
  bytes.forEach((byte) => {
    hash ^= BigInt(byte);
    hash = (hash * prime) & mask;
  });
  return hash.toString(16).padStart(16, "0");
}

export function getSqlPlaygroundStatus(
  databaseReady: boolean,
  databaseChecksum: string | null,
  currentChecksum: string,
): SqlPlaygroundStatus {
  if (!databaseReady || databaseChecksum == null) return "engine-ready";
  return databaseChecksum === currentChecksum ? "ready" : "stale";
}

export function createSqlPlaygroundSessionState(input: {
  sessionId: string;
  schemaFileId: string;
  schemaName: string;
  currentGeneratedChecksum: string;
}): SqlPlaygroundSessionState {
  return {
    ...input,
    query: SQL_PLAYGROUND_DEFAULT_QUERY,
    status: "idle",
    databaseReady: false,
    schemaChecksum: null,
    hasUserDataChanges: false,
    sqliteVersion: null,
    results: [],
    resultsPanelHeight: SQL_PLAYGROUND_DEFAULT_RESULTS_HEIGHT,
    resultsPanelCollapsed: false,
    error: null,
  };
}

export function isSqlBlobValue(value: SqlResultValue): value is SqlBlobValue {
  return typeof value === "object" && value !== null && value.kind === "blob";
}

export interface FormattedSqlValue {
  display: string;
  fullValue: string;
  kind: "null" | "empty" | "blob" | "number" | "text";
  truncated: boolean;
}

export function formatSqlResultValue(value: SqlResultValue, maxLength = 160): FormattedSqlValue {
  if (value === null) {
    return { display: "NULL", fullValue: "NULL", kind: "null", truncated: false };
  }
  if (isSqlBlobValue(value)) {
    const display = `[BLOB · ${value.byteLength} byte]`;
    return { display, fullValue: display, kind: "blob", truncated: false };
  }
  if (typeof value === "number" || typeof value === "bigint") {
    const display = String(value);
    return { display, fullValue: display, kind: "number", truncated: false };
  }
  if (value.length === 0) {
    return { display: "\"\"", fullValue: "", kind: "empty", truncated: false };
  }
  const truncated = value.length > maxLength;
  return {
    display: truncated ? `${value.slice(0, maxLength)}…` : value,
    fullValue: value,
    kind: "text",
    truncated,
  };
}

export function limitSqlRows<T>(rows: T[], maxRows: number): { rows: T[]; truncated: boolean } {
  return { rows: rows.slice(0, maxRows), truncated: rows.length > maxRows };
}

export function normalizeSqlPlaygroundError(
  operation: SqlPlaygroundErrorPayload["operation"],
  value: unknown,
): SqlPlaygroundErrorPayload {
  if (typeof value === "object" && value !== null && "operation" in value && "message" in value) {
    const candidate = value as Partial<SqlPlaygroundErrorPayload>;
    return {
      operation: candidate.operation ?? operation,
      message: typeof candidate.message === "string" ? candidate.message : String(candidate.message),
      statementIndex: typeof candidate.statementIndex === "number" ? candidate.statementIndex : undefined,
      technicalDetail: typeof candidate.technicalDetail === "string" ? candidate.technicalDetail : undefined,
      recoverable: candidate.recoverable !== false,
    };
  }
  return {
    operation,
    message: value instanceof Error ? value.message : String(value),
    recoverable: operation !== "initialize",
  };
}

export function createSqliteDownloadName(schemaName: string): string {
  const withoutExtension = schemaName.replace(/\.[^.]+$/, "");
  const safeName = withoutExtension
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${safeName || "database"}.sqlite`;
}

export function downloadSqliteDatabase(
  bytes: ArrayBuffer,
  schemaName: string,
  dependencies: {
    documentRef?: Document;
    urlApi?: Pick<typeof URL, "createObjectURL" | "revokeObjectURL">;
  } = {},
): string {
  const documentRef = dependencies.documentRef ?? document;
  const urlApi = dependencies.urlApi ?? URL;
  const fileName = createSqliteDownloadName(schemaName);
  const objectUrl = urlApi.createObjectURL(new Blob([bytes], { type: "application/vnd.sqlite3" }));
  const anchor = documentRef.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.hidden = true;
  documentRef.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    urlApi.revokeObjectURL(objectUrl);
  }
  return fileName;
}

export function countSqlResultSets(results: SqlStatementResult[]): number {
  return results.filter((result) => result.kind === "rows").length;
}
