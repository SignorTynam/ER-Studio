import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import type {
  ProjectExplorerNode,
  ProjectExplorerProject,
  ProjectExplorerViewState,
  ProjectWorkspaceFile,
} from "../../types/projectExplorer";
import { useI18n } from "../../i18n/useI18n";
import { resolveExplorerCreationParent, sortProjectExplorerNodes } from "../../utils/projectExplorer";
import { StudioIcon } from "../icons/StudioIcon";
import { PanelIconButton, PanelMenu, PanelMenuItem, WorkspacePanelHeader } from "../workspace/WorkspacePanel";
import { ProjectExplorerContextMenu } from "./ProjectExplorerContextMenu";
import {
  ProjectExplorerCreateRow,
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

type ExplorerMenuState = {
  x: number;
  y: number;
  nodeId: string | null;
  origin: "row" | "context-menu";
};

export function ProjectExplorer(props: ProjectExplorerProps) {
  const { t } = useI18n();
  const [contextMenu, setContextMenu] = useState<ExplorerMenuState | null>(null);
  const [newFileMenuOpen, setNewFileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<ProjectExplorerCreateDraft | null>(null);
  const headerMenusRef = useRef<HTMLDivElement | null>(null);
  const nodesById = useMemo(
    () => new Map(props.project.fileTree.map((node) => [node.id, node])),
    [props.project.fileTree],
  );
  const root = nodesById.get(props.project.rootId);
  const rootChildren = sortProjectExplorerNodes(
    (root?.children ?? [])
      .map((childId) => nodesById.get(childId))
      .filter((node): node is ProjectExplorerNode => Boolean(node)),
  );
  const expandedFolderIds = useMemo(() => new Set(props.view.expandedFolderIds), [props.view.expandedFolderIds]);
  const contextNode = contextMenu?.nodeId ? nodesById.get(contextMenu.nodeId) ?? null : null;
  const fileCount = Object.keys(props.files).length;
  const folderCount = props.project.fileTree.filter(
    (node) => node.kind === "folder" && node.id !== props.project.rootId,
  ).length;
  const labels = {
    rename: t("projectExplorer.actions.rename"),
    nameLabel: t("projectExplorer.dialogs.nameLabel"),
    delete: t("projectExplorer.actions.delete"),
    newSchema: t("projectExplorer.actions.newSchema"),
    newTextFile: t("projectExplorer.actions.newTextFile"),
    newSqlFile: t("projectExplorer.actions.newSqlFile"),
    newFolder: t("projectExplorer.actions.newFolder"),
    more: t("projectExplorer.actions.more"),
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
    if (!newFileMenuOpen && !moreMenuOpen) return undefined;
    function closeMenus(event: PointerEvent) {
      if (event.target instanceof Node && headerMenusRef.current?.contains(event.target)) return;
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

  function startInlineCreate(
    kind: ProjectExplorerCreateKind,
    origin: ProjectExplorerCreateDraft["origin"],
    target: { requestedParentId?: string | null; contextNodeId?: string | null } = {},
  ) {
    const parentId = resolveExplorerCreationParent({
      project: props.project,
      requestedParentId: target.requestedParentId,
      contextNodeId: target.contextNodeId,
      selectedNodeId: props.view.selectedNodeId,
    });
    const defaultName = kind === "schema"
      ? t("projectExplorer.defaults.schemaName")
      : kind === "sql"
        ? t("projectExplorer.defaults.sqlFileName")
        : kind === "text"
          ? t("projectExplorer.defaults.textFileName")
          : t("projectExplorer.defaults.folderName");

    if (parentId !== props.project.rootId && !expandedFolderIds.has(parentId)) {
      props.onToggleFolder(parentId);
    }
    setContextMenu(null);
    setNewFileMenuOpen(false);
    setMoreMenuOpen(false);
    setCreateDraft({ parentId, kind, value: defaultName, error: "", origin });
  }

  function getDraftComparableName(draft: ProjectExplorerCreateDraft): string {
    const value = draft.value.trim();
    if (draft.kind === "folder") return value.toLocaleLowerCase();
    const extension = draft.kind === "schema" ? ".erschema" : draft.kind === "sql" ? ".sql" : ".txt";
    return (value.toLocaleLowerCase().endsWith(extension) ? value : `${value}${extension}`).toLocaleLowerCase();
  }

  async function submitInlineCreate() {
    const draft = createDraft;
    if (!draft) return;
    const value = draft.value.trim();
    if (!value) {
      setCreateDraft({ ...draft, error: labels.nameRequired });
      return;
    }
    if (/[\\/]/.test(value)) {
      setCreateDraft({ ...draft, error: labels.invalidCharacters });
      return;
    }
    const parent = nodesById.get(draft.parentId);
    const duplicate = (parent?.children ?? []).some((childId) => {
      const child = nodesById.get(childId);
      return child?.name.toLocaleLowerCase() === getDraftComparableName(draft);
    });
    if (duplicate) {
      setCreateDraft({ ...draft, error: t("projectExplorer.errors.duplicate-name") });
      return;
    }
    const action = draft.kind === "schema"
      ? props.onCreateSchema
      : draft.kind === "sql"
        ? props.onCreateSqlFile ?? props.onCreateTextFile
        : draft.kind === "text"
          ? props.onCreateTextFile
          : props.onCreateFolder;
    try {
      await action(draft.parentId, value);
      setCreateDraft((current) => current === draft ? null : current);
    } catch (error) {
      setCreateDraft((current) => current === draft ? {
        ...current,
        error: error instanceof Error ? error.message : labels.renameFailed,
      } : current);
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

  const updateDraftValue = (value: string) => {
    setCreateDraft((current) => current ? { ...current, value, error: "" } : null);
  };
  const openNodeMenu: Parameters<typeof ProjectExplorerTreeItem>[0]["onContextMenu"] = (node, event) => {
    event.preventDefault();
    event.stopPropagation();
    props.onSelectNode(node.id);
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      nodeId: node.id,
      origin: event.type === "click" ? "row" : "context-menu",
    });
  };

  return (
    <aside
      className={props.embedded ? "project-explorer project-explorer--embedded" : "project-explorer"}
      style={props.embedded ? undefined : ({ "--project-explorer-width": `${props.view.explorerWidth}px` } as CSSProperties)}
      aria-label={t("projectExplorer.title")}
    >
      <div className="project-explorer-header-host" ref={headerMenusRef}>
        <WorkspacePanelHeader
          className="project-explorer-header"
          title={t("projectExplorer.title")}
          onClose={props.onToggleOpen}
          closeLabel={t("projectExplorer.actions.close")}
        >
          <div className="project-explorer-header__menu-wrap">
            <PanelIconButton
              icon="newProject"
              label={t("workspaceChrome.newFile")}
              className="project-explorer-icon-button project-explorer-icon-button--primary"
              aria-haspopup="menu"
              aria-expanded={newFileMenuOpen}
              onClick={() => {
                setNewFileMenuOpen((current) => !current);
                setMoreMenuOpen(false);
              }}
            />
            {newFileMenuOpen ? (
              <PanelMenu className="project-explorer-new-menu">
                <PanelMenuItem icon="entity" label={labels.newSchema} onClick={() => runHeaderAction(() => startInlineCreate("schema", "toolbar"))} />
                <PanelMenuItem icon="database" label={labels.newSqlFile} onClick={() => runHeaderAction(() => startInlineCreate("sql", "toolbar"))} />
                <PanelMenuItem icon="fileText" label={labels.newTextFile} onClick={() => runHeaderAction(() => startInlineCreate("text", "toolbar"))} />
              </PanelMenu>
            ) : null}
          </div>
          <PanelIconButton
            icon="folderPlus"
            label={labels.newFolder}
            className="project-explorer-icon-button"
            onClick={() => startInlineCreate("folder", "toolbar")}
          />
          <div className="project-explorer-header__menu-wrap">
            <PanelIconButton
              icon="more"
              label={t("workspaceChrome.moreActions")}
              className="project-explorer-icon-button"
              aria-haspopup="menu"
              aria-expanded={moreMenuOpen}
              onClick={() => {
                setMoreMenuOpen((current) => !current);
                setNewFileMenuOpen(false);
              }}
            />
            {moreMenuOpen ? (
              <PanelMenu className="project-explorer-new-menu project-explorer-new-menu--more">
                <PanelMenuItem icon="collapseAll" label={t("projectExplorer.actions.collapseAll")} onClick={() => runHeaderAction(props.onCollapseAll)} />
                <div className="project-explorer-menu-info">
                  {t("projectExplorer.meta", { files: fileCount, folders: folderCount })}
                </div>
              </PanelMenu>
            ) : null}
          </div>
        </WorkspacePanelHeader>
      </div>

      <div
        className="project-explorer-tree"
        role="tree"
        aria-label={t("projectExplorer.treeAria")}
        onContextMenu={(event) => {
          event.preventDefault();
          setContextMenu({ x: event.clientX, y: event.clientY, nodeId: null, origin: "context-menu" });
        }}
      >
        {root && (rootChildren.length > 0 || createDraft?.parentId === props.project.rootId) ? (
          <ul className="project-explorer-list">
            {createDraft?.parentId === props.project.rootId ? (
              <ProjectExplorerCreateRow
                draft={createDraft}
                depth={0}
                nameLabel={labels.nameLabel}
                onChange={updateDraftValue}
                onSubmit={() => void submitInlineCreate()}
                onCancel={() => setCreateDraft(null)}
              />
            ) : null}
            {rootChildren.map((child) => (
              <ProjectExplorerTreeItem
                key={child.id}
                node={child}
                rootId={props.project.rootId}
                depth={0}
                activeFileId={props.view.activeFileId}
                selectedNodeId={props.view.selectedNodeId}
                expanded={expandedFolderIds.has(child.id)}
                childrenNodes={(child.children ?? [])
                  .map((childId) => nodesById.get(childId))
                  .filter((node): node is ProjectExplorerNode => Boolean(node))}
                nodesById={nodesById}
                files={props.files}
                file={child.fileId ? props.files[child.fileId] : undefined}
                expandedFolderIds={expandedFolderIds}
                dirtyFileIds={props.dirtyFileIds}
                createDraft={createDraft}
                labels={labels}
                onOpenFile={props.onOpenFile}
                onSelectNode={props.onSelectNode}
                onContextMenu={openNodeMenu}
                onToggleFolder={props.onToggleFolder}
                onRename={props.onRename}
                onDelete={props.onDelete}
                onCreateDraftChange={updateDraftValue}
                onCreateDraftSubmit={() => void submitInlineCreate()}
                onCreateDraftCancel={() => setCreateDraft(null)}
              />
            ))}
          </ul>
        ) : (
          <div className="project-explorer-empty">
            <StudioIcon name="openProject" aria-hidden="true" />
            <strong>{t("projectExplorer.empty.title")}</strong>
            <p>{t("projectExplorer.empty.description")}</p>
            <button
              type="button"
              onClick={() => startInlineCreate("schema", "empty-state", { requestedParentId: props.project.rootId })}
            >
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
          if (contextNode?.fileId) props.onOpenFile(contextNode.fileId);
        }}
        onNewSchema={() => startInlineCreate("schema", contextMenu?.origin ?? "context-menu", { contextNodeId: contextMenu?.nodeId })}
        onNewTextFile={() => startInlineCreate("text", contextMenu?.origin ?? "context-menu", { contextNodeId: contextMenu?.nodeId })}
        onNewSqlFile={() => startInlineCreate("sql", contextMenu?.origin ?? "context-menu", { contextNodeId: contextMenu?.nodeId })}
        onNewFolder={() => startInlineCreate("folder", contextMenu?.origin ?? "context-menu", { contextNodeId: contextMenu?.nodeId })}
        onRename={() => {
          if (contextNode) props.onRename(contextNode.id);
        }}
        onDelete={() => {
          if (contextNode) props.onDelete(contextNode.id);
        }}
        onClose={() => setContextMenu(null)}
      />
    </aside>
  );
}
