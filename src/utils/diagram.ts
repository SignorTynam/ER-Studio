import type {
  DiagramDocument,
  DiagramEdge,
  DiagramNode,
  EdgeKind,
  EntityRelationshipParticipation,
  InternalIdentifier,
  IsaCompleteness,
  IsaDisjointness,
  NodeKind,
  Point,
  SelectionState,
  ValidationIssue,
} from "../types/diagram";
import { GRID_SIZE, getNodeBounds, snapPoint, snapValue } from "./geometry";
import {
  getAttributeCardinalityOwner,
  getConnectorParticipation,
  getConnectorParticipationContext,
  isSupportedCardinality,
  normalizeSupportedCardinality,
} from "./cardinality";

const MULTIVALUED_ATTRIBUTE_MIN_WIDTH = 100;
const MULTIVALUED_ATTRIBUTE_MAX_WIDTH = 320;
const MULTIVALUED_ATTRIBUTE_HEIGHT = 52;
const MULTIVALUED_ATTRIBUTE_HORIZONTAL_PADDING = 46;
const MULTIVALUED_ATTRIBUTE_CHAR_WIDTH = 8;

type RelationshipNode = Extract<DiagramNode, { type: "relationship" }>;
type AttributeNode = Extract<DiagramNode, { type: "attribute" }>;
type EntityNode = Extract<DiagramNode, { type: "entity" }>;
type ConnectorEdge = Extract<DiagramEdge, { type: "connector" }>;

const CURRENT_DIAGRAM_VERSION = 2;

export interface ExternalIdentifierValidationResult {
  valid: boolean;
  relationshipId: string;
  relationshipLabel: string;
  sourceEntityId?: string;
  sourceEntityLabel?: string;
  targetEntityId?: string;
  targetEntityLabel?: string;
  reason?: string;
  message?: string;
}

export interface ExternalIdentifierInvalidation {
  relationshipId: string;
  relationshipLabel: string;
  sourceEntityId?: string;
  sourceEntityLabel?: string;
  targetEntityId?: string;
  targetEntityLabel?: string;
  reason: string;
  message: string;
}

