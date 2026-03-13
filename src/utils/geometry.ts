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
    return role === "source"
      ? { x: center.x, y: node.y }
      : { x: center.x, y: node.y + node.height };
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
): Point[] {
  if (edgeType === "attribute") {
    const midX = source.x <= target.x ? target.x - 24 : source.x - 24;
    return dedupePoints([
      source,
      { x: midX, y: source.y },
      { x: midX, y: target.y },
      target,
    ]);
  }

  if (edgeType === "inheritance") {
    const midY = (source.y + target.y) / 2;
    return dedupePoints([
      source,
      { x: source.x, y: midY },
      { x: target.x, y: midY },
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

export function getEdgeGeometry(
  edge: DiagramEdge,
  sourceNode: DiagramNode,
  targetNode: DiagramNode,
): EdgeGeometry {
  const targetCenter = getNodeCenter(targetNode);
  const sourceCenter = getNodeCenter(sourceNode);
  const sourcePoint = getNodeAnchor(sourceNode, targetCenter, edge.type, "source");
  const targetPoint = getNodeAnchor(targetNode, sourceCenter, edge.type, "target");
  const points = buildOrthogonalPoints(sourcePoint, targetPoint, edge.type);
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

