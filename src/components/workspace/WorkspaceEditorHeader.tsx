import type { ProjectWorkspaceFile } from "../../types/projectExplorer";
import type { WorkspaceView } from "../../types/translation";
import { useI18n } from "../../i18n/useI18n";
import { StudioIcon } from "../icons/StudioIcon";

interface WorkspaceEditorHeaderProps {
  projectName: string;
  file: ProjectWorkspaceFile;
  path: string;
  view: WorkspaceView;
  onReveal: () => void;
  onViewChange: (view: WorkspaceView) => void;
}

export function WorkspaceEditorHeader({
  projectName,
  file,
  path,
  view,
  onReveal,
  onViewChange,
}: WorkspaceEditorHeaderProps) {
  const { t } = useI18n();
  const pathSegments = path.split("/").filter(Boolean);
  const typeLabel = file.kind === "schema"
    ? t("workspaceChrome.fileTypes.schema")
    : file.kind === "sql"
      ? t("workspaceChrome.fileTypes.sql")
      : t("workspaceChrome.fileTypes.text");

  return (
    <div className="editor-context-bar">
      <nav className="editor-breadcrumb" aria-label={t("workspaceChrome.breadcrumbAria")} title={`${projectName} / ${path}`}>
        <span className="editor-breadcrumb__segment">{projectName}</span>
        {pathSegments.map((segment, index) => (
          <span key={`${segment}-${index}`} className="editor-breadcrumb__segment">
            <span className="editor-breadcrumb__separator" aria-hidden="true">/</span>
            {segment}
          </span>
        ))}
        <span className="editor-breadcrumb__type">{typeLabel}</span>
      </nav>

      <div className="editor-context-actions">
        {file.kind === "schema" ? (
          <div className="editor-view-switcher" role="group" aria-label={t("workspaceChrome.viewSwitcherAria")}>
            {([
              ["er", t("workspaceChrome.views.conceptual")],
              ["translation", t("workspaceChrome.views.translation")],
              ["logical", t("workspaceChrome.views.logical")],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={view === value}
                onClick={() => onViewChange(value)}
                title={label}
              >
                <span>{label}</span>
              </button>
            ))}
          </div>
        ) : null}
        <button type="button" className="editor-context-button" onClick={onReveal} title={t("workspaceChrome.revealInExplorer")}>
          <StudioIcon name="panelLeft" size={15} aria-hidden="true" />
          <span>{t("workspaceChrome.reveal")}</span>
        </button>
      </div>
    </div>
  );
}

