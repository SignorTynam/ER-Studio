import type {
  AttributeNode,
  DiagramDocument,
  DiagramNode,
  EntityNode,
  RelationshipNode,
} from "../types/diagram";
import {
  buildAttributeLayoutOptionsForHost,
  distributeAttributesAroundHost,
  getDirectAttributeConnection,
} from "./attributeLayout";
import { GRID_SIZE, snapValue } from "./geometry";

type CoreNode = EntityNode | RelationshipNode;

export interface ConceptualLayoutOptions {
  marginX?: number;
  marginY?: number;
  layerGapX?: number;
  layerGapY?: number;
  componentGapX?: number;
  componentGapY?: number;
}

interface ResolvedConceptualLayoutOptions {
  marginX: number;
  marginY: number;
  layerGapX: number;
  layerGapY: number;
  componentGapX: number;
  componentGapY: number;
}

interface ComponentLayout {
  positions: Map<string, { x: number; y: number }>;
  width: number;
  height: number;
}

const DEFAULT_OPTIONS: ResolvedConceptualLayoutOptions = {
  marginX: 180,
  marginY: 160,
  layerGapX: 220,
  layerGapY: 220,
  componentGapX: 300,
  componentGapY: 300,
};

function resolveOptions(options: ConceptualLayoutOptions): ResolvedConceptualLayoutOptions {
  return { ...DEFAULT_OPTIONS, ...options };
}

function sortNodes<T extends DiagramNode>(nodes: readonly T[]): T[] {
  return [...nodes].sort((left, right) => {
    const label = left.label.localeCompare(right.label, "en", { sensitivity: "base" });
    return label !== 0 ? label : left.id.localeCompare(right.id);
  });
}

function buildCoreAdjacency(diagram: DiagramDocument, coreNodes: CoreNode[]): Map<string, Set<string>> {
  const coreIds = new Set(coreNodes.map((node) => node.id));
  const adjacency = new Map(coreNodes.map((node) => [node.id, new Set<string>()]));

  diagram.edges.forEach((edge) => {
    if (edge.type === "attribute" || !coreIds.has(edge.sourceId) || !coreIds.has(edge.targetId)) return;
    adjacency.get(edge.sourceId)?.add(edge.targetId);
    adjacency.get(edge.targetId)?.add(edge.sourceId);
  });
  return adjacency;
}

function buildComponents(coreNodes: CoreNode[], adjacency: Map<string, Set<string>>): string[][] {
  const nodeById = new Map(coreNodes.map((node) => [node.id, node]));
  const visited = new Set<string>();
  const components: string[][] = [];

  sortNodes(coreNodes).forEach((node) => {
    if (visited.has(node.id)) return;
    const queue = [node.id];
    const component: string[] = [];
    visited.add(node.id);
    while (queue.length > 0) {
      const current = queue.shift() as string;
      component.push(current);
      const neighbors = sortNodes(
        [...(adjacency.get(current) ?? [])]
          .map((id) => nodeById.get(id))
          .filter((candidate): candidate is CoreNode => candidate !== undefined),
      );
      neighbors.forEach((neighbor) => {
        if (visited.has(neighbor.id)) return;
        visited.add(neighbor.id);
        queue.push(neighbor.id);
      });
    }
    components.push(component);
  });

  return components;
}

function buildComponentLayers(
  componentIds: string[],
  diagram: DiagramDocument,
  nodeById: Map<string, CoreNode>,
  adjacency: Map<string, Set<string>>,
): string[][] {
  const componentSet = new Set(componentIds);
  const inheritanceChildren = new Set(
    diagram.edges
      .filter((edge) => edge.type === "inheritance" && componentSet.has(edge.sourceId))
      .map((edge) => edge.sourceId),
  );
  const entities = componentIds
    .map((id) => nodeById.get(id))
    .filter((node): node is EntityNode => node?.type === "entity");
  let roots = sortNodes(entities.filter((entity) => !inheritanceChildren.has(entity.id)));
  if (roots.length === 0) {
    const fallback = sortNodes(
      componentIds.map((id) => nodeById.get(id)).filter((node): node is CoreNode => node !== undefined),
    )[0];
    roots = fallback?.type === "entity" ? [fallback] : [];
    if (roots.length === 0 && fallback) {
      const layerById = new Map<string, number>([[fallback.id, 0]]);
      return expandLayers(componentIds, layerById, nodeById, adjacency, diagram);
    }
  }

  const layerById = new Map<string, number>();
  const queue = roots.map((root) => root.id);
  roots.forEach((root) => layerById.set(root.id, 0));
  while (queue.length > 0) {
    const current = queue.shift() as string;
    const nextLayer = (layerById.get(current) ?? 0) + 1;
    sortNodes(
      [...(adjacency.get(current) ?? [])]
        .map((id) => nodeById.get(id))
        .filter((node): node is CoreNode => node !== undefined),
    ).forEach((neighbor) => {
      if (layerById.has(neighbor.id)) return;
      layerById.set(neighbor.id, nextLayer);
      queue.push(neighbor.id);
    });
  }

  return expandLayers(componentIds, layerById, nodeById, adjacency, diagram);
}

