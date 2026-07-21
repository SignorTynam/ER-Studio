import { StudioIcon } from "../../components/icons/StudioIcon";
import { Badge, Button, Tooltip, type BadgeTone } from "../../components/ui";
import { useI18n } from "../../i18n/useI18n";
import type { ImportedSqlDatabaseSessionState } from "../sql-playground/sqlPlaygroundState";

function statusPresentation(session: ImportedSqlDatabaseSessionState): { key: string; tone: BadgeTone } {
  switch (session.status) {
    case "opening-database":
      return { key: "databaseWorkspace.status.opening", tone: "info" };
    case "verifying-database":
      return { key: "databaseWorkspace.status.verifying", tone: "info" };
    case "restoring":
      return { key: "databaseWorkspace.status.restoring", tone: "info" };
    case "exporting":
      return { key: "databaseWorkspace.status.exporting", tone: "info" };
    case "modified":
      return { key: "databaseWorkspace.status.modified", tone: "warning" };
    case "exported":
      return { key: "databaseWorkspace.status.exported", tone: "success" };
    case "runtime-error":
    case "schema-error":
      return { key: "databaseWorkspace.status.error", tone: "danger" };
    default:
      return { key: "databaseWorkspace.status.ready", tone: "success" };
  }
}

interface ImportedDatabaseHeaderProps {
  session: ImportedSqlDatabaseSessionState;
  executeDisabled: boolean;
  onExecute: () => void;
  onExport: () => void;
  onRestore: () => void;
  onReverse: () => void;
}

export function ImportedDatabaseHeader(props: ImportedDatabaseHeaderProps) {
  const { t } = useI18n();
  const presentation = statusPresentation(props.session);
  const busy = ["opening-database", "verifying-database", "running", "restoring", "exporting"].includes(props.session.status);
  return (
    <header className="sql-playground-command-bar database-workspace-command-bar" aria-label={t("databaseWorkspace.actionsLabel")}>
      <div className="sql-playground-command-bar__primary">
        <span className="sql-playground-command-bar__icon" aria-hidden="true"><StudioIcon name="database" /></span>
        <h1>{t("databaseWorkspace.title")}</h1>
        <span className="sql-playground-command-bar__status" aria-live="polite" aria-atomic="true">
          <Badge tone={presentation.tone}>{t(presentation.key)}</Badge>
        </span>
        <Button variant="primary" size="sm" iconLeft="code" loading={props.session.status === "running"} disabled={props.executeDisabled} onClick={props.onExecute}>
          {t("sqlPlayground.execute")}
        </Button>
        <Button variant="secondary" size="sm" iconLeft="download" loading={props.session.status === "exporting"} disabled={busy} onClick={props.onExport}>
          {t("databaseWorkspace.saveCopy")}
        </Button>
        <Button variant="secondary" size="sm" iconLeft="refresh" loading={props.session.status === "restoring"} disabled={busy || !props.session.hasSessionChanges} onClick={props.onRestore}>
          {t("databaseWorkspace.restoreOriginal")}
        </Button>
        <Button variant="secondary" size="sm" iconLeft="databaseReverse" disabled={busy} onClick={props.onReverse}>
          {t("databaseWorkspace.reverseEngineering")}
        </Button>
      </div>
      <div className="sql-playground-command-bar__metadata">
        <strong title={props.session.fileName}>{props.session.fileName}</strong>
        {props.session.sqliteVersion ? <span>SQLite {props.session.sqliteVersion}</span> : null}
        <Tooltip label={t("databaseWorkspace.localCopyNotice")} position="bottom">
          {(aria) => (
            <span className="sql-playground-command-bar__info" role="img" aria-label={t("databaseWorkspace.localCopyNotice")} tabIndex={0} {...aria}>
              <StudioIcon name="info" aria-hidden="true" />
            </span>
          )}
        </Tooltip>
      </div>
    </header>
  );
}
