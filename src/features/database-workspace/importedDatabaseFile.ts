export const SQLITE_HEADER_TEXT = "SQLite format 3\0";
export const SQLITE_HEADER_LENGTH = 16;
export const SQLITE_FILE_WARNING_BYTES = 64 * 1024 * 1024;
export const SQLITE_FILE_MAX_BYTES = 512 * 1024 * 1024;
export const SQLITE_DATABASE_ACCEPT = [
  ".sqlite",
  ".sqlite3",
  ".db",
  "application/vnd.sqlite3",
  "application/x-sqlite3",
  "application/octet-stream",
].join(",");

export type SqliteFileValidationCode =
  | "empty-file"
  | "too-large"
  | "invalid-header"
  | "wal-file"
  | "shm-file";

export interface SqliteFileValidationResult {
  ok: boolean;
  warning: boolean;
  code?: SqliteFileValidationCode;
}

export function isSqliteHeader(bytes: ArrayBuffer | Uint8Array): boolean {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (view.byteLength < SQLITE_HEADER_LENGTH) return false;
  for (let index = 0; index < SQLITE_HEADER_LENGTH; index += 1) {
    if (view[index] !== SQLITE_HEADER_TEXT.charCodeAt(index)) return false;
  }
  return true;
}

export function validateSqliteFileMetadata(fileName: string, fileSize: number): SqliteFileValidationResult {
  const normalized = fileName.trim().toLowerCase();
  if (normalized.endsWith("-wal")) return { ok: false, warning: false, code: "wal-file" };
  if (normalized.endsWith("-shm")) return { ok: false, warning: false, code: "shm-file" };
  if (!Number.isFinite(fileSize) || fileSize <= 0) return { ok: false, warning: false, code: "empty-file" };
  if (fileSize > SQLITE_FILE_MAX_BYTES) return { ok: false, warning: false, code: "too-large" };
  return { ok: true, warning: fileSize > SQLITE_FILE_WARNING_BYTES };
}

export function validateSqliteFileBytes(bytes: ArrayBuffer | Uint8Array): SqliteFileValidationResult {
  if ((bytes instanceof Uint8Array ? bytes.byteLength : bytes.byteLength) === 0) {
    return { ok: false, warning: false, code: "empty-file" };
  }
  return isSqliteHeader(bytes)
    ? { ok: true, warning: false }
    : { ok: false, warning: false, code: "invalid-header" };
}

export async function readAndValidateSqliteFile(file: File): Promise<ArrayBuffer> {
  const metadata = validateSqliteFileMetadata(file.name, file.size);
  if (!metadata.ok) throw new SqliteFileValidationError(metadata.code ?? "invalid-header");
  const bytes = await file.arrayBuffer();
  const content = validateSqliteFileBytes(bytes);
  if (!content.ok) throw new SqliteFileValidationError(content.code ?? "invalid-header");
  return bytes;
}

export class SqliteFileValidationError extends Error {
  constructor(readonly code: SqliteFileValidationCode) {
    super(code);
    this.name = "SqliteFileValidationError";
  }
}

export function sanitizeSqliteFileName(fileName: string): string {
  const leaf = fileName.replace(/\\/g, "/").split("/").pop() ?? "database.sqlite";
  const cleaned = leaf
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^\.+/, "")
    .trim()
    .slice(0, 180);
  return cleaned || "database.sqlite";
}

export function createImportedDatabaseDownloadName(fileName: string, modified: boolean): string {
  const safe = sanitizeSqliteFileName(fileName);
  const match = safe.match(/^(.*?)(\.(?:sqlite3?|db))$/i);
  const base = (match?.[1] || safe.replace(/\.[^.]*$/, "") || "database").replace(/[. ]+$/g, "") || "database";
  const extension = match?.[2] ?? ".sqlite";
  return modified ? `${base}-modified${extension}` : `${base}${extension}`;
}

let fallbackSessionSequence = 0;

export function createImportedDatabaseSessionId(
  randomUuid: (() => string) | undefined = globalThis.crypto?.randomUUID?.bind(globalThis.crypto),
): string {
  if (randomUuid) return `imported:${randomUuid()}`;
  fallbackSessionSequence += 1;
  return `imported:${Date.now().toString(36)}-${fallbackSessionSequence.toString(36)}`;
}

export function isImportedDatabaseSessionId(sessionId: string): boolean {
  return sessionId.startsWith("imported:");
}

export function getGeneratedSessionProjectId(sessionId: string): string | null {
  if (isImportedDatabaseSessionId(sessionId)) return null;
  const separator = sessionId.indexOf(":");
  return separator > 0 ? sessionId.slice(0, separator) : null;
}
