import assert from "node:assert/strict";
import test from "node:test";
import type { AttributeNode, Bounds, DiagramDocument, DiagramNode } from "../src/types/diagram.ts";
import { buildAttributeLayoutBounds } from "../src/utils/attributeLayout.ts";
import { autoLayoutConceptualDiagram } from "../src/utils/conceptualLayout.ts";

function semanticNode(node: DiagramNode) {
  const { x: _x, y: _y, ...semantic } = node;
  return semantic;
}

function overlaps(left: Bounds, right: Bounds): boolean {
  return left.x < right.x + right.width
    && left.x + left.width > right.x
    && left.y < right.y + right.height
    && left.y + left.height > right.y;
}

function richDiagram(): DiagramDocument {
  return {
    meta: { name: "Conceptual layout", version: 7 },
    notes: "preserve me",
    nodes: [
      {
        id: "customer", type: "entity", label: "Customer", x: 920, y: 740, width: 160, height: 76,
        internalIdentifiers: [{ id: "customer-id", attributeIds: ["customer-code"] }],
        externalIdentifiers: [{
          id: "customer-ext",
          importedParts: [{ id: "part-1", relationshipId: "places", sourceEntityId: "order", importedIdentifierId: "order-id", importedIdentifierKind: "internal" }],
          localAttributeIds: ["customer-code"],
        }],
        relationshipParticipations: [{ id: "customer-places", relationshipId: "places", cardinality: "(0,N)" }],
      },
      {
        id: "order", type: "entity", label: "Order", x: 120, y: 80, width: 140, height: 72,
        internalIdentifiers: [{ id: "order-id", attributeIds: ["order-code"] }],
        relationshipParticipations: [{ id: "order-places", relationshipId: "places", cardinality: "(1,1)" }],
      },
      { id: "places", type: "relationship", label: "Places", x: 150, y: 90, width: 120, height: 68 },
      { id: "customer-code", type: "attribute", label: "Code", x: 180, y: 100, width: 112, height: 36, isIdentifier: true },
      { id: "address", type: "attribute", label: "Address", x: 190, y: 110, width: 120, height: 40, isMultivalued: true },
      { id: "street", type: "attribute", label: "Street", x: 200, y: 120, width: 112, height: 36 },
      { id: "order-code", type: "attribute", label: "Order code", x: 210, y: 130, width: 124, height: 36, isIdentifier: true },
    ],
    edges: [
      { id: "customer-link", type: "connector", sourceId: "customer", targetId: "places", label: "", lineStyle: "solid", participationId: "customer-places" },
      { id: "order-link", type: "connector", sourceId: "order", targetId: "places", label: "", lineStyle: "solid", participationId: "order-places" },
      { id: "customer-code-edge", type: "attribute", sourceId: "customer-code", targetId: "customer", label: "", lineStyle: "solid" },
      { id: "address-edge", type: "attribute", sourceId: "address", targetId: "customer", label: "", lineStyle: "solid" },
      { id: "street-edge", type: "attribute", sourceId: "street", targetId: "address", label: "", lineStyle: "solid" },
      { id: "order-code-edge", type: "attribute", sourceId: "order-code", targetId: "order", label: "", lineStyle: "solid" },
    ],
  };
}

test("conceptual auto-layout is deterministic and changes only node positions", () => {
  const input = richDiagram();
  const snapshot = structuredClone(input);
  const first = autoLayoutConceptualDiagram(input);
  const second = autoLayoutConceptualDiagram(input);

  assert.deepEqual(input, snapshot, "input diagram must not be mutated");
  assert.deepEqual(first, second);
  assert.deepEqual(first.nodes.map(semanticNode), input.nodes.map(semanticNode));
  assert.equal(first.edges, input.edges);
  assert.equal(first.generalizationGroups, input.generalizationGroups);
  assert.notDeepEqual(first.nodes.map(({ x, y }) => ({ x, y })), input.nodes.map(({ x, y }) => ({ x, y })));
  first.nodes.forEach((node) => {
    assert.equal(Number.isFinite(node.x) && Number.isFinite(node.y), true);
    assert.equal(node.x % 20, 0);
    assert.equal(node.y % 20, 0);
  });
});