export interface NodeNameIdentitySyncResult {
  diagram: DiagramDocument;
  nodeIdMap: Map<string, string>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getMultivaluedAttributeSize(label: string): { width: number; height: number } {
  const normalizedLabel = label.trim();
  const estimatedTextWidth = normalizedLabel.length * MULTIVALUED_ATTRIBUTE_CHAR_WIDTH;
  const paddedWidth = estimatedTextWidth + MULTIVALUED_ATTRIBUTE_HORIZONTAL_PADDING;
  const width = clamp(
    snapValue(paddedWidth, 10),
    MULTIVALUED_ATTRIBUTE_MIN_WIDTH,
    MULTIVALUED_ATTRIBUTE_MAX_WIDTH,
  );

  return {
    width,
    height: MULTIVALUED_ATTRIBUTE_HEIGHT,
  };
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 11)}`;
}

function sanitizeEntityRelationshipParticipations(
  rawParticipations: unknown,
): EntityRelationshipParticipation[] | undefined {
  const parsedParticipations: EntityRelationshipParticipation[] = [];
  if (Array.isArray(rawParticipations)) {
    rawParticipations.forEach((participation) => {
      if (typeof participation !== "object" || participation === null) {
        return;
      }

      const rawParticipation = participation as {
        id?: unknown;
        relationshipId?: unknown;
        cardinality?: unknown;
      };
      if (
        typeof rawParticipation.relationshipId !== "string" ||
        rawParticipation.relationshipId.trim().length === 0
      ) {
        return;
      }

      parsedParticipations.push({
        id:
          typeof rawParticipation.id === "string" && rawParticipation.id.trim().length > 0
            ? rawParticipation.id
            : createId("participation"),
        relationshipId: rawParticipation.relationshipId,
        ...(typeof rawParticipation.cardinality === "string"
          ? { cardinality: normalizeSupportedCardinality(rawParticipation.cardinality) }
          : {}),
      });
    });
  }

  return parsedParticipations.length > 0 ? parsedParticipations : undefined;
}

function areEntityRelationshipParticipationsEqual(
  left: EntityRelationshipParticipation[] | undefined,
  right: EntityRelationshipParticipation[] | undefined,
): boolean {
  const leftList = left ?? [];
  const rightList = right ?? [];

  if (leftList.length !== rightList.length) {
    return false;
  }

  return leftList.every((participation, index) => {
    const other = rightList[index];
    return (
      other !== undefined &&
      other.id === participation.id &&
      other.relationshipId === participation.relationshipId &&
      other.cardinality === participation.cardinality
    );
  });
}

const NODE_ID_PREFIX_BY_TYPE: Record<NodeKind, string> = {
  entity: "entity",
  relationship: "relationship",
  attribute: "attribute",
  text: "text",
};

const NODE_LABEL_PREFIX_BY_TYPE: Record<NodeKind, string> = {
  entity: "ENTITA",
  relationship: "RELAZIONE",
  attribute: "ATTRIBUTO",
  text: "TESTO",
};

const EDGE_ID_PREFIX_BY_TYPE: Record<EdgeKind, string> = {
  connector: "connector",
  attribute: "attributeLink",
  inheritance: "inheritance",
};

const EDGE_LABEL_PREFIX_BY_TYPE: Partial<Record<EdgeKind, string>> = {
  connector: "COLLEGAMENTO",
  attribute: "COLLEGAMENTO_ATTRIBUTO",
};

function normalizeNodeNameKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeNodeNameCandidate(value: string | undefined, nodeType: NodeKind): string {
  const normalized = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (normalized.length > 0) {
    return normalized;
  }

  return NODE_LABEL_PREFIX_BY_TYPE[nodeType];
}

function createUniqueNodeName(baseName: string, usedNames: Set<string>): string {
  const normalizedBase = baseName.trim().replace(/\s+/g, " ");
  const fallback = normalizedBase.length > 0 ? normalizedBase : "ELEMENTO";
  const fallbackKey = normalizeNodeNameKey(fallback);

  if (!usedNames.has(fallbackKey)) {
    usedNames.add(fallbackKey);
    return fallback;
  }

  let suffix = 2;
  while (true) {
    const candidate = `${fallback}_${suffix}`;
    const candidateKey = normalizeNodeNameKey(candidate);
    if (!usedNames.has(candidateKey)) {
      usedNames.add(candidateKey);
      return candidate;
    }
    suffix += 1;
  }
}

function remapNodeReference(nodeIdMap: Map<string, string>, nodeId: string | undefined): string | undefined {
  if (typeof nodeId !== "string") {
    return undefined;
  }

  return nodeIdMap.get(nodeId) ?? nodeId;
}

function remapNodeScopedMetadata(node: DiagramNode, nodeIdMap: Map<string, string>): DiagramNode {
  if (node.type === "entity") {
    const nextInternalIdentifiers =
      Array.isArray(node.internalIdentifiers) && node.internalIdentifiers.length > 0
        ? node.internalIdentifiers.map((identifier) => ({
            ...identifier,
            attributeIds: identifier.attributeIds.map((attributeId) => nodeIdMap.get(attributeId) ?? attributeId),
          }))
        : undefined;
    const nextParticipations =
      Array.isArray(node.relationshipParticipations) && node.relationshipParticipations.length > 0
        ? node.relationshipParticipations.map((participation) => ({
            ...participation,
            relationshipId: nodeIdMap.get(participation.relationshipId) ?? participation.relationshipId,
          }))
        : undefined;

    if (
      areEntityRelationshipParticipationsEqual(node.relationshipParticipations, nextParticipations) &&
      areInternalIdentifierListsEqual(node.internalIdentifiers, nextInternalIdentifiers)
    ) {
      return node;
    }

    return {
      ...node,
      internalIdentifiers: nextInternalIdentifiers,
      relationshipParticipations: nextParticipations,
    };
  }

  if (node.type === "relationship") {
    return {
      ...node,
      externalIdentifierSourceAttributeId: remapNodeReference(nodeIdMap, node.externalIdentifierSourceAttributeId),
      externalIdentifierTargetEntityId: remapNodeReference(nodeIdMap, node.externalIdentifierTargetEntityId),
      externalIdentifierTargetAttributeId: remapNodeReference(nodeIdMap, node.externalIdentifierTargetAttributeId),
    };
  }

  return node;
}

export function synchronizeNodeNameIdentity(
  diagram: DiagramDocument,
  preferredNamesByNodeId?: Record<string, string>,
): NodeNameIdentitySyncResult {
  const usedNames = new Set<string>();
  const fullNodeIdMap = new Map<string, string>();

  diagram.nodes.forEach((node) => {
    const preferredName = preferredNamesByNodeId?.[node.id] ?? node.label ?? node.id;
    const normalizedPreferredName = normalizeNodeNameCandidate(preferredName, node.type);
    const uniqueName = createUniqueNodeName(normalizedPreferredName, usedNames);
    fullNodeIdMap.set(node.id, uniqueName);
  });

  const nodeIdMap = new Map<string, string>();
  fullNodeIdMap.forEach((nextId, previousId) => {
    if (nextId !== previousId) {
      nodeIdMap.set(previousId, nextId);
    }
  });

  const nextNodes = diagram.nodes.map((node) => {
    const nextNodeId = fullNodeIdMap.get(node.id) ?? node.id;
    const nextNode = {
      ...node,
      id: nextNodeId,
      label: nextNodeId,
    } as DiagramNode;
    return remapNodeScopedMetadata(nextNode, fullNodeIdMap);
  });

  const nextEdges = diagram.edges.map((edge) => ({
    ...edge,
    sourceId: fullNodeIdMap.get(edge.sourceId) ?? edge.sourceId,
    targetId: fullNodeIdMap.get(edge.targetId) ?? edge.targetId,
  }));

  return {
    diagram: {
      ...diagram,
      nodes: nextNodes,
      edges: nextEdges,
    },
    nodeIdMap,
  };
}

export function renameNodeAsNameIdentity(
  diagram: DiagramDocument,
  nodeId: string,
  nextName: string,
): NodeNameIdentitySyncResult {
  return synchronizeNodeNameIdentity(diagram, { [nodeId]: nextName });
}

function parseTrailingIndex(value: string, prefix: string): number | null {
  const normalizedValue = value.trim().toLowerCase();
  const normalizedPrefix = prefix.trim().toLowerCase();
  if (!normalizedValue.startsWith(normalizedPrefix)) {
    return null;
  }

  const suffix = normalizedValue.slice(normalizedPrefix.length);
  if (!/^\d+$/.test(suffix)) {
    return null;
  }

  const parsed = Number.parseInt(suffix, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getNextNodeIndex(diagram: DiagramDocument, nodeType: NodeKind): number {
  const idPrefix = NODE_ID_PREFIX_BY_TYPE[nodeType];
  const labelPrefix = NODE_LABEL_PREFIX_BY_TYPE[nodeType];
  let maxIndex = 0;

  for (const node of diagram.nodes) {
    if (node.type !== nodeType) {
      continue;
    }

    const idIndex = parseTrailingIndex(node.id, idPrefix);
    if (idIndex !== null) {
      maxIndex = Math.max(maxIndex, idIndex);
    }

    const labelIndex = parseTrailingIndex(node.label, labelPrefix);
    if (labelIndex !== null) {
      maxIndex = Math.max(maxIndex, labelIndex);
    }
  }

  return maxIndex + 1;
}

function createDefaultNodeIdentity(
  nodeType: NodeKind,
  diagram: DiagramDocument,
): { id: string; label: string } {
  const nextIndex = getNextNodeIndex(diagram, nodeType);
  const labelPrefix = NODE_LABEL_PREFIX_BY_TYPE[nodeType];
  const name = `${labelPrefix}${nextIndex}`;

  return {
    id: name,
    label: name,
  };
}

function getNextEdgeIndex(diagram: DiagramDocument, edgeType: EdgeKind): number {
  const idPrefix = EDGE_ID_PREFIX_BY_TYPE[edgeType];
  const labelPrefix = EDGE_LABEL_PREFIX_BY_TYPE[edgeType];
  let maxIndex = 0;

  for (const edge of diagram.edges) {
    if (edge.type !== edgeType) {
      continue;
    }

    const idIndex = parseTrailingIndex(edge.id, idPrefix);
    if (idIndex !== null) {
      maxIndex = Math.max(maxIndex, idIndex);
    }

    if (labelPrefix) {
      const labelIndex = parseTrailingIndex(edge.label, labelPrefix);
      if (labelIndex !== null) {
        maxIndex = Math.max(maxIndex, labelIndex);
      }
    }
  }

  return maxIndex + 1;
}

function createDefaultEdgeIdentity(
  edgeType: EdgeKind,
  diagram: DiagramDocument,
): { id: string; label: string } {
  const nextIndex = getNextEdgeIndex(diagram, edgeType);
  const idPrefix = EDGE_ID_PREFIX_BY_TYPE[edgeType];
  const labelPrefix = EDGE_LABEL_PREFIX_BY_TYPE[edgeType];

  return {
    id: `${idPrefix}${nextIndex}`,
    label: labelPrefix ? `${labelPrefix}${nextIndex}` : "",
  };
}

function getNodeSize(nodeType: NodeKind) {
  switch (nodeType) {
    case "entity":
      return { width: 140, height: 64 };
    case "relationship":
      return { width: 130, height: 78 };
    case "attribute":
      return { width: 150, height: 28 };
    case "text":
      return { width: 140, height: 24 };
    default:
      return { width: 120, height: 48 };
  }
}

export function createEmptyDiagram(name = "Diagramma ER"): DiagramDocument {
  return {
    meta: {
      name,
      version: CURRENT_DIAGRAM_VERSION,
    },
    nodes: [],
    edges: [],
  };
}

export function createNode(
  nodeType: NodeKind,
  position: Point,
  diagram: DiagramDocument,
): DiagramNode {
  const size = getNodeSize(nodeType);
  const snappedCenter = snapPoint(position);
  const x = snapValue(snappedCenter.x - size.width / 2, GRID_SIZE);
  const y = snapValue(snappedCenter.y - size.height / 2, GRID_SIZE);
  const defaultIdentity = createDefaultNodeIdentity(nodeType, diagram);

  if (nodeType === "attribute") {
    return {
      id: defaultIdentity.id,
      type: nodeType,
      label: defaultIdentity.label,
      x,
      y,
      width: size.width,
      height: size.height,
      isIdentifier: false,
      isCompositeInternal: false,
      isMultivalued: false,
      cardinality: undefined,
    };
  }

  if (nodeType === "entity") {
    return {
      id: defaultIdentity.id,
      type: nodeType,
      label: defaultIdentity.label,
      x,
      y,
      width: size.width,
      height: size.height,
      isWeak: false,
      internalIdentifiers: [],
      relationshipParticipations: [],
    };
  }

  return {
    id: defaultIdentity.id,
    type: nodeType,
    label: defaultIdentity.label,
    x,
    y,
    width: size.width,
    height: size.height,
  } as DiagramNode;
}

export function createEdge(
  edgeType: EdgeKind,
  sourceId: string,
  targetId: string,
  diagram: DiagramDocument,
): DiagramEdge {
  const defaultIdentity = createDefaultEdgeIdentity(edgeType, diagram);

  if (edgeType === "connector") {
    return {
      id: defaultIdentity.id,
      type: edgeType,
      sourceId,
      targetId,
      label: defaultIdentity.label,
      lineStyle: "solid",
    };
  }

  return {
    id: defaultIdentity.id,
    type: edgeType,
    sourceId,
    targetId,
    label: defaultIdentity.label,
    lineStyle: "solid",
  } as DiagramEdge;
}

export function synchronizeEntityRelationshipParticipations(diagram: DiagramDocument): DiagramDocument {
  const nodeMap = new Map(diagram.nodes.map((node) => [node.id, node]));
  const existingByEntityId = new Map(
    diagram.nodes
      .filter((node): node is EntityNode => node.type === "entity")
      .map((entity) => [entity.id, entity.relationshipParticipations ?? []]),
  );
  const usedParticipationIdsByEntityId = new Map<string, Set<string>>();
  const nextParticipationsByEntityId = new Map<string, EntityRelationshipParticipation[]>();
  let edgeChanged = false;

  const nextEdges = diagram.edges.map((edge) => {
    if (edge.type !== "connector") {
      return edge;
    }

    const sourceNode = nodeMap.get(edge.sourceId);
    const targetNode = nodeMap.get(edge.targetId);
    const context = getConnectorParticipationContext(sourceNode, targetNode);
    if (!context) {
      if (edge.participationId === undefined) {
        return edge;
      }

      edgeChanged = true;
      return {
        ...edge,
        participationId: undefined,
      };
    }

    const entityParticipations = existingByEntityId.get(context.entity.id) ?? [];
    const usedParticipationIds = usedParticipationIdsByEntityId.get(context.entity.id) ?? new Set<string>();
    usedParticipationIdsByEntityId.set(context.entity.id, usedParticipationIds);

    let participation =
      typeof edge.participationId === "string" && edge.participationId.trim().length > 0
        ? entityParticipations.find(
            (candidate) =>
              candidate.id === edge.participationId &&
              candidate.relationshipId === context.relationship.id &&
              !usedParticipationIds.has(candidate.id),
          )
        : undefined;

    if (!participation) {
      participation = entityParticipations.find(
        (candidate) =>
          candidate.relationshipId === context.relationship.id && !usedParticipationIds.has(candidate.id),
      );
    }

    const nextParticipation =
      participation ??
      ({
        id:
          typeof edge.participationId === "string" && edge.participationId.trim().length > 0
            ? edge.participationId
            : createId("participation"),
        relationshipId: context.relationship.id,
        cardinality: undefined,
      } satisfies EntityRelationshipParticipation);
    usedParticipationIds.add(nextParticipation.id);

    const nextEntityParticipations = nextParticipationsByEntityId.get(context.entity.id) ?? [];
    nextEntityParticipations.push({
      ...nextParticipation,
      relationshipId: context.relationship.id,
    });
    nextParticipationsByEntityId.set(context.entity.id, nextEntityParticipations);

    if (edge.participationId === nextParticipation.id) {
      return edge;
    }

    edgeChanged = true;
    return {
      ...edge,
      participationId: nextParticipation.id,
    };
  });

  let nodeChanged = false;
  const nextNodes = diagram.nodes.map((node) => {
    if (node.type !== "entity") {
      return node;
    }

    const nextParticipations = nextParticipationsByEntityId.get(node.id);
    if (areEntityRelationshipParticipationsEqual(node.relationshipParticipations, nextParticipations)) {
      return node;
    }

    nodeChanged = true;
    return {
      ...node,
      relationshipParticipations: nextParticipations && nextParticipations.length > 0 ? nextParticipations : undefined,
    };
  });

  return nodeChanged || edgeChanged
    ? {
        ...diagram,
        nodes: nextNodes,
        edges: nextEdges,
      }
    : diagram;
}

export function findNode(diagram: DiagramDocument, nodeId: string): DiagramNode | undefined {
  return diagram.nodes.find((node) => node.id === nodeId);
}

export function canConnect(
  edgeType: EdgeKind,
  sourceNode: DiagramNode,
  targetNode: DiagramNode,
): boolean {
  if (sourceNode.id === targetNode.id) {
    return false;
  }

  if (edgeType === "attribute") {
    const oneIsAttribute =
      sourceNode.type === "attribute" || targetNode.type === "attribute";
    const otherIsAttachable =
      sourceNode.type === "entity" ||
      sourceNode.type === "attribute" ||
      sourceNode.type === "relationship" ||
      targetNode.type === "entity" ||
      targetNode.type === "attribute" ||
      targetNode.type === "relationship";
    return oneIsAttribute && otherIsAttachable;
  }

  if (edgeType === "inheritance") {
    return sourceNode.type === "entity" && targetNode.type === "entity";
  }

  return (
    (sourceNode.type === "entity" && targetNode.type === "relationship") ||
    (sourceNode.type === "relationship" && targetNode.type === "entity")
  );
}

export function edgeAlreadyExists(
  diagram: DiagramDocument,
  edgeType: EdgeKind,
  sourceId: string,
  targetId: string,
): boolean {
  // In Chen notation it can be useful to model more than one connector
  // between the same entity and relationship pair.
  if (edgeType === "connector") {
    return false;
  }

  return diagram.edges.some((edge) => {
    if (edge.type !== edgeType) {
      return false;
    }

    if (edgeType === "inheritance") {
      return edge.sourceId === sourceId && edge.targetId === targetId;
    }

    return (
      (edge.sourceId === sourceId && edge.targetId === targetId) ||
      (edge.sourceId === targetId && edge.targetId === sourceId)
    );
  });
}

function getDuplicateEdgeSignature(edge: DiagramEdge): string | null {
  if (edge.type === "connector") {
    return null;
  }

  if (edge.type === "inheritance") {
    return `${edge.type}:${edge.sourceId}->${edge.targetId}`;
  }

  const [firstId, secondId] = [edge.sourceId, edge.targetId].sort();
  return `${edge.type}:${firstId}<->${secondId}`;
}

function resolveAttributeOwnership(
  edge: DiagramEdge,
  nodeMap: Map<string, DiagramNode>,
): { hostId: string; childId: string } | null {
  if (edge.type !== "attribute") {
    return null;
  }

  const sourceNode = nodeMap.get(edge.sourceId);
  const targetNode = nodeMap.get(edge.targetId);
  if (!sourceNode || !targetNode) {
    return null;
  }

  if (sourceNode.type === "attribute" && targetNode.type !== "attribute") {
    return { hostId: targetNode.id, childId: sourceNode.id };
  }

  if (targetNode.type === "attribute" && sourceNode.type !== "attribute") {
    return { hostId: sourceNode.id, childId: targetNode.id };
  }

  if (sourceNode.type === "attribute" && targetNode.type === "attribute") {
    if (sourceNode.isMultivalued === true && targetNode.isMultivalued !== true) {
      return { hostId: sourceNode.id, childId: targetNode.id };
    }

    if (targetNode.isMultivalued === true && sourceNode.isMultivalued !== true) {
      return { hostId: targetNode.id, childId: sourceNode.id };
    }

    return { hostId: targetNode.id, childId: sourceNode.id };
  }

  return null;
}

function getAttributeChildrenByHostId(
  diagram: DiagramDocument,
  nodeMap: Map<string, DiagramNode>,
): Map<string, string[]> {
  const attributeChildrenByHostId = new Map<string, string[]>();

  diagram.edges.forEach((edge) => {
    const ownership = resolveAttributeOwnership(edge, nodeMap);
    if (!ownership) {
      return;
    }

    const children = attributeChildrenByHostId.get(ownership.hostId) ?? [];
    if (!children.includes(ownership.childId)) {
      children.push(ownership.childId);
      attributeChildrenByHostId.set(ownership.hostId, children);
    }
  });

  return attributeChildrenByHostId;
}

function getDirectAttributeIdsByEntityId(
  diagram: DiagramDocument,
  nodeMap: Map<string, DiagramNode>,
): Map<string, Set<string>> {
  const directAttributeIdsByEntityId = new Map<string, Set<string>>();

  diagram.edges.forEach((edge) => {
    if (edge.type !== "attribute") {
      return;
    }

    const sourceNode = nodeMap.get(edge.sourceId);
    const targetNode = nodeMap.get(edge.targetId);

    if (sourceNode?.type === "entity" && targetNode?.type === "attribute") {
      const ids = directAttributeIdsByEntityId.get(sourceNode.id) ?? new Set<string>();
      ids.add(targetNode.id);
      directAttributeIdsByEntityId.set(sourceNode.id, ids);
      return;
    }

    if (targetNode?.type === "entity" && sourceNode?.type === "attribute") {
      const ids = directAttributeIdsByEntityId.get(targetNode.id) ?? new Set<string>();
      ids.add(sourceNode.id);
      directAttributeIdsByEntityId.set(targetNode.id, ids);
    }
  });

  return directAttributeIdsByEntityId;
}

function normalizeInternalIdentifierSet(
  entity: EntityNode,
  directAttributes: AttributeNode[],
): InternalIdentifier[] {
  const eligibleAttributeIds = new Set(
    directAttributes
      .filter((attribute) => attribute.isMultivalued !== true)
      .map((attribute) => attribute.id),
  );
  const usedAttributeIds = new Set<string>();
  const normalizedIdentifiers: InternalIdentifier[] = [];
  const rawIdentifiers = Array.isArray(entity.internalIdentifiers) ? entity.internalIdentifiers : [];

  rawIdentifiers.forEach((identifier) => {
    const identifierId =
      typeof identifier.id === "string" && identifier.id.trim().length > 0
        ? identifier.id
        : createId("internalIdentifier");

    const normalizedAttributeIds = (Array.isArray(identifier.attributeIds) ? identifier.attributeIds : [])
      .filter((attributeId): attributeId is string => typeof attributeId === "string" && attributeId.length > 0)
      .filter((attributeId, index, source) => source.indexOf(attributeId) === index)
      .filter((attributeId) => eligibleAttributeIds.has(attributeId))
      .filter((attributeId) => {
        if (usedAttributeIds.has(attributeId)) {
          return false;
        }

        usedAttributeIds.add(attributeId);
        return true;
      });

    if (normalizedAttributeIds.length > 0) {
      normalizedIdentifiers.push({
        id: identifierId,
        attributeIds: normalizedAttributeIds,
      });
    }
  });

  // Backward compatibility: simple identifiers toggled from legacy controls
  // should appear in entity.internalIdentifiers as one-attribute entries.
  directAttributes
    .filter((attribute) => attribute.isIdentifier === true && attribute.isMultivalued !== true)
    .forEach((attribute) => {
      if (usedAttributeIds.has(attribute.id)) {
        return;
      }

      usedAttributeIds.add(attribute.id);
      normalizedIdentifiers.push({
        id: `internalIdentifier-simple-${attribute.id}`,
        attributeIds: [attribute.id],
      });
    });

  // Backward compatibility: legacy composite marker on attributes becomes
  // one composite internal identifier if no explicit identifiers claim them.
  const legacyCompositeAttributeIds = directAttributes
    .filter(
      (attribute) =>
        attribute.isCompositeInternal === true &&
        attribute.isMultivalued !== true &&
        !usedAttributeIds.has(attribute.id),
    )
    .map((attribute) => attribute.id);

  if (legacyCompositeAttributeIds.length > 0) {
    legacyCompositeAttributeIds.forEach((attributeId) => usedAttributeIds.add(attributeId));
    normalizedIdentifiers.push({
      id: `internalIdentifier-composite-${entity.id}`,
      attributeIds: legacyCompositeAttributeIds,
    });
  }

  return normalizedIdentifiers;
}

function areInternalIdentifierListsEqual(
  left: InternalIdentifier[] | undefined,
  right: InternalIdentifier[] | undefined,
): boolean {
  const leftList = left ?? [];
  const rightList = right ?? [];

  if (leftList.length !== rightList.length) {
    return false;
  }

  for (let index = 0; index < leftList.length; index += 1) {
    const leftIdentifier = leftList[index];
    const rightIdentifier = rightList[index];
    if (
      leftIdentifier.id !== rightIdentifier.id ||
      leftIdentifier.attributeIds.length !== rightIdentifier.attributeIds.length
    ) {
      return false;
    }

    for (let attributeIndex = 0; attributeIndex < leftIdentifier.attributeIds.length; attributeIndex += 1) {
      if (leftIdentifier.attributeIds[attributeIndex] !== rightIdentifier.attributeIds[attributeIndex]) {
        return false;
      }
    }
  }

  return true;
}

export function synchronizeInternalIdentifiers(diagram: DiagramDocument): DiagramDocument {
  const nodeMap = new Map(diagram.nodes.map((node) => [node.id, node]));
  const directAttributeIdsByEntityId = getDirectAttributeIdsByEntityId(diagram, nodeMap);
  const normalizedByEntityId = new Map<string, InternalIdentifier[]>();
  const simpleMemberAttributeIds = new Set<string>();
  const compositeMemberAttributeIds = new Set<string>();

  diagram.nodes.forEach((node) => {
    if (node.type !== "entity") {
      return;
    }

    const directAttributes = Array.from(directAttributeIdsByEntityId.get(node.id) ?? [])
      .map((attributeId) => nodeMap.get(attributeId))
      .filter((candidate): candidate is AttributeNode => candidate?.type === "attribute");
    const normalizedIdentifiers = normalizeInternalIdentifierSet(node, directAttributes);

    normalizedByEntityId.set(node.id, normalizedIdentifiers);
    normalizedIdentifiers.forEach((identifier) => {
      if (identifier.attributeIds.length === 1) {
        simpleMemberAttributeIds.add(identifier.attributeIds[0]);
        return;
      }

      identifier.attributeIds.forEach((attributeId) => compositeMemberAttributeIds.add(attributeId));
    });
  });

  let changed = false;
  const nextNodes = diagram.nodes.map((node) => {
    if (node.type === "entity") {
      const normalizedIdentifiers = normalizedByEntityId.get(node.id) ?? [];
      const nextIdentifiers = normalizedIdentifiers.length > 0 ? normalizedIdentifiers : undefined;
      if (areInternalIdentifierListsEqual(node.internalIdentifiers, nextIdentifiers)) {
        return node;
      }

      changed = true;
      return {
        ...node,
        internalIdentifiers: nextIdentifiers,
      };
    }

    if (node.type === "attribute") {
      const nextIsIdentifier = simpleMemberAttributeIds.has(node.id);
      const nextIsCompositeInternal = compositeMemberAttributeIds.has(node.id);
      const nextCardinality =
        nextIsIdentifier || nextIsCompositeInternal ? undefined : node.cardinality;
      if (
        node.isIdentifier === nextIsIdentifier &&
        node.isCompositeInternal === nextIsCompositeInternal &&
        node.cardinality === nextCardinality
      ) {
        return node;
      }

      changed = true;
      return {
        ...node,
        isIdentifier: nextIsIdentifier,
        isCompositeInternal: nextIsCompositeInternal,
        cardinality: nextCardinality,
      };
    }

    return node;
  });

  return changed
    ? {
        ...diagram,
        nodes: nextNodes,
      }
    : diagram;
}

export function removeSelection(
  diagram: DiagramDocument,
  selection: SelectionState,
): DiagramDocument {
  const selectedNodeIds = new Set(selection.nodeIds);
  const selectedEdgeIds = new Set(selection.edgeIds);

  if (selectedNodeIds.size > 0) {
    const nodeMap = new Map(diagram.nodes.map((node) => [node.id, node]));
    const attributeChildrenByHostId = getAttributeChildrenByHostId(diagram, nodeMap);
    const queue = Array.from(selectedNodeIds);
    const processedHosts = new Set<string>();

    while (queue.length > 0) {
      const hostId = queue.shift() as string;
      if (processedHosts.has(hostId)) {
        continue;
      }
      processedHosts.add(hostId);

      const hostNode = nodeMap.get(hostId);
      const canOwnAttributes =
        hostNode?.type === "entity" ||
        hostNode?.type === "relationship" ||
        hostNode?.type === "attribute";
      if (!canOwnAttributes) {
        continue;
      }

      const childIds = attributeChildrenByHostId.get(hostId) ?? [];
      childIds.forEach((childId) => {
        const childNode = nodeMap.get(childId);
        if (childNode?.type !== "attribute" || selectedNodeIds.has(childId)) {
          return;
        }

        selectedNodeIds.add(childId);
        queue.push(childId);
      });
    }
  }

  return {
    ...diagram,
    nodes: diagram.nodes.filter((node) => !selectedNodeIds.has(node.id)),
    edges: diagram.edges.filter(
      (edge) =>
        !selectedEdgeIds.has(edge.id) &&
        !selectedNodeIds.has(edge.sourceId) &&
        !selectedNodeIds.has(edge.targetId),
    ),
  };
}

export function duplicateSelection(
  diagram: DiagramDocument,
  selection: SelectionState,
): { diagram: DiagramDocument; selection: SelectionState } | null {
  const selectedNodes = diagram.nodes.filter((node) => selection.nodeIds.includes(node.id));

  if (selectedNodes.length === 0) {
    return null;
  }

  const idMap = new Map<string, string>();
  const usedNodeNames = new Set(diagram.nodes.map((node) => normalizeNodeNameKey(node.id)));
  const duplicatedNodes = selectedNodes.map((node) => {
    const baseName = normalizeNodeNameCandidate(node.id, node.type);
    const duplicateId = createUniqueNodeName(baseName, usedNodeNames);
    idMap.set(node.id, duplicateId);

    return {
      ...node,
      id: duplicateId,
      label: duplicateId,
      x: snapValue(node.x + GRID_SIZE * 2),
      y: snapValue(node.y + GRID_SIZE * 2),
    };
  });

  const duplicatedNodesWithIdentifiers = duplicatedNodes.map((node) => {
    if (node.type !== "entity" || !Array.isArray(node.internalIdentifiers)) {
      return node;
    }

    const remappedIdentifiers = node.internalIdentifiers
      .map((identifier) => {
        const remappedAttributeIds = identifier.attributeIds
          .map((attributeId) => idMap.get(attributeId))
          .filter((candidate): candidate is string => typeof candidate === "string");

        if (remappedAttributeIds.length === 0) {
          return null;
        }

        return {
          id: createId("internalIdentifier"),
          attributeIds: remappedAttributeIds,
        };
      })
      .filter((identifier): identifier is InternalIdentifier => identifier !== null);

    return {
      ...node,
      internalIdentifiers: remappedIdentifiers.length > 0 ? remappedIdentifiers : undefined,
    };
  });

  const duplicatedEdges = diagram.edges
    .filter((edge) => idMap.has(edge.sourceId) && idMap.has(edge.targetId))
    .map((edge) => ({
      ...edge,
      id: createId(edge.type),
      sourceId: idMap.get(edge.sourceId) as string,
      targetId: idMap.get(edge.targetId) as string,
    }));

  return {
    diagram: {
      ...diagram,
      nodes: [...diagram.nodes, ...duplicatedNodesWithIdentifiers],
      edges: [...diagram.edges, ...duplicatedEdges],
    },
    selection: {
      nodeIds: duplicatedNodesWithIdentifiers.map((node) => node.id),
      edgeIds: duplicatedEdges.map((edge) => edge.id),
    },
  };
}

export function alignNodes(
  diagram: DiagramDocument,
  nodeIds: string[],
  axis: "left" | "center" | "top" | "middle",
): DiagramDocument {
  const selectedNodes = diagram.nodes.filter((node) => nodeIds.includes(node.id));

  if (selectedNodes.length < 2) {
    return diagram;
  }

  const minX = Math.min(...selectedNodes.map((node) => node.x));
  const minY = Math.min(...selectedNodes.map((node) => node.y));
  const centerX =
    selectedNodes.reduce((sum, node) => sum + node.x + node.width / 2, 0) /
    selectedNodes.length;
  const centerY =
    selectedNodes.reduce((sum, node) => sum + node.y + node.height / 2, 0) /
    selectedNodes.length;

  return {
    ...diagram,
    nodes: diagram.nodes.map((node) => {
      if (!nodeIds.includes(node.id)) {
        return node;
      }

      if (axis === "left") {
        return { ...node, x: snapValue(minX) };
      }

      if (axis === "top") {
        return { ...node, y: snapValue(minY) };
      }

      if (axis === "center") {
        return { ...node, x: snapValue(centerX - node.width / 2) };
      }

      return { ...node, y: snapValue(centerY - node.height / 2) };
    }),
  };
}

export function expandNodeIdsForMove(diagram: DiagramDocument, nodeIds: string[]): string[] {
  if (nodeIds.length === 0) {
    return [];
  }

  const nodeMap = new Map(diagram.nodes.map((node) => [node.id, node]));
  const attributeChildrenByHostId = getAttributeChildrenByHostId(diagram, nodeMap);

  const expanded = new Set(nodeIds);
  const queue: string[] = [];
  const processedHosts = new Set<string>();

  nodeIds.forEach((nodeId) => {
    const node = nodeMap.get(nodeId);
    if (
      node?.type === "entity" ||
      node?.type === "relationship" ||
      (node?.type === "attribute" && node.isMultivalued === true)
    ) {
      queue.push(nodeId);
    }
  });

  while (queue.length > 0) {
    const hostId = queue.shift() as string;
    if (processedHosts.has(hostId)) {
      continue;
    }
    processedHosts.add(hostId);

    const childIds = attributeChildrenByHostId.get(hostId) ?? [];
    childIds.forEach((otherId) => {
      const otherNode = nodeMap.get(otherId);
      if (otherNode?.type !== "attribute") {
        return;
      }

      if (!expanded.has(otherId)) {
        expanded.add(otherId);
      }

      if (!processedHosts.has(otherId)) {
        queue.push(otherId);
      }
    });
  }

  return Array.from(expanded);
}

export function serializeDiagram(diagram: DiagramDocument): string {
  const normalizedDiagram = synchronizeNodeNameIdentity(synchronizeEntityRelationshipParticipations(diagram)).diagram;
  const serializedNodes = normalizedDiagram.nodes.map((node) => {
    const { label: _unusedLabel, ...nodeWithoutLabel } = node as DiagramNode & { label: string };
    return nodeWithoutLabel;
  });

  return JSON.stringify(
    {
      ...normalizedDiagram,
      meta: {
        ...normalizedDiagram.meta,
        version: CURRENT_DIAGRAM_VERSION,
      },
      nodes: serializedNodes,
    },
    null,
    2,
  );
}

function isNodeKind(value: string): value is NodeKind {
  return ["entity", "relationship", "attribute", "text"].includes(value);
}

function isEdgeKind(value: string): value is EdgeKind {
  return ["connector", "attribute", "inheritance"].includes(value);
}

function isIsaDisjointness(value: string | undefined): value is IsaDisjointness {
  return value === "disjoint" || value === "overlap";
}

function isIsaCompleteness(value: string | undefined): value is IsaCompleteness {
  return value === "total" || value === "partial";
}

function normalizeCardinality(value: string | undefined): string {
  if (!value) {
    return "";
  }

  return value
    .replace(/\s+/g, "")
    .replace(/[()]/g, "")
    .replace(":", ",");
}

function relationshipHasExternalIdentifierMetadata(node: RelationshipNode): boolean {
  return (
    node.isExternalIdentifier === true ||
    node.externalIdentifierMode !== undefined ||
    node.externalIdentifierSourceAttributeId !== undefined ||
    node.externalIdentifierTargetEntityId !== undefined ||
    node.externalIdentifierTargetAttributeId !== undefined ||
    node.externalIdentifierOffset !== undefined ||
    node.externalIdentifierMarkerOffsetX !== undefined ||
    node.externalIdentifierMarkerOffsetY !== undefined
  );
}

function clearExternalIdentifierMetadata(node: RelationshipNode): RelationshipNode {
  return {
    ...node,
    isExternalIdentifier: false,
    externalIdentifierMode: undefined,
    externalIdentifierSourceAttributeId: undefined,
    externalIdentifierTargetEntityId: undefined,
    externalIdentifierTargetAttributeId: undefined,
    externalIdentifierOffset: undefined,
    externalIdentifierMarkerOffsetX: undefined,
    externalIdentifierMarkerOffsetY: undefined,
  };
}

function buildExternalIdentifierInvalidationMessage(
  relationshipLabel: string,
  sourceEntityLabel: string | undefined,
  reason: string,
): string {
  const target = sourceEntityLabel ? ` su "${sourceEntityLabel}"` : "";
  return `L'identificatore esterno${target} collegato alla relazione "${relationshipLabel}" non e piu valido perche ${reason}.`;
}

