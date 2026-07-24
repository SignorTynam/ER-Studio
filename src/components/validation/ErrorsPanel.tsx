import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useI18n } from "../../i18n/useI18n";
import {
  sortValidationIssuePresentations,
  type ValidationIssueAction,
  type ValidationIssuePresentation,
} from "../../utils/validationIssuePresentation";
import { StudioIcon } from "../icons/StudioIcon";
import { PanelEmptyState, PanelIconButton, WorkspacePanel, WorkspacePanelHeader } from "../workspace/WorkspacePanel";

type IssueFilter = "all" | "error" | "warning";

interface ErrorsPanelProps {
  issues: readonly ValidationIssuePresentation[];
  showIndicators: boolean;
  onToggleIndicators: () => void;
  onSelectIssue: (issueId: string) => void;
  /** Fase H: esegue l'azione di correzione guidata offerta dalla riga (auto-fix o navigazione). */
  onIssueAction: (issue: ValidationIssuePresentation, action: ValidationIssueAction) => void;
  onClose?: () => void;
  closeLabel?: string;
}

export function ErrorsPanel({
  issues,
  showIndicators,
  onToggleIndicators,
  onSelectIssue,
  onIssueAction,
  onClose,
  closeLabel,
}: ErrorsPanelProps) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<IssueFilter>("all");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const sortedIssues = useMemo(() => sortValidationIssuePresentations(issues), [issues]);
  const errorCount = sortedIssues.filter((issue) => issue.level === "error").length;
  const warningCount = sortedIssues.length - errorCount;
  const filteredIssues = filter === "all" ? sortedIssues : sortedIssues.filter((issue) => issue.level === filter);

  useEffect(() => {
    if (selectedIssueId && !sortedIssues.some((issue) => issue.id === selectedIssueId)) {
      setSelectedIssueId(null);
    }
  }, [selectedIssueId, sortedIssues]);

  function selectIssue(issue: ValidationIssuePresentation) {
    setSelectedIssueId(issue.id);
    onSelectIssue(issue.id);
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLDivElement>, index: number) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectIssue(filteredIssues[index]);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? filteredIssues.length - 1
        : (index + (event.key === "ArrowDown" ? 1 : -1) + filteredIssues.length) % filteredIssues.length;
    rowRefs.current.get(filteredIssues[nextIndex].id)?.focus();
  }

  const filters: Array<{ id: IssueFilter; label: string; count: number }> = [
    { id: "all", label: t("errors.panel.filters.all"), count: sortedIssues.length },
    { id: "error", label: t("common.status.error"), count: errorCount },
    { id: "warning", label: t("common.status.warning"), count: warningCount },
  ];

  return (
    <WorkspacePanel className="errors-panel project-activity-section" label={t("workspaceActivity.errors.title")}>
      <WorkspacePanelHeader
        title={t("workspaceActivity.errors.title")}
        badge={sortedIssues.length > 0 ? sortedIssues.length : undefined}
        badgeLabel={t("errors.issueCount", { count: sortedIssues.length })}
        onClose={onClose}
        closeLabel={closeLabel ?? t("workspaceActivity.closePanel")}
      >
        <PanelIconButton
          icon={showIndicators ? "viewOn" : "viewOff"}
          label={showIndicators ? t("errors.diagnostics.hide") : t("errors.diagnostics.show")}
          active={showIndicators}
          aria-pressed={showIndicators}
          onClick={onToggleIndicators}
        />
      </WorkspacePanelHeader>

      <div className="errors-panel__filters" role="tablist" aria-label={t("errors.panel.filters.label")}>
        {filters.map((item) => (
          <button
            type="button"
            role="tab"
            key={item.id}
            className={filter === item.id ? "errors-panel__filter is-active" : "errors-panel__filter"}
            aria-selected={filter === item.id}
            onClick={() => setFilter(item.id)}
          >
            <span>{item.label}</span><small>{item.count}</small>
          </button>
        ))}
      </div>

      {!showIndicators && sortedIssues.length > 0 ? (
        <p className="errors-panel__note">{t("errors.diagnostics.hiddenNote")}</p>
      ) : null}

      {filteredIssues.length === 0 ? (
        <PanelEmptyState
          className="errors-panel__empty"
          variant="card"
          tone={filter === "all" ? "success" : "neutral"}
          icon={filter === "all" ? "success" : "info"}
          title={filter === "all" ? t("errors.panel.validTitle") : t("errors.panel.emptyFilterTitle")}
          description={filter === "all"
            ? t("errors.panel.validDescription")
            : t("errors.panel.emptyFilterDescription")}
          role="status"
        />
      ) : (
        <div className="errors-panel__list" role="listbox" aria-label={t("errors.panel.listLabel")}>
          {filteredIssues.map((issue, index) => (
            <div
              role="option"
              key={issue.id}
              ref={(element) => {
                if (element) rowRefs.current.set(issue.id, element);
                else rowRefs.current.delete(issue.id);
              }}
              className={[
                "errors-panel__row",
                `level-${issue.level}`,
                selectedIssueId === issue.id ? "is-selected" : "",
              ].filter(Boolean).join(" ")}
              aria-selected={selectedIssueId === issue.id}
              tabIndex={index === 0 || selectedIssueId === issue.id ? 0 : -1}
              onClick={() => selectIssue(issue)}
              onKeyDown={(event) => handleRowKeyDown(event, index)}
            >
              <StudioIcon name={issue.level === "error" ? "error" : "warning"} aria-hidden="true" />
              <span className="errors-panel__row-copy">
                <span className="errors-panel__row-heading">
                  <strong>{issue.title}</strong>
                  <small>{issue.targetKind}</small>
                </span>
                <span className="errors-panel__row-message">{issue.message}</span>
              </span>
              {issue.actions.length > 0 ? (
                <span className="errors-panel__row-actions">
                  {issue.actions.map((action) => (
                    <PanelIconButton
                      key={action.id}
                      className="errors-panel__row-action"
                      icon={action.icon ?? "info"}
                      label={action.label}
                      tooltipPosition="top"
                      onClick={(event) => {
                        event.stopPropagation();
                        onIssueAction(issue, action);
                      }}
                    />
                  ))}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </WorkspacePanel>
  );
}
