import type { MouseEvent, PointerEvent } from "react";
import { getEdgeGeometry, pathFromPoints } from "../utils/geometry";
import type { DiagramEdge, DiagramNode, Point } from "../types/diagram";

const DIAGRAM_STROKE = "var(--diagram-stroke)";

interface EdgeLaneInfo {
  laneIndex: number;
  laneCount: number;
}

interface DiagramEdgeProps {
  edge: DiagramEdge;
  sourceNode: DiagramNode;
  targetNode: DiagramNode;
  laneInfo?: EdgeLaneInfo;
  selected: boolean;
  onPointerDown: (event: PointerEvent<SVGGElement>, edge: DiagramEdge) => void;
  onLabelPointerDown: (event: PointerEvent<SVGTextElement>, edge: DiagramEdge) => void;
  onDoubleClick: (event: MouseEvent<SVGGElement>, edge: DiagramEdge) => void;
}

function offsetPolyline(points: Point[], offset: number): Point[] {
  if (points.length < 2 || offset === 0) {
    return points;
  }

  const start = points[0];
  const end = points[points.length - 1];
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const length = Math.hypot(deltaX, deltaY) || 1;
  const normalX = (-deltaY / length) * offset;
  const normalY = (deltaX / length) * offset;

  return points.map((point) => ({
    x: point.x + normalX,
    y: point.y + normalY,
  }));
}

function getInheritanceConstraintLabel(edge: Extract<DiagramEdge, { type: "inheritance" }>): string {
  const parts: string[] = [];

  if (edge.isaDisjointness === "disjoint") {
    parts.push("D");
  } else if (edge.isaDisjointness === "overlap") {
    parts.push("O");
  }

  if (edge.isaCompleteness === "total") {
    parts.push("T");
  } else if (edge.isaCompleteness === "partial") {
    parts.push("P");
  }

  return parts.join("/");
}

export function DiagramEdgeView(props: DiagramEdgeProps) {
  const geometry = getEdgeGeometry(props.edge, props.sourceNode, props.targetNode, props.laneInfo);
  const pathData = pathFromPoints(geometry.points);
  const secondaryPathData =
    props.edge.type === "inheritance" && props.edge.isaCompleteness === "total"
      ? pathFromPoints(offsetPolyline(geometry.points, 6))
      : "";
  const dashArray = props.edge.lineStyle === "dashed" ? "8 5" : undefined;
  const connectorCardinality =
    props.edge.type === "connector" ? props.edge.cardinality?.trim() || "(X,Y)" : "";
  const attributeCardinality =
    props.edge.type === "attribute" ? props.edge.cardinality?.trim() || "" : "";
  const inheritanceConstraintLabel =
    props.edge.type === "inheritance" ? getInheritanceConstraintLabel(props.edge) : "";
  const displayLabel =
    props.edge.type === "connector"
      ? connectorCardinality
      : props.edge.type === "attribute"
        ? attributeCardinality
      : props.edge.type === "inheritance"
        ? props.edge.label
        : "";

  return (
    <g
      className={props.selected ? "diagram-edge selected" : "diagram-edge"}
      onPointerDown={(event) => props.onPointerDown(event, props.edge)}
      onDoubleClick={(event) => props.onDoubleClick(event, props.edge)}
    >
      <path d={pathData} fill="none" stroke="transparent" strokeWidth={16} />
      {secondaryPathData ? (
        <path
          d={secondaryPathData}
          fill="none"
          stroke={DIAGRAM_STROKE}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={dashArray}
        />
      ) : null}
      <path
        d={pathData}
        fill="none"
        stroke={DIAGRAM_STROKE}
        strokeWidth={props.selected ? 2.8 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dashArray}
        markerEnd={props.edge.type === "inheritance" ? "url(#arrowhead)" : undefined}
      />
      {inheritanceConstraintLabel ? (
        <text
          x={geometry.labelPoint.x}
          y={geometry.labelPoint.y - (displayLabel ? 18 : 8)}
          textAnchor="middle"
          className="edge-label inheritance-constraint-label"
          onPointerDown={(event) => props.onLabelPointerDown(event, props.edge)}
        >
          {inheritanceConstraintLabel}
        </text>
      ) : null}
      {displayLabel ? (
        <text
          x={geometry.labelPoint.x}
          y={geometry.labelPoint.y + (inheritanceConstraintLabel ? 10 : -6)}
          textAnchor="middle"
          className={props.edge.type === "connector" ? "edge-label connector-label" : "edge-label"}
          onPointerDown={(event) => props.onLabelPointerDown(event, props.edge)}
        >
          {displayLabel}
        </text>
      ) : null}
    </g>
  );
}
