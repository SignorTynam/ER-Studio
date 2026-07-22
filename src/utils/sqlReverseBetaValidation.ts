import type { SqlReverseIssue, SqlReverseOptions, SqlUnsupportedStatement } from "../types/sqlReverse";
import { parseSqlSchema } from "./sqlReverseParser";

export interface SqlReverseBetaValidationResult {
  ok: boolean;
  normalizedSql: string;
  errorCode: "empty-source" | "missing-create-table" | "unsupported-statement" | null;
  issues: SqlReverseIssue[];
  unsupportedStatementCount: number;
  /** Statement che il motore non sa importare (fase K2): esposti per elencarli, non solo contarli. */
  unsupportedStatements: SqlUnsupportedStatement[];
}

export function validateSqlReverseBetaSource(
  sourceSql: string,
  options?: SqlReverseOptions,
): SqlReverseBetaValidationResult {
  const normalizedSql = sourceSql.trim();

  if (!normalizedSql) {
    return {
      ok: false,
      normalizedSql,
      errorCode: "empty-source",
      issues: [],
      unsupportedStatementCount: 0,
      unsupportedStatements: [],
    };
  }

  if (!/\bCREATE\s+TABLE\b/i.test(normalizedSql)) {
    return {
      ok: false,
      normalizedSql,
      errorCode: "missing-create-table",
      issues: [],
      unsupportedStatementCount: 0,
      unsupportedStatements: [],
    };
  }

  const parsed = parseSqlSchema(normalizedSql, { ...options, preserveUnsupportedStatements: true });
  if (parsed.model.unsupportedStatements.length > 0) {
    return {
      ok: false,
      normalizedSql,
      errorCode: "unsupported-statement",
      issues: parsed.issues,
      unsupportedStatementCount: parsed.model.unsupportedStatements.length,
      unsupportedStatements: parsed.model.unsupportedStatements,
    };
  }

  return {
    ok: true,
    normalizedSql,
    errorCode: null,
    issues: parsed.issues,
    unsupportedStatementCount: 0,
    unsupportedStatements: [],
  };
}
