import type { MouseEvent, PointerEvent } from "react";
import { getEdgeGeometry, pathFromPoints } from "../utils/geometry";
import type { DiagramEdge, DiagramNode } from "../types/diagram";

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

export function DiagramEdgeView(props: DiagramEdgeProps) {
  const geometry = getEdgeGeometry(props.edge, props.sourceNode, props.targetNode, props.laneInfo);
  const pathData = pathFromPoints(geometry.points);
  const dashArray = props.edge.lineStyle === "dashed" ? "8 5" : undefined;
  const connectorCardinality =
    props.edge.type === "connector" ? props.edge.cardinality?.trim() || "(X,Y)" : "";
  const displayLabel =
    props.edge.type === "connector"
      ? connectorCardinality
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
      <path
        d={pathData}
        fill="none"
        stroke="#111111"
        strokeWidth={props.selected ? 2.8 : 2}
        strokeDasharray={dashArray}
        markerEnd={props.edge.type === "inheritance" ? "url(#arrowhead)" : undefined}
      />
      {displayLabel ? (
        <text
          x={geometry.labelPoint.x}
          y={geometry.labelPoint.y - 6}
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
