import type { MessageKey, TranslationParams } from "../i18n";
import type { DiagramDocument, DiagramNode, ValidationIssue } from "../types/diagram";
import type { StudioIconName } from "../components/icons/StudioIcon";

export type ValidationIssueTranslator = (key: MessageKey, params?: TranslationParams) => string;

/**
 * Categoria di azione suggerita per un problema di validazione.
 * - `auto`: l'app puo applicare la correzione senza scegliere semantica al posto dell'utente
 *   (rimozioni non ambigue: collegamento invalido, attributo orfano, cardinalita fuori posto).
 * - `navigate`: l'app porta l'utente nel posto giusto (inspector/modale) e lascia decidere lui.
 */
export type ValidationIssueActionKind = "auto" | "navigate";

/**
 * Tipo semantico dell'azione: l'esecuzione concreta vive in App.tsx.
 * La presentazione resta pura e descrive solo *quale* azione offrire, non la esegue.
 */
export type ValidationIssueActionType =
  | "delete-edge"
  | "delete-attribute"
  | "clear-attribute-cardinality"
  | "open-cardinality"
  | "create-attribute"
  | "open-external-identifier"
  | "focus-role"
  | "open-properties";

export interface ValidationIssueAction {
  id: string;
  type: ValidationIssueActionType;
  kind: ValidationIssueActionKind;
  label: string;
  icon?: StudioIconName;
}

export interface ValidationIssuePresentation {
  id: string;
  level: ValidationIssue["level"];
  targetId: string;
  targetType: ValidationIssue["targetType"];
  title: string;
  targetKind: string;
  message: string;
  actions: ValidationIssueAction[];
}

function getNodeKindLabel(node: DiagramNode, t: ValidationIssueTranslator): string {
  if (node.type === "entity") return t("common.entities.entity");
  if (node.type === "relationship") return t("common.entities.relationship");
  if (node.type === "attribute") return t("common.entities.attribute");
  return t("common.entities.element");
}

function getTargetNodeLabel(diagram: DiagramDocument, issue: ValidationIssue): string {
  if (issue.targetType !== "node") return issue.targetId;
  return diagram.nodes.find((node) => node.id === issue.targetId)?.label ?? issue.targetId;
}

function getEdgeLabels(diagram: DiagramDocument, issue: ValidationIssue): { source: string; target: string } {
  if (issue.targetType !== "edge") return { source: issue.targetId, target: issue.targetId };
  const edge = diagram.edges.find((candidate) => candidate.id === issue.targetId);
  if (!edge) return { source: issue.targetId, target: issue.targetId };
  return {
    source: diagram.nodes.find((node) => node.id === edge.sourceId)?.label ?? edge.sourceId,
    target: diagram.nodes.find((node) => node.id === edge.targetId)?.label ?? edge.targetId,
  };
}

export function localizeValidationIssue(
  issue: ValidationIssue,
  diagram: DiagramDocument,
  t: ValidationIssueTranslator,
): string {
  const label = getTargetNodeLabel(diagram, issue);
  const edgeLabels = getEdgeLabels(diagram, issue);

  if (issue.id.startsWith("attribute-conflict-")) return t("validationIssues.attributeConflict", { label });
  if (issue.id.startsWith("attribute-invalid-cardinality-")) return t("validationIssues.attributeInvalidCardinality", { label });
  if (issue.id.startsWith("attribute-")) return t("validationIssues.attributeMissingHost", { label });
  if (issue.id.startsWith("relationship-identifier-")) return t("validationIssues.relationshipIdentifierAttribute", { label });
  if (issue.id.startsWith("relationship-")) return t("validationIssues.relationshipNeedsEntities", { label });
  if (issue.id.startsWith("loop-role-missing-")) return t("validationIssues.loopRoleMissing");
  if (issue.id.startsWith("loop-role-duplicate-")) return t("validationIssues.loopRoleDuplicate");
  if (issue.id.startsWith("entity-no-attributes-")) return t("validationIssues.entityNoAttributes", { label });
  if (issue.id.startsWith("subtype-no-attributes-")) return t("validationIssues.subtypeNoAttributes", { label });
  if (issue.id.startsWith("supertype-no-relationship-")) return t("validationIssues.supertypeNoRelationship", { label });
  if (issue.id.startsWith("weak-entity-")) return t("validationIssues.weakEntityNoExternalIdentifier", { label });
  if (issue.id.startsWith("missing-")) return t("validationIssues.edgeMissingEndpoint", { id: issue.targetId });
  if (issue.id.startsWith("invalid-")) return t("validationIssues.edgeInvalidConnection", edgeLabels);
  if (issue.id.startsWith("duplicate-")) return t("validationIssues.edgeDuplicate", edgeLabels);
  if (issue.id.startsWith("cardinality-")) return t("validationIssues.edgeMissingCardinality", edgeLabels);
  return issue.message;
}

