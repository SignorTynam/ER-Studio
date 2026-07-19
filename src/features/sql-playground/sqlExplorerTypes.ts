export interface SqlExplorerColumnReference {
  foreignKeyId: number;
  table: string;
  column: string | null;
}

export interface SqlExplorerColumn {
  position: number;
  name: string;
  dataType: string;
  notNull: boolean;
  defaultValue: string | null;
  primaryKeyPosition: number;
  references: SqlExplorerColumnReference[];
}

export interface SqlExplorerForeignKey {
  id: number;
  sequence: number;
  fromColumn: string;
  toTable: string;
  toColumn: string | null;
  onUpdate: string;
  onDelete: string;
  match: string;
}

export interface SqlExplorerIndex {
  name: string;
  tableName: string;
  unique: boolean;
  origin: string;
  partial: boolean;
  columns: string[];
}

export interface SqlExplorerTable {
  name: string;
  sql: string | null;
  columns: SqlExplorerColumn[];
  foreignKeys: SqlExplorerForeignKey[];
  indexes: SqlExplorerIndex[];
}

export interface SqlExplorerView {
  name: string;
  sql: string | null;
}

export interface SqlExplorerTrigger {
  name: string;
  tableName: string;
  sql: string | null;
}

export interface SqlExplorerDatabase {
  sequence: number;
  name: string;
  file: string;
  tables: SqlExplorerTable[];
  views: SqlExplorerView[];
  indexes: SqlExplorerIndex[];
  triggers: SqlExplorerTrigger[];
}

export interface SqlExplorerMetadata {
  databases: SqlExplorerDatabase[];
}