function findEntityHostForAttribute(diagram: DiagramDocument, attributeId: string): EntityNode | undefined {
  const nodeMap = new Map(diagram.nodes.map((node) => [node.id, node]));
  const visited = new Set<string>();
  let currentAttributeId = attributeId;

  while (!visited.has(currentAttributeId)) {
    visited.add(currentAttributeId);
    const connectedAttributeEdges = diagram.edges.filter(
      (edge) =>
        edge.type === "attribute" &&
        (edge.sourceId === currentAttributeId || edge.targetId === currentAttributeId),
    );
    if (connectedAttributeEdges.length === 0) {
      return undefined;
    }

    const edgeWithNonAttributeHost = connectedAttributeEdges.find((edge) => {
      const hostId = edge.sourceId === currentAttributeId ? edge.targetId : edge.sourceId;
      const hostNode = nodeMap.get(hostId);
      return hostNode?.type !== "attribute";
    });
    const chosenEdge = edgeWithNonAttributeHost ?? connectedAttributeEdges[0];
    if (!chosenEdge) {
      return undefined;
    }

    const hostId = chosenEdge.sourceId === currentAttributeId ? chosenEdge.targetId : chosenEdge.sourceId;
    const hostNode = nodeMap.get(hostId);
    if (!hostNode) {
      return undefined;
    }

    if (hostNode.type === "entity") {
      return hostNode;
    }

    if (hostNode.type !== "attribute") {
      return undefined;
    }

    currentAttributeId = hostNode.id;
  }

  return undefined;
}

