import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeSqlPlaygroundError } from "../../utils/sqlPlayground";
import type { SqlPlaygroundErrorPayload } from "./sqlPlaygroundProtocol";
import type { SqlPlaygroundManager } from "./SqlPlaygroundManager";
import type { SqlExplorerMetadata } from "./sqlExplorerTypes";

export type SqlExplorerStatus = "idle" | "database-missing" | "loading" | "ready" | "error";

interface SqlExplorerState {
  status: SqlExplorerStatus;
  metadata: SqlExplorerMetadata | null;
  error: SqlPlaygroundErrorPayload | null;
}

export function useSqlExplorer(manager: SqlPlaygroundManager | null, sessionId: string | null) {
  const [state, setState] = useState<SqlExplorerState>(() => {
    if (!manager || !sessionId) return { status: "idle", metadata: null, error: null };
    return {
      status: manager.getSessionState(sessionId)?.databaseReady ? "loading" : "database-missing",
      metadata: null,
      error: null,
    };
  });
  const requestVersionRef = useRef(0);

  const refresh = useCallback(async (knownReady = false) => {
    const requestVersion = ++requestVersionRef.current;
    if (!manager || !sessionId) {
      setState({ status: "idle", metadata: null, error: null });
      return;
    }
    const session = manager.getSessionState(sessionId);
    if (!knownReady && !session?.databaseReady) {
      setState({ status: "database-missing", metadata: null, error: null });
      return;
    }
    setState((current) => ({ ...current, status: "loading", error: null }));
    try {
      const metadata = await manager.inspectSchema(sessionId);
      if (requestVersionRef.current !== requestVersion) return;
      setState({ status: "ready", metadata, error: null });
    } catch (error) {
      if (requestVersionRef.current !== requestVersion) return;
      setState({ status: "error", metadata: null, error: normalizeSqlPlaygroundError("inspect-schema", error) });
    }
  }, [manager, sessionId]);

  useEffect(() => {
    requestVersionRef.current += 1;
    void refresh();
    if (!manager || !sessionId) return;
    const unsubscribe = manager.subscribe((event) => {
      if (event.type === "disposed") {
        requestVersionRef.current += 1;
        setState({ status: "idle", metadata: null, error: null });
        return;
      }
      if (!("sessionId" in event) || event.sessionId !== sessionId) return;
      if (event.type === "schema-ready" || event.type === "schema-changed") void refresh(true);
      else if (event.type === "session-closed") {
        requestVersionRef.current += 1;
        setState({ status: "idle", metadata: null, error: null });
      } else if (event.type === "session-created") void refresh();
    });
    return () => {
      requestVersionRef.current += 1;
      unsubscribe();
    };
  }, [manager, refresh, sessionId]);

  return { ...state, refresh: () => refresh(false) };
}
