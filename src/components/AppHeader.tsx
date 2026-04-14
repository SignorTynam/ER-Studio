import { useEffect, useRef, useState } from "react";
import type { MouseEvent, SyntheticEvent } from "react";
import type { EditorMode } from "../types/diagram";

type DiagramWorkspaceView = "er" | "logical";

interface AppHeaderProps {
  appTitle: string;
  appVersion: string;
  diagramName: string;
  diagramView: DiagramWorkspaceView;
  codePanelOpen: boolean;
  notesPanelOpen: boolean;
  mode: EditorMode;
  canUndo: boolean;
  canRedo: boolean;
  logicalOutOfDate: boolean;
  focusMode: boolean;
  toolRailCollapsed: boolean;
  onDiagramViewChange: (view: DiagramWorkspaceView) => void;
  onModeChange: (mode: EditorMode) => void;
  onNew: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onGenerateLogicalModel: () => void;
  onAutoLayoutLogical: () => void;
  onFitLogical: () => void;
  onToggleCodePanel: () => void;
  onToggleNotesPanel: () => void;
  onSave: () => void;
  onSaveErs: () => void;
  onLoad: () => void;
  onLoadErs: () => void;
  onExportPng: () => void;
  onExportSvg: () => void;
  onResetErs: () => void;
  onOpenErsGuide: () => void;
  onAbout: () => void;
  onWhatsNew: () => void;
  onToggleFocusMode: () => void;
  onToggleToolRail: () => void;
}

