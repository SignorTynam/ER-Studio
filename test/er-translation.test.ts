import assert from "node:assert/strict";
import test from "node:test";

import type { AttributeNode, DiagramDocument, DiagramEdge, DiagramNode, EntityNode } from "../src/types/diagram.ts";
import {
  applyCompositeAttributeTranslation,
  applyErTranslationChoice,
  applyGeneralizationTranslation,
  buildErTranslationOverview,
  canOpenLogicalView,
  createEmptyErTranslationWorkspace,
  getErTranslationChoicesForItem,
} from "../src/utils/erTranslation.ts";

function createEntity(
  id: string,
  label: string,
  attributeIds: string[] = [],
): EntityNode {
  return {
    id,
    type: "entity",
    label,
    x: 0,
    y: 0,
    width: 160,
    height: 80,
    internalIdentifiers:
      attributeIds.length > 0
        ? [
            {
              id: `${id}-pk`,
              attributeIds,
            },
          ]
        : [],
    externalIdentifiers: [],
    relationshipParticipations: [],
  };
}

function createAttribute(
  id: string,
  label: string,
  options: Partial<AttributeNode> = {},
): AttributeNode {
  return {
    id,
    type: "attribute",
    label,
    x: 0,
    y: 0,
    width: 100,
    height: 40,
    isIdentifier: false,
    isCompositeInternal: false,
    isMultivalued: false,
    ...options,
  };
}

function createAttributeEdge(id: string, sourceId: string, targetId: string): DiagramEdge {
  return {
    id,
    type: "attribute",
    sourceId,
    targetId,
    label: "",
    lineStyle: "solid",
  };
}

function createInheritanceEdge(id: string, subtypeId: string, supertypeId: string): DiagramEdge {
  return {
    id,
    type: "inheritance",
    sourceId: subtypeId,
    targetId: supertypeId,
    label: "",
    lineStyle: "solid",
  };
}

function createOrderedWorkflowDiagram(): DiagramDocument {
  const nodes: DiagramNode[] = [
    createEntity("entity-persona", "PERSONA", ["attr-codice"]),
    createAttribute("attr-codice", "Codice", { isIdentifier: true }),
    createEntity("entity-impiegato", "IMPIEGATO"),
    createAttribute("attr-stipendio", "Stipendio"),
    createAttribute("attr-indirizzo", "INDIRIZZO", { isMultivalued: true, width: 140, height: 52 }),
    createAttribute("attr-via", "Via"),
  ];

  const edges: DiagramEdge[] = [
    createAttributeEdge("edge-codice", "attr-codice", "entity-persona"),
    createAttributeEdge("edge-stipendio", "attr-stipendio", "entity-impiegato"),
    createAttributeEdge("edge-indirizzo", "attr-indirizzo", "entity-persona"),
    createAttributeEdge("edge-via", "attr-via", "attr-indirizzo"),
    createInheritanceEdge("edge-isa", "entity-impiegato", "entity-persona"),
  ];

  return {
    meta: {
      name: "Workflow ordinato",
      version: 1,
    },
    notes: "",
    nodes,
    edges,
  };
}

function createCompositeDiagram(): DiagramDocument {
  const nodes: DiagramNode[] = [
    createEntity("entity-impiegato", "IMPIEGATO", ["attr-codice"]),
    createAttribute("attr-codice", "Codice", { isIdentifier: true }),
    createAttribute("attr-indirizzo", "INDIRIZZO", { isMultivalued: true, width: 140, height: 52 }),
    createAttribute("attr-localita", "LOCALITA"),
    createAttribute("attr-via", "Via"),
    createAttribute("attr-cap", "CAP"),
  ];

  const edges: DiagramEdge[] = [
    createAttributeEdge("edge-codice", "attr-codice", "entity-impiegato"),
    createAttributeEdge("edge-indirizzo", "attr-indirizzo", "entity-impiegato"),
    createAttributeEdge("edge-localita", "attr-localita", "attr-indirizzo"),
    createAttributeEdge("edge-via", "attr-via", "attr-localita"),
    createAttributeEdge("edge-cap", "attr-cap", "attr-localita"),
  ];

  return {
    meta: {
      name: "Attributo composto",
      version: 1,
    },
    notes: "",
    nodes,
    edges,
  };
}

