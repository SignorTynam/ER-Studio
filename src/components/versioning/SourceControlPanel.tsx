import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { useI18n } from "../../i18n/useI18n";
import type { ProjectFileChange, ProjectUncommittedChangeState } from "../../features/versioning/useProjectVersioning";
import type {
  ProjectCommit,
  ProjectCommitTag,
  ProjectVersioningSettings,
  ProjectVersioningState,
} from "../../features/versioning/projectCommitSnapshot";
import {
  MAX_PROJECT_VERSIONING_MAX_COMMITS,
  MIN_PROJECT_VERSIONING_MAX_COMMITS,
  PROJECT_COMMIT_TAG_DESCRIPTION_MAX_LENGTH,
  PROJECT_COMMIT_TAG_NAME_MAX_LENGTH,
  normalizeProjectVersioningSettings,
  previewProjectVersioningRetention,
  type CreateProjectCommitTagResult,
  type DeleteProjectCommitTagResult,
  type ProjectCommitTagInput,
  type ProjectVersioningRetentionSummary,
  type UpdateProjectCommitTagResult,
  type UpdateProjectVersioningSettingsResult,
} from "../../features/versioning/projectVersioningMetadata";
import { StudioIcon, type StudioIconName } from "../icons/StudioIcon";
import { Modal } from "../ui/Modal";
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
  versioning: ProjectVersioningState;
  commits: ProjectCommit[];
  totalCommitCount: number;
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
  onCreateTag: (commitId: string, input: ProjectCommitTagInput) => CreateProjectCommitTagResult;
  onUpdateTag: (tagId: string, input: ProjectCommitTagInput) => UpdateProjectCommitTagResult;
  onDeleteTag: (tagId: string) => DeleteProjectCommitTagResult;
  onUpdateSettings: (patch: Partial<ProjectVersioningSettings>) => UpdateProjectVersioningSettingsResult;
  onClose?: () => void;
  closeLabel?: string;
}

interface TagDialogState {
  mode: "create" | "edit";
  tag?: ProjectCommitTag;
}

interface PendingRetentionAction {
  summary: ProjectVersioningRetentionSummary;
  apply: () => void;
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
  const [tagDialog, setTagDialog] = useState<TagDialogState | null>(null);
  const [tagName, setTagName] = useState("");
  const [tagDescription, setTagDescription] = useState("");
  const [tagError, setTagError] = useState("");
  const settings = normalizeProjectVersioningSettings(props.versioning.settings);
  const [maxCommitsDraft, setMaxCommitsDraft] = useState(String(settings.maxCommits));
  const [settingsError, setSettingsError] = useState("");
  const [pendingRetentionAction, setPendingRetentionAction] = useState<PendingRetentionAction | null>(null);
  const sortedChanges = useMemo(() => sortSourceControlChanges(props.changeState.files), [props.changeState.files]);
  const selectedCommit = props.commits.find((commit) => commit.id === props.selectedCommitId) ?? null;
  const selectedCommitTags = selectedCommit
    ? props.versioning.tags.filter((tag) => tag.commitId === selectedCommit.id)
    : [];
  const workingFileIds = useMemo(() => new Set(props.workingFileIds), [props.workingFileIds]);
  const canCommit = props.changeState.summary.canCommit && props.commitMessage.trim().length > 0 && !props.commitBusy;
  const changedCategories = getChangedCategoryKeys(props.changeState.categories);

  useEffect(() => writeSourceControlDisclosure(SOURCE_CONTROL_CHANGES_EXPANDED_KEY, changesExpanded), [changesExpanded]);
  useEffect(() => writeSourceControlDisclosure(SOURCE_CONTROL_HISTORY_EXPANDED_KEY, historyExpanded), [historyExpanded]);
  useEffect(() => {
    if (selectedCommit) setHistoryExpanded(true);
  }, [selectedCommit]);
  useEffect(() => setMaxCommitsDraft(String(settings.maxCommits)), [settings.maxCommits]);

  function openTagDialog(state: TagDialogState) {
    setTagDialog(state);
    setTagName(state.tag?.name ?? "");
    setTagDescription(state.tag?.description ?? "");
    setTagError("");
  }

