import { useEffect, useRef } from "react";
import type { MouseEvent } from "react";
import type { SyntheticEvent } from "react";
import type { EditorMode } from "../types/diagram";

interface AppHeaderProps {
  appTitle: string;
  appVersion: string;
  diagramName: string;
  mode: EditorMode;
  workspaceView: "diagram" | "split" | "code";
  canUndo: boolean;
  canRedo: boolean;
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
  onHome?: () => void;
}

const WORKSPACE_VIEW_LABEL: Record<AppHeaderProps["workspaceView"], string> = {
  diagram: "Diagramma",
  split: "Affiancata",
  code: "Codice",
};

const EDITOR_MODE_LABEL: Record<EditorMode, string> = {
  edit: "Modifica",
  view: "Solo lettura",
};

export function AppHeader(props: AppHeaderProps) {
  const navRef = useRef<HTMLElement | null>(null);

  function closeAllMenus() {
    if (!navRef.current) {
      return;
    }

    const openGroups = navRef.current.querySelectorAll("details[open]");
    openGroups.forEach((group) => group.removeAttribute("open"));
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

    const groups = navRef.current.querySelectorAll("details");
    groups.forEach((group) => {
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

  return (
    <header className="app-header">
      <div className="app-title-block">
        <div className="app-eyebrow">Workspace operativo</div>
        <h1>{props.appTitle}</h1>
        <div className="app-title-meta">
          <div className="app-subtitle">{props.diagramName}</div>
          <div className="app-version-pill">Versione {props.appVersion}</div>
        </div>
      </div>

      <div className="header-status-strip" aria-label="Stato workspace">
        <div className="header-status-card">
          <span>Vista</span>
          <strong>{WORKSPACE_VIEW_LABEL[props.workspaceView]}</strong>
        </div>
        <div className="header-status-card">
          <span>Modalita</span>
          <strong>{EDITOR_MODE_LABEL[props.mode]}</strong>
        </div>
      </div>

      <nav ref={navRef} className="header-nav" aria-label="Azioni principali">
        {props.onHome ? (
          <button type="button" className="header-button" onClick={props.onHome}>
            Inizio
          </button>
        ) : null}

        <details className="nav-group" onToggle={handleGroupToggle}>
          <summary>File</summary>
          <div className="nav-menu">
            <button type="button" onClick={(event) => runMenuAction(event, props.onNew)}>
              Nuovo diagramma
            </button>
            <button type="button" onClick={(event) => runMenuAction(event, props.onSave)}>
              Salva JSON
            </button>
            <button type="button" onClick={(event) => runMenuAction(event, props.onSaveErs)}>
              Scarica ERS
            </button>
            <button type="button" onClick={(event) => runMenuAction(event, props.onLoad)}>
              Carica JSON
            </button>
            <button type="button" onClick={(event) => runMenuAction(event, props.onLoadErs)}>
              Carica ERS
            </button>
            <button type="button" onClick={(event) => runMenuAction(event, props.onExample)}>
              Carica esempio
            </button>
          </div>
        </details>

        <details className="nav-group" onToggle={handleGroupToggle}>
          <summary>Modifica</summary>
          <div className="nav-menu">
            <button type="button" onClick={(event) => runMenuAction(event, props.onUndo)} disabled={!props.canUndo}>
              Annulla
            </button>
            <button type="button" onClick={(event) => runMenuAction(event, props.onRedo)} disabled={!props.canRedo}>
              Ripeti
            </button>
          </div>
        </details>

        <details className="nav-group" onToggle={handleGroupToggle}>
          <summary>Esporta</summary>
          <div className="nav-menu">
            <button type="button" onClick={(event) => runMenuAction(event, props.onExportPng)}>
              Esporta PNG
            </button>
            <button type="button" onClick={(event) => runMenuAction(event, props.onExportSvg)}>
              Esporta SVG
            </button>
          </div>
        </details>

        <details className="nav-group" onToggle={handleGroupToggle}>
          <summary>Guida</summary>
          <div className="nav-menu">
            <button type="button" onClick={(event) => runMenuAction(event, props.onAbout)}>
              Informazioni
            </button>
            <button type="button" onClick={(event) => runMenuAction(event, props.onWhatsNew)}>
              Novita
            </button>
          </div>
        </details>
      </nav>

      <div className="header-switches">
        <div className="mode-switch" role="group" aria-label="Vista di lavoro">
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

        <div className="mode-switch" role="group" aria-label="Modalita editor">
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
            Solo lettura
          </button>
        </div>
      </div>
    </header>
  );
}
