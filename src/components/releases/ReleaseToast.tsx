import { useI18n } from "../../i18n/useI18n";
import type { ReleaseAnnouncementModel } from "../../releases/releaseTypes";
import { StudioIcon } from "../icons/StudioIcon";

interface ReleaseToastProps {
  announcement: ReleaseAnnouncementModel;
  onClose: () => void;
  onOpenReleaseCenter: () => void;
}

export function ReleaseToast({ announcement, onClose, onOpenReleaseCenter }: ReleaseToastProps) {
  const { t } = useI18n();
  return (
    <aside className="release-toast" role="status" aria-label={t("releases.toast.ariaLabel")} data-testid="release-toast">
      <div className="release-toast__icon" aria-hidden="true"><StudioIcon name="sparkles" /></div>
      <div className="release-toast__content">
        <strong>{t("releases.toast.title")}</strong>
        <span>v{announcement.toVersion}</span>
        <ul>{announcement.changes.slice(0, 2).map((change) => <li key={change}>{change}</li>)}</ul>
        <button type="button" onClick={onOpenReleaseCenter}>{t("releases.actions.viewAll")}</button>
      </div>
      <button type="button" className="release-toast__close" onClick={onClose} aria-label={t("releases.actions.dismiss")}>
        <StudioIcon name="close" aria-hidden="true" />
      </button>
    </aside>
  );
}
