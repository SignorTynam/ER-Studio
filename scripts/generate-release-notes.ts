import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { it } from "../src/i18n/messages/it";
import { RELEASE_CATALOG } from "../src/releases/releaseCatalog";
import { localizeRelease } from "../src/releases/releaseLocalization";
import { normalizeAppVersion } from "../src/utils/versioning";
import type { ReleaseChangeKind } from "../src/releases/releaseTypes";
import { readPackageVersion } from "./releaseUtils";

function getValue(source: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((current, part) =>
    current && typeof current === "object" ? (current as Record<string, unknown>)[part] : undefined,
  source);
}

function translateItalian(key: string, params?: Record<string, string | number | boolean | null | undefined>): string {
  const value = getValue(it, key);
  return typeof value === "string"
    ? value.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, name: string) => String(params?.[name] ?? ""))
    : key;
}

export function generateReleaseNotes(version: string): string {
  const normalized = normalizeAppVersion(version);
  const definition = RELEASE_CATALOG.find((release) => normalizeAppVersion(release.version) === normalized);
  if (!definition) throw new Error(`src/releases/releaseCatalog.ts: ${version}: release not found.`);
  const release = localizeRelease(definition, translateItalian);
  const lines = [`# buildER v${release.version}`, "", `_${release.date}_`, "", release.summary, ""];
  if (release.highlights.length) {
    lines.push("## Highlights", "", ...release.highlights.map((item) => `- **${item.title}** — ${item.description}`), "");
  }
  const labels: Record<ReleaseChangeKind, string> = { added: "Added", changed: "Changed", fixed: "Fixed" };
  for (const kind of ["added", "changed", "fixed"] as ReleaseChangeKind[]) {
    const changes = release.localizedSections[kind];
    if (changes.length) lines.push(`## ${labels[kind]}`, "", ...changes.map((change) => `- ${change}`), "");
  }
  if (release.announcement === "critical") lines.push("## Attenzione", "", release.summary, "");
  return `${lines.join("\n").trim()}\n`;
}

function parseArgs(args: string[]): { version?: string; output?: string } {
  const result: { version?: string; output?: string } = {};
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--output") result.output = args[index + 1];
    else if (!args[index].startsWith("--") && args[index - 1] !== "--output") result.version = args[index];
  }
  return result;
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const notes = generateReleaseNotes(args.version ?? readPackageVersion());
    if (args.output) {
      writeFileSync(resolve(args.output), notes, "utf8");
      console.log(`Release notes written to ${args.output}.`);
    } else process.stdout.write(notes);
  } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
}
