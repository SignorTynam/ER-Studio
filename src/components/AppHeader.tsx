import { useEffect, useRef } from "react";
import type { MouseEvent, SyntheticEvent } from "react";
import type { EditorMode } from "../types/diagram";

interface AppHeaderProps {
  appTitle: string;
  appVersion: string;
  diagramName: string;
  mode: EditorMode;
  workspaceView: "diagram" | "split" | "code";
  canUndo: boolean;
  canRedo: boolean;
  focusMode: boolean;
  toolRailCollapsed: boolean;
  inspectorCollapsed: boolean;
  onModeChange: (mode: EditorMode) => void;
  onWorkspaceViewChange: (view: "diagram" | "split" | "code") => void;
  onNew: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onSaveErs: () => void;
  onLoad: () => void;
  onLoadErs: () => void;
  onExportPng: () => void;
  onExportSvg: () => void;
  onExample: () => void;
  onAbout: () => void;
  onWhatsNew: () => void;
  onToggleFocusMode: () => void;
  onToggleToolRail: () => void;
  onToggleInspector: () => void;
  onHome?: () => void;
}

export function AppHeader(props: AppHeaderProps) {
  const navRef = useRef<HTMLElement | null>(null);

  function closeAllMenus() {
    if (!navRef.current) {
      return;
    }

    navRef.current.querySelectorAll("details[open]").forEach((group) => group.removeAttribute("open"));
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

  function handleGroupToggle(event: SyntheticEvent<HTMLDetailsElement>) {
    const currentGroup = event.currentTarget;
    if (!currentGroup.open || !navRef.current) {
      return;
    }

    navRef.current.querySelectorAll("details").forEach((group) => {
      if (group !== currentGroup) {
        group.removeAttribute("open");
      }
    });
  }

  function runMenuAction(event: MouseEvent<HTMLButtonElement>, action: () => void) {
    action();
    const group = event.currentTarget.closest("details");
    if (group) {
      group.removeAttribute("open");
    }
  }

  const showsCanvasWorkspaceControls = props.workspaceView !== "code";

  return (
    <header className={props.focusMode ? "app-header focus-mode" : "app-header"}>
      <div className="app-title-block">
        <div className="app-eyebrow">ER workspace</div>
        <div className="app-title-inline">
          <h1>{props.appTitle}</h1>
          <div className="app-version-pill">v{props.appVersion}</div>
        </div>
        <div className="app-subtitle">{props.diagramName}</div>
      </div>

      <div className="header-switches">
        <div className="header-control-group">
          <div className="header-group-label">Vista</div>
          <div className="mode-switch mode-switch-primary" role="group" aria-label="Vista di lavoro">
            <button
              className={props.workspaceView === "diagram" ? "mode-button active" : "mode-button"}
              type="button"
              onClick={() => props.onWorkspaceViewChange("diagram")}
            >
              Diagramma
            </button>
            <button
              className={props.workspaceView === "split" ? "mode-button active" : "mode-button"}
              type="button"
              onClick={() => props.onWorkspaceViewChange("split")}
            >
              Affiancata
            </button>
            <button
              className={props.workspaceView === "code" ? "mode-button active" : "mode-button"}
              type="button"
              onClick={() => props.onWorkspaceViewChange("code")}
            >
              ERS
            </button>
          </div>
        </div>

        <div className="header-control-group">
          <div className="header-group-label">Modalita</div>
          <div className="mode-switch mode-switch-secondary" role="group" aria-label="Modalita editor">
            <button
              className={props.mode === "edit" ? "mode-button active" : "mode-button"}
              type="button"
              onClick={() => props.onModeChange("edit")}
            >
              Modifica
            </button>
            <button
              className={props.mode === "view" ? "mode-button active" : "mode-button"}
              type="button"
              onClick={() => props.onModeChange("view")}
            >
              Lettura
            </button>
          </div>
        </div>
      </div>

      <div className="header-utility-bar">
        <div className="header-control-group header-control-group-actions">
          <div className="header-group-label">Azioni</div>
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
            {showsCanvasWorkspaceControls ? (
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
            ) : null}
          </div>
        </div>

        <div className="header-control-group header-control-group-menu">
          <div className="header-group-label">Workspace</div>
          <nav ref={navRef} className="header-nav" aria-label="Azioni secondarie">
            <details className="nav-group nav-group-menu" onToggle={handleGroupToggle}>
              <summary>Menu</summary>
              <div className="nav-menu nav-menu-wide">
                {showsCanvasWorkspaceControls ? (
                  <div className="nav-menu-section">
                    <div className="nav-menu-label">Workspace</div>
                    <button
                      type="button"
                      onClick={(event) => runMenuAction(event, props.onToggleToolRail)}
                      disabled={props.focusMode}
                    >
                      {props.toolRailCollapsed ? "Apri strumenti" : "Comprimi strumenti"}
                    </button>
                    <button
                      type="button"
                      onClick={(event) => runMenuAction(event, props.onToggleInspector)}
                      disabled={props.focusMode}
                    >
                      {props.inspectorCollapsed ? "Apri contesto" : "Comprimi contesto"}
                    </button>
                  </div>
                ) : null}

                <div className="nav-menu-section">
                  <div className="nav-menu-label">File</div>
                  {props.onHome ? (
                    <button type="button" onClick={(event) => runMenuAction(event, props.onHome as () => void)}>
                      Home
                    </button>
                  ) : null}
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
                  <button type="button" onClick={(event) => runMenuAction(event, props.onExample)}>
                    Carica esempio
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
