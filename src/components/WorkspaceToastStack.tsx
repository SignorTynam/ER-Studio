import type { WorkspaceNotice } from "../hooks/useWorkspaceNotices";
import { useI18n } from "../i18n/useI18n";
import { StudioIcon, type StudioIconName } from "./icons/StudioIcon";

export const MAX_VISIBLE_WORKSPACE_TOASTS = 4;

interface WorkspaceToastStackProps {
  notices: WorkspaceNotice[];
  onDismissNotice: (noticeId: number) => void;
}

function getNoticeIcon(tone: WorkspaceNotice["tone"]): StudioIconName {
  if (tone === "error") {
    return "error";
  }
  if (tone === "warning") {
    return "warning";
  }
  if (tone === "success") {
    return "success";
  }

  return "info";
}

export function getDefaultNoticeTitleKey(tone: WorkspaceNotice["tone"]): string {
  if (tone === "error" || tone === "warning" || tone === "success") {
    return `workspaceToasts.defaultTitles.${tone}`;
  }

  return "workspaceToasts.defaultTitles.info";
}

export interface NoticeRelativeTime {
  key: string;
  count?: number;
}

export function getNoticeRelativeTime(createdAt: number, now = Date.now()): NoticeRelativeTime {
  const elapsedSeconds = Math.max(0, Math.floor((now - createdAt) / 1000));
  if (elapsedSeconds < 5) {
    return { key: "workspaceToasts.relativeTime.now" };
  }
  if (elapsedSeconds < 60) {
    return { key: "workspaceToasts.relativeTime.secondsAgo", count: elapsedSeconds };
  }

  return { key: "workspaceToasts.relativeTime.minutesAgo", count: Math.floor(elapsedSeconds / 60) };
}

export function getVisibleWorkspaceToasts(notices: WorkspaceNotice[]): WorkspaceNotice[] {
  return [...notices]
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, MAX_VISIBLE_WORKSPACE_TOASTS);
}

export function WorkspaceToastStack({ notices, onDismissNotice }: WorkspaceToastStackProps) {
  const { t } = useI18n();
  const visibleNotices = getVisibleWorkspaceToasts(notices);

  return (
    <section className="workspace-toast-viewport" aria-live="polite" aria-label={t("workspaceToasts.stackAria")}>
      <div className="workspace-toast-stack">
        {visibleNotices.map((notice) => {
          const title = notice.title ?? t(getDefaultNoticeTitleKey(notice.tone));
          const relativeTime = getNoticeRelativeTime(notice.createdAt);
          const role = notice.tone === "error" ? "alert" : "status";
          return (
            <article
              key={notice.id}
              className={`workspace-toast tone-${notice.tone}`}
              role={role}
              aria-labelledby={`workspace-toast-title-${notice.id}`}
            >
              <header className="workspace-toast-head">
                <span className="workspace-toast-icon" aria-hidden="true">
                  <StudioIcon name={getNoticeIcon(notice.tone)} />
                </span>
                <strong id={`workspace-toast-title-${notice.id}`} className="workspace-toast-title">
                  {title}
                </strong>
                <span className="workspace-toast-time">
                  {relativeTime.count != null
                    ? t(relativeTime.key, { count: relativeTime.count })
                    : t(relativeTime.key)}
                </span>
                <button
                  type="button"
                  className="workspace-toast-close"
                  onClick={() => onDismissNotice(notice.id)}
                  aria-label={t("bottomStatus.dismissNotice")}
                >
                  <StudioIcon name="close" className="studio-icon-sm" aria-hidden="true" />
                </button>
              </header>
              <div className="workspace-toast-body">
                <p>{notice.message}</p>
                {notice.actionLabel && notice.onAction ? (
                  <button
                    type="button"
                    className="workspace-toast-action"
                    onClick={() => {
                      onDismissNotice(notice.id);
                      notice.onAction?.();
                    }}
                  >
                    {notice.actionLabel}
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
