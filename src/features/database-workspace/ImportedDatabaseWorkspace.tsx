import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { CodeEditorSurfaceHandle } from "../../components/editor/CodeEditorSurface";
import { Button, Modal } from "../../components/ui";
import { useI18n } from "../../i18n/useI18n";
import { SqlPlaygroundEditor } from "../sql-playground/SqlPlaygroundEditor";
import { SqlPlaygroundError } from "../sql-playground/SqlPlaygroundError";
import type { SqlPlaygroundManager } from "../sql-playground/SqlPlaygroundManager";
import { SqlPlaygroundResults } from "../sql-playground/SqlPlaygroundResults";
import { SqlPlaygroundSplitter } from "../sql-playground/SqlPlaygroundSplitter";
import { ImportedDatabaseHeader } from "./ImportedDatabaseHeader";
import { useImportedDatabase } from "./useImportedDatabase";

interface ImportedDatabaseWorkspaceProps {
  manager: SqlPlaygroundManager;
  sessionId: string;
  onReverse: (sessionId: string) => void;
  queryRequest?: { id: number; query: string; execute: boolean } | null;
}

export function ImportedDatabaseWorkspace({ manager, sessionId, onReverse, queryRequest }: ImportedDatabaseWorkspaceProps) {
  const { t } = useI18n();
  const editorRef = useRef<CodeEditorSurfaceHandle | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [bodyHeight, setBodyHeight] = useState(0);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const database = useImportedDatabase(manager, sessionId);
  const busy = ["running", "restoring", "exporting", "opening-database", "verifying-database"].includes(database.session.status);
  const canExecute = database.session.databaseReady && !busy && database.session.query.trim().length > 0;
  const minimumResultsHeight = 104;
  const maximumResultsHeight = bodyHeight >= minimumResultsHeight + 152 ? bodyHeight - 152 : 10_000;
  const resultsPanelHeight = Math.min(Math.max(database.session.resultsPanelHeight, minimumResultsHeight), maximumResultsHeight);

  useEffect(() => {
    const element = bodyRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setBodyHeight(entry.contentRect.height));
    observer.observe(element);
    setBodyHeight(element.getBoundingClientRect().height);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!queryRequest) return;
    database.setQuery(queryRequest.query);
    if (queryRequest.execute) void database.execute(queryRequest.query);
    window.requestAnimationFrame(() => editorRef.current?.focus());
  }, [queryRequest?.id]);

  function executeSelectionOrAll(): void {
    if (!canExecute) return;
    const selected = editorRef.current?.getSelectedText() ?? "";
    const sql = selected.trim() ? selected : editorRef.current?.getValue() ?? database.session.query;
    void database.execute(sql);
  }

  return (
    <main className="sql-playground-workspace database-workspace" aria-label={t("databaseWorkspace.title")}>
      <ImportedDatabaseHeader
        session={database.session}
        executeDisabled={!canExecute}
        onExecute={executeSelectionOrAll}
        onExport={() => void database.exportDatabase()}
        onRestore={() => setRestoreOpen(true)}
        onReverse={() => onReverse(sessionId)}
      />
      <p className="database-workspace__privacy" role="note">{t("databaseWorkspace.privacyNotice")}</p>
      {database.session.error ? <SqlPlaygroundError error={database.session.error} /> : null}
      <div
        ref={bodyRef}
        className={database.session.resultsPanelCollapsed ? "sql-playground-body results-collapsed" : "sql-playground-body"}
        style={{ "--sql-playground-results-height": `${resultsPanelHeight}px` } as CSSProperties}
      >
        <SqlPlaygroundEditor ref={editorRef} value={database.session.query} executeDisabled={!canExecute} onChange={database.setQuery} onExecute={executeSelectionOrAll} />
        {!database.session.resultsPanelCollapsed ? (
          <SqlPlaygroundSplitter value={resultsPanelHeight} min={minimumResultsHeight} max={maximumResultsHeight} onChange={database.setResultsPanelHeight} onReset={() => database.setResultsPanelHeight(Math.min(264, maximumResultsHeight))} />
        ) : null}
        <SqlPlaygroundResults results={database.session.results} collapsed={database.session.resultsPanelCollapsed} onCollapsedChange={database.setResultsPanelCollapsed} />
      </div>
      <Modal
        open={restoreOpen}
        onClose={() => setRestoreOpen(false)}
        title={t("databaseWorkspace.restoreDialog.title")}
        subtitle={t("databaseWorkspace.restoreDialog.message")}
        size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setRestoreOpen(false)}>{t("common.actions.cancel")}</Button>
            <Button variant="danger" onClick={() => { setRestoreOpen(false); void database.restoreDatabase(); }}>{t("databaseWorkspace.restoreOriginal")}</Button>
          </>
        )}
      >
        <p>{t("databaseWorkspace.restoreDialog.originalSafe")}</p>
      </Modal>
    </main>
  );
}
