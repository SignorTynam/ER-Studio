import assert from "node:assert/strict";
import test from "node:test";
import type { DiagramDocument, DiagramEdge, DiagramNode, ValidationIssue } from "../src/types/diagram.ts";
import { createEmptyDiagram, validateDiagram } from "../src/utils/diagram.ts";
import { createAttributeForHost } from "../src/utils/attributeLayout.ts";
import { computeValidationAutoFix } from "../src/utils/validationAutoFix.ts";
import type { ValidationIssueActionType } from "../src/utils/validationIssuePresentation.ts";

function diagramWith(nodes: DiagramNode[], edges: DiagramEdge[] = []): DiagramDocument {
  return { ...createEmptyDiagram("AutoFix"), nodes, edges };
}

function issueIds(diagram: DiagramDocument): string[] {
  return validateDiagram(diagram).map((issue) => issue.id);
}

/**
 * Verifica end-to-end del modello per un auto-fix: il problema `prefix` esiste,
 * l'esecuzione lo risolve senza introdurre nuovi problemi, l'input non viene
 * mutato (quindi `commitDiagram(next, prev)` -> undo ripristina prev).
 */
function assertAutoFixResolves(diagram: DiagramDocument, prefix: string, actionType: ValidationIssueActionType) {
  const before = issueIds(diagram);
  assert.ok(before.some((id) => id.startsWith(prefix)), `prima del fix deve esistere un problema "${prefix}"`);

  const issue = validateDiagram(diagram).find((candidate) => candidate.id.startsWith(prefix)) as ValidationIssue;
  const snapshotBefore = JSON.stringify(diagram);

  const next = computeValidationAutoFix(diagram, issue, actionType);
  assert.ok(next, "l'auto-fix deve restituire un diagramma");
  assert.notEqual(next, diagram, "l'auto-fix deve restituire un nuovo documento");
  assert.equal(JSON.stringify(diagram), snapshotBefore, "l'auto-fix non deve mutare l'input (undo affidabile)");

  const after = issueIds(next as DiagramDocument);
  assert.ok(!after.some((id) => id.startsWith(prefix)), `dopo il fix il problema "${prefix}" deve sparire`);
  const beforeSet = new Set(before);
  for (const id of after) {
    assert.ok(beforeSet.has(id), `l'auto-fix non deve introdurre nuovi problemi: "${id}"`);
  }
}

test("delete-attribute risolve un attributo orfano (error -> valido)", () => {
  const attribute: DiagramNode = { id: "A1", type: "attribute", label: "codice", x: 100, y: 100, width: 120, height: 56 };
  assertAutoFixResolves(diagramWith([attribute]), "attribute-", "delete-attribute");
});

test("delete-edge risolve un collegamento a un elemento mancante (missing-)", () => {
  const entity: DiagramNode = { id: "E1", type: "entity", label: "Cliente", x: 20, y: 30, width: 140, height: 64 };
  const edge: DiagramEdge = { id: "edge-ghost", type: "connector", sourceId: "E1", targetId: "GHOST", label: "", lineStyle: "solid" };
  assertAutoFixResolves(diagramWith([entity], [edge]), "missing-", "delete-edge");
});

test("delete-edge risolve un collegamento non valido (invalid-)", () => {
  const first: DiagramNode = { id: "E1", type: "entity", label: "Cliente", x: 20, y: 30, width: 140, height: 64 };
  const second: DiagramNode = { id: "E2", type: "entity", label: "Ordine", x: 260, y: 30, width: 140, height: 64 };
  // Un connector entita<->entita non rispetta la sintassi Chen -> invalid-.
  const edge: DiagramEdge = { id: "edge-bad", type: "connector", sourceId: "E1", targetId: "E2", label: "", lineStyle: "solid" };
  assertAutoFixResolves(diagramWith([first, second], [edge]), "invalid-", "delete-edge");
});

