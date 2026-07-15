import { useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import type { ProjectExplorerNode, ProjectWorkspaceFile } from "../../types/projectExplorer";
import { StudioIcon, type StudioIconName } from "../icons/StudioIcon";

export type ProjectExplorerCreateKind = "schema" | "sql" | "text" | "folder";

export interface ProjectExplorerCreateDraft {
  parentId: string;
  kind: ProjectExplorerCreateKind;
  value: string;
  error: string;
}

interface ProjectExplorerTreeItemProps {
  node: ProjectExplorerNode;
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
  onRename: (nodeId: string, nextName?: string) => void | Promise<void>;
  onDelete: (nodeId: string) => void;
  onCreateSchema: (parentId: string) => void;
  onCreateTextFile: (parentId: string) => void;
  onCreateSqlFile?: (parentId: string) => void;
  onCreateFolder: (parentId: string) => void;
  onCreateDraftChange?: (value: string) => void;
  onCreateDraftSubmit?: () => void;
  onCreateDraftCancel?: () => void;
}

function getProjectNodeIcon(node: ProjectExplorerNode): StudioIconName {
  if (node.kind === "folder") {
    return "openProject";
  }
  if (node.kind === "schema") {
    return "entity";
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
  if (kind === "folder") return "openProject";
  if (kind === "schema") return "entity";
  if (kind === "sql") return "database";
  return "fileText";
}

function getProjectFileExtensionLabel(node: ProjectExplorerNode, file?: ProjectWorkspaceFile): string {
  if (node.kind === "folder") {
    return "";
  }

  const name = file?.name ?? node.name;
  if (node.kind === "schema") {
    return ".erschema";
  }
  if (node.kind === "sql") {
    return ".sql";
  }
  if (node.kind === "text") {
    return ".txt";
  }

  const extension = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  return extension || "file";
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
  const extensionLabel = getProjectFileExtensionLabel(props.node, props.file);
  const rowClassName = [
    "project-explorer-item",
    isFolder ? "folder" : "file",
    isActive ? "active" : "",
    isSelected ? "selected" : "",
    isDirty ? "dirty" : "",
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
    const tree = document.querySelector<HTMLElement>('.project-explorer-tree[role="tree"]');
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
      } else if (props.node.parentId) {
        const parent = document.querySelector<HTMLElement>(`[role="treeitem"][data-project-node-id="${props.node.parentId}"]`);
        parent?.focus();
        props.onSelectNode(props.node.parentId);
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
    <li className="project-explorer-node">
      <div
        className={rowClassName}
        style={{ "--project-explorer-depth": props.depth } as CSSProperties}
        role="treeitem"
        tabIndex={isSelected || (!props.selectedNodeId && props.depth === 0) ? 0 : -1}
        data-project-node-id={props.node.id}
        aria-expanded={isFolder ? props.expanded : undefined}
        aria-selected={isSelected}
        aria-current={isActive ? "page" : undefined}
        aria-label={`${props.node.name}, ${props.labels.fileKinds[props.node.kind] ?? props.labels.fileKinds.file}`}
        onContextMenu={(event) => props.onContextMenu(props.node, event)}
        onKeyDown={handleKeyDown}
        onClick={() => props.onSelectNode(props.node.id)}
        onDoubleClick={activateNode}
      >
        <div className="project-explorer-item__main">
          {isFolder ? (
            <button
              type="button"
              className="project-explorer-item__chevron"
              aria-label={props.expanded ? props.labels.collapseFolder : props.labels.expandFolder}
              onClick={(event) => stopAndRun(event, () => props.onToggleFolder(props.node.id))}
            >
              <StudioIcon name={props.expanded ? "arrowDown" : "arrowRight"} aria-hidden="true" />
            </button>
          ) : (
            <span className="project-explorer-item__chevron" aria-hidden="true" />
          )}
          <span className="project-explorer-item__icon" aria-hidden="true">
            <StudioIcon name={getProjectNodeIcon(props.node)} />
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
            <span className="project-explorer-item__name" title={props.node.name}>{props.node.name}</span>
          )}
          {!renaming && extensionLabel ? <span className="project-explorer-item__extension">{extensionLabel}</span> : null}
          {isDirty ? <span className="project-explorer-item__dirty" aria-label={props.labels.modified} /> : null}
        </div>
        <span className="project-explorer-item__actions">
          {isFolder ? (
            <>
              <button
                type="button"
                aria-label={props.labels.newSchema}
                title={props.labels.newSchema}
                onClick={(event) => stopAndRun(event, () => props.onCreateSchema(props.node.id))}
              >
                <StudioIcon name="newProject" />
              </button>
              <button
                type="button"
                aria-label={props.labels.newFolder}
                title={props.labels.newFolder}
                onClick={(event) => stopAndRun(event, () => props.onCreateFolder(props.node.id))}
              >
                <StudioIcon name="folderPlus" />
              </button>
            </>
          ) : null}
          <button
            type="button"
            aria-label={props.labels.rename}
            title={props.labels.rename}
            onClick={(event) => stopAndRun(event, startRename)}
          >
            <StudioIcon name="rename" />
          </button>
          <button
            type="button"
            aria-label={props.labels.delete}
            title={props.labels.delete}
            onClick={(event) => stopAndRun(event, () => props.onDelete(props.node.id))}
          >
            <StudioIcon name="delete" />
          </button>
        </span>
      </div>

      {isFolder && props.expanded && (props.childrenNodes.length > 0 || showsCreateDraft) ? (
        <ul className="project-explorer-children" role="group">
          {showsCreateDraft && props.createDraft ? (
            <li className="project-explorer-node project-explorer-node--create">
              <div
                className="project-explorer-item project-explorer-item--create selected"
                style={{ "--project-explorer-depth": props.depth + 1 } as CSSProperties}
                role="treeitem"
                aria-selected="true"
              >
                <span className="project-explorer-item__chevron" aria-hidden="true" />
                <span className="project-explorer-item__icon" aria-hidden="true">
                  <StudioIcon name={getCreateDraftIcon(props.createDraft.kind)} />
                </span>
                <span className="project-explorer-item__rename-wrap">
                  <input
                    className="project-explorer-item__rename"
                    autoFocus
                    value={props.createDraft.value}
                    aria-label={props.labels.nameLabel}
                    aria-invalid={Boolean(props.createDraft.error)}
                    onFocus={(event) => {
                      const extensionIndex = props.createDraft?.kind === "folder" ? -1 : event.currentTarget.value.lastIndexOf(".");
                      event.currentTarget.setSelectionRange(0, extensionIndex > 0 ? extensionIndex : event.currentTarget.value.length);
                    }}
                    onChange={(event) => props.onCreateDraftChange?.(event.target.value)}
                    onKeyDown={(event) => {
                      event.stopPropagation();
                      if (event.key === "Enter") {
                        event.preventDefault();
                        props.onCreateDraftSubmit?.();
                      } else if (event.key === "Escape") {
                        event.preventDefault();
                        props.onCreateDraftCancel?.();
                      }
                    }}
                  />
                  {props.createDraft.error ? (
                    <span className="project-explorer-item__rename-error" role="alert">{props.createDraft.error}</span>
                  ) : null}
                </span>
              </div>
            </li>
          ) : null}
          {props.childrenNodes.map((child) => (
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
