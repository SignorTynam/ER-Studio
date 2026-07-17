import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { DragEvent, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import type { ProjectOpenTab, ProjectWorkspaceFile } from "../../types/projectExplorer";
import { useI18n } from "../../i18n/useI18n";
import { StudioIcon, type StudioIconName } from "../icons/StudioIcon";

interface ProjectFileTabsProps {
  tabs: ProjectOpenTab[];
  activeTabId: string | null;
  files: Record<string, ProjectWorkspaceFile>;
  paths?: Record<string, string>;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onCloseOthers?: (tabId: string) => void;
  onCloseToRight?: (tabId: string) => void;
  onCloseAll?: () => void;
  onRevealFile?: (fileId: string) => void;
  onReorder?: (sourceTabId: string, targetTabId: string) => void;
  onNewFile?: () => void;
}

function getFileIcon(file?: ProjectWorkspaceFile): StudioIconName {
  if (!file) return "info";
  if (file.kind === "schema") return "entity";
  if (file.kind === "sql") return "database";
  if (file.kind === "text") return "fileText";
  return "type";
}

function getTabTitle(tab: ProjectOpenTab, files: Record<string, ProjectWorkspaceFile>, welcomeLabel: string): string {
  if (tab.kind === "welcome") return welcomeLabel;
  return tab.fileId ? files[tab.fileId]?.name ?? tab.title : tab.title;
}

export function ProjectFileTabs({
  tabs,
  activeTabId,
  files,
  paths = {},
  onSelectTab,
  onCloseTab,
  onCloseOthers,
  onCloseToRight,
  onCloseAll,
  onRevealFile,
  onReorder,
  onNewFile,
}: ProjectFileTabsProps) {
  const { t } = useI18n();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const openTabsMenuRef = useRef<HTMLDivElement | null>(null);
  const [openTabsMenu, setOpenTabsMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ tabId: string; x: number; y: number } | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateScrollState() {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    setCanScrollLeft(scroller.scrollLeft > 1);
    setCanScrollRight(scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 1);
  }

  useEffect(() => {
    updateScrollState();
    const scroller = scrollerRef.current;
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateScrollState);
    if (scroller) observer?.observe(scroller);
    return () => observer?.disconnect();
  }, [tabs.length]);

  useEffect(() => {
    if (!openTabsMenu && !contextMenu) return undefined;
    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return;
      setOpenTabsMenu(false);
      setContextMenu(null);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenTabsMenu(false);
        setContextMenu(null);
      }
    }
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenu, openTabsMenu]);

  useLayoutEffect(() => {
    if (!contextMenu || !contextMenuRef.current) return;
    const menu = contextMenuRef.current;
    const nextX = Math.min(Math.max(4, contextMenu.x), Math.max(4, window.innerWidth - menu.offsetWidth - 4));
    const nextY = Math.min(Math.max(4, contextMenu.y), Math.max(4, window.innerHeight - menu.offsetHeight - 4));
    if (nextX !== contextMenu.x || nextY !== contextMenu.y) {
      setContextMenu((current) => current ? { ...current, x: nextX, y: nextY } : null);
    }
    menu.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }, [contextMenu?.tabId]);

  useLayoutEffect(() => {
    if (openTabsMenu) {
      openTabsMenuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    }
  }, [openTabsMenu]);

  function closeOthers(tabId: string) {
    if (onCloseOthers) {
      onCloseOthers(tabId);
      return;
    }
    tabs.filter((tab) => tab.id !== tabId).forEach((tab) => onCloseTab(tab.id));
  }

  function closeToRight(tabId: string) {
    if (onCloseToRight) {
      onCloseToRight(tabId);
      return;
    }
    const index = tabs.findIndex((tab) => tab.id === tabId);
    tabs.slice(index + 1).forEach((tab) => onCloseTab(tab.id));
  }

  function closeAll() {
    if (onCloseAll) {
      onCloseAll();
      return;
    }
    tabs.forEach((tab) => onCloseTab(tab.id));
  }

  async function copyPath(tab: ProjectOpenTab) {
    const path = tab.fileId ? paths[tab.fileId] : undefined;
    if (!path || typeof navigator === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(path);
  }

  function openContextMenu(tabId: string, event: ReactMouseEvent) {
    event.preventDefault();
    setContextMenu({
      tabId,
      x: event.clientX,
      y: event.clientY,
    });
    setOpenTabsMenu(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, targetTabId: string) {
    event.preventDefault();
    const sourceTabId = event.dataTransfer.getData("application/x-builder-tab");
    if (sourceTabId && sourceTabId !== targetTabId) onReorder?.(sourceTabId, targetTabId);
  }

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
    if (items.length === 0) return;
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

  function handleTabKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, tabId: string) {
    if (event.ctrlKey && event.key.toLowerCase() === "w") {
      event.preventDefault();
      onCloseTab(tabId);
      return;
    }
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index = tabs.findIndex((tab) => tab.id === tabId);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? tabs.length - 1
        : event.key === "ArrowRight"
          ? (index + 1) % tabs.length
          : (index - 1 + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    if (!nextTab) return;
    onSelectTab(nextTab.id);
    requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>(`button[data-tab-id="${nextTab.id}"]`)?.focus());
  }

  const contextTab = contextMenu ? tabs.find((tab) => tab.id === contextMenu.tabId) : undefined;
  const contextIndex = contextTab ? tabs.findIndex((tab) => tab.id === contextTab.id) : -1;

  // Fase D1: queste sono tab-documento in stile editor, non tab ARIA: non
  // esiste alcun tabpanel né aria-controls, quindi role=tab/tablist era
  // semanticamente scorretto (e faceva risultare i bottoni di chiusura figli
  // non ammessi del tablist). Il pattern giusto è la toolbar con roving
  // tabindex e frecce — già implementati — e aria-current per l'attiva.
  return (
    <div ref={rootRef} className="project-file-tabs">
      <div className="project-file-tabs__viewport">
        <div
          ref={scrollerRef}
          className="project-file-tabs__scroller"
          role="toolbar"
          aria-orientation="horizontal"
          aria-label={t("projectTabs.label")}
          onScroll={updateScrollState}
        >
          {tabs.map((tab) => {
            const file = tab.kind === "file" && tab.fileId ? files[tab.fileId] : undefined;
            const title = getTabTitle(tab, files, t("projectTabs.welcome"));
            const active = tab.id === activeTabId;
            const fullPath = tab.fileId ? paths[tab.fileId] ?? title : title;
            return (
              <div
                key={tab.id}
                className={["project-file-tab", active ? "active" : "", tab.dirty ? "dirty" : ""].filter(Boolean).join(" ")}
                draggable={Boolean(onReorder)}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("application/x-builder-tab", tab.id);
                }}
                onDragOver={(event) => {
                  if (onReorder) event.preventDefault();
                }}
                onDrop={(event) => handleDrop(event, tab.id)}
                onContextMenu={(event) => openContextMenu(tab.id, event)}
                onMouseDown={(event) => {
                  if (event.button === 1) {
                    event.preventDefault();
                    onCloseTab(tab.id);
                  }
                }}
              >
                <button
                  type="button"
                  data-tab-id={tab.id}
                  tabIndex={active ? 0 : -1}
                  aria-current={active ? "page" : undefined}
                  aria-label={tab.dirty ? `${title}, ${t("projectTabs.unsaved")}` : title}
                  onClick={() => onSelectTab(tab.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
                  title={fullPath}
                >
                  <StudioIcon name={tab.kind === "welcome" ? "info" : getFileIcon(file)} size={15} aria-hidden="true" />
                  <span className="project-file-tab__title">{title}</span>
                  {tab.dirty ? <span className="project-file-tab__dirty" aria-label={t("projectTabs.unsaved")} /> : null}
                </button>
                <button
                  type="button"
                  className="project-file-tab__close"
                  aria-label={t("projectTabs.closeAria", { name: title })}
                  onClick={(event) => {
                    event.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                >
                  <StudioIcon name="close" size={14} aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="project-file-tabs__tools">
        <button
          type="button"
          className="project-file-tabs__tool"
          data-direction="left"
          disabled={!canScrollLeft}
          onClick={() => scrollerRef.current?.scrollBy({ left: -220, behavior: "smooth" })}
          aria-label={t("workspaceChrome.tabs.scrollLeft")}
        >
          <StudioIcon name="arrowLeft" size={15} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="project-file-tabs__tool"
          data-direction="right"
          disabled={!canScrollRight}
          onClick={() => scrollerRef.current?.scrollBy({ left: 220, behavior: "smooth" })}
          aria-label={t("workspaceChrome.tabs.scrollRight")}
        >
          <StudioIcon name="arrowRight" size={15} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="project-file-tabs__tool"
          aria-label={t("workspaceChrome.tabs.openTabs")}
          aria-haspopup="menu"
          aria-expanded={openTabsMenu}
          onClick={() => {
            setOpenTabsMenu((current) => !current);
            setContextMenu(null);
          }}
        >
          <StudioIcon name="list" size={15} aria-hidden="true" />
        </button>
        {onNewFile ? (
          <button type="button" className="project-file-tabs__new" onClick={onNewFile} aria-label={t("projectTabs.newFile")}>
            <StudioIcon name="newProject" size={15} aria-hidden="true" />
          </button>
        ) : null}
        {openTabsMenu ? (
          <div ref={openTabsMenuRef} className="project-file-tabs__open-menu" role="menu" aria-label={t("workspaceChrome.tabs.openTabs")} onKeyDown={handleMenuKeyDown}>
            {tabs.map((tab) => {
              const file = tab.fileId ? files[tab.fileId] : undefined;
              const title = getTabTitle(tab, files, t("projectTabs.welcome"));
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="menuitem"
                  className={tab.id === activeTabId ? "active" : ""}
                  onClick={() => {
                    onSelectTab(tab.id);
                    setOpenTabsMenu(false);
                  }}
                  title={tab.fileId ? paths[tab.fileId] ?? title : title}
                >
                  <StudioIcon name={tab.kind === "welcome" ? "info" : getFileIcon(file)} size={15} aria-hidden="true" />
                  <span>{title}</span>
                  {tab.dirty ? <span className="project-file-tab__dirty" aria-label={t("projectTabs.unsaved")} /> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {contextTab && contextMenu ? (
        <div ref={contextMenuRef} className="project-file-tab-menu" role="menu" style={{ left: contextMenu.x, top: contextMenu.y }} onKeyDown={handleMenuKeyDown}>
          <button type="button" className="project-file-tab-menu__item" role="menuitem" onClick={() => { onCloseTab(contextTab.id); setContextMenu(null); }}>
            <StudioIcon name="close" size={15} aria-hidden="true" />
            <span>{t("workspaceChrome.tabs.close")}</span>
            <span className="project-file-tab-menu__shortcut">Ctrl W</span>
          </button>
          <button type="button" className="project-file-tab-menu__item" role="menuitem" disabled={tabs.length <= 1} onClick={() => { closeOthers(contextTab.id); setContextMenu(null); }}>
            <StudioIcon name="close" size={15} aria-hidden="true" />
            <span>{t("workspaceChrome.tabs.closeOthers")}</span>
          </button>
          <button type="button" className="project-file-tab-menu__item" role="menuitem" disabled={contextIndex < 0 || contextIndex === tabs.length - 1} onClick={() => { closeToRight(contextTab.id); setContextMenu(null); }}>
            <StudioIcon name="arrowRight" size={15} aria-hidden="true" />
            <span>{t("workspaceChrome.tabs.closeRight")}</span>
          </button>
          <button type="button" className="project-file-tab-menu__item" role="menuitem" onClick={() => { closeAll(); setContextMenu(null); }}>
            <StudioIcon name="delete" size={15} aria-hidden="true" />
            <span>{t("workspaceChrome.tabs.closeAll")}</span>
          </button>
          {contextTab.fileId ? (
            <>
              <div className="project-file-tab-menu__separator" role="separator" />
              <button type="button" className="project-file-tab-menu__item" role="menuitem" onClick={() => { onRevealFile?.(contextTab.fileId!); setContextMenu(null); }}>
                <StudioIcon name="panelLeft" size={15} aria-hidden="true" />
                <span>{t("workspaceChrome.revealInExplorer")}</span>
              </button>
              <button type="button" className="project-file-tab-menu__item" role="menuitem" disabled={!paths[contextTab.fileId]} onClick={() => { void copyPath(contextTab); setContextMenu(null); }}>
                <StudioIcon name="copy" size={15} aria-hidden="true" />
                <span>{t("workspaceChrome.tabs.copyPath")}</span>
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
