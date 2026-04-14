import { useEffect, useMemo, useRef, useState } from "react";
import { DiagramCanvas } from "../canvas/DiagramCanvas";
import type {
  DiagramDocument,
  DiagramEdge,
  EditorMode,
  Point,
  SelectionState,
  ToolKind,
  ValidationIssue,
  Viewport,
} from "../types/diagram";
import { EMPTY_LOGICAL_SELECTION } from "../types/logical";
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
import { LogicalCanvas } from "./LogicalCanvas";

interface LogicalTranslationWorkspaceProps {
  diagram: DiagramDocument;
  workspace: LogicalWorkspaceDocument;
  sourceViewport: Viewport;
  logicalViewport: Viewport;
  logicalSelection: LogicalSelection;
  logicalFitRequestToken: number;
  onSourceViewportChange: (viewport: Viewport) => void;
  onLogicalViewportChange: (viewport: Viewport) => void;
  onLogicalSelectionChange: (selection: LogicalSelection) => void;
  onPreviewLogicalModel: (model: LogicalModel) => void;
  onCommitLogicalModel: (model: LogicalModel, previous: LogicalModel) => void;
  onRenameTable: (tableId: string, nextName: string) => void;
  onRenameColumn: (tableId: string, columnId: string, nextName: string) => void;
  onApplyChoice: (item: LogicalTranslationItem, choice: LogicalTranslationChoice) => void;
  onResetTranslation: () => void;
}

const EMPTY_SELECTION: SelectionState = { nodeIds: [], edgeIds: [] };

