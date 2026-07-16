import type {
  AttributeNode,
  Bounds,
  DiagramDocument,
  DiagramEdge,
  EntityNode,
  Point,
  RelationshipNode,
} from "../types/diagram";
import { getMultivaluedAttributeSize } from "./diagram";
import { buildAttributeLabelBounds } from "./edgeLabelLayout";
import {
  GRID_SIZE,
  clipPointToNodePerimeter,
  getNodeCenter,
  snapValue,
} from "./geometry";

export type AttributeLayoutSide = "top" | "right" | "bottom" | "left";

export type AttributeLayoutHost = EntityNode | RelationshipNode | AttributeNode;

export interface AttributeLayoutSlot {
  side: AttributeLayoutSide;
  lane: number;
  offsetIndex: number;
  marker: Point;
}

export interface AttributeLayoutOptions {
  markerGap?: number;
  collisionPadding?: number;
  occupiedBounds?: Bounds[];
  preserveInputOrder?: boolean;
}

const ATTRIBUTE_MARKER_OFFSET_X = 10;
const ATTRIBUTE_MARKER_RADIUS = 8;
export const FIXED_ATTRIBUTE_MARKER_GAP = 28;
const DEFAULT_MARKER_GAP = FIXED_ATTRIBUTE_MARKER_GAP;
const COLLISION_PADDING = 2;
const MIN_VERTICAL_STEP = 48;
const MIN_HORIZONTAL_STEP = 72;
const HORIZONTAL_OFFSETS_PER_LANE = 12;
const MAX_PERIMETER_SLOT_CANDIDATES = 4096;

export function getAttributeMarkerCenter(attribute: AttributeNode): Point {
  return {
    x: attribute.x + ATTRIBUTE_MARKER_OFFSET_X,
    y: attribute.y + attribute.height / 2,
  };
}

export function placeAttributeMarker(
  attribute: AttributeNode,
  marker: Point,
  snapToGrid = true,
): AttributeNode {
  return {
    ...attribute,
    x: snapToGrid
      ? snapValue(marker.x - ATTRIBUTE_MARKER_OFFSET_X, GRID_SIZE)
      : marker.x - ATTRIBUTE_MARKER_OFFSET_X,
    y: snapToGrid
      ? snapValue(marker.y - attribute.height / 2, GRID_SIZE)
      : marker.y - attribute.height / 2,
  };
}

export function getDirectAttributeLayoutSide(
  host: AttributeLayoutHost,
  attribute: AttributeNode,
): AttributeLayoutSide {
  const marker = getAttributeMarkerCenter(attribute);
  if (marker.y < host.y) {
    return "top";
  }
  if (marker.y > host.y + host.height) {
    return "bottom";
  }
  if (marker.x < host.x) {
    return "left";
  }
  if (marker.x > host.x + host.width) {
    return "right";
  }

  const hostCenterX = host.x + host.width / 2;
  const hostCenterY = host.y + host.height / 2;
  const deltaX = marker.x - hostCenterX;
  const deltaY = marker.y - hostCenterY;

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return deltaX < 0 ? "left" : "right";
  }

  return deltaY < 0 ? "top" : "bottom";
}

