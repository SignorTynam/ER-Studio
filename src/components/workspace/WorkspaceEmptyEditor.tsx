import { useI18n } from "../../i18n/useI18n";
import { Button } from "../ui";
import { WorkspaceBrandLogo } from "./WorkspaceBrandLogo";

interface WorkspaceEmptyEditorProps {
  onOpenWelcome: () => void;
  onNewSchema: () => void;
  onNewSql: () => void;
}

export function WorkspaceEmptyEditor({ onOpenWelcome, onNewSchema, onNewSql }: WorkspaceEmptyEditorProps) {
  const { t } = useI18n();

  return (
    <section className="workspace-empty-editor" aria-label={t("workspaceEmpty.title")}>
      <section className="workspace-empty-editor__panel">
        <WorkspaceBrandLogo className="workspace-empty-editor__logo" />
        <h1>{t("workspaceEmpty.title")}</h1>
        <p>{t("workspaceEmpty.description")}</p>
        <div className="workspace-empty-editor__actions">
          <Button
            className="workspace-empty-editor__button"
            variant="primary"
            iconLeft="newProject"
            onClick={onNewSchema}
          >
            {t("workspaceEmpty.newSchema")}
          </Button>
          <Button
            className="workspace-empty-editor__button"
            variant="secondary"
            iconLeft="code"
            onClick={onNewSql}
          >
            {t("workspaceEmpty.newSql")}
          </Button>
          <Button
            className="workspace-empty-editor__button"
            variant="ghost"
            iconLeft="arrowLeft"
            onClick={onOpenWelcome}
          >
            {t("workspaceEmpty.openWelcome")}
          </Button>
        </div>
      </section>
    </section>
  );
}
