import { useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import type { ProjectExplorerNode, ProjectWorkspaceFile } from "../../types/projectExplorer";
import { sortProjectExplorerNodes } from "../../utils/projectExplorer";
import { StudioIcon, type StudioIconName } from "../icons/StudioIcon";
import { useProjectExplorerDnd } from "./projectExplorerDnd";

export type ProjectExplorerCreateKind = "schema" | "sql" | "text" | "folder";

export interface ProjectExplorerCreateDraft {
  parentId: string;
  kind: ProjectExplorerCreateKind;
  value: string;
  error: string;
  origin: "toolbar" | "row" | "context-menu" | "empty-state";
}

interface ProjectExplorerTreeItemProps {
  node: ProjectExplorerNode;
  rootId: string;
  depth: number;
  activeFileId: string | null;
  selectedNodeId: string | null;
  expanded: boolean;
  file?: ProjectWorkspaceFile;
  childrenNodes: ProjectExplorerNode[];
  nodesById: Map<string, ProjectExplorerNode>;
  files: Record<string, ProjectWorkspaceFile>;
  expandedFolderIds: Set<string>;
  dirtyFileIds?: Set<string>;
  createDraft?: ProjectExplorerCreateDraft | null;
  labels: {
    nameLabel: string;
    rename: string;
    delete: string;
    newSchema: string;
    newTextFile: string;
    newSqlFile: string;
    newFolder: string;
    more: string;
    expandFolder: string;
    collapseFolder: string;
    modified: string;
    nameRequired: string;
    invalidCharacters: string;
    renameFailed: string;
    fileKinds: Record<ProjectExplorerNode["kind"] | "file", string>;
  };
  onOpenFile: (fileId: string) => void;
  onSelectNode: (nodeId: string) => void;
  onContextMenu: (node: ProjectExplorerNode, event: ReactMouseEvent) => void;
  onToggleFolder: (folderId: string) => void;
  onCreateSchema: (parentId: string) => void;
  onCreateSqlFile: (parentId: string) => void;
  onRename: (nodeId: string, nextName?: string) => void | Promise<void>;
  onDelete: (nodeId: string) => void;
  onCreateDraftChange?: (value: string) => void;
  onCreateDraftSubmit?: () => void;
  onCreateDraftCancel?: () => void;
}

function getProjectNodeIcon(node: ProjectExplorerNode, expanded: boolean): StudioIconName {
  if (node.kind === "folder") {
    return expanded ? "openProject" : "folder";
  }
  if (node.kind === "schema") {
    return "schema";
  }
  if (node.kind === "sql") {
    return "database";
  }
  if (node.kind === "text") {
    return "fileText";
  }
  return "type";
}

function getCreateDraftIcon(kind: ProjectExplorerCreateKind): StudioIconName {
  if (kind === "folder") return "folder";
  if (kind === "schema") return "schema";
  if (kind === "sql") return "database";
  return "fileText";
}

interface ProjectExplorerCreateRowProps {
  draft: ProjectExplorerCreateDraft;
  depth: number;
  nameLabel: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ProjectExplorerCreateRow({
  draft,
  depth,
  nameLabel,
  onChange,
  onSubmit,
  onCancel,
}: ProjectExplorerCreateRowProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    const extensionIndex = draft.kind === "folder" ? -1 : input.value.lastIndexOf(".");
    input.setSelectionRange(0, extensionIndex > 0 ? extensionIndex : input.value.length);
  }, [draft.kind]);

  return (
    <li className="project-explorer-node project-explorer-node--create" role="none">
      <div
        className="project-explorer-item project-explorer-item--create selected"
        style={{ "--project-explorer-depth": depth } as CSSProperties}
        data-depth={depth}
        role="treeitem"
        aria-selected="true"
        data-kind={draft.kind}
      >
        <div className="project-explorer-item__main">
          <span className="project-explorer-item__chevron" aria-hidden="true" />
          <span className="project-explorer-item__icon" aria-hidden="true">
            <StudioIcon name={getCreateDraftIcon(draft.kind)} />
          </span>
          <span className="project-explorer-item__rename-wrap">
            <input
              ref={inputRef}
              className="project-explorer-item__rename"
              autoFocus
              value={draft.value}
              aria-label={nameLabel}
              aria-invalid={Boolean(draft.error)}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSubmit();
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  onCancel();
                }
              }}
            />
            {draft.error ? <span className="project-explorer-item__rename-error" role="alert">{draft.error}</span> : null}
          </span>
        </div>
      </div>
    </li>
  );
}

