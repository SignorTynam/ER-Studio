import type { Locale } from "../../i18n";
import type { ProjectCommit } from "../../features/versioning/projectCommitSnapshot";
import type {
  ProjectFileChange,
  ProjectUncommittedChangeCategories,
} from "../../features/versioning/useProjectVersioning";

export const SOURCE_CONTROL_CHANGES_EXPANDED_KEY = "builder:source-control:changes-expanded";
export const SOURCE_CONTROL_HISTORY_EXPANDED_KEY = "builder:source-control:history-expanded";

const CHANGE_STATUS_ORDER: Record<ProjectFileChange["status"], number> = {
  modified: 0,
  added: 1,
  renamed: 2,
  deleted: 3,
};

export function readSourceControlDisclosure(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(key);
    return stored === null ? fallback : stored === "true";
  } catch {
    return fallback;
  }
}

export function writeSourceControlDisclosure(key: string, value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // The UI remains usable when storage is unavailable.
  }
}

export function sortSourceControlChanges(changes: readonly ProjectFileChange[]): ProjectFileChange[] {
  return [...changes].sort((left, right) => {
    const status = CHANGE_STATUS_ORDER[left.status] - CHANGE_STATUS_ORDER[right.status];
    if (status !== 0) return status;
    const name = left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
    return name !== 0 ? name : left.fileId.localeCompare(right.fileId);
  });
}

export function getSourceControlChangeCode(status: ProjectFileChange["status"]): string {
  if (status === "added") return "A";
  if (status === "deleted") return "D";
  if (status === "renamed") return "R";
  return "M";
}

export function getPreferredCompareView(kind: ProjectFileChange["kind"]): "er" | "sql" | "text" {
  if (kind === "schema") return "er";
  if (kind === "sql") return "sql";
  return "text";
}

export function formatSourceControlDate(value: string, locale: Locale, compact = false): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, compact
    ? { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
    : { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function shortCommitId(id: string | null | undefined): string {
  return id ? id.slice(0, 8) : "-";
}

export function getChangedCategoryKeys(categories: ProjectUncommittedChangeCategories): string[] {
  return Object.entries(categories)
    .filter(([, changed]) => changed)
    .map(([key]) => key);
}

export function getCommitStats(commit: ProjectCommit): Array<{ key: keyof ProjectCommit["stats"]; value: number }> {
  const keys: Array<keyof ProjectCommit["stats"]> = [
    "entityCount",
    "relationshipCount",
    "attributeCount",
    "edgeCount",
    "tableCount",
    "warningCount",
    "errorCount",
  ];
  return keys.flatMap((key) => typeof commit.stats[key] === "number" ? [{ key, value: commit.stats[key] as number }] : []);
}