test("clear-attribute-cardinality azzera la cardinalita del solo attributo bersaglio", () => {
  // Lo stato "cardinalita non ammessa" e per lo piu auto-risanato dalla
  // sincronizzazione degli identificatori: qui verifichiamo direttamente la
  // trasformazione (azzera il bersaglio, lascia intatto il resto, non muta l'input).
  const target: DiagramNode = { id: "A1", type: "attribute", label: "codice", isIdentifier: true, cardinality: "(1,N)", x: 200, y: 140, width: 120, height: 56 };
  const other: DiagramNode = { id: "A2", type: "attribute", label: "note", cardinality: "(0,N)", x: 360, y: 140, width: 120, height: 56 };
  const diagram = diagramWith([target, other]);
  const snapshot = JSON.stringify(diagram);
  const issue: ValidationIssue = { id: "attribute-invalid-cardinality-A1", level: "error", message: "", targetId: "A1", targetType: "node" };

  const next = computeValidationAutoFix(diagram, issue, "clear-attribute-cardinality");
  assert.ok(next, "l'auto-fix deve restituire un diagramma");
  assert.equal(JSON.stringify(diagram), snapshot, "l'auto-fix non deve mutare l'input (undo affidabile)");

  const fixedTarget = (next as DiagramDocument).nodes.find((node) => node.id === "A1");
  const untouched = (next as DiagramDocument).nodes.find((node) => node.id === "A2");
  assert.equal(fixedTarget?.type === "attribute" ? fixedTarget.cardinality : "unset", undefined, "il bersaglio non deve piu avere cardinalita");
  assert.equal(untouched?.type === "attribute" ? untouched.cardinality : "unset", "(0,N)", "gli altri attributi restano invariati");
});

test("create-attribute aggiunge un attributo e risolve entity-no-attributes (error -> valido)", () => {
  const entity: DiagramNode = { id: "E1", type: "entity", label: "Cliente", x: 20, y: 30, width: 140, height: 64 };
  const diagram = diagramWith([entity]);
  assert.ok(issueIds(diagram).some((id) => id.startsWith("entity-no-attributes-")), "prima deve esistere l'avviso");
  const snapshot = JSON.stringify(diagram);

  const result = createAttributeForHost(diagram, "E1");
  assert.ok(result, "deve creare l'attributo");
  assert.equal(JSON.stringify(diagram), snapshot, "l'input non deve essere mutato (undo affidabile)");

  assert.ok(
    !issueIds(result!.diagram).some((id) => id.startsWith("entity-no-attributes-")),
    "dopo, l'avviso deve sparire",
  );
  const attribute = result!.diagram.nodes.find((node) => node.id === result!.attributeId);
  assert.equal(attribute?.type, "attribute", "il nuovo nodo deve essere un attributo");
  assert.ok(
    result!.diagram.edges.some(
      (edge) => edge.type === "attribute" && (edge.sourceId === result!.attributeId || edge.targetId === result!.attributeId),
    ),
    "il nuovo attributo deve essere collegato all'host",
  );
});

test("createAttributeForHost rifiuta un host inesistente", () => {
  const diagram = diagramWith([{ id: "E1", type: "entity", label: "X", x: 0, y: 0, width: 140, height: 64 }]);
  assert.equal(createAttributeForHost(diagram, "GHOST"), null);
});

test("computeValidationAutoFix ignora le azioni non-auto (navigate)", () => {
  const entity: DiagramNode = { id: "E1", type: "entity", label: "Solo", x: 0, y: 0, width: 140, height: 64 };
  const diagram = diagramWith([entity]);
  const issue: ValidationIssue = { id: "entity-no-attributes-E1", level: "warning", message: "", targetId: "E1", targetType: "node" };
  const navigateActions: ValidationIssueActionType[] = ["create-attribute", "open-properties", "open-cardinality", "open-external-identifier", "focus-role"];
  for (const action of navigateActions) {
    assert.equal(computeValidationAutoFix(diagram, issue, action), null, `${action} non e un auto-fix`);
  }
});
