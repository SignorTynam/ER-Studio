import type { Viewport } from "./diagram";

export type LogicalTableKind = "entity" | "associative" | "relationship";
export type LogicalIssueLevel = "warning" | "error";

export type LogicalIssueCode =
  | "ENTITY_WITHOUT_PK"
  | "RELATIONSHIP_WITHOUT_CARDINALITY"
  | "RELATIONSHIP_UNSUPPORTED_ARITY"
  | "RELATIONSHIP_WITHOUT_PARTICIPANTS"
  | "TABLE_NAME_COLLISION"
  | "COLUMN_NAME_COLLISION"
  | "FK_NAME_COLLISION"
  | "AMBIGUOUS_MAPPING"
  | "MULTIVALUED_ATTRIBUTE";

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
