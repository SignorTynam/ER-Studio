import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefCallback } from "react";
import { useI18n } from "../../i18n/useI18n";
import { createSqliteDownloadName } from "../../utils/sqlPlayground";
import type { SqlExplorerDatabase, SqlExplorerMetadata, SqlExplorerTable } from "./sqlExplorerTypes";
import { SqlExplorerTreeItem, type SqlExplorerTreeNode } from "./SqlExplorerTreeItem";

export interface SqlExplorerTreeActions {
  openQuery: (sql: string, execute: boolean) => void;
  showDefinition: (title: string, sql: string) => void;
  copyName: (name: string) => void;
  reverse: () => void;
}

const NOOP_TREE_ACTIONS: SqlExplorerTreeActions = {
  openQuery: () => undefined,
  showDefinition: () => undefined,
  copyName: () => undefined,
  reverse: () => undefined,
};

function category(id: string, label: string, children: SqlExplorerTreeNode[]): SqlExplorerTreeNode {
  return { id, label: `${label} (${children.length})`, icon: "folder", children };
}

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function objectActions(name: string, sql: string | null, actions: SqlExplorerTreeActions, labels: Record<string, string>) {
  return [
    ...(sql ? [{ id: "definition", label: labels.showDefinition, icon: "code" as const, onSelect: () => actions.showDefinition(name, sql) }] : []),
    { id: "copy", label: labels.copyName, icon: "copy" as const, onSelect: () => actions.copyName(name) },
  ];
}

function tableNode(database: SqlExplorerDatabase, table: SqlExplorerTable, labels: Record<string, string>, actions: SqlExplorerTreeActions): SqlExplorerTreeNode {
  const id = `database:${database.name}:table:${table.name}`;
  const qualifiedName = `${quoteIdentifier(database.name)}.${quoteIdentifier(table.name)}`;
  const columns = table.columns.map((column) => {
    const flags = [
      column.primaryKeyPosition > 0 ? `${labels.primaryKey} ${column.primaryKeyPosition}` : "",
      column.notNull ? labels.notNull : "",
      column.references.length > 0 ? labels.foreignKey : "",
      column.defaultValue !== null ? `${labels.defaultValue}: ${column.defaultValue}` : "",
    ].filter(Boolean);
    return {
      id: `${id}:column:${column.position}:${column.name}`,
      label: column.name,
      detail: [column.dataType, ...flags].filter(Boolean).join(" · "),
      title: [column.name, column.dataType, ...flags].filter(Boolean).join(" · "),
      icon: column.primaryKeyPosition > 0 ? "simpleId" : "attribute",
      actions: [{ id: "copy", label: labels.copyName, icon: "copy" as const, onSelect: () => actions.copyName(column.name) }],
    } satisfies SqlExplorerTreeNode;
  });
  const foreignKeys = table.foreignKeys.map((foreignKey) => ({
    id: `${id}:foreign-key:${foreignKey.id}:${foreignKey.sequence}`,
    label: `${foreignKey.fromColumn} → ${foreignKey.toTable}.${foreignKey.toColumn ?? "?"}`,
    detail: `ON UPDATE ${foreignKey.onUpdate} · ON DELETE ${foreignKey.onDelete}`,
    icon: "relationship" as const,
  }));
  const indexes = table.indexes.map((index) => ({
    id: `${id}:index:${index.name}`,
    label: index.name,
    detail: `${index.unique ? labels.unique : labels.nonUnique} · ${index.columns.join(", ")}`,
    icon: "list" as const,
    actions: objectActions(index.name, index.sql, actions, labels),
  }));
  return {
    id,
    label: table.name,
    title: table.sql ?? table.name,
    icon: "database",
    actions: [
      { id: "rows", label: labels.showRows, icon: "viewOn", onSelect: () => actions.openQuery(`SELECT * FROM ${qualifiedName} LIMIT 100;`, true) },
      { id: "select", label: labels.generateSelect, icon: "code", onSelect: () => actions.openQuery(`SELECT *\nFROM ${qualifiedName}\nLIMIT 100;`, false) },
      ...objectActions(table.name, table.sql, actions, labels),
      { id: "reverse", label: labels.reverse, icon: "databaseReverse", onSelect: actions.reverse },
    ],
    children: [
      category(`${id}:columns`, labels.columns, columns),
      category(`${id}:foreign-keys`, labels.foreignKeys, foreignKeys),
      category(`${id}:indexes`, labels.indexes, indexes),
    ],
  };
}

