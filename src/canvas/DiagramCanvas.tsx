import { useEffect, useRef, useState } from "react";
import type {
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
  WheelEvent as ReactWheelEvent,
} from "react";
import { DiagramEdgeView } from "./DiagramEdge";
import { DiagramNodeView, getAttributeLabelLayout } from "./DiagramNode";
import {
  clampZoom,
  clipPointToNodePerimeter,
  clientPointFromWorld,
  getEdgeGeometry,
  getNodeAnchor,
  getNodeCenter,
  getNodeBounds,
  getSelectionBounds,
  GRID_SIZE,
  normalizeBounds,
  pathFromPoints,
  snapValue,
  WORLD_EXTENT,
  worldPointFromClient,
} from "../utils/geometry";
import type {
  Bounds,
  DiagramDocument,
  EdgeKind,
  DiagramEdge,
  DiagramNode,
  EditorMode,
  Point,
  SelectionState,
  ToolKind,
  ValidationIssue,
  Viewport,
} from "../types/diagram";
import {
  CONNECTOR_CARDINALITIES,
  CONNECTOR_CARDINALITY_PLACEHOLDER,
} from "../utils/cardinality";

const DIAGRAM_STROKE = "var(--diagram-stroke)";
const DIAGRAM_GRID = "var(--diagram-grid)";
const DIAGRAM_SELECTION = "var(--diagram-selection-stroke)";
const DIAGRAM_SELECTION_FILL = "var(--diagram-selection-fill)";
const DIAGRAM_FOCUS = "var(--diagram-focus)";

type FocusTarget =
  | { kind: "node"; id: string }
  | { kind: "edge"; id: string }
  | null;

type InteractionState =
  | { kind: "idle" }
  | {
      kind: "pan";
      pointerId: number;
      startClient: Point;
      startViewport: Viewport;
    }
  | {
      kind: "drag";
      pointerId: number;
      startClient: Point;
      originalDiagram: DiagramDocument;
      nodeIds: string[];
      originPositions: Record<string, Point>;
    }
  | {
      kind: "marquee";
      pointerId: number;
      startWorld: Point;
      currentWorld: Point;
      additive: boolean;
      baseSelection: SelectionState;
    }
  | {
      kind: "edge-drag";
      pointerId: number;
      startClient: Point;
      originalDiagram: DiagramDocument;
      edgeId: string;
      startOffset: number;
      axis: "x" | "y";
    }
  | {
      kind: "external-id-drag";
      pointerId: number;
      startClient: Point;
      originalDiagram: DiagramDocument;
      relationshipId: string;
      startOffset: number;
    }
  | {
      kind: "external-id-marker-drag";
      pointerId: number;
      startClient: Point;
      originalDiagram: DiagramDocument;
      relationshipId: string;
      startOffsetX: number;
      startOffsetY: number;
    };

type InlineEditState =
  | { kind: "node"; id: string; value: string }
  | { kind: "edge"; id: string; value: string }
  | null;

interface DiagramCanvasProps {
  diagram: DiagramDocument;
  selection: SelectionState;
  tool: ToolKind;
  mode: EditorMode;
  viewport: Viewport;
  issues: ValidationIssue[];
  statusMessage: string;
  svgRef: RefObject<SVGSVGElement>;
  onViewportChange: (viewport: Viewport) => void;
  onSelectionChange: (selection: SelectionState) => void;
  onPreviewDiagram: (diagram: DiagramDocument) => void;
  onCommitDiagram: (diagram: DiagramDocument, previous: DiagramDocument) => void;
  onCreateNode: (
    type: Extract<ToolKind, "entity" | "relationship" | "attribute" | "text">,
    point: Point,
  ) => string;
  onCreateEdge: (
    type: EdgeKind,
    sourceId: string,
    targetId: string,
  ) => { success: boolean; message: string };
  onCreateExternalIdentifier: (
    sourceAttributeId: string,
    targetId: string,
  ) => { success: boolean; message: string };
  onDeleteNode: (nodeId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
  onDeleteSelection: () => void;
  onDeleteExternalIdentifier: (relationshipId: string) => void;
  onRenameNode: (nodeId: string, label: string) => void;
  onRenameEdge: (edgeId: string, label: string) => void;
  onStatusMessageChange: (message: string) => void;
}

const VIEWPORT_PADDING = 140;

function expandBounds(bounds: Bounds, padding: number): Bounds {
  return {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
}

function viewportForBounds(bounds: Bounds, rect: DOMRect, zoom: number): Viewport {
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  return {
    zoom,
    x: rect.width / 2 - centerX * zoom,
    y: rect.height / 2 - centerY * zoom,
  };
}

function getBoundsForViewport(nodes: DiagramNode[]): Bounds | null {
  if (nodes.length === 0) {
    return null;
  }

  return getSelectionBounds(nodes);
}

function addToSelection(selection: SelectionState, nodeId: string): SelectionState {
  if (selection.nodeIds.includes(nodeId)) {
    return {
      nodeIds: selection.nodeIds.filter((id) => id !== nodeId),
      edgeIds: [],
    };
  }

  return {
    nodeIds: [...selection.nodeIds, nodeId],
    edgeIds: [],
  };
}

function unionSelection(base: SelectionState, nodeIds: string[]): SelectionState {
  return {
    nodeIds: Array.from(new Set([...base.nodeIds, ...nodeIds])),
    edgeIds: [],
  };
}

function buildAttributeDirectionMap(diagram: DiagramDocument): Map<string, Point> {
  const directions = new Map<string, Point>();
  const localNodeMap = new Map(diagram.nodes.map((node) => [node.id, node]));

  diagram.edges.forEach((edge) => {
    if (edge.type !== "attribute") {
      return;
    }

    const sourceNode = localNodeMap.get(edge.sourceId);
    const targetNode = localNodeMap.get(edge.targetId);
    if (!sourceNode || !targetNode) {
      return;
    }

    const attributeNode =
      sourceNode.type === "attribute" ? sourceNode : targetNode.type === "attribute" ? targetNode : null;
    if (!attributeNode || directions.has(attributeNode.id)) {
      return;
    }

    const hostNode = attributeNode.id === sourceNode.id ? targetNode : sourceNode;
    const attributeCenter = getNodeCenter(attributeNode);
    const hostCenter = getNodeCenter(hostNode);

    directions.set(attributeNode.id, {
      x: hostCenter.x - attributeCenter.x,
      y: hostCenter.y - attributeCenter.y,
    });
  });

  return directions;
}

function expandDragNodeIds(diagram: DiagramDocument, seedNodeIds: string[]): string[] {
  if (seedNodeIds.length === 0) {
    return [];
  }

  const nodeById = new Map(diagram.nodes.map((node) => [node.id, node]));
  const expandedIds = new Set(seedNodeIds);
  const queue = [...seedNodeIds];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) {
      continue;
    }

    diagram.edges.forEach((edge) => {
      if (edge.type !== "attribute") {
        return;
      }

      const sourceNode = nodeById.get(edge.sourceId);
      const targetNode = nodeById.get(edge.targetId);

      const hostedAttribute =
        edge.sourceId === currentId && targetNode?.type === "attribute"
          ? targetNode
          : edge.targetId === currentId && sourceNode?.type === "attribute"
            ? sourceNode
            : undefined;

      if (!hostedAttribute || expandedIds.has(hostedAttribute.id)) {
        return;
      }

      expandedIds.add(hostedAttribute.id);
      queue.push(hostedAttribute.id);
    });
  }

  return [...expandedIds];
}

function editableTool(tool: ToolKind): tool is Extract<ToolKind, "entity" | "relationship" | "attribute" | "text"> {
  return tool === "entity" || tool === "relationship" || tool === "attribute" || tool === "text";
}

function bridgeOverlapsEntity(y: number, x1: number, x2: number, entity: DiagramNode): boolean {
  if (entity.type !== "entity") {
    return false;
  }

  const left = Math.min(x1, x2);
  const right = Math.max(x1, x2);
  const entityLeft = entity.x - 4;
  const entityRight = entity.x + entity.width + 4;
  const hasXOverlap = right >= entityLeft && left <= entityRight;
  if (!hasXOverlap) {
    return false;
  }

  return y >= entity.y - 4 && y <= entity.y + entity.height + 4;
}

function bridgeOverlapsNode(y: number, x1: number, x2: number, node: DiagramNode): boolean {
  if (node.type === "text") {
    return false;
  }

  const left = Math.min(x1, x2);
  const right = Math.max(x1, x2);
  const nodeLeft = node.x - 6;
  const nodeRight = node.x + node.width + 6;
  const hasXOverlap = right >= nodeLeft && left <= nodeRight;
  if (!hasXOverlap) {
    return false;
  }

  return y >= node.y - 6 && y <= node.y + node.height + 6;
}

function toSegments(points: Point[]): Array<[Point, Point]> {
  const result: Array<[Point, Point]> = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    result.push([points[index], points[index + 1]]);
  }
  return result;
}

