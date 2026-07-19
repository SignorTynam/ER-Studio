import assert from "node:assert/strict";
import test from "node:test";
import sqlite3InitModule from "@sqlite.org/sqlite-wasm";
import {
  inspectSqliteSchema,
  quoteSqliteIdentifier,
  readSqliteSchemaSignature,
} from "../src/features/sql-playground/sqlExplorerIntrospection.ts";

test("SQL Explorer introspects real tables, columns, PK, FK, indexes, views, triggers and attached databases", async () => {
  const sqlite = await sqlite3InitModule();
  const database = new sqlite.oo1.DB(":memory:");
  try {
    database.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE student (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL DEFAULT 'unknown');
      CREATE TABLE enrollment (
        id INTEGER PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES student(id) ON UPDATE CASCADE ON DELETE RESTRICT
      );
      CREATE UNIQUE INDEX enrollment_student_idx ON enrollment(student_id);
      CREATE VIEW student_names AS SELECT name FROM student;
      CREATE TRIGGER enrollment_audit AFTER INSERT ON enrollment BEGIN SELECT new.id; END;
      ATTACH DATABASE ':memory:' AS aux;
      CREATE TABLE aux.course (id INTEGER PRIMARY KEY, title TEXT);
    `);

    const metadata = inspectSqliteSchema(database);
    assert.deepEqual(metadata.databases.map((entry) => entry.name), ["main", "aux"]);
    const main = metadata.databases[0];
    assert.deepEqual(main.tables.map((entry) => entry.name), ["enrollment", "student"]);
    assert.deepEqual(main.views.map((entry) => entry.name), ["student_names"]);
    assert.deepEqual(main.triggers.map((entry) => entry.name), ["enrollment_audit"]);
    assert.deepEqual(main.indexes.map((entry) => entry.name), ["enrollment_student_idx"]);
    const enrollment = main.tables.find((entry) => entry.name === "enrollment");
    assert.equal(enrollment?.columns[0].primaryKeyPosition, 1);
    assert.equal(enrollment?.columns[1].notNull, true);
    assert.equal(enrollment?.columns[1].references[0].table, "student");
    assert.equal(enrollment?.foreignKeys[0].onUpdate, "CASCADE");
    assert.equal(enrollment?.foreignKeys[0].onDelete, "RESTRICT");
    assert.equal(enrollment?.indexes[0].unique, true);
    assert.deepEqual(enrollment?.indexes[0].columns, ["student_id"]);
    assert.deepEqual(metadata.databases[1].tables.map((entry) => entry.name), ["course"]);
    assert.equal(main.tables.some((entry) => entry.name.startsWith("sqlite_")), false);
  } finally {
    database.close();
  }
});

test("schema signatures change only with structural changes and identifier quoting is safe", async () => {
  const sqlite = await sqlite3InitModule();
  const database = new sqlite.oo1.DB(":memory:");
  try {
    const initial = readSqliteSchemaSignature(database);
    database.exec("CREATE TABLE sample(id INTEGER);");
    const afterDdl = readSqliteSchemaSignature(database);
    database.exec("INSERT INTO sample VALUES (1);");
    const afterDml = readSqliteSchemaSignature(database);
    assert.notEqual(initial, afterDdl);
    assert.equal(afterDdl, afterDml);
    assert.equal(quoteSqliteIdentifier('odd"name'), '"odd""name"');
  } finally {
    database.close();
  }
});
