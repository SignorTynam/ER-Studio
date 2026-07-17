import type { ReactNode } from "react";
import { WorkspacePanelHeader } from "../workspace/WorkspacePanel";

interface ProjectActivityPanelHeaderProps {
  title: string;
  /** Fase C2: gli header di pannello sono a una riga; il sottotitolo non viene più mostrato. */
  subtitle?: string;
  closeLabel: string;
  onClose: () => void;
  badge?: number;
  badgeLabel?: string;
  children?: ReactNode;
}

export function ProjectActivityPanelHeader({
  title,
  closeLabel,
  onClose,
  badge,
  badgeLabel,
  children,
}: ProjectActivityPanelHeaderProps) {
  return (
    <WorkspacePanelHeader
      className="project-activity-section__header"
      title={title}
      badge={badge}
      badgeLabel={badgeLabel}
      closeLabel={closeLabel}
      onClose={onClose}
    >
      {children}
    </WorkspacePanelHeader>
  );
}
