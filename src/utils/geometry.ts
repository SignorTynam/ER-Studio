import type {
  Bounds,
  DiagramEdge,
  DiagramNode,
  EdgeGeometry,
  EdgeKind,
  Point,
  Viewport,
} from "../types/diagram";

interface EdgeLaneInfo {
  laneIndex: number;
  laneCount: number;
}

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
    const center = { x: node.x + 10, y: node.y + node.height / 2 };
    const radius = 7;
    const deltaX = toward.x - center.x;
    const deltaY = toward.y - center.y;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return {
        x: deltaX >= 0 ? center.x + radius : center.x - radius,
        y: center.y,
      };
    }

    return {
      x: center.x,
      y: deltaY >= 0 ? center.y + radius : center.y - radius,
    };
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

function simplifyPoints(points: Point[]): Point[] {
  const deduped = dedupePoints(points);

  if (deduped.length <= 2) {
    return deduped;
  }

  const simplified: Point[] = [deduped[0]];

  for (let index = 1; index < deduped.length - 1; index += 1) {
    const previous = simplified[simplified.length - 1];
    const current = deduped[index];
    const next = deduped[index + 1];
    const cross =
      (current.x - previous.x) * (next.y - current.y) -
      (current.y - previous.y) * (next.x - current.x);

    if (Math.abs(cross) < 0.001) {
      continue;
    }

    simplified.push(current);
  }

  simplified.push(deduped[deduped.length - 1]);
  return simplified;
}

export function buildOrthogonalPoints(
  source: Point,
  target: Point,
  edgeType: EdgeKind,
  laneOffset = 0,
): Point[] {
  if (edgeType === "attribute") {
    return simplifyPoints([source, target]);
  }

  const deltaX = target.x - source.x;
  const deltaY = target.y - source.y;
  const horizontalBias =
    Math.abs(deltaX) >= Math.abs(deltaY);

  if (horizontalBias) {
    if (laneOffset === 0) {
      const midX = (source.x + target.x) / 2;
      return simplifyPoints([
        source,
        { x: midX, y: source.y },
        { x: midX, y: target.y },
        target,
      ]);
    }

    const midY = (source.y + target.y) / 2 + laneOffset;
    return simplifyPoints([
      source,
      { x: source.x, y: midY },
      { x: target.x, y: midY },
      target,
    ]);
  }

  if (laneOffset === 0) {
    const midY = (source.y + target.y) / 2;
    return simplifyPoints([
      source,
      { x: source.x, y: midY },
      { x: target.x, y: midY },
      target,
    ]);
  }

  const midX = (source.x + target.x) / 2 + laneOffset;
  return simplifyPoints([
    source,
    { x: midX, y: source.y },
    { x: midX, y: target.y },
    target,
  ]);
}

function getParallelLaneOffset(laneInfo?: EdgeLaneInfo): number {
  if (!laneInfo || laneInfo.laneCount <= 1) {
    return 0;
  }

  const step = 16;
  const center = (laneInfo.laneCount - 1) / 2;
  return (laneInfo.laneIndex - center) * step;
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

function distanceBetweenPoints(start: Point, end: Point): number {
  return Math.hypot(end.x - start.x, end.y - start.y);
}

function movePointToward(from: Point, to: Point, distance: number): Point {
  const length = distanceBetweenPoints(from, to);

  if (length <= 0.001) {
    return from;
  }

  const ratio = distance / length;
  return {
    x: from.x + (to.x - from.x) * ratio,
    y: from.y + (to.y - from.y) * ratio,
  };
}

function getPointAlongPolyline(points: Point[], progress: number): Point {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }

  if (points.length === 1) {
    return points[0];
  }

  const totalLength = points.reduce((sum, point, index) => {
    if (index === 0) {
      return sum;
    }

    return sum + distanceBetweenPoints(points[index - 1], point);
  }, 0);

  if (totalLength <= 0.001) {
    return points[0];
  }

  const targetLength = totalLength * clamp(progress, 0, 1);
  let travelled = 0;

  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const segmentLength = distanceBetweenPoints(start, end);

    if (travelled + segmentLength >= targetLength) {
      const segmentProgress = (targetLength - travelled) / Math.max(segmentLength, 0.001);
      return {
        x: start.x + (end.x - start.x) * segmentProgress,
        y: start.y + (end.y - start.y) * segmentProgress,
      };
    }

    travelled += segmentLength;
  }

  return points[points.length - 1];
}

