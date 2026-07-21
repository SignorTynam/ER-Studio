import assert from "node:assert/strict";
import test from "node:test";
import type { DiagramDocument, DiagramNode } from "../src/types/diagram.ts";
import { autoLayoutConceptualSelection } from "../src/utils/conceptualLayout.ts";

// G5b — "Organizza selezione" re-lays only the selected core nodes (and their anchored
// attributes) as a sub-diagram, keeping the rest of the diagram fixed and staying centred
// on the selection's original centre. Only node positions change.

function semanticNode(node: DiagramNode) {
  const { x: _x, y: _y, ...semantic } = node;
  return semantic;
}

function pos(id: string, diagram: DiagramDocument) {
  const node = diagram.nodes.find((candidate) => candidate.id === id);
  if (!node) throw new Error(`missing node ${id}`);
  return { x: node.x, y: node.y };
}

function sampleDiagram(): DiagramDocument {
  return {
    meta: { name: "selection", version: 7 },
    nodes: [
      { id: "a", type: "entity", label: "A", x: 100, y: 100, width: 140, height: 72, relationshipParticipations: [] },
      { id: "b", type: "entity", label: "B", x: 900, y: 820, width: 140, height: 72, relationshipParticipations: [] },
      { id: "rel", type: "relationship", label: "R", x: 500, y: 500, width: 120, height: 68 },
      { id: "a-code", type: "attribute", label: "Code", x: 120, y: 220, width: 112, height: 36 },
    ],
    edges: [
      { id: "a-rel", type: "connector", sourceId: "a", targetId: "rel", label: "", lineStyle: "solid" },
      { id: "b-rel", type: "connector", sourceId: "b", targetId: "rel", label: "", lineStyle: "solid" },
      { id: "a-code-edge", type: "attribute", sourceId: "a-code", targetId: "a", label: "", lineStyle: "solid" },
    ],
  } as DiagramDocument;
}

function clusterCentre(diagram: DiagramDocument, ids: string[]) {
  const nodes = diagram.nodes.filter((node) => ids.includes(node.id));
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
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

test("organize selection re-lays selected cores + attributes and leaves the rest fixed", () => {
  const input = sampleDiagram();
  const snapshot = structuredClone(input);
  const result = autoLayoutConceptualSelection(input, ["a", "b"]);

  assert.deepEqual(input, snapshot, "input diagram must not be mutated");
  assert.deepEqual(result.nodes.map(semanticNode), input.nodes.map(semanticNode), "only positions change");

  assert.deepEqual(pos("rel", result), pos("rel", input), "unselected relationship stays put");
  assert.notDeepEqual(pos("a", result), pos("a", input), "selected entity moves");
  assert.notDeepEqual(pos("b", result), pos("b", input), "selected entity moves");
  assert.notDeepEqual(pos("a-code", result), pos("a-code", input), "attribute of a selected host moves with it");

  result.nodes.forEach((node) => {
    assert.equal(node.x % 20, 0);
    assert.equal(node.y % 20, 0);
  });
});

test("organize selection is a no-op with fewer than two selected core nodes", () => {
  const input = sampleDiagram();
  assert.equal(autoLayoutConceptualSelection(input, ["a"]), input);
  assert.equal(autoLayoutConceptualSelection(input, ["a", "a-code"]), input);
  assert.equal(autoLayoutConceptualSelection(input, []), input);
});

test("organize selection keeps the selected cluster centred on its original centre", () => {
  const input = sampleDiagram();
  const cluster = ["a", "b", "a-code"];
  const before = clusterCentre(input, cluster);
  const after = clusterCentre(autoLayoutConceptualSelection(input, ["a", "b"]), cluster);
  assert.ok(Math.abs(after.cx - before.cx) <= 20, `cx preserved: ${after.cx} vs ${before.cx}`);
  assert.ok(Math.abs(after.cy - before.cy) <= 20, `cy preserved: ${after.cy} vs ${before.cy}`);
});
