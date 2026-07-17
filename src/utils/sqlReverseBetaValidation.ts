import type { SqlReverseIssue } from "../types/sqlReverse";
import { parseSqlSchema } from "./sqlReverseParser";

export interface SqlReverseBetaValidationResult {
  ok: boolean;
  normalizedSql: string;
  errorCode: "empty-source" | "missing-create-table" | "unsupported-statement" | null;
  issues: SqlReverseIssue[];
  unsupportedStatementCount: number;
}

export function validateSqlReverseBetaSource(sourceSql: string): SqlReverseBetaValidationResult {
  const normalizedSql = sourceSql.trim();

  if (!normalizedSql) {
    return {
      ok: false,
      normalizedSql,
      errorCode: "empty-source",
      issues: [],
      unsupportedStatementCount: 0,
    };
  }

  if (!/\bCREATE\s+TABLE\b/i.test(normalizedSql)) {
    return {
      ok: false,
      normalizedSql,
      errorCode: "missing-create-table",
      issues: [],
      unsupportedStatementCount: 0,
    };
  }

  const parsed = parseSqlSchema(normalizedSql, { preserveUnsupportedStatements: true });
  if (parsed.model.unsupportedStatements.length > 0) {
    return {
      ok: false,
      normalizedSql,
      errorCode: "unsupported-statement",
      issues: parsed.issues,
      unsupportedStatementCount: parsed.model.unsupportedStatements.length,
    };
  }

  return {
    ok: true,
    normalizedSql,
    errorCode: null,
    issues: parsed.issues,
    unsupportedStatementCount: 0,
  };
}
