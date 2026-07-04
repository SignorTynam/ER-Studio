import { useI18n } from "../../i18n/useI18n";
import { StudioIcon } from "../icons/StudioIcon";

interface WorkspaceEmptyEditorProps {
  onOpenWelcome: () => void;
  onNewSchema: () => void;
  onOpenProject: () => void;
}

export function WorkspaceEmptyEditor({
  onOpenWelcome,
  onNewSchema,
  onOpenProject,
}: WorkspaceEmptyEditorProps) {
  const { t } = useI18n();
  const actions = [
    {
      icon: "info" as const,
      label: t("workspaceEmpty.openWelcome"),
      description: t("workspaceEmpty.openWelcomeDescription"),
      onClick: onOpenWelcome,
    },
    {
      icon: "entity" as const,
      label: t("workspaceEmpty.newSchema"),
      description: t("workspaceEmpty.newSchemaDescription"),
      onClick: onNewSchema,
      primary: true,
    },
    {
      icon: "openProject" as const,
      label: t("workspaceEmpty.openProject"),
      description: t("workspaceEmpty.openProjectDescription"),
      onClick: onOpenProject,
    },
  ];

  return (
    <main className="workspace-empty-editor" aria-label={t("workspaceEmpty.title")}>
      <section className="workspace-empty-editor__panel">
        <div className="workspace-empty-editor__mark" aria-hidden="true">
          <StudioIcon name="pan" />
        </div>
        <h1>{t("workspaceEmpty.title")}</h1>
        <p>{t("workspaceEmpty.description")}</p>
      <div className="workspace-empty-editor__actions">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className={action.primary ? "workspace-empty-editor__action workspace-empty-editor__action--primary" : "workspace-empty-editor__action"}
            onClick={action.onClick}
          >
            <StudioIcon name={action.icon} aria-hidden="true" />
            <span>
              <strong>{action.label}</strong>
              <small>{action.description}</small>
            </span>
          </button>
        ))}
      </div>
      </section>
    </main>
  );
}
