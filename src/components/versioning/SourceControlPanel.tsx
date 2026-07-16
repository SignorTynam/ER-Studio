import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useI18n } from "../../i18n/useI18n";
import type {
  ProjectFileChange,
  ProjectUncommittedChangeState,
} from "../../features/versioning/useProjectVersioning";
import type { ProjectCommit } from "../../features/versioning/projectCommitSnapshot";
import { StudioIcon } from "../icons/StudioIcon";
import { PanelEmptyState, PanelIconButton, WorkspacePanel, WorkspacePanelHeader } from "../workspace/WorkspacePanel";

interface SourceControlPanelProps {
  projectName: string;
  commitMessage: string;
  changeState: ProjectUncommittedChangeState;
  commits: ProjectCommit[];
  headCommitId: string | null;
  selectedCommitId: string | null;
  onCommitMessageChange: (value: string) => void;
  onCommit: () => void;
  onRefresh: () => void;
  onSelectCommit: (commitId: string | null) => void;
  onCompareWithCurrent: (commitId: string) => void;
  onCompareWithHead: (commitId: string) => void;
  onCompareWithParent: (commitId: string) => void;
  onRestoreCommit: (commitId: string) => void;
  onDeleteCommit: (commitId: string) => void;
  onClose?: () => void;
  closeLabel?: string;
}

type PendingAction = { kind: "restore" | "delete"; commitId: string } | null;

type HistoryResizeState = {
  startY: number;
  startHeight: number;
};

const HISTORY_MIN_HEIGHT = 116;
const HISTORY_MIN_TOP_HEIGHT = 140;
const HISTORY_SPLITTER_HEIGHT = 8;

