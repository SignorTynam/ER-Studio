import type { ReactNode } from "react";
import { cx } from "./cx";

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface BadgeProps {
  /** Tono semantico allineato ai token (`danger` = `--color-danger`). */
  tone?: BadgeTone;
  title?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Badge/pill compatto per contatori, stati ed etichette.
 * Toni: neutro + info/success/warning/danger dai token semantici.
 * Testo in maiuscoletto; per soli numeri usare anche `title`/`aria-label`
 * sul contenitore che ne spiega il significato.
 */
export function Badge({ tone = "neutral", title, className, children }: BadgeProps) {
  return (
    <span className={cx("ui-badge", `ui-badge--${tone}`, className)} title={title}>
      {children}
    </span>
  );
}
