import assert from "node:assert/strict";
import test from "node:test";
import {
  SQLITE_FILE_MAX_BYTES,
  SQLITE_FILE_WARNING_BYTES,
  SQLITE_HEADER_TEXT,
  createImportedDatabaseDownloadName,
  createImportedDatabaseSessionId,
  getGeneratedSessionProjectId,
  isSqliteHeader,
  sanitizeSqliteFileName,
  validateSqliteFileBytes,
  validateSqliteFileMetadata,
} from "../src/features/database-workspace/importedDatabaseFile.ts";
import {
  buildSqliteReverseAnalysis,
  convertSqliteMetadataToSqlSchemaModel,
  createReverseExtrasSql,
  getSqliteTableId,
} from "../src/features/database-workspace/reverse/sqliteMetadataToSqlSchemaModel.ts";
import { isSqlPlaygroundResponse } from "../src/features/sql-playground/sqlPlaygroundProtocol.ts";
import type { SqlExplorerMetadata } from "../src/features/sql-playground/sqlExplorerTypes.ts";
import {
  createImportedDatabaseSessionState,
  markImportedDatabaseExported,
  markImportedDatabaseRestored,
} from "../src/utils/sqlPlayground.ts";

function sqliteHeader(): Uint8Array {
  const bytes = new Uint8Array(100);
  [...SQLITE_HEADER_TEXT].forEach((character, index) => { bytes[index] = character.charCodeAt(0); });
  return bytes;
}

const metadata: SqlExplorerMetadata = {
  databases: [{
    sequence: 0,
    name: "main",
    file: "",
    tables: [
      {
        name: "parent",
        sql: "CREATE TABLE parent(a INTEGER, b INTEGER, name TEXT UNIQUE, PRIMARY KEY(a,b))",
        virtual: false,
        columns: [
          { position: 0, name: "a", dataType: "INTEGER", notNull: true, defaultValue: null, primaryKeyPosition: 1, references: [], hidden: 0, generated: false },
          { position: 1, name: "b", dataType: "INTEGER", notNull: true, defaultValue: null, primaryKeyPosition: 2, references: [], hidden: 0, generated: false },
          { position: 2, name: "name", dataType: "TEXT", notNull: false, defaultValue: null, primaryKeyPosition: 0, references: [], hidden: 0, generated: false },
        ],
        foreignKeys: [],
        indexes: [{ name: "sqlite_autoindex_parent_1", tableName: "parent", unique: true, origin: "u", partial: false, columns: ["name"], expressionColumns: [], sql: null }],
      },
      {
        name: "child",
        sql: "CREATE TABLE child(id INTEGER PRIMARY KEY, pa INTEGER, pb INTEGER, FOREIGN KEY(pa,pb) REFERENCES parent)",
        virtual: false,
        columns: [
          { position: 0, name: "id", dataType: "INTEGER", notNull: false, defaultValue: null, primaryKeyPosition: 1, references: [], hidden: 0, generated: false },
          { position: 1, name: "pa", dataType: "INTEGER", notNull: false, defaultValue: null, primaryKeyPosition: 0, references: [{ foreignKeyId: 0, table: "parent", column: null }], hidden: 0, generated: false },
          { position: 2, name: "pb", dataType: "INTEGER", notNull: false, defaultValue: null, primaryKeyPosition: 0, references: [{ foreignKeyId: 0, table: "parent", column: null }], hidden: 0, generated: false },
        ],
        foreignKeys: [
          { id: 0, sequence: 0, fromColumn: "pa", toTable: "parent", toColumn: null, onUpdate: "NO ACTION", onDelete: "CASCADE", match: "NONE" },
          { id: 0, sequence: 1, fromColumn: "pb", toTable: "parent", toColumn: null, onUpdate: "NO ACTION", onDelete: "CASCADE", match: "NONE" },
        ],
        indexes: [{ name: "child_expr", tableName: "child", unique: true, origin: "c", partial: true, columns: [], expressionColumns: [-2], sql: "CREATE UNIQUE INDEX child_expr ON child(lower(pa)) WHERE pb IS NOT NULL" }],
      },
      {
        name: "search_index",
        sql: "CREATE VIRTUAL TABLE search_index USING fts5(content)",
        virtual: true,
        columns: [{ position: 0, name: "content", dataType: "", notNull: false, defaultValue: null, primaryKeyPosition: 0, references: [], hidden: 0, generated: false }],
        foreignKeys: [],
        indexes: [],
      },
    ],
    views: [{ name: "parent_names", sql: "CREATE VIEW parent_names AS SELECT name FROM parent" }],
    indexes: [{ name: "child_expr", tableName: "child", unique: true, origin: "c", partial: true, columns: [], expressionColumns: [-2], sql: "CREATE UNIQUE INDEX child_expr ON child(lower(pa)) WHERE pb IS NOT NULL" }],
    triggers: [{ name: "child_audit", tableName: "child", sql: "CREATE TRIGGER child_audit AFTER INSERT ON child BEGIN SELECT new.id; END" }],
  }],
};

