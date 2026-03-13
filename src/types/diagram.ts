export type NodeKind = "entity" | "relationship" | "attribute" | "text";
export type EdgeKind = "connector" | "attribute" | "inheritance";
export type ToolKind =
  | "move"
  | "select"
  | "entity"
  | "relationship"
  | "attribute"
  | "connector"
  | "inheritance"
  | "text";
export type EditorMode = "edit" | "view";
export type LineStyle = "solid" | "dashed";

export interface Point {
  x: number;
  y: number;
}

export interface Bounds extends Point {
  width: number;
  height: number;
}

export interface BaseNode extends Bounds {
  id: string;
  type: NodeKind;
  label: string;
}

export interface EntityNode extends BaseNode {
  type: "entity";
}

export interface RelationshipNode extends BaseNode {
  type: "relationship";
}

export interface AttributeNode extends BaseNode {
  type: "attribute";
  isIdentifier?: boolean;
}

export interface TextNode extends BaseNode {
  type: "text";
}

export type DiagramNode =
  | EntityNode
  | RelationshipNode
  | AttributeNode
  | TextNode;

export interface BaseEdge {
  id: string;
  type: EdgeKind;
  sourceId: string;
  targetId: string;
  label: string;
  lineStyle: LineStyle;
  manualOffset?: number;
}

export interface ConnectorEdge extends BaseEdge {
  type: "connector";
  cardinality?: string;
}

export interface AttributeEdge extends BaseEdge {
  type: "attribute";
  cardinality?: string;
}

export interface InheritanceEdge extends BaseEdge {
  type: "inheritance";
}

export type DiagramEdge = ConnectorEdge | AttributeEdge | InheritanceEdge;

export interface DiagramDocument {
  meta: {
    name: string;
    version: number;
  };
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface SelectionState {
  nodeIds: string[];
  edgeIds: string[];
}

export interface ValidationIssue {
  id: string;
  level: "warning" | "error";
  message: string;
  targetId: string;
  targetType: "node" | "edge";
}

export interface EdgeGeometry {
  points: Point[];
  labelPoint: Point;
}

