import { useEffect, useState } from "react";
import type {
  AttributeNode,
  DiagramDocument,
  DiagramEdge,
  DiagramNode,
  EntityNode,
} from "../../types/diagram";
import { findDirectHostedAttributes } from "../../utils/attributeLayout";
import { useI18n } from "../../i18n/useI18n";
import { Badge, Button, Field } from "../ui";
import { PanelEmptyState, WorkspacePanel } from "../workspace/WorkspacePanel";
import { ProjectActivityPanelHeader } from "../project/ProjectActivityPanelHeader";

export interface SelectionInspectorPanelProps {
  diagram: DiagramDocument;
  /** Quanti elementi sono selezionati: distingue vuoto, singolo e multiplo. */
  selectionItemCount: number;
  selectedNode?: DiagramNode;
  selectedEdge?: DiagramEdge;
  /** false in sola lettura: i campi restano visibili ma non modificabili. */
  editable: boolean;
  onRenameNode: (nodeId: string, label: string) => void;
  /** Porta la selezione del canvas su un attributo dell'elenco. */
  onSelectNode: (nodeId: string) => void;
  /** Riusa il comando "Aggiungi attributo" gia esposto dalla toolbar. */
  onAddAttribute?: () => void;
  onClose: () => void;
  closeLabel: string;
}

/**
 * Etichetta del tipo selezionato. Riusa il vocabolario `inspector.heading.*`,
 * gia tradotto nelle tre lingue: e sopravvissuto alla rimozione del vecchio
 * pannello e copre entita, associazione, attributo e archi.
 */
function nodeTypeKey(node: DiagramNode): string {
  if (node.type === "entity") {
    return node.isWeak === true ? "inspector.identity.weakEntity" : "inspector.heading.entity.title";
  }
  if (node.type === "relationship") {
    return "inspector.heading.relationship.title";
  }
  return "inspector.heading.attribute.title";
}

/**
 * Inspector della selezione: identita, attributi e identificatori interni.
 *
 * Il nome si modifica qui, in linea, invece di passare da un modale di prompt,
 * e gli attributi dell'elemento si leggono in elenco invece di doverli cercare
 * sul canvas. Cardinalita, ruoli e identificatori esterni restano per ora nella
 * toolbar contestuale e nei suoi modali.
 */