export function AppHeader(props: AppHeaderProps) {
  const navRef = useRef<HTMLElement | null>(null);
  const menuGroupRef = useRef<HTMLDetailsElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  function updateMenuPosition() {
    const menuGroup = menuGroupRef.current;
    if (!menuGroup?.open) {
      setMenuStyle(null);
      return;
    }

    const summary = menuGroup.querySelector("summary");
    if (!summary) {
      return;
    }

    const viewportPadding = 12;
    const triggerRect = summary.getBoundingClientRect();
    const width = Math.min(360, Math.max(280, window.innerWidth - viewportPadding * 2));
    const left = Math.max(
      viewportPadding,
      Math.min(triggerRect.right - width, window.innerWidth - width - viewportPadding),
    );
    const top = triggerRect.bottom + 8;
    const maxHeight = Math.max(220, window.innerHeight - top - viewportPadding);

    setMenuStyle({ top, left, width, maxHeight });
  }

  function closeAllMenus() {
    if (!navRef.current) {
      return;
    }

    navRef.current.querySelectorAll("details[open]").forEach((group) => group.removeAttribute("open"));
    setMenuStyle(null);
  }

  useEffect(() => {
    function handleGlobalPointerDown(event: globalThis.MouseEvent) {
      if (!navRef.current) {
        return;
      }

      const target = event.target as Node | null;
      if (target && !navRef.current.contains(target)) {
        closeAllMenus();
      }
    }

    function handleGlobalKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeAllMenus();
      }
    }

    document.addEventListener("mousedown", handleGlobalPointerDown);
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleGlobalPointerDown);
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, []);

  useEffect(() => {
    function handleViewportChange() {
      updateMenuPosition();
    }

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, []);

  function handleGroupToggle(event: SyntheticEvent<HTMLDetailsElement>) {
    const currentGroup = event.currentTarget;
    if (!currentGroup.open || !navRef.current) {
      if (currentGroup === menuGroupRef.current) {
        setMenuStyle(null);
      }
      return;
    }

    navRef.current.querySelectorAll("details").forEach((group) => {
      if (group !== currentGroup) {
        group.removeAttribute("open");
      }
    });

    if (currentGroup === menuGroupRef.current) {
      window.requestAnimationFrame(() => {
        updateMenuPosition();
      });
    }
  }

  function runMenuAction(event: MouseEvent<HTMLButtonElement>, action: () => void) {
    action();
    const group = event.currentTarget.closest("details");
    if (group) {
      group.removeAttribute("open");
    }
  }

  return (
    <header className={props.focusMode ? "app-header focus-mode" : "app-header"}>
      <div className="app-title-block">
        <div className="app-title-inline">
          <h1>{props.appTitle}</h1>
          <div className="app-version-pill">v{props.appVersion}</div>
        </div>
        <div className="app-subtitle">{props.diagramName}</div>
      </div>

      <div className="header-switches">
        <div className="header-control-group">
          <div className="mode-switch mode-switch-primary" role="group" aria-label="Vista diagramma">
            <button
              className={props.diagramView === "er" ? "mode-button active" : "mode-button"}
              type="button"
              onClick={() => props.onDiagramViewChange("er")}
            >
              ER
            </button>
            <button
              className={props.diagramView === "logical" ? "mode-button active" : "mode-button"}
              type="button"
              onClick={() => props.onDiagramViewChange("logical")}
            >
              Logica
            </button>
          </div>
        </div>

        <div className="header-control-group">
          <div className="mode-switch mode-switch-secondary" role="group" aria-label="Modalita editor">
            <button
              className={props.mode === "edit" && props.diagramView === "er" ? "mode-button active" : "mode-button"}
              type="button"
              onClick={() => props.onModeChange("edit")}
              disabled={props.diagramView !== "er"}
            >
              Modifica
            </button>
            <button
              className={props.mode === "view" && props.diagramView === "er" ? "mode-button active" : "mode-button"}
              type="button"
              onClick={() => props.onModeChange("view")}
              disabled={props.diagramView !== "er"}
            >
              Lettura
            </button>
          </div>
        </div>
      </div>

      <div className="header-utility-bar">
        <div className="header-control-group header-control-group-actions">
          <div className="header-quick-actions" role="group" aria-label="Azioni rapide workspace">
            <button
              type="button"
              className="header-button header-quick-button"
              onClick={props.onUndo}
              disabled={!props.canUndo}
              title="Annulla"
            >
              Annulla
            </button>
            <button
              type="button"
              className="header-button header-quick-button"
              onClick={props.onRedo}
              disabled={!props.canRedo}
              title="Ripeti"
            >
              Ripeti
            </button>
            {props.diagramView === "er" ? (
              <>
                <button
                  type="button"
                  className={
                    props.codePanelOpen
                      ? "header-button header-quick-button active"
                      : "header-button header-quick-button"
                  }
                  onClick={props.onToggleCodePanel}
                  title={props.codePanelOpen ? "Nascondi pannello codice" : "Mostra pannello codice"}
                >
                  {props.codePanelOpen ? "Hide code" : "Show code"}
                </button>
                <button
                  type="button"
                  className={
                    props.notesPanelOpen
                      ? "header-button header-quick-button active"
                      : "header-button header-quick-button"
                  }
                  onClick={props.onToggleNotesPanel}
                  title={props.notesPanelOpen ? "Nascondi notes" : "Mostra notes"}
                >
                  {props.notesPanelOpen ? "Hide notes" : "Show notes"}
                </button>
              </>
            ) : null}
            {props.diagramView === "logical" ? (
              <>
                <button
                  type="button"
                  className="header-button header-quick-button"
                  onClick={props.onGenerateLogicalModel}
                  title={props.logicalOutOfDate ? "Rigenera modello logico aggiornato" : "Rigenera modello logico"}
                >
                  {props.logicalOutOfDate ? "Rigenera*" : "Rigenera"}
                </button>
                <button
                  type="button"
                  className="header-button header-quick-button"
                  onClick={props.onAutoLayoutLogical}
                  title="Organizza automaticamente le tabelle"
                >
                  Layout auto
                </button>
                <button
                  type="button"
                  className="header-button header-quick-button"
                  onClick={props.onFitLogical}
                  title="Adatta il modello logico al viewport"
                >
                  Adatta
                </button>
              </>
            ) : null}
            <button
              type="button"
              className={
                props.focusMode
                  ? "header-button header-quick-button active"
                  : "header-button header-quick-button"
              }
              onClick={props.onToggleFocusMode}
              title={props.focusMode ? "Esci dalla modalita focus" : "Attiva modalita focus"}
            >
              {props.focusMode ? "Esci focus" : "Focus"}
            </button>
          </div>
        </div>

        <div className="header-control-group header-control-group-menu">
          <nav ref={navRef} className="header-nav" aria-label="Azioni secondarie">
            <details ref={menuGroupRef} className="nav-group nav-group-menu" onToggle={handleGroupToggle}>
              <summary>Menu</summary>
              <div
                className="nav-menu nav-menu-wide nav-menu-floating"
                style={
                  menuStyle
                    ? {
                        top: `${menuStyle.top}px`,
                        left: `${menuStyle.left}px`,
                        width: `${menuStyle.width}px`,
                        maxHeight: `${menuStyle.maxHeight}px`,
                      }
                    : { visibility: "hidden" }
                }
              >
                <div className="nav-menu-section">
                  <div className="nav-menu-label">Workspace</div>
                  <button
                    type="button"
                    onClick={(event) => runMenuAction(event, props.onToggleToolRail)}
                    disabled={props.focusMode}
                  >
                    {props.toolRailCollapsed ? "Apri strumenti" : "Comprimi strumenti"}
                  </button>
                  <button type="button" onClick={(event) => runMenuAction(event, props.onResetErs)}>
                    Rigenera ERS
                  </button>
                </div>

                <div className="nav-menu-section">
                  <div className="nav-menu-label">File</div>
                  <button type="button" onClick={(event) => runMenuAction(event, props.onNew)}>
                    Nuovo diagramma
                  </button>
                  <button type="button" onClick={(event) => runMenuAction(event, props.onLoad)}>
                    Carica JSON
                  </button>
                  <button type="button" onClick={(event) => runMenuAction(event, props.onLoadErs)}>
                    Carica ERS
                  </button>
                  <button type="button" onClick={(event) => runMenuAction(event, props.onSave)}>
                    Salva JSON
                  </button>
                  <button type="button" onClick={(event) => runMenuAction(event, props.onSaveErs)}>
                    Scarica ERS
                  </button>
                </div>

                <div className="nav-menu-section">
                  <div className="nav-menu-label">Esporta</div>
                  <button type="button" onClick={(event) => runMenuAction(event, props.onExportPng)}>
                    PNG
                  </button>
                  <button type="button" onClick={(event) => runMenuAction(event, props.onExportSvg)}>
                    SVG
                  </button>
                </div>

                <div className="nav-menu-section">
                  <div className="nav-menu-label">Aiuto</div>
                  <button type="button" onClick={(event) => runMenuAction(event, props.onOpenErsGuide)}>
                    Guida ERS
                  </button>
                  <button type="button" onClick={(event) => runMenuAction(event, props.onAbout)}>
                    Informazioni
                  </button>
                  <button type="button" onClick={(event) => runMenuAction(event, props.onWhatsNew)}>
                    Novita
                  </button>
                </div>
              </div>
            </details>
          </nav>
        </div>
      </div>
    </header>
  );
}
