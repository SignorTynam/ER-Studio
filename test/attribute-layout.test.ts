import assert from "node:assert/strict";
import test from "node:test";

import type {
  AttributeNode,
  Bounds,
  DiagramDocument,
  DiagramEdge,
  DiagramNode,
  EntityNode,
  RelationshipNode,
} from "../src/types/diagram.ts";
import {
  createEdge,
  createEmptyDiagram,
  createNode,
  getMultivaluedAttributeSize,
} from "../src/utils/diagram.ts";
import {
  type AttributeLayoutHost,
  type AttributeLayoutSide,
  FIXED_ATTRIBUTE_MARKER_GAP,
  buildAttributeLayoutBounds,
  buildCenterOutOffsets,
  buildLeftPriorityPerimeterSlots,
  distributeAttributesAroundHost,
  getAttributeMarkerCenter,
  getDirectAttributeLayoutSide,
  layoutIncrementallyConnectedAttribute,
  placeNewAttributeAroundHost,
} from "../src/utils/attributeLayout.ts";
import { reverseSqlToDiagram } from "../src/utils/sqlReverseDiagram.ts";

function hostEntity(): EntityNode {
  return {
    id: "entity1",
    type: "entity",
    label: "ENTITA1",
    x: 240,
    y: 180,
    width: 220,
    height: 96,
    relationshipParticipations: [],
  };
}

function relationshipNode(): RelationshipNode {
  return {
    id: "relationship6",
    type: "relationship",
    label: "RELATIONSHIP6",
    x: 620,
    y: 188,
    width: 150,
    height: 80,
  };
}

function hostAttribute(): AttributeNode {
  return {
    id: "attribute-host",
    type: "attribute",
    label: "INDIRIZZO",
    x: 240,
    y: 180,
    width: 150,
    height: 34,
    isMultivalued: true,
  };
}

function attribute(id: string, index: number): AttributeNode {
  return {
    id,
    type: "attribute",
    label: `ATTRIBUTO${index + 1}`,
    x: 620,
    y: 180 + index * 44,
    width: 150,
    height: 36,
  };
}

function attributeEdge(id: string, sourceId: string, targetId: string): DiagramEdge {
  return {
    id,
    type: "attribute",
    sourceId,
    targetId,
    label: "",
    lineStyle: "solid",
  };
}

function incrementalDiagram(
  host: EntityNode | RelationshipNode | AttributeNode,
  attributes: AttributeNode[],
): DiagramDocument {
  return {
    meta: { name: "Incremental attribute layout", version: 1 },
    notes: "",
    nodes: [host, ...attributes],
    edges: attributes.map((candidate, index) =>
      attributeEdge(`edge-existing-${index}`, candidate.id, host.id),
    ),
  };
}

function connectAndPlaceAttribute(
  diagram: DiagramDocument,
  hostId: string,
  nextAttribute: AttributeNode,
  orientation: "attribute-to-host" | "host-to-attribute" = "attribute-to-host",
): DiagramDocument {
  const edge = attributeEdge(
    `edge-${nextAttribute.id}`,
    orientation === "attribute-to-host" ? nextAttribute.id : hostId,
    orientation === "attribute-to-host" ? hostId : nextAttribute.id,
  );
  const withConnection: DiagramDocument = {
    ...diagram,
    nodes: [...diagram.nodes, nextAttribute],
    edges: [...diagram.edges, edge],
  };
  return layoutIncrementallyConnectedAttribute(withConnection, edge.id);
}

function getAttribute(diagram: DiagramDocument, id: string): AttributeNode {
  const node = diagram.nodes.find(
    (candidate): candidate is AttributeNode => candidate.id === id && candidate.type === "attribute",
  );
  assert.ok(node, `missing attribute ${id}`);
  return node;
}

function snapshotNodes(diagram: DiagramDocument, nodeIds: string[]): Map<string, DiagramNode> {
  const ids = new Set(nodeIds);
  return new Map(
    diagram.nodes
      .filter((node) => ids.has(node.id))
      .map((node) => [node.id, structuredClone(node)]),
  );
}

function assertNodesUnchanged(diagram: DiagramDocument, snapshot: Map<string, DiagramNode>): void {
  snapshot.forEach((expected, id) => {
    assert.deepEqual(diagram.nodes.find((node) => node.id === id), expected);
  });
}

function snapshotEdges(diagram: DiagramDocument): DiagramEdge[] {
  return structuredClone(diagram.edges);
}

function assertEdgesUnchanged(diagram: DiagramDocument, snapshot: DiagramEdge[]): void {
  assert.deepEqual(diagram.edges.slice(0, snapshot.length), snapshot);
}

