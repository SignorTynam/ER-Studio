import { useEffect, useRef, useState } from "react";
import type { WorkspaceNotice } from "../hooks/useWorkspaceNotices";
import { useI18n } from "../i18n/useI18n";
import { StudioIcon, type StudioIconName } from "./icons/StudioIcon";

export const MAX_VISIBLE_WORKSPACE_TOASTS = 4;

interface WorkspaceToastStackProps {
  notices: WorkspaceNotice[];
  onDismissNotice: (noticeId: number) => void;
  /** Fase L1 — sospende/riprende l'auto-dismiss dell'intera pila durante l'interazione. */
  onPauseTimers?: () => void;
  onResumeTimers?: () => void;
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

/**
 * Fase L3 — annuncio per screen reader separato dalla parte visiva.
 *
 * Perché non basta `role="alert"` sul toast: quel nodo viene *inserito* nel DOM, e inserire una
 * live region è molto meno affidabile che cambiare il contenuto di una live region già presente.
 * In più, annidare `role="alert"`/`role="status"` dentro un contenitore `aria-live` produce
 * doppi annunci (o nessuno) a seconda dello screen reader.
 *
 * Qui le due region esistono SEMPRE, vuote, e ricevono il testo del toast più recente. Solo una
 * delle due lo riceve: l'annuncio avviene una volta sola e con l'urgenza giusta — assertivo per
 * gli errori, polite per il resto.
 */
export function WorkspaceToastAnnouncer({ notices }: { notices: WorkspaceNotice[] }) {
  const { t } = useI18n();
  const [politeMessage, setPoliteMessage] = useState("");
  const [assertiveMessage, setAssertiveMessage] = useState("");
  const announcedRef = useRef(new Set<string>());

  const latest = notices.reduce<WorkspaceNotice | null>(
    (newest, candidate) => (newest === null || candidate.createdAt > newest.createdAt ? candidate : newest),
    null,
  );
  const signature = latest ? `${latest.id}:${latest.createdAt}` : "";

  useEffect(() => {
    const announced = announcedRef.current;
    // Dimentica i toast non più in pila: il set non cresce all'infinito e, soprattutto, quando il
    // più recente scade non ri-annunciamo quello sotto (che era già stato annunciato).
    const live = new Set(notices.map((item) => `${item.id}:${item.createdAt}`));
    announced.forEach((item) => {
      if (!live.has(item)) {
        announced.delete(item);
      }
    });

    if (latest === null || announced.has(signature)) {
      return;
    }

    announced.add(signature);
    const title = latest.title ?? t(getDefaultNoticeTitleKey(latest.tone));
    const announcement = `${title}. ${latest.message}`;
    const apply = latest.tone === "error" ? setAssertiveMessage : setPoliteMessage;
    // Svuota e riempie al frame successivo: così anche due messaggi identici di fila restano
    // una mutazione osservabile e vengono ri-annunciati.
    apply("");
    const frame = window.requestAnimationFrame(() => apply(announcement));
    return () => window.cancelAnimationFrame(frame);
  }, [notices, latest, signature, t]);

  return (
    <>
      <div className="workspace-toast-announcer" aria-live="assertive" aria-atomic="true">
        {assertiveMessage}
      </div>
      <div className="workspace-toast-announcer" aria-live="polite" aria-atomic="true">
        {politeMessage}
      </div>
    </>
  );
}

export function getVisibleWorkspaceToasts(notices: WorkspaceNotice[]): WorkspaceNotice[] {
  return [...notices]
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, MAX_VISIBLE_WORKSPACE_TOASTS);
}

export function WorkspaceToastStack({
  notices,
  onDismissNotice,
  onPauseTimers,
  onResumeTimers,
}: WorkspaceToastStackProps) {
  const { t } = useI18n();
  const visibleNotices = getVisibleWorkspaceToasts(notices);
  const hoveringRef = useRef(false);
  const focusedRef = useRef(false);

  /**
   * Fase L1 — l'auto-dismiss resta fermo finché il puntatore è su un toast OPPURE il focus è
   * dentro la pila, e riparte (dal tempo residuo) solo quando entrambi sono usciti.
   */
  function syncTimersWithInteraction() {
    if (hoveringRef.current || focusedRef.current) {
      onPauseTimers?.();
    } else {
      onResumeTimers?.();
    }
  }

  return (
    <section
      className="workspace-toast-viewport"
      // L3: niente `aria-live` qui. La parte visiva non è più una live region (evita
      // l'annidamento con i ruoli dei singoli toast); a parlare è WorkspaceToastAnnouncer.
      // L'`aria-label` resta: la pila deve restare identificabile e raggiungibile.
      aria-label={t("workspaceToasts.stackAria")}
      // Il viewport è `pointer-events: none` (lascia passare i click al canvas): mouseenter/leave
      // non scatterebbero mai. mouseover/mouseout invece risalgono dai singoli toast, che sono
      // `pointer-events: auto`.
      onMouseOver={() => {
        hoveringRef.current = true;
        syncTimersWithInteraction();
      }}
      onMouseOut={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
          return;
        }
        hoveringRef.current = false;
        syncTimersWithInteraction();
      }}
      onFocusCapture={() => {
        focusedRef.current = true;
        syncTimersWithInteraction();
      }}
      onBlurCapture={(event) => {
        // Spostarsi tra elementi dello stesso toast non deve far ripartire il conto.
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
          return;
        }
        focusedRef.current = false;
        syncTimersWithInteraction();
      }}
    >
      <div className="workspace-toast-stack">
        {visibleNotices.map((notice) => {
          const title = notice.title ?? t(getDefaultNoticeTitleKey(notice.tone));
          const relativeTime = getNoticeRelativeTime(notice.createdAt);
          return (
            // Nessun role="alert"/"status": l'annuncio passa dall'announcer (L3). Resta
            // `aria-labelledby` così il toast è comprensibile quando ci si arriva navigando.
            <article
              key={notice.id}
              className={`workspace-toast tone-${notice.tone}`}
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
      <WorkspaceToastAnnouncer notices={notices} />
    </section>
  );
}
