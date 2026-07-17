import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useI18n } from "../../i18n/useI18n";
import type { ProjectFileChange, ProjectUncommittedChangeState } from "../../features/versioning/useProjectVersioning";
import type { ProjectCommit } from "../../features/versioning/projectCommitSnapshot";
import { StudioIcon, type StudioIconName } from "../icons/StudioIcon";
import { PanelEmptyState, PanelIconButton, WorkspacePanel, WorkspacePanelHeader } from "../workspace/WorkspacePanel";
import {
  SOURCE_CONTROL_CHANGES_EXPANDED_KEY,
  SOURCE_CONTROL_HISTORY_EXPANDED_KEY,
  formatSourceControlDate,
  getChangedCategoryKeys,
  getCommitStats,
  getSourceControlChangeCode,
  readSourceControlDisclosure,
  shortCommitId,
  sortSourceControlChanges,
  writeSourceControlDisclosure,
} from "./sourceControlPresentation";

interface SourceControlPanelProps {
  projectName: string;
  projectFilePaths: Record<string, string>;
  workingFileIds: readonly string[];
  commitMessage: string;
  commitBusy?: boolean;
  changeState: ProjectUncommittedChangeState;
  commits: ProjectCommit[];
  headCommitId: string | null;
  selectedCommitId: string | null;
  onCommitMessageChange: (value: string) => void;
  onCommit: () => void;
  onRefresh: () => void;
  onReviewAllChanges: () => void;
  onReviewFile: (change: ProjectFileChange) => void;
  onOpenFile: (fileId: string) => void;
  onSelectCommit: (commitId: string | null) => void;
  onCompareWithCurrent: (commitId: string) => void;
  onCompareWithHead: (commitId: string) => void;
  onCompareWithParent: (commitId: string) => void;
  onRestoreCommit: (commitId: string) => void;
  onDeleteCommit: (commitId: string) => void;
  onClose?: () => void;
  closeLabel?: string;
}

function getChangeIconName(change: ProjectFileChange): StudioIconName {
  if (change.kind === "schema") return "entity";
  if (change.kind === "sql") return "database";
  return "fileText";
}

function DisclosureHeader({
  expanded,
  title,
  count,
  onToggle,
  expandLabel,
  collapseLabel,
}: {
  expanded: boolean;
  title: string;
  count?: number;
  onToggle: () => void;
  expandLabel: string;
  collapseLabel: string;
}) {
  return (
    <button
      type="button"
      className="source-control-disclosure"
      aria-expanded={expanded}
      aria-label={expanded ? collapseLabel : expandLabel}
      onClick={onToggle}
    >
      <StudioIcon name={expanded ? "arrowDown" : "arrowRight"} aria-hidden="true" />
      <span>{title}</span>
      {typeof count === "number" ? <small>{count}</small> : null}
    </button>
  );
}