function entityHasIdentifierContribution(diagram: DiagramDocument, entityId: string): boolean {
  const identifierAttributes = diagram.nodes.filter(
    (node): node is AttributeNode =>
      node.type === "attribute" &&
      (node.isIdentifier === true || node.isCompositeInternal === true),
  );

  return identifierAttributes.some((attribute) => findEntityHostForAttribute(diagram, attribute.id)?.id === entityId);
}

function normalizeRelationshipExternalIdentifierParticipants(
  diagram: DiagramDocument,
  relationshipId: string,
): Array<{ edge: ConnectorEdge; entity: EntityNode }> {
  const nodeMap = new Map(diagram.nodes.map((node) => [node.id, node]));
  return diagram.edges
    .filter(
      (edge): edge is ConnectorEdge =>
        edge.type === "connector" && (edge.sourceId === relationshipId || edge.targetId === relationshipId),
    )
    .map((edge) => {
      const entityId = edge.sourceId === relationshipId ? edge.targetId : edge.sourceId;
      const entityNode = nodeMap.get(entityId);
      return entityNode?.type === "entity" ? { edge, entity: entityNode } : null;
    })
    .filter((candidate): candidate is { edge: ConnectorEdge; entity: EntityNode } => candidate !== null);
}

export function validateExternalIdentifier(
  diagram: DiagramDocument,
  relationship: RelationshipNode,
): ExternalIdentifierValidationResult {
  const baseResult: ExternalIdentifierValidationResult = {
    valid: true,
    relationshipId: relationship.id,
    relationshipLabel: relationship.label,
  };

  if (relationship.isExternalIdentifier !== true) {
    return baseResult;
  }

  const nodeMap = new Map(diagram.nodes.map((node) => [node.id, node]));
  const fail = (
    reason: string,
    context?: Pick<
      ExternalIdentifierValidationResult,
      "sourceEntityId" | "sourceEntityLabel" | "targetEntityId" | "targetEntityLabel"
    >,
  ): ExternalIdentifierValidationResult => ({
    ...baseResult,
    ...context,
    valid: false,
    reason,
    message: buildExternalIdentifierInvalidationMessage(
      relationship.label,
      context?.targetEntityLabel ?? context?.sourceEntityLabel,
      reason,
    ),
  });

  if (!relationship.externalIdentifierSourceAttributeId) {
    return fail("manca il riferimento all'attributo identificatore sorgente");
  }

  const sourceAttribute = nodeMap.get(relationship.externalIdentifierSourceAttributeId);
  if (!sourceAttribute || sourceAttribute.type !== "attribute") {
    return fail("l'attributo identificatore sorgente e stato rimosso");
  }

  if (sourceAttribute.isIdentifier !== true) {
    return fail(`l'attributo sorgente "${sourceAttribute.label}" non e piu marcato come identificatore`);
  }

  const sourceEntity = findEntityHostForAttribute(diagram, sourceAttribute.id);
  if (!sourceEntity) {
    return fail(`l'attributo sorgente "${sourceAttribute.label}" non e piu collegato a un'entita`);
  }

  if (!relationship.externalIdentifierTargetEntityId) {
    return fail("manca il riferimento all'entita dipendente target", {
      sourceEntityId: sourceEntity.id,
      sourceEntityLabel: sourceEntity.label,
    });
  }

  const targetEntity = nodeMap.get(relationship.externalIdentifierTargetEntityId);
  if (!targetEntity || targetEntity.type !== "entity") {
    return fail("l'entita dipendente target e stata rimossa", {
      sourceEntityId: sourceEntity.id,
      sourceEntityLabel: sourceEntity.label,
    });
  }

  if (sourceEntity.id === targetEntity.id) {
    return fail("origine e destinazione coincidono sulla stessa entita", {
      sourceEntityId: sourceEntity.id,
      sourceEntityLabel: sourceEntity.label,
      targetEntityId: targetEntity.id,
      targetEntityLabel: targetEntity.label,
    });
  }

  const participants = normalizeRelationshipExternalIdentifierParticipants(diagram, relationship.id);
  const participantByEntityId = new Map(participants.map((participant) => [participant.entity.id, participant]));
  const distinctParticipantIds = new Set(participants.map((participant) => participant.entity.id));
  if (
    distinctParticipantIds.size !== 2 ||
    !participantByEntityId.has(sourceEntity.id) ||
    !participantByEntityId.has(targetEntity.id)
  ) {
    return fail(
      `la relazione non collega piu in modo coerente "${sourceEntity.label}" e "${targetEntity.label}"`,
      {
        sourceEntityId: sourceEntity.id,
        sourceEntityLabel: sourceEntity.label,
        targetEntityId: targetEntity.id,
        targetEntityLabel: targetEntity.label,
      },
    );
  }

  const dependentConnector = participantByEntityId.get(targetEntity.id);
  const dependentCardinality = normalizeCardinality(
    dependentConnector
      ? getConnectorParticipation(
          dependentConnector.edge,
          nodeMap.get(dependentConnector.edge.sourceId),
          nodeMap.get(dependentConnector.edge.targetId),
        )?.cardinality
      : undefined,
  );
  if (dependentCardinality !== "1,1") {
    return fail(`la cardinalita sul lato dipendente "${targetEntity.label}" non e piu (1,1)`, {
      sourceEntityId: sourceEntity.id,
      sourceEntityLabel: sourceEntity.label,
      targetEntityId: targetEntity.id,
      targetEntityLabel: targetEntity.label,
    });
  }

  if (!entityHasIdentifierContribution(diagram, sourceEntity.id)) {
    return fail(
      `l'entita "${sourceEntity.label}" non fornisce piu un contributo identificante attivo`,
      {
        sourceEntityId: sourceEntity.id,
        sourceEntityLabel: sourceEntity.label,
        targetEntityId: targetEntity.id,
        targetEntityLabel: targetEntity.label,
      },
    );
  }

  if (relationship.externalIdentifierMode === "composite") {
    if (!relationship.externalIdentifierTargetAttributeId) {
      return fail("manca il riferimento all'attributo target della composizione", {
        sourceEntityId: sourceEntity.id,
        sourceEntityLabel: sourceEntity.label,
        targetEntityId: targetEntity.id,
        targetEntityLabel: targetEntity.label,
      });
    }

    const targetAttribute = nodeMap.get(relationship.externalIdentifierTargetAttributeId);
    if (!targetAttribute || targetAttribute.type !== "attribute") {
      return fail("l'attributo target della composizione e stato rimosso", {
        sourceEntityId: sourceEntity.id,
        sourceEntityLabel: sourceEntity.label,
        targetEntityId: targetEntity.id,
        targetEntityLabel: targetEntity.label,
      });
    }

    const targetAttributeHost = findEntityHostForAttribute(diagram, targetAttribute.id);
    if (!targetAttributeHost || targetAttributeHost.id !== targetEntity.id) {
      return fail(
        `l'attributo target "${targetAttribute.label}" non appartiene piu a "${targetEntity.label}"`,
        {
          sourceEntityId: sourceEntity.id,
          sourceEntityLabel: sourceEntity.label,
          targetEntityId: targetEntity.id,
          targetEntityLabel: targetEntity.label,
        },
      );
    }
  }

  return {
    ...baseResult,
    sourceEntityId: sourceEntity.id,
    sourceEntityLabel: sourceEntity.label,
    targetEntityId: targetEntity.id,
    targetEntityLabel: targetEntity.label,
  };
}

