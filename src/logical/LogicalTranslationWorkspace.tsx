import { useEffect, useMemo, useState } from "react";
import type { DiagramDocument, Viewport } from "../types/diagram";
import type {
  LogicalModel,
  LogicalSelection,
  LogicalTranslationChoice,
  LogicalTranslationItem,
  LogicalTranslationStep,
  LogicalWorkspaceDocument,
} from "../types/logical";
import {
  LOGICAL_TRANSLATION_STEPS,
  buildLogicalTranslationOverview,
  getLogicalTranslationChoicesForItem,
  getLogicalTranslationStepCompletion,
} from "../utils/logicalTranslation";
import { LogicalTransformationCanvas } from "./LogicalTransformationCanvas";

interface LogicalTranslationWorkspaceProps {
  diagram: DiagramDocument;
  workspace: LogicalWorkspaceDocument;
  logicalViewport: Viewport;
  logicalSelection: LogicalSelection;
  logicalFitRequestToken: number;
  onLogicalViewportChange: (viewport: Viewport) => void;
  onLogicalSelectionChange: (selection: LogicalSelection) => void;
  onPreviewLogicalModel: (model: LogicalModel) => void;
  onCommitLogicalModel: (model: LogicalModel, previous: LogicalModel) => void;
  onRenameTable: (tableId: string, nextName: string) => void;
  onRenameColumn: (tableId: string, columnId: string, nextName: string) => void;
  onApplyChoice: (item: LogicalTranslationItem, choice: LogicalTranslationChoice) => void;
  onResetTranslation: () => void;
}

function stableJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function buildTargetKey(item: Pick<LogicalTranslationItem, "targetType" | "id">): string {
  return `${item.targetType}:${item.id}`;
}

function getPreferredStep(overview: ReturnType<typeof buildLogicalTranslationOverview>): LogicalTranslationStep {
  const orderedSteps = LOGICAL_TRANSLATION_STEPS.filter((step) => step.id !== "review");
  const invalidStep = orderedSteps.find((step) => overview.itemsByStep[step.id].some((item) => item.status === "invalid"));
  if (invalidStep) {
    return invalidStep.id;
  }

  const pendingStep = orderedSteps.find((step) => overview.itemsByStep[step.id].some((item) => item.status === "pending"));
  if (pendingStep) {
    return pendingStep.id;
  }

  return "review";
}

function getPreferredItem(items: LogicalTranslationItem[]): LogicalTranslationItem | null {
  return (
    items.find((item) => item.status === "invalid") ??
    items.find((item) => item.status === "pending") ??
    items[0] ??
    null
  );
}

function getStatusLabel(item: LogicalTranslationItem): string {
  if (item.status === "applied") {
    return "Risolto";
  }

  if (item.status === "invalid") {
    return "Da rivedere";
  }

  return "In sospeso";
}

function getStepTotalsLabel(total: number, pending: number, invalid: number): string {
  if (total === 0) {
    return "nessun elemento";
  }

  if (invalid > 0) {
    return `${invalid} da rivedere`;
  }

  if (pending > 0) {
    return `${pending} da fissare`;
  }

  return "completato";
}

function findItemByTargetKey(
  overview: ReturnType<typeof buildLogicalTranslationOverview>,
  targetKey: string,
): { step: LogicalTranslationStep; item: LogicalTranslationItem } | null {
  for (const step of LOGICAL_TRANSLATION_STEPS) {
    const item = overview.itemsByStep[step.id].find((candidate) => buildTargetKey(candidate) === targetKey);
    if (item) {
      return { step: step.id, item };
    }
  }

  return null;
}

function getSelectionTargetKeys(
  workspace: LogicalWorkspaceDocument,
  selection: LogicalSelection,
): string[] {
  if (selection.columnId && selection.nodeId) {
    const tableNode = workspace.transformation.nodes.find((node) => node.id === selection.nodeId);
    const column = tableNode?.columns?.find((candidate) => candidate.id === selection.columnId);
    if (column) {
      return column.relatedTargetKeys;
    }
  }

  if (selection.edgeId) {
    return workspace.transformation.edges.find((edge) => edge.id === selection.edgeId)?.relatedTargetKeys ?? [];
  }

  if (selection.nodeId) {
    return workspace.transformation.nodes.find((node) => node.id === selection.nodeId)?.relatedTargetKeys ?? [];
  }

  return [];
}

