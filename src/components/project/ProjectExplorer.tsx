import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import type {
  ProjectExplorerNode,
  ProjectExplorerProject,
  ProjectExplorerViewState,
  ProjectWorkspaceFile,
} from "../../types/projectExplorer";
import { useI18n } from "../../i18n/useI18n";
import { StudioIcon } from "../icons/StudioIcon";
import { ProjectExplorerContextMenu } from "./ProjectExplorerContextMenu";
import {
  ProjectExplorerTreeItem,
  type ProjectExplorerCreateDraft,
  type ProjectExplorerCreateKind,
} from "./ProjectExplorerTreeItem";

interface ProjectExplorerProps {
  project: ProjectExplorerProject;
  files: Record<string, ProjectWorkspaceFile>;
  view: ProjectExplorerViewState;
  embedded?: boolean;
  dirtyFileIds?: Set<string>;
  onOpenFile: (fileId: string) => void;
  onCreateSchema: (parentId: string, name?: string) => void | Promise<void>;
  onCreateTextFile: (parentId: string, name?: string) => void | Promise<void>;
  onCreateSqlFile?: (parentId: string, name?: string) => void | Promise<void>;
  onCreateFolder: (parentId: string, name?: string) => void | Promise<void>;
  onRename: (nodeId: string, nextName?: string) => void | Promise<void>;
  onDelete: (nodeId: string) => void;
  onToggleFolder: (folderId: string) => void;
  onCollapseAll: () => void;
  onToggleOpen: () => void;
  onResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onSelectNode: (nodeId: string) => void;
}

