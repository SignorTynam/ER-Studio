import type { Viewport } from "./diagram";

export type LogicalTableKind = "entity" | "associative" | "relationship";
export type LogicalIssueLevel = "warning" | "error";
export type LogicalTranslationStep =
  | "entities"
  | "weak-entities"
  | "relationships"
  | "multivalued-attributes"
  | "generalizations"
  | "review";
export type LogicalTranslationTargetType =
  | "entity"
  | "weak-entity"
  | "relationship"
  | "attribute"
  | "generalization";
export type LogicalTranslationDecisionStatus = "applied" | "invalid";
export type LogicalTranslationArtifactKind = "table" | "column" | "foreignKey" | "edge";
export type LogicalTranslationItemStatus = "pending" | "applied" | "invalid";
export type LogicalTranslationRuleKind =
  | "entity-table-internal"
  | "entity-table-external"
  | "entity-table-without-key"
  | "weak-entity-table"
  | "relationship-foreign-key"
  | "relationship-table"
  | "multivalued-table"
  | "generalization-table-per-type"
  | "generalization-subtypes-only"
  | "generalization-single-table";
export type LogicalTranslationPreviewMode = "source" | "logical";

export type LogicalIssueCode =
  | "ENTITY_WITHOUT_PK"
  | "RELATIONSHIP_WITHOUT_CARDINALITY"
  | "RELATIONSHIP_UNSUPPORTED_ARITY"
  | "RELATIONSHIP_WITHOUT_PARTICIPANTS"
  | "TABLE_NAME_COLLISION"
  | "COLUMN_NAME_COLLISION"
  | "FK_NAME_COLLISION"
  | "AMBIGUOUS_MAPPING"
  | "MULTIVALUED_ATTRIBUTE"
  | "UNRESOLVED_TRANSFORMATION"
  | "INVALID_TRANSFORMATION";

export interface LogicalIssue {
  id: string;
  level: LogicalIssueLevel;
  code: LogicalIssueCode;
  message: string;
  tableId?: string;
  columnId?: string;
  relationshipId?: string;
}

export interface LogicalColumnReference {
  foreignKeyId: string;
  targetTableId: string;
  targetColumnId: string;
}

export interface LogicalColumn {
  id: string;
  name: string;
  sourceAttributeId?: string;
  sourceRelationshipId?: string;
  generatedByDecisionId?: string;
  originLabel?: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isNullable: boolean;
  isGenerated?: boolean;
  dataType?: string;
  references: LogicalColumnReference[];
}

export interface LogicalTable {
  id: string;
  name: string;
  kind: LogicalTableKind;
  sourceEntityId?: string;
  sourceRelationshipId?: string;
  generatedByDecisionId?: string;
  originLabel?: string;
  columns: LogicalColumn[];
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LogicalForeignKeyMapping {
  fromColumnId: string;
  toColumnId: string;
}

export interface LogicalForeignKey {
  id: string;
  name: string;
  fromTableId: string;
  toTableId: string;
  mappings: LogicalForeignKeyMapping[];
  sourceRelationshipId?: string;
  generatedByDecisionId?: string;
  required: boolean;
  unique?: boolean;
}

export interface LogicalEdge {
  id: string;
  foreignKeyId: string;
  fromTableId: string;
  toTableId: string;
  label: string;
}

export interface LogicalModel {
  meta: {
    name: string;
    generatedAt: string;
    sourceDiagramVersion: number;
    sourceSignature: string;
  };
  tables: LogicalTable[];
  foreignKeys: LogicalForeignKey[];
  edges: LogicalEdge[];
  issues: LogicalIssue[];
}

export interface LogicalTranslationDecision {
  id: string;
  targetType: LogicalTranslationTargetType;
  targetId: string;
  step: LogicalTranslationStep;
  rule: LogicalTranslationRuleKind;
  summary: string;
  appliedAt: string;
  status: LogicalTranslationDecisionStatus;
  configuration?: Record<string, string | string[] | boolean | number | null | undefined>;
}

export interface LogicalTranslationArtifactRef {
  kind: LogicalTranslationArtifactKind;
  id: string;
  label: string;
}

export interface LogicalTranslationMapping {
  decisionId: string;
  targetType: LogicalTranslationTargetType;
  targetId: string;
  summary: string;
  artifacts: LogicalTranslationArtifactRef[];
}

export interface LogicalTranslationConflict {
  id: string;
  targetType: LogicalTranslationTargetType;
  targetId: string;
  level: LogicalIssueLevel;
  message: string;
  decisionId?: string;
}

export interface LogicalTranslationChoice {
  id: string;
  step: LogicalTranslationStep;
  rule: LogicalTranslationRuleKind;
  label: string;
  description: string;
  summary: string;
  configuration?: Record<string, string | string[] | boolean | number | null | undefined>;
  previewLines?: string[];
  recommended?: boolean;
}

export interface LogicalTranslationItem {
  id: string;
  targetType: LogicalTranslationTargetType;
  step: LogicalTranslationStep;
  label: string;
  description: string;
  status: LogicalTranslationItemStatus;
  currentDecisionId?: string;
  currentSummary?: string;
  choiceIds: string[];
  conflictMessages: string[];
}

export interface LogicalTranslationState {
  meta: {
    createdAt: string;
    updatedAt: string;
    sourceSignature: string;
  };
  decisions: LogicalTranslationDecision[];
  mappings: LogicalTranslationMapping[];
  conflicts: LogicalTranslationConflict[];
}

export interface LogicalWorkspaceDocument {
  model: LogicalModel;
  translation: LogicalTranslationState;
}

export interface LogicalSelection {
  tableId: string | null;
  columnId: string | null;
  edgeId: string | null;
}

export const EMPTY_LOGICAL_SELECTION: LogicalSelection = {
  tableId: null,
  columnId: null,
  edgeId: null,
};

export interface LogicalViewState {
  viewport: Viewport;
  selection: LogicalSelection;
}
