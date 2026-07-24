import assert from "node:assert/strict";
import test from "node:test";

import {
  SQL_REVERSE_ISSUE_CATEGORY,
  getSqlReverseIssueCategory,
  type SqlReverseIssueCategory,
} from "../src/utils/sqlReverseIssueCatalog.ts";
import type { SqlReverseIssueCode } from "../src/types/sqlReverse.ts";

// I 17 codici tipizzati del motore: la fonte di verità per la copertura di K4.
const ALL_CODES: SqlReverseIssueCode[] = [
  "UNSUPPORTED_STATEMENT",
  "UNSUPPORTED_TABLE_OPTION",
  "UNSUPPORTED_COLUMN_CONSTRAINT",
  "UNSUPPORTED_TABLE_CONSTRAINT",
  "DUPLICATE_TABLE_NAME",
  "DUPLICATE_COLUMN_NAME",
  "MISSING_TABLE_NAME",
  "MISSING_COLUMN_NAME",
  "MISSING_COLUMN_TYPE",
  "INVALID_CREATE_TABLE",
  "INVALID_PRIMARY_KEY",
  "INVALID_FOREIGN_KEY",
  "INVALID_UNIQUE_CONSTRAINT",
  "UNRESOLVED_REFERENCE",
  "UNSUPPORTED_ALTER_TABLE",
  "UNSUPPORTED_INDEX",
  "PARSER_RECOVERY",
];

const VALID_CATEGORIES: SqlReverseIssueCategory[] = ["sql-error", "tool-limit", "parser-recovery"];

test("every SqlReverseIssueCode is categorised, and only known codes are present", () => {
  const mapped = Object.keys(SQL_REVERSE_ISSUE_CATEGORY).sort();
  assert.deepEqual(mapped, [...ALL_CODES].sort());
});

test("each category is one of the three known values", () => {
  for (const code of ALL_CODES) {
    assert.ok(
      VALID_CATEGORIES.includes(getSqlReverseIssueCategory(code)),
      `${code} has an unknown category`,
    );
  }
});

test("all three categories are used", () => {
  const used = new Set(ALL_CODES.map((code) => getSqlReverseIssueCategory(code)));
  assert.deepEqual([...used].sort(), [...VALID_CATEGORIES].sort());
});

test("the core distinction holds: user errors vs tool limits vs recovery", () => {
  // Errore dell'utente: nomi duplicati, definizioni malformate, riferimenti inesistenti.
  assert.equal(getSqlReverseIssueCategory("DUPLICATE_TABLE_NAME"), "sql-error");
  assert.equal(getSqlReverseIssueCategory("INVALID_FOREIGN_KEY"), "sql-error");
  assert.equal(getSqlReverseIssueCategory("UNRESOLVED_REFERENCE"), "sql-error");
  // Limite del tool: costrutti validi senza equivalente ER.
  assert.equal(getSqlReverseIssueCategory("UNSUPPORTED_INDEX"), "tool-limit");
  assert.equal(getSqlReverseIssueCategory("UNSUPPORTED_TABLE_OPTION"), "tool-limit");
  assert.equal(getSqlReverseIssueCategory("UNSUPPORTED_ALTER_TABLE"), "tool-limit");
  // Recupero del parser.
  assert.equal(getSqlReverseIssueCategory("PARSER_RECOVERY"), "parser-recovery");
});