export function SourceControlPanel(props: SourceControlPanelProps) {
  const { t, locale } = useI18n();
  const [changesExpanded, setChangesExpanded] = useState(() => readSourceControlDisclosure(SOURCE_CONTROL_CHANGES_EXPANDED_KEY, true));
  const [historyExpanded, setHistoryExpanded] = useState(() => readSourceControlDisclosure(SOURCE_CONTROL_HISTORY_EXPANDED_KEY, false));
  const sortedChanges = useMemo(() => sortSourceControlChanges(props.changeState.files), [props.changeState.files]);
  const selectedCommit = props.commits.find((commit) => commit.id === props.selectedCommitId) ?? null;
  const workingFileIds = useMemo(() => new Set(props.workingFileIds), [props.workingFileIds]);
  const canCommit = props.changeState.summary.canCommit && props.commitMessage.trim().length > 0 && !props.commitBusy;
  const changedCategories = getChangedCategoryKeys(props.changeState.categories);

  useEffect(() => writeSourceControlDisclosure(SOURCE_CONTROL_CHANGES_EXPANDED_KEY, changesExpanded), [changesExpanded]);
  useEffect(() => writeSourceControlDisclosure(SOURCE_CONTROL_HISTORY_EXPANDED_KEY, historyExpanded), [historyExpanded]);
  useEffect(() => {
    if (selectedCommit) setHistoryExpanded(true);
  }, [selectedCommit]);

  function handleCommitKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && canCommit) {
      event.preventDefault();
      props.onCommit();
    }
  }

  return (
    <WorkspacePanel className="source-control-panel project-activity-section" label={t("sourceControl.title")}>
      <WorkspacePanelHeader
        title={t("sourceControl.title")}
        badge={props.changeState.hasChanges ? Math.max(sortedChanges.length, 1) : undefined}
        onClose={() => {
          props.onSelectCommit(null);
          props.onClose?.();
        }}
        closeLabel={props.closeLabel ?? t("workspaceActivity.closePanel")}
      >
        <PanelIconButton icon="refresh" label={t("sourceControl.refresh")} onClick={props.onRefresh} />
      </WorkspacePanelHeader>

      <div className="source-control-repository-summary">
        <StudioIcon name="history" aria-hidden="true" />
        <span>
          <strong>{props.projectName}</strong>
          <small>{props.headCommitId ? t("sourceControl.localHead", { id: shortCommitId(props.headCommitId) }) : t("sourceControl.noLocalSnapshots")}</small>
        </span>
      </div>

      <div className="source-control-commit-composer">
        <textarea
          className="source-control-commit-input"
          value={props.commitMessage}
          onChange={(event) => props.onCommitMessageChange(event.target.value)}
          onKeyDown={handleCommitKeyDown}
          placeholder={t("sourceControl.commitPlaceholder", { project: props.projectName })}
          rows={2}
        />
        <button type="button" className="source-control-primary-button" onClick={props.onCommit} disabled={!canCommit}>
          <StudioIcon name="done" aria-hidden="true" />
          <span>{props.commits.length === 0 ? t("sourceControl.createFirstCommit") : t("sourceControl.commit")}</span>
        </button>
      </div>

      <section className="source-control-section source-control-changes" aria-label={t("sourceControl.changes")}>
        <DisclosureHeader
          expanded={changesExpanded}
          title={t("sourceControl.changes")}
          count={props.changeState.hasChanges ? Math.max(sortedChanges.length, 1) : 0}
          onToggle={() => setChangesExpanded((value) => !value)}
          expandLabel={t("sourceControl.expandChanges")}
          collapseLabel={t("sourceControl.collapseChanges")}
        />
        {changesExpanded ? (
          <div className="source-control-section__body">
            {props.changeState.hasChanges ? (
              <>
                <button type="button" className="source-control-review-all" onClick={props.onReviewAllChanges}>
                  <StudioIcon name="split" aria-hidden="true" />
                  <span>{t("sourceControl.reviewAllChanges")}</span>
                </button>
                {sortedChanges.length > 0 ? (
                  <ul className="source-control-change-list">
                    {sortedChanges.map((change) => {
                      const path = props.projectFilePaths[change.fileId] ?? change.name;
                      const canOpen = change.status !== "deleted" && workingFileIds.has(change.fileId);
                      return (
                        <li className={`source-control-change-row is-${change.status}`} key={`${change.status}-${change.fileId}`}>
                          <button type="button" className="source-control-change-main" onClick={() => props.onReviewFile(change)} title={path}>
                            <StudioIcon name={getChangeIconName(change)} aria-hidden="true" />
                            <span>
                              <strong>{change.name}</strong>
                              <small>{change.previousName ? `${change.previousName} → ${path}` : path}</small>
                            </span>
                            <b aria-label={t(`sourceControl.${change.status}`)}>{getSourceControlChangeCode(change.status)}</b>
                          </button>
                          {canOpen ? (
                            <PanelIconButton icon="show" label={t("sourceControl.openFile", { name: change.name })} onClick={() => props.onOpenFile(change.fileId)} />
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="source-control-project-change">
                    <StudioIcon name="openProject" aria-hidden="true" />
                    <span>
                      <strong>{t("sourceControl.projectChanges")}</strong>
                      <small>{changedCategories.map((key) => t(`sourceControl.categories.${key}`)).join(", ")}</small>
                    </span>
                    <b>M</b>
                  </div>
                )}
              </>
            ) : (
              <PanelEmptyState className="source-control-empty" icon="done" title={t("sourceControl.noChanges")} />
            )}
          </div>
        ) : null}
      </section>

      <section className={historyExpanded ? "source-control-section source-control-history is-expanded" : "source-control-section source-control-history"} aria-label={t("sourceControl.history")}>
        <DisclosureHeader
          expanded={historyExpanded}
          title={t("sourceControl.history")}
          count={props.commits.length}
          onToggle={() => {
            if (historyExpanded && selectedCommit) props.onSelectCommit(null);
            setHistoryExpanded((value) => !value);
          }}
          expandLabel={t("sourceControl.expandHistory")}
          collapseLabel={t("sourceControl.collapseHistory")}
        />
        {historyExpanded ? (
          <div className="source-control-history__body">
            {selectedCommit ? (
              <div className="source-control-commit-details" data-testid="source-control-commit-details">
                <button type="button" className="source-control-back-button" onClick={() => props.onSelectCommit(null)}>
                  <StudioIcon name="arrowLeft" aria-hidden="true" />
                  <span>{t("sourceControl.backToHistory")}</span>
                </button>
                <h3>{selectedCommit.message}</h3>
                {selectedCommit.description ? <p>{selectedCommit.description}</p> : null}
                <dl>
                  <div><dt>{t("sourceControl.details.id")}</dt><dd>{shortCommitId(selectedCommit.id)}</dd></div>
                  <div><dt>{t("sourceControl.details.parent")}</dt><dd>{shortCommitId(selectedCommit.parentId)}</dd></div>
                  <div><dt>{t("sourceControl.details.date")}</dt><dd>{formatSourceControlDate(selectedCommit.createdAt, locale)}</dd></div>
                  {selectedCommit.author ? <div><dt>{t("sourceControl.details.author")}</dt><dd>{selectedCommit.author}</dd></div> : null}
                  <div><dt>{t("sourceControl.details.kind")}</dt><dd>{selectedCommit.automatic ? t("sourceControl.automatic") : t("sourceControl.manual")}</dd></div>
                </dl>
                <div className="source-control-stats">
                  {getCommitStats(selectedCommit).map((stat) => (
                    <span key={stat.key}><b>{stat.value}</b>{t(`sourceControl.stats.${stat.key}`)}</span>
                  ))}
                </div>
                {selectedCommit.tags?.length ? (
                  <div className="source-control-tags">{selectedCommit.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                ) : null}
                <div className="source-control-commit-actions">
                  <button type="button" onClick={() => props.onCompareWithCurrent(selectedCommit.id)}>{t("sourceControl.compareCurrent")}</button>
                  <button type="button" onClick={() => props.onCompareWithHead(selectedCommit.id)} disabled={!props.headCommitId || selectedCommit.id === props.headCommitId}>{t("sourceControl.compareHead")}</button>
                  <button type="button" onClick={() => props.onCompareWithParent(selectedCommit.id)} disabled={!selectedCommit.parentId}>{t("sourceControl.comparePrevious")}</button>
                  <button type="button" onClick={() => props.onRestoreCommit(selectedCommit.id)}>{t("sourceControl.restore")}</button>
                  <button type="button" className="is-danger" onClick={() => props.onDeleteCommit(selectedCommit.id)}>{t("sourceControl.deleteCommit")}</button>
                </div>
              </div>
            ) : props.commits.length === 0 ? (
              <PanelEmptyState className="source-control-empty" icon="history" title={t("sourceControl.noCommits")} />
            ) : (
              <ol className="source-control-history-list" data-testid="source-control-history-scroll">
                {props.commits.map((commit) => {
                  const isHead = commit.id === props.headCommitId;
                  return (
                    <li key={commit.id}>
                      <button type="button" className={isHead ? "source-control-history-row is-head" : "source-control-history-row"} onClick={() => props.onSelectCommit(commit.id)}>
                        <span className="source-control-timeline" aria-hidden="true"><i /><b /></span>
                        <span>
                          <strong>{commit.message}</strong>
                          <small>{shortCommitId(commit.id)} · {formatSourceControlDate(commit.createdAt, locale, true)}</small>
                        </span>
                        {isHead ? <em>HEAD</em> : null}
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        ) : null}
      </section>
    </WorkspacePanel>
  );
}
