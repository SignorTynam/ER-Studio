import { useEffect, useRef, useState } from "react";
import type {
  MouseEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
  WheelEvent as ReactWheelEvent,
} from "react";
import { DiagramEdgeView } from "./DiagramEdge";
import { DiagramNodeView } from "./DiagramNode";
import {
  clampZoom,
  clientPointFromWorld,
  getEdgeGeometry,
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

export function DiagramCanvas(props: DiagramCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [interaction, setInteraction] = useState<InteractionState>({ kind: "idle" });
  const [pendingConnectionSource, setPendingConnectionSource] = useState<string | null>(null);
  const [inlineEdit, setInlineEdit] = useState<InlineEditState>(null);
  const [spacePressed, setSpacePressed] = useState(false);

  const nodeMap = new Map(props.diagram.nodes.map((node) => [node.id, node]));
  const connectorLaneMap = new Map<string, { laneIndex: number; laneCount: number }>();
  const connectorGroups = new Map<string, string[]>();

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

    const value = edge.type === "connector" ? edge.cardinality ?? "(X,Y)" : edge.label;
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
      props.onRenameEdge(inlineEdit.id, trimmed || currentEdge?.label || "");
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
          ? { x: node.x + 38, y: node.y + node.height / 2 - 10 }
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
              onPointerDown={handleNodePointerDown}
              onDoubleClick={startInlineNodeEdit}
            />
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
          <input
            autoFocus
            value={inlineEdit.value}
            onBlur={commitInlineEdit}
            onChange={(event) =>
              setInlineEdit((current) => (current ? { ...current, value: event.target.value } : current))
            }
          />
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