/**
 * Mappa PURA problema -> azione suggerita (catalogo Fase H2).
 * Regola non negoziabile: dove la scelta e semantica NON si indovina, si apre il posto giusto (navigate).
 * Restituisce [] quando nessuna azione sensata esiste (es. relazione senza entita, supertipo senza gerarchia).
 * L'ordine dei prefissi rispecchia `localizeValidationIssue` (il primo match vince).
 */
export function getValidationIssueActions(
  issue: ValidationIssue,
  t: ValidationIssueTranslator,
): ValidationIssueAction[] {
  const make = (
    type: ValidationIssueActionType,
    kind: ValidationIssueActionKind,
    labelKey: MessageKey,
    icon?: StudioIconName,
  ): ValidationIssueAction => ({ id: `${issue.id}::${type}`, type, kind, label: t(labelKey), icon });

  if (issue.id.startsWith("attribute-conflict-"))
    return [make("open-properties", "navigate", "validationIssues.actions.openProperties", "info")];
  if (issue.id.startsWith("attribute-invalid-cardinality-"))
    return [make("clear-attribute-cardinality", "auto", "validationIssues.actions.removeCardinality", "cardinality")];
  if (issue.id.startsWith("attribute-"))
    return [make("delete-attribute", "auto", "validationIssues.actions.deleteAttribute", "delete")];
  if (issue.id.startsWith("relationship-identifier-"))
    return [make("open-properties", "navigate", "validationIssues.actions.openProperties", "info")];
  if (issue.id.startsWith("relationship-")) return [];
  if (issue.id.startsWith("loop-role-missing-"))
    return [make("focus-role", "navigate", "validationIssues.actions.setRole", "role")];
  if (issue.id.startsWith("loop-role-duplicate-"))
    return [make("focus-role", "navigate", "validationIssues.actions.setRole", "role")];
  if (issue.id.startsWith("entity-no-attributes-"))
    return [make("create-attribute", "navigate", "validationIssues.actions.addAttribute", "attribute")];
  if (issue.id.startsWith("subtype-no-attributes-"))
    return [make("create-attribute", "navigate", "validationIssues.actions.addAttribute", "attribute")];
  if (issue.id.startsWith("supertype-no-relationship-")) return [];
  if (issue.id.startsWith("weak-entity-"))
    return [make("open-external-identifier", "navigate", "validationIssues.actions.addExternalIdentifier", "externalId")];
  if (issue.id.startsWith("missing-"))
    return [make("delete-edge", "auto", "validationIssues.actions.deleteLink", "delete")];
  if (issue.id.startsWith("invalid-"))
    return [make("delete-edge", "auto", "validationIssues.actions.deleteLink", "delete")];
  if (issue.id.startsWith("duplicate-"))
    return [make("delete-edge", "auto", "validationIssues.actions.removeDuplicate", "delete")];
  if (issue.id.startsWith("cardinality-"))
    return [make("open-cardinality", "navigate", "validationIssues.actions.setCardinality", "cardinality")];
  return [];
}

export function validationIssueTargetExists(diagram: DiagramDocument, issue: ValidationIssue): boolean {
  return issue.targetType === "node"
    ? diagram.nodes.some((node) => node.id === issue.targetId)
    : diagram.edges.some((edge) => edge.id === issue.targetId);
}

export function presentValidationIssue(
  issue: ValidationIssue,
  diagram: DiagramDocument,
  t: ValidationIssueTranslator,
): ValidationIssuePresentation {
  if (issue.targetType === "node") {
    const node = diagram.nodes.find((candidate) => candidate.id === issue.targetId);
    return {
      ...issue,
      title: node?.label ?? issue.targetId,
      targetKind: node ? getNodeKindLabel(node, t) : t("common.entities.element"),
      message: localizeValidationIssue(issue, diagram, t),
      actions: getValidationIssueActions(issue, t),
    };
  }

  const edge = diagram.edges.find((candidate) => candidate.id === issue.targetId);
  const labels = getEdgeLabels(diagram, issue);
  return {
    ...issue,
    title: edge ? `${labels.source} → ${labels.target}` : issue.targetId,
    targetKind: t("errors.panel.connection"),
    message: localizeValidationIssue(issue, diagram, t),
    actions: getValidationIssueActions(issue, t),
  };
}

export function sortValidationIssuePresentations(
  issues: readonly ValidationIssuePresentation[],
): ValidationIssuePresentation[] {
  return [...issues].sort((left, right) => {
    const level = (left.level === "error" ? 0 : 1) - (right.level === "error" ? 0 : 1);
    if (level !== 0) return level;
    const title = left.title.localeCompare(right.title, undefined, { sensitivity: "base" });
    return title !== 0 ? title : left.id.localeCompare(right.id);
  });
}

export function getValidationActivityPresentation(issues: readonly ValidationIssue[]): {
  icon: StudioIconName;
  badge?: number;
} {
  if (issues.length === 0) return { icon: "errors" };
  return {
    icon: issues.some((issue) => issue.level === "error") ? "error" : "warning",
    badge: issues.length,
  };
}