function boundsIntersect(left: Bounds, right: Bounds): boolean {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

function assertNoDanglingEdges(diagram: DiagramDocument): void {
  const nodeIds = new Set(diagram.nodes.map((node) => node.id));
  diagram.edges.forEach((edge) => {
    assert.equal(nodeIds.has(edge.sourceId), true, `dangling edge source ${edge.id}`);
    assert.equal(nodeIds.has(edge.targetId), true, `dangling edge target ${edge.id}`);
  });
}

function getAttributesById(diagram: DiagramDocument, ids: string[]): AttributeNode[] {
  return ids.map((id) => getAttribute(diagram, id));
}

function assertUniqueMarkers(attributes: AttributeNode[]): void {
  const markerKeys = attributes.map((candidate) => {
    const marker = getAttributeMarkerCenter(candidate);
    return `${marker.x}:${marker.y}`;
  });
  assert.equal(new Set(markerKeys).size, markerKeys.length);
}

function assertNoAttributeBoundsOverlap(host: AttributeLayoutHost, attributes: AttributeNode[]): void {
  attributes.forEach((candidate, index) => {
    attributes.slice(index + 1).forEach((other) => {
      assert.equal(
        boundsIntersect(
          buildAttributeLayoutBounds(host, candidate),
          buildAttributeLayoutBounds(host, other),
        ),
        false,
        `${candidate.id} overlaps ${other.id}`,
      );
    });
  });
}

function addUniformAttributesIncrementally(
  host: EntityNode | RelationshipNode | AttributeNode,
  count: number,
): DiagramDocument {
  let diagram = incrementalDiagram(host, []);
  for (let index = 0; index < count; index += 1) {
    diagram = connectAndPlaceAttribute(
      diagram,
      host.id,
      attribute(`attribute${index + 1}`, index),
    );
  }
  return diagram;
}

function createRealEntityDiagram(position = { x: 420, y: 320 }): {
  diagram: DiagramDocument;
  host: EntityNode;
} {
  const empty = createEmptyDiagram("Real attribute layout");
  const host = createNode("entity", position, empty) as EntityNode;
  return {
    diagram: { ...empty, nodes: [host] },
    host,
  };
}

function connectRealApplicationAttribute(
  diagram: DiagramDocument,
  hostId: string,
  label?: string,
): { diagram: DiagramDocument; attributeId: string; edgeId: string } {
  const draft = createNode("attribute", { x: 0, y: 0 }, diagram) as AttributeNode;
  const nextAttribute = label === undefined ? draft : { ...draft, label };
  const edge = createEdge("attribute", nextAttribute.id, hostId, diagram);
  const withConnection: DiagramDocument = {
    ...diagram,
    nodes: [...diagram.nodes, nextAttribute],
    edges: [...diagram.edges, edge],
  };

  return {
    diagram: layoutIncrementallyConnectedAttribute(withConnection, edge.id),
    attributeId: nextAttribute.id,
    edgeId: edge.id,
  };
}

function getDirectAttributeIds(diagram: DiagramDocument, hostId: string): string[] {
  return diagram.edges.flatMap((edge) => {
    if (edge.type !== "attribute") {
      return [];
    }
    if (edge.sourceId === hostId) {
      return [edge.targetId];
    }
    if (edge.targetId === hostId) {
      return [edge.sourceId];
    }
    return [];
  });
}

function layoutSides(host: AttributeLayoutHost, attributes: AttributeNode[]): AttributeLayoutSide[] {
  return attributes.map((candidate) => getDirectAttributeLayoutSide(host, candidate));
}

function assertConstantPerimeterGap(host: AttributeLayoutHost, attributes: AttributeNode[]): void {
  attributes.forEach((candidate) => {
    const marker = getAttributeMarkerCenter(candidate);
    const side = getDirectAttributeLayoutSide(host, candidate);

    if (side === "left") {
      assert.equal(marker.x, host.x - FIXED_ATTRIBUTE_MARKER_GAP);
      assert.ok(marker.y >= host.y - 0.001, `${candidate.id} left marker is too high`);
      assert.ok(marker.y <= host.y + host.height + 0.001, `${candidate.id} left marker is too low`);
      return;
    }

    if (side === "top") {
      assert.equal(marker.y, host.y - FIXED_ATTRIBUTE_MARKER_GAP);
      return;
    }

    if (side === "bottom") {
      assert.equal(marker.y, host.y + host.height + FIXED_ATTRIBUTE_MARKER_GAP);
      return;
    }

    assert.fail(`${candidate.id} unexpectedly used right-side fallback`);
  });
}

test("attribute layout: center-out offsets are stable", () => {
  assert.deepEqual(buildCenterOutOffsets(7), [0, -1, 1, -2, 2, -3, 3]);
});

test("attribute layout: perimeter slots start left and then turn to top and bottom", () => {
  const host = hostEntity();
  const slots = buildLeftPriorityPerimeterSlots(
    host,
    Array.from({ length: 9 }, (_, index) => attribute(`attribute${index + 1}`, index)),
  );

  assert.deepEqual(
    slots.map((slot) => slot.side),
    ["left", "left", "left", "top", "bottom", "top", "bottom", "top", "bottom"],
  );
  assert.deepEqual(slots.slice(0, 3).map((slot) => slot.offsetIndex), [0, -1, 1]);
});

test("attribute layout: entity attributes follow the left-priority perimeter", () => {
  const host = hostEntity();
  const positioned = distributeAttributesAroundHost(
    host,
    Array.from({ length: 9 }, (_, index) => attribute(`attribute${index + 1}`, index)),
  );

  assert.deepEqual(
    layoutSides(host, positioned),
    ["left", "left", "left", "top", "bottom", "top", "bottom", "top", "bottom"],
  );
  assertConstantPerimeterGap(host, positioned);
});

test("attribute layout: saturated left side does not create an infinite vertical column", () => {
  const host = hostEntity();
  const positioned = distributeAttributesAroundHost(
    host,
    Array.from({ length: 9 }, (_, index) => attribute(`attribute${index + 1}`, index)),
  );

  const leftMarkers = positioned
    .filter((candidate) => getDirectAttributeLayoutSide(host, candidate) === "left")
    .map((candidate) => getAttributeMarkerCenter(candidate));

  assert.equal(leftMarkers.length, 3);
  leftMarkers.forEach((marker) => {
    assert.ok(marker.y >= host.y - 0.001);
    assert.ok(marker.y <= host.y + host.height + 0.001);
  });
});

test("attribute layout: incremental placement does not move existing attributes", () => {
  const host = hostEntity();
  const positioned = distributeAttributesAroundHost(
    host,
    Array.from({ length: 5 }, (_, index) => attribute(`attribute${index + 1}`, index)),
  );
  const frozenPositions = new Map(positioned.map((candidate) => [candidate.id, { x: candidate.x, y: candidate.y }]));
  const next = placeNewAttributeAroundHost(host, positioned, attribute("attribute6", 5));

  positioned.forEach((candidate) => {
    assert.deepEqual({ x: candidate.x, y: candidate.y }, frozenPositions.get(candidate.id));
  });
  assert.deepEqual(layoutSides(host, [...positioned, next]), ["left", "left", "left", "top", "bottom", "top"]);
  assertConstantPerimeterGap(host, [next]);
});

test("attribute layout: real incremental sequence from first to seventh uses distinct perimeter slots", () => {
  const host = hostEntity();
  let diagram = incrementalDiagram(host, []);
  const attributeIds: string[] = [];

  for (let index = 0; index < 7; index += 1) {
    const snapshot = snapshotNodes(diagram, diagram.nodes.map((node) => node.id));
    const nextId = `attribute${index + 1}`;
    diagram = connectAndPlaceAttribute(diagram, host.id, attribute(nextId, index));
    attributeIds.push(nextId);

    assertNodesUnchanged(diagram, snapshot);
    const positioned = getAttributesById(diagram, attributeIds);
    assert.notDeepEqual(
      { x: positioned.at(-1)?.x, y: positioned.at(-1)?.y },
      { x: 620, y: 180 + index * 44 },
    );
    assertUniqueMarkers(positioned);
    assertNoAttributeBoundsOverlap(host, positioned);
    assertNoDanglingEdges(diagram);
  }

  const positioned = getAttributesById(diagram, attributeIds);
  assert.deepEqual(layoutSides(host, positioned), ["left", "left", "left", "top", "bottom", "top", "bottom"]);
  assert.notDeepEqual(
    getAttributeMarkerCenter(positioned[3]),
    getAttributeMarkerCenter(positioned[0]),
  );
});

test("attribute layout: fourth incremental attribute follows the three left slots", () => {
  const host = hostEntity();
  const beforeFourth = addUniformAttributesIncrementally(host, 3);
  const snapshot = snapshotNodes(beforeFourth, beforeFourth.nodes.map((node) => node.id));
  const afterFourth = connectAndPlaceAttribute(beforeFourth, host.id, attribute("attribute4", 3));
  const positioned = getAttributesById(afterFourth, ["attribute1", "attribute2", "attribute3", "attribute4"]);
  const expectedSlots = buildLeftPriorityPerimeterSlots(host, positioned);

  assertNodesUnchanged(afterFourth, snapshot);
  assertUniqueMarkers(positioned);
  assert.deepEqual(getAttributeMarkerCenter(positioned[3]), expectedSlots[3].marker);
  assert.notDeepEqual(getAttributeMarkerCenter(positioned[3]), getAttributeMarkerCenter(positioned[0]));
});

test("attribute layout: fifth incremental attribute follows and preserves the first four", () => {
  const host = hostEntity();
  const beforeFifth = addUniformAttributesIncrementally(host, 4);
  const snapshot = snapshotNodes(beforeFifth, beforeFifth.nodes.map((node) => node.id));
  const afterFifth = connectAndPlaceAttribute(beforeFifth, host.id, attribute("attribute5", 4));
  const positioned = getAttributesById(
    afterFifth,
    ["attribute1", "attribute2", "attribute3", "attribute4", "attribute5"],
  );
  const expectedSlots = buildLeftPriorityPerimeterSlots(host, positioned);

  assertNodesUnchanged(afterFifth, snapshot);
  assertUniqueMarkers(positioned);
  assertNoAttributeBoundsOverlap(host, positioned);
  assert.deepEqual(getAttributeMarkerCenter(positioned[4]), expectedSlots[4].marker);
});

test("attribute layout: exhausted initial search never falls back to occupied slot zero", () => {
  const host = hostEntity();
  const next = attribute("fallback-check", 0);
  const firstSlot = buildLeftPriorityPerimeterSlots(host, [next], undefined, 1)[0];
  const occupiedBounds: Bounds[] = [
    {
      x: firstSlot.marker.x - 12,
      y: firstSlot.marker.y - 12,
      width: 24,
      height: 24,
    },
    ...Array.from({ length: 255 }, (_, index) => ({
      x: 10_000 + index * 4,
      y: 10_000,
      width: 1,
      height: 1,
    })),
  ];
  const positioned = placeNewAttributeAroundHost(host, [], next, { occupiedBounds });

  assert.notDeepEqual(getAttributeMarkerCenter(positioned), firstSlot.marker);
  assert.equal(
    occupiedBounds.some((bounds) =>
      boundsIntersect(buildAttributeLayoutBounds(host, positioned), bounds),
    ),
    false,
  );
});

test("attribute layout: relationship and composite incremental sequences never reuse markers", () => {
  for (const host of [relationshipNode(), hostAttribute()]) {
    const diagram = addUniformAttributesIncrementally(host, 5);
    const updatedHost = diagram.nodes.find(
      (node): node is AttributeLayoutHost =>
        node.id === host.id &&
        (node.type === "entity" || node.type === "relationship" || node.type === "attribute"),
    );
    assert.ok(updatedHost);
    const positioned = getAttributesById(
      diagram,
      ["attribute1", "attribute2", "attribute3", "attribute4", "attribute5"],
    );

    assertUniqueMarkers(positioned);
    assertNoAttributeBoundsOverlap(updatedHost, positioned);
    assertNoDanglingEdges(diagram);
  }
});

test("attribute layout: batch and incremental placement share the same initial perimeter sequence", () => {
  const host = hostEntity();
  const sourceAttributes = Array.from({ length: 7 }, (_, index) => attribute(`attribute${index + 1}`, index));
  const batch = distributeAttributesAroundHost(host, sourceAttributes);
  const incrementalDiagramResult = addUniformAttributesIncrementally(host, sourceAttributes.length);
  const incremental = getAttributesById(
    incrementalDiagramResult,
    sourceAttributes.map((candidate) => candidate.id),
  );

  assert.deepEqual(
    incremental.slice(0, 5).map(getAttributeMarkerCenter),
    batch.slice(0, 5).map(getAttributeMarkerCenter),
  );
  assert.deepEqual(layoutSides(host, incremental), layoutSides(host, batch));
});

test("attribute layout: real application flow adds twenty attributes without moving prior nodes or edges", () => {
  const setup = createRealEntityDiagram();
  let diagram = setup.diagram;
  const attributeIds: string[] = [];

  for (let index = 0; index < 20; index += 1) {
    const nodeSnapshot = snapshotNodes(diagram, diagram.nodes.map((node) => node.id));
    const edgeSnapshot = snapshotEdges(diagram);
    const defaultLabel = `ATTRIBUTO${index + 1}`;
    const label = index === 19
      ? `${defaultLabel}_CON_UNA_LABEL_MOLTO_LUNGA_PER_IL_LAYOUT`
      : defaultLabel;
    const result = connectRealApplicationAttribute(diagram, setup.host.id, label);
    diagram = result.diagram;
    attributeIds.push(result.attributeId);

    assertNodesUnchanged(diagram, nodeSnapshot);
    assertEdgesUnchanged(diagram, edgeSnapshot);
    assert.equal(getAttribute(diagram, result.attributeId).label, label);
    const positioned = getAttributesById(diagram, attributeIds);
    assertUniqueMarkers(positioned);
    assertNoAttributeBoundsOverlap(setup.host, positioned);
    assertNoDanglingEdges(diagram);
  }

  assert.equal(attributeIds.length, 20);
  assert.equal(getDirectAttributeIds(diagram, setup.host.id).length, 20);
  assert.ok(
    getAttributesById(diagram, attributeIds).some((candidate) => {
      const marker = getAttributeMarkerCenter(candidate);
      return marker.x < setup.host.x || marker.x > setup.host.x + setup.host.width;
    }),
  );
});

test("attribute layout: exact fifth-to-sixth transition preserves the first five positions", () => {
  const setup = createRealEntityDiagram();
  let diagram = setup.diagram;
  const attributeIds: string[] = [];

  for (let index = 0; index < 5; index += 1) {
    const result = connectRealApplicationAttribute(diagram, setup.host.id);
    diagram = result.diagram;
    attributeIds.push(result.attributeId);
  }

  const firstFiveSnapshot = snapshotNodes(diagram, [setup.host.id, ...attributeIds]);
  const firstFiveEdges = snapshotEdges(diagram);
  const result = connectRealApplicationAttribute(diagram, setup.host.id);
  diagram = result.diagram;
  const sixth = getAttribute(diagram, result.attributeId);
  const firstFive = getAttributesById(diagram, attributeIds);

  assertNodesUnchanged(diagram, firstFiveSnapshot);
  assertEdgesUnchanged(diagram, firstFiveEdges);
  firstFive.forEach((candidate) => {
    assert.notDeepEqual(getAttributeMarkerCenter(sixth), getAttributeMarkerCenter(candidate));
    assert.equal(
      boundsIntersect(
        buildAttributeLayoutBounds(setup.host, sixth),
        buildAttributeLayoutBounds(setup.host, candidate),
      ),
      false,
    );
  });
  assertNoDanglingEdges(diagram);
});

test("attribute layout: additions from sixth through tenth preserve every earlier attribute", () => {
  const setup = createRealEntityDiagram();
  let diagram = setup.diagram;
  const attributeIds: string[] = [];

  for (let index = 0; index < 10; index += 1) {
    const nodeSnapshot = snapshotNodes(diagram, diagram.nodes.map((node) => node.id));
    const edgeSnapshot = snapshotEdges(diagram);
    const result = connectRealApplicationAttribute(diagram, setup.host.id);
    diagram = result.diagram;
    attributeIds.push(result.attributeId);

    if (index >= 5) {
      assertNodesUnchanged(diagram, nodeSnapshot);
      assertEdgesUnchanged(diagram, edgeSnapshot);
      const positioned = getAttributesById(diagram, attributeIds);
      assertUniqueMarkers(positioned);
      assertNoAttributeBoundsOverlap(setup.host, positioned);
      assertNoDanglingEdges(diagram);
    }
  }

  assert.equal(getDirectAttributeIds(diagram, setup.host.id).length, 10);
});

test("attribute layout: two distant entities independently accept ten alternating additions", () => {
  const firstSetup = createRealEntityDiagram({ x: 420, y: 320 });
  const secondHost = createNode(
    "entity",
    { x: 3_500, y: 320 },
    firstSetup.diagram,
  ) as EntityNode;
  let diagram: DiagramDocument = {
    ...firstSetup.diagram,
    nodes: [...firstSetup.diagram.nodes, secondHost],
  };

  for (let index = 0; index < 20; index += 1) {
    const host = index % 2 === 0 ? firstSetup.host : secondHost;
    const nodeSnapshot = snapshotNodes(diagram, diagram.nodes.map((node) => node.id));
    const edgeSnapshot = snapshotEdges(diagram);
    const result = connectRealApplicationAttribute(diagram, host.id);
    diagram = result.diagram;

    assertNodesUnchanged(diagram, nodeSnapshot);
    assertEdgesUnchanged(diagram, edgeSnapshot);
    assertNoDanglingEdges(diagram);
  }

  const firstIds = getDirectAttributeIds(diagram, firstSetup.host.id);
  const secondIds = getDirectAttributeIds(diagram, secondHost.id);
  assert.equal(firstIds.length, 10);
  assert.equal(secondIds.length, 10);
  assert.equal(new Set([...firstIds, ...secondIds]).size, 20);
  assertNoAttributeBoundsOverlap(firstSetup.host, getAttributesById(diagram, firstIds));
  assertNoAttributeBoundsOverlap(secondHost, getAttributesById(diagram, secondIds));
});

test("attribute layout: blocked first top and bottom lane advances to a farther lane", () => {
  const host = hostEntity();
  const existing = distributeAttributesAroundHost(
    host,
    Array.from({ length: 3 }, (_, index) => attribute(`existing${index + 1}`, index)),
  );
  const existingSnapshot = structuredClone(existing);
  const laneBlockers: Bounds[] = [
    {
      x: host.x - 10_000,
      y: host.y - FIXED_ATTRIBUTE_MARKER_GAP - 60,
      width: 20_000,
      height: 100,
    },
    {
      x: host.x - 10_000,
      y: host.y + host.height + FIXED_ATTRIBUTE_MARKER_GAP - 25,
      width: 20_000,
      height: 100,
    },
  ];
  const next = placeNewAttributeAroundHost(
    host,
    existing,
    attribute("lane-check", 3),
    { occupiedBounds: laneBlockers },
  );
  const marker = getAttributeMarkerCenter(next);
  const matchingSlot = buildLeftPriorityPerimeterSlots(
    host,
    [...existing, next],
    undefined,
    100,
  ).find((slot) => (
    Math.abs(slot.marker.x - marker.x) <= 0.001 &&
    Math.abs(slot.marker.y - marker.y) <= 0.001
  ));

  assert.deepEqual(existing, existingSnapshot);
  assert.ok(matchingSlot);
  assert.ok(matchingSlot.lane > 0);
  assert.equal(
    laneBlockers.some((bounds) => boundsIntersect(buildAttributeLayoutBounds(host, next), bounds)),
    false,
  );
});

test("attribute layout: relation and composite host accept ten incremental attributes", () => {
  for (const initialHost of [relationshipNode(), hostAttribute()]) {
    let diagram = incrementalDiagram(initialHost, []);
    const attributeIds: string[] = [];

    for (let index = 0; index < 10; index += 1) {
      const nodeSnapshot = snapshotNodes(diagram, diagram.nodes.map((node) => node.id));
      const edgeSnapshot = snapshotEdges(diagram);
      const nextId = `${initialHost.id}-attribute${index + 1}`;
      diagram = connectAndPlaceAttribute(
        diagram,
        initialHost.id,
        attribute(nextId, index),
      );
      attributeIds.push(nextId);

      assertNodesUnchanged(diagram, nodeSnapshot);
      assertEdgesUnchanged(diagram, edgeSnapshot);
      assertNoDanglingEdges(diagram);
    }

    const updatedHost = diagram.nodes.find(
      (node): node is AttributeLayoutHost =>
        node.id === initialHost.id &&
        (node.type === "relationship" || node.type === "attribute"),
    );
    assert.ok(updatedHost);
    const positioned = getAttributesById(diagram, attributeIds);
    assertUniqueMarkers(positioned);
    assertNoAttributeBoundsOverlap(updatedHost, positioned);
  }
});

test("attribute layout: expandable batch layout supports twenty attributes without overlap", () => {
  const host = hostEntity();
  const source = Array.from({ length: 20 }, (_, index) => ({
    ...attribute(`batch-attribute${index + 1}`, index),
    label: index === 9 || index === 16
      ? `ATTRIBUTO${index + 1}_CON_UNA_LABEL_ESTREMAMENTE_LUNGA`
      : `ATTRIBUTO${index + 1}`,
  }));
  const positioned = distributeAttributesAroundHost(host, source);

  assert.equal(positioned.length, 20);
  assertUniqueMarkers(positioned);
  assertNoAttributeBoundsOverlap(host, positioned);
  assert.ok(positioned.some((candidate) => {
    const marker = getAttributeMarkerCenter(candidate);
    return marker.x < host.x || marker.x > host.x + host.width;
  }));
});

test("attribute layout: fifty uniform incremental attributes stay collision-free", () => {
  const host = hostEntity();
  const diagram = addUniformAttributesIncrementally(host, 50);
  const attributeIds = Array.from({ length: 50 }, (_, index) => `attribute${index + 1}`);
  const positioned = getAttributesById(diagram, attributeIds);

  assert.equal(getDirectAttributeIds(diagram, host.id).length, 50);
  assertUniqueMarkers(positioned);
  assertNoAttributeBoundsOverlap(host, positioned);
  assertNoDanglingEdges(diagram);
  assert.ok(positioned.some((candidate) => {
    const marker = getAttributeMarkerCenter(candidate);
    return marker.y < host.y - FIXED_ATTRIBUTE_MARKER_GAP ||
      marker.y > host.y + host.height + FIXED_ATTRIBUTE_MARKER_GAP;
  }));
});

test("attribute layout: diagram integration preserves three existing entity attributes", () => {
  const host = { ...hostEntity(), id: "PERSONA", label: "PERSONA" };
  const existing = [
    { ...attribute("cf", 0), label: "cf", x: 96, y: 208, isIdentifier: true, cardinality: "(1,1)" },
    { ...attribute("cognome", 1), label: "cognome", x: 280, y: 70, cardinality: "(0,1)" },
    { ...attribute("nome", 2), label: "nome", x: 360, y: 340, isMultivalued: false },
  ];
  const before = incrementalDiagram(host, existing);
  const snapshot = snapshotNodes(before, [host.id, ...existing.map((candidate) => candidate.id)]);
  const previousEdges = structuredClone(before.edges);
  const translated = connectAndPlaceAttribute(
    before,
    host.id,
    { ...attribute("ATTRIBUTO1", 3), x: 0, y: 0 },
    "host-to-attribute",
  );

  assertNodesUnchanged(translated, snapshot);
  assert.deepEqual(translated.edges.slice(0, previousEdges.length), previousEdges);
  const next = getAttribute(translated, "ATTRIBUTO1");
  assert.notDeepEqual({ x: next.x, y: next.y }, { x: 0, y: 0 });
  assert.equal(
    translated.edges.some(
      (edge) => edge.id === "edge-ATTRIBUTO1" && edge.sourceId === host.id && edge.targetId === next.id,
    ),
    true,
  );
  assertNoDanglingEdges(translated);
});

test("attribute layout: diagram integration respects manually moved attribute bounds", () => {
  const host = hostEntity();
  const manuallyMoved = {
    ...attribute("manual", 0),
    label: "manual position",
    x: host.x - FIXED_ATTRIBUTE_MARKER_GAP - 10 + 0.25,
    y: host.y + host.height / 2 - 18 + 0.25,
  };
  const before = incrementalDiagram(host, [manuallyMoved]);
  const snapshot = snapshotNodes(before, [host.id, manuallyMoved.id]);
  const translated = connectAndPlaceAttribute(before, host.id, {
    ...attribute("new-manual-case", 1),
    x: 0,
    y: 0,
  });
  const next = getAttribute(translated, "new-manual-case");

  assertNodesUnchanged(translated, snapshot);
  assert.equal(
    boundsIntersect(
      buildAttributeLayoutBounds(host, manuallyMoved),
      buildAttributeLayoutBounds(host, next),
    ),
    false,
  );
  assert.notDeepEqual(
    { x: next.x, y: next.y },
    { x: host.x - FIXED_ATTRIBUTE_MARKER_GAP - 10, y: host.y + host.height / 2 - next.height / 2 },
  );
});

test("attribute layout: consecutive diagram additions never move earlier attributes", () => {
  const host = hostEntity();
  const existing = [
    { ...attribute("first", 0), x: 85, y: 170 },
    { ...attribute("second", 1), x: 285, y: 75 },
    { ...attribute("third", 2), x: 340, y: 330 },
  ];
  const before = incrementalDiagram(host, existing);
  const originalSnapshot = snapshotNodes(before, [host.id, ...existing.map((candidate) => candidate.id)]);
  const afterFourth = connectAndPlaceAttribute(before, host.id, { ...attribute("fourth", 3), x: 0, y: 0 });
  const fourthSnapshot = snapshotNodes(afterFourth, ["fourth"]);
  const afterFifth = connectAndPlaceAttribute(afterFourth, host.id, { ...attribute("fifth", 4), x: 0, y: 0 });

  assertNodesUnchanged(afterFourth, originalSnapshot);
  assertNodesUnchanged(afterFifth, originalSnapshot);
  assertNodesUnchanged(afterFifth, fourthSnapshot);
  const fifth = getAttribute(afterFifth, "fifth");
  ["first", "second", "third", "fourth"].forEach((id) => {
    assert.equal(
      boundsIntersect(
        buildAttributeLayoutBounds(host, getAttribute(afterFifth, id)),
        buildAttributeLayoutBounds(host, fifth),
      ),
      false,
    );
  });
});

test("attribute layout: incremental diagram placement preserves relationship attributes", () => {
  const host = relationshipNode();
  const existing = [
    { ...attribute("role-a", 0), x: 500, y: 165 },
    { ...attribute("role-b", 1), x: 650, y: 90 },
  ];
  const before = incrementalDiagram(host, existing);
  const snapshot = snapshotNodes(before, [host.id, ...existing.map((candidate) => candidate.id)]);
  const translated = connectAndPlaceAttribute(
    before,
    host.id,
    { ...attribute("role-new", 2), x: 0, y: 0 },
    "host-to-attribute",
  );

  assertNodesUnchanged(translated, snapshot);
  assert.notDeepEqual(
    { x: getAttribute(translated, "role-new").x, y: getAttribute(translated, "role-new").y },
    { x: 0, y: 0 },
  );
  assertNoDanglingEdges(translated);
});

test("attribute layout: incremental diagram placement preserves existing composite children", () => {
  const host = hostAttribute();
  const existing = [
    { ...attribute("street", 0), x: 100, y: 175 },
    { ...attribute("city", 1), x: 265, y: 90 },
  ];
  const before = incrementalDiagram(host, existing);
  const snapshot = snapshotNodes(before, [host.id, ...existing.map((candidate) => candidate.id)]);
  const previousEdges = structuredClone(before.edges);
  const translated = connectAndPlaceAttribute(before, host.id, {
    ...attribute("postcode", 2),
    x: 0,
    y: 0,
  });

  assertNodesUnchanged(translated, snapshot);
  assert.deepEqual(translated.edges.slice(0, previousEdges.length), previousEdges);
  assert.equal(
    translated.edges.some(
      (edge) => edge.id === "edge-postcode" && edge.sourceId === "postcode" && edge.targetId === host.id,
    ),
    true,
  );
  assertNoDanglingEdges(translated);
});

test("attribute layout: first composite child converts and resizes only its host", () => {
  const host = { ...hostAttribute(), isMultivalued: false, width: 110, height: 36 };
  const unrelatedEntity = { ...hostEntity(), id: "unrelated", x: 800, y: 500 };
  const unrelatedAttribute = { ...attribute("unrelated-attribute", 0), x: 760, y: 610 };
  const before: DiagramDocument = {
    ...incrementalDiagram(host, []),
    nodes: [host, unrelatedEntity, unrelatedAttribute],
    edges: [attributeEdge("edge-unrelated", unrelatedAttribute.id, unrelatedEntity.id)],
  };
  const unrelatedSnapshot = snapshotNodes(before, [unrelatedEntity.id, unrelatedAttribute.id]);
  const translated = connectAndPlaceAttribute(before, host.id, {
    ...attribute("first-child", 0),
    x: 0,
    y: 0,
  });
  const updatedHost = getAttribute(translated, host.id);

  assert.deepEqual(
    { width: updatedHost.width, height: updatedHost.height },
    getMultivaluedAttributeSize(host.label),
  );
  assert.equal(updatedHost.isMultivalued, true);
  assert.deepEqual({ x: updatedHost.x, y: updatedHost.y }, { x: host.x, y: host.y });
  assertNodesUnchanged(translated, unrelatedSnapshot);
  assert.notDeepEqual(
    { x: getAttribute(translated, "first-child").x, y: getAttribute(translated, "first-child").y },
    { x: 0, y: 0 },
  );
  assertNoDanglingEdges(translated);
});

test("attribute layout: a differently sized long label does not move or overlap existing attributes", () => {
  const host = hostEntity();
  const existing = [
    { ...attribute("short-a", 0), label: "A", x: 105, y: 205, width: 80 },
    { ...attribute("short-b", 1), label: "B", x: 275, y: 75, width: 80 },
  ];
  const before = incrementalDiagram(host, existing);
  const snapshot = snapshotNodes(before, [host.id, ...existing.map((candidate) => candidate.id)]);
  const translated = connectAndPlaceAttribute(before, host.id, {
    ...attribute("long-label", 2),
    label: "ATTRIBUTO_CON_UNA_LABEL_MOLTO_PIU_LUNGA",
    width: 360,
    x: 0,
    y: 0,
  });
  const next = getAttribute(translated, "long-label");

  assertNodesUnchanged(translated, snapshot);
  existing.forEach((candidate) => {
    assert.equal(
      boundsIntersect(
        buildAttributeLayoutBounds(host, candidate),
        buildAttributeLayoutBounds(host, next),
      ),
      false,
    );
  });
});

test("attribute layout: left connector corridor reserves the center slot", () => {
  const host = hostEntity();
  const centerY = host.y + host.height / 2;
  const reservedCenter: Bounds = {
    x: host.x - 160,
    y: centerY - 14,
    width: 180,
    height: 28,
  };
  const positioned = distributeAttributesAroundHost(
    host,
    Array.from({ length: 4 }, (_, index) => attribute(`attribute${index + 1}`, index)),
    { occupiedBounds: [reservedCenter] },
  );

  assert.deepEqual(layoutSides(host, positioned), ["left", "left", "top", "bottom"]);
  positioned
    .filter((candidate) => getDirectAttributeLayoutSide(host, candidate) === "left")
    .forEach((candidate) => {
      assert.notEqual(getAttributeMarkerCenter(candidate).y, centerY);
    });
  assertConstantPerimeterGap(host, positioned);
});

test("attribute layout: many attributes follow the perimeter without using right as normal layout", () => {
  const host = hostEntity();
  const attributes = Array.from({ length: 20 }, (_, index) => attribute(`attribute${index + 1}`, index));
  const positioned = distributeAttributesAroundHost(host, attributes);
  const sides = layoutSides(host, positioned);

  assert.equal(sides.includes("right"), false);
  assert.notDeepEqual(sides, Array.from({ length: 20 }, () => "left"));
  assert.equal(sides.filter((side) => side === "left").length, 3);
  assert.ok(sides.filter((side) => side === "top").length > 0);
  assert.ok(sides.filter((side) => side === "bottom").length > 0);
  assertConstantPerimeterGap(host, positioned);
});

test("attribute layout: relationship attributes use the same perimeter strategy", () => {
  const host = relationshipNode();
  const positioned = distributeAttributesAroundHost(
    host,
    Array.from({ length: 6 }, (_, index) => attribute(`relationship-attribute${index + 1}`, index)),
  );
  const sides = layoutSides(host, positioned);

  assert.equal(sides[0], "left");
  assert.ok(sides.includes("top"));
  assert.ok(sides.includes("bottom"));
  assertConstantPerimeterGap(host, positioned);
});

test("attribute layout: composite attribute children use the same perimeter strategy", () => {
  const host = hostAttribute();
  const positioned = distributeAttributesAroundHost(
    host,
    Array.from({ length: 6 }, (_, index) => attribute(`subattribute${index + 1}`, index)),
  );
  const sides = layoutSides(host, positioned);

  assert.equal(sides[0], "left");
  assert.ok(sides.includes("top"));
  assert.ok(sides.includes("bottom"));
  assertConstantPerimeterGap(host, positioned);
});

test("attribute layout: preserveInputOrder false keeps deterministic id order on perimeter slots", () => {
  const host = hostEntity();
  const positioned = distributeAttributesAroundHost(
    host,
    [attribute("attribute-c", 2), attribute("attribute-a", 0), attribute("attribute-b", 1)],
    { preserveInputOrder: false },
  );

  assert.deepEqual(positioned.map((candidate) => candidate.id), ["attribute-c", "attribute-a", "attribute-b"]);
  assert.deepEqual(
    layoutSides(host, [
      positioned.find((candidate) => candidate.id === "attribute-a")!,
      positioned.find((candidate) => candidate.id === "attribute-b")!,
      positioned.find((candidate) => candidate.id === "attribute-c")!,
    ]),
    ["left", "left", "left"],
  );
});

test("sql reverse diagram uses left-priority perimeter attribute layout", () => {
  const result = reverseSqlToDiagram(`
    CREATE TABLE WideEntity (
      id INTEGER PRIMARY KEY,
      ${Array.from({ length: 24 }, (_, index) => `col_${index + 1} TEXT`).join(",\n      ")}
    );
  `);
  const host = result.diagram.nodes.find((node): node is EntityNode => node.type === "entity" && node.label === "WideEntity");

  assert.ok(host);
  const attributeIds = new Set(
    result.diagram.edges
      .filter((edge) => edge.type === "attribute" && edge.sourceId === host.id)
      .map((edge) => edge.targetId),
  );
  const attributes = result.diagram.nodes.filter(
    (node): node is AttributeNode => node.type === "attribute" && attributeIds.has(node.id),
  );

  assert.equal(attributes.length, 25);
  assert.notDeepEqual(layoutSides(host, attributes), Array.from({ length: attributes.length }, () => "left"));
  assertUniqueMarkers(attributes);
  assertNoAttributeBoundsOverlap(host, attributes);
  assertNoDanglingEdges(result.diagram);
});
