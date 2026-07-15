import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { StudioIcon, type StudioIconName } from "../icons/StudioIcon";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "sm";

/**
 * Fase B: la resa visiva delle varianti primary/secondary/danger viaggia
 * sulle classi legacy già usate dalle stesse superfici (parità di resa).
 * La Fase C stilerà `.ui-button--*` con i token e sgancerà queste skin.
 */
const LEGACY_SKIN: Record<ButtonVariant, string> = {
  primary: "mode-button active",
  secondary: "header-button",
  danger: "header-button",
  ghost: "",
};

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Variante visiva; default `secondary`. */
  variant?: ButtonVariant;
  /** Dimensione; in Fase B ha effetto solo sulla variante `ghost`. */
  size?: ButtonSize;
  /** Stato di attesa: disabilita il bottone e mostra uno spinner (`aria-busy`). */
  loading?: boolean;
  iconLeft?: StudioIconName;
  iconRight?: StudioIconName;
  children?: ReactNode;
}

/**
 * Bottone testuale condiviso.
 *
 * - varianti: `primary | secondary | ghost | danger`
 * - stati: `disabled`, `loading` (spinner + `aria-busy`, input bloccato)
 * - icone opzionali a sinistra/destra dal set `StudioIcon`
 *
 * Accessibilità: `type="button"` di default (mai submit implicito);
 * lo stato loading mantiene il testo visibile per gli screen reader.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    loading = false,
    iconLeft,
    iconRight,
    className,
    disabled,
    type = "button",
    children,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        "ui-button",
        `ui-button--${variant}`,
        `ui-button--${size}`,
        loading ? "is-loading" : "",
        LEGACY_SKIN[variant],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span className="ui-button__spinner" aria-hidden="true" />
      ) : iconLeft ? (
        <StudioIcon name={iconLeft} size={16} aria-hidden="true" />
      ) : null}
      {children}
      {!loading && iconRight ? <StudioIcon name={iconRight} size={16} aria-hidden="true" /> : null}
    </button>
  );
});