export function isExternalIdentifierStillValid(diagram: DiagramDocument, relationshipId: string): boolean {
  const relationshipNode = diagram.nodes.find(
    (node): node is RelationshipNode => node.id === relationshipId && node.type === "relationship",
  );
  if (!relationshipNode || relationshipNode.isExternalIdentifier !== true) {
    return false;
  }

  return validateExternalIdentifier(diagram, relationshipNode).valid;
}

export function revalidateExternalIdentifiers(
  diagram: DiagramDocument,
): { diagram: DiagramDocument; invalidations: ExternalIdentifierInvalidation[] } {
  const invalidations: ExternalIdentifierInvalidation[] = [];
  let changed = false;

  const nextNodes = diagram.nodes.map((node) => {
    if (node.type !== "relationship") {
      return node;
    }

    if (node.isExternalIdentifier === true) {
      const validation = validateExternalIdentifier(diagram, node);
      if (validation.valid) {
        return node;
      }

      changed = true;
      invalidations.push({
        relationshipId: node.id,
        relationshipLabel: node.label,
        sourceEntityId: validation.sourceEntityId,
        sourceEntityLabel: validation.sourceEntityLabel,
        targetEntityId: validation.targetEntityId,
        targetEntityLabel: validation.targetEntityLabel,
        reason: validation.reason ?? "la dipendenza identificante non e piu soddisfatta",
        message:
          validation.message ??
          buildExternalIdentifierInvalidationMessage(
            node.label,
            validation.targetEntityLabel ?? validation.sourceEntityLabel,
            validation.reason ?? "la dipendenza identificante non e piu soddisfatta",
          ),
      });
      return clearExternalIdentifierMetadata(node);
    }

    if (relationshipHasExternalIdentifierMetadata(node)) {
      changed = true;
      return clearExternalIdentifierMetadata(node);
    }

    return node;
  });

  if (!changed) {
    return { diagram, invalidations };
  }

  return {
    diagram: {
      ...diagram,
      nodes: nextNodes,
    },
    invalidations,
  };
}

