import { useEffect, useState } from "react";
import type { SyntheticEvent } from "react";
import type {
  AttributeNode,
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
  collapsed: boolean;
  onNodeChange: (nodeId: string, patch: Partial<DiagramNode>) => void;
  onNodesChange: (nodeIds: string[], patch: Partial<DiagramNode>) => void;
  onEdgeChange: (edgeId: string, patch: Partial<DiagramEdge>) => void;
  onClearExternalIdentifier: (relationshipId: string) => void;
  onDeleteSelection: () => void;
  onDuplicateSelection: () => void;
  onAlign: (axis: "left" | "center" | "top" | "middle") => void;
  onToggleCollapse: () => void;
}

function numberValue(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function InspectorPanel(props: InspectorPanelProps) {
  const [openSections, setOpenSections] = useState({
    summary: true,
    nodeDetails: true,
    edgeDetails: true,
    emptyDetails: true,
    actions: true,
    validations: false,
    composite: true,
  });

  const canAlign = props.mode !== "view" && props.selection.nodeIds.length >= 2;
  const selectedNodeCount = props.selection.nodeIds.length;
  const selectedEdgeCount = props.selection.edgeIds.length;
  const warningCount = props.issues.filter((issue) => issue.level === "warning").length;
  const warningLabel = `${warningCount} avvis${warningCount === 1 ? "o" : "i"}`;

  const selectedNode =
    props.selection.nodeIds.length === 1
      ? props.diagram.nodes.find((node) => node.id === props.selection.nodeIds[0])
      : undefined;

  function isAttributeLinkedToRelationship(attributeId: string): boolean {
    return props.diagram.edges.some((edge) => {
      if (edge.type !== "attribute") {
        return false;
      }

      const isLinked = edge.sourceId === attributeId || edge.targetId === attributeId;
      if (!isLinked) {
        return false;
      }

      const hostId = edge.sourceId === attributeId ? edge.targetId : edge.sourceId;
      const hostNode = props.diagram.nodes.find((node) => node.id === hostId);
      return hostNode?.type === "relationship";
    });
  }

  const selectedAttributeLinkedToRelationship =
    selectedNode?.type === "attribute" ? isAttributeLinkedToRelationship(selectedNode.id) : false;
  const selectedAttributeNodes = props.diagram.nodes.filter(
    (node): node is AttributeNode =>
      props.selection.nodeIds.includes(node.id) && node.type === "attribute",
  );
  const eligibleCompositeAttributeNodes = selectedAttributeNodes.filter(
    (node) =>
      node.isIdentifier !== true &&
      node.isMultivalued !== true &&
      !isAttributeLinkedToRelationship(node.id),
  );
  const canConfigureCompositeInternal = eligibleCompositeAttributeNodes.length >= 2;
  const allSelectedAttributesComposite =
    canConfigureCompositeInternal && eligibleCompositeAttributeNodes.every((node) => node.isCompositeInternal === true);
  const hasIdentifierInSelection = selectedAttributeNodes.some((node) => node.isIdentifier === true);
  const hasMultivaluedInSelection = selectedAttributeNodes.some((node) => node.isMultivalued === true);
  const hasRelationshipLinkedAttributesInSelection = selectedAttributeNodes.some((node) =>
    isAttributeLinkedToRelationship(node.id),
  );
  const selectedEdge =
    !selectedNode && props.selection.edgeIds.length === 1
      ? props.diagram.edges.find((edge) => edge.id === props.selection.edgeIds[0])
      : undefined;

  useEffect(() => {
    if (selectedNode) {
      setOpenSections((current) =>
        current.nodeDetails ? current : { ...current, nodeDetails: true },
      );
    }
  }, [selectedNode?.id]);

  useEffect(() => {
    if (selectedEdge) {
      setOpenSections((current) =>
        current.edgeDetails ? current : { ...current, edgeDetails: true },
      );
    }
  }, [selectedEdge?.id]);

  useEffect(() => {
    if (!selectedNode && !selectedEdge) {
      setOpenSections((current) =>
        current.emptyDetails ? current : { ...current, emptyDetails: true },
      );
    }
  }, [selectedNode?.id, selectedEdge?.id]);

  useEffect(() => {
    if (canConfigureCompositeInternal) {
      setOpenSections((current) =>
        current.composite ? current : { ...current, composite: true },
      );
    }
  }, [canConfigureCompositeInternal]);

  function handleSectionToggle(
    key: keyof typeof openSections,
    event: SyntheticEvent<HTMLDetailsElement>,
  ) {
    const nextOpen = event.currentTarget.open;
    setOpenSections((current) =>
      current[key] === nextOpen
        ? current
        : {
            ...current,
            [key]: nextOpen,
          },
    );
  }

  if (props.collapsed) {
    return (
      <aside className="inspector-panel collapsed">
        <div className="panel-head-row">
          <div className="panel-heading">Proprieta</div>
          <button
            type="button"
            className="panel-toggle"
            onClick={props.onToggleCollapse}
            aria-label="Espandi pannello proprieta"
            title="Espandi"
          >
            ←
          </button>
        </div>

        <div className="inspector-compact-stack">
          <div className="inspector-compact-card">
            <strong>{selectedNodeCount}</strong>
            <span>Nodi</span>
          </div>
          <div className="inspector-compact-card">
            <strong>{selectedEdgeCount}</strong>
            <span>Link</span>
          </div>
          <div className="inspector-compact-card">
            <strong>{props.issues.length}</strong>
            <span>Issue</span>
          </div>
          <div className="inspector-compact-card tone-muted">
            <strong>{props.mode === "edit" ? "Edit" : "View"}</strong>
            <span>Modo</span>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="inspector-panel">
      <div className="panel-head-row">
        <div>
          <div className="panel-heading">Proprieta</div>
          <p className="panel-subheading">Dettagli, azioni e validazioni della selezione.</p>
        </div>
        <button
          type="button"
          className="panel-toggle"
          onClick={props.onToggleCollapse}
          aria-label="Comprimi pannello proprieta"
          title="Comprimi"
        >
          →
        </button>
      </div>

      <details className="inspector-card inspector-section" open={openSections.summary} onToggle={(event) => handleSectionToggle("summary", event)}>
        <summary className="section-summary">Riepilogo selezione</summary>
        <div className="section-body">
          <div className="selection-summary">
            <span>{selectedNodeCount} nodi selezionati</span>
            <span>{selectedEdgeCount} collegamenti selezionati</span>
          </div>
        </div>
      </details>

      {selectedNode ? (
        <details className="inspector-card inspector-section" open={openSections.nodeDetails} onToggle={(event) => handleSectionToggle("nodeDetails", event)}>
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
            <>
              <label className="field checkbox-field">
                <span>Attributo identificatore</span>
                <input
                  type="checkbox"
                  checked={selectedNode.isIdentifier === true}
                  disabled={
                    props.mode === "view" ||
                    selectedNode.isCompositeInternal === true ||
                    selectedNode.isMultivalued === true ||
                    selectedAttributeLinkedToRelationship
                  }
                  onChange={(event) =>
                    props.onNodeChange(selectedNode.id, { isIdentifier: event.target.checked })
                  }
                />
              </label>
              {selectedNode.isCompositeInternal === true ? (
                <p className="action-hint">
                  Questo attributo fa parte di un identificatore composto interno e non puo essere identificatore singolo.
                </p>
              ) : null}
              {selectedNode.isMultivalued === true ? (
                <p className="action-hint">
                  Un attributo multivalore non puo essere usato come identificatore semplice.
                </p>
              ) : null}
              {selectedAttributeLinkedToRelationship ? (
                <p className="action-hint">
                  Un'associazione non puo avere identificatori: scollega l'attributo dalla relazione per abilitarlo.
                </p>
              ) : null}
              <label className="field checkbox-field">
                <span>Attributo multivalore</span>
                <input
                  type="checkbox"
                  checked={selectedNode.isMultivalued === true}
                  disabled={
                    props.mode === "view" ||
                    selectedNode.isIdentifier === true ||
                    selectedNode.isCompositeInternal === true
                  }
                  onChange={(event) =>
                    props.onNodeChange(selectedNode.id, { isMultivalued: event.target.checked })
                  }
                />
              </label>
              {selectedNode.isIdentifier === true || selectedNode.isCompositeInternal === true ? (
                <p className="action-hint">
                  Gli attributi usati in un identificatore non possono essere marcati come multivalore.
                </p>
              ) : null}
            </>
          ) : null}

          {selectedNode.type === "entity" ? (
            <>
              <label className="field checkbox-field">
                <span>Entita debole dedicata</span>
                <input
                  type="checkbox"
                  checked={selectedNode.isWeak === true}
                  disabled={props.mode === "view"}
                  onChange={(event) => props.onNodeChange(selectedNode.id, { isWeak: event.target.checked })}
                />
              </label>
              {selectedNode.isWeak === true ? (
                <p className="action-hint">
                  L'entita viene resa con doppio rettangolo, come weak entity dedicata.
                </p>
              ) : null}
            </>
          ) : null}

          {selectedNode.type === "relationship" && selectedNode.isExternalIdentifier === true ? (
            <button
              type="button"
              onClick={() => props.onClearExternalIdentifier(selectedNode.id)}
              disabled={props.mode === "view"}
            >
              Rimuovi identificatore esterno
            </button>
          ) : null}

          </div>
        </details>
      ) : null}

      {!selectedNode && canConfigureCompositeInternal ? (
        <details className="inspector-card inspector-section" open={openSections.composite} onToggle={(event) => handleSectionToggle("composite", event)}>
          <summary className="section-summary">Identificatore composto interno</summary>
          <div className="section-body inspector-stack">
            <label className="field checkbox-field">
              <span>Usa attributi selezionati nel composto interno</span>
              <input
                type="checkbox"
                checked={allSelectedAttributesComposite}
                disabled={props.mode === "view"}
                onChange={(event) => {
                  const targetIds = eligibleCompositeAttributeNodes
                    .map((attributeNode) => attributeNode.id);
                  props.onNodesChange(targetIds, { isCompositeInternal: event.target.checked });
                }}
              />
            </label>
            <p className="action-hint">
              Seleziona due o piu attributi collegati alla stessa entita.
            </p>
            {hasIdentifierInSelection ? (
              <p className="action-hint">
                Gli attributi marcati come identificatore semplice non vengono inclusi nel composto interno.
              </p>
            ) : null}
            {hasRelationshipLinkedAttributesInSelection ? (
              <p className="action-hint">
                Gli attributi collegati a un'associazione sono esclusi: un'associazione non puo avere identificatori.
              </p>
            ) : null}
            {hasMultivaluedInSelection ? (
              <p className="action-hint">
                Gli attributi multivalore sono esclusi dal composto interno.
              </p>
            ) : null}
          </div>
        </details>
      ) : null}

      {selectedEdge ? (
        <details className="inspector-card inspector-section" open={openSections.edgeDetails} onToggle={(event) => handleSectionToggle("edgeDetails", event)}>
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

          {selectedEdge.type === "attribute" ? (
            <label className="field">
              <span>Cardinalita (opzionale)</span>
              <select
                value={selectedEdge.cardinality ?? ""}
                disabled={props.mode === "view"}
                onChange={(event) =>
                  props.onEdgeChange(selectedEdge.id, {
                    cardinality: event.target.value || undefined,
                  })
                }
              >
                <option value="">Nessuna cardinalita</option>
                {CONNECTOR_CARDINALITIES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {selectedEdge.type === "inheritance" ? (
            <>
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
                <span>Vincolo ISA</span>
                <select
                  value={selectedEdge.isaDisjointness ?? ""}
                  disabled={props.mode === "view"}
                  onChange={(event) =>
                    props.onEdgeChange(selectedEdge.id, {
                      isaDisjointness:
                        event.target.value === "disjoint" || event.target.value === "overlap"
                          ? event.target.value
                          : undefined,
                    })
                  }
                >
                  <option value="">Nessun vincolo</option>
                  <option value="disjoint">Disjoint</option>
                  <option value="overlap">Overlap</option>
                </select>
              </label>
              <label className="field">
                <span>Copertura ISA</span>
                <select
                  value={selectedEdge.isaCompleteness ?? ""}
                  disabled={props.mode === "view"}
                  onChange={(event) =>
                    props.onEdgeChange(selectedEdge.id, {
                      isaCompleteness:
                        event.target.value === "total" || event.target.value === "partial"
                          ? event.target.value
                          : undefined,
                    })
                  }
                >
                  <option value="">Nessuna copertura</option>
                  <option value="total">Total</option>
                  <option value="partial">Partial</option>
                </select>
              </label>
              <p className="action-hint">
                `D/O` e `T/P` vengono mostrati sul canvas; `total` usa anche una doppia linea.
              </p>
            </>
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
        <details className="inspector-card inspector-section" open={openSections.emptyDetails} onToggle={(event) => handleSectionToggle("emptyDetails", event)}>
          <summary className="section-summary">Dettagli</summary>
          <div className="section-body empty-inspector">
          <p>Seleziona un elemento per modificarne proprieta, posizione e stile.</p>
          </div>
        </details>
      ) : null}

      <details className="inspector-card inspector-section inspector-actions" open={openSections.actions} onToggle={(event) => handleSectionToggle("actions", event)}>
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

      <details className="inspector-card inspector-section" open={openSections.validations} onToggle={(event) => handleSectionToggle("validations", event)}>
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
