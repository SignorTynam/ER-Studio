import type { CSSProperties, KeyboardEvent, RefCallback } from "react";
import { StudioIcon, type StudioIconName } from "../../components/icons/StudioIcon";

export interface SqlExplorerTreeNode {
  id: string;
  label: string;
  detail?: string;
  title?: string;
  icon: StudioIconName;
  children?: SqlExplorerTreeNode[];
  actions?: Array<{
    id: string;
    label: string;
    icon: StudioIconName;
    onSelect: () => void;
  }>;
}

interface SqlExplorerTreeItemProps {
  node: SqlExplorerTreeNode;
  level: number;
  expandedIds: ReadonlySet<string>;
  selectedId: string;
  onActivate: (node: SqlExplorerTreeNode) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>, node: SqlExplorerTreeNode) => void;
  register: (id: string) => RefCallback<HTMLDivElement>;
}

export function SqlExplorerTreeItem({
  node,
  level,
  expandedIds,
  selectedId,
  onActivate,
  onKeyDown,
  register,
}: SqlExplorerTreeItemProps) {
  const expandable = Boolean(node.children?.length);
  const expanded = expandable && expandedIds.has(node.id);
  return (
    <div role="none">
      <div
        ref={register(node.id)}
        className={selectedId === node.id ? "sql-explorer-tree__row is-selected" : "sql-explorer-tree__row"}
        role="treeitem"
        aria-level={level}
        aria-selected={selectedId === node.id}
        aria-expanded={expandable ? expanded : undefined}
        tabIndex={selectedId === node.id ? 0 : -1}
        title={node.title}
        onClick={() => onActivate(node)}
        onKeyDown={(event) => onKeyDown(event, node)}
      >
        <span className="sql-explorer-tree__indent" style={{ "--sql-explorer-level": level } as CSSProperties} aria-hidden="true" />
        <span className="sql-explorer-tree__chevron" aria-hidden="true">
          {expandable ? <StudioIcon name={expanded ? "arrowDown" : "arrowRight"} /> : null}
        </span>
        <StudioIcon className="sql-explorer-tree__icon" name={node.icon} aria-hidden="true" />
        <span className="sql-explorer-tree__label">{node.label}</span>
        {node.detail ? <span className="sql-explorer-tree__detail">{node.detail}</span> : null}
        {node.actions?.length ? (
          <span className="sql-explorer-tree__actions" aria-label={node.label}>
            {node.actions.map((action) => (
              <button
                key={action.id}
                type="button"
                title={action.label}
                aria-label={`${action.label}: ${node.label}`}
                onClick={(event) => {
                  event.stopPropagation();
                  action.onSelect();
                }}
              >
                <StudioIcon name={action.icon} size={13} aria-hidden="true" />
              </button>
            ))}
          </span>
        ) : null}
      </div>
      {expanded ? (
        <div role="group">
          {node.children?.map((child) => (
            <SqlExplorerTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              expandedIds={expandedIds}
              selectedId={selectedId}
              onActivate={onActivate}
              onKeyDown={onKeyDown}
              register={register}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