test("conceptual auto-layout separates core nodes and anchors nested attributes", () => {
  const result = autoLayoutConceptualDiagram(richDiagram());
  const core = result.nodes.filter((node) => node.type !== "attribute");
  for (let left = 0; left < core.length; left += 1) {
    for (let right = left + 1; right < core.length; right += 1) {
      assert.equal(overlaps(core[left], core[right]), false, `${core[left].id} overlaps ${core[right].id}`);
    }
  }
  const byId = new Map(result.nodes.map((node) => [node.id, node]));
  const customer = byId.get("customer")!;
  const customerCode = byId.get("customer-code")!;
  const address = byId.get("address")!;
  const street = byId.get("street")!;
  assert.equal(overlaps(customer, buildAttributeLayoutBounds(customer, customerCode as AttributeNode)), false);
  assert.equal(overlaps(byId.get("customer")!, byId.get("address")!), false);
  assert.equal(overlaps(address, buildAttributeLayoutBounds(address, street as AttributeNode)), false);
});

test("conceptual auto-layout keeps generalization parents above subtypes", () => {
  const diagram: DiagramDocument = {
    meta: { name: "ISA", version: 1 }, notes: "",
    nodes: [
      { id: "parent", type: "entity", label: "Person", x: 800, y: 800, width: 140, height: 72 },
      { id: "child-a", type: "entity", label: "Student", x: 10, y: 10, width: 140, height: 72 },
      { id: "child-b", type: "entity", label: "Teacher", x: 20, y: 20, width: 140, height: 72 },
    ],
    edges: [
      { id: "isa-a", type: "inheritance", sourceId: "child-a", targetId: "parent", label: "", lineStyle: "solid", generalizationGroupId: "group" },
      { id: "isa-b", type: "inheritance", sourceId: "child-b", targetId: "parent", label: "", lineStyle: "solid", generalizationGroupId: "group" },
    ],
    generalizationGroups: [{ id: "group", supertypeId: "parent", subtypeIds: ["child-a", "child-b"], isaCompleteness: "total", isaDisjointness: "disjoint" }],
  };
  const result = autoLayoutConceptualDiagram(diagram);
  const byId = new Map(result.nodes.map((node) => [node.id, node]));
  assert.ok(byId.get("parent")!.y < byId.get("child-a")!.y);
  assert.ok(byId.get("parent")!.y < byId.get("child-b")!.y);
  assert.deepEqual(result.generalizationGroups, diagram.generalizationGroups);
});

test("conceptual auto-layout handles loop relationships and attribute-only diagrams", () => {
  const loop: DiagramDocument = {
    meta: { name: "Loop", version: 1 }, notes: "",
    nodes: [
      { id: "employee", type: "entity", label: "Employee", x: 0, y: 0, width: 140, height: 72 },
      { id: "manages", type: "relationship", label: "Manages", x: 0, y: 0, width: 120, height: 68 },
    ],
    edges: [
      { id: "manager", type: "connector", sourceId: "employee", targetId: "manages", label: "manager", lineStyle: "solid" },
      { id: "report", type: "connector", sourceId: "employee", targetId: "manages", label: "report", lineStyle: "solid" },
    ],
  };
  const loopResult = autoLayoutConceptualDiagram(loop);
  assert.equal(overlaps(loopResult.nodes[0], loopResult.nodes[1]), false);

  const attributesOnly: DiagramDocument = {
    meta: { name: "Orphans", version: 1 }, notes: "",
    nodes: [
      { id: "a", type: "attribute", label: "A", x: 0, y: 0, width: 112, height: 36 },
      { id: "b", type: "attribute", label: "B", x: 0, y: 0, width: 112, height: 36 },
    ], edges: [],
  };
  const orphanResult = autoLayoutConceptualDiagram(attributesOnly);
  assert.equal(overlaps(orphanResult.nodes[0], orphanResult.nodes[1]), false);
});
