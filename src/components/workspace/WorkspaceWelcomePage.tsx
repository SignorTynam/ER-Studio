import { useI18n } from "../../i18n/useI18n";
import { StudioIcon } from "../icons/StudioIcon";
import { WorkspaceBrandLogo } from "./WorkspaceBrandLogo";

interface WorkspaceWelcomePageProps {
  projectName: string;
  fileCount?: number;
  folderCount?: number;
  onNewSchema: () => void;
  onNewNote: () => void;
  onNewSql: () => void;
  onOpenProject: () => void;
  onImportSchema: () => void;
}

export function WorkspaceWelcomePage({
  projectName,
  fileCount = 0,
  folderCount = 0,
  onNewSchema,
  onNewNote,
  onNewSql,
  onOpenProject,
  onImportSchema,
}: WorkspaceWelcomePageProps) {
  const { t } = useI18n();
  const startActions = [
    {
      icon: "schema" as const,
      title: t("workspaceWelcome.newSchema"),
      description: t("workspaceWelcome.newSchemaDescription"),
      onClick: onNewSchema,
      tone: "primary",
    },
    {
      icon: "fileText" as const,
      title: t("workspaceWelcome.newNote"),
      description: t("workspaceWelcome.newNoteDescription"),
      onClick: onNewNote,
      tone: "secondary",
    },
    {
      icon: "database" as const,
      title: t("workspaceWelcome.newSql"),
      description: t("workspaceWelcome.newSqlDescription"),
      onClick: onNewSql,
      tone: "secondary",
    },
    {
      icon: "openProject" as const,
      title: t("workspaceWelcome.openProject"),
      description: t("workspaceWelcome.openProjectDescription"),
      onClick: onOpenProject,
      tone: "utility",
    },
    {
      icon: "download" as const,
      title: t("workspaceWelcome.importSchema"),
      description: t("workspaceWelcome.importSchemaDescription"),
      onClick: onImportSchema,
      tone: "utility",
    },
  ];
  const tips = [t("workspaceWelcome.tipExplorer"), t("workspaceWelcome.tipReverse"), t("workspaceWelcome.tipVersioning")];

  return (
    <main className="workspace-welcome-page" aria-label={t("workspaceWelcome.title")}>
      <section className="workspace-welcome-page__content">
        <div className="workspace-welcome-hero">
          <WorkspaceBrandLogo />
          <div>
            <p className="workspace-welcome-page__eyebrow">{projectName}</p>
            <h1>{t("workspaceWelcome.title")}</h1>
            <p className="workspace-welcome-page__subtitle">{t("workspaceWelcome.subtitle")}</p>
          </div>
        </div>

        <div className="workspace-welcome-grid">
          <section
            className="workspace-welcome-panel workspace-welcome-page__start workspace-welcome-actions"
            aria-label={t("workspaceWelcome.start")}
          >
            <h2>{t("workspaceWelcome.start")}</h2>
            <div className="workspace-welcome-action-stack">
              {startActions.map((action) => (
                <button
                  key={action.title}
                  type="button"
                  className={`workspace-welcome-action-row workspace-welcome-action-row--${action.tone}`}
                  onClick={action.onClick}
                >
                  <span className="workspace-welcome-action-row__icon" aria-hidden="true">
                    <StudioIcon name={action.icon} />
                  </span>
                  <span className="workspace-welcome-action-row__body">
                    <strong>{action.title}</strong>
                    <small>{action.description}</small>
                  </span>
                  <StudioIcon name="arrowRight" className="workspace-welcome-action-row__arrow" aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>

          <section className="workspace-welcome-panel workspace-welcome-project" aria-label={t("workspaceWelcome.projectSection")}>
            <h2>{t("workspaceWelcome.projectSection")}</h2>
            <dl className="workspace-welcome-project__stats">
              <div className="workspace-welcome-project__stat workspace-welcome-project__stat--wide">
                <dt>{t("workspaceWelcome.projectName")}</dt>
                <dd>{projectName}</dd>
              </div>
              <div className="workspace-welcome-project__stat">
                <dt>{t("workspaceWelcome.fileCount")}</dt>
                <dd>{fileCount}</dd>
              </div>
              <div className="workspace-welcome-project__stat">
                <dt>{t("workspaceWelcome.folderCount")}</dt>
                <dd>{folderCount}</dd>
              </div>
            </dl>
          </section>

          <section className="workspace-welcome-panel workspace-welcome-tips">
            <h2>{t("workspaceWelcome.tipsSection")}</h2>
            <ul>
              {tips.map((tip) => (
                <li key={tip}>
                  <StudioIcon name="done" aria-hidden="true" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </section>
    </main>
  );
}
