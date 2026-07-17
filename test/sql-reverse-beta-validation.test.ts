import assert from "node:assert/strict";
import test from "node:test";

import { validateSqlReverseBetaSource } from "../src/utils/sqlReverseBetaValidation.ts";

test("sql reverse beta validation: empty SQL is rejected", () => {
  const result = validateSqlReverseBetaSource("   ");

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, "empty-source");
});

test("sql reverse beta validation: SQL without CREATE TABLE is rejected", () => {
  const result = validateSqlReverseBetaSource("SELECT 1;");

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, "missing-create-table");
});

test("sql reverse beta validation: valid CREATE TABLE is accepted", () => {
  const result = validateSqlReverseBetaSource(`
    CREATE TABLE Student (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    );
  `);

  assert.equal(result.ok, true);
  assert.equal(result.errorCode, null);
});

test("sql reverse beta validation: CREATE TABLE with unsupported statements is blocked", () => {
  const samples = [
    "CREATE TABLE Student (id INTEGER PRIMARY KEY); INSERT INTO Student(id) VALUES (1);",
    "CREATE TABLE Student (id INTEGER PRIMARY KEY); ALTER TABLE Student ADD COLUMN name TEXT;",
    "CREATE TABLE Student (id INTEGER PRIMARY KEY); CREATE VIEW StudentView AS SELECT id FROM Student;",
  ];

  samples.forEach((sql) => {
    const result = validateSqlReverseBetaSource(sql);

    assert.equal(result.ok, false);
    assert.equal(result.errorCode, "unsupported-statement");
    assert.equal(result.unsupportedStatementCount > 0, true);
  });
});

test("sql reverse beta validation: CREATE TABLE warnings are not blocking", () => {
  const result = validateSqlReverseBetaSource(`
    CREATE TABLE Student (
      id INTEGER PRIMARY KEY
    ) ENGINE=InnoDB;
  `);

  assert.equal(result.ok, true);
  assert.equal(result.issues.some((issue) => issue.level === "warning"), true);
});
