import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { it } from "../src/i18n/messages/it";
import { RELEASE_CATALOG } from "../src/releases/releaseCatalog";
import { localizeRelease } from "../src/releases/releaseLocalization";
import type { ReleaseChangeKind } from "../src/releases/releaseTypes";
import { containsPlaceholder } from "./releaseUtils";

export const GENERATED_START = "<!-- builder:generated-releases:start -->";
export const GENERATED_END = "<!-- builder:generated-releases:end -->";
const HEADINGS: Record<ReleaseChangeKind, string> = { added: "Added", changed: "Changed", fixed: "Fixed" };

function getValue(source: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((current, part) =>
    current && typeof current === "object" ? (current as Record<string, unknown>)[part] : undefined,
  source);
}

function translateItalian(key: string, params?: Record<string, string | number | boolean | null | undefined>): string {
  const value = getValue(it, key);
  if (typeof value !== "string") return key;
  return value.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, name: string) => String(params?.[name] ?? ""));
}

export function buildGeneratedChangelog(): string {
  const releases = RELEASE_CATALOG.filter((release) => release.managed)
    .map((release) => localizeRelease(release, translateItalian));
  const blocks = releases.map((release) => {
    if ([release.headline, release.summary, ...release.changes].some(containsPlaceholder)) return "";
    const sections = (["added", "changed", "fixed"] as ReleaseChangeKind[]).flatMap((kind) => {
      const changes = release.localizedSections[kind];
      return changes.length ? [`### ${HEADINGS[kind]}`, ...changes.map((change) => `- ${change}`), ""] : [];
    });
    return [`## [${release.version}] - ${release.date}`, "", ...sections].join("\n").trimEnd();
  }).filter(Boolean);
  return `${GENERATED_START}\n${blocks.join("\n\n")}\n${GENERATED_END}`;
}

export function replaceGeneratedChangelog(source: string, generated = buildGeneratedChangelog()): string {
  const start = source.indexOf(GENERATED_START);
  const end = source.indexOf(GENERATED_END);
  if (start < 0 || end < start) throw new Error(`CHANGELOG.md: add managed markers ${GENERATED_START} and ${GENERATED_END}.`);
  return `${source.slice(0, start)}${generated}${source.slice(end + GENERATED_END.length)}`;
}

export function runGenerateChangelog(check = false, root = process.cwd()): void {
  const changelogPath = resolve(root, "CHANGELOG.md");
  const source = readFileSync(changelogPath, "utf8");
  const next = replaceGeneratedChangelog(source);
  if (source === next) {
    console.log("CHANGELOG.md is up to date.");
    return;
  }
  if (check) throw new Error("CHANGELOG.md: managed release block has drift. Run npm run changelog:generate.");
  writeFileSync(changelogPath, next, "utf8");
  console.log("CHANGELOG.md managed release block updated.");
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) {
  try { runGenerateChangelog(process.argv.includes("--check")); } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
