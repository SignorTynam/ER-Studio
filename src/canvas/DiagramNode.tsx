import type { FocusEvent, MouseEvent, PointerEvent, ReactNode } from "react";
import type { DiagramNode, Point } from "../types/diagram";

const DIAGRAM_NODE_FILL = "var(--diagram-node-fill)";
const DIAGRAM_STROKE = "var(--diagram-stroke)";
const DIAGRAM_SELECTION = "var(--diagram-selection-stroke)";
const DIAGRAM_FOCUS = "var(--diagram-focus)";
const DIAGRAM_PENDING = "var(--diagram-pending)";
const DIAGRAM_WARNING = "var(--diagram-warning)";
const DIAGRAM_WARNING_FILL = "var(--diagram-warning-fill)";
const DIAGRAM_ERROR = "var(--diagram-error)";
const DIAGRAM_ERROR_FILL = "var(--diagram-error-fill)";

type DiagramIssueLevel = "warning" | "error" | undefined;

interface AttributeLabelLayout {
  x: number;
  y: number;
  textAnchor: "start" | "middle" | "end";
  dominantBaseline: "middle";
}

function getAttributeIndicatorOffset(node: DiagramNode): number {
  return 24;
}

function getAttributeVerticalAnchor(node: DiagramNode): number {
  return node.x + 10;
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
      <circle cx={x} cy={y} r={10} fill="#fffdf7" stroke={getValidationStroke(level)} strokeWidth={2.2} />
      <text
        x={x}
        y={y + 0.5}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={getValidationStroke(level)}
        style={{ fontSize: "11px", fontWeight: 700 }}
      >
        {badgeText}
      </text>
    </g>
  );
}

export function getAttributeLabelLayout(node: DiagramNode, direction?: Point): AttributeLabelLayout {
  const cy = node.y + node.height / 2;
  const indicatorOffset = getAttributeIndicatorOffset(node);

  if (!direction) {
    return {
      x: node.x + indicatorOffset,
      y: cy,
      textAnchor: "start",
      dominantBaseline: "middle",
    };
  }

  if (Math.abs(direction.x) >= Math.abs(direction.y)) {
    const goesRight = direction.x >= 0;
    return {
      x: goesRight ? node.x - 6 : node.x + 24,
      y: cy,
      textAnchor: goesRight ? "end" : "start",
      dominantBaseline: "middle",
    };
  }

  const goesDown = direction.y >= 0;
  return {
    x: getAttributeVerticalAnchor(node),
    y: goesDown ? node.y - 8 : node.y + node.height + 8,
    textAnchor: "middle",
    dominantBaseline: "middle",
  };
}

interface DiagramNodeProps {
  node: DiagramNode;
  selected: boolean;
  pending: boolean;
  focused: boolean;
  focusable: boolean;
  validationLevel?: DiagramIssueLevel;
  validationCount?: number;
  attributeDirection?: Point;
  onFocus: (node: DiagramNode) => void;
  onBlur: (event: FocusEvent<SVGGElement>) => void;
  onPointerDown: (event: PointerEvent<SVGGElement>, node: DiagramNode) => void;
  onDoubleClick: (event: MouseEvent<SVGGElement>, node: DiagramNode) => void;
}