function resolveArtifactSelection(
  workspace: LogicalWorkspaceDocument,
  artifact: { kind: string; id: string },
): LogicalSelection {
  if (artifact.kind === "table") {
    return { nodeId: artifact.id, columnId: null, edgeId: null };
  }

  if (artifact.kind === "column") {
    const ownerNode = workspace.transformation.nodes.find((node) => node.columns?.some((column) => column.id === artifact.id));
    return {
      nodeId: ownerNode?.id ?? null,
      columnId: artifact.id,
      edgeId: null,
    };
  }

  if (artifact.kind === "foreignKey") {
    const ownerEdge = workspace.transformation.edges.find((edge) => edge.foreignKeyId === artifact.id);
    return {
      nodeId: ownerEdge?.sourceId ?? null,
      columnId: null,
      edgeId: ownerEdge?.id ?? null,
    };
  }

  if (artifact.kind === "edge") {
    const edge = workspace.transformation.edges.find((candidate) => candidate.id === artifact.id);
    return {
      nodeId: edge?.sourceId ?? null,
      columnId: null,
      edgeId: edge?.id ?? null,
    };
  }

  return { nodeId: null, columnId: null, edgeId: null };
}

function describeSelectedElement(workspace: LogicalWorkspaceDocument, selection: LogicalSelection): string | null {
  if (selection.columnId && selection.nodeId) {
    const node = workspace.transformation.nodes.find((candidate) => candidate.id === selection.nodeId);
    const column = node?.columns?.find((candidate) => candidate.id === selection.columnId);
    if (node && column) {
      return `Colonna ${node.label}.${column.name}`;
    }
  }

  if (selection.edgeId) {
    const edge = workspace.transformation.edges.find((candidate) => candidate.id === selection.edgeId);
    if (edge?.kind === "foreign-key") {
      return `FK ${edge.label}`;
    }
    if (edge) {
      return `Collegamento ${edge.label || edge.id}`;
    }
  }

  if (selection.nodeId) {
    const node = workspace.transformation.nodes.find((candidate) => candidate.id === selection.nodeId);
    if (!node) {
      return null;
    }

    return node.kind === "logical-table" ? `Tabella ${node.label}` : `${node.label}`;
  }

  return null;
}

