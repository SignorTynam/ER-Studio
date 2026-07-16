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
import { getMultivaluedAttributeSize } from "../src/utils/diagram.ts";
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
      col_1 TEXT,
      col_2 TEXT,
      col_3 TEXT,
      col_4 TEXT,
      col_5 TEXT,
      col_6 TEXT,
      col_7 TEXT,
      col_8 TEXT,
      col_9 TEXT
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

  assert.equal(attributes.length, 10);
  assert.notDeepEqual(layoutSides(host, attributes), Array.from({ length: attributes.length }, () => "left"));
  assertConstantPerimeterGap(host, attributes);
});
