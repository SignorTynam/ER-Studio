import type { MessageKey, TranslationParams } from "../i18n";
import type { DiagramDocument, DiagramNode, ValidationIssue } from "../types/diagram";
import type { StudioIconName } from "../components/icons/StudioIcon";

export type ValidationIssueTranslator = (key: MessageKey, params?: TranslationParams) => string;

export interface ValidationIssuePresentation {
  id: string;
  level: ValidationIssue["level"];
  targetId: string;
  targetType: ValidationIssue["targetType"];
  title: string;
  targetKind: string;
  message: string;
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
    };
  }

  const edge = diagram.edges.find((candidate) => candidate.id === issue.targetId);
  const labels = getEdgeLabels(diagram, issue);
  return {
    ...issue,
    title: edge ? `${labels.source} → ${labels.target}` : issue.targetId,
    targetKind: t("errors.panel.connection"),
    message: localizeValidationIssue(issue, diagram, t),
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
