export type SqlPlaygroundOperation =
  | "initialize"
  | "create-schema"
  | "execute"
  | "inspect-schema"
  | "reset"
  | "export"
  | "close-session"
  | "dispose";

export interface SqlBlobValue {
  kind: "blob";
  byteLength: number;
}

export type SqlResultValue = string | number | bigint | null | SqlBlobValue;

export interface SqlStatementResult {
  statementIndex: number;
  sql: string;
  kind: "rows" | "changes";
  columns: string[];
  rows: SqlResultValue[][];
  rowCount: number;
  truncated: boolean;
  changes: number;
  lastInsertRowId?: string;
  durationMs: number;
}

export interface SqlPlaygroundErrorPayload {
  operation: SqlPlaygroundOperation;
  message: string;
  statementIndex?: number;
  technicalDetail?: string;
  recoverable: boolean;
}

export type SqlPlaygroundRequestPayload =
  | { type: "initialize" }
  | { type: "create-schema"; sessionId: string; sql: string; schemaChecksum: string }
  | { type: "execute"; sessionId: string; sql: string; maxRows: number }
  | { type: "inspect-schema"; sessionId: string }
  | { type: "reset"; sessionId: string; sql: string; schemaChecksum: string }
  | { type: "export"; sessionId: string }
  | { type: "close-session"; sessionId: string }
  | { type: "dispose" };

export type SqlPlaygroundRequest = SqlPlaygroundRequestPayload & { requestId: string };

export type SqlPlaygroundResponsePayload =
  | { type: "initialized"; sqliteVersion: string }
  | { type: "schema-ready"; sessionId: string; schemaChecksum: string }
  | {
      type: "execution-complete";
      sessionId: string;
      results: SqlStatementResult[];
      databaseChanged: boolean;
      schemaChanged: boolean;
      durationMs: number;
    }
  | {
      type: "schema-inspected";
      sessionId: string;
      metadata: import("./sqlExplorerTypes").SqlExplorerMetadata;
    }
  | { type: "export-complete"; sessionId: string; bytes: ArrayBuffer }
  | { type: "session-closed"; sessionId: string }
  | { type: "disposed" }
  | { type: "error"; error: SqlPlaygroundErrorPayload };

export type SqlPlaygroundResponse = SqlPlaygroundResponsePayload & { requestId: string };

export function isSqlPlaygroundResponse(value: unknown): value is SqlPlaygroundResponse {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.requestId !== "string" || typeof candidate.type !== "string") return false;
  switch (candidate.type) {
    case "initialized":
      return typeof candidate.sqliteVersion === "string";
    case "schema-ready":
      return typeof candidate.sessionId === "string" && typeof candidate.schemaChecksum === "string";
    case "execution-complete":
      return typeof candidate.sessionId === "string"
        && Array.isArray(candidate.results)
        && typeof candidate.databaseChanged === "boolean"
        && typeof candidate.schemaChanged === "boolean"
        && typeof candidate.durationMs === "number";
    case "schema-inspected": {
      const metadata = candidate.metadata;
      return typeof candidate.sessionId === "string"
        && typeof metadata === "object"
        && metadata !== null
        && Array.isArray((metadata as Record<string, unknown>).databases);
    }
    case "export-complete":
      return typeof candidate.sessionId === "string" && candidate.bytes instanceof ArrayBuffer;
    case "session-closed":
      return typeof candidate.sessionId === "string";
    case "disposed":
      return true;
    case "error":
      return typeof candidate.error === "object" && candidate.error !== null;
    default:
      return false;
  }
}
