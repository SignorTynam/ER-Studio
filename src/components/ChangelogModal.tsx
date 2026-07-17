import { useRef } from "react";

import { useI18n } from "../i18n/useI18n";
import type { AppChangelogEntry, AppChangelogImpact } from "../utils/appMeta";
import { StudioIcon } from "./icons/StudioIcon";
import { Modal } from "./ui";

interface ChangelogModalProps {
  appName: string;
  currentVersion: string;
  entries: AppChangelogEntry[];
  onClose: () => void;
}

type Translate = ReturnType<typeof useI18n>["t"];

function getImpactLabel(impact: AppChangelogImpact | undefined, t: Translate): string {
  if (impact === "major") {
    return t("changelog.impact.major");
  }

  if (impact === "minor") {
    return t("changelog.impact.minor");
  }

  return t("changelog.impact.fix");
}

function getImpactClassName(impact: AppChangelogImpact | undefined): string {
  if (impact === "major") {
    return "changelog-impact-badge changelog-impact-badge--major";
  }

  if (impact === "minor") {
    return "changelog-impact-badge changelog-impact-badge--important";
  }

  return "changelog-impact-badge changelog-impact-badge--fix";
}

export function ChangelogModal({ appName, currentVersion, entries, onClose }: ChangelogModalProps) {
  const { t } = useI18n();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      hideClose
      backdropClassName="changelog-modal-modern-backdrop"
      className="changelog-modal-modern"
      ariaLabelledBy="changelog-modal-title"
    >
      <header className="studio-modal__header changelog-modal-modern__header">
          <div>
            <span className="changelog-modal-modern__eyebrow">{t("changelog.eyebrow", { appName })}</span>
            <h2 id="changelog-modal-title" className="studio-modal__title">{t("changelog.title")}</h2>
            <p className="studio-modal__subtitle">
              {t("changelog.subtitle", { version: currentVersion })}
            </p>
          </div>
          <button
            type="button"
            className="studio-modal__close"
            onClick={onClose}
            aria-label={t("changelog.closeAria")}
            autoFocus
            ref={closeButtonRef}
          >
            <StudioIcon name="close" aria-hidden="true" />
          </button>
        </header>

        {/* tabIndex=0: la lista scorre ma non contiene controlli focalizzabili;
            senza questo non e' raggiungibile da tastiera (axe:
            scrollable-region-focusable, WCAG 2.1.1). */}
        <div className="studio-modal__body changelog-modal-modern__body" tabIndex={0} role="group">
          {entries.map((entry) => {
            const isCurrentVersion = entry.version === currentVersion;

            return (
              <article
                key={`${entry.version}-${entry.date}`}
                className={
                  isCurrentVersion
                    ? "changelog-release-card changelog-release-card--current"
                    : "changelog-release-card"
                }
              >
                <header className="changelog-release-card__header">
                  <div>
                    <div className="changelog-release-card__title-row">
                      <h3>{appName} {entry.version}</h3>
                      {isCurrentVersion ? <span className="changelog-current-badge">{t("changelog.current")}</span> : null}
                    </div>
                    <p>{entry.headline ?? entry.summary ?? t("changelog.defaultSummary")}</p>
                  </div>
                  <div className="changelog-release-card__meta">
                    <span className={getImpactClassName(entry.impact)}>{getImpactLabel(entry.impact, t)}</span>
                    <time dateTime={entry.date}>{entry.date}</time>
                  </div>
                </header>

                {entry.highlights && entry.highlights.length > 0 ? (
                  <div className="changelog-release-card__highlights" aria-label={t("changelog.highlightsAria")}>
                    {entry.highlights.slice(0, 3).map((highlight) => (
                      <span key={`${entry.version}-${highlight.title}`}>
                        {highlight.tag ? <strong>{highlight.tag}</strong> : null}
                        {highlight.title}
                      </span>
                    ))}
                  </div>
                ) : null}

                <ul className="changelog-release-card__updates">
                  {entry.updates.map((update) => (
                    <li key={update}>{update}</li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
    </Modal>
  );
}
