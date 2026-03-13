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

function ActionButton(props: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button className="header-button" type="button" onClick={props.onClick} disabled={props.disabled}>
      {props.label}
    </button>
  );
}

export function AppHeader(props: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-title-block">
        <div className="app-eyebrow">Editor Chen accademico</div>
        <h1>ER Diagram Studio</h1>
        <div className="app-subtitle">{props.diagramName}</div>
      </div>

      <div className="header-actions">
        <ActionButton label="Nuovo diagramma" onClick={props.onNew} />
        <ActionButton label="Undo" onClick={props.onUndo} disabled={!props.canUndo} />
        <ActionButton label="Redo" onClick={props.onRedo} disabled={!props.canRedo} />
        <ActionButton label="Salva JSON" onClick={props.onSave} />
        <ActionButton label="Carica JSON" onClick={props.onLoad} />
        <ActionButton label="Export PNG" onClick={props.onExportPng} />
        <ActionButton label="Export SVG" onClick={props.onExportSvg} />
        <ActionButton label="Carica esempio" onClick={props.onExample} />
        <ActionButton label="Help" onClick={props.onHelp} />
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
          Solo visualizzazione
        </button>
      </div>
    </header>
  );
}

