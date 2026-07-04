import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DiagramCanvas } from "../src/canvas/DiagramCanvas.tsx";
import { DiagramEdgeView } from "../src/canvas/DiagramEdge.tsx";
import { DiagramNodeView } from "../src/canvas/DiagramNode.tsx";
import { I18nProvider } from "../src/i18n/I18nProvider.tsx";
import type { DiagramEdge, DiagramNode, ValidationIssue } from "../src/types/diagram.ts";
import { createEmptyDiagram, createNode, validateDiagram } from "../src/utils/diagram.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

test("validateDiagram non segnala entita isolate come disconnected", () => {
  const diagram = createEmptyDiagram("Test");
  const entity = createNode("entity", { x: 160, y: 120 }, diagram);
  const issues = validateDiagram({
    ...diagram,
    nodes: [entity],
  });

  assert.equal(issues.some((issue) => issue.id.startsWith("entity-disconnected-")), false);
});

test("DiagramNodeView con validationMessages renderizza title e badge compatto", () => {
  const node: DiagramNode = { id: "entity-a", type: "entity", label: "Cliente", x: 20, y: 30, width: 140, height: 64 };
  const markup = renderToStaticMarkup(
    React.createElement(
      I18nProvider,
      null,
      React.createElement(DiagramNodeView, {
        node,
        selected: false,
        dragging: false,
        pending: false,
        focused: false,
        focusable: true,
        validationLevel: "warning",
        validationCount: 1,
        validationMessages: ["Cardinalita mancante"],
        onFocus: () => undefined,
        onBlur: () => undefined,
        onPointerDown: () => undefined,
        onDoubleClick: () => undefined,
      }),
    ),
  );

  assert.match(markup, /<title>Cardinalita mancante<\/title>/);
  assert.match(markup, /diagram-validation-badge warning/);
  assert.doesNotMatch(markup, />!<\/text>/);
  assert.doesNotMatch(markup, />X<\/text>/);
});

test("DiagramEdgeView con validationMessages renderizza title e badge compatto", () => {
  const sourceNode: DiagramNode = { id: "entity-a", type: "entity", label: "Cliente", x: 20, y: 30, width: 140, height: 64 };
  const targetNode: DiagramNode = { id: "relationship-a", type: "relationship", label: "Ordine", x: 260, y: 20, width: 120, height: 72 };
  const edge: DiagramEdge = {
    id: "edge-a",
    type: "connector",
    sourceId: sourceNode.id,
    targetId: targetNode.id,
    label: "",
    lineStyle: "solid",
  };
  const markup = renderToStaticMarkup(
    React.createElement(
      I18nProvider,
      null,
      React.createElement(DiagramEdgeView, {
        edge,
        sourceNode,
        targetNode,
        selected: false,
        dragging: false,
        focused: false,
        focusable: true,
        validationLevel: "error",
        validationCount: 1,
        validationMessages: ["Collegamento non valido"],
        onFocus: () => undefined,
        onBlur: () => undefined,
        onPointerDown: () => undefined,
        onLabelPointerDown: () => undefined,
        onDoubleClick: () => undefined,
      }),
    ),
  );

  assert.match(markup, /<title>Collegamento non valido<\/title>/);
  assert.match(markup, /diagram-validation-badge error/);
  assert.doesNotMatch(markup, />!<\/text>/);
  assert.doesNotMatch(markup, />X<\/text>/);
});

test("DiagramCanvas aggrega e deduplica messaggi validation per lo stesso nodo", () => {
  const diagram = createEmptyDiagram("Validation");
  const node: DiagramNode = { id: "entity-a", type: "entity", label: "Cliente", x: 20, y: 30, width: 140, height: 64 };
  const issues: ValidationIssue[] = [
    { id: "issue-a", level: "warning", message: "Primo problema", targetId: node.id, targetType: "node" },
    { id: "issue-b", level: "warning", message: "Primo problema", targetId: node.id, targetType: "node" },
    { id: "issue-c", level: "error", message: "Secondo problema", targetId: node.id, targetType: "node" },
  ];

  const markup = renderToStaticMarkup(
    React.createElement(
      I18nProvider,
      null,
      React.createElement(DiagramCanvas, {
        diagram: { ...diagram, nodes: [node] },
        selection: { nodeIds: [], edgeIds: [] },
        tool: "select",
        mode: "edit",
        viewport: { x: 0, y: 0, zoom: 1 },
        issues,
        statusMessage: "",
        svgRef: React.createRef<SVGSVGElement>(),
        onViewportChange: () => undefined,
        onSelectionChange: () => undefined,
        onPreviewDiagram: () => undefined,
        onCommitDiagram: () => undefined,
        onCreateNode: () => "node-new",
        onCreateEdge: () => ({ success: false, message: "" }),
        onOpenCardinality: () => undefined,
        onOpenInheritanceType: () => undefined,
        onToolChange: () => undefined,
        onDeleteNode: () => undefined,
        onDeleteEdge: () => undefined,
        onDeleteSelection: () => undefined,
        onDeleteExternalIdentifier: () => undefined,
        onRenameNode: () => undefined,
        onRenameEdge: () => undefined,
        onStatusMessageChange: () => undefined,
      }),
    ),
  );

  assert.match(markup, /2 problemi:[\s\S]*Primo problema[\s\S]*Secondo problema/);
  assert.doesNotMatch(markup, /3 problemi/);
  assert.match(markup, /diagram-validation-badge error/);
});
