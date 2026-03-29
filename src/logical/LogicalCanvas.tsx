import { useEffect, useMemo, useRef, useState } from "react";
import type {
  FocusEvent as ReactFocusEvent,
  MouseEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from "react";
import type { Point, Viewport } from "../types/diagram";
import type {
  LogicalColumn,
  LogicalEdge,
  LogicalModel,
  LogicalSelection,
  LogicalTable,
} from "../types/logical";
import {
  LOGICAL_TABLE_HEADER_HEIGHT,
  LOGICAL_TABLE_ROW_HEIGHT,
} from "../utils/logicalLayout";
import {
  clampZoom,
  clientPointFromWorld,
  pathFromPoints,
  worldPointFromClient,
} from "../utils/geometry";

interface LogicalCanvasProps {
  model: LogicalModel;
  selection: LogicalSelection;
  viewport: Viewport;
  fitRequestToken: number;
  onViewportChange: (viewport: Viewport) => void;
  onSelectionChange: (selection: LogicalSelection) => void;
  onPreviewModel: (model: LogicalModel) => void;
  onCommitModel: (nextModel: LogicalModel, previousModel: LogicalModel) => void;
  onRenameTable: (tableId: string, nextName: string) => void;
  onRenameColumn: (tableId: string, columnId: string, nextName: string) => void;
}

type ConnectionSide = "left" | "right" | "top" | "bottom";

interface EdgeRoute {
  points: Point[];
  labelPoint: Point;
}

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
      tableId: string;
      startClient: Point;
      startTablePosition: Point;
      originalModel: LogicalModel;
    };

type InlineEditState =
  | { kind: "table"; tableId: string; value: string }
  | { kind: "column"; tableId: string; columnId: string; value: string }
  | null;

const WORLD_EXTENT = 9200;
const ROUTE_EXIT_OFFSET = 24;
const LANE_STEP = 18;
const VIEWPORT_PADDING = 140;

function getTableCenter(table: LogicalTable): Point {
  return {
    x: table.x + table.width / 2,
    y: table.y + table.height / 2,
  };
}

function chooseAnchorSide(from: LogicalTable, to: LogicalTable): ConnectionSide {
  const fromCenter = getTableCenter(from);
  const toCenter = getTableCenter(to);
  const deltaX = toCenter.x - fromCenter.x;
  const deltaY = toCenter.y - fromCenter.y;

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return deltaX >= 0 ? "right" : "left";
  }

  return deltaY >= 0 ? "bottom" : "top";
}

function anchorPointForSide(table: LogicalTable, side: ConnectionSide): Point {
  if (side === "left") {
    return { x: table.x, y: table.y + table.height / 2 };
  }

  if (side === "right") {
    return { x: table.x + table.width, y: table.y + table.height / 2 };
  }

  if (side === "top") {
    return { x: table.x + table.width / 2, y: table.y };
  }

  return { x: table.x + table.width / 2, y: table.y + table.height };
}

function moveAlongSide(point: Point, side: ConnectionSide, distance: number): Point {
  if (side === "left") {
    return { x: point.x - distance, y: point.y };
  }

  if (side === "right") {
    return { x: point.x + distance, y: point.y };
  }

  if (side === "top") {
    return { x: point.x, y: point.y - distance };
  }

  return { x: point.x, y: point.y + distance };
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

  if (deduped.length < 3) {
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

function getPolylineLength(points: Point[]): number {
  let length = 0;

  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    length += Math.hypot(end.x - start.x, end.y - start.y);
  }

  return length;
}

function pointAlongPolyline(points: Point[], progress: number): Point {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }

  if (points.length === 1) {
    return points[0];
  }

  const totalLength = getPolylineLength(points);
  if (totalLength <= 0.001) {
    return points[0];
  }

  const targetDistance = totalLength * Math.min(1, Math.max(0, progress));
  let consumed = 0;

  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const segmentLength = Math.hypot(end.x - start.x, end.y - start.y);

    if (consumed + segmentLength >= targetDistance) {
      const ratio = (targetDistance - consumed) / Math.max(segmentLength, 0.001);
      return {
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio,
      };
    }

    consumed += segmentLength;
  }

  return points[points.length - 1];
}

