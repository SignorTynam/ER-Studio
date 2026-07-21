import assert from "node:assert/strict";
import test from "node:test";

import { fitBoundsToAspect, minimapEdgeSegments } from "../src/canvas/CanvasMinimap.tsx";
import type { Bounds } from "../src/types/diagram.ts";

// G1 — the minimap projection must stay uniform: fitBoundsToAspect grows the world
// bounds to the container aspect ratio so `preserveAspectRatio="none"` no longer stretches
// and the full-rect linear pointer mapping keeps clicks/drags on the right world point.

test("fitBoundsToAspect matches the container aspect and preserves the center", () => {
  const cases: Array<{ bounds: Bounds; aspect: number }> = [
    { bounds: { x: 10, y: 20, width: 300, height: 100 }, aspect: 1.5 }, // wide diagram
    { bounds: { x: -5, y: 4, width: 80, height: 400 }, aspect: 1.5 }, // tall diagram
    { bounds: { x: 0, y: 0, width: 150, height: 100 }, aspect: 1.5 }, // already matching
    { bounds: { x: -40, y: -40, width: 200, height: 200 }, aspect: 0.6 }, // portrait container
  ];

  for (const { bounds, aspect } of cases) {
    const result = fitBoundsToAspect(bounds, aspect);
    assert.ok(Math.abs(result.width / result.height - aspect) < 1e-9, "projected aspect matches container");
    assert.ok(
      Math.abs(result.x + result.width / 2 - (bounds.x + bounds.width / 2)) < 1e-9,
      "horizontal center preserved",
    );
    assert.ok(
      Math.abs(result.y + result.height / 2 - (bounds.y + bounds.height / 2)) < 1e-9,
      "vertical center preserved",
    );
    assert.ok(result.width >= bounds.width - 1e-9, "never shrinks width");
    assert.ok(result.height >= bounds.height - 1e-9, "never shrinks height");
  }
});

test("fitBoundsToAspect grows only the deficient axis", () => {
  // Square bounds into a 2:1 container widens (height stays put).
  const widened = fitBoundsToAspect({ x: 0, y: 0, width: 200, height: 200 }, 2);
  assert.equal(widened.height, 200);
  assert.equal(widened.width, 400);
  assert.equal(widened.x, -100);
  assert.equal(widened.y, 0);

  // Wide bounds into a 2:1 container grows height instead.
  const heightened = fitBoundsToAspect({ x: 0, y: 0, width: 400, height: 100 }, 2);
  assert.equal(heightened.width, 400);
  assert.equal(heightened.height, 200);
  assert.equal(heightened.y, -50);
  assert.equal(heightened.x, 0);
});

test("fitBoundsToAspect returns the input unchanged for degenerate inputs", () => {
  const zeroWidth: Bounds = { x: 0, y: 0, width: 0, height: 100 };
  assert.deepEqual(fitBoundsToAspect(zeroWidth, 2), zeroWidth);

  const valid: Bounds = { x: 1, y: 2, width: 100, height: 50 };
  assert.deepEqual(fitBoundsToAspect(valid, 0), valid);
  assert.deepEqual(fitBoundsToAspect(valid, Number.NaN), valid);
  assert.deepEqual(fitBoundsToAspect(valid, -3), valid);
});

// G2 — minimap connections are straight centre-to-centre segments.
test("minimapEdgeSegments links node centres and skips edges with a missing endpoint", () => {
  const nodes = [
    { id: "a", x: 0, y: 0, width: 100, height: 40 }, // centre 50, 20
    { id: "b", x: 200, y: 100, width: 60, height: 60 }, // centre 230, 130
  ];
  const segments = minimapEdgeSegments(nodes, [
    { id: "e1", sourceId: "a", targetId: "b" },
    { id: "e2", sourceId: "a", targetId: "ghost" },
  ]);
  assert.equal(segments.length, 1);
  assert.deepEqual(segments[0], { id: "e1", x1: 50, y1: 20, x2: 230, y2: 130 });
});

test("minimapEdgeSegments returns empty when there is nothing to connect", () => {
  const node = { id: "a", x: 0, y: 0, width: 10, height: 10 };
  assert.deepEqual(minimapEdgeSegments([node], undefined), []);
  assert.deepEqual(minimapEdgeSegments([node], []), []);
  assert.deepEqual(minimapEdgeSegments([], [{ id: "e", sourceId: "a", targetId: "b" }]), []);
});