function orientation(a: Point, b: Point, c: Point): number {
  return (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
}

function onSegment(a: Point, b: Point, c: Point): boolean {
  return (
    b.x <= Math.max(a.x, c.x) + 0.001 &&
    b.x + 0.001 >= Math.min(a.x, c.x) &&
    b.y <= Math.max(a.y, c.y) + 0.001 &&
    b.y + 0.001 >= Math.min(a.y, c.y)
  );
}

function segmentsIntersect(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  const o1 = orientation(a1, a2, b1);
  const o2 = orientation(a1, a2, b2);
  const o3 = orientation(b1, b2, a1);
  const o4 = orientation(b1, b2, a2);

  if (o1 * o2 < 0 && o3 * o4 < 0) {
    return true;
  }

  if (Math.abs(o1) < 0.001 && onSegment(a1, b1, a2)) {
    return true;
  }
  if (Math.abs(o2) < 0.001 && onSegment(a1, b2, a2)) {
    return true;
  }
  if (Math.abs(o3) < 0.001 && onSegment(b1, a1, b2)) {
    return true;
  }
  if (Math.abs(o4) < 0.001 && onSegment(b1, a2, b2)) {
    return true;
  }

  return false;
}

export function DiagramCanvas(props: DiagramCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [interaction, setInteraction] = useState<InteractionState>({ kind: "idle" });
  const [pendingConnectionSource, setPendingConnectionSource] = useState<string | null>(null);
  const [connectionPreviewPoint, setConnectionPreviewPoint] = useState<Point | null>(null);
  const [focusedTarget, setFocusedTarget] = useState<FocusTarget>(null);
  const [inlineEdit, setInlineEdit] = useState<InlineEditState>(null);
  const [spacePressed, setSpacePressed] = useState(false);

  const nodeMap = new Map(props.diagram.nodes.map((node) => [node.id, node]));
  const nodeIssueMap = new Map<string, { level: ValidationIssue["level"]; count: number }>();
  const edgeIssueMap = new Map<string, { level: ValidationIssue["level"]; count: number }>();
  const connectorLaneMap = new Map<string, { laneIndex: number; laneCount: number }>();
  const connectorGroups = new Map<string, string[]>();
  const attributeDirectionMap = new Map<string, Point>();
  const compositeGroups = new Map<string, { host: DiagramNode; attributeCenters: Point[] }>();
  const compositeIdentifierLayouts: Array<
    | { hostId: string; orientation: "vertical"; x: number; y1: number; y2: number; marker: Point }
    | { hostId: string; orientation: "horizontal"; y: number; x1: number; x2: number; marker: Point }
  > = [];
  const externalIdentifierLayouts: Array<{
    relationshipId: string;
    marker: Point;
    pathPoints: Point[];
  }> = [];
  const edgeGeometryMap = new Map<string, Point[]>();
  const originalAttributeDirectionMap =
    interaction.kind === "drag" ? buildAttributeDirectionMap(interaction.originalDiagram) : new Map<string, Point>();

  props.issues.forEach((issue) => {
    const targetMap = issue.targetType === "node" ? nodeIssueMap : edgeIssueMap;
    const current = targetMap.get(issue.targetId);
    if (!current) {
      targetMap.set(issue.targetId, { level: issue.level, count: 1 });
      return;
    }

    targetMap.set(issue.targetId, {
      level: current.level === "error" || issue.level === "error" ? "error" : "warning",
      count: current.count + 1,
    });
  });

  props.diagram.edges.forEach((edge) => {
    if (edge.type !== "connector") {
      return;
    }

    const groupKey = [edge.sourceId, edge.targetId].sort().join("::");
    const group = connectorGroups.get(groupKey) ?? [];
    group.push(edge.id);
    connectorGroups.set(groupKey, group);
  });

  connectorGroups.forEach((edgeIds) => {
    const laneCount = edgeIds.length;
    edgeIds.forEach((edgeId, laneIndex) => {
      connectorLaneMap.set(edgeId, { laneIndex, laneCount });
    });
  });

  props.diagram.edges.forEach((edge) => {
    const sourceNode = nodeMap.get(edge.sourceId);
    const targetNode = nodeMap.get(edge.targetId);
    if (!sourceNode || !targetNode) {
      return;
    }

    const geometry = getEdgeGeometry(edge, sourceNode, targetNode, connectorLaneMap.get(edge.id));
    edgeGeometryMap.set(edge.id, geometry.points);
  });

  props.diagram.edges.forEach((edge) => {
    if (edge.type !== "attribute") {
      return;
    }

    const sourceNode = nodeMap.get(edge.sourceId);
    const targetNode = nodeMap.get(edge.targetId);
    if (!sourceNode || !targetNode) {
      return;
    }

    const attributeNode = sourceNode.type === "attribute" ? sourceNode : targetNode.type === "attribute" ? targetNode : null;
    if (!attributeNode || attributeDirectionMap.has(attributeNode.id)) {
      return;
    }

    const hostNode = attributeNode.id === sourceNode.id ? targetNode : sourceNode;
    const attributeCenter = getNodeCenter(attributeNode);
    const hostCenter = getNodeCenter(hostNode);

    if (
      attributeNode.isIdentifier !== true &&
      attributeNode.isCompositeInternal === true &&
      hostNode.type === "entity"
    ) {
      const group = compositeGroups.get(hostNode.id) ?? { host: hostNode, attributeCenters: [] };
      group.attributeCenters.push(attributeCenter);
      compositeGroups.set(hostNode.id, group);
    }

    attributeDirectionMap.set(attributeNode.id, {
      x: hostCenter.x - attributeCenter.x,
      y: hostCenter.y - attributeCenter.y,
    });
  });

  compositeGroups.forEach((group, hostId) => {
    if (group.attributeCenters.length < 2) {
      return;
    }

    const host = group.host;
    const hostCenter = getNodeCenter(host);
    const avg = group.attributeCenters.reduce(
      (sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }),
      { x: 0, y: 0 },
    );
    const averageCenter = {
      x: avg.x / group.attributeCenters.length,
      y: avg.y / group.attributeCenters.length,
    };

    const horizontalBias = Math.abs(averageCenter.x - hostCenter.x) >= Math.abs(averageCenter.y - hostCenter.y);

    if (horizontalBias) {
      const onLeft = averageCenter.x < hostCenter.x;
      const hostSideX = onLeft ? host.x : host.x + host.width;
      const x = onLeft ? hostSideX - 36 : hostSideX + 36;
      const minY = Math.min(...group.attributeCenters.map((point) => point.y));
      const maxY = Math.max(...group.attributeCenters.map((point) => point.y));
      const markerY = maxY + 26;

      compositeIdentifierLayouts.push({
        hostId,
        orientation: "vertical",
        x,
        y1: minY - 8,
        y2: markerY - 10,
        marker: { x, y: markerY },
      });
      return;
    }

    const onTop = averageCenter.y < hostCenter.y;
    const hostSideY = onTop ? host.y : host.y + host.height;
    const y = onTop ? hostSideY - 36 : hostSideY + 36;
    const minX = Math.min(...group.attributeCenters.map((point) => point.x));
    const maxX = Math.max(...group.attributeCenters.map((point) => point.x));
    const markerX = maxX + 26;

    compositeIdentifierLayouts.push({
      hostId,
      orientation: "horizontal",
      y,
      x1: minX - 8,
      x2: markerX - 10,
      marker: { x: markerX, y },
    });
  });

  props.diagram.nodes.forEach((node) => {
    if (node.type !== "relationship" || node.isExternalIdentifier !== true) {
      return;
    }

    const sourceAttribute =
      typeof node.externalIdentifierSourceAttributeId === "string"
        ? nodeMap.get(node.externalIdentifierSourceAttributeId)
        : undefined;
    const targetEntity =
      typeof node.externalIdentifierTargetEntityId === "string"
        ? nodeMap.get(node.externalIdentifierTargetEntityId)
        : undefined;

    if (!sourceAttribute || sourceAttribute.type !== "attribute" || !targetEntity || targetEntity.type !== "entity") {
      return;
    }

    const sourceHostEdge = props.diagram.edges.find(
      (edge) =>
        edge.type === "attribute" &&
        (edge.sourceId === sourceAttribute.id || edge.targetId === sourceAttribute.id),
    );
    if (!sourceHostEdge) {
      return;
    }

    const sourceHostId =
      sourceHostEdge.sourceId === sourceAttribute.id ? sourceHostEdge.targetId : sourceHostEdge.sourceId;
    const sourceHost = nodeMap.get(sourceHostId);
    if (!sourceHost || sourceHost.type !== "entity") {
      return;
    }
    const sourceHostEntity = sourceHost;
    const targetEntityNode = targetEntity;

    const sourceConnector = props.diagram.edges.find(
      (edge) =>
        edge.type === "connector" &&
        ((edge.sourceId === node.id && edge.targetId === sourceHostEntity.id) ||
          (edge.targetId === node.id && edge.sourceId === sourceHostEntity.id)),
    );
    if (!sourceConnector) {
      return;
    }

    const sourceConnectorGeometry = getEdgeGeometry(
      sourceConnector,
      nodeMap.get(sourceConnector.sourceId) as DiagramNode,
      nodeMap.get(sourceConnector.targetId) as DiagramNode,
      connectorLaneMap.get(sourceConnector.id),
    );
    const strongSidePoint =
      sourceConnector.sourceId === node.id
        ? sourceConnectorGeometry.points[0]
        : sourceConnectorGeometry.points[sourceConnectorGeometry.points.length - 1];
    const strongSideAdjacentPoint =
      sourceConnector.sourceId === node.id
        ? sourceConnectorGeometry.points[Math.min(1, sourceConnectorGeometry.points.length - 1)]
        : sourceConnectorGeometry.points[Math.max(0, sourceConnectorGeometry.points.length - 2)];
    const strongDelta = {
      x: strongSideAdjacentPoint.x - strongSidePoint.x,
      y: strongSideAdjacentPoint.y - strongSidePoint.y,
    };
    const strongApproachDistance = 18;
    const strongApproachPoint =
      Math.abs(strongDelta.x) >= Math.abs(strongDelta.y)
        ? {
            x:
              strongSidePoint.x +
              (strongDelta.x === 0 ? 0 : Math.sign(strongDelta.x) * strongApproachDistance),
            y: strongSidePoint.y,
          }
        : {
            x: strongSidePoint.x,
            y:
              strongSidePoint.y +
              (strongDelta.y === 0 ? 0 : Math.sign(strongDelta.y) * strongApproachDistance),
          };
    const connectorIsMostlyVertical = Math.abs(strongDelta.y) > Math.abs(strongDelta.x);

    const relationshipCenter = getNodeCenter(node);
    const sourceEntityCenter = getNodeCenter(sourceHostEntity);
    const weakEntityCenter = getNodeCenter(targetEntityNode);

    let markerBase: Point;
    let sourceBasePoint: Point | undefined;
    let sourceLineX: number | undefined;
    let buildRoutePoints: ((bridgeY: number) => Point[]) | undefined;
    let fixedRoutePoints: Point[] | undefined;
    if (node.externalIdentifierMode === "composite" && node.externalIdentifierTargetAttributeId) {
      const targetAttribute = nodeMap.get(node.externalIdentifierTargetAttributeId);
      if (!targetAttribute || targetAttribute.type !== "attribute") {
        return;
      }

      const targetAttributeEdge = props.diagram.edges.find(
        (edge) =>
          edge.type === "attribute" &&
          ((edge.sourceId === targetAttribute.id && edge.targetId === targetEntityNode.id) ||
            (edge.targetId === targetAttribute.id && edge.sourceId === targetEntityNode.id)),
      );
      if (!targetAttributeEdge) {
        return;
      }

      const attributeEdgeGeometry = getEdgeGeometry(
        targetAttributeEdge,
        nodeMap.get(targetAttributeEdge.sourceId) as DiagramNode,
        nodeMap.get(targetAttributeEdge.targetId) as DiagramNode,
        connectorLaneMap.get(targetAttributeEdge.id),
      );

      // Attribute geometry is normalized from attribute -> entity.
      const attributeAnchor = attributeEdgeGeometry.points[0];
      const entityAnchor = attributeEdgeGeometry.points[attributeEdgeGeometry.points.length - 1];
      const branchVector = {
        x: attributeAnchor.x - entityAnchor.x,
        y: attributeAnchor.y - entityAnchor.y,
      };
      const branchLength = Math.hypot(branchVector.x, branchVector.y) || 1;
      const branchDirection = {
        x: branchVector.x / branchLength,
        y: branchVector.y / branchLength,
      };
      const joinDistance = Math.min(Math.max(10, branchLength * 0.18), Math.max(6, branchLength - 12));
      const joinPoint = {
        x: entityAnchor.x + branchDirection.x * joinDistance,
        y: entityAnchor.y + branchDirection.y * joinDistance,
      };
      const normal = {
        x: -branchDirection.y,
        y: branchDirection.x,
      };
      const markerDistance = 12;

      sourceBasePoint = joinPoint;

      if (Math.abs(branchDirection.x) >= Math.abs(branchDirection.y)) {
        sourceLineX = joinPoint.x;
        markerBase = joinPoint;
        buildRoutePoints = (bridgeY) => {
          const towardBridge = {
            x: 0,
            y: bridgeY - joinPoint.y,
          };
          const normalSign = normal.x * towardBridge.x + normal.y * towardBridge.y >= 0 ? -1 : 1;
          const marker = {
            x: joinPoint.x + normal.x * normalSign * markerDistance,
            y: joinPoint.y + normal.y * normalSign * markerDistance,
          };

          return [
            marker,
            { x: marker.x, y: bridgeY },
            { x: strongApproachPoint.x, y: bridgeY },
            strongApproachPoint,
            strongSidePoint,
          ];
        };
      } else {
        const towardApproach = {
          x: strongApproachPoint.x - joinPoint.x,
          y: 0,
        };
        const normalSign = normal.x * towardApproach.x + normal.y * towardApproach.y >= 0 ? -1 : 1;
        const marker = {
          x: joinPoint.x + normal.x * normalSign * markerDistance,
          y: joinPoint.y + normal.y * normalSign * markerDistance,
        };

        markerBase = marker;
        fixedRoutePoints = [
          marker,
          { x: strongApproachPoint.x, y: joinPoint.y },
          strongApproachPoint,
          strongSidePoint,
        ];
      }
    } else {
      const oppositeToward = {
        x: weakEntityCenter.x * 2 - relationshipCenter.x,
        y: weakEntityCenter.y * 2 - relationshipCenter.y,
      };
      const weakOuterAnchor = getNodeAnchor(targetEntityNode, oppositeToward, "connector", "source");

      const direction = {
        x: weakEntityCenter.x - relationshipCenter.x,
        y: weakEntityCenter.y - relationshipCenter.y,
      };
      const length = Math.hypot(direction.x, direction.y) || 1;
      markerBase = {
        x: weakOuterAnchor.x + (direction.x / length) * 22,
        y: weakOuterAnchor.y + (direction.y / length) * 22,
      };
      sourceBasePoint = markerBase;
      sourceLineX = markerBase.x;
      buildRoutePoints = (bridgeY) => [
        markerBase,
        { x: markerBase.x, y: bridgeY },
        { x: strongApproachPoint.x, y: bridgeY },
        strongApproachPoint,
        strongSidePoint,
      ];
    }

    const comparisonY = strongApproachPoint.y;
    const sourceRoutePoint = sourceBasePoint ?? markerBase;
    const preferTop = connectorIsMostlyVertical
      ? relationshipCenter.y < sourceEntityCenter.y
      : sourceRoutePoint.y <= comparisonY;
    const topBase = Math.min(sourceRoutePoint.y, comparisonY) - 28;
    const bottomBase = Math.max(sourceRoutePoint.y, comparisonY) + 28;

    const targetAttributeEdgeId =
      node.externalIdentifierMode === "composite" && node.externalIdentifierTargetAttributeId
        ? props.diagram.edges.find(
            (edge) =>
              edge.type === "attribute" &&
              ((edge.sourceId === node.externalIdentifierTargetAttributeId && edge.targetId === targetEntityNode.id) ||
                (edge.targetId === node.externalIdentifierTargetAttributeId && edge.sourceId === targetEntityNode.id)),
          )?.id
        : undefined;

    const excludedEdgeIds = new Set<string>([sourceConnector.id, sourceHostEdge.id]);
    if (targetAttributeEdgeId) {
      excludedEdgeIds.add(targetAttributeEdgeId);
    }

    const excludedNodeIds = new Set<string>([
      node.id,
      sourceHostEntity.id,
      targetEntityNode.id,
      sourceAttribute.id,
    ]);
    if (node.externalIdentifierTargetAttributeId) {
      excludedNodeIds.add(node.externalIdentifierTargetAttributeId);
    }
    const obstacleNodes = props.diagram.nodes.filter((candidate) => !excludedNodeIds.has(candidate.id));

    function collisionScore(bridgeY: number): number {
      let score = 0;

      if (sourceLineX === undefined || !buildRoutePoints) {
        return score;
      }

      if (bridgeOverlapsEntity(bridgeY, sourceLineX, strongApproachPoint.x, sourceHostEntity)) {
        score += 1000;
      }
      if (bridgeOverlapsEntity(bridgeY, sourceLineX, strongApproachPoint.x, targetEntityNode)) {
        score += 1000;
      }

      obstacleNodes.forEach((candidate) => {
        if (bridgeOverlapsNode(bridgeY, sourceLineX, strongApproachPoint.x, candidate)) {
          score += 40;
        }
      });

      const pathSegments = toSegments(buildRoutePoints(bridgeY));

      edgeGeometryMap.forEach((points, edgeId) => {
        if (excludedEdgeIds.has(edgeId)) {
          return;
        }

        const segments = toSegments(points);
        for (const [p1, p2] of pathSegments) {
          for (const [q1, q2] of segments) {
            if (segmentsIntersect(p1, p2, q1, q2)) {
              score += 5;
            }
          }
        }
      });

      const preferredBase = preferTop ? topBase : bottomBase;
      score += Math.abs(bridgeY - preferredBase) * 0.02;

      return score;
    }

    const candidates = [
      ...(preferTop
        ? [topBase, topBase - 20, topBase - 40, topBase - 60, topBase - 80]
        : [bottomBase, bottomBase + 20, bottomBase + 40, bottomBase + 60, bottomBase + 80]),
      ...(preferTop
        ? [bottomBase, bottomBase + 20, bottomBase + 40, bottomBase + 60, bottomBase + 80]
        : [topBase, topBase - 20, topBase - 40, topBase - 60, topBase - 80]),
    ];

    // Add obstacle-driven levels to route around unrelated elements near the bridge span.
    obstacleNodes.forEach((candidate) => {
      if (candidate.type === "text") {
        return;
      }

      if (sourceLineX === undefined) {
        return;
      }

      const spanLeft = Math.min(sourceLineX, strongApproachPoint.x);
      const spanRight = Math.max(sourceLineX, strongApproachPoint.x);
      const intersectsSpan = !(candidate.x + candidate.width < spanLeft || candidate.x > spanRight);
      if (!intersectsSpan) {
        return;
      }

      candidates.push(candidate.y - 16);
      candidates.push(candidate.y + candidate.height + 16);
    });

    const manualOffset = typeof node.externalIdentifierOffset === "number" ? node.externalIdentifierOffset : 0;
    const markerOffsetX =
      typeof node.externalIdentifierMarkerOffsetX === "number" ? node.externalIdentifierMarkerOffsetX : 0;
    const markerOffsetY =
      typeof node.externalIdentifierMarkerOffsetY === "number" ? node.externalIdentifierMarkerOffsetY : 0;
    let routePoints: Point[];

    if (fixedRoutePoints) {
      routePoints = fixedRoutePoints;
    } else {
      let bridgeY = candidates[0];
      let bestScore = Number.POSITIVE_INFINITY;
      for (const candidate of candidates) {
        const score = collisionScore(candidate);
        if (score < bestScore) {
          bestScore = score;
          bridgeY = candidate;
        }
        if (score === 0) {
          break;
        }
      }

      const finalBridgeY = bridgeY + manualOffset;
      routePoints = buildRoutePoints ? buildRoutePoints(finalBridgeY) : [markerBase];
    }

    const marker = routePoints[0];
    const markerShift = {
      x: markerOffsetX,
      y: markerOffsetY,
    };
    const shiftedRoutePoints = routePoints.map((point, index) =>
      index === 0
        ? { x: point.x + markerShift.x, y: point.y + markerShift.y }
        : point,
    );
    const shiftedMarker = shiftedRoutePoints[0];

    externalIdentifierLayouts.push({
      relationshipId: node.id,
      marker: shiftedMarker,
      pathPoints: shiftedRoutePoints,
    });
  });

  const activeDragNodeIds = interaction.kind === "drag" ? interaction.nodeIds : props.selection.nodeIds;
  const selectionBounds = getSelectionBounds(props.diagram.nodes.filter((node) => activeDragNodeIds.includes(node.id)));
  const dragOriginBounds =
    interaction.kind === "drag"
      ? getSelectionBounds(interaction.originalDiagram.nodes.filter((node) => interaction.nodeIds.includes(node.id)))
      : null;
  const dragGhostNodeIds = interaction.kind === "drag" ? new Set(interaction.nodeIds) : new Set<string>();
  const dragGhostEdges =
    interaction.kind === "drag"
      ? interaction.originalDiagram.edges.filter(
          (edge) => dragGhostNodeIds.has(edge.sourceId) || dragGhostNodeIds.has(edge.targetId),
        )
      : interaction.kind === "edge-drag"
        ? interaction.originalDiagram.edges.filter((edge) => edge.id === interaction.edgeId)
        : [];
  const dragGhostNodeMap =
    interaction.kind === "drag"
      ? new Map(interaction.originalDiagram.nodes.map((node) => [node.id, node]))
      : new Map<string, DiagramNode>();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.code === "Space") {
        setSpacePressed(true);
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.code === "Space") {
        setSpacePressed(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (props.tool !== "connector" && props.tool !== "inheritance") {
      setPendingConnectionSource(null);
      setConnectionPreviewPoint(null);
      if (props.statusMessage.startsWith("Sorgente")) {
        props.onStatusMessageChange("");
      }
    }

    if (props.mode === "view") {
      setPendingConnectionSource(null);
      setConnectionPreviewPoint(null);
      setInlineEdit(null);
    }
  }, [props.mode, props.onStatusMessageChange, props.statusMessage, props.tool]);

  useEffect(() => {
    if (!focusedTarget) {
      return;
    }

    if (
      focusedTarget.kind === "node" &&
      !props.diagram.nodes.some((node) => node.id === focusedTarget.id)
    ) {
      setFocusedTarget(null);
      return;
    }

    if (
      focusedTarget.kind === "edge" &&
      !props.diagram.edges.some((edge) => edge.id === focusedTarget.id)
    ) {
      setFocusedTarget(null);
    }
  }, [focusedTarget, props.diagram.edges, props.diagram.nodes]);

  function beginPanInteraction(pointerId: number, clientX: number, clientY: number) {
    setInteraction({
      kind: "pan",
      pointerId,
      startClient: { x: clientX, y: clientY },
      startViewport: props.viewport,
    });
  }

  function getWorldPointFromEvent(event: { clientX: number; clientY: number }): Point | null {
    if (!containerRef.current) {
      return null;
    }

    return worldPointFromClient(
      { x: event.clientX, y: event.clientY },
      props.viewport,
      containerRef.current.getBoundingClientRect(),
    );
  }

  function cancelPendingConnection(clearStatus = true) {
    setPendingConnectionSource(null);
    setConnectionPreviewPoint(null);
    if (clearStatus && props.statusMessage.startsWith("Sorgente")) {
      props.onStatusMessageChange("");
    }
  }

  function getViewportRect(): DOMRect | null {
    if (!containerRef.current) {
      return null;
    }

    return containerRef.current.getBoundingClientRect();
  }

  function getViewportTargetBounds(): Bounds | null {
    const selectedNodes = props.diagram.nodes.filter((node) => props.selection.nodeIds.includes(node.id));
    const selectionBounds = getBoundsForViewport(selectedNodes);

    if (selectionBounds) {
      return selectionBounds;
    }

    const primaryNodes = props.diagram.nodes.filter((node) => node.type !== "text");
    return getBoundsForViewport(primaryNodes) ?? getBoundsForViewport(props.diagram.nodes);
  }

  function setViewportFromBounds(bounds: Bounds, zoom: number) {
    const rect = getViewportRect();
    if (!rect) {
      return;
    }

    props.onViewportChange(viewportForBounds(bounds, rect, zoom));
  }

  function fitToContent() {
    const rect = getViewportRect();
    const bounds = getViewportTargetBounds();

    if (!rect) {
      return;
    }

    if (!bounds) {
      props.onViewportChange({
        x: rect.width / 2,
        y: rect.height / 2,
        zoom: 1,
      });
      props.onStatusMessageChange("Viewport centrata.");
      return;
    }

    const paddedBounds = expandBounds(bounds, VIEWPORT_PADDING);
    const widthZoom = rect.width / Math.max(paddedBounds.width, 220);
    const heightZoom = rect.height / Math.max(paddedBounds.height, 200);
    const nextZoom = clampZoom(Math.min(widthZoom, heightZoom));

    props.onViewportChange(viewportForBounds(bounds, rect, nextZoom));
    props.onStatusMessageChange(
      props.selection.nodeIds.length > 0 ? "Selezione adattata al canvas." : "Diagramma adattato al canvas.",
    );
  }

  function centerDiagram() {
    const bounds = getViewportTargetBounds();

    if (!bounds) {
      return;
    }

    setViewportFromBounds(bounds, props.viewport.zoom);
    props.onStatusMessageChange(
      props.selection.nodeIds.length > 0 ? "Selezione centrata." : "Diagramma centrato nel canvas.",
    );
  }

  function resetViewport() {
    const bounds = getViewportTargetBounds();
    const rect = getViewportRect();

    if (!rect) {
      return;
    }

    if (!bounds) {
      props.onViewportChange({
        x: rect.width / 2,
        y: rect.height / 2,
        zoom: 1,
      });
      props.onStatusMessageChange("Viewport ripristinata.");
      return;
    }

    props.onViewportChange(viewportForBounds(bounds, rect, 1));
    props.onStatusMessageChange("Viewport ripristinata.");
  }

  function zoomAroundCanvasCenter(multiplier: number) {
    const rect = getViewportRect();
    if (!rect) {
      return;
    }

    const canvasCenterX = rect.width / 2;
    const canvasCenterY = rect.height / 2;
    const worldX = (canvasCenterX - props.viewport.x) / props.viewport.zoom;
    const worldY = (canvasCenterY - props.viewport.y) / props.viewport.zoom;
    const nextZoom = clampZoom(props.viewport.zoom * multiplier);

    props.onViewportChange({
      zoom: nextZoom,
      x: canvasCenterX - worldX * nextZoom,
      y: canvasCenterY - worldY * nextZoom,
    });
    props.onStatusMessageChange(`Zoom ${Math.round(nextZoom * 100)}%.`);
  }

  function openInlineEditorForSelection() {
    if (props.mode !== "edit" || props.tool !== "select") {
      return;
    }

    if (props.selection.nodeIds.length === 1 && props.selection.edgeIds.length === 0) {
      const node = nodeMap.get(props.selection.nodeIds[0]);
      if (node) {
        setInlineEdit({ kind: "node", id: node.id, value: node.label });
      }
      return;
    }

    if (props.selection.edgeIds.length === 1 && props.selection.nodeIds.length === 0) {
      const edge = props.diagram.edges.find((candidate) => candidate.id === props.selection.edgeIds[0]);
      if (!edge) {
        return;
      }

      const value =
        edge.type === "connector"
          ? edge.cardinality ?? CONNECTOR_CARDINALITY_PLACEHOLDER
          : edge.type === "attribute"
            ? edge.cardinality ?? ""
            : edge.label;

      setInlineEdit({ kind: "edge", id: edge.id, value });
    }
  }

  function moveSelectedNodes(deltaX: number, deltaY: number): boolean {
    if (props.mode !== "edit" || props.selection.nodeIds.length === 0) {
      return false;
    }

    const movingNodeIds = expandDragNodeIds(props.diagram, props.selection.nodeIds);
    const nextDiagram = {
      ...props.diagram,
      nodes: props.diagram.nodes.map((node) =>
        movingNodeIds.includes(node.id)
          ? {
              ...node,
              x: snapValue(node.x + deltaX),
              y: snapValue(node.y + deltaY),
            }
          : node,
      ),
    };

    props.onCommitDiagram(nextDiagram, props.diagram);
    props.onStatusMessageChange("Selezione spostata con la tastiera.");
    return true;
  }

  function moveSelectedEdgeOffset(delta: number): boolean {
    if (props.mode !== "edit" || props.selection.nodeIds.length > 0 || props.selection.edgeIds.length !== 1) {
      return false;
    }

    const nextDiagram = {
      ...props.diagram,
      edges: props.diagram.edges.map((edge) =>
        edge.id === props.selection.edgeIds[0]
          ? {
              ...edge,
              manualOffset: Math.round(((edge.manualOffset ?? 0) + delta) / 2) * 2,
            }
          : edge,
      ),
    };

    props.onCommitDiagram(nextDiagram, props.diagram);
    props.onStatusMessageChange("Collegamento regolato con la tastiera.");
    return true;
  }

  function handleCanvasKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (inlineEdit) {
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      event.stopPropagation();
      centerDiagram();
      return;
    }

    if (event.key === "0") {
      event.preventDefault();
      event.stopPropagation();
      resetViewport();
      return;
    }

    if (event.key === "9") {
      event.preventDefault();
      event.stopPropagation();
      fitToContent();
      return;
    }

    if (event.key === "=" || event.key === "+") {
      event.preventDefault();
      event.stopPropagation();
      zoomAroundCanvasCenter(1.14);
      return;
    }

    if (event.key === "-") {
      event.preventDefault();
      event.stopPropagation();
      zoomAroundCanvasCenter(1 / 1.14);
      return;
    }

    if (event.key === "Escape" && pendingConnectionSource) {
      event.preventDefault();
      event.stopPropagation();
      cancelPendingConnection();
      props.onStatusMessageChange("Creazione collegamento annullata.");
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      openInlineEditorForSelection();
      return;
    }

    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      event.stopPropagation();
      props.onDeleteSelection();
      return;
    }

    const distance = event.shiftKey ? GRID_SIZE * 2 : GRID_SIZE;
    const arrowMoves: Record<string, { x: number; y: number; edgeDelta: number }> = {
      ArrowUp: { x: 0, y: -distance, edgeDelta: -distance / 2 },
      ArrowDown: { x: 0, y: distance, edgeDelta: distance / 2 },
      ArrowLeft: { x: -distance, y: 0, edgeDelta: -distance / 2 },
      ArrowRight: { x: distance, y: 0, edgeDelta: distance / 2 },
    };

    const movement = arrowMoves[event.key];
    if (!movement) {
      return;
    }

    const movedNodes = moveSelectedNodes(movement.x, movement.y);
    const movedEdge = !movedNodes && moveSelectedEdgeOffset(movement.edgeDelta);

    if (movedNodes || movedEdge) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function handleNodeFocus(node: DiagramNode) {
    setFocusedTarget({ kind: "node", id: node.id });
    props.onSelectionChange({ nodeIds: [node.id], edgeIds: [] });
  }

  function handleEdgeFocus(edge: DiagramEdge) {
    setFocusedTarget({ kind: "edge", id: edge.id });
    props.onSelectionChange({ nodeIds: [], edgeIds: [edge.id] });
  }

  function beginConnection(node: DiagramNode) {
    if (!pendingConnectionSource) {
      setPendingConnectionSource(node.id);
      setConnectionPreviewPoint(getNodeCenter(node));
      props.onStatusMessageChange(
        `Sorgente selezionata: ${node.label}. Seleziona la destinazione o premi Esc per annullare.`,
      );
      return;
    }

    if (pendingConnectionSource === node.id) {
      cancelPendingConnection();
      return;
    }

    const sourceNode = nodeMap.get(pendingConnectionSource);
    if (!sourceNode) {
      cancelPendingConnection();
      return;
    }

    const edgeType: EdgeKind =
      props.tool === "inheritance"
        ? "inheritance"
        : sourceNode.type === "attribute" || node.type === "attribute"
          ? "attribute"
          : "connector";

    const result = props.onCreateEdge(edgeType, pendingConnectionSource, node.id);
    cancelPendingConnection(false);
    props.onStatusMessageChange(result.message);
  }

  function handleCanvasPointerDown(event: ReactPointerEvent<SVGRectElement>) {
    if (event.button === 2) {
      return;
    }

    if (!containerRef.current) {
      return;
    }

    containerRef.current.focus();

    const worldPoint = getWorldPointFromEvent(event);
    if (!worldPoint) {
      return;
    }

    if (event.button === 1 || spacePressed || props.tool === "move") {
      beginPanInteraction(event.pointerId, event.clientX, event.clientY);
      return;
    }

    if (editableTool(props.tool) && props.mode === "edit") {
      const newId = props.onCreateNode(props.tool, worldPoint);
      props.onSelectionChange({ nodeIds: [newId], edgeIds: [] });
      return;
    }

    cancelPendingConnection();

    if (props.mode === "view") {
      setInteraction({
        kind: "pan",
        pointerId: event.pointerId,
        startClient: { x: event.clientX, y: event.clientY },
        startViewport: props.viewport,
      });
      return;
    }

    if (props.tool === "select") {
      setInteraction({
        kind: "marquee",
        pointerId: event.pointerId,
        startWorld: worldPoint,
        currentWorld: worldPoint,
        additive: event.shiftKey,
        baseSelection: props.selection,
      });

      if (!event.shiftKey) {
        props.onSelectionChange({ nodeIds: [], edgeIds: [] });
      }
      return;
    }

  }

  function handleNodePointerDown(event: ReactPointerEvent<SVGGElement>, node: DiagramNode) {
    event.stopPropagation();
    event.currentTarget.focus();

    if (props.tool === "delete") {
      if (props.mode === "edit") {
        props.onDeleteNode(node.id);
      }
      return;
    }

    if (props.tool === "connector" || props.tool === "inheritance") {
      if (props.mode === "edit") {
        beginConnection(node);
      }
      return;
    }

    if (props.tool === "move") {
      beginPanInteraction(event.pointerId, event.clientX, event.clientY);
      return;
    }

    if (props.tool !== "select") {
      return;
    }

    if (props.mode === "edit" && props.selection.nodeIds.length === 1 && props.selection.edgeIds.length === 0) {
      const sourceNode = nodeMap.get(props.selection.nodeIds[0]);
      const canStartExternalIdentifier =
        sourceNode?.type === "attribute" && sourceNode.isIdentifier === true && sourceNode.id !== node.id;

      const validTarget = node.type === "entity" || (node.type === "attribute" && node.isIdentifier !== true);
      if (canStartExternalIdentifier && validTarget) {
        const result = props.onCreateExternalIdentifier(sourceNode.id, node.id);
        props.onStatusMessageChange(result.message);
        return;
      }
    }

    if (props.mode === "view") {
      props.onSelectionChange({ nodeIds: [node.id], edgeIds: [] });
      return;
    }

    if (event.shiftKey) {
      props.onSelectionChange(addToSelection(props.selection, node.id));
      return;
    }

    const selectedNodeIds =
      props.selection.nodeIds.includes(node.id) && props.selection.nodeIds.length > 0
        ? props.selection.nodeIds
        : [node.id];
    const nodeIds = expandDragNodeIds(props.diagram, selectedNodeIds);

    const originalDiagram = props.diagram;
    const originPositions: Record<string, Point> = {};
    nodeIds.forEach((nodeId) => {
      const currentNode = nodeMap.get(nodeId);
      if (currentNode) {
        originPositions[nodeId] = { x: currentNode.x, y: currentNode.y };
      }
    });

    props.onSelectionChange({ nodeIds: selectedNodeIds, edgeIds: [] });
    setInteraction({
      kind: "drag",
      pointerId: event.pointerId,
      startClient: { x: event.clientX, y: event.clientY },
      originalDiagram,
      nodeIds,
      originPositions,
    });
  }

  function handleEdgePointerDown(event: ReactPointerEvent<SVGGElement>, edge: DiagramEdge) {
    event.stopPropagation();
    event.currentTarget.focus();

    if (props.tool === "delete") {
      if (props.mode === "edit") {
        props.onDeleteEdge(edge.id);
      }
      return;
    }

    if (props.tool === "move") {
      beginPanInteraction(event.pointerId, event.clientX, event.clientY);
      return;
    }

    if (props.tool !== "select") {
      return;
    }

    props.onSelectionChange({ nodeIds: [], edgeIds: [edge.id] });
  }

  function handleEdgeLabelPointerDown(event: ReactPointerEvent<SVGTextElement>, edge: DiagramEdge) {
    event.stopPropagation();

    if (props.mode !== "edit" || props.tool !== "select" || edge.type !== "connector") {
      props.onSelectionChange({ nodeIds: [], edgeIds: [edge.id] });
      return;
    }

    const sourceNode = nodeMap.get(edge.sourceId);
    const targetNode = nodeMap.get(edge.targetId);
    if (!sourceNode || !targetNode) {
      return;
    }

    const sourceCenter = getNodeCenter(sourceNode);
    const targetCenter = getNodeCenter(targetNode);
    // Drag should move connectors across parallel lanes, i.e. on the perpendicular axis.
    const axis =
      Math.abs(sourceCenter.x - targetCenter.x) >= Math.abs(sourceCenter.y - targetCenter.y)
        ? "y"
        : "x";

    props.onSelectionChange({ nodeIds: [], edgeIds: [edge.id] });
    setInteraction({
      kind: "edge-drag",
      pointerId: event.pointerId,
      startClient: { x: event.clientX, y: event.clientY },
      originalDiagram: props.diagram,
      edgeId: edge.id,
      startOffset: edge.manualOffset ?? 0,
      axis,
    });
  }

  function handleExternalIdentifierPointerDown(
    event: ReactPointerEvent<SVGGElement>,
    relationshipId: string,
  ) {
    event.stopPropagation();

    if (props.tool === "delete") {
      if (props.mode === "edit") {
        props.onDeleteExternalIdentifier(relationshipId);
      }
      return;
    }

    if (props.mode !== "edit" || props.tool !== "select") {
      return;
    }

    const relationshipNode = nodeMap.get(relationshipId);
    if (!relationshipNode || relationshipNode.type !== "relationship") {
      return;
    }

    props.onSelectionChange({ nodeIds: [relationshipId], edgeIds: [] });
    setInteraction({
      kind: "external-id-drag",
      pointerId: event.pointerId,
      startClient: { x: event.clientX, y: event.clientY },
      originalDiagram: props.diagram,
      relationshipId,
      startOffset: relationshipNode.externalIdentifierOffset ?? 0,
    });
  }

  function handleExternalIdentifierMarkerPointerDown(
    event: ReactPointerEvent<SVGCircleElement>,
    relationshipId: string,
  ) {
    event.stopPropagation();

    if (props.tool === "delete") {
      if (props.mode === "edit") {
        props.onDeleteExternalIdentifier(relationshipId);
      }
      return;
    }

    if (props.mode !== "edit" || props.tool !== "select") {
      return;
    }

    const relationshipNode = nodeMap.get(relationshipId);
    if (!relationshipNode || relationshipNode.type !== "relationship") {
      return;
    }

    props.onSelectionChange({ nodeIds: [relationshipId], edgeIds: [] });
    setInteraction({
      kind: "external-id-marker-drag",
      pointerId: event.pointerId,
      startClient: { x: event.clientX, y: event.clientY },
      originalDiagram: props.diagram,
      relationshipId,
      startOffsetX: relationshipNode.externalIdentifierMarkerOffsetX ?? 0,
      startOffsetY: relationshipNode.externalIdentifierMarkerOffsetY ?? 0,
    });
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (pendingConnectionSource) {
      const worldPoint = getWorldPointFromEvent(event);
      if (worldPoint) {
        setConnectionPreviewPoint(worldPoint);
      }
    }

    if (interaction.kind === "idle") {
      return;
    }

    if (interaction.kind === "pan") {
      const deltaX = event.clientX - interaction.startClient.x;
      const deltaY = event.clientY - interaction.startClient.y;
      props.onViewportChange({
        ...interaction.startViewport,
        x: interaction.startViewport.x + deltaX,
        y: interaction.startViewport.y + deltaY,
      });
      return;
    }

    if (interaction.kind === "drag") {
      const deltaX = (event.clientX - interaction.startClient.x) / props.viewport.zoom;
      const deltaY = (event.clientY - interaction.startClient.y) / props.viewport.zoom;
      const nextNodes = interaction.originalDiagram.nodes.map((node) => {
        if (!interaction.nodeIds.includes(node.id)) {
          return node;
        }

        const origin = interaction.originPositions[node.id];
        return {
          ...node,
          x: origin.x + deltaX,
          y: origin.y + deltaY,
        };
      });

      props.onPreviewDiagram({
        ...interaction.originalDiagram,
        nodes: nextNodes,
      });
      return;
    }

    if (interaction.kind === "edge-drag") {
      const pointerDelta =
        interaction.axis === "x"
          ? event.clientX - interaction.startClient.x
          : event.clientY - interaction.startClient.y;
      const nextOffset = Math.round((interaction.startOffset + pointerDelta / props.viewport.zoom) / 2) * 2;

      const nextEdges = interaction.originalDiagram.edges.map((edge) =>
        edge.id === interaction.edgeId ? { ...edge, manualOffset: nextOffset } : edge,
      );

      props.onPreviewDiagram({
        ...interaction.originalDiagram,
        edges: nextEdges,
      });
      return;
    }

    if (interaction.kind === "external-id-drag") {
      const pointerDelta = event.clientY - interaction.startClient.y;
      const nextOffset = Math.round((interaction.startOffset + pointerDelta / props.viewport.zoom) / 2) * 2;

      const nextNodes = interaction.originalDiagram.nodes.map((node) => {
        if (node.id !== interaction.relationshipId || node.type !== "relationship") {
          return node;
        }

        return {
          ...node,
          externalIdentifierOffset: nextOffset,
        };
      });

      props.onPreviewDiagram({
        ...interaction.originalDiagram,
        nodes: nextNodes,
      });
      return;
    }

    if (interaction.kind === "external-id-marker-drag") {
      const deltaX = (event.clientX - interaction.startClient.x) / props.viewport.zoom;
      const deltaY = (event.clientY - interaction.startClient.y) / props.viewport.zoom;
      const nextOffsetX = Math.round((interaction.startOffsetX + deltaX) / 2) * 2;
      const nextOffsetY = Math.round((interaction.startOffsetY + deltaY) / 2) * 2;

      const nextNodes = interaction.originalDiagram.nodes.map((node) => {
        if (node.id !== interaction.relationshipId || node.type !== "relationship") {
          return node;
        }

        return {
          ...node,
          externalIdentifierMarkerOffsetX: nextOffsetX,
          externalIdentifierMarkerOffsetY: nextOffsetY,
        };
      });

      props.onPreviewDiagram({
        ...interaction.originalDiagram,
        nodes: nextNodes,
      });
      return;
    }

    const worldPoint = getWorldPointFromEvent(event);
    if (!worldPoint) {
      return;
    }

    setInteraction({
      ...interaction,
      currentWorld: worldPoint,
    });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (interaction.kind === "idle") {
      return;
    }

    if (interaction.kind === "drag") {
      props.onCommitDiagram(props.diagram, interaction.originalDiagram);
      setInteraction({ kind: "idle" });
      return;
    }

    if (interaction.kind === "edge-drag") {
      props.onCommitDiagram(props.diagram, interaction.originalDiagram);
      setInteraction({ kind: "idle" });
      return;
    }

    if (interaction.kind === "external-id-drag") {
      props.onCommitDiagram(props.diagram, interaction.originalDiagram);
      setInteraction({ kind: "idle" });
      return;
    }

    if (interaction.kind === "external-id-marker-drag") {
      props.onCommitDiagram(props.diagram, interaction.originalDiagram);
      setInteraction({ kind: "idle" });
      return;
    }

    if (interaction.kind === "marquee") {
      const bounds = normalizeBounds(interaction.startWorld, interaction.currentWorld);
      const selectedIds = props.diagram.nodes
        .filter((node) => {
          if (bounds.width < 4 && bounds.height < 4) {
            return false;
          }

          const nodeBounds = getNodeBounds(node);
          return !(
            nodeBounds.x + nodeBounds.width < bounds.x ||
            bounds.x + bounds.width < nodeBounds.x ||
            nodeBounds.y + nodeBounds.height < bounds.y ||
            bounds.y + bounds.height < nodeBounds.y
          );
        })
        .map((node) => node.id);

      props.onSelectionChange(
        interaction.additive
          ? unionSelection(interaction.baseSelection, selectedIds)
          : { nodeIds: selectedIds, edgeIds: [] },
      );
    }

    if (interaction.kind === "pan" && event.pointerId === interaction.pointerId) {
      setInteraction({ kind: "idle" });
      return;
    }

    setInteraction({ kind: "idle" });
  }

  function handleCanvasWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();

    if (!containerRef.current) {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const deltaScale = event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? rect.height : 1;
    const zoomFactor = Math.exp((-event.deltaY * deltaScale) / 720);
    const nextZoom = clampZoom(props.viewport.zoom * zoomFactor);

    if (Math.abs(nextZoom - props.viewport.zoom) < 0.001) {
      return;
    }

    const worldX = (cursorX - props.viewport.x) / props.viewport.zoom;
    const worldY = (cursorY - props.viewport.y) / props.viewport.zoom;

    props.onViewportChange({
      zoom: nextZoom,
      x: cursorX - worldX * nextZoom,
      y: cursorY - worldY * nextZoom,
    });
  }

  function startInlineNodeEdit(event: MouseEvent<SVGGElement>, node: DiagramNode) {
    event.stopPropagation();
    if (props.mode === "view") {
      return;
    }

    setInlineEdit({ kind: "node", id: node.id, value: node.label });
  }

  function startInlineEdgeEdit(event: MouseEvent<SVGGElement>, edge: DiagramEdge) {
    event.stopPropagation();
    if (props.mode === "view") {
      return;
    }

    const value =
      edge.type === "connector"
        ? edge.cardinality ?? CONNECTOR_CARDINALITY_PLACEHOLDER
        : edge.type === "attribute"
          ? edge.cardinality ?? ""
          : edge.label;
    setInlineEdit({ kind: "edge", id: edge.id, value });
  }

  function commitInlineEdit() {
    if (!inlineEdit) {
      return;
    }

    const trimmed = inlineEdit.value.trim();
    if (inlineEdit.kind === "node") {
      const currentNode = nodeMap.get(inlineEdit.id);
      props.onRenameNode(inlineEdit.id, trimmed || currentNode?.label || "");
    } else {
      const currentEdge = props.diagram.edges.find((edge) => edge.id === inlineEdit.id);

      if (!currentEdge) {
        setInlineEdit(null);
        return;
      }

      if (currentEdge.type === "connector") {
        props.onRenameEdge(inlineEdit.id, inlineEdit.value || CONNECTOR_CARDINALITY_PLACEHOLDER);
      } else if (currentEdge.type === "attribute") {
        props.onRenameEdge(inlineEdit.id, inlineEdit.value);
      } else {
        props.onRenameEdge(inlineEdit.id, trimmed || currentEdge.label || "");
      }
    }

    setInlineEdit(null);
  }

  function inlineEditorStyle() {
    if (!inlineEdit || !containerRef.current) {
      return undefined;
    }

    const rect = containerRef.current.getBoundingClientRect();

    if (inlineEdit.kind === "node") {
      const node = nodeMap.get(inlineEdit.id);
      if (!node) {
        return undefined;
      }

      const targetPoint =
        node.type === "attribute"
          ? (() => {
              const layout = getAttributeLabelLayout(node, attributeDirectionMap.get(node.id));
              const horizontalAnchorOffset =
                layout.textAnchor === "start" ? 12 : layout.textAnchor === "end" ? -160 : -74;
              return {
                x: layout.x + horizontalAnchorOffset,
                y: layout.y - 12,
              };
            })()
          : { x: node.x + 10, y: node.y + node.height / 2 - 14 };
      const screenPoint = clientPointFromWorld(targetPoint, props.viewport, rect);

      return {
        left: screenPoint.x - rect.left,
        top: screenPoint.y - rect.top,
        width: Math.max(140, node.width * props.viewport.zoom),
      };
    }

    const edge = props.diagram.edges.find((candidate) => candidate.id === inlineEdit.id);
    if (!edge) {
      return undefined;
    }

    const sourceNode = nodeMap.get(edge.sourceId);
    const targetNode = nodeMap.get(edge.targetId);
    if (!sourceNode || !targetNode) {
      return undefined;
    }

    const laneInfo = connectorLaneMap.get(edge.id);
    const geometry = getEdgeGeometry(edge, sourceNode, targetNode, laneInfo);
    const screenPoint = clientPointFromWorld(geometry.labelPoint, props.viewport, rect);

    return {
      left: screenPoint.x - rect.left - 80,
      top: screenPoint.y - rect.top - 18,
      width: 180,
    };
  }

  const marqueeBounds =
    interaction.kind === "marquee"
      ? normalizeBounds(interaction.startWorld, interaction.currentWorld)
      : null;
  const editorStyle = inlineEditorStyle();
  const inlineEdge =
    inlineEdit?.kind === "edge" ? props.diagram.edges.find((candidate) => candidate.id === inlineEdit.id) : null;
  const editingEdgeCardinality = inlineEdge?.type === "connector" || inlineEdge?.type === "attribute";
  const pendingSourceNode = pendingConnectionSource ? nodeMap.get(pendingConnectionSource) : undefined;
  const pendingConnectionPath =
    pendingSourceNode && connectionPreviewPoint
      ? pathFromPoints([
          clipPointToNodePerimeter(pendingSourceNode, connectionPreviewPoint),
          connectionPreviewPoint,
        ])
      : null;

  return (
    <div
      ref={containerRef}
      className="canvas-panel"
      role="region"
      tabIndex={0}
      aria-label="Canvas diagramma ER. Usa Tab per mettere a fuoco nodi e collegamenti, frecce per spostare la selezione, Invio per rinominare e Canc per eliminare."
      onKeyDown={handleCanvasKeyDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={(event) => {
        if (pendingConnectionSource) {
          setConnectionPreviewPoint(null);
        }
        handlePointerUp(event);
      }}
      onWheel={handleCanvasWheel}
    >
      <svg ref={props.svgRef} className="diagram-canvas">
        <defs>
          <pattern id="canvas-grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
            <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke={DIAGRAM_GRID} strokeWidth="1" />
          </pattern>
          <marker
            id="arrowhead"
            markerWidth="12"
            markerHeight="12"
            refX="10"
            refY="6"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M 0 0 L 12 6 L 0 12 z" fill="context-stroke" />
          </marker>
        </defs>

        <g transform={`translate(${props.viewport.x}, ${props.viewport.y}) scale(${props.viewport.zoom})`}>
          <rect
            x={-WORLD_EXTENT / 2}
            y={-WORLD_EXTENT / 2}
            width={WORLD_EXTENT}
            height={WORLD_EXTENT}
            fill="url(#canvas-grid)"
            onPointerDown={handleCanvasPointerDown}
          />

          {dragGhostEdges.map((edge) => {
            const sourceNode = dragGhostNodeMap.get(edge.sourceId) ?? nodeMap.get(edge.sourceId);
            const targetNode = dragGhostNodeMap.get(edge.targetId) ?? nodeMap.get(edge.targetId);

            if (!sourceNode || !targetNode) {
              return null;
            }

            return (
              <DiagramEdgeView
                key={`ghost-${edge.id}`}
                edge={edge}
                sourceNode={sourceNode}
                targetNode={targetNode}
                laneInfo={connectorLaneMap.get(edge.id)}
                selected={false}
                dragging={false}
                ghost
                focused={false}
                focusable={false}
                onFocus={() => undefined}
                onBlur={() => undefined}
                onPointerDown={() => undefined}
                onLabelPointerDown={() => undefined}
                onDoubleClick={() => undefined}
              />
            );
          })}

          {interaction.kind === "drag"
            ? interaction.originalDiagram.nodes
                .filter((node) => dragGhostNodeIds.has(node.id))
                .map((node) => (
                  <DiagramNodeView
                    key={`ghost-${node.id}`}
                    node={node}
                    selected={false}
                    dragging={false}
                    ghost
                    pending={false}
                    validationLevel={undefined}
                    validationCount={undefined}
                    focused={false}
                    focusable={false}
                    onFocus={() => undefined}
                    onBlur={() => undefined}
                    attributeDirection={originalAttributeDirectionMap.get(node.id)}
                    onPointerDown={() => undefined}
                    onDoubleClick={() => undefined}
                  />
                ))
            : null}

          {interaction.kind === "drag" && selectionBounds ? (
            <g pointerEvents="none">
              <rect
                x={selectionBounds.x - 18}
                y={selectionBounds.y - 18}
                width={selectionBounds.width + 36}
                height={selectionBounds.height + 36}
                rx={18}
                ry={18}
                fill="rgba(255, 253, 250, 0.72)"
                stroke={DIAGRAM_STROKE}
                strokeWidth={3.2}
              />
              <rect
                x={selectionBounds.x - 8}
                y={selectionBounds.y - 8}
                width={selectionBounds.width + 16}
                height={selectionBounds.height + 16}
                rx={14}
                ry={14}
                fill="none"
                stroke="var(--diagram-drag)"
                strokeWidth={1.7}
                strokeDasharray="10 8"
                opacity={0.7}
              />
            </g>
          ) : null}

          {interaction.kind === "drag" && dragOriginBounds ? (
            <rect
              x={dragOriginBounds.x - 10}
              y={dragOriginBounds.y - 10}
              width={dragOriginBounds.width + 20}
              height={dragOriginBounds.height + 20}
              rx={14}
              ry={14}
              fill="none"
              stroke="var(--diagram-drag)"
              strokeDasharray="10 8"
              strokeWidth={1.6}
              opacity={0.46}
              pointerEvents="none"
            />
          ) : null}

          {props.diagram.edges.map((edge) => {
            const sourceNode = nodeMap.get(edge.sourceId);
            const targetNode = nodeMap.get(edge.targetId);

            if (!sourceNode || !targetNode) {
              return null;
            }

            return (
              <DiagramEdgeView
                key={edge.id}
                edge={edge}
                sourceNode={sourceNode}
                targetNode={targetNode}
                laneInfo={connectorLaneMap.get(edge.id)}
                selected={props.selection.edgeIds.includes(edge.id)}
                dragging={interaction.kind === "edge-drag" && interaction.edgeId === edge.id}
                validationLevel={edgeIssueMap.get(edge.id)?.level}
                validationCount={edgeIssueMap.get(edge.id)?.count}
                focused={focusedTarget?.kind === "edge" && focusedTarget.id === edge.id}
                focusable={props.tool === "select"}
                onFocus={handleEdgeFocus}
                onBlur={(focusEvent: ReactFocusEvent<SVGGElement>) => {
                  if (!focusEvent.currentTarget.contains(focusEvent.relatedTarget as Node | null)) {
                    setFocusedTarget((current) =>
                      current?.kind === "edge" && current.id === edge.id ? null : current,
                    );
                  }
                }}
                onPointerDown={handleEdgePointerDown}
                onLabelPointerDown={handleEdgeLabelPointerDown}
                onDoubleClick={startInlineEdgeEdit}
              />
            );
          })}

          {props.diagram.nodes.map((node) => (
            <DiagramNodeView
              key={node.id}
              node={node}
              selected={props.selection.nodeIds.includes(node.id)}
              dragging={interaction.kind === "drag" && interaction.nodeIds.includes(node.id)}
              pending={pendingConnectionSource === node.id}
              validationLevel={nodeIssueMap.get(node.id)?.level}
              validationCount={nodeIssueMap.get(node.id)?.count}
              focused={focusedTarget?.kind === "node" && focusedTarget.id === node.id}
              focusable={props.tool === "select" || props.tool === "connector" || props.tool === "inheritance"}
              onFocus={handleNodeFocus}
              onBlur={(focusEvent: ReactFocusEvent<SVGGElement>) => {
                if (!focusEvent.currentTarget.contains(focusEvent.relatedTarget as Node | null)) {
                  setFocusedTarget((current) =>
                    current?.kind === "node" && current.id === node.id ? null : current,
                  );
                }
              }}
              attributeDirection={attributeDirectionMap.get(node.id)}
              onPointerDown={handleNodePointerDown}
              onDoubleClick={startInlineNodeEdit}
            />
          ))}

          {pendingConnectionPath ? (
            <g className="connection-preview" pointerEvents="none">
              <path
                d={pendingConnectionPath}
                fill="none"
                stroke={DIAGRAM_FOCUS}
                strokeWidth={2.5}
                strokeDasharray="10 8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx={connectionPreviewPoint?.x} cy={connectionPreviewPoint?.y} r={6} fill={DIAGRAM_FOCUS} />
            </g>
          ) : null}

          {compositeIdentifierLayouts.map((layout) => (
            <g key={`composite-id-${layout.hostId}`} className="composite-identifier" pointerEvents="none">
              {layout.orientation === "vertical" ? (
                <line x1={layout.x} y1={layout.y1} x2={layout.x} y2={layout.y2} stroke={DIAGRAM_STROKE} strokeWidth={2} />
              ) : (
                <line x1={layout.x1} y1={layout.y} x2={layout.x2} y2={layout.y} stroke={DIAGRAM_STROKE} strokeWidth={2} />
              )}
              <circle cx={layout.marker.x} cy={layout.marker.y} r={8} fill={DIAGRAM_STROKE} stroke={DIAGRAM_STROKE} strokeWidth={2} />
              <circle
                cx={layout.marker.x}
                cy={layout.marker.y}
                r={12}
                fill="transparent"
                onPointerDown={(event) => handleExternalIdentifierMarkerPointerDown(event, layout.hostId)}
              />
            </g>
          ))}

          {externalIdentifierLayouts.map((layout) => (
            (() => {
              const pathData = pathFromPoints(layout.pathPoints);

              return (
                <g
                  key={`external-id-${layout.relationshipId}`}
                  className="external-identifier"
                  onPointerDown={(event) => handleExternalIdentifierPointerDown(event, layout.relationshipId)}
                >
                  <path d={pathData} fill="none" stroke="transparent" strokeWidth={14} />
                  <path
                    d={pathData}
                    fill="none"
                    stroke={DIAGRAM_STROKE}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx={layout.marker.x}
                    cy={layout.marker.y}
                    r={8}
                    fill={DIAGRAM_STROKE}
                    stroke={DIAGRAM_STROKE}
                    strokeWidth={2}
                  />
                </g>
              );
            })()
          ))}

          {interaction.kind !== "drag" && selectionBounds ? (
            <rect
              x={selectionBounds.x - 8}
              y={selectionBounds.y - 8}
              width={selectionBounds.width + 16}
              height={selectionBounds.height + 16}
              fill="none"
              stroke={DIAGRAM_SELECTION}
              strokeDasharray="6 4"
            />
          ) : null}

          {marqueeBounds ? (
            <rect
              x={marqueeBounds.x}
              y={marqueeBounds.y}
              width={marqueeBounds.width}
              height={marqueeBounds.height}
              fill={DIAGRAM_SELECTION_FILL}
              stroke={DIAGRAM_SELECTION}
              strokeDasharray="6 4"
            />
          ) : null}
        </g>
      </svg>

      <div className="canvas-viewport-hud" aria-label="Controlli viewport">
        <div className="canvas-hud-cluster">
          <button type="button" className="canvas-hud-button" onClick={() => zoomAroundCanvasCenter(1 / 1.14)}>
            -
          </button>
          <button type="button" className="canvas-hud-button canvas-hud-zoom" onClick={resetViewport}>
            {Math.round(props.viewport.zoom * 100)}%
          </button>
          <button type="button" className="canvas-hud-button" onClick={() => zoomAroundCanvasCenter(1.14)}>
            +
          </button>
        </div>
        <div className="canvas-hud-cluster">
          <button type="button" className="canvas-hud-button" onClick={fitToContent}>
            {props.selection.nodeIds.length > 0 ? "Adatta sel." : "Adatta"}
          </button>
          <button type="button" className="canvas-hud-button" onClick={centerDiagram}>
            Centra
          </button>
          <button type="button" className="canvas-hud-button" onClick={resetViewport}>
            Reset
          </button>
        </div>
      </div>

      <div className="canvas-pan-hint" aria-hidden="true">
        Spazio + drag per pan, 9 adatta, 0 reset.
      </div>

      {inlineEdit && editorStyle ? (
        <form
          className="inline-editor"
          style={editorStyle}
          onSubmit={(event) => {
            event.preventDefault();
            commitInlineEdit();
          }}
        >
          {editingEdgeCardinality ? (
            <select
              autoFocus
              value={inlineEdit.value || (inlineEdge?.type === "connector" ? CONNECTOR_CARDINALITY_PLACEHOLDER : "")}
              onBlur={commitInlineEdit}
              onChange={(event) =>
                setInlineEdit((current) => (current ? { ...current, value: event.target.value } : current))
              }
            >
              {inlineEdge?.type === "attribute" ? (
                <option value="">Nessuna cardinalita</option>
              ) : (
                <option value={CONNECTOR_CARDINALITY_PLACEHOLDER}>Seleziona cardinalita</option>
              )}
              {CONNECTOR_CARDINALITIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          ) : (
            <input
              autoFocus
              value={inlineEdit.value}
              onBlur={commitInlineEdit}
              onChange={(event) =>
                setInlineEdit((current) => (current ? { ...current, value: event.target.value } : current))
              }
            />
          )}
        </form>
      ) : null}

      <div className="canvas-status-bar">
        <span>{props.mode === "edit" ? "Modalita modifica" : "Modalita visualizzazione"}</span>
        <span>Zoom {Math.round(props.viewport.zoom * 100)}%</span>
        <span>Snap {GRID_SIZE}px</span>
        {props.statusMessage ? <span>{props.statusMessage}</span> : null}
      </div>
    </div>
  );
}
