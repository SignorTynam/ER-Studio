import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { ProjectExplorerNode } from "../../types/projectExplorer";
import { useI18n } from "../../i18n/useI18n";
import { StudioIcon } from "../icons/StudioIcon";

interface ProjectExplorerContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  node: ProjectExplorerNode | null;
  rootId: string;
  canCreateChildren: boolean;
  onOpen: () => void;
  onNewSchema: () => void;
  onNewTextFile: () => void;
  onNewSqlFile: () => void;
  onNewFolder: () => void;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function ProjectExplorerContextMenu({
  open,
  x,
  y,
  node,
  rootId,
  canCreateChildren,
  onOpen,
  onNewSchema,
  onNewTextFile,
  onNewSqlFile,
  onNewFolder,
  onRename,
  onMove,
  onDelete,
  onClose,
}: ProjectExplorerContextMenuProps) {
  const { t } = useI18n();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ left: x, top: y });

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && menuRef.current?.contains(event.target)) {
        return;
      }
      onClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    const viewportWidth = typeof window === "undefined" ? 1024 : window.innerWidth;
    const viewportHeight = typeof window === "undefined" ? 768 : window.innerHeight;
    const menuWidth = menuRef.current?.offsetWidth ?? 260;
    const menuHeight = menuRef.current?.offsetHeight ?? 330;
    setPosition({
      left: Math.min(Math.max(4, x), Math.max(4, viewportWidth - menuWidth - 4)),
      top: Math.min(Math.max(4, y), Math.max(4, viewportHeight - menuHeight - 4)),
    });
    menuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }, [open, x, y]);

  if (!open) {
    return null;
  }

  const canDelete = Boolean(node && node.id !== rootId);
  function run(action: () => void) {
    action();
    onClose();
  }

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      return;
    }
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
    if (items.length === 0) {
      return;
    }
    event.preventDefault();
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? items.length - 1
        : event.key === "ArrowDown"
          ? (currentIndex + 1 + items.length) % items.length
          : (currentIndex - 1 + items.length) % items.length;
    items[nextIndex]?.focus();
  }

  return (
    <div
      ref={menuRef}
      className="project-explorer-context-menu"
      role="menu"
      aria-label={t("workspaceChrome.contextMenuAria")}
      style={position}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={handleMenuKeyDown}
    >
      {node && node.kind !== "folder" ? (
        <div className="project-explorer-context-menu__section">
        <button type="button" className="project-explorer-context-menu__item" role="menuitem" onClick={() => run(onOpen)}>
          <StudioIcon name="openProject" aria-hidden="true" />
          <span>{t("projectExplorer.contextMenu.open")}</span>
        </button>
        </div>
      ) : null}
      {canCreateChildren ? (
        <div className="project-explorer-context-menu__section">
          <button type="button" className="project-explorer-context-menu__item" role="menuitem" onClick={() => run(onNewSchema)}>
          <StudioIcon name="schema" aria-hidden="true" />
          <span>{t("projectExplorer.contextMenu.newSchema")}</span>
          <span className="project-explorer-context-menu__shortcut">S</span>
          </button>
          <button type="button" className="project-explorer-context-menu__item" role="menuitem" onClick={() => run(onNewTextFile)}>
          <StudioIcon name="fileText" aria-hidden="true" />
          <span>{t("projectExplorer.contextMenu.newTextFile")}</span>
          <span className="project-explorer-context-menu__shortcut">T</span>
          </button>
          <button type="button" className="project-explorer-context-menu__item" role="menuitem" onClick={() => run(onNewSqlFile)}>
          <StudioIcon name="database" aria-hidden="true" />
          <span>{t("projectExplorer.contextMenu.newSqlFile")}</span>
          <span className="project-explorer-context-menu__shortcut">Q</span>
          </button>
          <button type="button" className="project-explorer-context-menu__item" role="menuitem" onClick={() => run(onNewFolder)}>
            <StudioIcon name="folderPlus" aria-hidden="true" />
            <span>{t("projectExplorer.contextMenu.newFolder")}</span>
          </button>
        </div>
      ) : null}
      {node ? (
        <>
          <div className="project-explorer-context-menu__separator" role="separator" />
          <div className="project-explorer-context-menu__section">
          <button type="button" className="project-explorer-context-menu__item" role="menuitem" onClick={() => run(onRename)}>
            <StudioIcon name="rename" aria-hidden="true" />
            <span>{t("projectExplorer.contextMenu.rename")}</span>
            <span className="project-explorer-context-menu__shortcut">F2</span>
          </button>
          <button type="button" className="project-explorer-context-menu__item" role="menuitem" disabled={!canDelete} onClick={() => run(onMove)}>
            <StudioIcon name="move" aria-hidden="true" />
            <span>{t("projectExplorer.contextMenu.moveTo")}</span>
          </button>
          <button
            type="button"
            className="project-explorer-context-menu__item project-explorer-context-menu__danger"
            role="menuitem"
            disabled={!canDelete}
            onClick={() => run(onDelete)}
          >
            <StudioIcon name="delete" aria-hidden="true" />
            <span>{t("projectExplorer.contextMenu.delete")}</span>
            <span className="project-explorer-context-menu__shortcut">Del</span>
          </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
