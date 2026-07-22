import assert from "node:assert/strict";
import test from "node:test";
import type { ValidationIssue } from "../src/types/diagram.ts";
import {
  getValidationIssueActions,
  type ValidationIssueAction,
} from "../src/utils/validationIssuePresentation.ts";

// Traduttore stub: restituisce la chiave, cosi possiamo verificare il wiring delle label i18n.
const t = ((key: string) => key) as never;

function issueFor(id: string, targetType: ValidationIssue["targetType"]): ValidationIssue {
  return { id, level: "error", message: "", targetId: "target-1", targetType };
}

function actionsFor(id: string, targetType: ValidationIssue["targetType"] = "node"): ValidationIssueAction[] {
  return getValidationIssueActions(issueFor(id, targetType), t);
}

// Catalogo H2 confermato: 5 auto / 8 navigate / 2 senza azione.
const CATALOG: Array<{
  id: string;
  targetType?: ValidationIssue["targetType"];
  type: ValidationIssueAction["type"] | null;
  kind: ValidationIssueAction["kind"] | null;
  labelKey?: string;
}> = [
  { id: "attribute-conflict-1", type: "open-properties", kind: "navigate", labelKey: "validationIssues.actions.openProperties" },
  { id: "attribute-invalid-cardinality-1", type: "clear-attribute-cardinality", kind: "auto", labelKey: "validationIssues.actions.removeCardinality" },
  { id: "attribute-1", type: "delete-attribute", kind: "auto", labelKey: "validationIssues.actions.deleteAttribute" },
  { id: "relationship-identifier-1", type: "open-properties", kind: "navigate" },
  { id: "relationship-1", type: null, kind: null },
  { id: "loop-role-missing-1", type: "focus-role", kind: "navigate", labelKey: "validationIssues.actions.setRole" },
  { id: "loop-role-duplicate-1", type: "focus-role", kind: "navigate" },
  { id: "entity-no-attributes-1", type: "create-attribute", kind: "auto", labelKey: "validationIssues.actions.addAttribute" },
  { id: "subtype-no-attributes-1", type: "create-attribute", kind: "auto" },
  { id: "supertype-no-relationship-1", type: null, kind: null },
  { id: "weak-entity-1", type: "open-external-identifier", kind: "navigate", labelKey: "validationIssues.actions.addExternalIdentifier" },
  { id: "missing-1", targetType: "edge", type: "delete-edge", kind: "auto", labelKey: "validationIssues.actions.deleteLink" },
  { id: "invalid-1", targetType: "edge", type: "delete-edge", kind: "auto" },
  { id: "duplicate-1", targetType: "edge", type: "delete-edge", kind: "auto", labelKey: "validationIssues.actions.removeDuplicate" },
  { id: "cardinality-1", targetType: "edge", type: "open-cardinality", kind: "navigate", labelKey: "validationIssues.actions.setCardinality" },
];

test("getValidationIssueActions mappa ogni tipo di problema al catalogo H2", () => {
  for (const entry of CATALOG) {
    const result = actionsFor(entry.id, entry.targetType);
    if (entry.type === null) {
      assert.deepEqual(result, [], `${entry.id} non deve proporre azioni`);
      continue;
    }
    assert.equal(result.length, 1, `${entry.id} deve proporre una sola azione`);
    const [action] = result;
    assert.equal(action.type, entry.type, `${entry.id} -> type`);
    assert.equal(action.kind, entry.kind, `${entry.id} -> kind`);
    assert.equal(action.id, `${entry.id}::${entry.type}`, `${entry.id} -> id azione stabile`);
    if (entry.labelKey) assert.equal(action.label, entry.labelKey, `${entry.id} -> label i18n`);
  }
});

test("ordine dei prefissi: i piu specifici vincono sui catch-all", () => {
  // Senza l'ordine giusto questi verrebbero assorbiti da "attribute-" / "relationship-".
  assert.equal(actionsFor("attribute-invalid-cardinality-9")[0]?.type, "clear-attribute-cardinality");
  assert.equal(actionsFor("attribute-conflict-9")[0]?.type, "open-properties");
  assert.equal(actionsFor("relationship-identifier-9")[0]?.type, "open-properties");
});

test("auto = rimozioni + aggiunta attributo; tutto il resto e navigate", () => {
  const autoTypes = new Set<ValidationIssueAction["type"]>([
    "delete-edge",
    "delete-attribute",
    "clear-attribute-cardinality",
    "create-attribute",
  ]);
  for (const entry of CATALOG) {
    for (const action of actionsFor(entry.id, entry.targetType)) {
      assert.equal(action.kind, autoTypes.has(action.type) ? "auto" : "navigate", action.type);
    }
  }
});