test("SQLite file validation rejects empty, oversized, WAL/SHM, and invalid content", () => {
  assert.deepEqual(validateSqliteFileMetadata("empty.db", 0).code, "empty-file");
  assert.deepEqual(validateSqliteFileMetadata("database.db-wal", 10).code, "wal-file");
  assert.deepEqual(validateSqliteFileMetadata("database.db-shm", 10).code, "shm-file");
  assert.deepEqual(validateSqliteFileMetadata("large.sqlite", SQLITE_FILE_MAX_BYTES + 1).code, "too-large");
  assert.equal(validateSqliteFileMetadata("large.sqlite", SQLITE_FILE_WARNING_BYTES + 1).warning, true);
  assert.equal(isSqliteHeader(sqliteHeader()), true);
  assert.equal(validateSqliteFileBytes(new TextEncoder().encode("renamed text file")).code, "invalid-header");
});

test("imported sessions and download names are isolated and deterministic", () => {
  assert.equal(createImportedDatabaseSessionId(() => "uuid"), "imported:uuid");
  assert.equal(getGeneratedSessionProjectId("project:schema"), "project");
  assert.equal(getGeneratedSessionProjectId("imported:uuid"), null);
  assert.equal(sanitizeSqliteFileName("../unsafe:<name>.db"), "unsafe-name-.db");
  assert.equal(createImportedDatabaseDownloadName("school.db", true), "school-modified.db");
  const session = createImportedDatabaseSessionState({
    sessionId: "imported:uuid", fileName: "school.db", fileSize: 100, mimeType: "application/octet-stream",
    openedAt: "2026-07-20T00:00:00.000Z", sqliteVersion: "3.50.4", schemaSignature: "v1",
  });
  const exported = markImportedDatabaseExported({ ...session, hasSessionChanges: true, hasUnexportedChanges: true }, "2026-07-20T01:00:00.000Z");
  assert.equal(exported.hasSessionChanges, true);
  assert.equal(exported.hasUnexportedChanges, false);
  assert.equal(exported.lastExportedAt, "2026-07-20T01:00:00.000Z");
  const restored = markImportedDatabaseRestored({ ...exported, results: [{ statementIndex: 0, sql: "SELECT 1", kind: "rows", columns: ["1"], rows: [[1]], rowCount: 1, truncated: false, changes: 0, durationMs: 1 }] }, "v2");
  assert.equal(restored.hasSessionChanges, false);
  assert.deepEqual(restored.results, []);
  assert.equal(restored.schemaSignature, "v2");
});

test("SQLite metadata conversion preserves key order, composite foreign keys, extras, and warnings", () => {
  const selectedTableIds = [getSqliteTableId("main", "parent"), getSqliteTableId("main", "child")];
  const converted = convertSqliteMetadataToSqlSchemaModel(metadata, {
    selectedTableIds,
    inferManyToManyTables: true,
    keepForeignKeyColumnsAsAttributes: true,
    includeUnconvertedDefinitions: true,
  }, "school.db");
  const parent = converted.model.tables.find((table) => table.name === "parent");
  const child = converted.model.tables.find((table) => table.name === "child");
  assert.deepEqual(parent?.primaryKey?.columnNames, ["a", "b"]);
  assert.deepEqual(child?.foreignKeys[0].fromColumnNames, ["pa", "pb"]);
  assert.deepEqual(child?.foreignKeys[0].toColumnNames, ["a", "b"]);
  assert.equal(parent?.uniqueConstraints[0].columnNames[0], "name");
  assert.ok(converted.issues.some((entry) => entry.code === "UNSUPPORTED_INDEX"));
  assert.deepEqual(new Set(converted.unconvertedDefinitions.map((entry) => entry.kind)), new Set(["view", "trigger", "index", "virtual-table"]));

  const result = buildSqliteReverseAnalysis({
    sessionId: "imported:uuid", fileName: "school.db", fileSize: 100, schemaSignature: "v1", metadata,
    options: { selectedTableIds, inferManyToManyTables: true, keepForeignKeyColumnsAsAttributes: true, includeUnconvertedDefinitions: true },
  });
  assert.equal(result.logicalModel.tables.length, 2);
  assert.match(createReverseExtrasSql(result), /CREATE VIEW parent_names/);
  assert.match(createReverseExtrasSql(result), /CREATE TRIGGER child_audit/);
});

test("worker response validation covers imported open, reverse, and restore payloads", () => {
  assert.equal(isSqlPlaygroundResponse({
    requestId: "1", type: "database-opened", sessionId: "imported:uuid", fileName: "school.db", fileSize: 100,
    metadata: { databases: [] }, schemaSignature: "v1", schemaVersion: 1, applicationId: 0, userVersion: 0,
  }), true);
  assert.equal(isSqlPlaygroundResponse({ requestId: "2", type: "database-reversed", sessionId: "imported:uuid", metadata: { databases: [] }, schemaSignature: "v1" }), true);
  assert.equal(isSqlPlaygroundResponse({ requestId: "3", type: "database-restored", sessionId: "imported:uuid", metadata: { databases: [] }, schemaSignature: "v1" }), true);
  assert.equal(isSqlPlaygroundResponse({ requestId: "4", type: "database-opened", sessionId: "imported:uuid" }), false);
});
