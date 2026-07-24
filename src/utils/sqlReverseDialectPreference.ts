import type { SqlReverseDialect } from "../types/sqlReverse";

/**
 * Fase K1 — il dialetto SQL scelto nel pannello di reverse engineering è ricordato tra le sessioni
 * (best-effort su localStorage). Non cambia la logica di parsing: è solo il valore che l'utente ha
 * dichiarato, riletto all'avvio così il pannello riparte dall'ultima scelta.
 */
const STORAGE_KEY = "chen-er-diagram-studio:sql-reverse-dialect";

/** Ordine di presentazione nel selettore: il default per primo, poi i dialetti specifici. */
export const SQL_REVERSE_DIALECTS: readonly SqlReverseDialect[] = [
  "generic",
  "postgresql",
  "mysql",
  "sqlite",
  "sqlserver",
];

function isKnownDialect(value: string): value is SqlReverseDialect {
  return (SQL_REVERSE_DIALECTS as readonly string[]).includes(value);
}

export function readSqlReverseDialectPreference(): SqlReverseDialect {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && isKnownDialect(stored)) {
      return stored;
    }
  } catch {
    // localStorage non disponibile (es. modalità privata): resta sul default.
  }
  return "generic";
}

export function writeSqlReverseDialectPreference(dialect: SqlReverseDialect): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, dialect);
  } catch {
    // Persistenza best-effort: se localStorage non è scrivibile, ignora.
  }
}
