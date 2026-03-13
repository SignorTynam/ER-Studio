import type {
  Bounds,
  DiagramEdge,
  DiagramNode,
  EdgeGeometry,
  EdgeKind,
  Point,
  Viewport,
} from "../types/diagram";

export const GRID_SIZE = 20;
export const MIN_ZOOM = 0.45;
export const MAX_ZOOM = 2.4;
export const WORLD_EXTENT = 5200;

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export function snapValue(value: number, gridSize = GRID_SIZE): number {
  return Math.round(value / gridSize) * gridSize;
}

export function snapPoint(point: Point, gridSize = GRID_SIZE): Point {
  return {
    x: snapValue(point.x, gridSize),
    y: snapValue(point.y, gridSize),
  };
}

export function worldPointFromClient(
  client: Point,
  viewport: Viewport,
  rect: DOMRect,
): Point {
  return {
    x: (client.x - rect.left - viewport.x) / viewport.zoom,
    y: (client.y - rect.top - viewport.y) / viewport.zoom,
  };
}

export function clientPointFromWorld(
  point: Point,
  viewport: Viewport,
  rect: DOMRect,
): Point {
  return {
    x: rect.left + viewport.x + point.x * viewport.zoom,
    y: rect.top + viewport.y + point.y * viewport.zoom,
  };
}

export function getNodeCenter(node: DiagramNode): Point {
  if (node.type === "attribute") {
    return { x: node.x + 10, y: node.y + node.height / 2 };
  }

  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}

export function getNodeBounds(node: DiagramNode): Bounds {
  return {
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
  };
}

export function boundsIntersect(left: Bounds, right: Bounds): boolean {
  return !(
    left.x + left.width < right.x ||
    right.x + right.width < left.x ||
    left.y + left.height < right.y ||
    right.y + right.height < left.y
  );
}

export function normalizeBounds(start: Point, end: Point): Bounds {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(start.x - end.x),
    height: Math.abs(start.y - end.y),
  };
}

export function getNodeAnchor(
  node: DiagramNode,
  toward: Point,
  edgeType: EdgeKind,
  role: "source" | "target",
): Point {
  if (node.type === "attribute") {
    return { x: node.x + 10, y: node.y + node.height / 2 };
  }

  const center = getNodeCenter(node);

  if (edgeType === "inheritance") {
    const deltaX = toward.x - center.x;
    const deltaY = toward.y - center.y;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX >= 0
        ? { x: node.x + node.width, y: center.y }
        : { x: node.x, y: center.y };
    }

    return deltaY >= 0
      ? { x: center.x, y: node.y + node.height }
      : { x: center.x, y: node.y };
  }

  const deltaX = toward.x - center.x;
  const deltaY = toward.y - center.y;

  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    return deltaX >= 0
      ? { x: node.x + node.width, y: center.y }
      : { x: node.x, y: center.y };
  }

  return deltaY >= 0
    ? { x: center.x, y: node.y + node.height }
    : { x: center.x, y: node.y };
}

function dedupePoints(points: Point[]): Point[] {
  return points.filter((point, index) => {
    if (index === 0) {
      return true;
    }

    const previous = points[index - 1];
    return previous.x !== point.x || previous.y !== point.y;
  });
}

export function buildOrthogonalPoints(
  source: Point,
  target: Point,
  edgeType: EdgeKind,
  laneOffset = 0,
): Point[] {
  if (edgeType === "attribute") {
    const midX = source.x <= target.x ? target.x - 24 + laneOffset : target.x + 24 + laneOffset;
    return dedupePoints([
      source,
      { x: midX, y: source.y },
      { x: midX, y: target.y },
      target,
    ]);
  }

  const horizontalBias =
    Math.abs(source.x - target.x) >= Math.abs(source.y - target.y);

  if (horizontalBias) {
    const midX = (source.x + target.x) / 2;
    return dedupePoints([
      source,
      { x: midX, y: source.y },
      { x: midX, y: target.y },
      target,
    ]);
  }

  const midY = (source.y + target.y) / 2;
  return dedupePoints([
    source,
    { x: source.x, y: midY },
    { x: target.x, y: midY },
    target,
  ]);
}

function getAttributeLaneOffset(edgeId: string): number {
  const lanes = [-18, -12, -6, 6, 12, 18];
  let hash = 0;

  for (let index = 0; index < edgeId.length; index += 1) {
    hash = (hash * 31 + edgeId.charCodeAt(index)) | 0;
  }

  return lanes[Math.abs(hash) % lanes.length];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getAttributeEntityAnchor(node: DiagramNode, toward: Point, laneOffset: number): Point {
  const center = getNodeCenter(node);
  const deltaX = toward.x - center.x;
  const deltaY = toward.y - center.y;
  const margin = 8;

  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    return {
      x: deltaX >= 0 ? node.x + node.width : node.x,
      y: clamp(center.y + laneOffset, node.y + margin, node.y + node.height - margin),
    };
  }

  return {
    x: clamp(center.x + laneOffset, node.x + margin, node.x + node.width - margin),
    y: deltaY >= 0 ? node.y + node.height : node.y,
  };
}

export function getEdgeGeometry(
  edge: DiagramEdge,
  sourceNode: DiagramNode,
  targetNode: DiagramNode,
): EdgeGeometry {
  const laneOffset = edge.type === "attribute" ? getAttributeLaneOffset(edge.id) : 0;
  const targetCenter = getNodeCenter(targetNode);
  const sourceCenter = getNodeCenter(sourceNode);
  let sourcePoint = getNodeAnchor(sourceNode, targetCenter, edge.type, "source");
  let targetPoint = getNodeAnchor(targetNode, sourceCenter, edge.type, "target");

  // Attribute connectors must leave the host entity from different border points.
  if (edge.type === "attribute") {
    if (sourceNode.type !== "attribute") {
      sourcePoint = getAttributeEntityAnchor(sourceNode, targetCenter, laneOffset);
    }

    if (targetNode.type !== "attribute") {
      targetPoint = getAttributeEntityAnchor(targetNode, sourceCenter, laneOffset);
    }
  }

  const points = buildOrthogonalPoints(sourcePoint, targetPoint, edge.type, laneOffset);
  const middleIndex = Math.floor(points.length / 2);
  const start = points[Math.max(0, middleIndex - 1)];
  const end = points[middleIndex];

  return {
    points,
    labelPoint: {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
    },
  };
}

export function pathFromPoints(points: Point[]): string {
  return points
    .map((point, index) =>
      `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
    )
    .join(" ");
}

export function getSelectionBounds(nodes: DiagramNode[]): Bounds | null {
  if (nodes.length === 0) {
    return null;
  }

  const left = Math.min(...nodes.map((node) => node.x));
  const top = Math.min(...nodes.map((node) => node.y));
  const right = Math.max(...nodes.map((node) => node.x + node.width));
  const bottom = Math.max(...nodes.map((node) => node.y + node.height));

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