function migrateLegacyEdgeCardinalities(
  diagram: DiagramDocument,
  legacyCardinalityByEdgeId: Map<string, string | undefined>,
): DiagramDocument {
  if (legacyCardinalityByEdgeId.size === 0) {
    return diagram;
  }

  const nextNodeById = new Map(diagram.nodes.map((node) => [node.id, node]));
  let nodeChanged = false;
  let edgeChanged = false;

  const nextEdges = diagram.edges.map((edge) => {
    const legacyCardinality = normalizeSupportedCardinality(legacyCardinalityByEdgeId.get(edge.id));
    if (!legacyCardinality) {
      return edge;
    }

    const sourceNode = nextNodeById.get(edge.sourceId);
    const targetNode = nextNodeById.get(edge.targetId);

    if (edge.type === "attribute") {
      const attributeNode = getAttributeCardinalityOwner(sourceNode, targetNode);
      if (attributeNode && attributeNode.cardinality === undefined) {
        const nextAttributeNode = {
          ...attributeNode,
          cardinality: legacyCardinality,
        };
        nextNodeById.set(attributeNode.id, nextAttributeNode);
        nodeChanged = true;
      }

      return edge;
    }

    if (edge.type !== "connector") {
      return edge;
    }

    const context = getConnectorParticipationContext(sourceNode, targetNode);
    if (!context) {
      return edge;
    }

    const currentEntity = nextNodeById.get(context.entity.id);
    if (currentEntity?.type !== "entity") {
      return edge;
    }

    const currentParticipations = currentEntity.relationshipParticipations ?? [];
    const matchingParticipation =
      typeof edge.participationId === "string" && edge.participationId.trim().length > 0
        ? currentParticipations.find(
            (participation) =>
              participation.id === edge.participationId &&
              participation.relationshipId === context.relationship.id,
          )
        : undefined;

    if (matchingParticipation) {
      if (matchingParticipation.cardinality === undefined) {
        nextNodeById.set(context.entity.id, {
          ...currentEntity,
          relationshipParticipations: currentParticipations.map((participation) =>
            participation.id === matchingParticipation.id
              ? {
                  ...participation,
                  cardinality: legacyCardinality,
                }
              : participation,
          ),
        });
        nodeChanged = true;
      }

      if (edge.participationId === matchingParticipation.id) {
        return edge;
      }

      edgeChanged = true;
      return {
        ...edge,
        participationId: matchingParticipation.id,
      };
    }

    const nextParticipationId =
      typeof edge.participationId === "string" && edge.participationId.trim().length > 0
        ? edge.participationId
        : createId("participation");
    nextNodeById.set(context.entity.id, {
      ...currentEntity,
      relationshipParticipations: [
        ...currentParticipations,
        {
          id: nextParticipationId,
          relationshipId: context.relationship.id,
          cardinality: legacyCardinality,
        },
      ],
    });
    nodeChanged = true;

    if (edge.participationId === nextParticipationId) {
      return edge;
    }

    edgeChanged = true;
    return {
      ...edge,
      participationId: nextParticipationId,
    };
  });

  if (!nodeChanged && !edgeChanged) {
    return diagram;
  }

  return {
    ...diagram,
    nodes: diagram.nodes.map((node) => nextNodeById.get(node.id) ?? node),
    edges: nextEdges,
  };
}

