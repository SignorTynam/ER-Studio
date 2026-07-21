import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { normalizeAppVersion, tryParseAppVersion } from "../src/utils/versioning";

export type ReleaseBump = "patch" | "minor" | "major";

export function bumpVersion(version: string, bump: ReleaseBump): string {
  const parsed = tryParseAppVersion(version);
  if (!parsed) throw new Error(`package.json: version: "${version}" is not a valid application version.`);
  if (bump === "major") return `${parsed.major + 1}.0.0`;
  if (bump === "minor") return `${parsed.major}.${parsed.minor + 1}.0`;
  return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
}

export function tagMatchesVersion(tag: string, version: string): boolean {
  const normalizedTag = normalizeAppVersion(tag);
  const normalizedVersion = normalizeAppVersion(version);
  return normalizedTag !== null && normalizedTag === normalizedVersion && tag.trim() === `v${normalizedVersion}`;
}

export function readPackageVersion(root = process.cwd()): string {
  const packagePath = resolve(root, "package.json");
  const metadata = JSON.parse(readFileSync(packagePath, "utf8")) as { version?: unknown };
  if (typeof metadata.version !== "string") throw new Error(`${packagePath}: version: expected a string.`);
  return metadata.version;
}

export function assertGitRepository(root = process.cwd(), requireClean = false): string {
  if (!existsSync(resolve(root, ".git"))) throw new Error(`${root}: Git repository not found.`);
  const branch = execFileSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8" }).trim();
  if (!branch) throw new Error(`${root}: detached HEAD is not supported for release preparation.`);
  if (requireClean) {
    const status = execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).trim();
    if (status) throw new Error(`${root}: working tree must be clean before preparing a release.`);
  }
  return branch;
}

export function containsPlaceholder(value: unknown): boolean {
  return typeof value === "string" && /(?:REPLACE_ME|\bTODO\b|\bTBD\b|PLACEHOLDER)/i.test(value);
}
