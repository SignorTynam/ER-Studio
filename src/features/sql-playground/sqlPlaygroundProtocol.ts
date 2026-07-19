export type SqlPlaygroundOperation =
  | "initialize"
  | "create-schema"
  | "execute"
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
      durationMs: number;
    }
  | { type: "export-complete"; sessionId: string; bytes: ArrayBuffer }
  | { type: "session-closed"; sessionId: string }
  | { type: "disposed" }
  | { type: "error"; error: SqlPlaygroundErrorPayload };

export type SqlPlaygroundResponse = SqlPlaygroundResponsePayload & { requestId: string };

export function isSqlPlaygroundResponse(value: unknown): value is SqlPlaygroundResponse {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.requestId === "string" && typeof candidate.type === "string";
}