function expandLayers(
  componentIds: string[],
  initialLayers: Map<string, number>,
  nodeById: Map<string, CoreNode>,
  adjacency: Map<string, Set<string>>,
  diagram: DiagramDocument,
): string[][] {
  const layerById = new Map(initialLayers);
  const unresolved = sortNodes(
    componentIds
      .filter((id) => !layerById.has(id))
      .map((id) => nodeById.get(id))
      .filter((node): node is CoreNode => node !== undefined),
  );
  unresolved.forEach((node) => layerById.set(node.id, 0));

  for (let pass = 0; pass < componentIds.length; pass += 1) {
    let changed = false;
    diagram.edges.forEach((edge) => {
      if (edge.type !== "inheritance" || !layerById.has(edge.sourceId) || !layerById.has(edge.targetId)) return;
      const requiredChildLayer = (layerById.get(edge.targetId) ?? 0) + 1;
      if ((layerById.get(edge.sourceId) ?? 0) < requiredChildLayer) {
        layerById.set(edge.sourceId, requiredChildLayer);
        changed = true;
      }
    });
    if (!changed) break;
  }

  const layersByIndex = new Map<number, string[]>();
  layerById.forEach((layer, id) => {
    if (!componentIds.includes(id)) return;
    layersByIndex.set(layer, [...(layersByIndex.get(layer) ?? []), id]);
  });
  const orderedLayers = [...layersByIndex.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, ids]) => ids);

  const orderById = new Map<string, number>();
  orderedLayers.forEach((layer) => {
    layer.sort((leftId, rightId) => {
      const score = (id: string) => {
        const priorNeighbors = [...(adjacency.get(id) ?? [])].filter((neighborId) => orderById.has(neighborId));
        return priorNeighbors.length === 0
          ? Number.MAX_SAFE_INTEGER
          : priorNeighbors.reduce((sum, neighborId) => sum + (orderById.get(neighborId) ?? 0), 0) / priorNeighbors.length;
      };
      const delta = score(leftId) - score(rightId);
      if (delta !== 0) return delta;
      const left = nodeById.get(leftId);
      const right = nodeById.get(rightId);
      if (!left || !right) return leftId.localeCompare(rightId);
      return sortNodes([left, right])[0].id === left.id ? -1 : 1;
    });
    layer.forEach((id, index) => orderById.set(id, index));
  });
  return orderedLayers;
}

function layoutComponent(
  componentIds: string[],
  diagram: DiagramDocument,
  nodeById: Map<string, CoreNode>,
  adjacency: Map<string, Set<string>>,
  options: ResolvedConceptualLayoutOptions,
): ComponentLayout {
  const layers = buildComponentLayers(componentIds, diagram, nodeById, adjacency);
  const layerMetrics = layers.map((layer) => {
    const nodes = layer.map((id) => nodeById.get(id)).filter((node): node is CoreNode => node !== undefined);
    return {
      nodes,
      width: nodes.reduce((sum, node) => sum + node.width, 0) + Math.max(0, nodes.length - 1) * options.layerGapX,
      height: Math.max(...nodes.map((node) => node.height), 0),
    };
  });
  const width = Math.max(...layerMetrics.map((metric) => metric.width), 0);
  const height = layerMetrics.reduce((sum, metric) => sum + metric.height, 0)
    + Math.max(0, layerMetrics.length - 1) * options.layerGapY;
  const positions = new Map<string, { x: number; y: number }>();
  let y = 0;
  layerMetrics.forEach((metric) => {
    let x = (width - metric.width) / 2;
    metric.nodes.forEach((node) => {
      positions.set(node.id, { x, y: y + (metric.height - node.height) / 2 });
      x += node.width + options.layerGapX;
    });
    y += metric.height + options.layerGapY;
  });
  return { positions, width, height };
}