function padBounds(bounds: Bounds, padding: number): Bounds {
  return {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
}

function buildConnectorCorridor(start: Point, end: Point, padding: number): Bounds {
  return {
    x: Math.min(start.x, end.x) - padding,
    y: Math.min(start.y, end.y) - padding,
    width: Math.abs(end.x - start.x) + padding * 2,
    height: Math.abs(end.y - start.y) + padding * 2,
  };
}

export function buildAttributeLayoutOptionsForHost(
  diagram: DiagramDocument,
  hostNode: AttributeLayoutHost,
  managedAttributeIds: string[],
): AttributeLayoutOptions {
  const managedIds = new Set(managedAttributeIds);
  const nodeById = new Map(diagram.nodes.map((node) => [node.id, node]));
  const occupiedBounds: Bounds[] = [];
  const nodePadding = 14;
  const connectorPadding = 28;

  diagram.nodes.forEach((node) => {
    if (node.id === hostNode.id) {
      return;
    }

    if (node.type === "attribute" && managedIds.has(node.id)) {
      return;
    }

    if (node.type === "entity" || node.type === "relationship" || node.type === "attribute") {
      occupiedBounds.push(padBounds(node, nodePadding));
    }
  });

  diagram.edges.forEach((edge) => {
    if (
      hostNode.type === "attribute" ||
      edge.type !== "connector" ||
      (edge.sourceId !== hostNode.id && edge.targetId !== hostNode.id)
    ) {
      return;
    }

    const otherNode = nodeById.get(edge.sourceId === hostNode.id ? edge.targetId : edge.sourceId);
    if (!otherNode) {
      return;
    }

    const otherCenter = getNodeCenter(otherNode);
    const hostEndpoint = clipPointToNodePerimeter(hostNode, otherCenter);
    const otherEndpoint = clipPointToNodePerimeter(otherNode, getNodeCenter(hostNode));
    occupiedBounds.push(buildConnectorCorridor(hostEndpoint, otherEndpoint, connectorPadding));
  });

  return {
    occupiedBounds,
    preserveInputOrder: true,
  };
}

export function findDirectHostedAttributes(
  diagram: DiagramDocument,
  hostId: string,
): AttributeNode[] {
  const nodeById = new Map(diagram.nodes.map((node) => [node.id, node]));

  return diagram.edges.flatMap((edge) => {
    if (edge.type !== "attribute") {
      return [];
    }

    const candidateId =
      edge.sourceId === hostId
        ? edge.targetId
        : edge.targetId === hostId
          ? edge.sourceId
          : undefined;
    if (!candidateId) {
      return [];
    }

    const candidateNode = nodeById.get(candidateId);
    return candidateNode?.type === "attribute" ? [candidateNode] : [];
  });
}

export interface DirectAttributeConnection {
  edge: Extract<DiagramEdge, { type: "attribute" }>;
  host: AttributeLayoutHost;
  attribute: AttributeNode;
}

export function getDirectAttributeConnection(
  diagram: DiagramDocument,
  edgeId: string,
): DirectAttributeConnection | undefined {
  const edge = diagram.edges.find(
    (candidate): candidate is Extract<DiagramEdge, { type: "attribute" }> =>
      candidate.id === edgeId && candidate.type === "attribute",
  );
  if (!edge) {
    return undefined;
  }

  const nodeById = new Map(diagram.nodes.map((node) => [node.id, node]));
  const source = nodeById.get(edge.sourceId);
  const target = nodeById.get(edge.targetId);
  if (!source || !target) {
    return undefined;
  }

  if (source.type === "attribute" && target.type === "attribute") {
    return { edge, host: target, attribute: source };
  }

  if (
    source.type === "attribute" &&
    (target.type === "entity" || target.type === "relationship")
  ) {
    return { edge, host: target, attribute: source };
  }

  if (
    target.type === "attribute" &&
    (source.type === "entity" || source.type === "relationship")
  ) {
    return { edge, host: source, attribute: target };
  }

  return undefined;
}

function unionBounds(bounds: Bounds[]): Bounds {
  const left = Math.min(...bounds.map((bound) => bound.x));
  const top = Math.min(...bounds.map((bound) => bound.y));
  const right = Math.max(...bounds.map((bound) => bound.x + bound.width));
  const bottom = Math.max(...bounds.map((bound) => bound.y + bound.height));

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function getAttributeLabelLayoutForSide(attribute: AttributeNode, side: AttributeLayoutSide) {
  const marker = getAttributeMarkerCenter(attribute);
  const cy = attribute.y + attribute.height / 2;

  if (side === "right") {
    return {
      x: attribute.x + 24,
      y: cy,
      textAnchor: "start" as const,
    };
  }
  if (side === "left") {
    return {
      x: attribute.x - 6,
      y: cy,
      textAnchor: "end" as const,
    };
  }
  if (side === "top") {
    return {
      x: marker.x,
      y: attribute.y - 8,
      textAnchor: "middle" as const,
    };
  }

  return {
    x: marker.x,
    y: attribute.y + attribute.height + 8,
    textAnchor: "middle" as const,
  };
}

export function buildAttributeLayoutBounds(
  host: AttributeLayoutHost,
  attribute: AttributeNode,
  padding = COLLISION_PADDING,
): Bounds {
  if (attribute.isMultivalued === true) {
    return padBounds(
      {
        x: attribute.x,
        y: attribute.y,
        width: attribute.width,
        height: attribute.height,
      },
      padding,
    );
  }

  const marker = getAttributeMarkerCenter(attribute);
  const side = getDirectAttributeLayoutSide(host, attribute);
  const markerBounds = padBounds(
    {
      x: marker.x - ATTRIBUTE_MARKER_RADIUS,
      y: marker.y - ATTRIBUTE_MARKER_RADIUS,
      width: ATTRIBUTE_MARKER_RADIUS * 2,
      height: ATTRIBUTE_MARKER_RADIUS * 2,
    },
    padding,
  );
  const labelBounds = buildAttributeLabelBounds(
    attribute.label,
    getAttributeLabelLayoutForSide(attribute, side),
    padding,
  );

  return unionBounds([markerBounds, labelBounds]);
}

export function buildCenterOutOffsets(count: number): number[] {
  const offsets: number[] = [];
  for (let index = 0; offsets.length < count; index += 1) {
    if (index === 0) {
      offsets.push(0);
      continue;
    }

    offsets.push(-index);
    if (offsets.length < count) {
      offsets.push(index);
    }
  }
  return offsets;
}

function getVerticalStep(attributes: AttributeNode[]): number {
  const maxHeight = attributes.reduce((max, attribute) => Math.max(max, attribute.height), 0);
  return Math.max(MIN_VERTICAL_STEP, maxHeight + 12);
}

function getHorizontalStep(
  host: AttributeLayoutHost,
  attributes: AttributeNode[],
  markerGap: number,
  collisionPadding: number,
): number {
  const sampleMarker = {
    x: host.x,
    y: host.y - markerGap,
  };
  const maxLayoutWidth = attributes.reduce((max, attribute) => {
    const positioned = placeAttributeMarker(attribute, sampleMarker, false);
    return Math.max(
      max,
      buildAttributeLayoutBounds(host, positioned, collisionPadding).width,
    );
  }, 0);

  return Math.max(
    MIN_HORIZONTAL_STEP,
    maxLayoutWidth + ATTRIBUTE_MARKER_RADIUS * 2 + collisionPadding * 2,
  );
}

function getLeftSlotMarker(
  host: AttributeLayoutHost,
  offsetIndex: number,
  markerGap: number,
  verticalStep: number,
): Point {
  return {
    x: host.x - markerGap,
    y: host.y + host.height / 2 + offsetIndex * verticalStep,
  };
}

function getBottomSlotMarker(
  host: AttributeLayoutHost,
  lane: number,
  offsetIndex: number,
  markerGap: number,
  laneGap: number,
  horizontalOffsets: number[],
): Point {
  return {
    x: host.x + (horizontalOffsets[offsetIndex] ?? host.width),
    y: host.y + host.height + markerGap + lane * laneGap,
  };
}

function getTopSlotMarker(
  host: AttributeLayoutHost,
  lane: number,
  offsetIndex: number,
  markerGap: number,
  laneGap: number,
  horizontalOffsets: number[],
): Point {
  return {
    x: host.x + (horizontalOffsets[offsetIndex] ?? host.width),
    y: host.y - markerGap - lane * laneGap,
  };
}

function buildPerimeterHorizontalOffsets(
  host: AttributeLayoutHost,
  horizontalStep: number,
  count: number,
): number[] {
  if (count <= 0) {
    return [];
  }

  return Array.from({ length: count }, (_, index) => {
    if (index === 0) {
      return 0;
    }
    if (index === 1) {
      return host.width;
    }

    const externalStep = Math.ceil((index - 1) / 2);
    return index % 2 === 0
      ? -externalStep * horizontalStep
      : host.width + externalStep * horizontalStep;
  });
}

function boundsIntersect(left: Bounds, right: Bounds): boolean {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

function isSlotAvailable(
  host: AttributeLayoutHost,
  attribute: AttributeNode,
  marker: Point,
  occupiedBounds: Bounds[],
  collisionPadding: number,
): boolean {
  if (occupiedBounds.length === 0) {
    return true;
  }

  const candidate = placeAttributeMarker(attribute, marker, false);
  const bounds = buildAttributeLayoutBounds(host, candidate, collisionPadding);
  return occupiedBounds.every((occupied) => !boundsIntersect(bounds, occupied));
}

export function buildLeftPriorityPerimeterSlots(
  host: AttributeLayoutHost,
  attributes: AttributeNode[],
  options?: AttributeLayoutOptions,
  requestedCount = attributes.length,
): AttributeLayoutSlot[] {
  const markerGap = options?.markerGap ?? DEFAULT_MARKER_GAP;
  const collisionPadding = options?.collisionPadding ?? COLLISION_PADDING;
  const verticalStep = getVerticalStep(attributes);
  const horizontalStep = getHorizontalStep(
    host,
    attributes,
    markerGap,
    collisionPadding,
  );
  const slots: AttributeLayoutSlot[] = [];
  const leftMinY = host.y;
  const leftMaxY = host.y + host.height;

  buildCenterOutOffsets(requestedCount).forEach((offsetIndex) => {
    const marker = getLeftSlotMarker(host, offsetIndex, markerGap, verticalStep);
    if (marker.y < leftMinY || marker.y > leftMaxY) {
      return;
    }

    slots.push({
      side: "left",
      lane: 0,
      offsetIndex,
      marker,
    });
  });

  const horizontalOffsets = buildPerimeterHorizontalOffsets(
    host,
    horizontalStep,
    HORIZONTAL_OFFSETS_PER_LANE,
  );
  let perimeterIndex = 0;
  while (slots.length < requestedCount) {
    const lane = Math.floor(perimeterIndex / HORIZONTAL_OFFSETS_PER_LANE);
    const offsetIndex = perimeterIndex % HORIZONTAL_OFFSETS_PER_LANE;
    slots.push({
      side: "top",
      lane,
      offsetIndex,
      marker: getTopSlotMarker(
        host,
        lane,
        offsetIndex,
        markerGap,
        verticalStep,
        horizontalOffsets,
      ),
    });
    if (slots.length >= requestedCount) {
      break;
    }
    slots.push({
      side: "bottom",
      lane,
      offsetIndex,
      marker: getBottomSlotMarker(
        host,
        lane,
        offsetIndex,
        markerGap,
        verticalStep,
        horizontalOffsets,
      ),
    });
    perimeterIndex += 1;
  }

  return slots;
}

function getSlotKey(slot: AttributeLayoutSlot): string {
  return `${slot.side}:${slot.lane}:${slot.offsetIndex}`;
}

function getOccupiedSlotKeys(
  host: AttributeLayoutHost,
  existingAttributes: AttributeNode[],
  attributesForStep: AttributeNode[],
  options?: AttributeLayoutOptions,
): Set<string> {
  const slots = buildLeftPriorityPerimeterSlots(
    host,
    attributesForStep,
    options,
    Math.max(existingAttributes.length + attributesForStep.length + 8, 16),
  );
  const occupied = new Set<string>();

  existingAttributes.forEach((attribute) => {
    const marker = getAttributeMarkerCenter(attribute);
    const slot = slots.find((candidate) => (
      Math.abs(candidate.marker.x - marker.x) <= 0.001 &&
      Math.abs(candidate.marker.y - marker.y) <= 0.001
    ));
    if (slot) {
      occupied.add(getSlotKey(slot));
    }
  });

  return occupied;
}

function findFirstAvailablePerimeterSlot(
  host: AttributeLayoutHost,
  attribute: AttributeNode,
  attributesForStep: AttributeNode[],
  occupiedBounds: Bounds[],
  occupiedSlotKeys: Set<string>,
  options?: AttributeLayoutOptions,
): AttributeLayoutSlot {
  const collisionPadding = options?.collisionPadding ?? COLLISION_PADDING;
  let candidateCount = Math.min(
    Math.max(attributesForStep.length + occupiedBounds.length + 8, 12),
    MAX_PERIMETER_SLOT_CANDIDATES,
  );

  while (candidateCount <= MAX_PERIMETER_SLOT_CANDIDATES) {
    const slots = buildLeftPriorityPerimeterSlots(host, attributesForStep, options, candidateCount);
    for (const slot of slots) {
      if (occupiedSlotKeys.has(getSlotKey(slot))) {
        continue;
      }

      const { marker } = slot;
      if (!isSlotAvailable(host, attribute, marker, occupiedBounds, collisionPadding)) {
        continue;
      }

      return slot;
    }

    if (candidateCount === MAX_PERIMETER_SLOT_CANDIDATES) {
      break;
    }
    candidateCount = Math.min(
      candidateCount * 2,
      MAX_PERIMETER_SLOT_CANDIDATES,
    );
  }

  throw new Error(`Nessuno slot perimetrale libero trovato per l'attributo "${attribute.label}".`);
}

export function buildCompactAttributeSlots(
  host: AttributeLayoutHost,
  attributes: AttributeNode[],
  options?: AttributeLayoutOptions,
): AttributeLayoutSlot[] {
  return buildLeftPriorityPerimeterSlots(host, attributes, options);
}

export function placeNewAttributeAroundHost<T extends AttributeNode>(
  host: AttributeLayoutHost,
  existingAttributes: AttributeNode[],
  newAttribute: T,
  options?: AttributeLayoutOptions,
): T {
  const attributesForStep = [...existingAttributes, newAttribute];
  const collisionPadding = options?.collisionPadding ?? COLLISION_PADDING;
  const occupiedBounds = [
    ...(options?.occupiedBounds ?? []),
    ...existingAttributes.map((attribute) =>
      buildAttributeLayoutBounds(host, attribute, collisionPadding),
    ),
  ];
  const occupiedSlotKeys = getOccupiedSlotKeys(host, existingAttributes, attributesForStep, options);
  const slot = findFirstAvailablePerimeterSlot(
    host,
    newAttribute,
    attributesForStep,
    occupiedBounds,
    occupiedSlotKeys,
    options,
  );

  return placeAttributeMarker(newAttribute, slot.marker, false) as T;
}

export function layoutIncrementallyConnectedAttribute(
  diagram: DiagramDocument,
  edgeId: string,
): DiagramDocument {
  const initialConnection = getDirectAttributeConnection(diagram, edgeId);
  if (!initialConnection) {
    return diagram;
  }

  const diagramWithUpdatedHost =
    initialConnection.host.type === "attribute" && initialConnection.host.isMultivalued !== true
      ? {
          ...diagram,
          nodes: diagram.nodes.map((node) =>
            node.id === initialConnection.host.id && node.type === "attribute"
              ? {
                  ...node,
                  ...getMultivaluedAttributeSize(node.label),
                  isMultivalued: true,
                }
              : node,
          ),
        }
      : diagram;
  const connection = getDirectAttributeConnection(diagramWithUpdatedHost, edgeId);
  if (!connection) {
    return diagramWithUpdatedHost;
  }

  const existingAttributes = findDirectHostedAttributes(
    diagramWithUpdatedHost,
    connection.host.id,
  ).filter((attribute) => attribute.id !== connection.attribute.id);
  const positioned = placeNewAttributeAroundHost(
    connection.host,
    existingAttributes,
    connection.attribute,
    buildAttributeLayoutOptionsForHost(
      diagramWithUpdatedHost,
      connection.host,
      [
        connection.attribute.id,
        ...existingAttributes.map((attribute) => attribute.id),
      ],
    ),
  );

  return {
    ...diagramWithUpdatedHost,
    nodes: diagramWithUpdatedHost.nodes.map((node) =>
      node.id === positioned.id && node.type === "attribute"
        ? { ...node, x: positioned.x, y: positioned.y }
        : node,
    ),
  };
}

export function distributeAttributesAroundHost<T extends AttributeNode>(
  host: AttributeLayoutHost,
  attributes: T[],
  options?: AttributeLayoutOptions,
): T[] {
  if (attributes.length === 0) {
    return attributes;
  }

  const layoutAttributes =
    options?.preserveInputOrder === false
      ? [...attributes].sort((left, right) => left.id.localeCompare(right.id))
      : [...attributes];
  const occupiedBounds = [...(options?.occupiedBounds ?? [])];
  const occupiedSlotKeys = new Set<string>();
  const positionedAttributes = layoutAttributes.map((attribute) => {
    const slot = findFirstAvailablePerimeterSlot(
      host,
      attribute,
      layoutAttributes,
      occupiedBounds,
      occupiedSlotKeys,
      options,
    );
    const positioned = placeAttributeMarker(attribute, slot.marker, false) as T;
    occupiedSlotKeys.add(getSlotKey(slot));
    occupiedBounds.push(
      buildAttributeLayoutBounds(
        host,
        positioned,
        options?.collisionPadding ?? COLLISION_PADDING,
      ),
    );
    return positioned;
  });
  const positionedById = new Map<string, AttributeNode>(
    positionedAttributes.map((attribute) => [attribute.id, attribute]),
  );

  return attributes.map((attribute) => (positionedById.get(attribute.id) ?? attribute) as T);
}
