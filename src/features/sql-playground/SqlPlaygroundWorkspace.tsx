import { useState } from "react";
import { useI18n } from "../../i18n/useI18n";
import { Button, Modal } from "../../components/ui";
import { buildSqlPlaygroundSessionId } from "../../utils/sqlPlayground";
import type { SqlPlaygroundManager } from "./SqlPlaygroundManager";
import { SqlPlaygroundEditor } from "./SqlPlaygroundEditor";
import { SqlPlaygroundEmptyState } from "./SqlPlaygroundEmptyState";
import { SqlPlaygroundError } from "./SqlPlaygroundError";
import { SqlPlaygroundHeader } from "./SqlPlaygroundHeader";
import { SqlPlaygroundResults } from "./SqlPlaygroundResults";
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
  const sessionId = buildSqlPlaygroundSessionId(props.projectId, props.schemaFileId);
  const { session, setQuery, createDatabase, execute, downloadDatabase } = useSqlPlayground({
    manager: props.manager,
    sessionId,
    schemaFileId: props.schemaFileId,
    schemaName: props.schemaName,
    generatedSql: props.generatedSql,
  });
  const busy = session.status === "loading-engine" || session.status === "creating-database" || session.status === "running";
  const canExecute = session.databaseReady && !busy && session.query.trim().length > 0;

  function requestRecreate(): void {
    if (session.hasUserDataChanges) {
      setResetConfirmationOpen(true);
      return;
    }
    void createDatabase(true);
  }

  return (
    <main className="sql-playground-workspace" aria-label={t("sqlPlayground.title")}>
      <SqlPlaygroundHeader session={session} />
      <div className="sql-playground-toolbar" aria-label={t("sqlPlayground.actionsLabel")}>
        {!session.databaseReady ? (
          <Button
            variant="primary"
            size="sm"
            iconLeft="database"
            loading={session.status === "creating-database"}
            disabled={session.status === "loading-engine"}
            onClick={() => void createDatabase(false)}
          >
            {t("sqlPlayground.createDatabase")}
          </Button>
        ) : (
          <Button
            variant={session.status === "stale" ? "primary" : "secondary"}
            size="sm"
            iconLeft="refresh"
            loading={session.status === "creating-database"}
            onClick={requestRecreate}
          >
            {t("sqlPlayground.recreateDatabase")}
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          iconLeft="download"
          disabled={!session.databaseReady || busy}
          onClick={() => void downloadDatabase()}
        >
          {t("sqlPlayground.downloadDatabase")}
        </Button>
        {session.sqliteVersion ? <span className="sql-playground-toolbar__version">SQLite {session.sqliteVersion}</span> : null}
      </div>
      {session.status === "stale" ? (
        <div className="sql-playground-stale" role="status">
          <strong>{t("sqlPlayground.stale.title")}</strong>
          <span>{t("sqlPlayground.stale.description")}</span>
        </div>
      ) : null}
      {session.error ? <SqlPlaygroundError error={session.error} /> : null}
      <div className="sql-playground-body">
        <SqlPlaygroundEditor
          value={session.query}
          running={session.status === "running"}
          executeDisabled={!canExecute}
          onChange={setQuery}
          onExecute={(sql) => void execute(sql)}
        />
        <SqlPlaygroundResults results={session.results} />
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
