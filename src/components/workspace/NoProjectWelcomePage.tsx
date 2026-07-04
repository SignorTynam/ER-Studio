import { useI18n } from "../../i18n/useI18n";
import { StudioIcon } from "../icons/StudioIcon";
import { WorkspaceBrandLogo } from "./WorkspaceBrandLogo";

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
  const actions = [
    {
      icon: "newProject" as const,
      title: t("noProjectWelcome.newProject"),
      description: t("noProjectWelcome.newProjectDescription"),
      onClick: onNewProject,
      primary: true,
    },
    {
      icon: "openProject" as const,
      title: t("noProjectWelcome.openProject"),
      description: t("noProjectWelcome.openProjectDescription"),
      onClick: onOpenProject,
    },
    {
      icon: "download" as const,
      title: t("noProjectWelcome.importSchema"),
      description: t("noProjectWelcome.importSchemaDescription"),
      onClick: onImportSchema,
    },
  ];
  const capabilities = [
    {
      icon: "entity" as const,
      title: t("noProjectWelcome.capabilityModeling"),
      description: t("noProjectWelcome.capabilityModelingDescription"),
    },
    {
      icon: "translate" as const,
      title: t("noProjectWelcome.capabilityTranslation"),
      description: t("noProjectWelcome.capabilityTranslationDescription"),
    },
    {
      icon: "history" as const,
      title: t("noProjectWelcome.capabilityVersioning"),
      description: t("noProjectWelcome.capabilityVersioningDescription"),
    },
  ];

  return (
    <main className="workspace-welcome-page no-project-welcome-page" aria-label={t("noProjectWelcome.title")}>
      <section className="workspace-welcome-page__content no-project-welcome-page__content">
        <div className="workspace-welcome-hero">
          <WorkspaceBrandLogo />
          <div>
            <p className="workspace-welcome-page__eyebrow">{t("noProjectWelcome.productLabel")}</p>
            <h1>{t("noProjectWelcome.title")}</h1>
            <p className="workspace-welcome-page__subtitle">{t("noProjectWelcome.subtitle")}</p>
          </div>
        </div>

        <section
          className="workspace-welcome-panel workspace-welcome-page__start workspace-welcome-actions"
          aria-label={t("noProjectWelcome.start")}
        >
          <h2>{t("noProjectWelcome.start")}</h2>
          <div className="workspace-welcome-action-grid">
            {actions.map((action) => (
              <button
                key={action.title}
                type="button"
                className={[
                  "workspace-welcome-action-card",
                  action.primary ? "workspace-welcome-action-card--primary" : "",
                ].filter(Boolean).join(" ")}
                onClick={action.onClick}
              >
                <span className="workspace-welcome-action-card__icon" aria-hidden="true">
                  <StudioIcon name={action.icon} />
                </span>
                <span className="workspace-welcome-action-card__body">
                  <strong>{action.title}</strong>
                  <small>{action.description}</small>
                </span>
                <StudioIcon name="arrowRight" className="workspace-welcome-action-card__arrow" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>

        <section className="workspace-welcome-panel workspace-welcome-capabilities" aria-label={t("noProjectWelcome.capabilitiesTitle")}>
          <h2>{t("noProjectWelcome.capabilitiesTitle")}</h2>
          <div className="workspace-welcome-capability-grid">
            {capabilities.map((capability) => (
              <article key={capability.title} className="workspace-welcome-capability">
                <StudioIcon name={capability.icon} aria-hidden="true" />
                <div>
                  <strong>{capability.title}</strong>
                  <p>{capability.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
