import type {
  DiagramDocument,
  DiagramEdge,
  DiagramNode,
  EditorMode,
  SelectionState,
  ValidationIssue,
} from "../types/diagram";

interface InspectorPanelProps {
  diagram: DiagramDocument;
  selection: SelectionState;
  mode: EditorMode;
  issues: ValidationIssue[];
  onNodeChange: (nodeId: string, patch: Partial<DiagramNode>) => void;
  onEdgeChange: (edgeId: string, patch: Partial<DiagramEdge>) => void;
  onDeleteSelection: () => void;
  onDuplicateSelection: () => void;
  onAlign: (axis: "left" | "center" | "top" | "middle") => void;
}

function numberValue(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function InspectorPanel(props: InspectorPanelProps) {
  const selectedNode =
    props.selection.nodeIds.length === 1
      ? props.diagram.nodes.find((node) => node.id === props.selection.nodeIds[0])
      : undefined;
  const selectedEdge =
    !selectedNode && props.selection.edgeIds.length === 1
      ? props.diagram.edges.find((edge) => edge.id === props.selection.edgeIds[0])
      : undefined;

  return (
    <aside className="inspector-panel">
      <div className="panel-heading">Proprieta</div>

      {selectedNode ? (
        <div className="inspector-stack">
          <label className="field">
            <span>Nome elemento</span>
            <input
              value={selectedNode.label}
              disabled={props.mode === "view"}
              onChange={(event) => props.onNodeChange(selectedNode.id, { label: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Tipo</span>
            <input value={selectedNode.type} disabled />
          </label>

          <div className="field-grid">
            <label className="field">
              <span>Posizione X</span>
              <input
                type="number"
                value={selectedNode.x}
                disabled={props.mode === "view"}
                onChange={(event) => props.onNodeChange(selectedNode.id, { x: numberValue(event.target.value) })}
              />
            </label>
            <label className="field">
              <span>Posizione Y</span>
              <input
                type="number"
                value={selectedNode.y}
                disabled={props.mode === "view"}
                onChange={(event) => props.onNodeChange(selectedNode.id, { y: numberValue(event.target.value) })}
              />
            </label>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>Larghezza</span>
              <input
                type="number"
                value={selectedNode.width}
                disabled={props.mode === "view" || selectedNode.type === "attribute" || selectedNode.type === "text"}
                onChange={(event) =>
                  props.onNodeChange(selectedNode.id, { width: Math.max(40, numberValue(event.target.value)) })
                }
              />
            </label>
            <label className="field">
              <span>Altezza</span>
              <input
                type="number"
                value={selectedNode.height}
                disabled={props.mode === "view" || selectedNode.type === "attribute" || selectedNode.type === "text"}
                onChange={(event) =>
                  props.onNodeChange(selectedNode.id, { height: Math.max(20, numberValue(event.target.value)) })
                }
              />
            </label>
          </div>

          <label className="field">
            <span>Stile linea</span>
            <input value="Nero continuo" disabled />
          </label>
        </div>
      ) : null}

      {selectedEdge ? (
        <div className="inspector-stack">
          <label className="field">
            <span>Nome collegamento</span>
            <input
              value={selectedEdge.label}
              disabled={props.mode === "view"}
              placeholder="Etichetta opzionale"
              onChange={(event) => props.onEdgeChange(selectedEdge.id, { label: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Tipo</span>
            <input value={selectedEdge.type} disabled />
          </label>

          <label className="field">
            <span>Stile linea</span>
            <select
              value={selectedEdge.lineStyle}
              disabled={props.mode === "view"}
              onChange={(event) =>
                props.onEdgeChange(selectedEdge.id, {
                  lineStyle: event.target.value as DiagramEdge["lineStyle"],
                })
              }
            >
              <option value="solid">Continua</option>
              <option value="dashed">Tratteggiata</option>
            </select>
          </label>
        </div>
      ) : null}

      {!selectedNode && !selectedEdge ? (
        <div className="empty-inspector">
          <p>Seleziona un elemento per modificarne proprieta, posizione e stile.</p>
          <p>Il canvas usa SVG nitido, snap to grid e connessioni ortogonali.</p>
        </div>
      ) : null}

      <div className="inspector-stack inspector-actions">
        <div className="panel-heading minor">Azioni selezione</div>
        <div className="action-grid">
          <button type="button" onClick={props.onDuplicateSelection} disabled={props.mode === "view"}>
            Duplica
          </button>
          <button type="button" onClick={props.onDeleteSelection} disabled={props.mode === "view"}>
            Elimina
          </button>
          <button type="button" onClick={() => props.onAlign("left")} disabled={props.mode === "view"}>
            Allinea sinistra
          </button>
          <button type="button" onClick={() => props.onAlign("center")} disabled={props.mode === "view"}>
            Allinea centro
          </button>
          <button type="button" onClick={() => props.onAlign("top")} disabled={props.mode === "view"}>
            Allinea alto
          </button>
          <button type="button" onClick={() => props.onAlign("middle")} disabled={props.mode === "view"}>
            Allinea mezzo
          </button>
        </div>
      </div>

      <div className="inspector-stack">
        <div className="panel-heading minor">Validazioni</div>
        {props.issues.length === 0 ? (
          <p className="validation-ok">Nessuna anomalia rilevata.</p>
        ) : (
          <div className="validation-list">
            {props.issues.map((issue) => (
              <div key={issue.id} className={issue.level === "error" ? "validation-item error" : "validation-item"}>
                <strong>{issue.level === "error" ? "Errore" : "Avviso"}</strong>
                <span>{issue.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

