import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { I18nProvider } from "../src/i18n/I18nProvider.tsx";
import { SelectionInspectorPanel } from "../src/components/inspector/SelectionInspectorPanel.tsx";
import { withTestLocale } from "./utils/i18nTestUtils.ts";
import type {
  AttributeNode,
  DiagramDocument,
  DiagramEdge,
  DiagramNode,
  EntityNode,
  SelectionState,
} from "../src/types/diagram.ts";

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

function attributeNode(overrides: Partial<AttributeNode> = {}): AttributeNode {
  return {
    id: "attr-1",
    type: "attribute",
    label: "codice",
    x: 240,
    y: 60,
    width: 96,
    height: 32,
    ...overrides,
  };
}

function emptyDiagram(nodes: DiagramNode[] = [], edges: DiagramEdge[] = []): DiagramDocument {
  return { meta: { name: "test", version: 1 }, notes: "", nodes, edges };
}

/** Collega un attributo al suo host con l'arco che usa il canvas. */
function attributeEdge(hostId: string, attributeId: string): DiagramEdge {
  return {
    id: `edge-${attributeId}`,
    type: "attribute",
    sourceId: hostId,
    targetId: attributeId,
    label: "",
    lineStyle: "solid",
  };
}

function renderInspector(
  selection: SelectionState,
  options: {
    selectedNode?: DiagramNode;
    selectedEdge?: DiagramEdge;
    editable?: boolean;
    locale?: "it" | "en" | "sq";
    diagram?: DiagramDocument;
    onAddAttribute?: () => void;
  } = {},
): string {
  const { editable = true, locale = "en" } = options;
  const diagram = options.diagram
    ?? emptyDiagram(options.selectedNode ? [options.selectedNode] : []);
  return withTestLocale(locale, () => renderToStaticMarkup(
    <I18nProvider>
      <SelectionInspectorPanel
        diagram={diagram}
        selectionItemCount={selection.nodeIds.length + selection.edgeIds.length}
        selectedNode={options.selectedNode}
        selectedEdge={options.selectedEdge}
        editable={editable}
        onRenameNode={() => undefined}
        onSelectNode={() => undefined}
        onAddAttribute={options.onAddAttribute}
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

test("inspector lists the attributes hosted by the selected element", () => {
  const host = entity();
  const code = attributeNode({ id: "attr-code", label: "codice", isIdentifier: true });
  const tags = attributeNode({ id: "attr-tags", label: "recapiti", isMultivalued: true });
  const diagram = emptyDiagram(
    [host, code, tags],
    [attributeEdge(host.id, code.id), attributeEdge(host.id, tags.id)],
  );

  const markup = renderInspector({ nodeIds: [host.id], edgeIds: [] }, { selectedNode: host, diagram });

  assert.match(markup, />Attributes</);
  assert.match(markup, />codice</);
  assert.match(markup, />recapiti</);
  // I flag del modello si leggono a colpo d'occhio invece che aprendo i modali.
  assert.match(markup, />Identifier</);
  assert.match(markup, />Multivalued</);
});

test("inspector says so when the selected element hosts no attribute", () => {
  const host = entity();
  const markup = renderInspector({ nodeIds: [host.id], edgeIds: [] }, { selectedNode: host });

  assert.match(markup, /No attribute is linked to this element/);
});

test("inspector offers add attribute only when the caller supports it", () => {
  const host = entity();

  const withAction = renderInspector(
    { nodeIds: [host.id], edgeIds: [] },
    { selectedNode: host, onAddAttribute: () => undefined },
  );
  const withoutAction = renderInspector({ nodeIds: [host.id], edgeIds: [] }, { selectedNode: host });
  const readOnly = renderInspector(
    { nodeIds: [host.id], edgeIds: [] },
    { selectedNode: host, onAddAttribute: () => undefined, editable: false },
  );

  assert.match(withAction, />Add attribute</);
  assert.doesNotMatch(withoutAction, />Add attribute</);
  assert.doesNotMatch(readOnly, />Add attribute</);
});

test("inspector shows internal identifiers with their composing attributes", () => {
  const code = attributeNode({ id: "attr-code", label: "codice" });
  const year = attributeNode({ id: "attr-year", label: "anno" });
  const host = entity({
    internalIdentifiers: [
      { id: "id-simple", attributeIds: [code.id] },
      { id: "id-composite", attributeIds: [code.id, year.id] },
    ],
  });
  const diagram = emptyDiagram(
    [host, code, year],
    [attributeEdge(host.id, code.id), attributeEdge(host.id, year.id)],
  );

  const markup = renderInspector({ nodeIds: [host.id], edgeIds: [] }, { selectedNode: host, diagram });

  assert.match(markup, />Internal identifiers</);
  assert.match(markup, />Simple</);
  assert.match(markup, />Composite</);
  assert.match(markup, />codice, anno</);
});

test("inspector does not list attributes for an attribute selection", () => {
  const host = entity();
  const composite = attributeNode({ id: "attr-address", label: "indirizzo", isCompositeInternal: true });
  const part = attributeNode({ id: "attr-street", label: "via" });
  const diagram = emptyDiagram(
    [host, composite, part],
    [attributeEdge(host.id, composite.id), attributeEdge(composite.id, part.id)],
  );

  // Selezionando la parte, l'helper degli archi restituirebbe anche il padre:
  // elencarlo come figlio sarebbe sbagliato, quindi la sezione non compare.
  const markup = renderInspector({ nodeIds: [part.id], edgeIds: [] }, { selectedNode: part, diagram });

  assert.doesNotMatch(markup, />Attributes</);
  assert.doesNotMatch(markup, />indirizzo</);
  assert.match(markup, />Attribute</);
});

test("inspector does not offer entity-only sections for other node types", () => {
  const relationship: DiagramNode = {
    id: "rel-1",
    type: "relationship",
    label: "ACQUISTA",
    x: 0,
    y: 0,
    width: 120,
    height: 60,
  };
  const markup = renderInspector(
    { nodeIds: [relationship.id], edgeIds: [] },
    { selectedNode: relationship },
  );

  // Gli identificatori interni vivono solo sulle entita.
  assert.doesNotMatch(markup, />Internal identifiers</);
  assert.match(markup, />Attributes</);
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