  function getTagError(reason: string): string {
    if (reason === "empty-name") return t("sourceControl.tags.errors.required");
    if (reason === "name-too-long") return t("sourceControl.tags.errors.nameTooLong");
    if (reason === "description-too-long") return t("sourceControl.tags.errors.descriptionTooLong");
    if (reason === "duplicate-name") return t("sourceControl.tags.errors.duplicate");
    if (reason === "reserved-name") return t("sourceControl.tags.errors.reserved");
    if (reason === "missing-commit") return t("sourceControl.tags.errors.missingCommit");
    if (reason === "id-unavailable") return t("sourceControl.tags.errors.idUnavailable");
    return t("sourceControl.tags.errors.missingTag");
  }

  function handleTagSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCommit || !tagDialog) return;
    const input = { name: tagName, description: tagDescription, color: tagDialog.tag?.color };
    const result = tagDialog.mode === "create"
      ? props.onCreateTag(selectedCommit.id, input)
      : props.onUpdateTag(tagDialog.tag?.id ?? "", input);
    if (result.status === "invalid") {
      setTagError(getTagError(result.reason));
      return;
    }
    setTagDialog(null);
  }

  function requestRetentionConfirmation(summary: ProjectVersioningRetentionSummary, apply: () => void) {
    if (summary.removedCommitIds.length === 0 && summary.removedTagIds.length === 0) {
      apply();
      return;
    }
    setPendingRetentionAction({ summary, apply });
  }

  function cancelRetentionConfirmation() {
    setPendingRetentionAction(null);
    setMaxCommitsDraft(String(settings.maxCommits));
  }

  function handleDeleteTag(tag: ProjectCommitTag) {
    const candidate = {
      ...props.versioning,
      tags: props.versioning.tags.filter((item) => item.id !== tag.id),
    };
    requestRetentionConfirmation(previewProjectVersioningRetention(candidate), () => {
      props.onDeleteTag(tag.id);
      setTagDialog(null);
    });
  }

  function requestSettingsUpdate(patch: Partial<ProjectVersioningSettings>) {
    const candidate = {
      ...props.versioning,
      settings: {
        ...settings,
        ...patch,
      },
    };
    const apply = () => {
      const result = props.onUpdateSettings(patch);
      if (result.status === "invalid") {
        setSettingsError(t("sourceControl.settings.errors.invalid"));
      } else {
        setSettingsError("");
      }
    };
    const affectsRetention =
      patch.maxCommits !== undefined
      || (settings.keepTaggedCommits && patch.keepTaggedCommits === false);
    if (affectsRetention) {
      requestRetentionConfirmation(previewProjectVersioningRetention(candidate), apply);
    } else {
      apply();
    }
  }

  function handleMaxCommitsApply() {
    const value = Number(maxCommitsDraft);
    if (
      !Number.isInteger(value)
      || value < MIN_PROJECT_VERSIONING_MAX_COMMITS
      || value > MAX_PROJECT_VERSIONING_MAX_COMMITS
    ) {
      setSettingsError(t("sourceControl.settings.errors.range", {
        min: MIN_PROJECT_VERSIONING_MAX_COMMITS,
        max: MAX_PROJECT_VERSIONING_MAX_COMMITS,
      }));
      return;
    }
    requestSettingsUpdate({ maxCommits: value });
  }

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
          <small>{props.versioning.headCommitId ? t("sourceControl.localHead", { id: shortCommitId(props.versioning.headCommitId) }) : t("sourceControl.noLocalSnapshots")}</small>
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
        <div className="source-control-commit-submit-row">
          <button
            type="button"
            className="source-control-primary-button"
            onClick={props.onCommit}
            disabled={!canCommit}
            aria-busy={props.commitBusy || undefined}
          >
            {props.commitBusy
              ? <span className="ui-button__spinner" aria-hidden="true" />
              : <StudioIcon name="done" aria-hidden="true" />}
            <span>{props.totalCommitCount === 0 ? t("sourceControl.createFirstCommit") : t("sourceControl.commit")}</span>
          </button>
        </div>
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
                <div className="source-control-user-tags">
                  <div className="source-control-user-tags__header">
                    <strong>{t("sourceControl.tags.title")}</strong>
                    <button type="button" onClick={() => openTagDialog({ mode: "create" })}>
                      {t("sourceControl.tags.add")}
                    </button>
                  </div>
                  {selectedCommitTags.length > 0 ? (
                    <div className="source-control-tags">
                      {selectedCommitTags.map((tag) => (
                        <button
                          type="button"
                          key={tag.id}
                          onClick={() => openTagDialog({ mode: "edit", tag })}
                          title={tag.description}
                          style={tag.color ? { borderColor: tag.color } : undefined}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  ) : <small>{t("sourceControl.tags.empty")}</small>}
                </div>
                <div className="source-control-commit-actions">
                  <button type="button" onClick={() => props.onCompareWithCurrent(selectedCommit.id)}>{t("sourceControl.compareCurrent")}</button>
                  <button type="button" onClick={() => props.onCompareWithHead(selectedCommit.id)} disabled={!props.versioning.headCommitId || selectedCommit.id === props.versioning.headCommitId}>{t("sourceControl.compareHead")}</button>
                  <button type="button" onClick={() => props.onCompareWithParent(selectedCommit.id)} disabled={!selectedCommit.parentId}>{t("sourceControl.comparePrevious")}</button>
                  <button type="button" onClick={() => props.onRestoreCommit(selectedCommit.id)}>{t("sourceControl.restore")}</button>
                  <button type="button" className="is-danger" onClick={() => props.onDeleteCommit(selectedCommit.id)}>{t("sourceControl.deleteCommit")}</button>
                </div>
              </div>
            ) : props.commits.length === 0 ? (
              <PanelEmptyState
                className="source-control-empty"
                icon="history"
                title={props.totalCommitCount > 0 ? t("sourceControl.noVisibleCommits") : t("sourceControl.noCommits")}
              />
            ) : (
              <ol className="source-control-history-list" data-testid="source-control-history-scroll">
                {props.commits.map((commit) => {
                  const isHead = commit.id === props.versioning.headCommitId;
                  const commitTags = props.versioning.tags.filter((tag) => tag.commitId === commit.id);
                  return (
                    <li key={commit.id}>
                      <button type="button" className={isHead ? "source-control-history-row is-head" : "source-control-history-row"} onClick={() => props.onSelectCommit(commit.id)}>
                        <span className="source-control-timeline" aria-hidden="true"><i /><b /></span>
                        <span>
                          <strong>{commit.message}</strong>
                          {commit.automatic || commitTags.length > 0 ? (
                            <span className="source-control-history-row__badges">
                              {commit.automatic ? <i>{t("sourceControl.automatic")}</i> : null}
                              {commitTags.map((tag) => <i key={tag.id}>{tag.name}</i>)}
                            </span>
                          ) : null}
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

      <details className="source-control-settings">
        <summary>
          <StudioIcon name="settings" aria-hidden="true" />
          <span>{t("sourceControl.settings.title")}</span>
        </summary>
        <div className="source-control-settings__body">
          <label>
            <span>{t("sourceControl.settings.maxCommits")}</span>
            <span className="source-control-settings__inline">
              <input
                type="number"
                min={MIN_PROJECT_VERSIONING_MAX_COMMITS}
                max={MAX_PROJECT_VERSIONING_MAX_COMMITS}
                step={1}
                value={maxCommitsDraft}
                onChange={(event) => setMaxCommitsDraft(event.target.value)}
              />
              <button type="button" onClick={handleMaxCommitsApply}>{t("common.actions.apply")}</button>
            </span>
          </label>
          <label className="source-control-settings__check">
            <input
              type="checkbox"
              checked={settings.keepTaggedCommits}
              onChange={(event) => requestSettingsUpdate({ keepTaggedCommits: event.target.checked })}
            />
            <span>
              <strong>{t("sourceControl.settings.keepTagged")}</strong>
              <small>{t("sourceControl.settings.keepTaggedHelp")}</small>
            </span>
          </label>
          <label className="source-control-settings__check">
            <input
              type="checkbox"
              checked={settings.includeAutomaticCommits}
              onChange={(event) => requestSettingsUpdate({ includeAutomaticCommits: event.target.checked })}
            />
            <span>
              <strong>{t("sourceControl.settings.includeAutomatic")}</strong>
              <small>{t("sourceControl.settings.includeAutomaticHelp")}</small>
            </span>
          </label>
          <p>{t("sourceControl.settings.visibleCount", {
            visible: props.commits.length,
            total: props.totalCommitCount,
          })}</p>
          {settingsError ? <p className="source-control-field-error" role="alert">{settingsError}</p> : null}
        </div>
      </details>

      <Modal
        open={tagDialog !== null}
        onClose={() => setTagDialog(null)}
        title={tagDialog?.mode === "edit" ? t("sourceControl.tags.editTitle") : t("sourceControl.tags.createTitle")}
        subtitle={selectedCommit ? t("sourceControl.tags.commitSubtitle", { message: selectedCommit.message }) : undefined}
        size="sm"
        className="source-control-tag-dialog"
      >
        <form onSubmit={handleTagSubmit}>
          <div className="source-control-tag-dialog__body">
            <label>
              <span>{t("sourceControl.tags.name")}</span>
              <input
                data-autofocus
                value={tagName}
                onChange={(event) => setTagName(event.target.value)}
                maxLength={PROJECT_COMMIT_TAG_NAME_MAX_LENGTH}
                required
              />
            </label>
            <label>
              <span>{t("sourceControl.tags.description")}</span>
              <textarea
                value={tagDescription}
                onChange={(event) => setTagDescription(event.target.value)}
                maxLength={PROJECT_COMMIT_TAG_DESCRIPTION_MAX_LENGTH}
                rows={3}
              />
            </label>
            {tagError ? <p className="source-control-field-error" role="alert">{tagError}</p> : null}
          </div>
          <div className="ui-modal__footer source-control-tag-dialog__actions">
            {tagDialog?.mode === "edit" && tagDialog.tag ? (
              <button type="button" className="is-danger" onClick={() => handleDeleteTag(tagDialog.tag!)}>
                {t("sourceControl.tags.delete")}
              </button>
            ) : <span />}
            <button type="button" onClick={() => setTagDialog(null)}>{t("common.actions.cancel")}</button>
            <button type="submit" className="source-control-primary-button">{t("common.actions.save")}</button>
          </div>
        </form>
      </Modal>

      <Modal
        open={pendingRetentionAction !== null}
        onClose={cancelRetentionConfirmation}
        title={t("sourceControl.retention.title")}
        subtitle={t("sourceControl.retention.subtitle")}
        size="sm"
        className="source-control-retention-dialog"
        testId="source-control-retention-dialog"
      >
        {pendingRetentionAction ? (
          <>
            <div className="source-control-retention-dialog__body">
              <dl>
                <div><dt>{t("sourceControl.retention.total")}</dt><dd>{pendingRetentionAction.summary.totalBefore}</dd></div>
                <div><dt>{t("sourceControl.retention.removedCommits")}</dt><dd>{pendingRetentionAction.summary.removedCommitIds.length}</dd></div>
                <div><dt>{t("sourceControl.retention.protectedCommits")}</dt><dd>{pendingRetentionAction.summary.protectedCommitIds.length}</dd></div>
                <div><dt>{t("sourceControl.retention.removedTags")}</dt><dd>{pendingRetentionAction.summary.removedTagIds.length}</dd></div>
                <div><dt>{t("sourceControl.retention.remaining")}</dt><dd>{pendingRetentionAction.summary.totalAfter}</dd></div>
              </dl>
              {pendingRetentionAction.summary.overflowCount > 0 ? (
                <p className="source-control-retention-dialog__warning">
                  {t("sourceControl.retention.overflow", { count: pendingRetentionAction.summary.overflowCount })}
                </p>
              ) : null}
            </div>
            <div className="ui-modal__footer">
              <button type="button" onClick={cancelRetentionConfirmation}>{t("common.actions.cancel")}</button>
              <button
                type="button"
                className="source-control-danger-button"
                onClick={() => {
                  pendingRetentionAction.apply();
                  setPendingRetentionAction(null);
                }}
              >
                {t("sourceControl.retention.confirm")}
              </button>
            </div>
          </>
        ) : null}
      </Modal>
    </WorkspacePanel>
  );
}