function getAttributeEntityAnchor(node: DiagramNode, toward: Point, laneOffset: number): Point {
  if (node.type === "relationship") {
    const center = getNodeCenter(node);
    const halfWidth = node.width / 2;
    const halfHeight = node.height / 2;
    const deltaX = toward.x - center.x;
    const deltaY = toward.y - center.y;

    // Intersect the ray from center->toward with the diamond boundary:
    // |x-cx|/(w/2) + |y-cy|/(h/2) = 1
    const scaleDenominator =
      Math.abs(deltaX) / Math.max(1, halfWidth) + Math.abs(deltaY) / Math.max(1, halfHeight);

    if (scaleDenominator <= 0) {
      return center;
    }

    const t = 1 / scaleDenominator;
    return {
      x: center.x + deltaX * t,
      y: center.y + deltaY * t,
    };
  }

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

function applyLaneOffsetToAnchor(node: DiagramNode, anchor: Point, laneOffset: number): Point {
  // Relationship nodes are diamonds, so rectangular edge offsets can visually detach lines.
  if (laneOffset === 0 || node.type === "attribute" || node.type === "relationship") {
    return anchor;
  }

  const epsilon = 0.1;
  const margin = 8;
  const left = node.x;
  const right = node.x + node.width;
  const top = node.y;
  const bottom = node.y + node.height;

  if (Math.abs(anchor.x - left) < epsilon || Math.abs(anchor.x - right) < epsilon) {
    return {
      x: anchor.x,
      y: clamp(anchor.y + laneOffset, top + margin, bottom - margin),
    };
  }

  return {
    x: clamp(anchor.x + laneOffset, left + margin, right - margin),
    y: anchor.y,
  };
}

export function getEdgeGeometry(
  edge: DiagramEdge,
  sourceNode: DiagramNode,
  targetNode: DiagramNode,
  laneInfo?: EdgeLaneInfo,
): EdgeGeometry {
  const laneCount = laneInfo?.laneCount ?? 1;
  const laneOffset =
    edge.type === "attribute"
      ? getAttributeLaneOffset(edge.id)
      : getParallelLaneOffset(laneInfo) + (edge.manualOffset ?? 0);
  let sourcePoint: Point;
  let targetPoint: Point;

  if (edge.type === "attribute") {
    const sourceIsAttribute = sourceNode.type === "attribute";
    const attributeNode = sourceIsAttribute ? sourceNode : targetNode;
    const hostNode = sourceIsAttribute ? targetNode : sourceNode;
    const hostCenter = getNodeCenter(hostNode);
    const attributeCenter = getNodeCenter(attributeNode);

    // Keep attribute routing stable regardless of edge source/target creation order.
    sourcePoint = getNodeAnchor(attributeNode, hostCenter, edge.type, "source");
    targetPoint = getAttributeEntityAnchor(hostNode, attributeCenter, laneOffset);
  } else {
    const targetCenter = getNodeCenter(targetNode);
    const sourceCenter = getNodeCenter(sourceNode);
    sourcePoint = getNodeAnchor(sourceNode, targetCenter, edge.type, "source");
    targetPoint = getNodeAnchor(targetNode, sourceCenter, edge.type, "target");

    if (edge.type === "connector" && laneOffset !== 0) {
      // Keep parallel connectors visually distinct near both endpoints.
      sourcePoint = applyLaneOffsetToAnchor(sourceNode, sourcePoint, laneOffset);
      targetPoint = applyLaneOffsetToAnchor(targetNode, targetPoint, laneOffset);
    }
  }

  const shouldUseStraightConnector =
    edge.type === "connector" && laneCount === 1 && laneOffset === 0;
  const points = shouldUseStraightConnector
    ? [sourcePoint, targetPoint]
    : buildOrthogonalPoints(sourcePoint, targetPoint, edge.type, laneOffset);

  return {
    points,
    labelPoint: getPointAlongPolyline(points, 0.5),
  };
}

export function pathFromPoints(points: Point[]): string {
  const simplified = simplifyPoints(points);

  if (simplified.length === 0) {
    return "";
  }

  if (simplified.length === 1) {
    return `M ${simplified[0].x.toFixed(1)} ${simplified[0].y.toFixed(1)}`;
  }

  const commands = [`M ${simplified[0].x.toFixed(1)} ${simplified[0].y.toFixed(1)}`];
  const maxCornerRadius = 22;

  for (let index = 1; index < simplified.length - 1; index += 1) {
    const previous = simplified[index - 1];
    const current = simplified[index];
    const next = simplified[index + 1];
    const incomingLength = distanceBetweenPoints(previous, current);
    const outgoingLength = distanceBetweenPoints(current, next);
    const cornerRadius = Math.min(maxCornerRadius, incomingLength / 2, outgoingLength / 2);

    if (cornerRadius <= 0.5) {
      commands.push(`L ${current.x.toFixed(1)} ${current.y.toFixed(1)}`);
      continue;
    }

    const cornerStart = movePointToward(current, previous, cornerRadius);
    const cornerEnd = movePointToward(current, next, cornerRadius);

    commands.push(`L ${cornerStart.x.toFixed(1)} ${cornerStart.y.toFixed(1)}`);
    commands.push(
      `Q ${current.x.toFixed(1)} ${current.y.toFixed(1)} ${cornerEnd.x.toFixed(1)} ${cornerEnd.y.toFixed(1)}`,
    );
  }

  const last = simplified[simplified.length - 1];
  commands.push(`L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`);
  return commands.join(" ");
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