export function parseDiagram(rawJson: string): DiagramDocument {
  const parsed = JSON.parse(rawJson) as Partial<DiagramDocument>;
  const meta = parsed.meta ?? { name: "Diagramma importato", version: CURRENT_DIAGRAM_VERSION };
  const nodes = Array.isArray(parsed.nodes)
    ? parsed.nodes
        .filter(
          (node): node is DiagramNode =>
            typeof node === "object" &&
            node !== null &&
            typeof node.id === "string" &&
            (typeof node.label === "string" || node.label === undefined) &&
            typeof node.x === "number" &&
            typeof node.y === "number" &&
            typeof node.width === "number" &&
            typeof node.height === "number" &&
            typeof node.type === "string" &&
            isNodeKind(node.type),
        )
        .map((node) => {
          const nodeLabel = typeof node.label === "string" ? node.label : node.id;
          if (node.type === "attribute") {
            const isMultivalued = node.isMultivalued === true;
            const multivaluedSize = getMultivaluedAttributeSize(nodeLabel);
            return {
              ...node,
              label: nodeLabel,
              isIdentifier: node.isIdentifier === true,
              isCompositeInternal: node.isCompositeInternal === true,
              isMultivalued,
              cardinality:
                typeof node.cardinality === "string" ? normalizeSupportedCardinality(node.cardinality) : undefined,
              width: isMultivalued
                ? multivaluedSize.width
                : node.width,
              height: isMultivalued
                ? multivaluedSize.height
                : node.height,
            };
          }

          if (node.type === "entity") {
            const rawInternalIdentifiers = (node as { internalIdentifiers?: unknown }).internalIdentifiers;
            const parsedInternalIdentifiers = Array.isArray(rawInternalIdentifiers)
              ? rawInternalIdentifiers
                  .map((identifier) => {
                    if (typeof identifier !== "object" || identifier === null) {
                      return null;
                    }

                    const rawIdentifier = identifier as {
                      id?: unknown;
                      attributeIds?: unknown;
                    };
                    const identifierId =
                      typeof rawIdentifier.id === "string" && rawIdentifier.id.trim().length > 0
                        ? rawIdentifier.id
                        : createId("internalIdentifier");
                    const attributeIds = Array.isArray(rawIdentifier.attributeIds)
                      ? rawIdentifier.attributeIds.filter(
                          (attributeId): attributeId is string =>
                            typeof attributeId === "string" && attributeId.trim().length > 0,
                        )
                      : [];

                    if (attributeIds.length === 0) {
                      return null;
                    }

                    return {
                      id: identifierId,
                      attributeIds,
                    };
                  })
                  .filter((identifier): identifier is InternalIdentifier => identifier !== null)
              : [];

            return {
              ...node,
              label: nodeLabel,
              isWeak: node.isWeak === true,
              internalIdentifiers:
                parsedInternalIdentifiers.length > 0 ? parsedInternalIdentifiers : undefined,
              relationshipParticipations: sanitizeEntityRelationshipParticipations(
                (node as { relationshipParticipations?: unknown }).relationshipParticipations,
              ),
            };
          }

          if (node.type === "relationship") {
            return {
              ...node,
              label: nodeLabel,
              isExternalIdentifier: node.isExternalIdentifier === true,
              externalIdentifierMode:
                node.externalIdentifierMode === "entity" || node.externalIdentifierMode === "composite"
                  ? node.externalIdentifierMode
                  : undefined,
              externalIdentifierSourceAttributeId:
                typeof node.externalIdentifierSourceAttributeId === "string"
                  ? node.externalIdentifierSourceAttributeId
                  : undefined,
              externalIdentifierTargetEntityId:
                typeof node.externalIdentifierTargetEntityId === "string"
                  ? node.externalIdentifierTargetEntityId
                  : undefined,
              externalIdentifierTargetAttributeId:
                typeof node.externalIdentifierTargetAttributeId === "string"
                  ? node.externalIdentifierTargetAttributeId
                  : undefined,
              externalIdentifierOffset:
                typeof node.externalIdentifierOffset === "number" && Number.isFinite(node.externalIdentifierOffset)
                  ? node.externalIdentifierOffset
                  : undefined,
              externalIdentifierMarkerOffsetX:
                typeof node.externalIdentifierMarkerOffsetX === "number" && Number.isFinite(node.externalIdentifierMarkerOffsetX)
                  ? node.externalIdentifierMarkerOffsetX
                  : undefined,
              externalIdentifierMarkerOffsetY:
                typeof node.externalIdentifierMarkerOffsetY === "number" && Number.isFinite(node.externalIdentifierMarkerOffsetY)
                  ? node.externalIdentifierMarkerOffsetY
                  : undefined,
            };
          }

          return {
            ...node,
            label: nodeLabel,
          };
        })
    : [];
  const legacyCardinalityByEdgeId = new Map<string, string | undefined>();
  const edges = Array.isArray(parsed.edges)
    ? parsed.edges.filter(
        (edge): edge is DiagramEdge =>
          typeof edge === "object" &&
          edge !== null &&
          typeof edge.id === "string" &&
          typeof edge.sourceId === "string" &&
          typeof edge.targetId === "string" &&
          typeof edge.label === "string" &&
          typeof edge.type === "string" &&
          typeof edge.lineStyle === "string" &&
            isEdgeKind(edge.type),
      )
        .map((edge) => {
          const rawEdge = edge as DiagramEdge & {
            cardinality?: unknown;
            participationId?: unknown;
            isaDisjointness?: string;
            isaCompleteness?: string;
          };
          legacyCardinalityByEdgeId.set(
            edge.id,
            typeof rawEdge.cardinality === "string" ? rawEdge.cardinality : undefined,
          );

          if (edge.type === "inheritance") {
            return {
              ...edge,
              isaDisjointness: isIsaDisjointness(rawEdge.isaDisjointness)
                ? rawEdge.isaDisjointness
                : undefined,
              isaCompleteness: isIsaCompleteness(rawEdge.isaCompleteness)
                ? rawEdge.isaCompleteness
                : undefined,
            };
          }

          if (edge.type === "connector") {
            return {
              ...edge,
              participationId:
                typeof rawEdge.participationId === "string" && rawEdge.participationId.trim().length > 0
                  ? rawEdge.participationId
                  : undefined,
            };
          }

          return {
            ...edge,
          };
        })
    : [];

  const parsedDiagram: DiagramDocument = {
    meta: {
      name: meta.name ?? "Diagramma importato",
      version: CURRENT_DIAGRAM_VERSION,
    },
    nodes,
    edges,
  };

  const migratedDiagram = migrateLegacyEdgeCardinalities(parsedDiagram, legacyCardinalityByEdgeId);
  const synchronizedParticipations = synchronizeEntityRelationshipParticipations(migratedDiagram);
  const nodeNameIdentitySynchronized = synchronizeNodeNameIdentity(synchronizedParticipations).diagram;
  const synchronizedDiagram = synchronizeInternalIdentifiers(
    synchronizeEntityRelationshipParticipations(nodeNameIdentitySynchronized),
  );
  return revalidateExternalIdentifiers(synchronizedDiagram).diagram;
}

