import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { en } from "../src/i18n/messages/en";
import { it } from "../src/i18n/messages/it";
import { sq } from "../src/i18n/messages/sq";
import { RELEASE_CATALOG } from "../src/releases/releaseCatalog";
import type { AppReleaseDefinition } from "../src/releases/releaseTypes";
import { compareAppVersions, normalizeAppVersion } from "../src/utils/versioning";
import { runGenerateChangelog } from "./generate-changelog";
import { containsPlaceholder, readPackageVersion } from "./releaseUtils";

const IMPACTS = new Set(["patch", "minor", "major"]);
const MODES = new Set(["silent", "toast", "modal", "critical"]);
const LOCALES = { it, en, sq } as const;

function getValue(source: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((current, part) =>
    current && typeof current === "object" ? (current as Record<string, unknown>)[part] : undefined,
  source);
}

export function validateReleaseCatalog(
  currentVersion: string,
  catalog: readonly AppReleaseDefinition[] = RELEASE_CATALOG,
): string[] {
  const errors: string[] = [];
  const normalizedCurrent = normalizeAppVersion(currentVersion);
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(currentVersion) || !normalizedCurrent) {
    errors.push(`package.json: version: "${currentVersion}" must use full SemVer x.y.z.`);
    return errors;
  }
  const seen = new Set<string>();
  catalog.forEach((release, index) => {
    const normalized = normalizeAppVersion(release.version);
    if (!normalized) errors.push(`src/releases/releaseCatalog.ts: ${release.version}: version is invalid.`);
    if (normalized && seen.has(normalized)) errors.push(`src/releases/releaseCatalog.ts: ${release.version}: duplicate version.`);
    if (normalized) seen.add(normalized);
    if (index > 0 && compareAppVersions(catalog[index - 1].version, release.version) <= 0) {
      errors.push(`src/releases/releaseCatalog.ts: ${release.version}: catalog must be ordered newest first.`);
    }
    const parsedDate = new Date(`${release.date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(release.date) || Number.isNaN(parsedDate.valueOf()) || parsedDate.toISOString().slice(0, 10) !== release.date) {
      errors.push(`src/releases/releaseCatalog.ts: ${release.version}: date must be a valid ISO date.`);
    }
    if (!IMPACTS.has(release.impact)) errors.push(`src/releases/releaseCatalog.ts: ${release.version}: impact is invalid.`);
    if (release.announcement && !MODES.has(release.announcement)) errors.push(`src/releases/releaseCatalog.ts: ${release.version}: announcement mode is invalid.`);
    if (normalized && compareAppVersions(normalized, normalizedCurrent) > 0) errors.push(`src/releases/releaseCatalog.ts: ${release.version}: future release exceeds package.json ${currentVersion}.`);
    if (release.contentKey) {
      for (const [locale, messages] of Object.entries(LOCALES)) {
        for (const field of ["headline", "summary"] as const) {
          const key = `changelog.entries.${release.contentKey}.${field}`;
          const value = getValue(messages, key);
          if (typeof value !== "string" || !value.trim() || containsPlaceholder(value)) {
            errors.push(`src/i18n/messages/${locale}.ts: ${release.version}: ${key} is missing, empty, or a placeholder.`);
          }
        }
        for (let update = 0; update < (release.updateCount ?? 0); update += 1) {
          const key = `changelog.entries.${release.contentKey}.updates.${update}`;
          const value = getValue(messages, key);
          if (typeof value !== "string" || !value.trim() || containsPlaceholder(value)) errors.push(`src/i18n/messages/${locale}.ts: ${release.version}: ${key} must be completed.`);
        }
      }
    }
  });
  if (!seen.has(normalizedCurrent)) errors.push(`src/releases/releaseCatalog.ts: ${currentVersion}: current package version is missing.`);
  if (normalizeAppVersion(catalog[0]?.version) !== normalizedCurrent) errors.push(`src/releases/releaseCatalog.ts: ${currentVersion}: current version must be the newest catalog entry.`);
  return errors;
}

export function runReleaseCheck(root = process.cwd()): void {
  const packageVersion = readPackageVersion(root);
  const lock = JSON.parse(readFileSync(resolve(root, "package-lock.json"), "utf8")) as { version?: string; packages?: Record<string, { version?: string }> };
  const errors = validateReleaseCatalog(packageVersion);
  if (lock.version !== packageVersion || lock.packages?.[""]?.version !== packageVersion) errors.push("package-lock.json: version: synchronize root versions with package.json.");
  try { runGenerateChangelog(true, root); } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  if (errors.length) throw new Error(`Release validation failed:\n- ${errors.join("\n- ")}`);
  console.log(`Release ${packageVersion} is consistent across package metadata, catalog, translations, and changelog.`);
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) {
  try { runReleaseCheck(); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
}
