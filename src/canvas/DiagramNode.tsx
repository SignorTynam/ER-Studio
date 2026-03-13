import type { MouseEvent, PointerEvent } from "react";
import type { DiagramNode } from "../types/diagram";

interface DiagramNodeProps {
  node: DiagramNode;
  selected: boolean;
  pending: boolean;
  onPointerDown: (event: PointerEvent<SVGGElement>, node: DiagramNode) => void;
  onDoubleClick: (event: MouseEvent<SVGGElement>, node: DiagramNode) => void;
}

export function DiagramNodeView(props: DiagramNodeProps) {
  const { node } = props;

  if (node.type === "entity") {
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
          fill="#ffffff"
          stroke="#111111"
          strokeWidth={props.selected || props.pending ? 2.6 : 2}
        />
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
        <polygon points={points} fill="#ffffff" stroke="#111111" strokeWidth={props.selected || props.pending ? 2.6 : 2} />
        <text x={cx} y={cy} className="shape-label" textAnchor="middle" dominantBaseline="middle">
          {node.label}
        </text>
      </g>
    );
  }

  if (node.type === "attribute") {
    const cy = node.y + node.height / 2;
    const isIdentifier = node.isIdentifier === true;

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
            stroke="#555555"
            strokeDasharray="4 3"
          />
        ) : null}
        <circle cx={node.x + 10} cy={cy} r={7} fill={isIdentifier ? "#111111" : "#ffffff"} stroke="#111111" strokeWidth={2} />
        <line x1={node.x + 17} y1={cy} x2={node.x + 34} y2={cy} stroke="#111111" strokeWidth={2} />
        <text x={node.x + 40} y={cy - 10} className="attribute-label" dominantBaseline="alphabetic">
          {node.label}
        </text>
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
          stroke="#555555"
          strokeDasharray="4 3"
        />
      ) : null}
    </g>
  );
}
