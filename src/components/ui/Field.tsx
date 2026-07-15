import { useId } from "react";
import type { ReactNode } from "react";
import { cx } from "./cx";

export interface FieldRenderProps {
  /** id da assegnare al controllo (`<input id={id} …>`). */
  id: string;
  /** true quando `error` è presente: da riflettere su `aria-invalid`. */
  invalid: boolean;
  /** ids di aiuto/errore per `aria-describedby` (undefined se non servono). */
  describedBy?: string;
}

export interface FieldProps {
  label: ReactNode;
  /** Testo di aiuto sotto il controllo. */
  help?: ReactNode;
  /** Messaggio di errore: attiva lo stato invalido e `role="alert"`. */
  error?: ReactNode;
  className?: string;
  /**
   * Controllo del campo. Con la forma funzione riceve id/invalid/describedBy
   * per il cablaggio ARIA: `{({ id, invalid, describedBy }) => <input id={id} … />}`.
   */
  children: ReactNode | ((props: FieldRenderProps) => ReactNode);
}

/**
 * Wrapper label + controllo + aiuto + errore per input/textarea/select.
 *
 * Copre i pattern di validazione esistenti (nome vuoto, caratteri non validi,
 * duplicati): quando `error` è valorizzato il messaggio ha `role="alert"` e la
 * forma-funzione dei children fornisce `invalid`/`describedBy` da riportare su
 * `aria-invalid`/`aria-describedby` del controllo.
 *
 * Fase B: emette anche la classe legacy `action-modal-field` per parità di resa
 * nei modali migrati; il look passerà a `ui-field` in Fase C.
 */
export function Field({ label, help, error, className, children }: FieldProps) {
  const id = useId();
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const invalid = error != null && error !== "";
  const describedBy = [help != null ? helpId : null, invalid ? errorId : null]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <label className={cx("ui-field", "action-modal-field", invalid ? "is-invalid" : "", className)}>
      <span className="ui-field__label">{label}</span>
      {typeof children === "function" ? children({ id, invalid, describedBy }) : children}
      {help != null ? (
        <span id={helpId} className="ui-field__help">
          {help}
        </span>
      ) : null}
      {invalid ? (
        <span id={errorId} role="alert" className="ui-field__error action-modal-error">
          {error}
        </span>
      ) : null}
    </label>
  );
}
