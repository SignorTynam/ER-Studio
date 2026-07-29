import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { I18nProvider } from "../src/i18n/I18nProvider.tsx";
import { SelectionInspectorPanel } from "../src/components/inspector/SelectionInspectorPanel.tsx";
import { withTestLocale } from "./utils/i18nTestUtils.ts";
import type { DiagramEdge, DiagramNode, EntityNode, SelectionState } from "../src/types/diagram.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

function entity(overrides: Partial<EntityNode> = {}): EntityNode {
  return {
    id: "entity-1",
    type: "entity",
    label: "CLIENTE",
    x: 100,
    y: 100,
    width: 160,
    height: 72,
    relationshipParticipations: [],
    ...overrides,
  };
}

function renderInspector(
  selection: SelectionState,
  options: {
    selectedNode?: DiagramNode;
    selectedEdge?: DiagramEdge;
    editable?: boolean;
    locale?: "it" | "en" | "sq";
  } = {},
): string {
  const { editable = true, locale = "en" } = options;
  return withTestLocale(locale, () => renderToStaticMarkup(
    <I18nProvider>
      <SelectionInspectorPanel
        selection={selection}
        selectionItemCount={selection.nodeIds.length + selection.edgeIds.length}
        selectedNode={options.selectedNode}
        selectedEdge={options.selectedEdge}
        editable={editable}
        onRenameNode={() => undefined}
        onClose={() => undefined}
        closeLabel="Close"
      />
    </I18nProvider>,
  ));
}

test("inspector invites a selection when nothing is selected", () => {
  const markup = renderInspector({ nodeIds: [], edgeIds: [] });

  assert.match(markup, /No selection/);
  assert.doesNotMatch(markup, /selection-inspector__input/);
});

test("inspector reports the count and asks for a single element on a multi selection", () => {
  const markup = renderInspector({ nodeIds: ["a", "b", "c"], edgeIds: [] });

  assert.match(markup, /3 items/);
  assert.match(markup, /Select a single element/);
  // Con piu elementi non si modifica un nome solo.
  assert.doesNotMatch(markup, /selection-inspector__input/);
});

test("inspector edits the name inline instead of opening a prompt dialog", () => {
  const selected = entity();
  const markup = renderInspector({ nodeIds: [selected.id], edgeIds: [] }, { selectedNode: selected });

  assert.match(markup, /selection-inspector__input/);
  assert.match(markup, /value="CLIENTE"/);
  assert.match(markup, />Name</);
  assert.match(markup, />Type</);
  assert.match(markup, />Entity</);
});

test("inspector distinguishes a weak entity from a regular one", () => {
  const weak = entity({ isWeak: true });
  const markup = renderInspector({ nodeIds: [weak.id], edgeIds: [] }, { selectedNode: weak });

  assert.match(markup, />Weak entity</);
});

test("inspector shows the name read-only outside edit mode", () => {
  const selected = entity();
  const markup = renderInspector(
    { nodeIds: [selected.id], edgeIds: [] },
    { selectedNode: selected, editable: false },
  );

  assert.match(markup, /selection-inspector__input/);
  assert.match(markup, /readonly/i);
});

test("inspector strings resolve in every supported locale", () => {
  const selected = entity();

  for (const locale of ["it", "en", "sq"] as const) {
    const markup = renderInspector(
      { nodeIds: [selected.id], edgeIds: [] },
      { selectedNode: selected, locale },
    );

    // In dev una chiave mancante torna la chiave stessa: se comparisse nel
    // markup vorrebbe dire che quella lingua non ha la traduzione.
    assert.doesNotMatch(markup, /inspector\.(identity|heading|panel)\./, `chiave non tradotta in ${locale}`);
  }
});
