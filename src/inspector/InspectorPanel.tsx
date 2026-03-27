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
  onCreateAttributeForSelection: () => void;
  onRenameSelection: () => void;
  onToggleCollapse: () => void;
}

function numberValue(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function findDirectAttributeHost(diagram: DiagramDocument, attributeId: string): DiagramNode | undefined {
  const attributeEdge = diagram.edges.find(
    (edge) => edge.type === "attribute" && (edge.sourceId === attributeId || edge.targetId === attributeId),
  );
  if (!attributeEdge) {
    return undefined;
  }

  const hostId = attributeEdge.sourceId === attributeId ? attributeEdge.targetId : attributeEdge.sourceId;
  return diagram.nodes.find((node) => node.id === hostId);
}

function getSelectionHeading(
  selectedNode?: DiagramNode,
  selectedEdge?: DiagramEdge,
  selectionCount = 0,
): { title: string; subtitle: string } {
  if (selectedNode?.type === "entity") {
    return {
      title: "Entita",
      subtitle: "Modifica solo le proprieta dell'entita corrente e aggiungi attributi quando serve.",
    };
  }

  if (selectedNode?.type === "relationship") {
    return {
      title: "Associazione",
      subtitle: "Pannello focalizzato sull'associazione selezionata e sui suoi attributi collegati.",
    };
  }

  if (selectedNode?.type === "attribute") {
    return {
      title: "Attributo",
      subtitle: "Sono visibili solo le opzioni dell'attributo attivo.",
    };
  }

  if (selectedNode?.type === "text") {
    return {
      title: "Testo libero",
      subtitle: "Modifica il testo senza altre impostazioni estranee.",
    };
  }

  if (selectedEdge) {
    return {
      title: "Collegamento",
      subtitle: "Configura soltanto il link selezionato.",
    };
  }

  if (selectionCount > 1) {
    return {
      title: "Selezione multipla",
      subtitle: "Azioni di gruppo per riallineare o ripulire la selezione.",
    };
  }

  return {
    title: "Workspace",
    subtitle: "Seleziona un elemento per vedere solo le impostazioni pertinenti.",
  };
}

export function InspectorPanel(props: InspectorPanelProps) {
  const canEdit = props.mode !== "view";
  const selectedNodeCount = props.selection.nodeIds.length;
  const selectedEdgeCount = props.selection.edgeIds.length;
  const selectionCount = selectedNodeCount + selectedEdgeCount;
  const canAlign = canEdit && selectedNodeCount >= 2;

  const selectedNode =
    selectedNodeCount === 1 && selectedEdgeCount === 0
      ? props.diagram.nodes.find((node) => node.id === props.selection.nodeIds[0])
      : undefined;
  const selectedEdge =
    selectedEdgeCount === 1 && selectedNodeCount === 0
      ? props.diagram.edges.find((edge) => edge.id === props.selection.edgeIds[0])
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

  const attributeHost =
    selectedNode?.type === "attribute" ? findDirectAttributeHost(props.diagram, selectedNode.id) : undefined;
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
    canConfigureCompositeInternal &&
    eligibleCompositeAttributeNodes.every((node) => node.isCompositeInternal === true);

  const heading = getSelectionHeading(selectedNode, selectedEdge, selectionCount);
  const isIdleContext = selectionCount === 0 && props.issues.length === 0;

  if (props.collapsed) {
    if (isIdleContext) {
      return (
        <aside className="inspector-panel collapsed inspector-panel-idle">
          <div className="panel-head-row panel-head-row-compact">
            <button
              type="button"
              className="panel-toggle"
              onClick={props.onToggleCollapse}
              aria-label="Espandi pannello contesto"
              title="Espandi"
            >
              {"<"}
            </button>
          </div>
        </aside>
      );
    }

    return (
      <aside className="inspector-panel collapsed">
        <div className="panel-head-row panel-head-row-compact">
          <button
            type="button"
            className="panel-toggle"
            onClick={props.onToggleCollapse}
            aria-label="Espandi pannello contesto"
            title="Espandi"
          >
            {"<"}
          </button>
        </div>

        <div className="inspector-compact-stack">
          <div className="inspector-compact-card">
            <strong>{heading.title}</strong>
            <span>{selectionCount === 0 ? "Nessuna selezione" : `${selectionCount} elementi`}</span>
          </div>
          <div className="inspector-compact-card tone-muted">
            <strong>{props.issues.length}</strong>
            <span>Issue</span>
          </div>
        </div>
      </aside>
    );
  }

  function renderSelectionActions() {
    return (
      <section className="context-card">
        <div className="context-card-title">Azioni rapide</div>
        <div className="action-grid">
          {selectedNode && (selectedNode.type === "entity" || selectedNode.type === "relationship" || selectedNode.type === "attribute") ? (
            <button type="button" onClick={props.onCreateAttributeForSelection} disabled={!canEdit}>
              {selectedNode.type === "attribute" ? "Aggiungi sotto-attributo" : "Aggiungi attributo"}
            </button>
          ) : null}
          {(selectedNode || selectedEdge) ? (
            <button type="button" onClick={props.onRenameSelection} disabled={!canEdit}>
              Rinomina
            </button>
          ) : null}
          {selectionCount > 0 ? (
            <button type="button" onClick={props.onDuplicateSelection} disabled={!canEdit}>
              Duplica
            </button>
          ) : null}
          {selectionCount > 0 ? (
            <button type="button" onClick={props.onDeleteSelection} disabled={!canEdit}>
              Elimina
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  function renderPositionFields(node: DiagramNode) {
    if (node.type === "attribute") {
      return null;
    }

    return (
      <div className="field-grid">
        <label className="field">
          <span>Posizione X</span>
          <input
            type="number"
            value={node.x}
            disabled={!canEdit}
            onChange={(event) => props.onNodeChange(node.id, { x: numberValue(event.target.value) })}
          />
        </label>
        <label className="field">
          <span>Posizione Y</span>
          <input
            type="number"
            value={node.y}
            disabled={!canEdit}
            onChange={(event) => props.onNodeChange(node.id, { y: numberValue(event.target.value) })}
          />
        </label>
      </div>
    );
  }

  function renderMultiSelection() {
    return (
      <>
        <section className="context-card">
          <div className="context-card-title">Azioni di gruppo</div>
          <div className="action-grid">
            <button type="button" onClick={() => props.onAlign("left")} disabled={!canAlign}>
              Allinea a sinistra
            </button>
            <button type="button" onClick={() => props.onAlign("center")} disabled={!canAlign}>
              Allinea al centro
            </button>
            <button type="button" onClick={() => props.onAlign("top")} disabled={!canAlign}>
              Allinea in alto
            </button>
            <button type="button" onClick={() => props.onAlign("middle")} disabled={!canAlign}>
              Allinea a meta
            </button>
            <button type="button" onClick={props.onDuplicateSelection} disabled={!canEdit}>
              Duplica selezione
            </button>
            <button type="button" onClick={props.onDeleteSelection} disabled={!canEdit}>
              Elimina selezione
            </button>
          </div>
          {!canAlign ? <p className="action-hint">Servono almeno due nodi per usare gli allineamenti.</p> : null}
        </section>

        {canConfigureCompositeInternal ? (
          <section className="context-card">
            <div className="context-card-title">Identificatore composto interno</div>
            <label className="field checkbox-field">
              <span>Usa gli attributi selezionati nel composto interno</span>
              <input
                type="checkbox"
                checked={allSelectedAttributesComposite}
                disabled={!canEdit}
                onChange={(event) => {
                  props.onNodesChange(
                    eligibleCompositeAttributeNodes.map((attributeNode) => attributeNode.id),
                    { isCompositeInternal: event.target.checked },
                  );
                }}
              />
            </label>
            <p className="action-hint">Seleziona due o piu attributi collegati alla stessa entita.</p>
          </section>
        ) : null}
      </>
    );
  }

  function renderNodeContext(node: DiagramNode) {
    if (node.type === "entity") {
      return (
        <>
          <section className="context-card">
            <div className="context-card-title">Impostazioni entita</div>
            <div className="inspector-stack">
              <label className="field">
                <span>Nome entita</span>
                <input
                  value={node.label}
                  disabled={!canEdit}
                  onChange={(event) => props.onNodeChange(node.id, { label: event.target.value })}
                />
              </label>
              <label className="field checkbox-field">
                <span>Entita debole dedicata</span>
                <input
                  type="checkbox"
                  checked={node.isWeak === true}
                  disabled={!canEdit}
                  onChange={(event) => props.onNodeChange(node.id, { isWeak: event.target.checked })}
                />
              </label>
              {renderPositionFields(node)}
            </div>
          </section>
          {renderSelectionActions()}
        </>
      );
    }

    if (node.type === "relationship") {
      return (
        <>
          <section className="context-card">
            <div className="context-card-title">Impostazioni associazione</div>
            <div className="inspector-stack">
              <label className="field">
                <span>Nome associazione</span>
                <input
                  value={node.label}
                  disabled={!canEdit}
                  onChange={(event) => props.onNodeChange(node.id, { label: event.target.value })}
                />
              </label>
              {node.isExternalIdentifier === true ? (
                <>
                  <p className="action-hint">
                    Questa associazione usa un identificatore esterno. Puoi rimuoverlo da qui.
                  </p>
                  <button
                    type="button"
                    onClick={() => props.onClearExternalIdentifier(node.id)}
                    disabled={!canEdit}
                  >
                    Rimuovi identificatore esterno
                  </button>
                </>
              ) : null}
              {renderPositionFields(node)}
            </div>
          </section>
          {renderSelectionActions()}
        </>
      );
    }

    if (node.type === "attribute") {
      return (
        <>
          <section className="context-card">
            <div className="context-card-title">Impostazioni attributo</div>
            <div className="inspector-stack">
              <label className="field">
                <span>Nome attributo</span>
                <input
                  value={node.label}
                  disabled={!canEdit}
                  onChange={(event) => props.onNodeChange(node.id, { label: event.target.value })}
                />
              </label>
              {attributeHost ? (
                <p className="action-hint">
                  Collegato a <strong>{attributeHost.label}</strong>.
                </p>
              ) : null}
              <label className="field checkbox-field">
                <span>Attributo identificatore</span>
                <input
                  type="checkbox"
                  checked={node.isIdentifier === true}
                  disabled={
                    !canEdit ||
                    node.isCompositeInternal === true ||
                    node.isMultivalued === true ||
                    selectedAttributeLinkedToRelationship
                  }
                  onChange={(event) => props.onNodeChange(node.id, { isIdentifier: event.target.checked })}
                />
              </label>
              <label className="field checkbox-field">
                <span>Attributo composto</span>
                <input
                  type="checkbox"
                  checked={node.isMultivalued === true}
                  disabled={!canEdit || node.isIdentifier === true || node.isCompositeInternal === true}
                  onChange={(event) => props.onNodeChange(node.id, { isMultivalued: event.target.checked })}
                />
              </label>
              <label className="field checkbox-field">
                <span>Parte di identificatore composto interno</span>
                <input
                  type="checkbox"
                  checked={node.isCompositeInternal === true}
                  disabled={!canEdit || node.isIdentifier === true || node.isMultivalued === true || selectedAttributeLinkedToRelationship}
                  onChange={(event) => props.onNodeChange(node.id, { isCompositeInternal: event.target.checked })}
                />
              </label>
              {selectedAttributeLinkedToRelationship ? (
                <p className="action-hint">
                  Un attributo collegato a un'associazione non puo essere usato come identificatore.
                </p>
              ) : null}
            </div>
          </section>
          {renderSelectionActions()}
        </>
      );
    }

    return (
      <>
        <section className="context-card">
          <div className="context-card-title">Impostazioni testo</div>
          <div className="inspector-stack">
            <label className="field">
              <span>Contenuto</span>
              <input
                value={node.label}
                disabled={!canEdit}
                onChange={(event) => props.onNodeChange(node.id, { label: event.target.value })}
              />
            </label>
            {renderPositionFields(node)}
          </div>
        </section>
        {renderSelectionActions()}
      </>
    );
  }

  function renderEdgeContext(edge: DiagramEdge) {
    return (
      <>
        <section className="context-card">
          <div className="context-card-title">Impostazioni collegamento</div>
          <div className="inspector-stack">
            {edge.type === "connector" ? (
              <label className="field">
                <span>Cardinalita</span>
                <select
                  value={edge.cardinality ?? CONNECTOR_CARDINALITY_PLACEHOLDER}
                  disabled={!canEdit}
                  onChange={(event) => props.onEdgeChange(edge.id, { cardinality: event.target.value })}
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

            {edge.type === "attribute" ? (
              <label className="field">
                <span>Cardinalita opzionale</span>
                <select
                  value={edge.cardinality ?? ""}
                  disabled={!canEdit}
                  onChange={(event) =>
                    props.onEdgeChange(edge.id, {
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

            {edge.type === "inheritance" ? (
              <>
                <label className="field">
                  <span>Nome collegamento</span>
                  <input
                    value={edge.label}
                    disabled={!canEdit}
                    placeholder="Etichetta opzionale"
                    onChange={(event) => props.onEdgeChange(edge.id, { label: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Vincolo ISA</span>
                  <select
                    value={edge.isaDisjointness ?? ""}
                    disabled={!canEdit}
                    onChange={(event) =>
                      props.onEdgeChange(edge.id, {
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
                    value={edge.isaCompleteness ?? ""}
                    disabled={!canEdit}
                    onChange={(event) =>
                      props.onEdgeChange(edge.id, {
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
              </>
            ) : null}

            <label className="field">
              <span>Stile linea</span>
              <select
                value={edge.lineStyle}
                disabled={!canEdit}
                onChange={(event) =>
                  props.onEdgeChange(edge.id, {
                    lineStyle: event.target.value as DiagramEdge["lineStyle"],
                  })
                }
              >
                <option value="solid">Continua</option>
                <option value="dashed">Tratteggiata</option>
              </select>
            </label>
          </div>
        </section>
        {renderSelectionActions()}
      </>
    );
  }

  return (
    <aside className="inspector-panel inspector-panel-context">
      <div className="panel-head-row">
        <div>
          <div className="panel-heading">{heading.title}</div>
          <p className="panel-subheading">{heading.subtitle}</p>
        </div>
        <button
          type="button"
          className="panel-toggle"
          onClick={props.onToggleCollapse}
          aria-label="Comprimi pannello contesto"
          title="Comprimi"
        >
          {">"}
        </button>
      </div>

      <section className="context-card context-card-hero">
        <div className="context-card-title">{selectionCount === 0 ? "Nessuna selezione attiva" : `${selectionCount} elementi attivi`}</div>
        <p className="context-card-subtitle">
          {selectionCount === 0
            ? "Usa il rail a sinistra per creare entita o associazioni, poi seleziona l'elemento da rifinire."
            : "Le azioni e i campi qui sotto sono limitati al contesto corrente."}
        </p>
      </section>

      {selectedNode ? renderNodeContext(selectedNode) : null}
      {selectedEdge ? renderEdgeContext(selectedEdge) : null}
      {!selectedNode && !selectedEdge && selectionCount > 1 ? renderMultiSelection() : null}
      {!selectedNode && !selectedEdge && selectionCount === 0 ? (
        <section className="context-card">
          <div className="context-card-title">Guida rapida</div>
          <div className="context-card-list">
            <span>1. Crea entita o associazioni dal rail sinistro.</span>
            <span>2. Seleziona un elemento per far comparire solo il suo pannello dedicato.</span>
            <span>3. Aggiungi attributi direttamente dal contesto dell'host selezionato.</span>
          </div>
        </section>
      ) : null}

      {(props.issues.length > 0 || selectionCount === 0) ? (
        <details className="context-card context-card-validations" open={selectionCount === 0 && props.issues.length > 0}>
          <summary className="section-summary">Controlli modello ({props.issues.length})</summary>
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
      ) : null}
    </aside>
  );
}
