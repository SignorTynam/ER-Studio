import { ProjectActivityPanelHeader } from "../../components/project/ProjectActivityPanelHeader";
import { StudioIcon } from "../../components/icons/StudioIcon";
import { Button, Tooltip } from "../../components/ui";
import { useI18n } from "../../i18n/useI18n";
import type { ReactNode } from "react";
import type { SqlPlaygroundManager } from "./SqlPlaygroundManager";
import { SqlExplorerTree } from "./SqlExplorerTree";
import { useSqlExplorer } from "./useSqlExplorer";

interface SqlExplorerPanelProps {
  manager: SqlPlaygroundManager | null;
  sessionId: string | null;
  schemaName: string | null;
  hasProject: boolean;
  hasSchema: boolean;
  onOpenPlayground: () => void;
  onClose: () => void;
}

export function SqlExplorerPanel({
  manager,
  sessionId,
  schemaName,
  hasProject,
  hasSchema,
  onOpenPlayground,
  onClose,
}: SqlExplorerPanelProps) {
  const { t } = useI18n();
  const explorer = useSqlExplorer(manager, sessionId);
  const sessionExists = Boolean(manager && sessionId && manager.getSessionState(sessionId));
  let content: ReactNode = null;

  if (!hasProject) {
    content = <p className="sql-explorer-empty">{t("sqlExplorer.empty.noProject")}</p>;
  } else if (!hasSchema || !schemaName || !sessionId) {
    content = <p className="sql-explorer-empty">{t("sqlExplorer.empty.noSchema")}</p>;
  } else if (!sessionExists || explorer.status === "idle") {
    content = (
      <div className="sql-explorer-empty">
        <p>{t("sqlExplorer.empty.playgroundClosed")}</p>
        <Button size="sm" variant="primary" iconLeft="database" onClick={onOpenPlayground}>{t("sqlExplorer.openPlayground")}</Button>
      </div>
    );
  } else if (explorer.status === "database-missing") {
    content = (
      <div className="sql-explorer-empty">
        <p>{t("sqlExplorer.empty.databaseMissing")}</p>
        <Button size="sm" variant="primary" iconLeft="database" onClick={onOpenPlayground}>{t("sqlExplorer.goToPlayground")}</Button>
      </div>
    );
  } else if (explorer.metadata) {
    content = (
      <div className="sql-explorer-tree-region" aria-busy={explorer.status === "loading" || undefined}>
        {explorer.status === "loading" ? (
          <div className="sql-explorer-loading" role="status"><span className="ui-button__spinner" aria-hidden="true" />{t("sqlExplorer.loading")}</div>
        ) : null}
        <SqlExplorerTree metadata={explorer.metadata} schemaName={schemaName} />
      </div>
    );
  } else if (explorer.status === "loading") {
    content = <div className="sql-explorer-loading" role="status"><span className="ui-button__spinner" aria-hidden="true" />{t("sqlExplorer.loading")}</div>;
  } else if (explorer.status === "error") {
    content = (
      <div className="sql-explorer-error" role="alert">
        <strong>{t("sqlExplorer.error.title")}</strong>
        <p>{explorer.error?.message ?? t("sqlExplorer.error.description")}</p>
        <Button size="sm" variant="secondary" iconLeft="refresh" onClick={() => void explorer.refresh()}>{t("sqlExplorer.retry")}</Button>
      </div>
    );
  }

  return (
    <section className="project-activity-section sql-explorer-panel" aria-label={t("sqlExplorer.title")}>
      <ProjectActivityPanelHeader title={t("sqlExplorer.title")} closeLabel={t("workspaceActivity.closePanel")} onClose={onClose}>
        <Tooltip label={t("sqlExplorer.refresh")} position="bottom">
          {(aria) => (
            <button
              type="button"
              className="sql-explorer-refresh"
              onClick={() => void explorer.refresh()}
              disabled={explorer.status === "loading" || explorer.status === "idle" || explorer.status === "database-missing"}
              aria-busy={explorer.status === "loading" || undefined}
              aria-label={t("sqlExplorer.refresh")}
              {...aria}
            >
              <StudioIcon name="refresh" aria-hidden="true" />
            </button>
          )}
        </Tooltip>
      </ProjectActivityPanelHeader>
      {schemaName ? <div className="sql-explorer-schema-name" title={schemaName}>{schemaName}</div> : null}
      <div className="sql-explorer-panel__body">{content}</div>
    </section>
  );
}
