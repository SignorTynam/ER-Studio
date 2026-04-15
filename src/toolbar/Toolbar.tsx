import { InspectorPanel } from "../inspector/InspectorPanel";
import type {
  AttributeNode,
  DiagramDocument,
  DiagramEdge,
  DiagramNode,
  EntityNode,
  EditorMode,
  SelectionState,
  ToolKind,
  ValidationIssue,
} from "../types/diagram";
import { useI18n } from "../i18n/useI18n";
import { getToolDefinitions } from "../utils/toolConfig";

const PRIMARY_TOOLS: ToolKind[] = ["select", "move", "entity", "relationship", "connector", "inheritance"];
type ToolbarContext = "empty" | "node" | "edge" | "multi";
const TOOL_CONTEXT_MAP: Record<ToolbarContext, ToolKind[]> = {
  empty: ["select", "move", "entity", "relationship", "connector", "inheritance"],
  node: ["select", "move", "connector"],
  edge: ["select", "move"],
  multi: ["select", "move"],
};

interface ToolbarProps {
  diagram: DiagramDocument;
  selection: SelectionState;
  activeTool: ToolKind;
  mode: EditorMode;
  collapsed: boolean;
  canUndo: boolean;
  canRedo: boolean;
  selectionItemCount: number;
  issues: ValidationIssue[];
  selectedNode?: DiagramNode;
  selectedEdge?: DiagramEdge;
  onToolChange: (tool: ToolKind) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDuplicateSelection: () => void;
  onDeleteSelection: () => void;
  onCreateAttributeForSelection: () => void;
  onEntityInternalIdentifiersChange: (
    entityId: string,
    patch: Partial<EntityNode>,
    attributePatches: Record<string, Partial<AttributeNode>>,
  ) => void;
  onEntityExternalIdentifiersChange: (entityId: string, patch: Partial<EntityNode>) => void;
  onRenameSelection: () => void;
  onNodeChange: (nodeId: string, patch: Partial<DiagramNode>) => void;
  onNodesChange: (nodeIds: string[], patch: Partial<DiagramNode>) => void;
  onEdgeChange: (edgeId: string, patch: Partial<DiagramEdge>) => void;
  onAlign: (axis: "left" | "center" | "top" | "middle") => void;
  onIssueSelect: (issue: ValidationIssue) => void;
  onToggleCollapse: () => void;
}

