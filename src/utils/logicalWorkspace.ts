import type {
  LogicalModel,
  LogicalTransformationColumn,
  LogicalTransformationEdge,
  LogicalTransformationNode,
  LogicalTransformationState,
  LogicalWorkspaceDocument,
} from "../types/logical";
import type { DiagramDocument } from "../types/diagram";
import {
  buildLogicalSourceSignature,
  createEmptyLogicalModel,
  generateLogicalModel,
  preserveLogicalTablePositions,
} from "./logicalMapping";

function nowIso(): string {
  return new Date().toISOString();
}

function buildTransformationColumns(
  tableId: string,
  columns: LogicalModel["tables"][number]["columns"],
): LogicalTransformationColumn[] {
  return columns.map((column) => ({
    id: column.id,
    name: column.name,
    isPrimaryKey: column.isPrimaryKey,
    isForeignKey: column.isForeignKey,
    isUnique: column.isUnique === true,
    isNullable: column.isNullable,
    references: column.references,
    relatedTargetKeys: [`table:${tableId}`, `column:${column.id}`],
  }));
}

function buildLogicalTransformationGraph(model: LogicalModel, sourceSignature: string): LogicalTransformationState {
  const nodes: LogicalTransformationNode[] = model.tables.map((table) => ({
    id: `logical-node-${table.id}`,
    kind: "logical-table",
    renderType: "table",
    label: table.name,
    x: table.x,
    y: table.y,
    width: table.width,
    height: table.height,
    status: "transformed",
    tableId: table.id,
    generatedByDecisionIds: [],
    relatedTargetKeys: [`table:${table.id}`],
    columns: buildTransformationColumns(table.id, table.columns),
  }));

  const edges: LogicalTransformationEdge[] = model.foreignKeys.map((foreignKey) => ({
    id: `logical-edge-${foreignKey.id}`,
    kind: "foreign-key",
    renderType: "foreign-key",
    sourceId: `logical-node-${foreignKey.fromTableId}`,
    targetId: `logical-node-${foreignKey.toTableId}`,
    label: foreignKey.name,
    status: "transformed",
    foreignKeyId: foreignKey.id,
    generatedByDecisionIds: [],
    relatedTargetKeys: [`foreignKey:${foreignKey.id}`],
  }));

  return {
    meta: {
      updatedAt: nowIso(),
      sourceSignature,
    },
    nodes,
    edges,
  };
}

function createEmptyTranslationMeta(sourceSignature: string) {
  const timestamp = nowIso();
  return {
    meta: {
      createdAt: timestamp,
      updatedAt: timestamp,
      sourceSignature,
    },
    decisions: [],
    mappings: [],
    conflicts: [],
  };
}

export { buildLogicalSourceSignature, createEmptyLogicalModel };

export function createEmptyLogicalWorkspace(
  diagram: DiagramDocument,
  previousWorkspace?: LogicalWorkspaceDocument,
): LogicalWorkspaceDocument {
  const sourceSignature = buildLogicalSourceSignature(diagram);
  const emptyModel = previousWorkspace?.model ?? createEmptyLogicalModel(`${diagram.meta.name} (logico)`);
  return {
    model: emptyModel,
    translation: createEmptyTranslationMeta(sourceSignature),
    transformation: buildLogicalTransformationGraph(emptyModel, sourceSignature),
  };
}

export function refreshLogicalWorkspace(
  diagram: DiagramDocument,
  workspace?: LogicalWorkspaceDocument,
): LogicalWorkspaceDocument {
  const sourceSignature = buildLogicalSourceSignature(diagram);
  const generatedModel = generateLogicalModel(diagram);
  const model = workspace ? preserveLogicalTablePositions(generatedModel, workspace.model) : generatedModel;

  return {
    model,
    translation: createEmptyTranslationMeta(sourceSignature),
    transformation: buildLogicalTransformationGraph(model, sourceSignature),
  };
}

export function updateLogicalWorkspaceModel(
  diagram: DiagramDocument,
  workspace: LogicalWorkspaceDocument,
  nextModel: LogicalModel,
): LogicalWorkspaceDocument {
  const sourceSignature = buildLogicalSourceSignature(diagram);
  return {
    ...workspace,
    model: nextModel,
    translation: {
      ...workspace.translation,
      meta: {
        ...workspace.translation.meta,
        updatedAt: nowIso(),
        sourceSignature,
      },
      decisions: [],
      mappings: [],
      conflicts: [],
    },
    transformation: buildLogicalTransformationGraph(nextModel, sourceSignature),
  };
}
