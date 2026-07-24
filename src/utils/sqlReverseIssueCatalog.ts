import type { SqlReverseIssueCode } from "../types/sqlReverse";

/**
 * Fase K4 — dai codici del motore a spiegazioni comprensibili. La categoria distingue tre nature,
 * così l'utente sa sempre se il problema è suo o è un limite dello strumento:
 *
 * - `sql-error`: c'è un problema nel TUO SQL (nome duplicato, definizione malformata, riferimento
 *   inesistente). Va corretto nel sorgente.
 * - `tool-limit`: il costrutto è SQL valido ma non ha rappresentazione in un diagramma ER, quindi
 *   viene ignorato senza rompere nulla (l'entità/attributo restano).
 * - `parser-recovery`: il parser ha saltato una parte per continuare a leggere il resto.
 *
 * Il titolo e la spiegazione (localizzati) vivono in i18n `sqlReverseIssues.codes.<CODE>`; qui sta
 * solo la logica pura della categoria, così è testabile senza traduzioni.
 */
export type SqlReverseIssueCategory = "sql-error" | "tool-limit" | "parser-recovery";

export const SQL_REVERSE_ISSUE_CATEGORY: Record<SqlReverseIssueCode, SqlReverseIssueCategory> = {
  // Problemi nel SQL dell'utente.
  DUPLICATE_TABLE_NAME: "sql-error",
  DUPLICATE_COLUMN_NAME: "sql-error",
  MISSING_TABLE_NAME: "sql-error",
  MISSING_COLUMN_NAME: "sql-error",
  MISSING_COLUMN_TYPE: "sql-error",
  INVALID_CREATE_TABLE: "sql-error",
  INVALID_PRIMARY_KEY: "sql-error",
  INVALID_FOREIGN_KEY: "sql-error",
  INVALID_UNIQUE_CONSTRAINT: "sql-error",
  UNRESOLVED_REFERENCE: "sql-error",
  // Costrutti validi ma senza equivalente ER: ignorati.
  UNSUPPORTED_STATEMENT: "tool-limit",
  UNSUPPORTED_TABLE_OPTION: "tool-limit",
  UNSUPPORTED_COLUMN_CONSTRAINT: "tool-limit",
  UNSUPPORTED_TABLE_CONSTRAINT: "tool-limit",
  UNSUPPORTED_ALTER_TABLE: "tool-limit",
  UNSUPPORTED_INDEX: "tool-limit",
  // Recupero del parser.
  PARSER_RECOVERY: "parser-recovery",
};

export function getSqlReverseIssueCategory(code: SqlReverseIssueCode): SqlReverseIssueCategory {
  return SQL_REVERSE_ISSUE_CATEGORY[code] ?? "tool-limit";
}