function ToolIcon({ tool }: { tool: ToolKind }) {
  if (tool === "select") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <path d="M5 4l7.6 14.8 1.8-5.4 5.6-1.9L5 4z" fill="currentColor" />
      </svg>
    );
  }

  if (tool === "move") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <path d="M12 3l2.6 2.6H13v3h-2v-3H9.4L12 3zm0 18l-2.6-2.6H11v-3h2v3h1.6L12 21zM3 12l2.6-2.6V11h3v2h-3v1.6L3 12zm18 0l-2.6 2.6V13h-3v-2h3V9.4L21 12z" fill="currentColor" />
      </svg>
    );
  }

  if (tool === "entity") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <rect x="4" y="6" width="16" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (tool === "relationship") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <polygon points="12,4 20,12 12,20 4,12" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (tool === "connector") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <path d="M5 8h6v8h8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (tool === "inheritance") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <path d="M12 19V8" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8.5 11L12 7l3.5 4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
      <path d="M5 5l7 14 2-6 6-2z" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ActionIcon({ kind }: { kind: "undo" | "redo" | "rename" | "delete" | "duplicate" | "attribute" | "weak" | "identifier" | "multivalue" }) {
  if (kind === "undo") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <path d="M9 7L4 12l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 12h8a5 5 0 010 10h-2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (kind === "redo") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <path d="M15 7l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M19 12h-8a5 5 0 000 10h2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (kind === "rename") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <path d="M4 20h4l10-10-4-4L4 16v4z" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 6l4 4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (kind === "delete") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <path d="M6 7h12M9 7V5h6v2M8 9l1 10h6l1-10" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (kind === "duplicate") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <rect x="8" y="8" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <rect x="4" y="4" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (kind === "weak") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <rect x="3" y="6" width="18" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <rect x="6.5" y="9" width="11" height="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (kind === "identifier") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <circle cx="15" cy="9" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M13 11L5 19v3h3v-2h2v-2h2v-2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (kind === "multivalue") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
      <circle cx="8" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <line x1="11.5" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="1.8" />
      <line x1="15.5" y1="8" x2="15.5" y2="16" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function getContextLabel(selectedNode?: DiagramNode, selectedEdge?: DiagramEdge, selectionItemCount?: number, diagram?: DiagramDocument) {
  if (selectedNode) {
    if (selectedNode.type === "attribute") {
      if (diagram) {
        const attributeEdge = diagram.edges.find((edge) => edge.type === "attribute" && (edge.sourceId === selectedNode.id || edge.targetId === selectedNode.id));
        if (attributeEdge) {
          const hostId = attributeEdge.sourceId === selectedNode.id ? attributeEdge.targetId : attributeEdge.sourceId;
          const hostNode = diagram.nodes.find((node) => node.id === hostId);
          if (hostNode) {
            return hostNode.label.toUpperCase();
          }
        }
      }
      return null;
    }

    return null;
  }

  return selectedEdge || (selectionItemCount ?? 0) > 1 ? null : null;
}

export function Toolbar(props: ToolbarProps) {
  const { t } = useI18n();
  const canEdit = props.mode === "edit";
  const toolDefinitions = getToolDefinitions();
  const availableTools = PRIMARY_TOOLS.reduce<typeof toolDefinitions>((result, tool) => {
    const match = toolDefinitions.find((item) => item.tool === tool);
    if (match) {
      result.push(match);
    }
    return result;
  }, []);
  const context: ToolbarContext =
    props.selectionItemCount === 0
      ? "empty"
      : props.selectedNode
        ? "node"
        : props.selectedEdge
          ? "edge"
          : "multi";
  const contextTools = new Set(TOOL_CONTEXT_MAP[context]);
  const visibleTools = availableTools.filter((item) => contextTools.has(item.tool));
  const showInlineInspector = !props.collapsed && context !== "empty";

  function renderContextActions() {
    if (context === "empty") {
      return null;
    }

    if (context === "node") {
      return (
        <section className="toolbar-section">
          <div className="toolbar-section-label">{t("toolbar.sections.selectionActions")}</div>
          <div className="toolbar-list toolbar-list-tight">
            {props.selectedNode && props.selectedNode.type === "entity" ? (() => {
              const selectedEntity = props.selectedNode;
              return (
                <button
                  type="button"
                  className={selectedEntity.isWeak ? "toolbar-action-button active" : "toolbar-action-button"}
                  onClick={() => props.onNodeChange(selectedEntity.id, { isWeak: !selectedEntity.isWeak })}
                  disabled={!canEdit}
                  title={t("toolbar.actions.weakEntity")}
                >
                  <ActionIcon kind="weak" />
                  <span className="tool-label">{t("toolbar.actions.weakEntity")}</span>
                </button>
              );
            })() : null}
            {props.selectedNode && props.selectedNode.type === "attribute" ? (() => {
              const attrNode = props.selectedNode;
              const isLinkedToRel = props.diagram.edges.some(edge => {
                if (edge.type !== "attribute") return false;
                const isLinked = edge.sourceId === attrNode.id || edge.targetId === attrNode.id;
                if (!isLinked) return false;
                const hostId = edge.sourceId === attrNode.id ? edge.targetId : edge.sourceId;
                const hostNode = props.diagram.nodes.find(node => node.id === hostId);
                return hostNode?.type === "relationship";
              });

              return (
                <>
                  {!attrNode.isMultivalued && !attrNode.isCompositeInternal && (
                    <button
                      type="button"
                      className={attrNode.isIdentifier ? "toolbar-action-button active" : "toolbar-action-button"}
                      onClick={() => props.onNodeChange(attrNode.id, { isIdentifier: !attrNode.isIdentifier })}
                      disabled={!canEdit || isLinkedToRel}
                      title={t("toolbar.actions.identifierAttribute")}
                    >
                      <ActionIcon kind="identifier" />
                      <span className="tool-label">{t("toolbar.actions.identifier")}</span>
                    </button>
                  )}
                  {!attrNode.isIdentifier && !attrNode.isCompositeInternal && (
                    <button
                      type="button"
                      className={attrNode.isMultivalued ? "toolbar-action-button active" : "toolbar-action-button"}
                      onClick={() => props.onNodeChange(attrNode.id, { isMultivalued: !attrNode.isMultivalued })}
                      disabled={!canEdit}
                      title={t("toolbar.actions.multivaluedAttribute")}
                    >
                      <ActionIcon kind="multivalue" />
                      <span className="tool-label">{t("toolbar.actions.multivalued")}</span>
                    </button>
                  )}
                </>
              );
            })() : null}
            {props.selectedNode &&
            (props.selectedNode.type === "entity" ||
              props.selectedNode.type === "relationship" ||
              props.selectedNode.type === "attribute") ? (
              <button
                type="button"
                className="toolbar-action-button"
                onClick={props.onCreateAttributeForSelection}
                disabled={!canEdit}
                title={
                  props.selectedNode.type === "attribute"
                    ? t("toolbar.actions.addSubAttribute")
                    : t("toolbar.actions.addAttribute")
                }
              >
                <ActionIcon kind="attribute" />
                <span className="tool-label">
                  {props.selectedNode.type === "attribute"
                    ? t("toolbar.actions.subAttribute")
                    : t("toolbar.actions.addAttribute")}
                </span>
              </button>
            ) : null}
            <button
              type="button"
              className="toolbar-action-button"
              onClick={props.onRenameSelection}
              disabled={!canEdit}
              title={t("toolbar.actions.renameSelection")}
            >
              <ActionIcon kind="rename" />
              <span className="tool-label">{t("common.actions.rename")}</span>
            </button>
            <button
              type="button"
              className="toolbar-action-button"
              onClick={props.onDuplicateSelection}
              disabled={!canEdit}
              title={t("toolbar.actions.duplicateSelection")}
            >
              <ActionIcon kind="duplicate" />
              <span className="tool-label">{t("common.actions.duplicate")}</span>
            </button>
            <button
              type="button"
              className="toolbar-action-button"
              onClick={props.onDeleteSelection}
              disabled={!canEdit}
              title={t("toolbar.actions.deleteSelection")}
            >
              <ActionIcon kind="delete" />
              <span className="tool-label">{t("common.actions.delete")}</span>
            </button>
          </div>
        </section>
      );
    }

    if (context === "edge") {
      return (
        <section className="toolbar-section">
          <div className="toolbar-section-label">{t("toolbar.sections.edgeActions")}</div>
          <div className="toolbar-list toolbar-list-tight">
            <button
              type="button"
              className="toolbar-action-button"
              onClick={props.onRenameSelection}
              disabled={!canEdit}
              title={t("toolbar.actions.renameEdge")}
            >
              <ActionIcon kind="rename" />
              <span className="tool-label">{t("common.actions.rename")}</span>
            </button>
            <button
              type="button"
              className="toolbar-action-button"
              onClick={props.onDuplicateSelection}
              disabled={!canEdit}
              title={t("toolbar.actions.duplicateEdge")}
            >
              <ActionIcon kind="duplicate" />
              <span className="tool-label">{t("common.actions.duplicate")}</span>
            </button>
            <button
              type="button"
              className="toolbar-action-button"
              onClick={props.onDeleteSelection}
              disabled={!canEdit}
              title={t("toolbar.actions.deleteEdge")}
            >
              <ActionIcon kind="delete" />
              <span className="tool-label">{t("common.actions.delete")}</span>
            </button>
          </div>
        </section>
      );
    }

    if (props.collapsed) {
      return (
        <section className="toolbar-section">
          <div className="toolbar-section-label">{t("toolbar.sections.multiActions")}</div>
          <div className="toolbar-list toolbar-list-tight">
            <button
              type="button"
              className="toolbar-action-button"
              onClick={props.onDuplicateSelection}
              disabled={!canEdit}
              title={t("toolbar.actions.duplicateSelection")}
            >
              <ActionIcon kind="duplicate" />
              <span className="tool-label">{t("common.actions.duplicate")}</span>
            </button>
            <button
              type="button"
              className="toolbar-action-button"
              onClick={props.onDeleteSelection}
              disabled={!canEdit}
              title={t("toolbar.actions.deleteSelection")}
            >
              <ActionIcon kind="delete" />
              <span className="tool-label">{t("common.actions.delete")}</span>
            </button>
          </div>
        </section>
      );
    }

    return (
      <section className="toolbar-section">
        <div className="toolbar-section-label">{t("toolbar.sections.multiActions")}</div>
        <div className="toolbar-list toolbar-list-tight">
          <button
            type="button"
            className="toolbar-action-button toolbar-action-button-text"
            onClick={() => props.onAlign("left")}
            disabled={!canEdit}
            title={t("toolbar.actions.alignLeft")}
          >
            <span className="tool-label">{t("toolbar.actions.alignLeftShort")}</span>
          </button>
          <button
            type="button"
            className="toolbar-action-button toolbar-action-button-text"
            onClick={() => props.onAlign("center")}
            disabled={!canEdit}
            title={t("toolbar.actions.alignCenter")}
          >
            <span className="tool-label">{t("toolbar.actions.alignCenterShort")}</span>
          </button>
          <button
            type="button"
            className="toolbar-action-button toolbar-action-button-text"
            onClick={() => props.onAlign("top")}
            disabled={!canEdit}
            title={t("toolbar.actions.alignTop")}
          >
            <span className="tool-label">{t("toolbar.actions.alignTopShort")}</span>
          </button>
          <button
            type="button"
            className="toolbar-action-button toolbar-action-button-text"
            onClick={() => props.onAlign("middle")}
            disabled={!canEdit}
            title={t("toolbar.actions.alignMiddle")}
          >
            <span className="tool-label">{t("toolbar.actions.alignMiddleShort")}</span>
          </button>
          <button
            type="button"
            className="toolbar-action-button"
            onClick={props.onDuplicateSelection}
            disabled={!canEdit}
            title={t("toolbar.actions.duplicateSelection")}
          >
            <ActionIcon kind="duplicate" />
            <span className="tool-label">{t("common.actions.duplicate")}</span>
          </button>
          <button
            type="button"
            className="toolbar-action-button"
            onClick={props.onDeleteSelection}
            disabled={!canEdit}
            title={t("toolbar.actions.deleteSelection")}
          >
            <ActionIcon kind="delete" />
            <span className="tool-label">{t("common.actions.delete")}</span>
          </button>
        </div>
      </section>
    );
  }

  return (
    <aside className={props.collapsed ? "toolbar-panel collapsed" : "toolbar-panel"}>
      <div className={props.collapsed ? "panel-head-row panel-head-row-compact" : "panel-head-row"}>
        {!props.collapsed ? (
          <div>
            <div className="panel-heading">
              {props.selectedNode?.type === "entity"
                ? t("toolbar.context.entitySelected")
                : props.selectedNode?.type === "relationship"
                  ? t("toolbar.context.relationshipSelected")
                  : props.selectedNode?.type === "attribute"
                    ? (() => {
                        const hostLabel = getContextLabel(
                          props.selectedNode,
                          props.selectedEdge,
                          props.selectionItemCount,
                          props.diagram,
                        );
                        return hostLabel
                          ? t("toolbar.context.attributeOf", { label: hostLabel })
                          : t("toolbar.context.attributeSelected");
                      })()
                    : props.selectedEdge
                      ? t("toolbar.context.edgeSelected")
                      : props.selectionItemCount > 1
                        ? t("toolbar.context.multiSelection")
                        : t("toolbar.context.canvas")}
            </div>
          </div>
        ) : null}
        <button
          type="button"
          className="panel-toggle"
          onClick={props.onToggleCollapse}
          aria-label={props.collapsed ? t("toolbar.context.expandActions") : t("toolbar.context.collapseActions")}
          title={props.collapsed ? t("common.actions.expand") : t("common.actions.collapse")}
        >
          {props.collapsed ? ">" : "<"}
        </button>
      </div>

      {!props.collapsed || context !== "empty" ? renderContextActions() : null}

      {context === "empty" && (
        <section className="toolbar-section">
          <div className="toolbar-section-label">{t("toolbar.sections.tools")}</div>
          <div className="toolbar-list">
            {visibleTools.map((item) => {
              const disabled = props.mode === "view" && item.tool !== "select" && item.tool !== "move";
              return (
                <button
                  key={item.tool}
                  type="button"
                  className={props.activeTool === item.tool ? "tool-button active" : "tool-button"}
                  onClick={() => props.onToolChange(item.tool)}
                  disabled={disabled}
                  title={`${item.label} (${item.shortcut.toUpperCase()})`}
                  aria-label={item.label}
                >
                  <ToolIcon tool={item.tool} />
                  <span className="tool-label">{item.label}</span>
                  <span className="tool-shortcut">{item.shortcut.toUpperCase()}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {showInlineInspector ? (
        <InspectorPanel
          embedded
          hideQuickActions
          diagram={props.diagram}
          selection={props.selection}
          mode={props.mode}
          issues={props.issues}
          onNodeChange={props.onNodeChange}
          onNodesChange={props.onNodesChange}
          onEdgeChange={props.onEdgeChange}
          onDeleteSelection={props.onDeleteSelection}
          onDuplicateSelection={props.onDuplicateSelection}
          onAlign={props.onAlign}
          onCreateAttributeForSelection={props.onCreateAttributeForSelection}
          onEntityInternalIdentifiersChange={props.onEntityInternalIdentifiersChange}
          onEntityExternalIdentifiersChange={props.onEntityExternalIdentifiersChange}
          onIssueSelect={props.onIssueSelect}
          onRenameSelection={props.onRenameSelection}
        />
      ) : null}

    </aside>
  );
}