export function ProjectExplorerTreeItem(props: ProjectExplorerTreeItemProps) {
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(props.node.name);
  const [renameError, setRenameError] = useState("");
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const isFolder = props.node.kind === "folder";
  const isActive = props.node.fileId != null && props.node.fileId === props.activeFileId;
  const isSelected = props.node.id === props.selectedNodeId;
  const isDirty = Boolean(props.node.fileId && props.dirtyFileIds?.has(props.node.fileId));
  const showsCreateDraft = isFolder && props.expanded && props.createDraft?.parentId === props.node.id;
  const extensionMatch = isFolder ? null : /\.([A-Za-z0-9]+)$/.exec(props.node.name);
  const hasVisibleExtension = Boolean(extensionMatch && extensionMatch.index > 0);
  const displayName = hasVisibleExtension && extensionMatch
    ? props.node.name.slice(0, extensionMatch.index)
    : props.node.name;
  const dnd = useProjectExplorerDnd();
  const rowClassName = [
    "project-explorer-item",
    isFolder ? "folder" : "file",
    isActive ? "active" : "",
    isSelected ? "selected" : "",
    isDirty ? "dirty" : "",
    dnd?.draggingNodeId === props.node.id ? "is-dragging" : "",
    dnd?.dropTargetFolderId === props.node.id ? "is-drop-target" : "",
  ].filter(Boolean).join(" ");

  function stopAndRun(event: ReactMouseEvent, action: () => void) {
    event.preventDefault();
    event.stopPropagation();
    action();
  }

  function activateNode() {
    props.onSelectNode(props.node.id);
    if (isFolder) {
      props.onToggleFolder(props.node.id);
    } else if (props.node.fileId) {
      props.onOpenFile(props.node.fileId);
    }
  }

  useEffect(() => {
    if (!renaming || !renameInputRef.current) {
      return;
    }
    const input = renameInputRef.current;
    input.focus();
    const extensionIndex = isFolder ? -1 : renameValue.lastIndexOf(".");
    input.setSelectionRange(0, extensionIndex > 0 ? extensionIndex : renameValue.length);
  }, [isFolder, renameValue, renaming]);

  function startRename() {
    setRenameValue(props.node.name);
    setRenameError("");
    setRenaming(true);
  }

  function submitRename() {
    const nextName = renameValue.trim();
    if (!nextName) {
      setRenameError(props.labels.nameRequired);
      return;
    }
    if (/[\\/]/.test(nextName)) {
      setRenameError(props.labels.invalidCharacters);
      return;
    }
    void Promise.resolve(props.onRename(props.node.id, nextName))
      .then(() => setRenaming(false))
      .catch((error: unknown) => setRenameError(error instanceof Error ? error.message : props.labels.renameFailed));
  }

  function focusRelativeItem(position: "previous" | "next" | "first" | "last") {
    // Fase D1: il role=tree e' passato dal contenitore alla lista (l'empty-state
    // con le sue CTA non deve risultare figlio dell'albero).
    const tree = document.querySelector<HTMLElement>('.project-explorer-list[role="tree"]');
    const items = Array.from(tree?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? []);
    if (items.length === 0) return;
    const index = items.findIndex((item) => item.dataset.projectNodeId === props.node.id);
    const targetIndex = position === "first"
      ? 0
      : position === "last"
        ? items.length - 1
        : position === "next"
          ? Math.min(items.length - 1, index + 1)
          : Math.max(0, index - 1);
    const target = items[targetIndex];
    if (target) {
      target.focus();
      if (target.dataset.projectNodeId) props.onSelectNode(target.dataset.projectNodeId);
    }
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (renaming) {
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      activateNode();
      return;
    }
    if (event.key === " ") {
      event.preventDefault();
      props.onSelectNode(props.node.id);
      return;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "Home" || event.key === "End") {
      event.preventDefault();
      focusRelativeItem(event.key === "ArrowUp" ? "previous" : event.key === "ArrowDown" ? "next" : event.key === "Home" ? "first" : "last");
      return;
    }
    if (event.key === "ArrowRight" && isFolder) {
      event.preventDefault();
      if (!props.expanded) {
        props.onToggleFolder(props.node.id);
      } else {
        const firstChild = event.currentTarget.parentElement?.querySelector<HTMLElement>('ul [role="treeitem"]');
        firstChild?.focus();
        if (firstChild?.dataset.projectNodeId) props.onSelectNode(firstChild.dataset.projectNodeId);
      }
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (isFolder && props.expanded) {
        props.onToggleFolder(props.node.id);
      } else if (props.node.parentId && props.node.parentId !== props.rootId) {
        const parent = document.querySelector<HTMLElement>(`[role="treeitem"][data-project-node-id="${props.node.parentId}"]`);
        if (parent) {
          parent.focus();
          props.onSelectNode(props.node.parentId);
        }
      }
      return;
    }
    if (event.key === "F2") {
      event.preventDefault();
      startRename();
      return;
    }
    if (event.key === "Delete") {
      event.preventDefault();
      props.onDelete(props.node.id);
      return;
    }
    if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      event.currentTarget.dispatchEvent(new MouseEvent("contextmenu", {
        bubbles: true,
        clientX: rect.left + Math.min(rect.width - 8, 48),
        clientY: rect.top + rect.height,
      }));
    }
  }

  return (
    <li className="project-explorer-node" role="none">
      <div
        className={rowClassName}
        style={{ "--project-explorer-depth": props.depth } as CSSProperties}
        data-depth={props.depth}
        role="treeitem"
        tabIndex={isSelected || (!props.selectedNodeId && props.depth === 0) ? 0 : -1}
        data-project-node-id={props.node.id}
        data-kind={props.node.kind}
        aria-expanded={isFolder ? props.expanded : undefined}
        aria-selected={isSelected}
        aria-current={isActive ? "page" : undefined}
        aria-label={`${props.node.name}, ${props.labels.fileKinds[props.node.kind] ?? props.labels.fileKinds.file}`}
        draggable={dnd != null && !renaming}
        onContextMenu={(event) => props.onContextMenu(props.node, event)}
        onKeyDown={handleKeyDown}
        onClick={() => props.onSelectNode(props.node.id)}
        onDoubleClick={activateNode}
        onDragStart={(event) => {
          if (!dnd) return;
          dnd.begin(props.node.id);
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", props.node.id);
        }}
        onDragOver={(event) => {
          if (!dnd?.draggingNodeId) return;
          event.preventDefault();
          event.stopPropagation();
          event.dataTransfer.dropEffect = dnd.hoverNode(props.node.id);
        }}
        onDrop={(event) => {
          if (!dnd?.draggingNodeId) return;
          event.preventDefault();
          event.stopPropagation();
          dnd.dropOnNode(props.node.id);
        }}
        onDragEnd={() => dnd?.end()}
      >
        <div className="project-explorer-item__main">
          {isFolder ? (
            <button
              type="button"
              className={props.expanded ? "project-explorer-item__chevron is-expanded" : "project-explorer-item__chevron"}
              aria-label={props.expanded ? props.labels.collapseFolder : props.labels.expandFolder}
              onClick={(event) => stopAndRun(event, () => props.onToggleFolder(props.node.id))}
            >
              <StudioIcon name="arrowRight" aria-hidden="true" />
            </button>
          ) : (
            <span className="project-explorer-item__chevron" aria-hidden="true" />
          )}
          <span className="project-explorer-item__icon" aria-hidden="true">
            <StudioIcon name={getProjectNodeIcon(props.node, props.expanded)} />
          </span>
          {renaming ? (
            <span className="project-explorer-item__rename-wrap">
              <input
                ref={renameInputRef}
                className="project-explorer-item__rename"
                value={renameValue}
                aria-label={props.labels.rename}
                aria-invalid={Boolean(renameError)}
                onChange={(event) => {
                  setRenameValue(event.target.value);
                  setRenameError("");
                }}
                onClick={(event) => event.stopPropagation()}
                onBlur={() => {
                  if (!renameError) submitRename();
                }}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key === "Enter") {
                    event.preventDefault();
                    submitRename();
                  } else if (event.key === "Escape") {
                    event.preventDefault();
                    setRenaming(false);
                    setRenameError("");
                  }
                }}
              />
              {renameError ? <span className="project-explorer-item__rename-error" role="alert">{renameError}</span> : null}
            </span>
          ) : (
            <>
              <span className="project-explorer-item__name" title={props.node.name}>{displayName}</span>
              {hasVisibleExtension && extensionMatch ? (
                <span className="project-explorer-item__extension" aria-hidden="true">{extensionMatch[1]}</span>
              ) : null}
            </>
          )}
          {isDirty ? <span className="project-explorer-item__dirty" role="img" aria-label={props.labels.modified} title={props.labels.modified} /> : null}
        </div>
        <span className="project-explorer-item__actions">
          {isFolder ? (
            <>
              <button
                type="button"
                aria-label={`${props.labels.newSchema}: ${props.node.name}`}
                title={props.labels.newSchema}
                onClick={(event) => stopAndRun(event, () => props.onCreateSchema(props.node.id))}
              >
                <StudioIcon name="newProject" />
              </button>
              <button
                type="button"
                aria-label={`${props.labels.newSqlFile}: ${props.node.name}`}
                title={props.labels.newSqlFile}
                onClick={(event) => stopAndRun(event, () => props.onCreateSqlFile(props.node.id))}
              >
                <StudioIcon name="database" />
              </button>
            </>
          ) : null}
          <button
            type="button"
            aria-label={`${props.labels.more}: ${props.node.name}`}
            title={props.labels.more}
            aria-haspopup="menu"
            onClick={(event) => stopAndRun(event, () => props.onContextMenu(props.node, event))}
          >
            <StudioIcon name="more" />
          </button>
        </span>
      </div>

      {isFolder && props.expanded && (props.childrenNodes.length > 0 || showsCreateDraft) ? (
        <ul className="project-explorer-children" role="group">
          {showsCreateDraft && props.createDraft ? (
            <ProjectExplorerCreateRow
              draft={props.createDraft}
              depth={props.depth + 1}
              nameLabel={props.labels.nameLabel}
              onChange={(value) => props.onCreateDraftChange?.(value)}
              onSubmit={() => props.onCreateDraftSubmit?.()}
              onCancel={() => props.onCreateDraftCancel?.()}
            />
          ) : null}
          {sortProjectExplorerNodes(props.childrenNodes).map((child) => (
            <ProjectExplorerTreeItem
              key={child.id}
              {...props}
              node={child}
              depth={props.depth + 1}
              expanded={props.expandedFolderIds.has(child.id)}
              file={child.fileId ? props.files[child.fileId] : undefined}
              childrenNodes={(child.children ?? [])
                .map((childId) => props.nodesById.get(childId))
                .filter((candidate): candidate is ProjectExplorerNode => Boolean(candidate))}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
