import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cx } from "./cx";

export type TooltipPosition = "top" | "bottom";

export interface TooltipProps {
  label: ReactNode;
  position?: TooltipPosition;
  /** Ritardo in ms prima della comparsa (hover e focus). */
  delay?: number;
  className?: string;
  /**
   * Elemento ancorato. Con la forma funzione riceve l'`aria-describedby`
   * da riportare sul controllo focalizzabile per l'annuncio da screen reader.
   */
  children: ReactNode | ((aria: { "aria-describedby": string }) => ReactNode);
}

/**
 * Tooltip accessibile: compare su hover E focus da tastiera, si nasconde con
 * Esc, ha ritardo configurabile e transizione disattivata con
 * `prefers-reduced-motion` (via CSS). Il nodo tooltip resta nel DOM
 * (`data-visible`) così l'`aria-describedby` è sempre risolvibile.
 */
export function Tooltip({ label, position = "top", delay = 350, className, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | null>(null);
  const id = useId();

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function show() {
    clearTimer();
    timerRef.current = window.setTimeout(() => setVisible(true), delay);
  }

  function hide() {
    clearTimer();
    setVisible(false);
  }

  useEffect(() => clearTimer, []);

  return (
    <span
      className={cx("ui-tooltip-anchor", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={(event) => {
        if (event.key === "Escape") hide();
      }}
    >
      {typeof children === "function" ? children({ "aria-describedby": id }) : children}
      <span role="tooltip" id={id} data-visible={visible} className={cx("ui-tooltip", `ui-tooltip--${position}`)}>
        {label}
      </span>
    </span>
  );
}