function positionCoreNodes(
  diagram: DiagramDocument,
  options: ResolvedConceptualLayoutOptions,
): Map<string, { x: number; y: number }> {
  const coreNodes = diagram.nodes.filter((node): node is CoreNode => node.type !== "attribute");
  const nodeById = new Map(coreNodes.map((node) => [node.id, node]));
  const adjacency = buildCoreAdjacency(diagram, coreNodes);
  const components = buildComponents(coreNodes, adjacency);
  const layouts = components.map((component) => layoutComponent(component, diagram, nodeById, adjacency, options));
  if (layouts.length === 0) return new Map();

  const columns = Math.ceil(Math.sqrt(layouts.length));
  const cellWidth = Math.max(...layouts.map((layout) => layout.width), 0) + options.componentGapX;
  const cellHeight = Math.max(...layouts.map((layout) => layout.height), 0) + options.componentGapY;
  const positions = new Map<string, { x: number; y: number }>();
  layouts.forEach((layout, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const offsetX = options.marginX + column * cellWidth + (cellWidth - options.componentGapX - layout.width) / 2;
    const offsetY = options.marginY + row * cellHeight;
    layout.positions.forEach((position, id) => {
      positions.set(id, {
        x: snapValue(offsetX + position.x, GRID_SIZE),
        y: snapValue(offsetY + position.y, GRID_SIZE),
      });
    });
  });
  return positions;
}

function positionAttributes(
  diagram: DiagramDocument,
  positions: Map<string, { x: number; y: number }>,
  options: ResolvedConceptualLayoutOptions,
) {
  const nodeById = new Map(
    diagram.nodes.map((node) => {
      const position = positions.get(node.id);
      return [node.id, position ? { ...node, ...position } : { ...node }] as const;
    }),
  );
  const allAttributeIds = diagram.nodes.filter((node) => node.type === "attribute").map((node) => node.id);
  const childrenByHostId = new Map<string, string[]>();
  diagram.edges.forEach((edge) => {
    if (edge.type !== "attribute") return;
    const connection = getDirectAttributeConnection({ ...diagram, nodes: [...nodeById.values()] }, edge.id);
    if (!connection) return;
    const children = childrenByHostId.get(connection.host.id) ?? [];
    if (!children.includes(connection.attribute.id)) {
      childrenByHostId.set(connection.host.id, [...children, connection.attribute.id]);
    }
  });

  const visitedAttributes = new Set<string>();
  const visitingHosts = new Set<string>();
  const layoutChildren = (hostId: string) => {
    if (visitingHosts.has(hostId)) return;
    const host = nodeById.get(hostId);
    if (!host) return;
    const childNodes = sortNodes(
      (childrenByHostId.get(hostId) ?? [])
        .filter((id) => !visitedAttributes.has(id))
        .map((id) => nodeById.get(id))
        .filter((node): node is AttributeNode => node?.type === "attribute"),
    );
    if (childNodes.length === 0) return;

    visitingHosts.add(hostId);
    const currentDiagram = { ...diagram, nodes: [...nodeById.values()] };
    const laidOut = distributeAttributesAroundHost(
      host,
      childNodes,
      buildAttributeLayoutOptionsForHost(currentDiagram, host, allAttributeIds),
    );
    laidOut.forEach((attribute) => {
      const positioned = { ...attribute, x: snapValue(attribute.x, GRID_SIZE), y: snapValue(attribute.y, GRID_SIZE) };
      nodeById.set(attribute.id, positioned);
      positions.set(attribute.id, { x: positioned.x, y: positioned.y });
      visitedAttributes.add(attribute.id);
    });
    laidOut.forEach((attribute) => layoutChildren(attribute.id));
    visitingHosts.delete(hostId);
  };

  sortNodes(diagram.nodes.filter((node): node is CoreNode => node.type !== "attribute")).forEach((node) => layoutChildren(node.id));

  const orphans = sortNodes(
    diagram.nodes.filter((node): node is AttributeNode => node.type === "attribute" && !visitedAttributes.has(node.id)),
  );
  if (orphans.length === 0) return;
  const positionedNodes = [...nodeById.values()].filter((node) => positions.has(node.id));
  const startY = positionedNodes.length === 0
    ? options.marginY
    : Math.max(...positionedNodes.map((node) => node.y + node.height)) + options.componentGapY;
  const columns = Math.ceil(Math.sqrt(orphans.length));
  const cellWidth = Math.max(...orphans.map((node) => node.width), 0) + options.layerGapX;
  const cellHeight = Math.max(...orphans.map((node) => node.height), 0) + options.layerGapY;
  orphans.forEach((node, index) => {
    positions.set(node.id, {
      x: snapValue(options.marginX + (index % columns) * cellWidth, GRID_SIZE),
      y: snapValue(startY + Math.floor(index / columns) * cellHeight, GRID_SIZE),
    });
  });
}

