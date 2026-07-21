import { useI18n } from "../../i18n/useI18n";
import type { ReleaseAnnouncementModel } from "../../releases/releaseTypes";
import { StudioIcon } from "../icons/StudioIcon";

export function CriticalReleaseBanner({ announcement, onOpenReleaseCenter }: {
  announcement: ReleaseAnnouncementModel;
  onOpenReleaseCenter: () => void;
}) {
  const { t } = useI18n();
  return (
    <aside className="critical-release-banner" role="alert" data-testid="critical-release-banner">
      <StudioIcon name="warning" aria-hidden="true" />
      <strong>{t("releases.critical.title")}</strong>
      <span>{announcement.releases[0]?.summary}</span>
      <button type="button" onClick={onOpenReleaseCenter}>{t("releases.actions.viewDetails")}</button>
    </aside>
  );
}
