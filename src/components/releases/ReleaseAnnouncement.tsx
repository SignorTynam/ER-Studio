import { useRef } from "react";

import { useI18n } from "../../i18n/useI18n";
import type { ReleaseAnnouncementModel } from "../../releases/releaseTypes";
import { StudioIcon } from "../icons/StudioIcon";
import { Modal } from "../ui";

interface ReleaseAnnouncementProps {
  announcement: ReleaseAnnouncementModel;
  onClose: () => void;
  onOpenReleaseCenter: () => void;
}

export function ReleaseAnnouncement({ announcement, onClose, onOpenReleaseCenter }: ReleaseAnnouncementProps) {
  const { t } = useI18n();
  const primaryRef = useRef<HTMLButtonElement>(null);
  const latest = announcement.releases[0];
  const major = announcement.impact === "major";
  const title = latest?.heroContent?.title ?? latest?.headline ?? t("releases.announcement.title");
  const summary = latest?.heroContent?.subtitle ?? latest?.summary ?? t("releases.announcement.summary");

  return (
    <Modal
      open
      onClose={onClose}
      closeOnBackdrop={!major}
      hideClose={major}
      size="lg"
      className={`release-announcement release-announcement--${major ? "major" : "minor"}`}
      backdropClassName="release-announcement-backdrop"
      initialFocusRef={primaryRef}
      ariaLabelledBy="release-announcement-title"
      ariaDescribedBy="release-announcement-description"
      testId="release-announcement"
    >
      <header className="release-announcement__hero">
        <div>
          <span className="release-announcement__eyebrow">
            {major ? t("releases.announcement.major") : t("releases.announcement.minor")}
          </span>
          <h2 id="release-announcement-title">{title}</h2>
          <p id="release-announcement-description">{summary}</p>
          <span className="release-announcement__route" aria-label={t("releases.announcement.versionRouteAria")}>
            v{announcement.fromVersion} → v{announcement.toVersion}
          </span>
          {announcement.releaseCount > 1 ? (
            <span className="release-announcement__skipped">
              {t("releases.announcement.skipped", { count: announcement.releaseCount })}
            </span>
          ) : null}
        </div>
        {major ? <div className="release-announcement__version"><StudioIcon name="sparkles" /><strong>v{announcement.toVersion}</strong></div> : null}
      </header>
      {announcement.highlights.length > 0 ? (
        <div className="release-announcement__highlights">
          {announcement.highlights.map((highlight) => (
            <article key={highlight.title}><span>{highlight.tag}</span><h3>{highlight.title}</h3><p>{highlight.description}</p></article>
          ))}
        </div>
      ) : null}
      <section className="release-announcement__changes" aria-label={t("releases.announcement.changesAria")}>
        <ul>{announcement.changes.slice(0, 5).map((change) => <li key={change}>{change}</li>)}</ul>
      </section>
      <footer className="release-announcement__actions">
        <button type="button" className="release-button release-button--secondary" onClick={onOpenReleaseCenter}>{t("releases.actions.discover")}</button>
        <button ref={primaryRef} type="button" className="release-button release-button--primary" onClick={onClose}>{t("releases.actions.start")}</button>
      </footer>
    </Modal>
  );
}
