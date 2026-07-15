import type { ReactNode } from "react";
import { WorkspacePanelHeader } from "../workspace/WorkspacePanel";

interface ProjectActivityPanelHeaderProps {
  title: string;
  subtitle?: string;
  closeLabel: string;
  onClose: () => void;
  children?: ReactNode;
}

export function ProjectActivityPanelHeader({
  title,
  subtitle,
  closeLabel,
  onClose,
  children,
}: ProjectActivityPanelHeaderProps) {
  return (
    <WorkspacePanelHeader
      className="project-activity-section__header"
      title={title}
      subtitle={subtitle}
      closeLabel={closeLabel}
      onClose={onClose}
    >
      {children}
    </WorkspacePanelHeader>
  );
}
