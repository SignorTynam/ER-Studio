import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { StudioIcon, type StudioIconName } from "../icons/StudioIcon";
import { Tooltip, type TooltipPosition } from "../ui/Tooltip";

interface WorkspacePanelProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export const WorkspacePanel = forwardRef<HTMLElement, WorkspacePanelProps>(function WorkspacePanel(
  { label, children, className = "" },
  ref,
) {
  return (
    <section ref={ref} className={["workspace-panel", className].filter(Boolean).join(" ")} aria-label={label}>
      {children}
    </section>
  );
});

interface WorkspacePanelHeaderProps {
  title: string;
  subtitle?: string;
  badge?: number;
  badgeLabel?: string;
  icon?: StudioIconName;
  onClose?: () => void;
  closeLabel?: string;
  children?: ReactNode;
  className?: string;
}

export function WorkspacePanelHeader({
  title,
  subtitle,
  badge,
  badgeLabel,
  icon,
  onClose,
  closeLabel = "Close panel",
  children,
  className = "",
}: WorkspacePanelHeaderProps) {
  return (
    <header className={["workspace-panel__header", className].filter(Boolean).join(" ")}>
      <div className="workspace-panel__header-copy">
        {icon ? <StudioIcon name={icon} aria-hidden="true" /> : null}
        <h2>{title}</h2>
        {typeof badge === "number" ? <span className="workspace-panel__badge" aria-label={badgeLabel}>{badge}</span> : null}
        {subtitle ? <span>{subtitle}</span> : null}
      </div>
      <WorkspacePanelHeaderActions>
        {children}
        {onClose ? (
          <PanelIconButton
            icon="close"
            label={closeLabel}
            className="workspace-panel__close"
            onClick={onClose}
          />
        ) : null}
      </WorkspacePanelHeaderActions>
    </header>
  );
}

export function WorkspacePanelHeaderActions({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <div className={["workspace-panel__header-actions", className].filter(Boolean).join(" ")}>{children}</div>;
}

interface PanelIconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: StudioIconName;
  label: string;
  active?: boolean;
  /** Posizione del tooltip (Fase C2: sostituisce i `title` nativi). */
  tooltipPosition?: TooltipPosition;
}

export const PanelIconButton = forwardRef<HTMLButtonElement, PanelIconButtonProps>(function PanelIconButton(
  { icon, label, active = false, className = "", title, type = "button", tooltipPosition = "bottom", ...props },
  ref,
) {
  return (
    <Tooltip position={tooltipPosition} label={title ?? label}>
      <button
        ref={ref}
        type={type}
        className={["panel-icon-button", active ? "active" : "", className].filter(Boolean).join(" ")}
        aria-label={label}
        {...props}
      >
        <StudioIcon name={icon} aria-hidden="true" />
      </button>
    </Tooltip>
  );
});

export function PanelMenu({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={["panel-menu", className].filter(Boolean).join(" ")} role="menu" {...props} />;
}

interface PanelMenuItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon?: StudioIconName;
  label: string;
  danger?: boolean;
}

export function PanelMenuItem({ icon, label, danger = false, className = "", type = "button", ...props }: PanelMenuItemProps) {
  return (
    <button
      type={type}
      className={["panel-menu__item", danger ? "panel-menu__item--danger" : "", className].filter(Boolean).join(" ")}
      role="menuitem"
      {...props}
    >
      {icon ? <StudioIcon name={icon} aria-hidden="true" /> : null}
      <span>{label}</span>
    </button>
  );
}

interface PanelEmptyStateProps {
  icon: StudioIconName;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

export function PanelEmptyState({ icon, title, description, children, className = "" }: PanelEmptyStateProps) {
  return (
    <div className={["workspace-panel__empty", className].filter(Boolean).join(" ")}>
      <StudioIcon name={icon} aria-hidden="true" />
      <strong>{title}</strong>
      {description ? <span>{description}</span> : null}
      {children}
    </div>
  );
}