export function LogicalTranslationWorkspace(props: LogicalTranslationWorkspaceProps) {
  const overview = useMemo(
    () => buildLogicalTranslationOverview(props.diagram, props.workspace),
    [props.diagram, props.workspace],
  );
  const completion = useMemo(() => getLogicalTranslationStepCompletion(overview), [overview]);
  const [activeStep, setActiveStep] = useState<LogicalTranslationStep>(() => getPreferredStep(overview));
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const stepItems = overview.itemsByStep[activeStep];
  const selectedItem = useMemo(
    () => stepItems.find((item) => item.id === selectedItemId) ?? getPreferredItem(stepItems),
    [selectedItemId, stepItems],
  );
  const selectedItemChoices = useMemo(
    () => (selectedItem ? getLogicalTranslationChoicesForItem(overview, selectedItem) : []),
    [overview, selectedItem],
  );
  const selectedDecision = selectedItem
    ? props.workspace.translation.decisions.find(
        (decision) => decision.targetType === selectedItem.targetType && decision.targetId === selectedItem.id,
      )
    : undefined;
  const selectedMappings = selectedItem
    ? props.workspace.translation.mappings.filter(
        (mapping) => mapping.targetType === selectedItem.targetType && mapping.targetId === selectedItem.id,
      )
    : [];
  const selectedConflicts = selectedItem
    ? props.workspace.translation.conflicts.filter(
        (conflict) => conflict.targetType === selectedItem.targetType && conflict.targetId === selectedItem.id,
      )
    : [];
  const selectedElementLabel = useMemo(
    () => describeSelectedElement(props.workspace, props.logicalSelection),
    [props.logicalSelection, props.workspace],
  );

  useEffect(() => {
    const nextPreferredStep = getPreferredStep(overview);
    if (!overview.itemsByStep[activeStep] || (activeStep !== "review" && overview.itemsByStep[activeStep].length === 0)) {
      setActiveStep(nextPreferredStep);
    }
  }, [activeStep, overview]);

  useEffect(() => {
    const currentItem = stepItems.find((item) => item.id === selectedItemId);
    if (!currentItem) {
      setSelectedItemId(getPreferredItem(stepItems)?.id ?? null);
    }
  }, [selectedItemId, stepItems]);

  useEffect(() => {
    const targetKeys = getSelectionTargetKeys(props.workspace, props.logicalSelection);
    const matchedTarget = targetKeys
      .map((targetKey) => findItemByTargetKey(overview, targetKey))
      .find((candidate) => candidate != null);

    if (matchedTarget) {
      setActiveStep(matchedTarget.step);
      setSelectedItemId(matchedTarget.item.id);
    }
  }, [overview, props.logicalSelection, props.workspace]);

  const totalPending = LOGICAL_TRANSLATION_STEPS.filter((step) => step.id !== "review").reduce(
    (sum, step) => sum + completion[step.id].pending,
    0,
  );
  const totalInvalid = LOGICAL_TRANSLATION_STEPS.filter((step) => step.id !== "review").reduce(
    (sum, step) => sum + completion[step.id].invalid,
    0,
  );
  const activeTargetKeys = stepItems.map((item) => buildTargetKey(item));
  const focusedTargetKey = selectedItem ? buildTargetKey(selectedItem) : null;
  const transformedTables = props.workspace.transformation.nodes.filter((node) => node.kind === "logical-table").length;
  const transformedFkEdges = props.workspace.transformation.edges.filter((edge) => edge.kind === "foreign-key").length;

  return (
    <>
      <aside className="toolbar-panel translation-step-rail" aria-label="Workflow di traduzione">
        <div className="translation-step-rail-header">
          <span>Traduzione</span>
          <strong>{totalInvalid > 0 ? `${totalInvalid} warning aperti` : `${totalPending} step ancora da fissare`}</strong>
        </div>

        <div className="translation-step-list" role="list">
          {LOGICAL_TRANSLATION_STEPS.map((step) => {
            const totals = completion[step.id];
            const hasAttention = totals.invalid > 0 || totals.pending > 0;
            return (
              <button
                key={step.id}
                type="button"
                className={
                  activeStep === step.id
                    ? "translation-step-button active"
                    : hasAttention
                      ? "translation-step-button attention"
                      : "translation-step-button"
                }
                onClick={() => {
                  setActiveStep(step.id);
                  setSelectedItemId(getPreferredItem(overview.itemsByStep[step.id])?.id ?? null);
                }}
              >
                <span className="translation-step-button-label">{step.label}</span>
                <span className="translation-step-button-meta">
                  {getStepTotalsLabel(totals.total, totals.pending, totals.invalid)}
                </span>
              </button>
            );
          })}
        </div>

        <button type="button" className="translation-reset-button" onClick={props.onResetTranslation}>
          Reset traduzione
        </button>
      </aside>

      <section className="workspace-main logical-main">
        <div className="translation-canvas-card canvas-panel">
          <header className="translation-stage-header">
          <div>
            <span className="translation-stage-eyebrow">Canvas Logico</span>
            <h2>Trasformazione in-place</h2>
          </div>
          <div className="translation-stage-summary">
            <span>{completion[activeStep].total} elementi nello step</span>
            <strong>{transformedTables} tabelle, {transformedFkEdges} FK visibili</strong>
          </div>
        </header>

        <div className="translation-stage-canvas translation-stage-canvas-single">
          <LogicalTransformationCanvas
            workspace={props.workspace}
            selection={props.logicalSelection}
            viewport={props.logicalViewport}
            fitRequestToken={props.logicalFitRequestToken}
            activeTargetKeys={activeTargetKeys}
            focusedTargetKey={focusedTargetKey}
            onViewportChange={props.onLogicalViewportChange}
            onSelectionChange={props.onLogicalSelectionChange}
            onPreviewModel={props.onPreviewLogicalModel}
            onCommitModel={props.onCommitLogicalModel}
            onRenameTable={props.onRenameTable}
            onRenameColumn={props.onRenameColumn}
          />
        </div>
        </div>
      </section>

      <aside className="inspector-panel translation-panel" aria-label="Pannello decisioni di traduzione">
        <section className="translation-panel-section">
          <span className="translation-panel-eyebrow">Step corrente</span>
          <h2>{LOGICAL_TRANSLATION_STEPS.find((step) => step.id === activeStep)?.label}</h2>
          <p>{LOGICAL_TRANSLATION_STEPS.find((step) => step.id === activeStep)?.description}</p>
        </section>

        {selectedElementLabel ? (
          <section className="translation-panel-section">
            <div className="translation-section-head">
              <h3>Elemento selezionato</h3>
            </div>
            <p>{selectedElementLabel}</p>
          </section>
        ) : null}

        {activeStep !== "review" ? (
          <>
            <section className="translation-panel-section">
              <div className="translation-section-head">
                <h3>Oggetti da risolvere</h3>
                <span className="translation-inline-counter">{stepItems.length}</span>
              </div>

              {stepItems.length > 0 ? (
                <div className="translation-item-list" role="list">
                  {stepItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={
                        selectedItem?.id === item.id
                          ? `translation-item-card active status-${item.status}`
                          : `translation-item-card status-${item.status}`
                      }
                      onClick={() => setSelectedItemId(item.id)}
                    >
                      <span className="translation-item-title">{item.label}</span>
                      <span className="translation-item-description">{item.description}</span>
                      <span className="translation-status-chip">{getStatusLabel(item)}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="translation-empty-hint">Nessun elemento da gestire in questo step.</div>
              )}
            </section>

            {selectedItem ? (
              <>
                <section className="translation-panel-section">
                  <div className="translation-section-head">
                    <h3>{selectedItem.label}</h3>
                    <span className={`translation-status-chip status-${selectedItem.status}`}>{getStatusLabel(selectedItem)}</span>
                  </div>
                  <p>{selectedItem.description}</p>
                  {selectedItem.currentSummary ? (
                    <div className="translation-summary-card">
                      <strong>Decisione attuale</strong>
                      <span>{selectedItem.currentSummary}</span>
                    </div>
                  ) : null}
                </section>

                <section className="translation-panel-section">
                  <div className="translation-section-head">
                    <h3>Regole disponibili</h3>
                    <span className="translation-inline-counter">{selectedItemChoices.length}</span>
                  </div>

                  <div className="translation-choice-list" role="list">
                    {selectedItemChoices.map((choice) => {
                      const isCurrentChoice =
                        selectedDecision?.rule === choice.rule &&
                        stableJson(selectedDecision.configuration) === stableJson(choice.configuration);
                      return (
                        <button
                          key={choice.id}
                          type="button"
                          className={
                            isCurrentChoice
                              ? "translation-choice-card active"
                              : choice.recommended
                                ? "translation-choice-card recommended"
                                : "translation-choice-card"
                          }
                          onClick={() => props.onApplyChoice(selectedItem, choice)}
                        >
                          <span className="translation-choice-title">{choice.label}</span>
                          <span className="translation-choice-description">{choice.description}</span>
                          {choice.previewLines && choice.previewLines.length > 0 ? (
                            <span className="translation-choice-preview">
                              {choice.previewLines.join(" ")}
                            </span>
                          ) : null}
                          <span className="translation-choice-summary">{choice.summary}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {selectedMappings.length > 0 ? (
                  <section className="translation-panel-section">
                    <h3>Artefatti generati</h3>
                    <div className="translation-artifact-list" role="list">
                      {selectedMappings.flatMap((mapping) =>
                        mapping.artifacts.map((artifact) => (
                          <button
                            key={`${mapping.decisionId}-${artifact.kind}-${artifact.id}`}
                            type="button"
                            className="translation-artifact-chip"
                            onClick={() => props.onLogicalSelectionChange(resolveArtifactSelection(props.workspace, artifact))}
                          >
                            <span>{artifact.label}</span>
                            <strong>{artifact.kind}</strong>
                          </button>
                        )),
                      )}
                    </div>
                  </section>
                ) : null}

                {selectedConflicts.length > 0 ? (
                  <section className="translation-panel-section">
                    <h3>Warning aperti</h3>
                    <div className="translation-warning-list" role="list">
                      {selectedConflicts.map((conflict) => (
                        <div key={conflict.id} className={`translation-warning-item level-${conflict.level}`}>
                          {conflict.message}
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}
              </>
            ) : null}
          </>
        ) : (
          <>
            <section className="translation-panel-section">
              <div className="translation-review-grid" role="list">
                {LOGICAL_TRANSLATION_STEPS.filter((step) => step.id !== "review").map((step) => (
                  <div key={step.id} className="translation-review-card" role="listitem">
                    <strong>{step.label}</strong>
                    <span>{completion[step.id].applied}/{completion[step.id].total} risolti</span>
                    <span>{completion[step.id].invalid} invalidi</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="translation-panel-section">
              <h3>Decisioni applicate</h3>
              {props.workspace.translation.decisions.length > 0 ? (
                <div className="translation-decision-list" role="list">
                  {props.workspace.translation.decisions.map((decision) => (
                    <div key={decision.id} className={`translation-decision-card status-${decision.status}`}>
                      <strong>{decision.summary}</strong>
                      <span>{decision.rule}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="translation-empty-hint">Nessuna decisione ancora registrata.</div>
              )}
            </section>

            <section className="translation-panel-section">
              <h3>Conflitti e warning</h3>
              {props.workspace.translation.conflicts.length > 0 || props.workspace.model.issues.length > 0 ? (
                <div className="translation-warning-list" role="list">
                  {props.workspace.translation.conflicts.map((conflict) => (
                    <div key={conflict.id} className={`translation-warning-item level-${conflict.level}`}>
                      {conflict.message}
                    </div>
                  ))}
                  {props.workspace.model.issues.map((issue) => (
                    <div key={issue.id} className={`translation-warning-item level-${issue.level}`}>
                      {issue.message}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="translation-empty-hint">Nessun conflitto aperto nella traduzione corrente.</div>
              )}
            </section>
          </>
        )}
      </aside>
    </>
  );
}
