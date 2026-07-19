import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useI18n } from "../../i18n/useI18n";
import { Button, Modal } from "../../components/ui";
import { buildSqlPlaygroundSessionId } from "../../utils/sqlPlayground";
import type { SqlPlaygroundManager } from "./SqlPlaygroundManager";
import { SqlPlaygroundEditor } from "./SqlPlaygroundEditor";
import { SqlPlaygroundEmptyState } from "./SqlPlaygroundEmptyState";
import { SqlPlaygroundError } from "./SqlPlaygroundError";
import { SqlPlaygroundHeader } from "./SqlPlaygroundHeader";
import { SqlPlaygroundResults } from "./SqlPlaygroundResults";
import { SqlPlaygroundSplitter } from "./SqlPlaygroundSplitter";
import type { CodeEditorSurfaceHandle } from "../../components/editor/CodeEditorSurface";
import { createSqlPlaygroundSessionState } from "../../utils/sqlPlayground";
import { useSqlPlayground } from "./useSqlPlayground";

interface SqlPlaygroundWorkspaceProps {
  manager: SqlPlaygroundManager;
  projectId: string;
  schemaFileId: string;
  schemaName: string;
  generatedSql: string;
  hasLogicalModel: boolean;
  logicalOutOfDate: boolean;
  onGenerateLogicalModel: () => void;
}

function AvailableSqlPlaygroundWorkspace(props: SqlPlaygroundWorkspaceProps) {
  const { t } = useI18n();
  const [resetConfirmationOpen, setResetConfirmationOpen] = useState(false);
  const [bodyHeight, setBodyHeight] = useState(0);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<CodeEditorSurfaceHandle | null>(null);
  const sessionId = buildSqlPlaygroundSessionId(props.projectId, props.schemaFileId);
  const {
    session,
    setQuery,
    setResultsPanelHeight,
    setResultsPanelCollapsed,
    createDatabase,
    execute,
    downloadDatabase,
  } = useSqlPlayground({
    manager: props.manager,
    sessionId,
    schemaFileId: props.schemaFileId,
    schemaName: props.schemaName,
    generatedSql: props.generatedSql,
  });
  const busy = session.status === "loading-engine" || session.status === "creating-database" || session.status === "running";
  const canExecute = session.databaseReady && !busy && session.query.trim().length > 0;
  const minimumResultsHeight = 104;
  const maximumResultsHeight = bodyHeight >= minimumResultsHeight + 152 ? bodyHeight - 152 : 10_000;
  const resultsPanelHeight = Math.min(Math.max(session.resultsPanelHeight, minimumResultsHeight), maximumResultsHeight);

  useEffect(() => {
    const element = bodyRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setBodyHeight(entry.contentRect.height));
    observer.observe(element);
    setBodyHeight(element.getBoundingClientRect().height);
    return () => observer.disconnect();
  }, []);

  function executeSelectionOrAll(): void {
    if (!canExecute) return;
    const selected = editorRef.current?.getSelectedText() ?? "";
    const sql = selected.trim().length > 0 ? selected : editorRef.current?.getValue() ?? session.query;
    void execute(sql);
  }

  function requestRecreate(): void {
    if (session.hasUserDataChanges) {
      setResetConfirmationOpen(true);
      return;
    }
    void createDatabase(true);
  }

  return (
    <main className="sql-playground-workspace" aria-label={t("sqlPlayground.title")}>
      <SqlPlaygroundHeader
        session={session}
        executeDisabled={!canExecute}
        onCreateDatabase={() => void createDatabase(false)}
        onRecreateDatabase={requestRecreate}
        onExecute={executeSelectionOrAll}
        onDownload={() => void downloadDatabase()}
      />
      {session.status === "stale" ? (
        <div className="sql-playground-stale" role="status">
          <strong>{t("sqlPlayground.stale.title")}</strong>
          <span>{t("sqlPlayground.stale.description")}</span>
        </div>
      ) : null}
      {session.error ? <SqlPlaygroundError error={session.error} /> : null}
      <div
        ref={bodyRef}
        className={session.resultsPanelCollapsed ? "sql-playground-body results-collapsed" : "sql-playground-body"}
        style={{ "--sql-playground-results-height": `${resultsPanelHeight}px` } as CSSProperties}
      >
        <SqlPlaygroundEditor
          ref={editorRef}
          value={session.query}
          executeDisabled={!canExecute}
          onChange={setQuery}
          onExecute={executeSelectionOrAll}
        />
        {!session.resultsPanelCollapsed ? (
          <SqlPlaygroundSplitter
            value={resultsPanelHeight}
            min={minimumResultsHeight}
            max={maximumResultsHeight}
            onChange={setResultsPanelHeight}
            onReset={() => setResultsPanelHeight(Math.min(264, maximumResultsHeight))}
          />
        ) : null}
        <SqlPlaygroundResults
          results={session.results}
          collapsed={session.resultsPanelCollapsed}
          onCollapsedChange={setResultsPanelCollapsed}
        />
      </div>
      <Modal
        open={resetConfirmationOpen}
        onClose={() => setResetConfirmationOpen(false)}
        title={t("sqlPlayground.resetConfirm.title")}
        subtitle={t("sqlPlayground.resetConfirm.message")}
        size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setResetConfirmationOpen(false)}>{t("common.actions.cancel")}</Button>
            <Button
              variant="danger"
              onClick={() => {
                setResetConfirmationOpen(false);
                void createDatabase(true);
              }}
            >
              {t("sqlPlayground.recreateDatabase")}
            </Button>
          </>
        )}
      >
        <div className="sql-playground-reset-modal-note">{t("sqlPlayground.sessionNotice")}</div>
      </Modal>
    </main>
  );
}

export function SqlPlaygroundWorkspace(props: SqlPlaygroundWorkspaceProps) {
  if (!props.hasLogicalModel || props.logicalOutOfDate) {
    const session = createSqlPlaygroundSessionState({
      sessionId: buildSqlPlaygroundSessionId(props.projectId, props.schemaFileId),
      schemaFileId: props.schemaFileId,
      schemaName: props.schemaName,
      currentGeneratedChecksum: "",
    });
    return (
      <main
        className="sql-playground-workspace sql-playground-workspace--empty"
        aria-label={props.schemaName}
      >
        <SqlPlaygroundHeader session={session} />
        <SqlPlaygroundEmptyState stale={props.logicalOutOfDate} onGenerate={props.onGenerateLogicalModel} />
      </main>
    );
  }
  return <AvailableSqlPlaygroundWorkspace {...props} />;
}