function clampHeight(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatCommitDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function shortCommitId(id: string | null | undefined) {
  return id ? id.slice(0, 8) : "-";
}

function getChangeStatusLabel(change: ProjectFileChange): string {
  switch (change.status) {
    case "added":
      return "A";
    case "deleted":
      return "D";
    case "renamed":
      return "R";
    case "modified":
    default:
      return "M";
  }
}

function getChangeIconName(change: ProjectFileChange) {
  if (change.kind === "schema") {
    return "entity";
  }
  if (change.kind === "sql") {
    return "database";
  }
  return "fileText";
}

export function SourceControlPanel({
  projectName,
  commitMessage,
  changeState,
  commits,
  headCommitId,
  selectedCommitId,
  onCommitMessageChange,
  onCommit,
  onRefresh,
  onSelectCommit,
  onCompareWithCurrent,
  onCompareWithHead,
  onCompareWithParent,
  onRestoreCommit,
  onDeleteCommit,
  onClose,
  closeLabel,
}: SourceControlPanelProps) {
  const { t } = useI18n();
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [historyHeight, setHistoryHeight] = useState<number | null>(null);
  const canCommit = changeState.summary.canCommit && commitMessage.trim().length > 0;
  const selectedCommit = commits.find((commit) => commit.id === selectedCommitId) ?? null;
  const panelRef = useRef<HTMLElement | null>(null);
  const historyRef = useRef<HTMLDivElement | null>(null);
  const historyResizeRef = useRef<HistoryResizeState | null>(null);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && canCommit) {
      event.preventDefault();
      onCommit();
    }
  }

  function handleConfirmPendingAction() {
    if (!pendingAction) {
      return;
    }

    if (pendingAction.kind === "restore") {
      onRestoreCommit(pendingAction.commitId);
    } else {
      onDeleteCommit(pendingAction.commitId);
    }
    setPendingAction(null);
  }

  function handleHistoryResizeStart(event: ReactPointerEvent<HTMLDivElement>) {
    if (!historyRef.current) {
      return;
    }

    event.preventDefault();
    const currentHeight = historyHeight ?? historyRef.current.getBoundingClientRect().height;
    historyResizeRef.current = {
      startY: event.clientY,
      startHeight: currentHeight,
    };
    document.body.classList.add("source-control-resizing");
  }

  function resizeHistoryBy(delta: number) {
    const panel = panelRef.current;
    const history = historyRef.current;
    if (!panel || !history) return;
    const panelHeight = panel.getBoundingClientRect().height;
    const maxHeight = Math.max(HISTORY_MIN_HEIGHT, panelHeight - HISTORY_MIN_TOP_HEIGHT - HISTORY_SPLITTER_HEIGHT);
    const currentHeight = historyHeight ?? history.getBoundingClientRect().height;
    setHistoryHeight(clampHeight(currentHeight + delta, HISTORY_MIN_HEIGHT, maxHeight));
  }

  useLayoutEffect(() => {
    if (historyHeight !== null || !historyRef.current) {
      return;
    }

    setHistoryHeight(historyRef.current.getBoundingClientRect().height);
  }, [historyHeight]);

  useEffect(() => {
    const panel = panelRef.current;

    if (!panel) {
      return;
    }

    if (historyHeight === null) {
      panel.style.removeProperty("--source-control-history-height");
      return;
    }

    panel.style.setProperty("--source-control-history-height", `${historyHeight}px`);

    return () => {
      panel.style.removeProperty("--source-control-history-height");
    };
  }, [historyHeight]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const resizeState = historyResizeRef.current;
      const panel = panelRef.current;

      if (!resizeState || !panel) {
        return;
      }

      const panelHeight = panel.getBoundingClientRect().height;
      const maxHeight = Math.max(HISTORY_MIN_HEIGHT, panelHeight - HISTORY_MIN_TOP_HEIGHT - HISTORY_SPLITTER_HEIGHT);
      const nextHeight = clampHeight(resizeState.startHeight + (resizeState.startY - event.clientY), HISTORY_MIN_HEIGHT, maxHeight);
      setHistoryHeight(nextHeight);
    }

    function stopResize() {
      if (!historyResizeRef.current) {
        return;
      }

      historyResizeRef.current = null;
      document.body.classList.remove("source-control-resizing");
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
      document.body.classList.remove("source-control-resizing");
    };
  }, []);

  return (
    <WorkspacePanel
      ref={panelRef}
      className="source-control-panel"
      label={t("sourceControl.title")}
    >
      <WorkspacePanelHeader
        className="source-control-header"
        title={t("sourceControl.title")}
        badge={changeState.hasChanges ? changeState.files.length : undefined}
        onClose={onClose}
        closeLabel={closeLabel ?? t("workspaceActivity.closePanel")}
      >
        <PanelIconButton
          icon="refresh"
          label={t("sourceControl.refresh")}
          className="source-control-icon-button"
          onClick={onRefresh}
        />
      </WorkspacePanelHeader>

      <div className="source-control-section">
        <div className="source-control-section-title">
          <StudioIcon name="arrowDown" aria-hidden="true" />
          <span>{t("sourceControl.repositories")}</span>
        </div>
        <div className="source-control-repository">
          <StudioIcon name="branch" aria-hidden="true" />
          <span className="source-control-repository-name">{projectName}</span>
        </div>
      </div>

      <div className="source-control-section source-control-changes">
        <div className="source-control-section-title">
          <StudioIcon name="arrowDown" aria-hidden="true" />
          <span>{t("sourceControl.changes")}</span>
          {changeState.hasChanges ? <span className="source-control-badge">{changeState.files.length}</span> : null}
        </div>
        <textarea
          className="source-control-commit-input"
          value={commitMessage}
          onChange={(event) => onCommitMessageChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("sourceControl.commitPlaceholder", { project: projectName })}
          rows={2}
        />
        <button type="button" className="source-control-commit-button" onClick={onCommit} disabled={!canCommit}>
          <StudioIcon name="done" aria-hidden="true" />
          <span>{commits.length === 0 ? t("sourceControl.createFirstCommit") : t("sourceControl.commit")}</span>
        </button>

        {changeState.hasChanges ? (
          <div className="source-control-change-list">
            {changeState.files.length === 0 ? (
              <div className="source-control-change-item">
                <StudioIcon name="openProject" aria-hidden="true" />
                <span>{projectName}</span>
                <small>M</small>
              </div>
            ) : (
              changeState.files.map((file) => (
                <div className={`source-control-change-item is-${file.status}`} key={`${file.status}-${file.fileId}`}>
                  <StudioIcon name={getChangeIconName(file)} aria-hidden="true" />
                  <span title={file.previousName ? `${file.previousName} -> ${file.name}` : file.name}>{file.name}</span>
                  <small>{getChangeStatusLabel(file)}</small>
                </div>
              ))
            )}
          </div>
        ) : (
          <PanelEmptyState className="source-control-empty source-control-empty--compact" icon="done" title={t("sourceControl.noChanges")} />
        )}
      </div>

      <div
        className="source-control-history-splitter"
        role="separator"
        aria-orientation="horizontal"
        aria-label={t("sourceControl.resizeHistory")}
        aria-valuemin={HISTORY_MIN_HEIGHT}
        aria-valuenow={Math.round(historyHeight ?? HISTORY_MIN_HEIGHT)}
        tabIndex={0}
        onPointerDown={handleHistoryResizeStart}
        onKeyDown={(event) => {
          if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
          event.preventDefault();
          const delta = (event.shiftKey ? 24 : 8) * (event.key === "ArrowUp" ? 1 : -1);
          resizeHistoryBy(delta);
        }}
      />

      <div ref={historyRef} className="source-control-section source-control-history">
        <div className="source-control-section-title source-control-history-header">
          {historyCollapsed ? (
            <button
              type="button"
              className="source-control-disclosure"
              onClick={() => setHistoryCollapsed((current) => !current)}
              aria-expanded="false"
              aria-label={t("sourceControl.expandHistory")}
            >
              <StudioIcon name="arrowRight" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              className="source-control-disclosure"
              onClick={() => setHistoryCollapsed((current) => !current)}
              aria-expanded="true"
              aria-label={t("sourceControl.collapseHistory")}
            >
              <StudioIcon name="arrowDown" aria-hidden="true" />
            </button>
          )}
          <span>{t("sourceControl.graph")}</span>
          <span className="source-control-count">{t("versioning.commitCount", { count: commits.length })}</span>
          <PanelIconButton
            icon="refresh"
            label={t("sourceControl.refresh")}
            className="source-control-icon-button"
            onClick={onRefresh}
          />
        </div>

        {!historyCollapsed ? (
          commits.length === 0 ? (
            <PanelEmptyState className="source-control-empty source-control-empty--compact" icon="branch" title={t("sourceControl.noCommits")} />
          ) : (
            <div className="source-control-history-scroll" data-testid="source-control-history-scroll">
              <ol className="source-control-history-list">
                {commits.map((commit) => {
                  const isHead = commit.id === headCommitId;
                  const selected = commit.id === selectedCommitId;
                  return (
                    <li key={commit.id}>
                      {selected ? (
                        <button
                          type="button"
                          className={`source-control-graph-row${isHead ? " is-head" : ""} is-selected`}
                          onClick={() => {
                            setPendingAction(null);
                            onSelectCommit(commit.id);
                          }}
                          aria-pressed="true"
                          aria-label={t("sourceControl.selectCommit", { id: shortCommitId(commit.id), message: commit.message })}
                        >
                          <span className="source-control-graph-rail" aria-hidden="true">
                            <span className="source-control-graph-line" />
                            <span className="source-control-graph-node" />
                          </span>
                          <span className="source-control-graph-main">
                            <span className="source-control-graph-title" title={commit.message}>{commit.message}</span>
                            <span className="source-control-graph-meta">
                              {shortCommitId(commit.id)}
                              {isHead ? <span className="source-control-branch-pill">HEAD</span> : null}
                              {isHead ? <span className="source-control-branch-pill">main</span> : null}
                            </span>
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={`source-control-graph-row${isHead ? " is-head" : ""}`}
                          onClick={() => {
                            setPendingAction(null);
                            onSelectCommit(commit.id);
                          }}
                          aria-pressed="false"
                          aria-label={t("sourceControl.selectCommit", { id: shortCommitId(commit.id), message: commit.message })}
                        >
                          <span className="source-control-graph-rail" aria-hidden="true">
                            <span className="source-control-graph-line" />
                            <span className="source-control-graph-node" />
                          </span>
                          <span className="source-control-graph-main">
                            <span className="source-control-graph-title" title={commit.message}>{commit.message}</span>
                            <span className="source-control-graph-meta">
                              {shortCommitId(commit.id)}
                              {isHead ? <span className="source-control-branch-pill">HEAD</span> : null}
                              {isHead ? <span className="source-control-branch-pill">main</span> : null}
                            </span>
                          </span>
                        </button>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          )
        ) : null}

        {selectedCommit ? (
          <div className="source-control-commit-details" data-testid="source-control-commit-details">
            <div className="source-control-commit-details__header">
              <strong title={selectedCommit.message}>{selectedCommit.message}</strong>
              <button
                type="button"
                className="project-activity-header-close source-control-commit-details__close"
                onClick={() => {
                  setPendingAction(null);
                  onSelectCommit(null);
                }}
                aria-label={t("sourceControl.closeDetails")}
              >
                <StudioIcon name="close" aria-hidden="true" />
              </button>
            </div>
            <dl>
              <div><dt>{t("sourceControl.details.id")}</dt><dd>{shortCommitId(selectedCommit.id)}</dd></div>
              <div><dt>{t("sourceControl.details.parent")}</dt><dd>{shortCommitId(selectedCommit.parentId)}</dd></div>
              <div><dt>{t("sourceControl.details.date")}</dt><dd>{formatCommitDate(selectedCommit.createdAt)}</dd></div>
              <div><dt>{t("sourceControl.details.stats")}</dt><dd>{t("sourceControl.details.statsValue", { entities: selectedCommit.stats.entityCount, tables: selectedCommit.stats.tableCount ?? 0 })}</dd></div>
            </dl>
            <div className="source-control-commit-actions">
              <button type="button" className="source-control-action-button" onClick={() => onCompareWithCurrent(selectedCommit.id)}>
                {t("sourceControl.compareCurrent")}
              </button>
              <button type="button" className="source-control-action-button" onClick={() => onCompareWithHead(selectedCommit.id)} disabled={!headCommitId || selectedCommit.id === headCommitId}>
                {t("sourceControl.compareHead")}
              </button>
              <button type="button" className="source-control-action-button" onClick={() => onCompareWithParent(selectedCommit.id)} disabled={!selectedCommit.parentId}>
                {t("sourceControl.comparePrevious")}
              </button>
              <button type="button" className="source-control-action-button" onClick={() => setPendingAction({ kind: "restore", commitId: selectedCommit.id })}>
                {t("sourceControl.restore")}
              </button>
              <button type="button" className="source-control-action-button is-danger" onClick={() => setPendingAction({ kind: "delete", commitId: selectedCommit.id })}>
                {t("sourceControl.deleteCommit")}
              </button>
            </div>
            {pendingAction?.commitId === selectedCommit.id ? (
              <div className="source-control-inline-confirm" role="alert">
                <span>
                  {pendingAction.kind === "restore"
                    ? t("sourceControl.confirmRestore")
                    : t("sourceControl.confirmDelete")}
                </span>
                <button type="button" className="source-control-action-button" onClick={() => setPendingAction(null)}>
                  {t("sourceControl.cancel")}
                </button>
                <button type="button" className="source-control-action-button is-danger" onClick={handleConfirmPendingAction}>
                  {pendingAction.kind === "restore" ? t("sourceControl.restore") : t("sourceControl.deleteCommit")}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </WorkspacePanel>
  );
}
