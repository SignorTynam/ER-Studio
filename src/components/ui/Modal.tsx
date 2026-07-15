import { useEffect, useId, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode, RefObject } from "react";
import { useI18n } from "../../i18n/useI18n";
import { StudioIcon } from "../icons/StudioIcon";
import { cx } from "./cx";

/** Scroll-lock condiviso: conta i modali aperti e ripristina l'overflow originale. */
let scrollLockCount = 0;
let previousBodyOverflow = "";

function lockBodyScroll() {
  if (typeof document === "undefined") return;
  if (scrollLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  scrollLockCount++;
}

function unlockBodyScroll() {
  if (typeof document === "undefined") return;
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    document.body.style.overflow = previousBodyOverflow;
  }
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export type ModalSize = "sm" | "md" | "lg";

/**
 * Skin legacy emesse in Fase B per parità di resa: i modali esistenti
 * appartengono a due famiglie CSS (help-modal-* e studio-modal-*).
 * La Fase C sposterà il look su ui-modal-* e ritirerà le skin.
 */
export type ModalLegacySkin = "help" | "studio" | "none";

const LEGACY_SKIN_CLASSES: Record<ModalLegacySkin, {
  backdrop: string;
  card: string;
  head: string;
  title: string;
  subtitle: string;
  close: string;
  footer: string;
}> = {
  help: {
    backdrop: "help-modal-backdrop",
    card: "help-modal",
    head: "help-modal-head",
    title: "",
    subtitle: "action-modal-subtitle",
    close: "help-close",
    footer: "action-modal-actions",
  },
  studio: {
    backdrop: "studio-modal-backdrop",
    card: "studio-modal",
    head: "studio-modal__header",
    title: "studio-modal__title",
    subtitle: "studio-modal__subtitle",
    close: "studio-modal__close",
    footer: "studio-modal__footer",
  },
  none: { backdrop: "", card: "", head: "", title: "", subtitle: "", close: "", footer: "" },
};

export interface ModalProps {
  open: boolean;
  /** Chiamato da Esc, click sul backdrop e bottone di chiusura (mai mentre `busy`). */
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Hook dimensionale (`ui-modal--sm|md|lg`); la larghezza effettiva in Fase B resta alle classi legacy. */
  size?: ModalSize;
  /** Footer semplice; i form con submit devono renderizzare il footer dentro il proprio `<form>`. */
  footer?: ReactNode;
  /** Operazione in corso: blocca Esc, backdrop e close. */
  busy?: boolean;
  closeOnBackdrop?: boolean;
  hideClose?: boolean;
  /** Riceve il focus all'apertura (in alternativa: primo elemento focalizzabile). */
  initialFocusRef?: RefObject<HTMLElement>;
  /** Famiglia di classi legacy da emettere per parità di resa (default `help`). */
  legacySkin?: ModalLegacySkin;
  /** Classi extra sulla card (in Fase B ospitano le skin legacy, es. `action-modal`). */
  className?: string;
  backdropClassName?: string;
  headerActions?: ReactNode;
  /** Etichetta alternativa quando non c'è `title`. */
  ariaLabel?: string;
  /** Per header custom nei children: id dell'heading che intitola il dialogo. */
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  testId?: string;
  children: ReactNode;
}

/**
 * Shell modale condivisa.
 *
 * Garantisce: `role="dialog"` + `aria-modal`, focus iniziale (senza rubare il
 * focus a un `autoFocus` del contenuto), focus trap su Tab/Shift+Tab, chiusura
 * con Esc e click sul backdrop (disattivabili/bloccati da `busy`), ripristino
 * del focus all'elemento attivo precedente, scroll-lock del body.
 *
 * Fase B: emette anche le classi legacy (`help-modal-backdrop`, `help-modal`,
 * `help-modal-head`, `help-close`, `action-modal-actions`) così la resa resta
 * identica ai modali esistenti; la Fase C sposterà il look su `ui-modal-*`.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = "md",
  footer,
  busy = false,
  closeOnBackdrop = true,
  hideClose = false,
  initialFocusRef,
  legacySkin = "help",
  className,
  backdropClassName,
  headerActions,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  testId,
  children,
}: ModalProps) {
  const { t } = useI18n();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const subtitleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lockBodyScroll();
    const card = cardRef.current;
    if (card && !card.contains(document.activeElement)) {
      const target = initialFocusRef?.current
        ?? card.querySelector<HTMLElement>("[data-autofocus]")
        ?? card.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
        ?? card;
      target.focus();
    }
    return () => {
      unlockBodyScroll();
      const previous = restoreFocusRef.current;
      if (previous && previous.isConnected) {
        previous.focus();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo all'apertura
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (busy) return;
      event.preventDefault();
      onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose, open]);

  if (!open) {
    return null;
  }

  function handleTrapKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const card = cardRef.current;
    if (!card) return;
    const focusables = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (focusables.length === 0) {
      event.preventDefault();
      card.focus();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (active instanceof HTMLElement && !card.contains(active)) {
      event.preventDefault();
      first.focus();
      return;
    }
    if (event.shiftKey && (active === first || active === card)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const canDismiss = !busy;
  const showHeader = title != null || subtitle != null || headerActions != null || !hideClose;
  const skin = LEGACY_SKIN_CLASSES[legacySkin];

  return (
    <div
      className={cx("ui-modal-backdrop", skin.backdrop, backdropClassName)}
      role="presentation"
      onClick={canDismiss && closeOnBackdrop ? onClose : undefined}
      onKeyDown={handleTrapKeyDown}
    >
      <div
        ref={cardRef}
        className={cx("ui-modal", `ui-modal--${size}`, skin.card, className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title != null ? titleId : ariaLabelledBy}
        aria-label={title == null && ariaLabelledBy == null ? ariaLabel : undefined}
        aria-describedby={ariaDescribedBy ?? (subtitle != null ? subtitleId : undefined)}
        onClick={(event) => event.stopPropagation()}
        tabIndex={-1}
        data-testid={testId}
      >
        {showHeader ? (
          <div className={cx("ui-modal__head", skin.head)}>
            <div className="ui-modal__titles">
              {title != null ? (
                <h2 id={titleId} className={cx(skin.title) || undefined}>
                  {title}
                </h2>
              ) : null}
              {subtitle != null ? (
                <p id={subtitleId} className={cx("ui-modal__subtitle", skin.subtitle)}>
                  {subtitle}
                </p>
              ) : null}
            </div>
            {headerActions}
            {!hideClose ? (
              <button
                type="button"
                className={cx("ui-modal__close", skin.close)}
                onClick={onClose}
                aria-label={t("common.actions.close")}
                disabled={busy}
              >
                <StudioIcon name="close" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        ) : null}
        {children}
        {footer ? <div className={cx("ui-modal__footer", skin.footer)}>{footer}</div> : null}
      </div>
    </div>
  );
}
