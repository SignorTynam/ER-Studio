import type { DiagramEdge, DiagramNode, EditorMode, ToolKind } from "../types/diagram";
import { TOOL_DEFINITIONS } from "../utils/toolConfig";

const PRIMARY_TOOLS: ToolKind[] = ["select", "move", "entity", "relationship", "connector", "inheritance", "text"];

interface ToolbarProps {
  activeTool: ToolKind;
  mode: EditorMode;
  collapsed: boolean;
  canUndo: boolean;
  canRedo: boolean;
  selectionItemCount: number;
  selectedNode?: DiagramNode;
  selectedEdge?: DiagramEdge;
  onToolChange: (tool: ToolKind) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDuplicateSelection: () => void;
  onDeleteSelection: () => void;
  onCreateAttributeForSelection: () => void;
  onRenameSelection: () => void;
  onToggleCollapse: () => void;
}

function ToolIcon({ tool }: { tool: ToolKind }) {
  if (tool === "select") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <path d="M5 4l7.6 14.8 1.8-5.4 5.6-1.9L5 4z" fill="currentColor" />
      </svg>
    );
  }

  if (tool === "move") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <path d="M12 3l2.6 2.6H13v3h-2v-3H9.4L12 3zm0 18l-2.6-2.6H11v-3h2v3h1.6L12 21zM3 12l2.6-2.6V11h3v2h-3v1.6L3 12zm18 0l-2.6 2.6V13h-3v-2h3V9.4L21 12z" fill="currentColor" />
      </svg>
    );
  }

  if (tool === "entity") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <rect x="4" y="6" width="16" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (tool === "relationship") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <polygon points="12,4 20,12 12,20 4,12" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (tool === "connector") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <path d="M5 8h6v8h8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (tool === "inheritance") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <path d="M12 19V8" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8.5 11L12 7l3.5 4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (tool === "text") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <path d="M6 6h12M12 6v12" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
      <path d="M5 5l7 14 2-6 6-2z" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ActionIcon({ kind }: { kind: "undo" | "redo" | "rename" | "delete" | "duplicate" | "attribute" }) {
  if (kind === "undo") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <path d="M9 7L4 12l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 12h8a5 5 0 010 10h-2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (kind === "redo") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <path d="M15 7l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M19 12h-8a5 5 0 000 10h2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (kind === "rename") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <path d="M4 20h4l10-10-4-4L4 16v4z" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 6l4 4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (kind === "delete") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <path d="M6 7h12M9 7V5h6v2M8 9l1 10h6l1-10" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (kind === "duplicate") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <rect x="8" y="8" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <rect x="4" y="4" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
      <circle cx="8" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <line x1="11.5" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="1.8" />
      <line x1="15.5" y1="8" x2="15.5" y2="16" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function getContextLabel(selectedNode?: DiagramNode, selectedEdge?: DiagramEdge, selectionItemCount?: number) {
  if (selectedNode) {
    if (selectedNode.type === "entity") {
      return "Entita selezionata";
    }

    if (selectedNode.type === "relationship") {
      return "Associazione selezionata";
    }

    if (selectedNode.type === "attribute") {
      return "Attributo selezionato";
    }

    return "Testo selezionato";
  }

  if (selectedEdge) {
    return "Collegamento selezionato";
  }

  if ((selectionItemCount ?? 0) > 1) {
    return "Selezione multipla";
  }

  return "Canvas";
}

function getContextDescription(selectedNode?: DiagramNode, selectedEdge?: DiagramEdge, selectionItemCount?: number) {
  if (selectedNode?.type === "entity") {
    return "Mostra azioni rapide e impostazioni dedicate all'entita corrente.";
  }

  if (selectedNode?.type === "relationship") {
    return "Lavora sull'associazione e aggiungi solo gli attributi collegati a questa relazione.";
  }

  if (selectedNode?.type === "attribute") {
    return "Vedi solo le opzioni dell'attributo attivo e, se serve, crea un sotto-attributo.";
  }

  if (selectedNode?.type === "text") {
    return "Modifica il contenuto testuale senza rumore visivo aggiuntivo.";
  }

  if (selectedEdge) {
    return "Configura solo il collegamento attivo.";
  }

  if ((selectionItemCount ?? 0) > 1) {
    return "Azioni di gruppo per riallineare o pulire la selezione.";
  }

  return "Pochi strumenti visibili: scegli un elemento e poi lavora nel suo contesto.";
}

export function Toolbar(props: ToolbarProps) {
  const availableTools = PRIMARY_TOOLS.reduce<typeof TOOL_DEFINITIONS>((result, tool) => {
    const match = TOOL_DEFINITIONS.find((item) => item.tool === tool);
    if (match) {
      result.push(match);
    }
    return result;
  }, []);
  const canEditSelection = props.mode !== "view" && props.selectionItemCount > 0;
  const canCreateAttribute =
    props.mode !== "view" &&
    !!props.selectedNode &&
    (props.selectedNode.type === "entity" ||
      props.selectedNode.type === "relationship" ||
      props.selectedNode.type === "attribute");
  const attributeActionLabel =
    props.selectedNode?.type === "attribute" ? "Aggiungi sotto-attributo" : "Aggiungi attributo";

  return (
    <aside className={props.collapsed ? "toolbar-panel collapsed" : "toolbar-panel"}>
      <div className={props.collapsed ? "panel-head-row panel-head-row-compact" : "panel-head-row"}>
        {!props.collapsed ? (
          <div>
            <div className="panel-heading">{getContextLabel(props.selectedNode, props.selectedEdge, props.selectionItemCount)}</div>
            <p className="panel-subheading">
              {getContextDescription(props.selectedNode, props.selectedEdge, props.selectionItemCount)}
            </p>
          </div>
        ) : null}
        <button
          type="button"
          className="panel-toggle"
          onClick={props.onToggleCollapse}
          aria-label={props.collapsed ? "Espandi pannello azioni" : "Comprimi pannello azioni"}
          title={props.collapsed ? "Espandi" : "Comprimi"}
        >
          {props.collapsed ? ">" : "<"}
        </button>
      </div>

      <section className="toolbar-section">
        <div className="toolbar-section-label">Cronologia</div>
        <div className="toolbar-list toolbar-list-tight">
          <button
            type="button"
            className="toolbar-action-button"
            onClick={props.onUndo}
            disabled={!props.canUndo}
            aria-label="Annulla"
            title="Annulla"
          >
            <ActionIcon kind="undo" />
            <span className="tool-label">Annulla</span>
          </button>
          <button
            type="button"
            className="toolbar-action-button"
            onClick={props.onRedo}
            disabled={!props.canRedo}
            aria-label="Ripeti"
            title="Ripeti"
          >
            <ActionIcon kind="redo" />
            <span className="tool-label">Ripeti</span>
          </button>
        </div>
      </section>

      {props.selectionItemCount > 0 ? (
        <section className="toolbar-section toolbar-section-context">
          <div className="toolbar-section-label">Selezione</div>
          <div className="toolbar-list toolbar-list-tight">
            {canCreateAttribute ? (
              <button
                type="button"
                className="toolbar-action-button accent"
                onClick={props.onCreateAttributeForSelection}
                title={attributeActionLabel}
              >
                <ActionIcon kind="attribute" />
                <span className="tool-label">{attributeActionLabel}</span>
              </button>
            ) : null}
            {(props.selectedNode || props.selectedEdge) ? (
              <button
                type="button"
                className="toolbar-action-button"
                onClick={props.onRenameSelection}
                disabled={props.mode === "view"}
                title="Rinomina"
              >
                <ActionIcon kind="rename" />
                <span className="tool-label">Rinomina</span>
              </button>
            ) : null}
            <button
              type="button"
              className="toolbar-action-button"
              onClick={props.onDuplicateSelection}
              disabled={!canEditSelection}
              title="Duplica"
            >
              <ActionIcon kind="duplicate" />
              <span className="tool-label">Duplica</span>
            </button>
            <button
              type="button"
              className="toolbar-action-button destructive"
              onClick={props.onDeleteSelection}
              disabled={!canEditSelection}
              title="Elimina"
            >
              <ActionIcon kind="delete" />
              <span className="tool-label">Elimina</span>
            </button>
          </div>
        </section>
      ) : null}

      <section className="toolbar-section">
        <div className="toolbar-section-label">Strumenti base</div>
        <div className="toolbar-list">
          {availableTools.map((item) => {
            const disabled = props.mode === "view" && item.tool !== "select" && item.tool !== "move";
            return (
              <button
                key={item.tool}
                type="button"
                className={props.activeTool === item.tool ? "tool-button active" : "tool-button"}
                onClick={() => props.onToolChange(item.tool)}
                disabled={disabled}
                title={`${item.label} (${item.shortcut.toUpperCase()})`}
                aria-label={item.label}
              >
                <ToolIcon tool={item.tool} />
                <span className="tool-label">{item.label}</span>
                <span className="tool-shortcut">{item.shortcut.toUpperCase()}</span>
              </button>
            );
          })}
        </div>
      </section>
    </aside>
  );
}
