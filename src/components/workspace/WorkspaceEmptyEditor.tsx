import { useI18n } from "../../i18n/useI18n";
import { StudioIcon } from "../icons/StudioIcon";
import { Button } from "../ui";

interface WorkspaceEmptyEditorProps {
  onOpenWelcome: () => void;
  onNewSchema: () => void;
}

/**
 * Fase C5: invito breve con una sola CTA. Le vie alternative (apri progetto,
 * importa) restano nella tab Welcome e nel menu File: qui ripeterle creava
 * la terza lista di benvenuto consecutiva.
 */
export function WorkspaceEmptyEditor({ onOpenWelcome, onNewSchema }: WorkspaceEmptyEditorProps) {
  const { t } = useI18n();

  return (
    <main className="workspace-empty-editor" aria-label={t("workspaceEmpty.title")}>
      <section className="workspace-empty-editor__panel">
        <div className="workspace-empty-editor__mark" aria-hidden="true">
          <StudioIcon name="schema" />
        </div>
        <h1>{t("workspaceEmpty.title")}</h1>
        <p>{t("workspaceEmpty.description")}</p>
        <div className="workspace-empty-editor__actions">
          <Button variant="primary" iconLeft="newProject" onClick={onNewSchema}>
            {t("workspaceEmpty.newSchema")}
          </Button>
          <Button variant="ghost" onClick={onOpenWelcome}>
            {t("workspaceEmpty.openWelcome")}
          </Button>
        </div>
      </section>
    </main>
  );
}