export function SelectionInspectorPanel(props: SelectionInspectorPanelProps) {
  const { t } = useI18n();
  const selectedNode = props.selectedNode;

  /* Bozza locale: il campo non deve riscrivere il modello a ogni tasto, e
     deve seguire la selezione quando cambia da canvas o da tastiera. */
  const [draftLabel, setDraftLabel] = useState(selectedNode?.label ?? "");
  useEffect(() => {
    setDraftLabel(selectedNode?.label ?? "");
  }, [selectedNode?.id, selectedNode?.label]);

  const trimmed = draftLabel.trim();
  const nameError = trimmed.length === 0 ? t("inspector.identity.nameRequired") : undefined;

  function commitLabel() {
    if (!selectedNode || !props.editable) return;
    if (trimmed.length === 0 || trimmed === selectedNode.label) {
      // Nome vuoto o invariato: si torna al valore del modello senza commit.
      setDraftLabel(selectedNode.label);
      return;
    }
    props.onRenameNode(selectedNode.id, trimmed);
  }

  /* Attributi ospitati dall'elemento selezionato. Riusa l'helper del canvas
     invece di ricamminare gli archi: la nozione di "attributo diretto" resta
     una sola in tutta l'app.

     Solo entita e associazioni: l'helper guarda gli archi senza distinguere
     il verso, quindi su un sotto-attributo restituirebbe anche il suo padre,
     elencandolo come se fosse un figlio. Gli attributi composti arrivano in
     una fase dedicata. */
  const hostsAttributes = selectedNode?.type === "entity" || selectedNode?.type === "relationship";
  const hostedAttributes: AttributeNode[] = hostsAttributes && selectedNode
    ? findDirectHostedAttributes(props.diagram, selectedNode.id)
    : [];
  const attributeNamesById = new Map(
    props.diagram.nodes
      .filter((node): node is AttributeNode => node.type === "attribute")
      .map((node) => [node.id, node.label]),
  );
  const selectedEntity: EntityNode | undefined =
    selectedNode?.type === "entity" ? selectedNode : undefined;
  const internalIdentifiers = selectedEntity?.internalIdentifiers ?? [];

  const panelLabel = t("inspector.panel.propertiesPanel");
  const header = (
    <ProjectActivityPanelHeader
      title={panelLabel}
      closeLabel={props.closeLabel}
      onClose={props.onClose}
    />
  );

  if (props.selectionItemCount === 0) {
    return (
      <WorkspacePanel className="project-activity-section" label={panelLabel}>
        {header}
        <PanelEmptyState
          variant="card"
          icon="select"
          title={t("inspector.panel.compactSelectionCount", { count: 0 })}
          description={t("inspector.heading.canvas.subtitle")}
        />
      </WorkspacePanel>
    );
  }

  if (props.selectionItemCount > 1) {
    return (
      <WorkspacePanel className="project-activity-section" label={panelLabel}>
        {header}
        <PanelEmptyState
          variant="card"
          icon="list"
          title={t("inspector.panel.compactSelectionCount", { count: props.selectionItemCount })}
          description={t("inspector.identity.selectSingleHint")}
        />
      </WorkspacePanel>
    );
  }

  return (
    <WorkspacePanel className="project-activity-section selection-inspector" label={panelLabel}>
      {header}
      <div className="selection-inspector__body">
        <section className="selection-inspector__section" aria-label={t("inspector.identity.title")}>
          <h3 className="selection-inspector__section-title">{t("inspector.identity.title")}</h3>

          {selectedNode ? (
            <Field label={t("inspector.identity.name")} error={props.editable ? nameError : undefined}>
              {({ id, invalid, describedBy }) => (
                <input
                  id={id}
                  className="selection-inspector__input"
                  value={draftLabel}
                  readOnly={!props.editable}
                  aria-invalid={invalid || undefined}
                  aria-describedby={describedBy}
                  onChange={(event) => setDraftLabel(event.target.value)}
                  onBlur={commitLabel}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitLabel();
                      return;
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setDraftLabel(selectedNode.label);
                    }
                  }}
                />
              )}
            </Field>
          ) : null}

          <div className="selection-inspector__row">
            <span className="selection-inspector__row-label">{t("inspector.identity.type")}</span>
            <span className="selection-inspector__row-value">
              {selectedNode
                ? t(nodeTypeKey(selectedNode))
                : props.selectedEdge
                  ? t("inspector.heading.edge.title")
                  : t("common.entities.element")}
            </span>
          </div>
        </section>

        {hostsAttributes ? (
          <section className="selection-inspector__section" aria-label={t("inspector.attribute.listTitle")}>
            <h3 className="selection-inspector__section-title">{t("inspector.attribute.listTitle")}</h3>

            {hostedAttributes.length === 0 ? (
              <p className="selection-inspector__hint">{t("inspector.attribute.listEmpty")}</p>
            ) : (
              <ul className="selection-inspector__list">
                {hostedAttributes.map((attribute) => (
                  <li key={attribute.id}>
                    {/* La riga porta la selezione del canvas sull'attributo:
                        da li valgono i comandi che gia esistono in toolbar. */}
                    <button
                      type="button"
                      className="selection-inspector__list-row"
                      onClick={() => props.onSelectNode(attribute.id)}
                    >
                      <span className="selection-inspector__list-name">{attribute.label}</span>
                      <span className="selection-inspector__list-badges">
                        {attribute.isIdentifier === true ? (
                          <Badge tone="info">{t("inspector.attribute.identifierBadge")}</Badge>
                        ) : null}
                        {attribute.isCompositeInternal === true ? (
                          <Badge tone="neutral">{t("inspector.internalIdentifier.composite")}</Badge>
                        ) : null}
                        {attribute.isMultivalued === true ? (
                          <Badge tone="neutral">{t("inspector.attribute.multivaluedBadge")}</Badge>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {props.editable && props.onAddAttribute ? (
              <Button size="sm" variant="secondary" iconLeft="attribute" onClick={props.onAddAttribute}>
                {t("inspector.quickActions.addAttribute")}
              </Button>
            ) : null}
          </section>
        ) : null}

        {selectedEntity ? (
          <section className="selection-inspector__section" aria-label={t("inspector.internalIdentifier.title")}>
            <h3 className="selection-inspector__section-title">{t("inspector.internalIdentifier.title")}</h3>

            {internalIdentifiers.length === 0 ? (
              <p className="selection-inspector__hint">{t("inspector.internalIdentifier.empty")}</p>
            ) : (
              <ul className="selection-inspector__list selection-inspector__list--static">
                {internalIdentifiers.map((identifier) => {
                  const parts = identifier.attributeIds
                    .map((attributeId) => attributeNamesById.get(attributeId))
                    .filter((name): name is string => name != null);
                  return (
                    <li key={identifier.id} className="selection-inspector__identifier">
                      <Badge tone="neutral">
                        {parts.length > 1
                          ? t("inspector.internalIdentifier.composite")
                          : t("inspector.internalIdentifier.simple")}
                      </Badge>
                      <span className="selection-inspector__list-name">
                        {parts.length > 0
                          ? parts.join(", ")
                          : t("inspector.internalIdentifier.emptyIdentifier")}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : null}
      </div>
    </WorkspacePanel>
  );
}
