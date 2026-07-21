import { useRef } from "react";

import { useI18n } from "../../i18n/useI18n";
import { compareAppVersions } from "../../utils/versioning";
import type { LocalizedAppRelease, ReleaseChangeKind, ReleaseImpact } from "../../releases/releaseTypes";
import { StudioIcon } from "../icons/StudioIcon";
import { Modal } from "../ui";

interface ReleaseCenterProps {
  currentVersion: string;
  releases: LocalizedAppRelease[];
  unreadVersions?: readonly string[];
  onClose: () => void;
}

const KINDS: ReleaseChangeKind[] = ["added", "changed", "fixed"];

export function formatUnreadBadge(count: number): string {
  if (count <= 0) return "";
  return count > 9 ? "9+" : String(count);
}

function impactLabel(impact: ReleaseImpact, t: ReturnType<typeof useI18n>["t"]): string {
  return t(`releases.impact.${impact}`);
}

export function ReleaseCenter({ currentVersion, releases, unreadVersions = [], onClose }: ReleaseCenterProps) {
  const { t } = useI18n();
  const closeRef = useRef<HTMLButtonElement>(null);
  const ordered = [...releases].sort((left, right) => compareAppVersions(right.version, left.version));
  const unread = new Set(unreadVersions);

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      hideClose
      className="release-center"
      backdropClassName="release-center-backdrop"
      initialFocusRef={closeRef}
      ariaLabelledBy="release-center-title"
      ariaDescribedBy="release-center-description"
      testId="release-center"
    >
      <header className="release-center__header">
        <div>
          <span className="release-center__eyebrow"><StudioIcon name="sparkles" />{t("releases.center.eyebrow")}</span>
          <h2 id="release-center-title">{t("releases.center.title")}</h2>
          <p id="release-center-description">{t("releases.center.description", { version: currentVersion })}</p>
        </div>
        <button ref={closeRef} type="button" className="release-center__close" onClick={onClose} aria-label={t("releases.actions.closeCenter")}>
          <StudioIcon name="close" aria-hidden="true" />
        </button>
      </header>
      <div className="release-center__body" tabIndex={0}>
        {ordered.map((release, index) => {
          const current = compareAppVersions(release.version, currentVersion) === 0;
          return (
            <article key={release.version} className={`release-card${current ? " release-card--current" : ""}${index === 0 ? " release-card--latest" : ""}`}>
              <header className="release-card__header">
                <div>
                  <div className="release-card__title-row">
                    <h3>buildER v{release.version}</h3>
                    {current ? <span className="release-card__current">{t("releases.center.current")}</span> : null}
                    <span className={unread.has(release.version) ? "release-card__read-state release-card__read-state--unread" : "release-card__read-state"}>
                      {unread.has(release.version) ? t("releases.center.unread") : t("releases.center.read")}
                    </span>
                  </div>
                  <p className="release-card__headline">{release.headline}</p>
                </div>
                <div className="release-card__meta">
                  <span className={`release-impact release-impact--${release.impact}`}>{impactLabel(release.impact, t)}</span>
                  <time dateTime={release.date}>{release.date}</time>
                </div>
              </header>
              <p className="release-card__summary">{release.summary}</p>
              {release.highlights.length > 0 ? (
                <div className="release-card__highlights" aria-label={t("releases.center.highlightsAria")}>
                  {release.highlights.map((highlight) => <span key={highlight.title}><strong>{highlight.tag}</strong>{highlight.title}</span>)}
                </div>
              ) : null}
              <div className="release-card__sections">
                {KINDS.map((kind) => release.localizedSections[kind].length > 0 ? (
                  <section key={kind} className={`release-section release-section--${kind}`}>
                    <h4>{t(`releases.sections.${kind}`)}</h4>
                    <ul>{release.localizedSections[kind].map((change) => <li key={change}>{change}</li>)}</ul>
                  </section>
                ) : null)}
              </div>
            </article>
          );
        })}
      </div>
    </Modal>
  );
}
