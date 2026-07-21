import type { DiagramDocument } from "../../types/diagram";
import type { LogicalIssue, LogicalModel } from "../../types/logical";
import type { SqlReverseIssue, SqlSchemaModel } from "../../types/sqlReverse";
import type { SqlExplorerMetadata } from "../sql-playground/sqlExplorerTypes";

export type SqlDatabaseSessionSource =
  | {
      kind: "generated-schema";
      projectId: string;
      schemaFileId: string;
      schemaName: string;
      schemaChecksum: string | null;
    }
  | {
      kind: "imported-sqlite";
      fileName: string;
      fileSize: number;
      mimeType: string;
      openedAt: string;
    };

export interface ImportedDatabaseOpenResult {
  sessionId: string;
  fileName: string;
  fileSize: number;
  metadata: SqlExplorerMetadata;
  schemaSignature: string;
  schemaVersion: number;
  applicationId: number;
  userVersion: number;
}

export interface SqliteReverseOptions {
  selectedTableIds: string[];
  inferManyToManyTables: boolean;
  keepForeignKeyColumnsAsAttributes: boolean;
  includeUnconvertedDefinitions: boolean;
}

export interface SqliteUnconvertedDefinition {
  id: string;
  databaseName: string;
  name: string;
  kind: "view" | "trigger" | "index" | "virtual-table" | "unsupported";
  sql: string;
  reason: string;
}

export interface SqliteReverseAnalysisResult {
  sessionId: string;
  fileName: string;
  fileSize: number;
  schemaSignature: string;
  metadata: SqlExplorerMetadata;
  selectedTableIds: string[];
  sqlModel: SqlSchemaModel;
  logicalModel: LogicalModel;
  diagram: DiagramDocument;
  issues: SqlReverseIssue[];
  logicalIssues: LogicalIssue[];
  unconvertedDefinitions: SqliteUnconvertedDefinition[];
}

export type DatabaseReverseDestination =
  | "current-project-new-schema"
  | "new-project"
  | "replace-current-schema";

export interface DatabaseReverseApplyRequest {
  destination: DatabaseReverseDestination;
  schemaFileName: string;
  projectName: string;
  includeUnconvertedDefinitions: boolean;
  result: SqliteReverseAnalysisResult;
}

export interface DatabaseReverseApplyReport {
  schemaFileId: string;
  schemaFileName: string;
  tableCount: number;
  entityCount: number;
  relationshipCount: number;
  warningCount: number;
  preservedDefinitionCount: number;
}
