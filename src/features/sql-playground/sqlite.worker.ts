/// <reference lib="webworker" />

import sqlite3InitModule, {
  type Database,
  type PreparedStatement,
  type Sqlite3Static,
  type SqlValue,
} from "@sqlite.org/sqlite-wasm";
import sqliteWasmUrl from "@sqlite.org/sqlite-wasm/sqlite3.wasm?url";
import type {
  SqlPlaygroundErrorPayload,
  SqlPlaygroundOperation,
  SqlPlaygroundRequest,
  SqlPlaygroundResponse,
  SqlResultValue,
  SqlStatementResult,
} from "./sqlPlaygroundProtocol";

interface WorkerSession {
  database: Database;
  schemaChecksum: string;
}

interface StatementExecutionError extends Error {
  statementIndex?: number;
}

const workerScope: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;
const sessions = new Map<string, WorkerSession>();
let sqlite: Sqlite3Static | null = null;
let initialization: Promise<Sqlite3Static> | null = null;
let requestQueue = Promise.resolve();

function postResponse(response: SqlPlaygroundResponse, transfer: Transferable[] = []): void {
  workerScope.postMessage(response, transfer);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function createErrorPayload(
  operation: SqlPlaygroundOperation,
  error: unknown,
): SqlPlaygroundErrorPayload {
  const statementIndex =
    typeof error === "object" && error !== null && "statementIndex" in error
      ? Number((error as StatementExecutionError).statementIndex)
      : undefined;
  return {
    operation,
    message: getErrorMessage(error),
    statementIndex: Number.isInteger(statementIndex) ? statementIndex : undefined,
    technicalDetail: error instanceof Error ? error.name : undefined,
    recoverable: operation !== "initialize",
  };
}

async function initializeSqlite(): Promise<Sqlite3Static> {
  if (sqlite) return sqlite;
  if (!initialization) {
    type InitWithOptions = (options?: { locateFile?: (path: string) => string }) => Promise<Sqlite3Static>;
    initialization = (sqlite3InitModule as InitWithOptions)({
      locateFile: (path) => (path.endsWith(".wasm") ? sqliteWasmUrl : path),
    }).then((initialized) => {
      sqlite = initialized;
      return initialized;
    });
  }
  return initialization;
}

function splitSqlStatements(sqliteApi: Sqlite3Static, sql: string): string[] {
  const statements: string[] = [];
  let start = 0;
  for (let index = 0; index < sql.length; index += 1) {
    if (sql[index] !== ";") continue;
    const candidate = sql.slice(start, index + 1);
    if (sqliteApi.capi.sqlite3_complete(candidate)) {
      statements.push(candidate);
      start = index + 1;
    }
  }
  const tail = sql.slice(start);
  if (tail.trim().length > 0) statements.push(tail);
  return statements;
}

function toResultValue(value: SqlValue): SqlResultValue {
  if (value instanceof Uint8Array) return { kind: "blob", byteLength: value.byteLength };
  if (value instanceof Int8Array) return { kind: "blob", byteLength: value.byteLength };
  if (value instanceof ArrayBuffer) return { kind: "blob", byteLength: value.byteLength };
  return value;
}

function isInsertStatement(sql: string): boolean {
  const withoutLeadingComments = sql
    .replace(/^\s*(?:--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/\s*)*/u, "")
    .trimStart();
  return /^(?:INSERT|REPLACE)\b/i.test(withoutLeadingComments);
}

function executePreparedStatement(
  sqliteApi: Sqlite3Static,
  database: Database,
  statement: PreparedStatement,
  sql: string,
  statementIndex: number,
  maxRows: number,
): SqlStatementResult {
  const startedAt = performance.now();
  const beforeChanges = database.changes(true, true);
  const columns = statement.columnCount > 0 ? statement.getColumnNames([]) : [];
  const rows: SqlResultValue[][] = [];
  const readOnly = sqliteApi.capi.sqlite3_stmt_readonly(statement) !== 0;
  let rowCount = 0;
  let truncated = false;

  while (statement.step()) {
    rowCount += 1;
    if (rows.length < maxRows) {
      rows.push(statement.get([]).map(toResultValue));
    } else {
      truncated = true;
      if (readOnly) break;
    }
  }

  const changesBigInt = database.changes(true, true) - beforeChanges;
  const changes = Number(changesBigInt <= BigInt(Number.MAX_SAFE_INTEGER) ? changesBigInt : BigInt(Number.MAX_SAFE_INTEGER));
  const lastInsertRowId =
    changes > 0 && isInsertStatement(sql) && database.pointer
      ? sqliteApi.capi.sqlite3_last_insert_rowid(database.pointer).toString()
      : undefined;

  return {
    statementIndex,
    sql: sql.trim(),
    kind: columns.length > 0 ? "rows" : "changes",
    columns,
    rows,
    rowCount,
    truncated,
    changes,
    lastInsertRowId,
    durationMs: Math.max(0, performance.now() - startedAt),
  };
}

function executeStatements(
  sqliteApi: Sqlite3Static,
  database: Database,
  sql: string,
  maxRows: number,
): { results: SqlStatementResult[]; databaseChanged: boolean } {
  const results: SqlStatementResult[] = [];
  const statements = splitSqlStatements(sqliteApi, sql);
  let databaseChanged = false;

  statements.forEach((statementSql, statementIndex) => {
    let statement: PreparedStatement | null = null;
    try {
      statement = database.prepare(statementSql);
      const result = executePreparedStatement(sqliteApi, database, statement, statementSql, statementIndex, maxRows);
      results.push(result);
      databaseChanged ||= sqliteApi.capi.sqlite3_stmt_readonly(statement) === 0;
    } catch (error) {
      const message = getErrorMessage(error);
      if (/empty sql/i.test(message)) return;
      const wrapped = new Error(message) as StatementExecutionError;
      wrapped.name = error instanceof Error ? error.name : "SQLiteError";
      wrapped.statementIndex = statementIndex;
      throw wrapped;
    } finally {
      statement?.finalize();
    }
  });

  return { results, databaseChanged };
}

async function createSchemaDatabase(
  sessionId: string,
  sql: string,
  schemaChecksum: string,
): Promise<void> {
  const sqliteApi = await initializeSqlite();
  const temporaryDatabase = new sqliteApi.oo1.DB(":memory:");
  try {
    temporaryDatabase.exec("PRAGMA foreign_keys = ON;");
    executeStatements(sqliteApi, temporaryDatabase, sql, 0);
  } catch (error) {
    temporaryDatabase.close();
    throw error;
  }

  const previous = sessions.get(sessionId);
  sessions.set(sessionId, { database: temporaryDatabase, schemaChecksum });
  previous?.database.close();
}

function requireSession(sessionId: string): WorkerSession {
  const session = sessions.get(sessionId);
  if (!session) throw new Error("The SQLite database has not been created for this schema.");
  return session;
}

async function handleRequest(request: SqlPlaygroundRequest): Promise<void> {
  try {
    switch (request.type) {
      case "initialize": {
        const sqliteApi = await initializeSqlite();
        postResponse({ requestId: request.requestId, type: "initialized", sqliteVersion: sqliteApi.version.libVersion });
        return;
      }
      case "create-schema":
      case "reset": {
        await createSchemaDatabase(request.sessionId, request.sql, request.schemaChecksum);
        postResponse({
          requestId: request.requestId,
          type: "schema-ready",
          sessionId: request.sessionId,
          schemaChecksum: request.schemaChecksum,
        });
        return;
      }
      case "execute": {
        const sqliteApi = await initializeSqlite();
        const session = requireSession(request.sessionId);
        const startedAt = performance.now();
        const execution = executeStatements(sqliteApi, session.database, request.sql, request.maxRows);
        postResponse({
          requestId: request.requestId,
          type: "execution-complete",
          sessionId: request.sessionId,
          results: execution.results,
          databaseChanged: execution.databaseChanged,
          durationMs: Math.max(0, performance.now() - startedAt),
        });
        return;
      }
      case "export": {
        const sqliteApi = await initializeSqlite();
        const session = requireSession(request.sessionId);
        const databasePointer = session.database.pointer;
        if (databasePointer == null) throw new Error("The SQLite database is closed.");
        const bytes = sqliteApi.capi.sqlite3_js_db_export(databasePointer);
        const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
        postResponse(
          { requestId: request.requestId, type: "export-complete", sessionId: request.sessionId, bytes: buffer },
          [buffer],
        );
        return;
      }
      case "close-session": {
        sessions.get(request.sessionId)?.database.close();
        sessions.delete(request.sessionId);
        postResponse({ requestId: request.requestId, type: "session-closed", sessionId: request.sessionId });
        return;
      }
      case "dispose": {
        sessions.forEach((session) => session.database.close());
        sessions.clear();
        postResponse({ requestId: request.requestId, type: "disposed" });
        return;
      }
    }
  } catch (error) {
    postResponse({
      requestId: request.requestId,
      type: "error",
      error: createErrorPayload(request.type, error),
    });
  }
}

workerScope.onmessage = (event: MessageEvent<SqlPlaygroundRequest>) => {
  requestQueue = requestQueue.then(() => handleRequest(event.data));
};
