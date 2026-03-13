import type { MouseEvent } from "react";
import type { EditorMode } from "../types/diagram";

interface AppHeaderProps {
  diagramName: string;
  mode: EditorMode;
  canUndo: boolean;
  canRedo: boolean;
  onModeChange: (mode: EditorMode) => void;
  onNew: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onLoad: () => void;
  onExportPng: () => void;
  onExportSvg: () => void;
  onExample: () => void;
  onHelp: () => void;
}

export function AppHeader(props: AppHeaderProps) {
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
        <div className="app-eyebrow">Editor Chen accademico</div>
        <h1>ER Diagram Studio</h1>
        <div className="app-subtitle">{props.diagramName}</div>
      </div>

      <nav className="header-nav" aria-label="Azioni principali">
        <details className="nav-group">
          <summary>File</summary>
          <div className="nav-menu">
            <button type="button" onClick={(event) => runMenuAction(event, props.onNew)}>
              Nuovo diagramma
            </button>
            <button type="button" onClick={(event) => runMenuAction(event, props.onSave)}>
              Salva JSON
            </button>
            <button type="button" onClick={(event) => runMenuAction(event, props.onLoad)}>
              Carica JSON
            </button>
            <button type="button" onClick={(event) => runMenuAction(event, props.onExample)}>
              Carica esempio
            </button>
          </div>
        </details>

        <details className="nav-group">
          <summary>Modifica</summary>
          <div className="nav-menu">
            <button type="button" onClick={(event) => runMenuAction(event, props.onUndo)} disabled={!props.canUndo}>
              Undo
            </button>
            <button type="button" onClick={(event) => runMenuAction(event, props.onRedo)} disabled={!props.canRedo}>
              Redo
            </button>
          </div>
        </details>

        <details className="nav-group">
          <summary>Export</summary>
          <div className="nav-menu">
            <button type="button" onClick={(event) => runMenuAction(event, props.onExportPng)}>
              Export PNG
            </button>
            <button type="button" onClick={(event) => runMenuAction(event, props.onExportSvg)}>
              Export SVG
            </button>
          </div>
        </details>

        <details className="nav-group">
          <summary>Aiuto</summary>
          <div className="nav-menu">
            <button type="button" onClick={(event) => runMenuAction(event, props.onHelp)}>
              Apri help
            </button>
          </div>
        </details>
      </nav>

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
          Solo visualizzazione
        </button>
      </div>
    </header>
  );
}

