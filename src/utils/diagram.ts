import type {
  DiagramDocument,
  DiagramEdge,
  DiagramNode,
  EdgeKind,
  IsaCompleteness,
  IsaDisjointness,
  NodeKind,
  Point,
  SelectionState,
  ValidationIssue,
} from "../types/diagram";
import { GRID_SIZE, getNodeBounds, snapPoint, snapValue } from "./geometry";
import {
  CONNECTOR_CARDINALITIES,
  CONNECTOR_CARDINALITY_PLACEHOLDER,
  isSupportedCardinality,
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
  const idPrefix = NODE_ID_PREFIX_BY_TYPE[nodeType];
  const labelPrefix = NODE_LABEL_PREFIX_BY_TYPE[nodeType];

  return {
    id: `${idPrefix}${nextIndex}`,
    label: `${labelPrefix}${nextIndex}`,
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
      version: 1,
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
): DiagramEdge {
  if (edgeType === "connector") {
    return {
      id: createId(edgeType),
      type: edgeType,
      sourceId,
      targetId,
      label: "",
      lineStyle: "solid",
      cardinality: CONNECTOR_CARDINALITY_PLACEHOLDER,
    };
  }

  return {
    id: createId(edgeType),
    type: edgeType,
    sourceId,
    targetId,
    label: "",
    lineStyle: "solid",
  } as DiagramEdge;
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

export function removeSelection(
  diagram: DiagramDocument,
  selection: SelectionState,
): DiagramDocument {
  const selectedNodeIds = new Set(selection.nodeIds);
  const selectedEdgeIds = new Set(selection.edgeIds);

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
  const duplicatedNodes = selectedNodes.map((node) => {
    const duplicateId = createId(node.type);
    idMap.set(node.id, duplicateId);

    return {
      ...node,
      id: duplicateId,
      x: snapValue(node.x + GRID_SIZE * 2),
      y: snapValue(node.y + GRID_SIZE * 2),
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
      nodes: [...diagram.nodes, ...duplicatedNodes],
      edges: [...diagram.edges, ...duplicatedEdges],
    },
    selection: {
      nodeIds: duplicatedNodes.map((node) => node.id),
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
  const attributeEdgesByNode = new Map<string, Array<Extract<DiagramEdge, { type: "attribute" }>>>();
  diagram.edges.forEach((edge) => {
    if (edge.type !== "attribute") {
      return;
    }

    const sourceList = attributeEdgesByNode.get(edge.sourceId) ?? [];
    sourceList.push(edge);
    attributeEdgesByNode.set(edge.sourceId, sourceList);

    const targetList = attributeEdgesByNode.get(edge.targetId) ?? [];
    targetList.push(edge);
    attributeEdgesByNode.set(edge.targetId, targetList);
  });

  const expanded = new Set(nodeIds);
  const queue: string[] = [];
  const processedHosts = new Set<string>();

  nodeIds.forEach((nodeId) => {
    const node = nodeMap.get(nodeId);
    if (node?.type === "entity" || node?.type === "attribute") {
      queue.push(nodeId);
    }
  });

  while (queue.length > 0) {
    const hostId = queue.shift() as string;
    if (processedHosts.has(hostId)) {
      continue;
    }
    processedHosts.add(hostId);

    const connectedAttributeEdges = attributeEdgesByNode.get(hostId) ?? [];
    connectedAttributeEdges.forEach((edge) => {
      const otherId = edge.sourceId === hostId ? edge.targetId : edge.sourceId;
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
  return JSON.stringify(diagram, null, 2);
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
  const dependentCardinality = normalizeCardinality(dependentConnector?.edge.cardinality);
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

export function parseDiagram(rawJson: string): DiagramDocument {
  const parsed = JSON.parse(rawJson) as Partial<DiagramDocument>;
  const meta = parsed.meta ?? { name: "Diagramma importato", version: 1 };
  const nodes = Array.isArray(parsed.nodes)
    ? parsed.nodes
        .filter(
          (node): node is DiagramNode =>
            typeof node === "object" &&
            node !== null &&
            typeof node.id === "string" &&
            typeof node.label === "string" &&
            typeof node.x === "number" &&
            typeof node.y === "number" &&
            typeof node.width === "number" &&
            typeof node.height === "number" &&
            typeof node.type === "string" &&
            isNodeKind(node.type),
        )
        .map((node) => {
          if (node.type === "attribute") {
            const isMultivalued = node.isMultivalued === true;
            const multivaluedSize = getMultivaluedAttributeSize(node.label);
            return {
              ...node,
              isIdentifier: node.isIdentifier === true,
              isCompositeInternal: node.isCompositeInternal === true,
              isMultivalued,
              width: isMultivalued
                ? multivaluedSize.width
                : node.width,
              height: isMultivalued
                ? multivaluedSize.height
                : node.height,
            };
          }

          if (node.type === "entity") {
            return {
              ...node,
              isWeak: node.isWeak === true,
            };
          }

          if (node.type === "relationship") {
            return {
              ...node,
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

          return node;
        })
    : [];
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
          if (edge.type === "inheritance") {
            const rawInheritanceEdge = edge as DiagramEdge & {
              isaDisjointness?: string;
              isaCompleteness?: string;
            };

            return {
              ...edge,
              isaDisjointness: isIsaDisjointness(rawInheritanceEdge.isaDisjointness)
                ? rawInheritanceEdge.isaDisjointness
                : undefined,
              isaCompleteness: isIsaCompleteness(rawInheritanceEdge.isaCompleteness)
                ? rawInheritanceEdge.isaCompleteness
                : undefined,
            };
          }

          const parsedCardinality =
            typeof edge.cardinality === "string" ? edge.cardinality.trim() : "";

          if (edge.type === "attribute") {
            return {
              ...edge,
              cardinality: isSupportedCardinality(parsedCardinality) ? parsedCardinality : undefined,
            };
          }

          return {
            ...edge,
            cardinality: isSupportedCardinality(parsedCardinality)
              ? parsedCardinality
              : CONNECTOR_CARDINALITY_PLACEHOLDER,
          };
        })
    : [];

  const parsedDiagram: DiagramDocument = {
    meta: {
      name: meta.name ?? "Diagramma importato",
      version: meta.version ?? 1,
    },
    nodes,
    edges,
  };

  return revalidateExternalIdentifiers(parsedDiagram).diagram;
}

export function validateDiagram(diagram: DiagramDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const edgesByNode = new Map<string, DiagramEdge[]>();

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
            const otherNode = diagram.nodes.find((candidate) => candidate.id === otherId);
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
        .map((attributeId) => diagram.nodes.find((candidate) => candidate.id === attributeId))
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
        const otherNode = diagram.nodes.find((candidate) => candidate.id === otherId);
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
        const otherNode = diagram.nodes.find((candidate) => candidate.id === otherId);
        return otherNode?.type === "attribute";
      });
      const hasExternalIdentifierAttribute = diagram.nodes.some(
        (candidate) =>
          candidate.type === "relationship" &&
          candidate.isExternalIdentifier === true &&
          candidate.externalIdentifierTargetEntityId === node.id &&
          typeof candidate.externalIdentifierSourceAttributeId === "string",
      );

      if (!hasAttribute && !hasExternalIdentifierAttribute) {
        issues.push({
          id: `entity-no-attributes-${node.id}`,
          level: "warning",
          message: `L'entita "${node.label}" non ha attributi collegati.`,
          targetId: node.id,
          targetType: "node",
        });
      }
    }

    if (node.type === "entity" || node.type === "relationship") {
      const compositeAttributes = connectedEdges
        .filter((edge) => edge.type === "attribute")
        .map((edge) => (edge.sourceId === node.id ? edge.targetId : edge.sourceId))
        .map((attributeId) => diagram.nodes.find((candidate) => candidate.id === attributeId))
        .filter((candidate): candidate is DiagramNode => candidate !== undefined)
        .filter(
          (candidate) =>
            candidate.type === "attribute" &&
            candidate.isCompositeInternal === true &&
            candidate.isIdentifier !== true,
        );

      if (compositeAttributes.length === 1) {
        issues.push({
          id: `composite-${node.id}`,
          level: "warning",
          message: `"${node.label}" ha un solo attributo nel composto interno: selezionane almeno due.`,
          targetId: node.id,
          targetType: "node",
        });
      }
    }
  });

  const inheritanceGroups = new Map<string, Array<Extract<DiagramEdge, { type: "inheritance" }>>>();
  diagram.edges.forEach((edge) => {
    if (edge.type !== "inheritance") {
      return;
    }

    const bucket = inheritanceGroups.get(edge.targetId) ?? [];
    bucket.push(edge);
    inheritanceGroups.set(edge.targetId, bucket);
  });

  inheritanceGroups.forEach((group, superClassId) => {
    if (group.length < 2) {
      return;
    }

    const superClass = diagram.nodes.find((node) => node.id === superClassId);
    const disjointnessValues = new Set(group.map((edge) => edge.isaDisjointness ?? ""));
    const completenessValues = new Set(group.map((edge) => edge.isaCompleteness ?? ""));

    if (disjointnessValues.size > 1) {
      issues.push({
        id: `inheritance-disjointness-${superClassId}`,
        level: "warning",
        message: `Le generalizzazioni verso "${superClass?.label ?? superClassId}" devono condividere lo stesso vincolo disjoint/overlap.`,
        targetId: group[0].id,
        targetType: "edge",
      });
    }

    if (completenessValues.size > 1) {
      issues.push({
        id: `inheritance-completeness-${superClassId}`,
        level: "warning",
        message: `Le generalizzazioni verso "${superClass?.label ?? superClassId}" devono condividere lo stesso vincolo total/partial.`,
        targetId: group[0].id,
        targetType: "edge",
      });
    }
  });

  diagram.edges.forEach((edge) => {
    const sourceNode = diagram.nodes.find((node) => node.id === edge.sourceId);
    const targetNode = diagram.nodes.find((node) => node.id === edge.targetId);

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
      const cardinality = edge.cardinality?.trim();
      const hasValidCardinality = isSupportedCardinality(cardinality ?? "");

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