test("la pipeline ER->ER blocca gli attributi composti finche esistono generalizzazioni aperte", () => {
  const diagram = createOrderedWorkflowDiagram();
  let workspace = createEmptyErTranslationWorkspace(diagram);
  let overview = buildErTranslationOverview(workspace);

  assert.equal(overview.steps.find((step) => step.id === "generalizations")?.pending, 1);
  assert.equal(overview.itemsByStep["composite-attributes"][0]?.status, "blocked");
  assert.match(
    overview.itemsByStep["composite-attributes"][0]?.blockedReason ?? "",
    /Risolvi prima le generalizzazioni/i,
  );
  assert.equal(canOpenLogicalView(workspace).allowed, false);

  const generalizationItem = overview.itemsByStep.generalizations[0];
  assert.ok(generalizationItem);
  const generalizationChoice = getErTranslationChoicesForItem(workspace, generalizationItem).find(
    (choice) => choice.rule === "generalization-collapse-up",
  );
  assert.ok(generalizationChoice);

  workspace = applyErTranslationChoice(
    diagram,
    workspace,
    generalizationChoice,
    generalizationItem.targetType,
    generalizationItem.id,
  );
  overview = buildErTranslationOverview(workspace);

  assert.equal(overview.itemsByStep.generalizations.length, 0);
  assert.equal(overview.itemsByStep["composite-attributes"][0]?.status, "pending");
  assert.equal(canOpenLogicalView(workspace).allowed, false);

  const compositeItem = overview.itemsByStep["composite-attributes"][0];
  assert.ok(compositeItem);
  const compositeChoice = getErTranslationChoicesForItem(workspace, compositeItem).find(
    (choice) => choice.rule === "composite-flatten-preserve",
  );
  assert.ok(compositeChoice);

  workspace = applyErTranslationChoice(diagram, workspace, compositeChoice, compositeItem.targetType, compositeItem.id);

  assert.equal(canOpenLogicalView(workspace).allowed, true);
  assert.equal(workspace.translatedDiagram.edges.some((edge) => edge.type === "inheritance"), false);
  assert.equal(
    workspace.translatedDiagram.nodes.some((node) => node.type === "attribute" && node.isMultivalued === true),
    false,
  );
});

test("applyGeneralizationTranslation risolve la gerarchia ISA dentro l'ER tradotto", () => {
  const translated = applyGeneralizationTranslation(createOrderedWorkflowDiagram(), {
    supertypeId: "entity-persona",
    rule: "generalization-collapse-up",
  });

  assert.equal(translated.nodes.some((node) => node.id === "entity-impiegato"), false);
  assert.equal(translated.edges.some((edge) => edge.type === "inheritance"), false);

  const stipendioNode = translated.nodes.find((node) => node.type === "attribute" && node.label === "Stipendio");
  assert.ok(stipendioNode);
  const stipendioOwnerEdge = translated.edges.find(
    (edge) =>
      edge.type === "attribute" &&
      ((edge.sourceId === stipendioNode.id && edge.targetId === "entity-persona") ||
        (edge.targetId === stipendioNode.id && edge.sourceId === "entity-persona")),
  );
  assert.ok(stipendioOwnerEdge);
});

test("applyCompositeAttributeTranslation espande ricorsivamente i foglia sull'owner ER", () => {
  const translated = applyCompositeAttributeTranslation(
    createCompositeDiagram(),
    "attr-indirizzo",
    "composite-flatten-prefixed",
  );

  assert.equal(translated.nodes.some((node) => node.id === "attr-indirizzo"), false);
  assert.equal(translated.nodes.some((node) => node.id === "attr-localita"), false);
  assert.equal(
    translated.nodes.some((node) => node.type === "attribute" && node.isMultivalued === true),
    false,
  );

  const expectedLeafLabels = ["INDIRIZZO_LOCALITA_Via", "INDIRIZZO_LOCALITA_CAP"];
  expectedLeafLabels.forEach((label) => {
    const node = translated.nodes.find((candidate) => candidate.type === "attribute" && candidate.label === label);
    assert.ok(node, `Attributo foglia tradotto non trovato: ${label}`);
    const ownerEdge = translated.edges.find(
      (edge) =>
        edge.type === "attribute" &&
        ((edge.sourceId === node.id && edge.targetId === "entity-impiegato") ||
          (edge.targetId === node.id && edge.sourceId === "entity-impiegato")),
    );
    assert.ok(ownerEdge, `Collegamento owner mancante per ${label}`);
  });
});