/**
 * Deterministic Chen-layout pass. It intentionally changes only node x/y values:
 * model structure, sizes, edges, identifiers, cardinalities, and groups are preserved.
 */
export function autoLayoutConceptualDiagram(
  diagram: DiagramDocument,
  options: ConceptualLayoutOptions = {},
): DiagramDocument {
  if (diagram.nodes.length === 0) return diagram;
  const resolved = resolveOptions(options);
  const positions = positionCoreNodes(diagram, resolved);
  positionAttributes(diagram, positions, resolved);
  return {
    ...diagram,
    nodes: diagram.nodes.map((node) => {
      const position = positions.get(node.id);
      return position ? { ...node, x: position.x, y: position.y } : { ...node };
    }),
  };
}

function nodesBounds(nodes: readonly DiagramNode[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Re-layouts only the selected core nodes (and their anchored attributes) as a
 * sub-diagram, reusing the full Chen-layout pass, then re-centres the result on the
 * selection's original centre so it stays roughly in place and the rest of the diagram
 * is untouched. Requires at least two selected core nodes; otherwise returns the diagram
 * unchanged. Only node x/y change.
 */
export function autoLayoutConceptualSelection(
  diagram: DiagramDocument,
  selectedNodeIds: readonly string[],
  options: ConceptualLayoutOptions = {},
): DiagramDocument {
  const selected = new Set(selectedNodeIds);
  const coreSelected = diagram.nodes.filter(
    (node): node is CoreNode => node.type !== "attribute" && selected.has(node.id),
  );
  if (coreSelected.length < 2) return diagram;

  const nodeById = new Map(diagram.nodes.map((node) => [node.id, node]));
  const included = new Set(coreSelected.map((node) => node.id));
  // Pull in attributes anchored (directly or transitively) to the selected cores,
  // never crossing into another core node.
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of diagram.edges) {
      if (edge.type !== "attribute") continue;
      for (const [from, to] of [
        [edge.sourceId, edge.targetId],
        [edge.targetId, edge.sourceId],
      ] as const) {
        if (included.has(from) && !included.has(to) && nodeById.get(to)?.type === "attribute") {
          included.add(to);
          changed = true;
        }
      }
    }
  }

  const subNodes = diagram.nodes.filter((node) => included.has(node.id));
  const subEdges = diagram.edges.filter((edge) => included.has(edge.sourceId) && included.has(edge.targetId));
  const laid = autoLayoutConceptualDiagram({ ...diagram, nodes: subNodes, edges: subEdges }, options);

  const before = nodesBounds(subNodes);
  const after = nodesBounds(laid.nodes);
  const offsetX = (before.minX + before.maxX) / 2 - (after.minX + after.maxX) / 2;
  const offsetY = (before.minY + before.maxY) / 2 - (after.minY + after.maxY) / 2;

  const laidPositions = new Map(
    laid.nodes.map((node) => [
      node.id,
      { x: snapValue(node.x + offsetX, GRID_SIZE), y: snapValue(node.y + offsetY, GRID_SIZE) },
    ]),
  );
  return {
    ...diagram,
    nodes: diagram.nodes.map((node) => {
      const position = laidPositions.get(node.id);
      return position ? { ...node, x: position.x, y: position.y } : node;
    }),
  };
}
