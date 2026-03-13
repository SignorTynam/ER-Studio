import { useEffect, useRef, useState } from "react";
import type {
  MouseEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
  WheelEvent as ReactWheelEvent,
} from "react";
import { DiagramEdgeView } from "./DiagramEdge";
import { DiagramNodeView, getAttributeLabelLayout } from "./DiagramNode";
import {
  clampZoom,
  clientPointFromWorld,
  getEdgeGeometry,
  getNodeAnchor,
  getNodeCenter,
  getNodeBounds,
  getSelectionBounds,
  GRID_SIZE,
  normalizeBounds,
  WORLD_EXTENT,
  worldPointFromClient,
} from "../utils/geometry";
import type {
  DiagramDocument,
  EdgeKind,
  DiagramEdge,
  DiagramNode,
  EditorMode,
  Point,
  SelectionState,
  ToolKind,
  Viewport,
} from "../types/diagram";
import {
  CONNECTOR_CARDINALITIES,
  CONNECTOR_CARDINALITY_PLACEHOLDER,
} from "../utils/cardinality";

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
  onRenameNode: (nodeId: string, label: string) => void;
  onRenameEdge: (edgeId: string, label: string) => void;
  onStatusMessageChange: (message: string) => void;
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
  const [inlineEdit, setInlineEdit] = useState<InlineEditState>(null);
  const [spacePressed, setSpacePressed] = useState(false);

  const nodeMap = new Map(props.diagram.nodes.map((node) => [node.id, node]));
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
    bridgeY: number;
    strongSidePoint: Point;
  }> = [];
  const edgeGeometryMap = new Map<string, Point[]>();

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

    const sourceConnector = props.diagram.edges.find(
      (edge) =>
        edge.type === "connector" &&
        ((edge.sourceId === node.id && edge.targetId === sourceHost.id) ||
          (edge.targetId === node.id && edge.sourceId === sourceHost.id)),
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

    const relationshipCenter = getNodeCenter(node);
    const weakEntityCenter = getNodeCenter(targetEntity);

    let marker: Point;
    if (node.externalIdentifierMode === "composite" && node.externalIdentifierTargetAttributeId) {
      const targetAttribute = nodeMap.get(node.externalIdentifierTargetAttributeId);
      if (!targetAttribute || targetAttribute.type !== "attribute") {
        return;
      }

      const targetAttributeEdge = props.diagram.edges.find(
        (edge) =>
          edge.type === "attribute" &&
          ((edge.sourceId === targetAttribute.id && edge.targetId === targetEntity.id) ||
            (edge.targetId === targetAttribute.id && edge.sourceId === targetEntity.id)),
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

      // Start from entity-side anchor and move toward the attribute so the marker stays near it.
      const entityAnchor =
        targetAttributeEdge.sourceId === targetEntity.id
          ? attributeEdgeGeometry.points[0]
          : attributeEdgeGeometry.points[attributeEdgeGeometry.points.length - 1];
      const targetAttributeCenter = getNodeCenter(targetAttribute);
      const towardAttribute = {
        x: targetAttributeCenter.x - entityAnchor.x,
        y: targetAttributeCenter.y - entityAnchor.y,
      };
      const towardLength = Math.hypot(towardAttribute.x, towardAttribute.y) || 1;
      const markerOffset = Math.min(18, towardLength * 0.65);

      marker = {
        x: entityAnchor.x + (towardAttribute.x / towardLength) * markerOffset,
        y: entityAnchor.y + (towardAttribute.y / towardLength) * markerOffset,
      };
    } else {
      const oppositeToward = {
        x: weakEntityCenter.x * 2 - relationshipCenter.x,
        y: weakEntityCenter.y * 2 - relationshipCenter.y,
      };
      const weakOuterAnchor = getNodeAnchor(targetEntity, oppositeToward, "connector", "source");

      const direction = {
        x: weakEntityCenter.x - relationshipCenter.x,
        y: weakEntityCenter.y - relationshipCenter.y,
      };
      const length = Math.hypot(direction.x, direction.y) || 1;
      marker = {
        x: weakOuterAnchor.x + (direction.x / length) * 22,
        y: weakOuterAnchor.y + (direction.y / length) * 22,
      };
    }

    const comparisonY = strongSidePoint.y;
    const preferTop = marker.y <= comparisonY;
    const topBase = Math.min(marker.y, comparisonY) - 28;
    const bottomBase = Math.max(marker.y, comparisonY) + 28;

    const targetAttributeEdgeId =
      node.externalIdentifierMode === "composite" && node.externalIdentifierTargetAttributeId
        ? props.diagram.edges.find(
            (edge) =>
              edge.type === "attribute" &&
              ((edge.sourceId === node.externalIdentifierTargetAttributeId && edge.targetId === targetEntity.id) ||
                (edge.targetId === node.externalIdentifierTargetAttributeId && edge.sourceId === targetEntity.id)),
          )?.id
        : undefined;

    const excludedEdgeIds = new Set<string>([sourceConnector.id, sourceHostEdge.id]);
    if (targetAttributeEdgeId) {
      excludedEdgeIds.add(targetAttributeEdgeId);
    }

    const excludedNodeIds = new Set<string>([node.id, sourceHost.id, targetEntity.id, sourceAttribute.id]);
    if (node.externalIdentifierTargetAttributeId) {
      excludedNodeIds.add(node.externalIdentifierTargetAttributeId);
    }
    const obstacleNodes = props.diagram.nodes.filter((candidate) => !excludedNodeIds.has(candidate.id));

    function collisionScore(bridgeY: number): number {
      let score = 0;

      if (bridgeOverlapsEntity(bridgeY, marker.x, strongSidePoint.x, sourceHost)) {
        score += 1000;
      }
      if (bridgeOverlapsEntity(bridgeY, marker.x, strongSidePoint.x, targetEntity)) {
        score += 1000;
      }

      obstacleNodes.forEach((candidate) => {
        if (bridgeOverlapsNode(bridgeY, marker.x, strongSidePoint.x, candidate)) {
          score += 40;
        }
      });

      const pathSegments: Array<[Point, Point]> = [
        [marker, { x: marker.x, y: bridgeY }],
        [{ x: marker.x, y: bridgeY }, { x: strongSidePoint.x, y: bridgeY }],
        [{ x: strongSidePoint.x, y: bridgeY }, strongSidePoint],
      ];

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

      const spanLeft = Math.min(marker.x, strongSidePoint.x);
      const spanRight = Math.max(marker.x, strongSidePoint.x);
      const intersectsSpan = !(candidate.x + candidate.width < spanLeft || candidate.x > spanRight);
      if (!intersectsSpan) {
        return;
      }

      candidates.push(candidate.y - 16);
      candidates.push(candidate.y + candidate.height + 16);
    });

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

    const manualOffset = typeof node.externalIdentifierOffset === "number" ? node.externalIdentifierOffset : 0;
    const markerOffsetX =
      typeof node.externalIdentifierMarkerOffsetX === "number" ? node.externalIdentifierMarkerOffsetX : 0;
    const markerOffsetY =
      typeof node.externalIdentifierMarkerOffsetY === "number" ? node.externalIdentifierMarkerOffsetY : 0;

    externalIdentifierLayouts.push({
      relationshipId: node.id,
      marker: {
        x: marker.x + markerOffsetX,
        y: marker.y + markerOffsetY,
      },
      bridgeY: bridgeY + manualOffset,
      strongSidePoint,
    });
  });

  const selectionBounds = getSelectionBounds(
    props.diagram.nodes.filter((node) => props.selection.nodeIds.includes(node.id)),
  );

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
      if (props.statusMessage.startsWith("Sorgente")) {
        props.onStatusMessageChange("");
      }
    }

    if (props.mode === "view") {
      setPendingConnectionSource(null);
      setInlineEdit(null);
    }
  }, [props.mode, props.onStatusMessageChange, props.statusMessage, props.tool]);

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

  function beginConnection(node: DiagramNode) {
    if (!pendingConnectionSource) {
      setPendingConnectionSource(node.id);
      props.onStatusMessageChange(`Sorgente selezionata: ${node.label}. Seleziona la destinazione.`);
      return;
    }

    if (pendingConnectionSource === node.id) {
      setPendingConnectionSource(null);
      props.onStatusMessageChange("");
      return;
    }

    const sourceNode = nodeMap.get(pendingConnectionSource);
    if (!sourceNode) {
      setPendingConnectionSource(null);
      props.onStatusMessageChange("");
      return;
    }

    const edgeType: EdgeKind =
      props.tool === "inheritance"
        ? "inheritance"
        : sourceNode.type === "attribute" || node.type === "attribute"
          ? "attribute"
          : "connector";

    const result = props.onCreateEdge(edgeType, pendingConnectionSource, node.id);
    setPendingConnectionSource(null);
    props.onStatusMessageChange(result.message);
  }

  function handleCanvasPointerDown(event: ReactPointerEvent<SVGRectElement>) {
    if (event.button === 2) {
      return;
    }

    if (!containerRef.current) {
      return;
    }

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

    setPendingConnectionSource(null);
    props.onStatusMessageChange("");

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

    const nodeIds =
      props.selection.nodeIds.includes(node.id) && props.selection.nodeIds.length > 0
        ? props.selection.nodeIds
        : [node.id];

    const originalDiagram = props.diagram;
    const originPositions: Record<string, Point> = {};
    nodeIds.forEach((nodeId) => {
      const currentNode = nodeMap.get(nodeId);
      if (currentNode) {
        originPositions[nodeId] = { x: currentNode.x, y: currentNode.y };
      }
    });

    props.onSelectionChange({ nodeIds, edgeIds: [] });
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
    const nextZoom = clampZoom(props.viewport.zoom * (event.deltaY > 0 ? 0.92 : 1.08));

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

  return (
    <div
      ref={containerRef}
      className="canvas-panel"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleCanvasWheel}
    >
      <svg ref={props.svgRef} className="diagram-canvas">
        <defs>
          <pattern id="canvas-grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
            <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="#d7d7d2" strokeWidth="1" />
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
            <path d="M 0 0 L 12 6 L 0 12 z" fill="#111111" />
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
              pending={pendingConnectionSource === node.id}
              attributeDirection={attributeDirectionMap.get(node.id)}
              onPointerDown={handleNodePointerDown}
              onDoubleClick={startInlineNodeEdit}
            />
          ))}

          {compositeIdentifierLayouts.map((layout) => (
            <g key={`composite-id-${layout.hostId}`} className="composite-identifier" pointerEvents="none">
              {layout.orientation === "vertical" ? (
                <line x1={layout.x} y1={layout.y1} x2={layout.x} y2={layout.y2} stroke="#111111" strokeWidth={2} />
              ) : (
                <line x1={layout.x1} y1={layout.y} x2={layout.x2} y2={layout.y} stroke="#111111" strokeWidth={2} />
              )}
              <circle cx={layout.marker.x} cy={layout.marker.y} r={8} fill="#111111" stroke="#111111" strokeWidth={2} />
              <circle
                cx={layout.marker.x}
                cy={layout.marker.y}
                r={12}
                fill="transparent"
                onPointerDown={(event) => handleExternalIdentifierMarkerPointerDown(event, layout.relationshipId)}
              />
            </g>
          ))}

          {externalIdentifierLayouts.map((layout) => (
            <g
              key={`external-id-${layout.relationshipId}`}
              className="external-identifier"
              onPointerDown={(event) => handleExternalIdentifierPointerDown(event, layout.relationshipId)}
            >
              <path
                d={`M ${layout.marker.x} ${layout.marker.y} L ${layout.marker.x} ${layout.bridgeY} L ${layout.strongSidePoint.x} ${layout.bridgeY} L ${layout.strongSidePoint.x} ${layout.strongSidePoint.y}`}
                fill="none"
                stroke="transparent"
                strokeWidth={14}
              />
              <circle cx={layout.marker.x} cy={layout.marker.y} r={8} fill="#111111" stroke="#111111" strokeWidth={2} />
              <line
                x1={layout.marker.x}
                y1={layout.marker.y}
                x2={layout.marker.x}
                y2={layout.bridgeY}
                stroke="#111111"
                strokeWidth={2}
              />
              <line
                x1={layout.marker.x}
                y1={layout.bridgeY}
                x2={layout.strongSidePoint.x}
                y2={layout.bridgeY}
                stroke="#111111"
                strokeWidth={2}
              />
              <line
                x1={layout.strongSidePoint.x}
                y1={layout.bridgeY}
                x2={layout.strongSidePoint.x}
                y2={layout.strongSidePoint.y}
                stroke="#111111"
                strokeWidth={2}
              />
            </g>
          ))}

          {selectionBounds ? (
            <rect
              x={selectionBounds.x - 8}
              y={selectionBounds.y - 8}
              width={selectionBounds.width + 16}
              height={selectionBounds.height + 16}
              fill="none"
              stroke="#6b6b66"
              strokeDasharray="6 4"
            />
          ) : null}

          {marqueeBounds ? (
            <rect
              x={marqueeBounds.x}
              y={marqueeBounds.y}
              width={marqueeBounds.width}
              height={marqueeBounds.height}
              fill="rgba(40,40,40,0.06)"
              stroke="#4b4b46"
              strokeDasharray="6 4"
            />
          ) : null}
        </g>
      </svg>

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