function getRoute(
  fromTable: LogicalTable,
  toTable: LogicalTable,
  laneOffset: number,
): EdgeRoute {
  const fromSide = chooseAnchorSide(fromTable, toTable);
  const toSide = chooseAnchorSide(toTable, fromTable);

  const fromAnchor = anchorPointForSide(fromTable, fromSide);
  const toAnchor = anchorPointForSide(toTable, toSide);

  const fromOuter = moveAlongSide(fromAnchor, fromSide, ROUTE_EXIT_OFFSET);
  const toOuter = moveAlongSide(toAnchor, toSide, ROUTE_EXIT_OFFSET);

  const points: Point[] = [fromAnchor, fromOuter];

  if (fromSide === "left" || fromSide === "right") {
    const midX = (fromOuter.x + toOuter.x) / 2 + laneOffset;
    points.push({ x: midX, y: fromOuter.y });
    points.push({ x: midX, y: toOuter.y });
  } else {
    const midY = (fromOuter.y + toOuter.y) / 2 + laneOffset;
    points.push({ x: fromOuter.x, y: midY });
    points.push({ x: toOuter.x, y: midY });
  }

  points.push(toOuter);
  points.push(toAnchor);

  const simplified = simplifyPoints(points);
  return {
    points: simplified,
    labelPoint: pointAlongPolyline(simplified, 0.5),
  };
}

function getColumnBadgeTokens(column: LogicalColumn): string[] {
  const tokens: string[] = [];
  if (column.isPrimaryKey) {
    tokens.push("PK");
  }
  if (column.isForeignKey) {
    tokens.push("FK");
  }
  return tokens;
}

