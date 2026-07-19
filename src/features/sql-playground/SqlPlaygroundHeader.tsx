import { useI18n } from "../../i18n/useI18n";
import { StudioIcon } from "../../components/icons/StudioIcon";
import { Badge, type BadgeTone } from "../../components/ui";
import type { SqlPlaygroundSessionState } from "./sqlPlaygroundState";

function getStatusPresentation(session: SqlPlaygroundSessionState): { key: string; tone: BadgeTone } {
  switch (session.status) {
    case "loading-engine":
      return { key: "sqlPlayground.status.loadingEngine", tone: "info" };
    case "creating-database":
      return { key: "sqlPlayground.status.creatingDatabase", tone: "info" };
    case "ready":
    case "running":
      return { key: "sqlPlayground.status.ready", tone: "success" };
    case "stale":
      return { key: "sqlPlayground.status.stale", tone: "warning" };
    case "schema-error":
      return { key: "sqlPlayground.status.schemaError", tone: "danger" };
    case "runtime-error":
      return {
        key: session.error?.operation === "initialize"
          ? "sqlPlayground.status.initializationError"
          : "sqlPlayground.status.runtimeError",
        tone: "danger",
      };
    case "idle":
    case "engine-ready":
      return { key: "sqlPlayground.status.notCreated", tone: "neutral" };
  }
}

export function SqlPlaygroundHeader({ session }: { session: SqlPlaygroundSessionState }) {
  const { t } = useI18n();
  const presentation = getStatusPresentation(session);
  return (
    <header className="sql-playground-header">
      <div className="sql-playground-header__identity">
        <span className="sql-playground-header__icon" aria-hidden="true">
          <StudioIcon name="database" />
        </span>
        <div>
          <div className="sql-playground-header__title-row">
            <h1>{t("sqlPlayground.title")}</h1>
            <span aria-live="polite" aria-atomic="true">
              <Badge tone={presentation.tone}>{t(presentation.key)}</Badge>
            </span>
          </div>
          <p>
            <strong>{session.schemaName}</strong>
            <span aria-hidden="true"> · </span>
            {t("sqlPlayground.localExecution")}
          </p>
        </div>
      </div>
      <div className="sql-playground-header__session-note">
        <StudioIcon name="info" aria-hidden="true" />
        <span>{t("sqlPlayground.sessionNotice")}</span>
      </div>
    </header>
  );
}
