import type { SqlPlaygroundErrorPayload, SqlStatementResult } from "./sqlPlaygroundProtocol";

export type SqlPlaygroundStatus =
  | "idle"
  | "loading-engine"
  | "engine-ready"
  | "creating-database"
  | "ready"
  | "stale"
  | "running"
  | "schema-error"
  | "runtime-error";

export interface SqlPlaygroundSessionState {
  sessionId: string;
  schemaFileId: string;
  schemaName: string;
  query: string;
  status: SqlPlaygroundStatus;
  databaseReady: boolean;
  schemaChecksum: string | null;
  currentGeneratedChecksum: string;
  hasUserDataChanges: boolean;
  sqliteVersion: string | null;
  results: SqlStatementResult[];
  error: SqlPlaygroundErrorPayload | null;
}
