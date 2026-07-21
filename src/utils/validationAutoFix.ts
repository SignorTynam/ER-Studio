import type { DiagramDocument, ValidationIssue } from "../types/diagram";
import { removeSelection } from "./diagram";
import type { ValidationIssueActionType } from "./validationIssuePresentation";

/**
 * Calcola il diagramma risultante da un auto-fix di validazione, in modo PURO.
 * Restituisce un nuovo documento (mai muta l'input) oppure `null` se l'azione
 * non e un auto-fix. App.tsx passa il risultato a `commitDiagram(next, prev)`,
 * cosi ogni correzione resta un singolo undo.
 *
 * Regola Fase H: qui vivono solo correzioni NON ambigue (rimozioni e reset di
 * cardinalita). Le scelte semantiche restano all'utente (azioni `navigate`).
 */
export function computeValidationAutoFix(
  diagram: DiagramDocument,
  issue: ValidationIssue,
  actionType: ValidationIssueActionType,
): DiagramDocument | null {
  switch (actionType) {
    case "delete-edge":
      // missing- / invalid- / duplicate-: il target e l'arco stesso.
      return removeSelection(diagram, { nodeIds: [], edgeIds: [issue.targetId] });
    case "delete-attribute":
      // attribute- (orfano): rimuove il nodo attributo e i suoi archi.
      return removeSelection(diagram, { nodeIds: [issue.targetId], edgeIds: [] });
    case "clear-attribute-cardinality":
      // attribute-invalid-cardinality-: azzera la cardinalita non ammessa.
      return {
        ...diagram,
        nodes: diagram.nodes.map((node) =>
          node.id === issue.targetId && node.type === "attribute"
            ? { ...node, cardinality: undefined }
            : node,
        ),
      };
    default:
      return null;
  }
}
