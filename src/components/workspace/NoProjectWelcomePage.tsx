import { useI18n } from "../../i18n/useI18n";
import { StudioIcon } from "../icons/StudioIcon";

interface NoProjectWelcomePageProps {
  onNewProject: () => void;
  onOpenProject: () => void;
  onImportSchema: () => void;
}

export function NoProjectWelcomePage({
  onNewProject,
  onOpenProject,
  onImportSchema,
}: NoProjectWelcomePageProps) {
  const { t } = useI18n();

  return (
    <main className="workspace-welcome-page no-project-welcome-page" aria-label={t("noProjectWelcome.title")}>
      <section className="workspace-welcome-page__content no-project-welcome-page__content">
        <div className="workspace-welcome-hero">
          <div className="workspace-welcome-logo" aria-label={t("workspaceWelcome.logoAria")}>
            <span>ER</span>
          </div>
          <div>
            <p className="workspace-welcome-page__eyebrow">buildER</p>
            <h1>{t("noProjectWelcome.title")}</h1>
            <p className="workspace-welcome-page__subtitle">{t("noProjectWelcome.subtitle")}</p>
          </div>
        </div>

        <section className="workspace-welcome-panel workspace-welcome-page__start" aria-label={t("noProjectWelcome.start")}>
          <h2>{t("noProjectWelcome.start")}</h2>
          <button type="button" onClick={onNewProject}>
            <StudioIcon name="newProject" aria-hidden="true" />
            <span>{t("noProjectWelcome.newProject")}</span>
          </button>
          <button type="button" onClick={onOpenProject}>
            <StudioIcon name="openProject" aria-hidden="true" />
            <span>{t("noProjectWelcome.openProject")}</span>
          </button>
          <button type="button" onClick={onImportSchema}>
            <StudioIcon name="download" aria-hidden="true" />
            <span>{t("noProjectWelcome.importSchema")}</span>
          </button>
        </section>
      </section>
    </main>
  );
}
