import type { MouseEvent, PointerEvent } from "react";
import type { DiagramNode, Point } from "../types/diagram";

const DIAGRAM_NODE_FILL = "var(--diagram-node-fill)";
const DIAGRAM_STROKE = "var(--diagram-stroke)";
const DIAGRAM_SELECTION = "var(--diagram-selection-stroke)";

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
  attributeDirection?: Point;
  onPointerDown: (event: PointerEvent<SVGGElement>, node: DiagramNode) => void;
  onDoubleClick: (event: MouseEvent<SVGGElement>, node: DiagramNode) => void;
}

export function DiagramNodeView(props: DiagramNodeProps) {
  const { node } = props;

  if (node.type === "entity") {
    const inset = 8;
    return (
      <g
        className={props.selected ? "diagram-node selected" : "diagram-node"}
        onPointerDown={(event) => props.onPointerDown(event, node)}
        onDoubleClick={(event) => props.onDoubleClick(event, node)}
      >
        <rect
          x={node.x}
          y={node.y}
          width={node.width}
          height={node.height}
          fill={DIAGRAM_NODE_FILL}
          stroke={DIAGRAM_STROKE}
          strokeWidth={props.selected || props.pending ? 2.6 : 2}
        />
        {node.isWeak === true ? (
          <rect
            x={node.x + inset}
            y={node.y + inset}
            width={Math.max(0, node.width - inset * 2)}
            height={Math.max(0, node.height - inset * 2)}
            fill="none"
            stroke={DIAGRAM_STROKE}
            strokeWidth={props.selected || props.pending ? 2.2 : 1.8}
          />
        ) : null}
        <text
          x={node.x + node.width / 2}
          y={node.y + node.height / 2}
          className="entity-label"
          textAnchor="middle"
          dominantBaseline="middle"
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
        onPointerDown={(event) => props.onPointerDown(event, node)}
        onDoubleClick={(event) => props.onDoubleClick(event, node)}
      >
        <polygon
          points={points}
          fill={DIAGRAM_NODE_FILL}
          stroke={DIAGRAM_STROKE}
          strokeWidth={props.selected || props.pending ? 2.6 : 2}
        />
        <text x={cx} y={cy} className="shape-label" textAnchor="middle" dominantBaseline="middle">
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
        onPointerDown={(event) => props.onPointerDown(event, node)}
        onDoubleClick={(event) => props.onDoubleClick(event, node)}
      >
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
              stroke={DIAGRAM_STROKE}
              strokeWidth={props.selected || props.pending ? 2.6 : 2}
            />
            <text
              x={node.x + node.width / 2}
              y={cy}
              className="shape-label"
              textAnchor="middle"
              dominantBaseline="middle"
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
                    fill={isIdentifier ? DIAGRAM_STROKE : DIAGRAM_NODE_FILL}
                    stroke={DIAGRAM_STROKE}
                    strokeWidth={2}
                  />
                  <text
                    x={labelLayout.x}
                    y={labelLayout.y}
                    className="attribute-label"
                    textAnchor={labelLayout.textAnchor}
                    dominantBaseline={labelLayout.dominantBaseline}
                  >
                    {node.label}
                  </text>
                </>
              );
            })()}
          </>
        )}
      </g>
    );
  }

  return (
    <g
      className={props.selected ? "diagram-node selected" : "diagram-node"}
      onPointerDown={(event) => props.onPointerDown(event, node)}
      onDoubleClick={(event) => props.onDoubleClick(event, node)}
    >
      <text x={node.x} y={node.y + node.height} className="free-text-label">
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
    </g>
  );
}
