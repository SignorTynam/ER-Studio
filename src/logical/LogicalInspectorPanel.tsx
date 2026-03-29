import type { LogicalEdge, LogicalModel, LogicalSelection, LogicalTable } from "../types/logical";

interface LogicalInspectorPanelProps {
  model: LogicalModel;
  selection: LogicalSelection;
  onSelectionChange: (selection: LogicalSelection) => void;
  onRenameTable: (tableId: string, name: string) => void;
  onRenameColumn: (tableId: string, columnId: string, name: string) => void;
}

function getSelectedTable(model: LogicalModel, selection: LogicalSelection): LogicalTable | undefined {
  if (selection.tableId) {
    return model.tables.find((table) => table.id === selection.tableId);
  }

  if (selection.columnId) {
    return model.tables.find((table) => table.columns.some((column) => column.id === selection.columnId));
  }

  return undefined;
}

function getSelectedEdge(model: LogicalModel, selection: LogicalSelection): LogicalEdge | undefined {
  if (!selection.edgeId) {
    return undefined;
  }

  return model.edges.find((edge) => edge.id === selection.edgeId);
}

function getColumnRoleLabel(isPk: boolean, isFk: boolean): string {
  if (isPk && isFk) {
    return "PK, FK";
  }

  if (isPk) {
    return "PK";
  }

  if (isFk) {
    return "FK";
  }

  return "Column";
}

export function LogicalInspectorPanel(props: LogicalInspectorPanelProps) {
  const selectedTable = getSelectedTable(props.model, props.selection);
  const selectedColumn = selectedTable?.columns.find((column) => column.id === props.selection.columnId);
  const selectedEdge = getSelectedEdge(props.model, props.selection);
  const selectedFk = selectedEdge
    ? props.model.foreignKeys.find((fk) => fk.id === selectedEdge.foreignKeyId)
    : undefined;

  return (
    <aside className="logical-inspector" aria-label="Logical model inspector">
      <header className="logical-inspector-header">
        <h2>Inspector</h2>
        <p>Logical view is generated from the ER model. Some edits may remain logical-only.</p>
      </header>

      {selectedTable ? (
        <section className="logical-inspector-section">
          <h3>Table</h3>
          <label className="field">
            <span>Name</span>
            <input
              value={selectedTable.name}
              onChange={(event) => props.onRenameTable(selectedTable.id, event.target.value)}
            />
          </label>

          <div className="logical-inspector-columns">
            {selectedTable.columns.map((column) => (
              <button
                key={column.id}
                type="button"
                className={props.selection.columnId === column.id ? "logical-column-item active" : "logical-column-item"}
                onClick={() =>
                  props.onSelectionChange({
                    tableId: selectedTable.id,
                    columnId: column.id,
                    edgeId: null,
                  })
                }
              >
                <span className="logical-column-item-name">{column.name}</span>
                <span className="logical-column-item-role">{getColumnRoleLabel(column.isPrimaryKey, column.isForeignKey)}</span>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="logical-inspector-section">
          <h3>No selection</h3>
          <p>Select a table, column, or relation to inspect details.</p>
        </section>
      )}

      {selectedColumn && selectedTable ? (
        <section className="logical-inspector-section">
          <h3>Column</h3>
          <label className="field">
            <span>Column name</span>
            <input
              value={selectedColumn.name}
              onChange={(event) => props.onRenameColumn(selectedTable.id, selectedColumn.id, event.target.value)}
            />
          </label>

          <div className="logical-key-grid" role="list">
            <div role="listitem">Role: {getColumnRoleLabel(selectedColumn.isPrimaryKey, selectedColumn.isForeignKey)}</div>
            <div role="listitem">Nullable: {selectedColumn.isNullable ? "Yes" : "No"}</div>
          </div>

          {selectedColumn.references.length > 0 ? (
            <div className="logical-reference-list">
              <strong>References</strong>
              {selectedColumn.references.map((reference) => {
                const targetTable = props.model.tables.find((table) => table.id === reference.targetTableId);
                const targetColumn = targetTable?.columns.find((column) => column.id === reference.targetColumnId);

                return (
                  <button
                    key={`${reference.foreignKeyId}-${reference.targetColumnId}`}
                    type="button"
                    onClick={() =>
                      props.onSelectionChange({
                        tableId: targetTable?.id ?? null,
                        columnId: targetColumn?.id ?? null,
                        edgeId: props.model.edges.find((edge) => edge.foreignKeyId === reference.foreignKeyId)?.id ?? null,
                      })
                    }
                  >
                    {targetTable?.name ?? "Unknown"}.{targetColumn?.name ?? "?"}
                  </button>
                );
              })}
            </div>
          ) : null}
        </section>
      ) : null}

      {selectedFk && selectedEdge ? (
        <section className="logical-inspector-section">
          <h3>Foreign key</h3>
          <p>{selectedFk.name}</p>
          <p>
            {props.model.tables.find((table) => table.id === selectedEdge.fromTableId)?.name}
            {" -> "}
            {props.model.tables.find((table) => table.id === selectedEdge.toTableId)?.name}
          </p>
        </section>
      ) : null}

      {props.model.issues.length > 0 ? (
        <section className="logical-inspector-section">
          <h3>Warnings</h3>
          <div className="logical-warning-list">
            {props.model.issues.map((issue) => {
              const table = issue.tableId ? props.model.tables.find((candidate) => candidate.id === issue.tableId) : undefined;
              return (
                <button
                  key={issue.id}
                  type="button"
                  className="logical-warning-item"
                  onClick={() =>
                    props.onSelectionChange({
                      tableId: table?.id ?? null,
                      columnId: issue.columnId ?? null,
                      edgeId: null,
                    })
                  }
                >
                  <span className={issue.level === "error" ? "logical-warning-level error" : "logical-warning-level"}>
                    {issue.level.toUpperCase()}
                  </span>
                  <span>{issue.message}</span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}
    </aside>
  );
}
