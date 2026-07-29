import { useEffect, useState } from "react";
import type { DiagramEdge, DiagramNode, SelectionState } from "../../types/diagram";
import { useI18n } from "../../i18n/useI18n";
import { Field } from "../ui";
import { PanelEmptyState, WorkspacePanel } from "../workspace/WorkspacePanel";
import { ProjectActivityPanelHeader } from "../project/ProjectActivityPanelHeader";

export interface SelectionInspectorPanelProps {
  selection: SelectionState;
  selectionItemCount: number;
  selectedNode?: DiagramNode;
  selectedEdge?: DiagramEdge;
  /** false in sola lettura: i campi restano visibili ma non modificabili. */
  editable: boolean;
  onRenameNode: (nodeId: string, label: string) => void;
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
 * Fase 1 dell'inspector: identita dell'elemento selezionato.
 *
 * Il nome si modifica qui, in linea, invece di passare da un modale di prompt.
 * Le sezioni su attributi, identificatori e cardinalita arrivano nelle fasi
 * successive; finche non ci sono, la toolbar contestuale resta l'unica strada
 * per quelle operazioni.
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
      </div>
    </WorkspacePanel>
  );
}