function buildTree(metadata: SqlExplorerMetadata, schemaName: string, labels: Record<string, string>, actions: SqlExplorerTreeActions): SqlExplorerTreeNode {
  const databaseNodes = metadata.databases.map((database) => {
    const baseId = `database:${database.name}`;
    const tables = database.tables.map((table) => tableNode(database, table, labels, actions));
    const views = database.views.map((view) => {
      const qualifiedName = `${quoteIdentifier(database.name)}.${quoteIdentifier(view.name)}`;
      return {
        id: `${baseId}:view:${view.name}`,
        label: view.name,
        title: view.sql ?? view.name,
        icon: "viewOn" as const,
        actions: [
          { id: "rows", label: labels.showRows, icon: "viewOn" as const, onSelect: () => actions.openQuery(`SELECT * FROM ${qualifiedName} LIMIT 100;`, true) },
          { id: "select", label: labels.generateSelect, icon: "code" as const, onSelect: () => actions.openQuery(`SELECT *\nFROM ${qualifiedName}\nLIMIT 100;`, false) },
          ...objectActions(view.name, view.sql, actions, labels),
        ],
      };
    });
    const indexes = database.indexes.map((index) => ({
      id: `${baseId}:index:${index.name}`,
      label: index.name,
      detail: `${index.tableName} · ${index.unique ? labels.unique : labels.nonUnique} · ${index.columns.join(", ")}`,
      icon: "list" as const,
      actions: objectActions(index.name, index.sql, actions, labels),
    }));
    const triggers = database.triggers.map((trigger) => ({
      id: `${baseId}:trigger:${trigger.name}`,
      label: trigger.name,
      detail: trigger.tableName,
      title: trigger.sql ?? trigger.name,
      icon: "code" as const,
      actions: objectActions(trigger.name, trigger.sql, actions, labels),
    }));
    return {
      id: baseId,
      label: database.name,
      detail: database.file || labels.memory,
      icon: "database" as const,
      children: [
        category(`${baseId}:tables`, labels.tables, tables),
        category(`${baseId}:views`, labels.views, views),
        category(`${baseId}:indexes`, labels.indexes, indexes),
        category(`${baseId}:triggers`, labels.triggers, triggers),
      ],
    };
  });
  return { id: "sqlite-database", label: createSqliteDownloadName(schemaName), icon: "database", children: databaseNodes };
}

function collectIds(node: SqlExplorerTreeNode, result = new Set<string>()): Set<string> {
  result.add(node.id);
  node.children?.forEach((child) => collectIds(child, result));
  return result;
}

function collectVisible(node: SqlExplorerTreeNode, expandedIds: ReadonlySet<string>, parentId: string | null, result: Array<{ node: SqlExplorerTreeNode; parentId: string | null }> = []) {
  result.push({ node, parentId });
  if (expandedIds.has(node.id)) node.children?.forEach((child) => collectVisible(child, expandedIds, node.id, result));
  return result;
}

export function SqlExplorerTree({ metadata, schemaName, actions = NOOP_TREE_ACTIONS }: { metadata: SqlExplorerMetadata; schemaName: string; actions?: SqlExplorerTreeActions }) {
  const { t } = useI18n();
  const labels = useMemo(() => ({
    tables: t("sqlExplorer.tables"), columns: t("sqlExplorer.columns"), views: t("sqlExplorer.views"),
    indexes: t("sqlExplorer.indexes"), triggers: t("sqlExplorer.triggers"), foreignKeys: t("sqlExplorer.foreignKeys"),
    primaryKey: t("sqlExplorer.primaryKey"), foreignKey: t("sqlExplorer.foreignKey"), notNull: t("sqlExplorer.notNull"),
    defaultValue: t("sqlExplorer.defaultValue"), unique: t("sqlExplorer.unique"), nonUnique: t("sqlExplorer.nonUnique"),
    memory: t("sqlExplorer.memoryDatabase"), showRows: t("sqlExplorer.actions.showRows"),
    generateSelect: t("sqlExplorer.actions.generateSelect"), showDefinition: t("sqlExplorer.actions.showDefinition"),
    copyName: t("sqlExplorer.actions.copyName"), reverse: t("sqlExplorer.actions.reverse"),
  }), [t]);
  const root = useMemo(() => buildTree(metadata, schemaName, labels, actions), [actions, labels, metadata, schemaName]);
  const allIds = useMemo(() => collectIds(root), [root]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(["sqlite-database", "database:main"]));
  const [selectedId, setSelectedId] = useState("sqlite-database");
  const elementRefs = useRef(new Map<string, HTMLDivElement>());
  const visible = useMemo(() => collectVisible(root, expandedIds, null), [expandedIds, root]);

  useEffect(() => {
    setExpandedIds((current) => new Set([...current].filter((id) => allIds.has(id))));
    if (!allIds.has(selectedId)) setSelectedId(root.id);
  }, [allIds, root.id, selectedId]);

  function focusNode(id: string): void {
    setSelectedId(id);
    window.requestAnimationFrame(() => elementRefs.current.get(id)?.focus());
  }

  function toggle(node: SqlExplorerTreeNode, force?: boolean): void {
    if (!node.children?.length) return;
    setExpandedIds((current) => {
      const next = new Set(current);
      const expand = force ?? !next.has(node.id);
      if (expand) next.add(node.id); else next.delete(node.id);
      return next;
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>, node: SqlExplorerTreeNode): void {
    const index = visible.findIndex((entry) => entry.node.id === node.id);
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? visible.length - 1 : Math.min(Math.max(index + (event.key === "ArrowDown" ? 1 : -1), 0), visible.length - 1);
      focusNode(visible[nextIndex].node.id);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      if (node.children?.length && !expandedIds.has(node.id)) toggle(node, true); else if (node.children?.length) focusNode(node.children[0].id);
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (expandedIds.has(node.id)) toggle(node, false); else { const parentId = visible[index]?.parentId; if (parentId) focusNode(parentId); }
      return;
    }
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(node.id); toggle(node); }
  }

  const register = (id: string): RefCallback<HTMLDivElement> => (element) => {
    if (element) elementRefs.current.set(id, element); else elementRefs.current.delete(id);
  };

  return (
    <div className="sql-explorer-tree" role="tree" aria-label={t("sqlExplorer.treeLabel")}>
      <SqlExplorerTreeItem node={root} level={1} expandedIds={expandedIds} selectedId={selectedId}
        onActivate={(node) => { setSelectedId(node.id); toggle(node); }} onKeyDown={handleKeyDown} register={register} />
    </div>
  );
}
