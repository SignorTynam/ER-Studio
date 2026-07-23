import { useEffect, useRef, useState } from "react";

export interface WorkspaceNotice {
  id: number;
  title?: string;
  message: string;
  tone: "success" | "warning" | "error" | "info";
  sticky?: boolean;
  stickyType?: "source-selection";
  targetId?: string;
  createdAt: number;
  actionLabel?: string;
  onAction?: () => void;
  /**
   * Durata effettiva dell'auto-dismiss in ms; assente per i toast sticky. Fase L4: alimenta il
   * countdown, così la barra mostra la durata REALE anche se il chiamante ne passa una diversa
   * da quella di default del tono.
   */
  durationMs?: number;
}

export const NOTICE_DURATION_MS = {
  success: 3200,
  info: 3600,
  warning: 4400,
  error: 6200,
} as const;
export const STATUS_FOLLOWUP_NOTICE_MS = 2600;
export const MAX_NOTICE_HISTORY = 8;

type WorkspaceNoticeOptions = {
  title?: string;
  sticky?: boolean;
  stickyType?: WorkspaceNotice["stickyType"];
  targetId?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function getWorkspaceNoticeDeduplicationKey(
  notice: Pick<WorkspaceNotice, "message" | "tone"> &
    Partial<Pick<WorkspaceNotice, "title" | "stickyType" | "targetId">>,
): string {
  return [
    notice.tone,
    notice.title ?? "",
    notice.message,
    notice.stickyType ?? "",
    notice.targetId ?? "",
  ].join("\u001f");
}

/**
 * Fase L1 — stato dell'auto-dismiss di un singolo toast. Tracciamo il tempo RESIDUO (non solo
 * l'id del timeout) così hover e focus possono mettere in pausa il conto alla rovescia e, uscendo,
 * riprenderlo da dove si era fermato invece che da zero.
 *
 * Perché serve: un toast con azione ("Annulla" dell'auto-layout o degli auto-fix) è una promessa;
 * se scade mentre l'utente lo legge o ci sta arrivando col mouse — o prima che riesca a tabularci
 * sopra — la promessa è rotta.
 */
interface NoticeTimerState {
  /** Millisecondi ancora da attendere prima della chiusura automatica. */
  remaining: number;
  /** Quando è (ri)partita l'attesa corrente; `null` quando il timer è in pausa. */
  startedAt: number | null;
  /** Timeout attivo; `null` quando il timer è in pausa. */
  timeoutId: number | null;
}

interface UseWorkspaceNoticesOptions {
  formatErrorMessage: (message: string) => string;
}

export function useWorkspaceNotices({ formatErrorMessage }: UseWorkspaceNoticesOptions) {
  const [statusMessage, setStatusMessage] = useState("");
  const [notices, setNotices] = useState<WorkspaceNotice[]>([]);
  const nextNoticeIdRef = useRef(1);
  const noticeTimersRef = useRef(new Map<number, NoticeTimerState>());
  /** Vero mentre il puntatore è sulla pila o il focus è dentro un toast (L1). */
  const timersPausedRef = useRef(false);

  function clearNoticeTimer(noticeId: number) {
    const timer = noticeTimersRef.current.get(noticeId);
    if (timer === undefined) {
      return;
    }

    if (timer.timeoutId !== null) {
      window.clearTimeout(timer.timeoutId);
    }
    noticeTimersRef.current.delete(noticeId);
  }

  /** Avvia (o riavvia) l'attesa di `remaining` ms. In pausa registra solo il residuo. */
  function startNoticeTimer(noticeId: number, remaining: number) {
    if (timersPausedRef.current) {
      noticeTimersRef.current.set(noticeId, { remaining, startedAt: null, timeoutId: null });
      return;
    }

    const timeoutId = window.setTimeout(() => {
      noticeTimersRef.current.delete(noticeId);
      removeNotice(noticeId);
    }, remaining);
    noticeTimersRef.current.set(noticeId, { remaining, startedAt: Date.now(), timeoutId });
  }

  /**
   * Ferma l'auto-dismiss di TUTTA la pila (comportamento tipo Sonner/Radix): mentre l'utente
   * interagisce con un toast non devono sparire nemmeno gli altri.
   */
  function pauseNoticeTimers() {
    if (timersPausedRef.current) {
      return;
    }

    timersPausedRef.current = true;
    noticeTimersRef.current.forEach((timer, noticeId) => {
      if (timer.timeoutId === null || timer.startedAt === null) {
        return;
      }

      window.clearTimeout(timer.timeoutId);
      const elapsed = Date.now() - timer.startedAt;
      noticeTimersRef.current.set(noticeId, {
        remaining: Math.max(0, timer.remaining - elapsed),
        startedAt: null,
        timeoutId: null,
      });
    });
  }

  /** Riprende il conto alla rovescia dal tempo residuo, non da zero. */
  function resumeNoticeTimers() {
    if (!timersPausedRef.current) {
      return;
    }

    timersPausedRef.current = false;
    [...noticeTimersRef.current.entries()].forEach(([noticeId, timer]) => {
      if (timer.timeoutId !== null) {
        return;
      }

      startNoticeTimer(noticeId, timer.remaining);
    });
  }

  function removeNotice(noticeId: number) {
    clearNoticeTimer(noticeId);
    setNotices((current) => current.filter((notice) => notice.id !== noticeId));
  }

  function clearNotices() {
    noticeTimersRef.current.forEach((timer) => {
      if (timer.timeoutId !== null) {
        window.clearTimeout(timer.timeoutId);
      }
    });
    noticeTimersRef.current.clear();
    setNotices([]);
  }

  function dismissStickyNotices(stickyType?: WorkspaceNotice["stickyType"]) {
    setNotices((current) => {
      const stickyNotices = current.filter(
        (notice) => notice.sticky && (stickyType === undefined || notice.stickyType === stickyType),
      );
      if (stickyNotices.length === 0) {
        return current;
      }

      stickyNotices.forEach((notice) => clearNoticeTimer(notice.id));
      return current.filter((notice) => !stickyNotices.some((stickyNotice) => stickyNotice.id === notice.id));
    });
  }

  function showNotice(notice: Omit<WorkspaceNotice, "id" | "createdAt">, duration: number | null = NOTICE_DURATION_MS[notice.tone]) {
    let id = nextNoticeIdRef.current++;
    const createdAt = Date.now();

    setNotices((current) => {
      const nextKey = getWorkspaceNoticeDeduplicationKey(notice);
      const duplicate = current.find((item) => getWorkspaceNoticeDeduplicationKey(item) === nextKey);
      if (duplicate) {
        id = duplicate.id;
        clearNoticeTimer(id);
        const updated: WorkspaceNotice = {
          ...duplicate,
          ...notice,
          id,
          createdAt,
          durationMs: duration ?? undefined,
        };
        return [updated, ...current.filter((item) => item.id !== id)];
      }

      const retained = current
        .filter((item) => item.message !== notice.message && !item.sticky)
        .slice(0, MAX_NOTICE_HISTORY - 1);
      const removed = current.filter(
        (item) =>
          !retained.some((kept) => kept.id === item.id),
      );
      removed.forEach((item) => clearNoticeTimer(item.id));
      return [{ id, createdAt, ...notice, durationMs: duration ?? undefined }, ...retained];
    });

    if (duration !== null) {
      startNoticeTimer(id, duration);
    }
  }

  function showErrorNotice(message: string, options?: WorkspaceNoticeOptions) {
    showNotice({
      title: options?.title,
      message: formatErrorMessage(message),
      tone: "error",
      sticky: options?.sticky,
      stickyType: options?.stickyType,
      targetId: options?.targetId,
      actionLabel: options?.actionLabel,
      onAction: options?.onAction,
    });
  }

  // Toast policy: success notices confirm completed user actions; warning notices
  // report immediate invalid operations; error notices report blocking failures.
  // validateDiagram issues stay in Errors, canvas diagnostics, and status text.
  function showWarningNotice(message: string, options?: WorkspaceNoticeOptions) {
    const sticky = options?.sticky === true || options?.stickyType !== undefined;
    showNotice(
      {
        title: options?.title,
        message,
        tone: "warning",
        sticky,
        stickyType: options?.stickyType,
        targetId: options?.targetId,
        actionLabel: options?.actionLabel,
        onAction: options?.onAction,
      },
      sticky ? null : NOTICE_DURATION_MS.warning,
    );
  }

  function showSuccessNotice(message: string, options?: WorkspaceNoticeOptions) {
    showNotice({
      title: options?.title,
      message,
      tone: "success",
      sticky: options?.sticky,
      stickyType: options?.stickyType,
      targetId: options?.targetId,
      actionLabel: options?.actionLabel,
      onAction: options?.onAction,
    });
  }

  function showInfoNotice(message: string, options?: WorkspaceNoticeOptions) {
    showNotice({
      title: options?.title,
      message,
      tone: "info",
      sticky: options?.sticky,
      stickyType: options?.stickyType,
      targetId: options?.targetId,
      actionLabel: options?.actionLabel,
      onAction: options?.onAction,
    });
  }

  function setStatus(message: string) {
    setStatusMessage(message);
    if (!message.trim()) {
      dismissStickyNotices("source-selection");
    }
  }

  function setStatusWarning(message: string, options?: WorkspaceNoticeOptions) {
    setStatusMessage(message);
    // Nessun titolo di default qui: senza `title` la toast stack usa la chiave
    // localizzata `workspaceToasts.defaultTitles.<tone>` (en/it/sq).
    showWarningNotice(message, options);
  }

  function setStatusSuccess(message: string) {
    setStatusMessage(message);
  }

  function setStatusError(message: string, options?: WorkspaceNoticeOptions) {
    const normalizedError = formatErrorMessage(message);
    setStatusMessage(normalizedError);
    // Idem: il titolo di default arriva localizzato dalla toast stack.
    showErrorNotice(normalizedError, options);
  }

  useEffect(() => {
    if (!statusMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setStatusMessage("");
    }, STATUS_FOLLOWUP_NOTICE_MS);

    return () => window.clearTimeout(timeout);
  }, [statusMessage]);

  useEffect(() => {
    const timers = noticeTimersRef.current;
    return () => {
      timers.forEach((timer) => {
        if (timer.timeoutId !== null) {
          window.clearTimeout(timer.timeoutId);
        }
      });
      timers.clear();
    };
  }, []);

  return {
    notices,
    statusMessage,
    setStatusMessage,
    setStatus,
    setStatusWarning,
    setStatusSuccess,
    setStatusError,
    showNotice,
    showErrorNotice,
    showWarningNotice,
    showSuccessNotice,
    showInfoNotice,
    removeNotice,
    clearNotices,
    dismissStickyNotices,
    pauseNoticeTimers,
    resumeNoticeTimers,
  };
}
