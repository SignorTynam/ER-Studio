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

const COMPOSITE_ATTRIBUTE_MIN_SIZE = {
  width: 220,
  height: 110,
};

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 11)}`;
}

function getDefaultLabel(nodeType: NodeKind): string {
  switch (nodeType) {
    case "entity":
      return "NUOVA ENTITA'";
    case "relationship":
      return "NUOVA RELAZIONE";
    case "attribute":
      return "NUOVO ATTRIBUTO";
    case "text":
      return "Testo";
    default:
      return "Elemento";
  }
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

export function createNode(nodeType: NodeKind, position: Point): DiagramNode {
  const size = getNodeSize(nodeType);
  const snappedCenter = snapPoint(position);
  const x = snapValue(snappedCenter.x - size.width / 2, GRID_SIZE);
  const y = snapValue(snappedCenter.y - size.height / 2, GRID_SIZE);

  if (nodeType === "attribute") {
    return {
      id: createId(nodeType),
      type: nodeType,
      label: getDefaultLabel(nodeType),
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
      id: createId(nodeType),
      type: nodeType,
      label: getDefaultLabel(nodeType),
      x,
      y,
      width: size.width,
      height: size.height,
      isWeak: false,
    };
  }

  return {
    id: createId(nodeType),
    type: nodeType,
    label: getDefaultLabel(nodeType),
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
            return {
              ...node,
              isIdentifier: node.isIdentifier === true,
              isCompositeInternal: node.isCompositeInternal === true,
              isMultivalued,
              width: isMultivalued
                ? Math.max(node.width, COMPOSITE_ATTRIBUTE_MIN_SIZE.width)
                : node.width,
              height: isMultivalued
                ? Math.max(node.height, COMPOSITE_ATTRIBUTE_MIN_SIZE.height)
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

  return {
    meta: {
      name: meta.name ?? "Diagramma importato",
      version: meta.version ?? 1,
    },
    nodes,
    edges,
  };
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
          message: `L'attributo "${node.label}" non puo essere multivalore e identificatore allo stesso tempo.`,
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
          message: `La relazione "${node.label}" non puo avere attributi identificatori.`,
          targetId: node.id,
          targetType: "node",
        });
      }

      if (node.isExternalIdentifier === true) {
        if (connectors.length !== 2) {
          issues.push({
            id: `external-id-arity-${node.id}`,
            level: "warning",
            message: `La relazione "${node.label}" marcata come identificatore esterno deve avere esattamente due collegamenti con cardinalita coerenti.`,
            targetId: node.id,
            targetType: "node",
          });
        } else {
          const normalized = connectors.map((edge) => normalizeCardinality(edge.cardinality));
          const hasOneToOne = normalized.includes("1,1");

          if (!hasOneToOne) {
            issues.push({
              id: `external-id-cardinality-${node.id}`,
              level: "warning",
              message: `Per l'identificatore esterno su "${node.label}" imposta (1,1) sul lato dipendente; l'altro lato puo avere qualsiasi cardinalita.`,
              targetId: node.id,
              targetType: "node",
            });
          }
        }
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
        message: `Il collegamento "${edge.id}" punta a un elemento mancante.`,
        targetId: edge.id,
        targetType: "edge",
      });
      return;
    }

    if (!canConnect(edge.type, sourceNode, targetNode)) {
      issues.push({
        id: `invalid-${edge.id}`,
        level: "error",
        message: `Il collegamento tra "${sourceNode.label}" e "${targetNode.label}" non è compatibile con la sintassi Chen selezionata.`,
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