export function DiagramNodeView(props: DiagramNodeProps) {
  const { node } = props;
  const strokeColor = getValidationStroke(props.validationLevel);
  const haloColor = getValidationHalo(props.validationLevel);
  const badgeCount = props.validationCount;

  if (node.type === "entity") {
    const inset = 8;
    return (
      <g
        className={props.selected ? "diagram-node selected" : "diagram-node"}
        tabIndex={props.focusable ? 0 : -1}
        focusable={props.focusable ? "true" : "false"}
        aria-label={`Nodo ${node.type}: ${node.label}`}
        onFocus={() => props.onFocus(node)}
        onBlur={props.onBlur}
        onPointerDown={(event) => props.onPointerDown(event, node)}
        onDoubleClick={(event) => props.onDoubleClick(event, node)}
      >
        {props.validationLevel ? (
          <rect
            x={node.x - 8}
            y={node.y - 8}
            width={node.width + 16}
            height={node.height + 16}
            fill="none"
            stroke={haloColor}
            strokeWidth={7}
          />
        ) : null}
        {props.focused ? (
          <rect
            x={node.x - 10}
            y={node.y - 10}
            width={node.width + 20}
            height={node.height + 20}
            fill="none"
            stroke={DIAGRAM_FOCUS}
            strokeWidth={2}
            strokeDasharray="8 6"
          />
        ) : null}
        <rect
          x={node.x}
          y={node.y}
          width={node.width}
          height={node.height}
          fill={DIAGRAM_NODE_FILL}
          stroke={strokeColor}
          strokeWidth={props.selected || props.pending ? 2.6 : 2}
        />
        {node.isWeak === true ? (
          <rect
            x={node.x + inset}
            y={node.y + inset}
            width={Math.max(0, node.width - inset * 2)}
            height={Math.max(0, node.height - inset * 2)}
            fill="none"
            stroke={strokeColor}
            strokeWidth={props.selected || props.pending ? 2.2 : 1.8}
          />
        ) : null}
        {props.pending ? (
          <circle cx={node.x + node.width + 8} cy={node.y - 8} r={6} fill={DIAGRAM_PENDING} />
        ) : null}
        {renderValidationBadge(node.x + node.width + 10, node.y - 10, props.validationLevel, badgeCount)}
        <text
          x={node.x + node.width / 2}
          y={node.y + node.height / 2}
          className="entity-label"
          textAnchor="middle"
          dominantBaseline="middle"
          fill={strokeColor}
        >
          {node.label.toUpperCase()}
        </text>
      </g>
    );
  }

  if (node.type === "relationship") {
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    const points = `${cx},${node.y} ${node.x + node.width},${cy} ${cx},${node.y + node.height} ${node.x},${cy}`;

    return (
      <g
        className={props.selected ? "diagram-node selected" : "diagram-node"}
        tabIndex={props.focusable ? 0 : -1}
        focusable={props.focusable ? "true" : "false"}
        aria-label={`Nodo ${node.type}: ${node.label}`}
        onFocus={() => props.onFocus(node)}
        onBlur={props.onBlur}
        onPointerDown={(event) => props.onPointerDown(event, node)}
        onDoubleClick={(event) => props.onDoubleClick(event, node)}
      >
        {props.validationLevel ? (
          <polygon
            points={`${cx},${node.y - 8} ${node.x + node.width + 8},${cy} ${cx},${node.y + node.height + 8} ${node.x - 8},${cy}`}
            fill="none"
            stroke={haloColor}
            strokeWidth={7}
          />
        ) : null}
        {props.focused ? (
          <polygon
            points={`${cx},${node.y - 10} ${node.x + node.width + 10},${cy} ${cx},${node.y + node.height + 10} ${node.x - 10},${cy}`}
            fill="none"
            stroke={DIAGRAM_FOCUS}
            strokeWidth={2}
            strokeDasharray="8 6"
          />
        ) : null}
        <polygon
          points={points}
          fill={DIAGRAM_NODE_FILL}
          stroke={strokeColor}
          strokeWidth={props.selected || props.pending ? 2.6 : 2}
        />
        {props.pending ? (
          <circle cx={node.x + node.width + 8} cy={node.y + 8} r={6} fill={DIAGRAM_PENDING} />
        ) : null}
        {renderValidationBadge(node.x + node.width + 10, node.y - 8, props.validationLevel, badgeCount)}
        <text x={cx} y={cy} className="shape-label" textAnchor="middle" dominantBaseline="middle" fill={strokeColor}>
          {node.label}
        </text>
      </g>
    );
  }

  if (node.type === "attribute") {
    const cy = node.y + node.height / 2;
    const isIdentifier = node.isIdentifier === true;
    const isMultivalued = node.isMultivalued === true;

    return (
      <g
        className={props.selected ? "diagram-node selected" : "diagram-node"}
        tabIndex={props.focusable ? 0 : -1}
        focusable={props.focusable ? "true" : "false"}
        aria-label={`Nodo ${node.type}: ${node.label}`}
        onFocus={() => props.onFocus(node)}
        onBlur={props.onBlur}
        onPointerDown={(event) => props.onPointerDown(event, node)}
        onDoubleClick={(event) => props.onDoubleClick(event, node)}
      >
        {props.validationLevel ? (
          <rect
            x={node.x - 10}
            y={node.y - 8}
            width={node.width + 20}
            height={node.height + 16}
            fill="none"
            stroke={haloColor}
            strokeWidth={7}
          />
        ) : null}
        {props.focused ? (
          <rect
            x={node.x - 12}
            y={node.y - 10}
            width={node.width + 24}
            height={node.height + 20}
            fill="none"
            stroke={DIAGRAM_FOCUS}
            strokeWidth={2}
            strokeDasharray="8 6"
          />
        ) : null}
        {props.selected ? (
          <rect
            x={node.x - 4}
            y={node.y - 4}
            width={node.width + 8}
            height={node.height + 8}
            fill="none"
            stroke={DIAGRAM_SELECTION}
            strokeDasharray="4 3"
          />
        ) : null}
        {isMultivalued ? (
          <>
            <ellipse
              cx={node.x + node.width / 2}
              cy={cy}
              rx={node.width / 2}
              ry={node.height / 2}
              fill={DIAGRAM_NODE_FILL}
              stroke={strokeColor}
              strokeWidth={props.selected || props.pending ? 2.6 : 2}
            />
            <text
              x={node.x + node.width / 2}
              y={cy}
              className="shape-label"
              textAnchor="middle"
              dominantBaseline="middle"
              fill={strokeColor}
            >
              {node.label}
            </text>
          </>
        ) : (
          <>
            {(() => {
              const labelLayout = getAttributeLabelLayout(node, props.attributeDirection);
              return (
                <>
                  <circle
                    cx={node.x + 10}
                    cy={cy}
                    r={7}
                    fill={isIdentifier ? strokeColor : DIAGRAM_NODE_FILL}
                    stroke={strokeColor}
                    strokeWidth={2}
                  />
                  <text
                    x={labelLayout.x}
                    y={labelLayout.y}
                    className="attribute-label"
                    textAnchor={labelLayout.textAnchor}
                    dominantBaseline={labelLayout.dominantBaseline}
                    fill={strokeColor}
                  >
                    {node.label}
                  </text>
                </>
              );
            })()}
          </>
        )}
        {renderValidationBadge(node.x + 18, node.y - 10, props.validationLevel, badgeCount)}
      </g>
    );
  }

  return (
    <g
      className={props.selected ? "diagram-node selected" : "diagram-node"}
      tabIndex={props.focusable ? 0 : -1}
      focusable={props.focusable ? "true" : "false"}
      aria-label={`Nodo ${node.type}: ${node.label}`}
      onFocus={() => props.onFocus(node)}
      onBlur={props.onBlur}
      onPointerDown={(event) => props.onPointerDown(event, node)}
      onDoubleClick={(event) => props.onDoubleClick(event, node)}
    >
      {props.validationLevel ? (
        <rect
          x={node.x - 8}
          y={node.y - 14}
          width={node.width + 16}
          height={node.height + 18}
          fill="none"
          stroke={haloColor}
          strokeWidth={6}
        />
      ) : null}
      {props.focused ? (
        <rect
          x={node.x - 8}
          y={node.y - 14}
          width={node.width + 16}
          height={node.height + 18}
          fill="none"
          stroke={DIAGRAM_FOCUS}
          strokeWidth={2}
          strokeDasharray="8 6"
        />
      ) : null}
      <text x={node.x} y={node.y + node.height} className="free-text-label" fill={strokeColor}>
        {node.label}
      </text>
      {props.selected ? (
        <rect
          x={node.x - 4}
          y={node.y - 4}
          width={node.width + 8}
          height={node.height + 8}
          fill="none"
          stroke={DIAGRAM_SELECTION}
          strokeDasharray="4 3"
        />
      ) : null}
      {renderValidationBadge(node.x + node.width + 10, node.y - 10, props.validationLevel, badgeCount)}
    </g>
  );
}
