import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { generateReleaseNotes } from "./generate-release-notes";
import { assertGitRepository, bumpVersion, readPackageVersion, type ReleaseBump } from "./releaseUtils";

const RELEASE_TYPES = new Set<ReleaseBump>(["patch", "minor", "major"]);

function updatePackageFiles(nextVersion: string, root: string): void {
  for (const name of ["package.json", "package-lock.json"]) {
    const path = resolve(root, name);
    const metadata = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    metadata.version = nextVersion;
    if (name === "package-lock.json") {
      const packages = metadata.packages as Record<string, Record<string, unknown>> | undefined;
      if (packages?.[""]) packages[""].version = nextVersion;
    }
    writeFileSync(path, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  }
}

function insertCatalogDraft(nextVersion: string, bump: ReleaseBump, date: string, root: string): void {
  const path = resolve(root, "src/releases/releaseCatalog.ts");
  const source = readFileSync(path, "utf8");
  const marker = "export const RELEASE_CATALOG: readonly AppReleaseDefinition[] = [";
  const entry = `\n  { ...detailed("${nextVersion}", "${date}", "${bump}", 3, ["code", "layout", "experience"], {\n    added: ["0"], changed: ["1"], fixed: ["2"],\n  }), managed: true },`;
  writeFileSync(path, source.replace(marker, `${marker}${entry}`), "utf8");
}

function insertLocaleDraft(nextVersion: string, root: string): void {
  const contentKey = `v${nextVersion.replace(/\.0$/, "").replace(/\./g, "_")}`;
  for (const locale of ["it", "en", "sq"] as const) {
    const path = resolve(root, `src/i18n/messages/${locale}.ts`);
    const source = readFileSync(path, "utf8");
    const changelogIndex = source.indexOf("  changelog: {");
    const entriesIndex = source.indexOf("    entries: {", changelogIndex);
    if (entriesIndex < 0) throw new Error(`${path}: changelog.entries insertion point not found.`);
    const insertAt = entriesIndex + "    entries: {".length;
    const block = `\n      ${contentKey}: {\n        headline: "REPLACE_ME ${locale} headline",\n        summary: "REPLACE_ME ${locale} summary",\n        hero: { eyebrow: "REPLACE_ME", title: "buildER ${nextVersion}", subtitle: "REPLACE_ME" },\n        highlights: {\n          code: { title: "REPLACE_ME", description: "REPLACE_ME", tag: "REPLACE_ME" },\n          layout: { title: "REPLACE_ME", description: "REPLACE_ME", tag: "REPLACE_ME" },\n          experience: { title: "REPLACE_ME", description: "REPLACE_ME", tag: "REPLACE_ME" },\n        },\n        updates: { "0": "REPLACE_ME", "1": "REPLACE_ME", "2": "REPLACE_ME" },\n      },`;
    writeFileSync(path, `${source.slice(0, insertAt)}${block}${source.slice(insertAt)}`, "utf8");
  }
}

export function prepareRelease(bump: ReleaseBump, root = process.cwd()): string {
  if (!RELEASE_TYPES.has(bump)) throw new Error(`release: type must be patch, minor, or major; received "${bump}".`);
  assertGitRepository(root, true);
  const current = readPackageVersion(root);
  const next = bumpVersion(current, bump);
  const date = new Date().toISOString().slice(0, 10);
  updatePackageFiles(next, root);
  insertCatalogDraft(next, bump, date, root);
  insertLocaleDraft(next, root);
  console.log(`Prepared buildER ${next}. Complete every REPLACE_ME value in it/en/sq, then run npm run release:finalize.`);
  return next;
}

function runNpm(script: string, root: string): void {
  execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", script], { cwd: root, stdio: "inherit" });
}

export function finalizeRelease(options: { commit: boolean }, root = process.cwd()): void {
  const branch = assertGitRepository(root, false);
  runNpm("release:check", root);
  runNpm("changelog:check", root);
  execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["test"], { cwd: root, stdio: "inherit" });
  runNpm("build", root);
  const version = readPackageVersion(root);
  const notesPath = resolve(root, "release-notes.md");
  writeFileSync(notesPath, generateReleaseNotes(version), "utf8");
  console.log(`buildER ${version} validated on branch ${branch}. Notes: ${notesPath}`);
  if (options.commit) {
    execFileSync("git", ["add", "package.json", "package-lock.json", "src/releases", "src/i18n/messages", "CHANGELOG.md", "release-notes.md"], { cwd: root, stdio: "inherit" });
    execFileSync("git", ["commit", "-m", `chore(release): buildER ${version}`], { cwd: root, stdio: "inherit" });
    execFileSync("git", ["tag", "-a", `v${version}`, "-m", `buildER v${version}`], { cwd: root, stdio: "inherit" });
    console.log(`Created local commit and annotated tag v${version}. Nothing was pushed.`);
  }
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) {
  try {
    const args = process.argv.slice(2);
    if (args.includes("--finalize")) finalizeRelease({ commit: args.includes("--commit") });
    else prepareRelease(args.find((arg) => !arg.startsWith("--")) as ReleaseBump);
  } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
}