function stableJson(value: unknown): string {
  return JSON.stringify(value ?? null);
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

function getSourceSelectionForItem(diagram: DiagramDocument, item: LogicalTranslationItem | null): SelectionState {
  if (!item) {
    return EMPTY_SELECTION;
  }

  if (item.targetType === "generalization") {
    const inheritanceEdgeIds = diagram.edges
      .filter((edge) => edge.type === "inheritance" && edge.targetId === item.id)
      .map((edge) => edge.id);
    return {
      nodeIds: [item.id],
      edgeIds: inheritanceEdgeIds,
    };
  }

  return {
    nodeIds: [item.id],
    edgeIds: [],
  };
}

function buildTranslationIssues(
  diagram: DiagramDocument,
  activeStep: LogicalTranslationStep,
  items: LogicalTranslationItem[],
): ValidationIssue[] {
  if (activeStep === "review") {
    return [];
  }

  const issues: ValidationIssue[] = [];
  items.forEach((item) => {
    if (item.status === "applied") {
      return;
    }

    const level = item.status === "invalid" ? "error" : "warning";
    const message =
      item.status === "invalid"
        ? item.conflictMessages[0] ?? `${item.label}: trasformazione da rivedere.`
        : `${item.label}: trasformazione ancora da fissare.`;

    if (item.targetType === "generalization") {
      issues.push({
        id: `translation-node-${activeStep}-${item.id}`,
        level,
        message,
        targetId: item.id,
        targetType: "node",
      });

      diagram.edges
        .filter((edge) => edge.type === "inheritance" && edge.targetId === item.id)
        .forEach((edge) => {
          issues.push({
            id: `translation-edge-${activeStep}-${edge.id}`,
            level,
            message,
            targetId: edge.id,
            targetType: "edge",
          });
          issues.push({
            id: `translation-node-${activeStep}-${edge.sourceId}`,
            level,
            message,
            targetId: edge.sourceId,
            targetType: "node",
          });
        });
      return;
    }

    issues.push({
      id: `translation-${activeStep}-${item.id}`,
      level,
      message,
      targetId: item.id,
      targetType: "node",
    });
  });

  return issues;
}

function resolveItemFromSourceSelection(
  diagram: DiagramDocument,
  activeStep: LogicalTranslationStep,
  items: LogicalTranslationItem[],
  selection: SelectionState,
): LogicalTranslationItem | null {
  if (selection.edgeIds.length > 0 && activeStep === "generalizations") {
    const selectedEdge = diagram.edges.find((edge) => edge.id === selection.edgeIds[0] && edge.type === "inheritance");
    if (selectedEdge) {
      return items.find((item) => item.id === selectedEdge.targetId) ?? null;
    }
  }

  if (selection.nodeIds.length === 0) {
    return null;
  }

  const selectedNodeId = selection.nodeIds[0];
  const exactItem = items.find((item) => item.id === selectedNodeId);
  if (exactItem) {
    return exactItem;
  }

  if (activeStep === "generalizations") {
    const selectedInheritance = diagram.edges.find(
      (edge): edge is DiagramEdge => edge.type === "inheritance" && edge.sourceId === selectedNodeId,
    );
    if (selectedInheritance) {
      return items.find((item) => item.id === selectedInheritance.targetId) ?? null;
    }
  }

  return null;
}

function resolveArtifactSelection(model: LogicalModel, artifact: { kind: string; id: string }): LogicalSelection {
  if (artifact.kind === "table") {
    return { tableId: artifact.id, columnId: null, edgeId: null };
  }

  if (artifact.kind === "column") {
    const ownerTable = model.tables.find((table) => table.columns.some((column) => column.id === artifact.id));
    return {
      tableId: ownerTable?.id ?? null,
      columnId: artifact.id,
      edgeId: null,
    };
  }

  if (artifact.kind === "foreignKey") {
    const ownerEdge = model.edges.find((edge) => edge.foreignKeyId === artifact.id);
    return {
      tableId: ownerEdge?.fromTableId ?? null,
      columnId: null,
      edgeId: ownerEdge?.id ?? null,
    };
  }

  if (artifact.kind === "edge") {
    const edge = model.edges.find((candidate) => candidate.id === artifact.id);
    return {
      tableId: edge?.fromTableId ?? null,
      columnId: null,
      edgeId: edge?.id ?? null,
    };
  }

  return { ...EMPTY_LOGICAL_SELECTION };
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

function noopCreateNode(): string {
  return "";
}

function noopCreateEdge(): { success: boolean; message: string } {
  return { success: false, message: "Canvas sorgente in sola lettura." };
}

function noopPointHandler(_type: Extract<ToolKind, "entity" | "relationship" | "attribute">, _point: Point): string {
  return "";
}

function noopDeleteHandler(): void {}

function noopRenameHandler(): void {}

function noopStatusHandler(): void {}

const SOURCE_CANVAS_TOOL: ToolKind = "select";
const SOURCE_CANVAS_MODE: EditorMode = "view";

export function LogicalTranslationWorkspace(props: LogicalTranslationWorkspaceProps) {
  const sourceSvgRef = useRef<SVGSVGElement>(null);
  const overview = useMemo(
    () => buildLogicalTranslationOverview(props.diagram, props.workspace),
    [props.diagram, props.workspace],
  );
  const completion = useMemo(() => getLogicalTranslationStepCompletion(overview), [overview]);
  const [activeStep, setActiveStep] = useState<LogicalTranslationStep>(() => getPreferredStep(overview));
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [sourceSelection, setSourceSelection] = useState<SelectionState>(EMPTY_SELECTION);

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
  const stepIssues = useMemo(
    () => buildTranslationIssues(props.diagram, activeStep, stepItems),
    [activeStep, props.diagram, stepItems],
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
    setSourceSelection(getSourceSelectionForItem(props.diagram, selectedItem ?? null));
  }, [activeStep, props.diagram, selectedItem]);

  const totalPending = LOGICAL_TRANSLATION_STEPS.filter((step) => step.id !== "review").reduce(
    (sum, step) => sum + completion[step.id].pending,
    0,
  );
  const totalInvalid = LOGICAL_TRANSLATION_STEPS.filter((step) => step.id !== "review").reduce(
    (sum, step) => sum + completion[step.id].invalid,
    0,
  );

  return (
    <div className="logical-translation-shell">
      <aside className="translation-step-rail" aria-label="Workflow di traduzione">
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

      <div className="translation-workbench">
        <div className="translation-canvas-stack">
          <section className="translation-stage-card">
            <header className="translation-stage-header">
              <div>
                <span className="translation-stage-eyebrow">Schema sorgente</span>
                <h2>ER da trasformare</h2>
              </div>
              <div className="translation-stage-summary">
                <span>{completion[activeStep].total} elementi nello step</span>
                <strong>{getStepTotalsLabel(completion[activeStep].total, completion[activeStep].pending, completion[activeStep].invalid)}</strong>
              </div>
            </header>

            <div className="translation-stage-canvas translation-stage-canvas-source">
              <DiagramCanvas
                diagram={props.diagram}
                selection={sourceSelection}
                tool={SOURCE_CANVAS_TOOL}
                mode={SOURCE_CANVAS_MODE}
                viewport={props.sourceViewport}
                issues={stepIssues}
                statusMessage=""
                svgRef={sourceSvgRef}
                onViewportChange={props.onSourceViewportChange}
                onSelectionChange={(nextSelection) => {
                  setSourceSelection(nextSelection);
                  const nextItem = resolveItemFromSourceSelection(props.diagram, activeStep, stepItems, nextSelection);
                  if (nextItem) {
                    setSelectedItemId(nextItem.id);
                  }
                }}
                onPreviewDiagram={() => undefined}
                onCommitDiagram={() => undefined}
                onCreateNode={noopPointHandler}
                onCreateEdge={noopCreateEdge}
                onCreateExternalIdentifier={noopCreateEdge}
                onDeleteNode={noopDeleteHandler}
                onDeleteEdge={noopDeleteHandler}
                onDeleteSelection={noopDeleteHandler}
                onDeleteExternalIdentifier={noopDeleteHandler}
                onRenameNode={noopRenameHandler}
                onRenameEdge={noopRenameHandler}
                onStatusMessageChange={noopStatusHandler}
              />
            </div>
          </section>

          <section className="translation-stage-card">
            <header className="translation-stage-header">
              <div>
                <span className="translation-stage-eyebrow">Schema derivato</span>
                <h2>Logico incrementale</h2>
              </div>
              <div className="translation-stage-summary">
                <span>{props.workspace.model.tables.length} tabelle</span>
                <strong>{props.workspace.model.foreignKeys.length} FK generate</strong>
              </div>
            </header>

            <div className="translation-stage-canvas translation-stage-canvas-logical">
              <LogicalCanvas
                model={props.workspace.model}
                selection={props.logicalSelection}
                viewport={props.logicalViewport}
                fitRequestToken={props.logicalFitRequestToken}
                onViewportChange={props.onLogicalViewportChange}
                onSelectionChange={props.onLogicalSelectionChange}
                onPreviewModel={props.onPreviewLogicalModel}
                onCommitModel={props.onCommitLogicalModel}
                onRenameTable={props.onRenameTable}
                onRenameColumn={props.onRenameColumn}
              />
            </div>
          </section>
        </div>

        <aside className="translation-panel" aria-label="Pannello decisioni di traduzione">
          <section className="translation-panel-section">
            <span className="translation-panel-eyebrow">Step corrente</span>
            <h2>{LOGICAL_TRANSLATION_STEPS.find((step) => step.id === activeStep)?.label}</h2>
            <p>{LOGICAL_TRANSLATION_STEPS.find((step) => step.id === activeStep)?.description}</p>
          </section>

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
                              onClick={() => props.onLogicalSelectionChange(resolveArtifactSelection(props.workspace.model, artifact))}
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
      </div>
    </div>
  );
}