export function validateDiagram(diagram: DiagramDocument): ValidationIssue[] {
  diagram = synchronizeInternalIdentifiers(diagram);
  const issues: ValidationIssue[] = [];
  const edgesByNode = new Map<string, DiagramEdge[]>();
  const nodeMap = new Map(diagram.nodes.map((node) => [node.id, node]));
  const duplicateEdgeOwners = new Map<string, DiagramEdge>();

  diagram.edges.forEach((edge) => {
    const sourceList = edgesByNode.get(edge.sourceId) ?? [];
    const targetList = edgesByNode.get(edge.targetId) ?? [];
    sourceList.push(edge);
    targetList.push(edge);
    edgesByNode.set(edge.sourceId, sourceList);
    edgesByNode.set(edge.targetId, targetList);
  });

  diagram.nodes.forEach((node) => {
    const connectedEdges = edgesByNode.get(node.id) ?? [];

    if (node.type === "attribute") {
      if (
        node.isMultivalued === true &&
        (node.isIdentifier === true || node.isCompositeInternal === true)
      ) {
        issues.push({
          id: `attribute-conflict-${node.id}`,
          level: "error",
          message: `L'attributo "${node.label}" non e valido perche e segnato come multivalore e identificatore insieme; per risolvere lascia attiva una sola modalita.`,
          targetId: node.id,
          targetType: "node",
        });
      }

      const hasHost = connectedEdges.some((edge) => edge.type === "attribute");
      if (!hasHost) {
        issues.push({
          id: `attribute-${node.id}`,
          level: "warning",
          message: `L'attributo "${node.label}" non è collegato a un'entità, una relazione o un attributo padre.`,
          targetId: node.id,
          targetType: "node",
        });
      }
    }

    if (node.type === "relationship") {
      const connectors = connectedEdges.filter((edge) => edge.type === "connector");
      const compatibleEntityIds = new Set(
        connectors
          .map((edge) => (edge.sourceId === node.id ? edge.targetId : edge.sourceId))
          .filter((otherId) => {
            const otherNode = nodeMap.get(otherId);
            return otherNode?.type === "entity";
          }),
      );

      if (compatibleEntityIds.size < 2) {
        issues.push({
          id: `relationship-${node.id}`,
          level: "warning",
          message: `La relazione "${node.label}" dovrebbe collegare almeno due entità compatibili.`,
          targetId: node.id,
          targetType: "node",
        });
      }

      const relationshipIdentifierAttributes = connectedEdges
        .filter((edge) => edge.type === "attribute")
        .map((edge) => (edge.sourceId === node.id ? edge.targetId : edge.sourceId))
        .map((attributeId) => nodeMap.get(attributeId))
        .filter((candidate): candidate is DiagramNode => candidate !== undefined)
        .filter(
          (candidate) =>
            candidate.type === "attribute" &&
            (candidate.isIdentifier === true || candidate.isCompositeInternal === true),
        );

      if (relationshipIdentifierAttributes.length > 0) {
        issues.push({
          id: `relationship-identifier-${node.id}`,
          level: "error",
          message: `La relazione "${node.label}" non e valida perche contiene attributi identificatori; per risolvere rimuovi il flag identificatore dagli attributi collegati.`,
          targetId: node.id,
          targetType: "node",
        });
      }

      if (node.isExternalIdentifier === true) {
        const externalValidation = validateExternalIdentifier(diagram, node);
        if (!externalValidation.valid) {
          issues.push({
            id: `external-id-invalid-${node.id}`,
            level: "warning",
            message:
              externalValidation.message ??
              `L'identificatore esterno su "${node.label}" non e valido: controlla i legami identificanti.`,
            targetId: node.id,
            targetType: "node",
          });
        }
      }
    }

    if (node.type === "entity") {
      const hasRelationshipConnection = connectedEdges.some((edge) => {
        if (edge.type !== "connector") {
          return false;
        }

        const otherId = edge.sourceId === node.id ? edge.targetId : edge.sourceId;
        const otherNode = nodeMap.get(otherId);
        return otherNode?.type === "relationship";
      });

      const hasInheritanceConnection = connectedEdges.some((edge) => edge.type === "inheritance");
      const hasEntityConnection = hasRelationshipConnection || hasInheritanceConnection;

      if (!hasEntityConnection) {
        issues.push({
          id: `entity-disconnected-${node.id}`,
          level: "warning",
          message: `L'entita "${node.label}" non e collegata ad altre entita o relazioni.`,
          targetId: node.id,
          targetType: "node",
        });
      }

      const hasAttribute = connectedEdges.some((edge) => {
        if (edge.type !== "attribute") {
          return false;
        }

        const otherId = edge.sourceId === node.id ? edge.targetId : edge.sourceId;
        const otherNode = nodeMap.get(otherId);
        return otherNode?.type === "attribute";
      });
      const hasExternalIdentifierRelationship = diagram.nodes.some(
        (candidate) =>
          candidate.type === "relationship" &&
          candidate.isExternalIdentifier === true &&
          candidate.externalIdentifierTargetEntityId === node.id &&
          typeof candidate.externalIdentifierSourceAttributeId === "string",
      );

      if (!hasAttribute && !hasExternalIdentifierRelationship) {
        issues.push({
          id: `entity-no-attributes-${node.id}`,
          level: "warning",
          message: `L'entita "${node.label}" non ha attributi collegati.`,
          targetId: node.id,
          targetType: "node",
        });
      }

      if (node.isWeak === true && !hasExternalIdentifierRelationship) {
        issues.push({
          id: `weak-entity-${node.id}`,
          level: "warning",
          message: `L'entita debole "${node.label}" non e collegata ad alcun identificatore esterno.`,
          targetId: node.id,
          targetType: "node",
        });
      }
      const directAttributes = connectedEdges
        .filter((edge) => edge.type === "attribute")
        .map((edge) => (edge.sourceId === node.id ? edge.targetId : edge.sourceId))
        .map((attributeId) => nodeMap.get(attributeId))
        .filter((candidate): candidate is AttributeNode => candidate?.type === "attribute");
      const directAttributeById = new Map(directAttributes.map((attribute) => [attribute.id, attribute]));
      const attributeOwnerByIdentifier = new Map<string, string>();
      const internalIdentifiers = node.internalIdentifiers ?? [];

      internalIdentifiers.forEach((identifier, index) => {
        const identifierLabel = identifier.id || `identificatore-${index + 1}`;
        const seenInIdentifier = new Set<string>();

        if (identifier.attributeIds.length === 0) {
          issues.push({
            id: `internal-identifier-empty-${node.id}-${index}`,
            level: "warning",
            message: `L'entita "${node.label}" contiene un identificatore interno vuoto.`,
            targetId: node.id,
            targetType: "node",
          });
          return;
        }

        identifier.attributeIds.forEach((attributeId) => {
          if (seenInIdentifier.has(attributeId)) {
            issues.push({
              id: `internal-identifier-duplicate-attribute-${node.id}-${identifierLabel}-${attributeId}`,
              level: "warning",
              message: `L'identificatore interno "${identifierLabel}" su "${node.label}" contiene piu volte lo stesso attributo.`,
              targetId: node.id,
              targetType: "node",
            });
            return;
          }

          seenInIdentifier.add(attributeId);
          const attributeNode = directAttributeById.get(attributeId);
          if (!attributeNode) {
            issues.push({
              id: `internal-identifier-invalid-attribute-${node.id}-${identifierLabel}-${attributeId}`,
              level: "error",
              message: `L'identificatore interno "${identifierLabel}" su "${node.label}" riferisce un attributo non valido o non diretto.`,
              targetId: node.id,
              targetType: "node",
            });
            return;
          }

          if (attributeNode.isMultivalued === true) {
            issues.push({
              id: `internal-identifier-multivalued-${node.id}-${identifierLabel}-${attributeId}`,
              level: "error",
              message: `L'attributo "${attributeNode.label}" e multivalore e non puo far parte di un identificatore interno.`,
              targetId: node.id,
              targetType: "node",
            });
          }

          if (identifier.attributeIds.length > 1 && attributeNode.isIdentifier === true) {
            issues.push({
              id: `internal-identifier-primary-conflict-${node.id}-${identifierLabel}-${attributeId}`,
              level: "error",
              message: `L'attributo "${attributeNode.label}" e gia identificatore semplice e non puo essere riusato negli identificatori interni.`,
              targetId: node.id,
              targetType: "node",
            });
          }

          const owner = attributeOwnerByIdentifier.get(attributeId);
          if (owner && owner !== identifierLabel) {
            issues.push({
              id: `internal-identifier-overlap-${node.id}-${attributeId}`,
              level: "error",
              message: `L'attributo "${attributeNode.label}" appartiene a piu identificatori interni su "${node.label}".`,
              targetId: node.id,
              targetType: "node",
            });
            return;
          }

          attributeOwnerByIdentifier.set(attributeId, identifierLabel);
        });
      });
    }
  });

  diagram.edges.forEach((edge) => {
    const sourceNode = nodeMap.get(edge.sourceId);
    const targetNode = nodeMap.get(edge.targetId);

    if (!sourceNode || !targetNode) {
      issues.push({
        id: `missing-${edge.id}`,
        level: "error",
        message: `Il collegamento "${edge.id}" non e valido perche punta a un elemento mancante; per risolvere elimina il collegamento o ricrea l'elemento mancante.`,
        targetId: edge.id,
        targetType: "edge",
      });
      return;
    }

    if (!canConnect(edge.type, sourceNode, targetNode)) {
      issues.push({
        id: `invalid-${edge.id}`,
        level: "error",
        message: `Il collegamento tra "${sourceNode.label}" e "${targetNode.label}" non e valido perche non rispetta la sintassi Chen selezionata; per risolvere collega una coppia di elementi compatibile.`,
        targetId: edge.id,
        targetType: "edge",
      });
    }

    const duplicateSignature = getDuplicateEdgeSignature(edge);
    if (duplicateSignature) {
      const firstDuplicate = duplicateEdgeOwners.get(duplicateSignature);
      if (firstDuplicate) {
        issues.push({
          id: `duplicate-${edge.id}`,
          level: "warning",
          message: `Il collegamento tra "${sourceNode.label}" e "${targetNode.label}" e duplicato.`,
          targetId: edge.id,
          targetType: "edge",
        });
      } else {
        duplicateEdgeOwners.set(duplicateSignature, edge);
      }
    }

    if (edge.type === "inheritance" && sourceNode.type === "entity" && targetNode.type === "entity") {
      const sameSuperClassCount = diagram.edges.filter(
        (candidate) =>
          candidate.type === "inheritance" &&
          candidate.sourceId === edge.sourceId &&
          candidate.id !== edge.id,
      ).length;

      if (sameSuperClassCount > 0) {
        issues.push({
          id: `subclass-${edge.id}`,
          level: "warning",
          message: `La sottoclasse "${sourceNode.label}" è collegata a più superclassi.`,
          targetId: edge.id,
          targetType: "edge",
        });
      }
    }

    if (edge.type === "connector") {
      const participation = getConnectorParticipation(edge, sourceNode, targetNode);
      const hasValidCardinality =
        participation !== undefined && isSupportedCardinality(participation.cardinality ?? "");

      if (!hasValidCardinality) {
        issues.push({
          id: `cardinality-${edge.id}`,
          level: "warning",
          message: `Il collegamento tra "${sourceNode.label}" e "${targetNode.label}" non ha cardinalita definita.`,
          targetId: edge.id,
          targetType: "edge",
        });
      }
    }
  });

  return issues;
}

export function selectedNodes(diagram: DiagramDocument, selection: SelectionState): DiagramNode[] {
  return diagram.nodes.filter((node) => selection.nodeIds.includes(node.id));
}

export function boundsForSelection(
  diagram: DiagramDocument,
  selection: SelectionState,
): ReturnType<typeof getNodeBounds>[] {
  return selectedNodes(diagram, selection).map((node) => getNodeBounds(node));
}
