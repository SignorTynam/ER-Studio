import type {
  DiagramDocument,
  DiagramEdge,
  DiagramNode,
  EditorMode,
  SelectionState,
  ValidationIssue,
} from "../types/diagram";
import {
  CONNECTOR_CARDINALITIES,
  CONNECTOR_CARDINALITY_PLACEHOLDER,
} from "../utils/cardinality";

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
  const canAlign = props.mode !== "view" && props.selection.nodeIds.length >= 2;
  const selectedNodeCount = props.selection.nodeIds.length;
  const selectedEdgeCount = props.selection.edgeIds.length;
  const warningCount = props.issues.filter((issue) => issue.level === "warning").length;
  const warningLabel = `${warningCount} avvis${warningCount === 1 ? "o" : "i"}`;

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

      <details className="inspector-card inspector-section" open>
        <summary className="section-summary">Riepilogo selezione</summary>
        <div className="section-body">
          <div className="selection-summary">
            <span>{selectedNodeCount} nodi selezionati</span>
            <span>{selectedEdgeCount} collegamenti selezionati</span>
          </div>
        </div>
      </details>

      {selectedNode ? (
        <details className="inspector-card inspector-section" open>
          <summary className="section-summary">Dettagli elemento</summary>
          <div className="section-body inspector-stack">
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

          {selectedNode.type === "attribute" ? (
            <label className="field checkbox-field">
              <span>Attributo identificatore</span>
              <input
                type="checkbox"
                checked={selectedNode.isIdentifier === true}
                disabled={props.mode === "view"}
                onChange={(event) =>
                  props.onNodeChange(selectedNode.id, { isIdentifier: event.target.checked })
                }
              />
            </label>
          ) : null}
          </div>
        </details>
      ) : null}

      {selectedEdge ? (
        <details className="inspector-card inspector-section" open>
          <summary className="section-summary">Dettagli collegamento</summary>
          <div className="section-body inspector-stack">
          {selectedEdge.type === "connector" ? (
            <label className="field">
              <span>Cardinalita (X,Y)</span>
              <select
                value={selectedEdge.cardinality ?? CONNECTOR_CARDINALITY_PLACEHOLDER}
                disabled={props.mode === "view"}
                onChange={(event) => props.onEdgeChange(selectedEdge.id, { cardinality: event.target.value })}
              >
                <option value={CONNECTOR_CARDINALITY_PLACEHOLDER}>Seleziona cardinalita</option>
                {CONNECTOR_CARDINALITIES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {selectedEdge.type === "inheritance" ? (
            <label className="field">
              <span>Nome collegamento</span>
              <input
                value={selectedEdge.label}
                disabled={props.mode === "view"}
                placeholder="Etichetta opzionale"
                onChange={(event) => props.onEdgeChange(selectedEdge.id, { label: event.target.value })}
              />
            </label>
          ) : null}

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
        </details>
      ) : null}

      {!selectedNode && !selectedEdge ? (
        <details className="inspector-card inspector-section" open>
          <summary className="section-summary">Dettagli</summary>
          <div className="section-body empty-inspector">
          <p>Seleziona un elemento per modificarne proprieta, posizione e stile.</p>
          </div>
        </details>
      ) : null}

      <details className="inspector-card inspector-section inspector-actions" open>
        <summary className="section-summary">Azioni selezione</summary>
        <div className="section-body inspector-stack">
        <div className="action-grid">
          <button type="button" onClick={props.onDuplicateSelection} disabled={props.mode === "view"}>
            Duplica
          </button>
          <button type="button" onClick={props.onDeleteSelection} disabled={props.mode === "view"}>
            Elimina
          </button>
          <button type="button" onClick={() => props.onAlign("left")} disabled={!canAlign}>
            Allinea sinistra
          </button>
          <button type="button" onClick={() => props.onAlign("center")} disabled={!canAlign}>
            Allinea centro
          </button>
          <button type="button" onClick={() => props.onAlign("top")} disabled={!canAlign}>
            Allinea alto
          </button>
          <button type="button" onClick={() => props.onAlign("middle")} disabled={!canAlign}>
            Allinea mezzo
          </button>
        </div>
        {!canAlign && props.mode !== "view" ? (
          <p className="action-hint">Per allineare, seleziona almeno due nodi.</p>
        ) : null}
        </div>
      </details>

      <details className="inspector-card inspector-section" open>
        <summary className="section-summary">Validazioni ({warningLabel})</summary>
        <div className="section-body inspector-stack">
        {props.issues.length === 0 ? (
          <p className="validation-ok">Nessuna anomalia rilevata.</p>
        ) : (
          <div className="validation-list">
            {props.issues.map((issue) => (
              <div
                key={issue.id}
                className={`validation-item ${issue.level === "error" ? "error" : "warning"}`}
              >
                <div className="validation-head">
                  <span className="validation-icon" aria-hidden="true">
                    !
                  </span>
                  <strong className="validation-badge">{issue.level === "error" ? "Errore" : "Avviso"}</strong>
                </div>
                <p className="validation-message">{issue.message}</p>
              </div>
            ))}
          </div>
        )}
        </div>
      </details>
    </aside>
  );
}