function getTableBounds(tables: LogicalTable[]): { x: number; y: number; width: number; height: number } | null {
  if (tables.length === 0) {
    return null;
  }

  const left = Math.min(...tables.map((table) => table.x));
  const top = Math.min(...tables.map((table) => table.y));
  const right = Math.max(...tables.map((table) => table.x + table.width));
  const bottom = Math.max(...tables.map((table) => table.y + table.height));

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function getRowWorldPoint(table: LogicalTable, rowIndex: number): Point {
  return {
    x: table.x + 12,
    y: table.y + LOGICAL_TABLE_HEADER_HEIGHT + rowIndex * LOGICAL_TABLE_ROW_HEIGHT + 6,
  };
}

export function LogicalCanvas(props: LogicalCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [interaction, setInteraction] = useState<InteractionState>({ kind: "idle" });
  const [inlineEdit, setInlineEdit] = useState<InlineEditState>(null);
  const [spacePressed, setSpacePressed] = useState(false);
  const [hoverTableId, setHoverTableId] = useState<string | null>(null);

  const tableById = useMemo(() => new Map(props.model.tables.map((table) => [table.id, table])), [props.model.tables]);
  const edgeById = useMemo(() => new Map(props.model.edges.map((edge) => [edge.id, edge])), [props.model.edges]);

  const laneByEdgeId = useMemo(() => {
    const grouping = new Map<string, string[]>();

    props.model.edges.forEach((edge) => {
      const key = `${edge.fromTableId}::${edge.toTableId}`;
      const bucket = grouping.get(key) ?? [];
      bucket.push(edge.id);
      grouping.set(key, bucket);
    });

    const lanes = new Map<string, number>();
    grouping.forEach((edgeIds) => {
      edgeIds.forEach((edgeId, index) => {
        const center = (edgeIds.length - 1) / 2;
        lanes.set(edgeId, (index - center) * LANE_STEP);
      });
    });

    return lanes;
  }, [props.model.edges]);

  const routeByEdgeId = useMemo(() => {
    const routes = new Map<string, EdgeRoute>();

    props.model.edges.forEach((edge) => {
      const fromTable = tableById.get(edge.fromTableId);
      const toTable = tableById.get(edge.toTableId);
      if (!fromTable || !toTable) {
        return;
      }

      routes.set(edge.id, getRoute(fromTable, toTable, laneByEdgeId.get(edge.id) ?? 0));
    });

    return routes;
  }, [props.model.edges, tableById, laneByEdgeId]);

  const selectedTable = props.selection.tableId ? tableById.get(props.selection.tableId) : undefined;
  const selectedColumn = selectedTable?.columns.find((column) => column.id === props.selection.columnId);
  const selectedEdge = props.selection.edgeId ? edgeById.get(props.selection.edgeId) : undefined;

  const highlightedTargetTableId =
    selectedColumn?.references[0]?.targetTableId ??
    (selectedEdge ? tableById.get(selectedEdge.toTableId)?.id ?? null : null);

  const highlightedEdgeIds = useMemo(() => {
    if (props.selection.edgeId) {
      return new Set<string>([props.selection.edgeId]);
    }

    if (props.selection.columnId && selectedColumn) {
      const fkIds = new Set(selectedColumn.references.map((reference) => reference.foreignKeyId));
      return new Set(
        props.model.edges
          .filter((edge) => fkIds.has(edge.foreignKeyId))
          .map((edge) => edge.id),
      );
    }

    if (props.selection.tableId) {
      return new Set(
        props.model.edges
          .filter((edge) => edge.fromTableId === props.selection.tableId || edge.toTableId === props.selection.tableId)
          .map((edge) => edge.id),
      );
    }

    return new Set<string>();
  }, [props.selection, props.model.edges, selectedColumn]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === " ") {
        setSpacePressed(true);
      }

      if (event.key === "Escape" && inlineEdit) {
        setInlineEdit(null);
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.key === " ") {
        setSpacePressed(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [inlineEdit]);

  function getWorldPoint(event: ReactPointerEvent<HTMLElement>): Point | null {
    if (!containerRef.current) {
      return null;
    }

    const rect = containerRef.current.getBoundingClientRect();
    return worldPointFromClient(
      {
        x: event.clientX,
        y: event.clientY,
      },
      props.viewport,
      rect,
    );
  }

  function fitToContent() {
    if (!containerRef.current) {
      return;
    }

    const bounds = getTableBounds(props.model.tables);
    if (!bounds) {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const paddedWidth = bounds.width + VIEWPORT_PADDING * 2;
    const paddedHeight = bounds.height + VIEWPORT_PADDING * 2;

    const nextZoom = clampZoom(Math.min(rect.width / paddedWidth, rect.height / paddedHeight));
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    props.onViewportChange({
      zoom: nextZoom,
      x: rect.width / 2 - centerX * nextZoom,
      y: rect.height / 2 - centerY * nextZoom,
    });
  }

  useEffect(() => {
    fitToContent();
    // Intentional trigger-only effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.fitRequestToken]);

  function centerContent() {
    if (!containerRef.current) {
      return;
    }

    const bounds = getTableBounds(props.model.tables);
    if (!bounds) {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    props.onViewportChange({
      ...props.viewport,
      x: rect.width / 2 - centerX * props.viewport.zoom,
      y: rect.height / 2 - centerY * props.viewport.zoom,
    });
  }

  function zoomAroundCenter(factor: number) {
    if (!containerRef.current) {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const nextZoom = clampZoom(props.viewport.zoom * factor);

    if (Math.abs(nextZoom - props.viewport.zoom) < 0.001) {
      return;
    }

    const worldX = (centerX - props.viewport.x) / props.viewport.zoom;
    const worldY = (centerY - props.viewport.y) / props.viewport.zoom;

    props.onViewportChange({
      zoom: nextZoom,
      x: centerX - worldX * nextZoom,
      y: centerY - worldY * nextZoom,
    });
  }

  function handleCanvasWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!containerRef.current) {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const deltaScale = event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? rect.height : 1;
    const zoomFactor = Math.exp((-event.deltaY * deltaScale) / 720);
    const nextZoom = clampZoom(props.viewport.zoom * zoomFactor);

    if (Math.abs(nextZoom - props.viewport.zoom) < 0.001) {
      return;
    }

    const worldX = (localX - props.viewport.x) / props.viewport.zoom;
    const worldY = (localY - props.viewport.y) / props.viewport.zoom;

    props.onViewportChange({
      zoom: nextZoom,
      x: localX - worldX * nextZoom,
      y: localY - worldY * nextZoom,
    });
  }

  function handleBackgroundPointerDown(event: ReactPointerEvent<SVGRectElement>) {
    if (event.button !== 0 && event.button !== 1) {
      return;
    }

    if (spacePressed || event.button === 1) {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      setInteraction({
        kind: "pan",
        pointerId: event.pointerId,
        startClient: { x: event.clientX, y: event.clientY },
        startViewport: props.viewport,
      });
      return;
    }

    props.onSelectionChange({ tableId: null, columnId: null, edgeId: null });
  }

  function handleTableHeaderPointerDown(event: ReactPointerEvent<SVGGElement>, table: LogicalTable) {
    if (event.button !== 0) {
      return;
    }

    if (spacePressed) {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      setInteraction({
        kind: "pan",
        pointerId: event.pointerId,
        startClient: { x: event.clientX, y: event.clientY },
        startViewport: props.viewport,
      });
      return;
    }

    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    props.onSelectionChange({ tableId: table.id, columnId: null, edgeId: null });

    setInteraction({
      kind: "drag",
      pointerId: event.pointerId,
      tableId: table.id,
      startClient: { x: event.clientX, y: event.clientY },
      startTablePosition: { x: table.x, y: table.y },
      originalModel: props.model,
    });
  }

  function handleColumnPointerDown(
    event: ReactPointerEvent<SVGRectElement>,
    table: LogicalTable,
    column: LogicalColumn,
  ) {
    event.stopPropagation();

    const connectedEdgeId =
      column.references.length > 0
        ? props.model.edges.find((edge) => edge.foreignKeyId === column.references[0].foreignKeyId)?.id ?? null
        : null;

    props.onSelectionChange({
      tableId: table.id,
      columnId: column.id,
      edgeId: connectedEdgeId,
    });
  }

  function handleEdgePointerDown(event: ReactPointerEvent<SVGGElement>, edge: LogicalEdge) {
    event.stopPropagation();
    props.onSelectionChange({
      tableId: edge.fromTableId,
      columnId: null,
      edgeId: edge.id,
    });
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (interaction.kind === "idle") {
      return;
    }

    if (interaction.pointerId !== event.pointerId) {
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

      const nextX = Math.round(interaction.startTablePosition.x + deltaX);
      const nextY = Math.round(interaction.startTablePosition.y + deltaY);

      const nextTables = props.model.tables.map((table) => {
        if (table.id !== interaction.tableId) {
          return table;
        }

        return {
          ...table,
          x: nextX,
          y: nextY,
        };
      });

      props.onPreviewModel({
        ...props.model,
        tables: nextTables,
      });
    }
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (interaction.kind === "idle") {
      return;
    }

    if (interaction.pointerId !== event.pointerId) {
      return;
    }

    if (interaction.kind === "drag") {
      props.onCommitModel(props.model, interaction.originalModel);
    }

    setInteraction({ kind: "idle" });
  }

  function startTableInlineEdit(event: MouseEvent<SVGGElement>, table: LogicalTable) {
    event.stopPropagation();
    setInlineEdit({ kind: "table", tableId: table.id, value: table.name });
  }

  function startColumnInlineEdit(
    event: MouseEvent<SVGGElement>,
    table: LogicalTable,
    column: LogicalColumn,
  ) {
    event.stopPropagation();
    setInlineEdit({ kind: "column", tableId: table.id, columnId: column.id, value: column.name });
  }

  function commitInlineEdit() {
    if (!inlineEdit) {
      return;
    }

    const value = inlineEdit.value.trim();
    if (!value) {
      setInlineEdit(null);
      return;
    }

    if (inlineEdit.kind === "table") {
      props.onRenameTable(inlineEdit.tableId, value);
    } else {
      props.onRenameColumn(inlineEdit.tableId, inlineEdit.columnId, value);
    }

    setInlineEdit(null);
  }

  function getInlineEditorStyle() {
    if (!inlineEdit || !containerRef.current) {
      return undefined;
    }

    const rect = containerRef.current.getBoundingClientRect();

    if (inlineEdit.kind === "table") {
      const table = tableById.get(inlineEdit.tableId);
      if (!table) {
        return undefined;
      }

      const worldPoint = { x: table.x + 12, y: table.y + 8 };
      const clientPoint = clientPointFromWorld(worldPoint, props.viewport, rect);
      return {
        left: clientPoint.x - rect.left,
        top: clientPoint.y - rect.top,
        width: Math.max(180, (table.width - 24) * props.viewport.zoom),
      };
    }

    const table = tableById.get(inlineEdit.tableId);
    if (!table) {
      return undefined;
    }

    const rowIndex = table.columns.findIndex((column) => column.id === inlineEdit.columnId);
    if (rowIndex < 0) {
      return undefined;
    }

    const worldPoint = getRowWorldPoint(table, rowIndex);
    const clientPoint = clientPointFromWorld(worldPoint, props.viewport, rect);
    return {
      left: clientPoint.x - rect.left,
      top: clientPoint.y - rect.top,
      width: Math.max(160, (table.width - 24) * props.viewport.zoom),
    };
  }

  const inlineEditorStyle = getInlineEditorStyle();

  return (
    <div
      ref={containerRef}
      className="logical-canvas-panel"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleCanvasWheel}
    >
      <svg className="logical-canvas" role="img" aria-label="Canvas schema logico">
        <defs>
          <marker
            id="logical-arrow"
            markerWidth="11"
            markerHeight="11"
            refX="9"
            refY="5.5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0 0 L11 5.5 L0 11 z" fill="context-stroke" />
          </marker>
        </defs>

        <g transform={`translate(${props.viewport.x}, ${props.viewport.y}) scale(${props.viewport.zoom})`}>
          <rect
            x={-WORLD_EXTENT / 2}
            y={-WORLD_EXTENT / 2}
            width={WORLD_EXTENT}
            height={WORLD_EXTENT}
            fill="var(--diagram-canvas-fill)"
            onPointerDown={handleBackgroundPointerDown}
          />

          {props.model.edges.map((edge) => {
            const route = routeByEdgeId.get(edge.id);
            if (!route) {
              return null;
            }

            const selected = props.selection.edgeId === edge.id;
            const highlighted = selected || highlightedEdgeIds.has(edge.id);

            return (
              <g
                key={edge.id}
                className={selected ? "logical-edge selected" : highlighted ? "logical-edge highlighted" : "logical-edge"}
                onPointerDown={(event) => handleEdgePointerDown(event, edge)}
              >
                <path d={pathFromPoints(route.points)} fill="none" stroke="transparent" strokeWidth={14} />
                <path
                  d={pathFromPoints(route.points)}
                  fill="none"
                  stroke="var(--logical-edge-stroke)"
                  strokeWidth={selected ? 2.8 : highlighted ? 2.4 : 1.9}
                  markerEnd="url(#logical-arrow)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <text
                  x={route.labelPoint.x}
                  y={route.labelPoint.y - 6}
                  textAnchor="middle"
                  className="logical-edge-label"
                >
                  {edge.label}
                </text>
              </g>
            );
          })}

          {props.model.tables.map((table) => {
            const selected = props.selection.tableId === table.id;
            const highlightedTarget = highlightedTargetTableId === table.id;
            const hovering = hoverTableId === table.id;

            return (
              <g
                key={table.id}
                className={[
                  "logical-table",
                  selected ? "selected" : "",
                  highlightedTarget ? "target-highlight" : "",
                  hovering ? "hover" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onPointerEnter={() => setHoverTableId(table.id)}
                onPointerLeave={() => setHoverTableId((current) => (current === table.id ? null : current))}
                onDoubleClick={(event) => startTableInlineEdit(event, table)}
              >
                <g
                  tabIndex={0}
                  role="button"
                  aria-label={`Tabella ${table.name}`}
                  onFocus={() => props.onSelectionChange({ tableId: table.id, columnId: null, edgeId: null })}
                  onBlur={(event: ReactFocusEvent<SVGGElement>) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      setHoverTableId((current) => (current === table.id ? null : current));
                    }
                  }}
                  onPointerDown={(event) => handleTableHeaderPointerDown(event, table)}
                >
                  <rect x={table.x} y={table.y} width={table.width} height={table.height} rx={12} className="logical-table-body" />
                  <rect
                    x={table.x}
                    y={table.y}
                    width={table.width}
                    height={LOGICAL_TABLE_HEADER_HEIGHT}
                    rx={12}
                    className="logical-table-header"
                  />
                  <line
                    x1={table.x}
                    y1={table.y + LOGICAL_TABLE_HEADER_HEIGHT}
                    x2={table.x + table.width}
                    y2={table.y + LOGICAL_TABLE_HEADER_HEIGHT}
                    className="logical-table-divider"
                  />
                  <text
                    x={table.x + 12}
                    y={table.y + LOGICAL_TABLE_HEADER_HEIGHT / 2}
                    dominantBaseline="middle"
                    className="logical-table-title"
                  >
                    {table.name}
                  </text>
                </g>

                {table.columns.map((column, rowIndex) => {
                  const rowY = table.y + LOGICAL_TABLE_HEADER_HEIGHT + rowIndex * LOGICAL_TABLE_ROW_HEIGHT;
                  const badges = getColumnBadgeTokens(column);
                  const isSelectedColumn = props.selection.columnId === column.id;

                  return (
                    <g
                      key={column.id}
                      className={isSelectedColumn ? "logical-column-row selected" : "logical-column-row"}
                      onDoubleClick={(event) => startColumnInlineEdit(event, table, column)}
                    >
                      <rect
                        x={table.x + 1}
                        y={rowY}
                        width={table.width - 2}
                        height={LOGICAL_TABLE_ROW_HEIGHT}
                        className="logical-column-hit"
                        onPointerDown={(event) => handleColumnPointerDown(event, table, column)}
                      />
                      {rowIndex > 0 ? (
                        <line
                          x1={table.x + 8}
                          y1={rowY}
                          x2={table.x + table.width - 8}
                          y2={rowY}
                          className="logical-column-divider"
                        />
                      ) : null}

                      <text
                        x={table.x + 12}
                        y={rowY + LOGICAL_TABLE_ROW_HEIGHT / 2}
                        dominantBaseline="middle"
                        className="logical-column-name"
                      >
                        {column.name}
                      </text>

                      {badges.map((badge, badgeIndex) => {
                        const badgeWidth = 32;
                        const badgeGap = 6;
                        const totalWidth = badges.length * badgeWidth + Math.max(0, badges.length - 1) * badgeGap;
                        const startX = table.x + table.width - totalWidth - 10;
                        const badgeX = startX + badgeIndex * (badgeWidth + badgeGap);

                        return (
                          <g key={`${column.id}-${badge}`} className={badge === "PK" ? "logical-badge pk" : "logical-badge fk"}>
                            <rect
                              x={badgeX}
                              y={rowY + 6}
                              width={badgeWidth}
                              height={LOGICAL_TABLE_ROW_HEIGHT - 12}
                              rx={6}
                            />
                            <text
                              x={badgeX + badgeWidth / 2}
                              y={rowY + LOGICAL_TABLE_ROW_HEIGHT / 2}
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              {badge}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="canvas-viewport-hud" aria-label="Controlli viewport logico">
        <div className="canvas-hud-cluster canvas-hud-cluster-viewport">
          <button type="button" className="canvas-hud-button" onClick={() => zoomAroundCenter(1 / 1.14)}>
            -
          </button>
          <button type="button" className="canvas-hud-button canvas-hud-zoom" onClick={fitToContent}>
            {Math.round(props.viewport.zoom * 100)}%
          </button>
          <button type="button" className="canvas-hud-button" onClick={() => zoomAroundCenter(1.14)}>
            +
          </button>
          <button type="button" className="canvas-hud-button" onClick={fitToContent}>
            Adatta
          </button>
          <button type="button" className="canvas-hud-button" onClick={centerContent}>
            Centra
          </button>
        </div>
      </div>

      {inlineEdit && inlineEditorStyle ? (
        <form
          className="inline-editor"
          style={inlineEditorStyle}
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
    </div>
  );
}
