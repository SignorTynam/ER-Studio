import { forwardRef, type ReactNode } from "react";
import { StudioIcon, type StudioIconName } from "../icons/StudioIcon";

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
  children?: ReactNode;
  className?: string;
}

export function WorkspacePanelHeader({ title, subtitle, badge, children, className = "" }: WorkspacePanelHeaderProps) {
  return (
    <header className={["workspace-panel__header", className].filter(Boolean).join(" ")}>
      <div className="workspace-panel__header-copy">
        <h2>{title}</h2>
        {typeof badge === "number" ? <span className="workspace-panel__badge">{badge}</span> : null}
        {subtitle ? <span>{subtitle}</span> : null}
      </div>
      <div className="workspace-panel__header-actions">{children}</div>
    </header>
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
