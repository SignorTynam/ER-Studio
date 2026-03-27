import type { FocusEvent, MouseEvent, PointerEvent, ReactNode } from "react";
import { getEdgeGeometry, pathFromPoints } from "../utils/geometry";
import type { DiagramEdge, DiagramNode, Point } from "../types/diagram";

const DIAGRAM_STROKE = "var(--diagram-stroke)";
const DIAGRAM_FOCUS = "var(--diagram-focus)";
const DIAGRAM_DRAG = "var(--diagram-drag)";
const DIAGRAM_WARNING = "var(--diagram-warning)";
const DIAGRAM_WARNING_FILL = "var(--diagram-warning-fill)";
const DIAGRAM_ERROR = "var(--diagram-error)";
const DIAGRAM_ERROR_FILL = "var(--diagram-error-fill)";

type DiagramIssueLevel = "warning" | "error" | undefined;

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
  dragging: boolean;
  ghost?: boolean;
  focused: boolean;
  focusable: boolean;
  validationLevel?: DiagramIssueLevel;
  validationCount?: number;
  onFocus: (edge: DiagramEdge) => void;
  onBlur: (event: FocusEvent<SVGGElement>) => void;
  onPointerDown: (event: PointerEvent<SVGGElement>, edge: DiagramEdge) => void;
  onLabelPointerDown: (event: PointerEvent<SVGTextElement>, edge: DiagramEdge) => void;
  onDoubleClick: (event: MouseEvent<SVGGElement>, edge: DiagramEdge) => void;
}

function getValidationStroke(level: DiagramIssueLevel): string {
  if (level === "error") {
    return DIAGRAM_ERROR;
  }

  if (level === "warning") {
    return DIAGRAM_WARNING;
  }

  return DIAGRAM_STROKE;
}

function getValidationHalo(level: DiagramIssueLevel): string {
  if (level === "error") {
    return DIAGRAM_ERROR_FILL;
  }

  if (level === "warning") {
    return DIAGRAM_WARNING_FILL;
  }

  return "transparent";
}

function renderValidationBadge(x: number, y: number, level: DiagramIssueLevel, count?: number): ReactNode {
  if (!level) {
    return null;
  }

  const badgeText = count && count > 1 ? String(Math.min(count, 9)) : "!";
  return (
    <g className="diagram-validation-badge" aria-hidden="true">
      <circle cx={x} cy={y} r={9} fill="#fffdf7" stroke={getValidationStroke(level)} strokeWidth={2} />
      <text
        x={x}
        y={y + 0.5}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={getValidationStroke(level)}
        style={{ fontSize: "10px", fontWeight: 700 }}
      >
        {badgeText}
      </text>
    </g>
  );
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
  const isGhost = props.ghost === true;
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
  const strokeColor = isGhost ? DIAGRAM_DRAG : getValidationStroke(props.validationLevel);
  const selectedStrokeColor = !isGhost && props.selected && !props.validationLevel ? DIAGRAM_FOCUS : strokeColor;
  const haloColor = isGhost ? "transparent" : getValidationHalo(props.validationLevel);
  const badgeY = geometry.labelPoint.y - (inheritanceConstraintLabel ? 28 : 16);
  const baseOpacity = isGhost ? 0.58 : 1;
  const labelOpacity = isGhost ? 0.72 : 1;
  const primaryDashArray = isGhost ? "10 8" : dashArray;
  const secondaryDashArray = isGhost ? "10 8" : dashArray;
  const groupClassName = isGhost ? "diagram-edge ghost" : props.selected ? "diagram-edge selected" : "diagram-edge";
  const groupTabIndex = !isGhost && props.focusable ? 0 : -1;
  const groupFocusable = !isGhost && props.focusable ? "true" : "false";

  return (
    <g
      className={groupClassName}
      tabIndex={groupTabIndex}
      focusable={groupFocusable}
      aria-label={isGhost ? undefined : `Collegamento ${props.edge.type} tra ${props.sourceNode.label} e ${props.targetNode.label}`}
      aria-hidden={isGhost ? true : undefined}
      pointerEvents={isGhost ? "none" : undefined}
      onFocus={isGhost ? undefined : () => props.onFocus(props.edge)}
      onBlur={isGhost ? undefined : props.onBlur}
      onPointerDown={isGhost ? undefined : (event) => props.onPointerDown(event, props.edge)}
      onDoubleClick={isGhost ? undefined : (event) => props.onDoubleClick(event, props.edge)}
    >
      {!isGhost ? <path d={pathData} fill="none" stroke="transparent" strokeWidth={16} /> : null}
      {!isGhost && props.validationLevel ? (
        <path
          d={pathData}
          fill="none"
          stroke={haloColor}
          strokeWidth={7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {!isGhost && props.focused ? (
        <path
          d={pathData}
          fill="none"
          stroke={DIAGRAM_FOCUS}
          strokeWidth={3.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.62}
        />
      ) : null}
      {secondaryPathData ? (
        <path
          d={secondaryPathData}
          fill="none"
          stroke={strokeColor}
          strokeWidth={isGhost ? 1.4 : 1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={secondaryDashArray}
          opacity={baseOpacity}
        />
      ) : null}
      <path
        d={pathData}
        fill="none"
        stroke={selectedStrokeColor}
        strokeWidth={isGhost ? 1.8 : props.dragging ? 2.6 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={primaryDashArray}
        markerEnd={props.edge.type === "inheritance" ? "url(#arrowhead)" : undefined}
        opacity={baseOpacity}
      />
      {inheritanceConstraintLabel ? (
        <text
          x={geometry.labelPoint.x}
          y={geometry.labelPoint.y - (displayLabel ? 18 : 8)}
          textAnchor="middle"
          className="edge-label inheritance-constraint-label"
          fill={strokeColor}
          opacity={labelOpacity}
          onPointerDown={isGhost ? undefined : (event) => props.onLabelPointerDown(event, props.edge)}
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
          fill={strokeColor}
          opacity={labelOpacity}
          onPointerDown={isGhost ? undefined : (event) => props.onLabelPointerDown(event, props.edge)}
        >
          {displayLabel}
        </text>
      ) : null}
      {!isGhost ? renderValidationBadge(geometry.labelPoint.x + 18, badgeY, props.validationLevel, props.validationCount) : null}
    </g>
  );
}
