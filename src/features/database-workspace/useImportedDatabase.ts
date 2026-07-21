import { useCallback, useEffect, useState } from "react";
import {
  downloadImportedSqliteDatabase,
  markImportedDatabaseExported,
  markImportedDatabaseRestored,
  normalizeSqlPlaygroundError,
  SQL_PLAYGROUND_MAX_ROWS,
} from "../../utils/sqlPlayground";
import { SqlPlaygroundClientError, type SqlPlaygroundManager } from "../sql-playground/SqlPlaygroundManager";
import type { ImportedSqlDatabaseSessionState } from "../sql-playground/sqlPlaygroundState";

export function useImportedDatabase(manager: SqlPlaygroundManager, sessionId: string) {
  const [session, setSession] = useState<ImportedSqlDatabaseSessionState>(() => {
    const stored = manager.getSessionState(sessionId);
    if (stored?.source.kind !== "imported-sqlite") throw new Error("Imported SQLite session not found.");
    return stored as ImportedSqlDatabaseSessionState;
  });

  const updateSession = useCallback((
    updater: (current: ImportedSqlDatabaseSessionState) => ImportedSqlDatabaseSessionState,
  ) => {
    setSession((current) => {
      const next = updater(current);
      manager.setSessionState(next);
      return next;
    });
  }, [manager]);

  useEffect(() => manager.subscribe((event) => {
    if (!("sessionId" in event) || event.sessionId !== sessionId) return;
    if (event.type === "session-closed") return;
    const stored = manager.getSessionState(sessionId);
    if (stored?.source.kind === "imported-sqlite") setSession(stored as ImportedSqlDatabaseSessionState);
  }), [manager, sessionId]);

  const setQuery = useCallback((query: string) => {
    updateSession((current) => ({ ...current, query }));
  }, [updateSession]);

  const execute = useCallback(async (sql: string) => {
    if (!sql.trim()) return;
    updateSession((current) => ({ ...current, status: "running", error: null }));
    try {
      const response = await manager.execute(sessionId, sql, SQL_PLAYGROUND_MAX_ROWS);
      updateSession((current) => ({
        ...current,
        status: response.databaseChanged ? "modified" : current.hasSessionChanges ? "modified" : "ready",
        results: response.results,
        hasSessionChanges: current.hasSessionChanges || response.databaseChanged,
        hasUnexportedChanges: current.hasUnexportedChanges || response.databaseChanged,
        error: null,
      }));
    } catch (error) {
      const normalized = error instanceof SqlPlaygroundClientError
        ? error.payload
        : normalizeSqlPlaygroundError("execute", error);
      updateSession((current) => ({ ...current, status: "runtime-error", error: normalized }));
    }
  }, [manager, sessionId, updateSession]);

  const exportDatabase = useCallback(async () => {
    updateSession((current) => ({ ...current, status: "exporting", error: null }));
    try {
      const current = manager.getSessionState(sessionId);
      const modified = current?.source.kind === "imported-sqlite"
        && (current as ImportedSqlDatabaseSessionState).hasSessionChanges;
      const bytes = await manager.exportDatabase(sessionId);
      const downloadName = downloadImportedSqliteDatabase(bytes, session.fileName, Boolean(modified));
      updateSession((state) => markImportedDatabaseExported(state));
      return downloadName;
    } catch (error) {
      const normalized = error instanceof SqlPlaygroundClientError
        ? error.payload
        : normalizeSqlPlaygroundError("export", error);
      updateSession((current) => ({ ...current, status: "runtime-error", error: normalized }));
      return null;
    }
  }, [manager, session.fileName, sessionId, updateSession]);

  const restoreDatabase = useCallback(async () => {
    updateSession((current) => ({ ...current, status: "restoring", error: null }));
    try {
      const response = await manager.restoreDatabase(sessionId);
      updateSession((current) => markImportedDatabaseRestored(current, response.schemaSignature));
      return true;
    } catch (error) {
      const normalized = error instanceof SqlPlaygroundClientError
        ? error.payload
        : normalizeSqlPlaygroundError("restore-database", error);
      updateSession((current) => ({ ...current, status: "runtime-error", error: normalized }));
      return false;
    }
  }, [manager, sessionId, updateSession]);

  const setResultsPanelHeight = useCallback((resultsPanelHeight: number) => {
    updateSession((current) => ({ ...current, resultsPanelHeight }));
  }, [updateSession]);

  const setResultsPanelCollapsed = useCallback((resultsPanelCollapsed: boolean) => {
    updateSession((current) => ({ ...current, resultsPanelCollapsed }));
  }, [updateSession]);

  return {
    session,
    setQuery,
    execute,
    exportDatabase,
    restoreDatabase,
    setResultsPanelHeight,
    setResultsPanelCollapsed,
  };
}