export function ProjectExplorer(props: ProjectExplorerProps) {
  const { t } = useI18n();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string | null } | null>(null);
  const [newFileMenuOpen, setNewFileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<ProjectExplorerCreateDraft | null>(null);
  const headerMenusRef = useRef<HTMLDivElement | null>(null);
  const nodesById = useMemo(
    () => new Map(props.project.fileTree.map((node) => [node.id, node])),
    [props.project.fileTree],
  );
  const root = nodesById.get(props.project.rootId);
  const rootChildren = (root?.children ?? [])
    .map((childId) => nodesById.get(childId))
    .filter((node): node is ProjectExplorerNode => Boolean(node));
  const expandedFolderIds = useMemo(() => new Set(props.view.expandedFolderIds), [props.view.expandedFolderIds]);
  const selectedNode = props.view.selectedNodeId ? nodesById.get(props.view.selectedNodeId) : undefined;
  const selectedTargetFolderId =
    selectedNode?.kind === "folder"
      ? selectedNode.id
      : selectedNode?.parentId ?? props.project.rootId;
  const contextNode = contextMenu?.nodeId ? nodesById.get(contextMenu.nodeId) ?? null : null;
  const contextTargetFolderId =
    contextNode?.kind === "folder"
      ? contextNode.id
      : contextNode?.parentId ?? props.project.rootId;
  const fileCount = Object.keys(props.files).length;
  const folderCount = props.project.fileTree.filter((node) => node.kind === "folder").length;
  const labels = {
    rename: t("projectExplorer.actions.rename"),
    nameLabel: t("projectExplorer.dialogs.nameLabel"),
    delete: t("projectExplorer.actions.delete"),
    newSchema: t("projectExplorer.actions.newSchema"),
    newTextFile: t("projectExplorer.actions.newTextFile"),
    newSqlFile: t("projectExplorer.actions.newSqlFile"),
    newFolder: t("projectExplorer.actions.newFolder"),
    expandFolder: t("projectExplorer.actions.expandFolder"),
    collapseFolder: t("projectExplorer.actions.collapseFolder"),
    modified: t("workspaceChrome.saveState.modified"),
    nameRequired: t("projectExplorer.errors.empty-name"),
    invalidCharacters: t("projectExplorer.errors.invalid-characters"),
    renameFailed: t("projectExplorer.errors.rename-failed"),
    fileKinds: {
      schema: t("workspaceChrome.fileTypes.schema"),
      sql: t("workspaceChrome.fileTypes.sql"),
      text: t("workspaceChrome.fileTypes.text"),
      unknown: t("workspaceChrome.fileTypes.file"),
      folder: t("workspaceChrome.fileTypes.folder"),
      file: t("workspaceChrome.fileTypes.file"),
    },
  };

  useEffect(() => {
    if (!newFileMenuOpen && !moreMenuOpen) {
      return undefined;
    }
    function closeMenus(event: PointerEvent) {
      if (event.target instanceof Node && headerMenusRef.current?.contains(event.target)) {
        return;
      }
      setNewFileMenuOpen(false);
      setMoreMenuOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setNewFileMenuOpen(false);
        setMoreMenuOpen(false);
      }
    }
    window.addEventListener("pointerdown", closeMenus);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", closeMenus);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [moreMenuOpen, newFileMenuOpen]);

  function runHeaderAction(action: () => void) {
    setNewFileMenuOpen(false);
    setMoreMenuOpen(false);
    action();
  }

  function startInlineCreate(parentId: string, kind: ProjectExplorerCreateKind) {
    const defaultName = kind === "schema"
      ? t("projectExplorer.defaults.schemaName")
      : kind === "sql"
        ? t("projectExplorer.defaults.sqlFileName")
        : kind === "text"
          ? t("projectExplorer.defaults.textFileName")
          : t("projectExplorer.defaults.folderName");
    if (!expandedFolderIds.has(parentId)) props.onToggleFolder(parentId);
    props.onSelectNode(parentId);
    setContextMenu(null);
    setNewFileMenuOpen(false);
    setMoreMenuOpen(false);
    setCreateDraft({ parentId, kind, value: defaultName, error: "" });
  }

  function getDraftComparableName(draft: ProjectExplorerCreateDraft): string {
    const value = draft.value.trim();
    if (draft.kind === "folder") return value.toLocaleLowerCase();
    const extension = draft.kind === "schema" ? ".erschema" : draft.kind === "sql" ? ".sql" : ".txt";
    return (value.toLocaleLowerCase().endsWith(extension) ? value : `${value}${extension}`).toLocaleLowerCase();
  }

  async function submitInlineCreate() {
    if (!createDraft) return;
    const value = createDraft.value.trim();
    if (!value) {
      setCreateDraft({ ...createDraft, error: labels.nameRequired });
      return;
    }
    if (/[\\/]/.test(value)) {
      setCreateDraft({ ...createDraft, error: labels.invalidCharacters });
      return;
    }
    const parent = nodesById.get(createDraft.parentId);
    const duplicate = (parent?.children ?? []).some((childId) => {
      const child = nodesById.get(childId);
      return child?.name.toLocaleLowerCase() === getDraftComparableName(createDraft);
    });
    if (duplicate) {
      setCreateDraft({ ...createDraft, error: t("projectExplorer.errors.duplicate-name") });
      return;
    }
    const action = createDraft.kind === "schema"
      ? props.onCreateSchema
      : createDraft.kind === "sql"
        ? props.onCreateSqlFile ?? props.onCreateTextFile
        : createDraft.kind === "text"
          ? props.onCreateTextFile
          : props.onCreateFolder;
    try {
      await action(createDraft.parentId, value);
      setCreateDraft(null);
    } catch (error) {
      setCreateDraft((current) => current ? {
        ...current,
        error: error instanceof Error ? error.message : labels.renameFailed,
      } : null);
    }
  }

  if (!props.embedded && !props.view.explorerOpen) {
    return (
      <aside className="project-explorer project-explorer--collapsed" aria-label={t("projectExplorer.title")}>
        <button
          type="button"
          className="project-explorer-collapsed-button"
          onClick={props.onToggleOpen}
          title={t("projectExplorer.actions.open")}
          aria-label={t("projectExplorer.actions.open")}
        >
          <StudioIcon name="panelLeft" />
        </button>
      </aside>
    );
  }

  return (
    <aside
      className={props.embedded ? "project-explorer project-explorer--embedded" : "project-explorer"}
      style={props.embedded ? undefined : ({ "--project-explorer-width": `${props.view.explorerWidth}px` } as CSSProperties)}
      aria-label={t("projectExplorer.title")}
    >
      <div className="project-explorer-header" ref={headerMenusRef}>
        <div className="project-explorer-header__topline">
          <h2>{t("projectExplorer.title")}</h2>
          <div className="project-explorer-header__top-actions">
            <div className="project-explorer-header__menu-wrap">
              <button
                type="button"
                className="project-explorer-icon-button"
                aria-label={t("workspaceChrome.moreActions")}
                title={t("workspaceChrome.moreActions")}
                aria-haspopup="menu"
                aria-expanded={moreMenuOpen}
                onClick={() => {
                  setMoreMenuOpen((current) => !current);
                  setNewFileMenuOpen(false);
                }}
              >
                <StudioIcon name="more" />
              </button>
              {moreMenuOpen ? (
                <div className="project-explorer-new-menu project-explorer-new-menu--more" role="menu">
                  <button type="button" role="menuitem" onClick={() => runHeaderAction(props.onCollapseAll)}>
                    <StudioIcon name="collapseAll" aria-hidden="true" />
                    <span>{t("projectExplorer.actions.collapseAll")}</span>
                  </button>
                  <div className="project-explorer-menu-info">
                    {t("projectExplorer.meta", { files: fileCount, folders: folderCount })}
                  </div>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="project-explorer-icon-button"
              aria-label={t("projectExplorer.actions.close")}
              title={t("projectExplorer.actions.close")}
              onClick={props.onToggleOpen}
            >
              <StudioIcon name="close" />
            </button>
          </div>
        </div>
        <div className="project-explorer-header__project-row">
          <span className="project-explorer-subtitle" title={`${props.project.name} — ${t("projectExplorer.meta", { files: fileCount, folders: folderCount })}`}>
            {props.project.name}
          </span>
          <span className="project-explorer-meta" aria-hidden="true">
            {t("projectExplorer.meta", { files: fileCount, folders: folderCount })}
          </span>
          <div className="project-explorer-toolbar" aria-label={t("projectExplorer.actions.aria")}>
            <div className="project-explorer-header__menu-wrap">
              <button
                type="button"
                className="project-explorer-icon-button project-explorer-icon-button--primary"
                aria-label={t("workspaceChrome.newFile")}
                title={t("workspaceChrome.newFile")}
                aria-haspopup="menu"
                aria-expanded={newFileMenuOpen}
                onClick={() => {
                  setNewFileMenuOpen((current) => !current);
                  setMoreMenuOpen(false);
                }}
              >
                <StudioIcon name="newProject" />
              </button>
              {newFileMenuOpen ? (
                <div className="project-explorer-new-menu" role="menu">
                  <button type="button" role="menuitem" onClick={() => runHeaderAction(() => startInlineCreate(selectedTargetFolderId, "schema"))}>
                    <StudioIcon name="entity" aria-hidden="true" />
                    <span>{labels.newSchema}</span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => runHeaderAction(() => startInlineCreate(selectedTargetFolderId, "sql"))}>
                    <StudioIcon name="database" aria-hidden="true" />
                    <span>{labels.newSqlFile}</span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => runHeaderAction(() => startInlineCreate(selectedTargetFolderId, "text"))}>
                    <StudioIcon name="fileText" aria-hidden="true" />
                    <span>{labels.newTextFile}</span>
                  </button>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="project-explorer-icon-button"
              aria-label={labels.newFolder}
              title={labels.newFolder}
              onClick={() => startInlineCreate(selectedTargetFolderId, "folder")}
            >
              <StudioIcon name="folderPlus" />
            </button>
            <button
              type="button"
              className="project-explorer-icon-button project-explorer-collapse-button"
              aria-label={t("projectExplorer.actions.collapseAll")}
              title={t("projectExplorer.actions.collapseAll")}
              onClick={props.onCollapseAll}
            >
              <StudioIcon name="collapseAll" />
            </button>
          </div>
        </div>
      </div>

      <div
        className="project-explorer-tree"
        role="tree"
        aria-label={t("projectExplorer.treeAria")}
        onContextMenu={(event) => {
          event.preventDefault();
          setContextMenu({ x: event.clientX, y: event.clientY, nodeId: null });
        }}
      >
        {root && rootChildren.length > 0 ? (
          <ul className="project-explorer-list">
            <ProjectExplorerTreeItem
              node={root}
              depth={0}
              activeFileId={props.view.activeFileId}
              selectedNodeId={props.view.selectedNodeId}
              expanded={expandedFolderIds.has(root.id)}
              childrenNodes={rootChildren}
              nodesById={nodesById}
              files={props.files}
              expandedFolderIds={expandedFolderIds}
              dirtyFileIds={props.dirtyFileIds}
              createDraft={createDraft}
              labels={labels}
              onOpenFile={props.onOpenFile}
              onSelectNode={props.onSelectNode}
              onContextMenu={(node, event) => {
                event.preventDefault();
                event.stopPropagation();
                props.onSelectNode(node.id);
                setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
              }}
              onToggleFolder={props.onToggleFolder}
              onRename={props.onRename}
              onDelete={props.onDelete}
              onCreateSchema={(parentId) => startInlineCreate(parentId, "schema")}
              onCreateTextFile={(parentId) => startInlineCreate(parentId, "text")}
              onCreateSqlFile={(parentId) => startInlineCreate(parentId, "sql")}
              onCreateFolder={(parentId) => startInlineCreate(parentId, "folder")}
              onCreateDraftChange={(value) => setCreateDraft((current) => current ? { ...current, value, error: "" } : null)}
              onCreateDraftSubmit={() => void submitInlineCreate()}
              onCreateDraftCancel={() => setCreateDraft(null)}
            />
          </ul>
        ) : (
          <div className="project-explorer-empty">
            <StudioIcon name="openProject" aria-hidden="true" />
            <strong>{t("projectExplorer.empty.title")}</strong>
            <p>{t("projectExplorer.empty.description")}</p>
            <button type="button" onClick={() => startInlineCreate(props.project.rootId, "schema")}>
              {t("projectExplorer.empty.createSchema")}
            </button>
            <button type="button" className="project-explorer-empty__secondary" onClick={() => setNewFileMenuOpen(true)}>
              {t("workspaceChrome.moreFileTypes")}
            </button>
          </div>
        )}
      </div>

      {!props.embedded ? (
        <div
          className="project-explorer-resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label={t("projectExplorer.resizeAria")}
          onPointerDown={props.onResizeStart}
        />
      ) : null}
      <ProjectExplorerContextMenu
        open={Boolean(contextMenu)}
        x={contextMenu?.x ?? 0}
        y={contextMenu?.y ?? 0}
        node={contextNode}
        rootId={props.project.rootId}
        canCreateChildren={!contextNode || contextNode.kind === "folder"}
        onOpen={() => {
          if (contextNode?.fileId) {
            props.onOpenFile(contextNode.fileId);
          }
        }}
        onNewSchema={() => startInlineCreate(contextTargetFolderId, "schema")}
        onNewTextFile={() => startInlineCreate(contextTargetFolderId, "text")}
        onNewSqlFile={() => startInlineCreate(contextTargetFolderId, "sql")}
        onNewFolder={() => startInlineCreate(contextTargetFolderId, "folder")}
        onRename={() => {
          if (contextNode) {
            props.onRename(contextNode.id);
          }
        }}
        onDelete={() => {
          if (contextNode) {
            props.onDelete(contextNode.id);
          }
        }}
        onClose={() => setContextMenu(null)}
      />
    </aside>
  );
}
