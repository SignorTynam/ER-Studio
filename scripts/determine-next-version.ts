import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { bumpVersion, readPackageVersion, type ReleaseBump } from "./releaseUtils";
import { loadRepositoryPolicy, type RepositoryPolicy } from "./repositoryPolicy";

export type RequiredBump = ReleaseBump | "none";

export interface VersionCommit {
  hash: string;
  subject: string;
  body: string;
}

export interface NextVersionResult {
  currentVersion: string;
  baseline: string;
  head: string;
  commits: VersionCommit[];
  changedFiles: string[];
  counts: {
    breaking: number;
    features: number;
    compatible: number;
    internal: number;
    unknown: number;
  };
  requiredBump: RequiredBump;
  nextVersion: string | null;
  reason: string;
}

function git(root: string, args: string[], allowFailure = false): string {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  } catch (error) {
    if (allowFailure) return "";
    throw new Error(`git ${args.join(" ")} failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function gitSucceeds(root: string, args: string[]): boolean {
  try {
    execFileSync("git", args, { cwd: root, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function conventionalType(subject: string): string | null {
  return subject.match(/^([a-z]+)(?:\([^)]+\))?!?:/)?.[1] ?? null;
}

export function classifyVersionCommits(
  commits: VersionCommit[],
  changedFiles: string[],
  policy: RepositoryPolicy,
): Pick<NextVersionResult, "counts" | "requiredBump" | "reason"> {
  const counts = { breaking: 0, features: 0, compatible: 0, internal: 0, unknown: 0 };
  for (const commit of commits) {
    const breaking =
      /^[a-z]+(?:\([^)]+\))?!:/.test(commit.subject) ||
      policy.semver.breakingMarkers.some((marker) => commit.body.includes(marker));
    if (breaking) {
      counts.breaking += 1;
      continue;
    }
    const type = conventionalType(commit.subject);
    if (type && policy.semver.featureTypes.includes(type)) counts.features += 1;
    else if (type && policy.semver.compatibleTypes.includes(type)) counts.compatible += 1;
    else if (type && policy.semver.internalTypes.includes(type)) counts.internal += 1;
    else counts.unknown += 1;
  }

  if (counts.breaking > 0) {
    return { counts, requiredBump: "major", reason: `${counts.breaking} breaking commit(s) detected.` };
  }
  if (counts.features > 0) {
    return { counts, requiredBump: "minor", reason: `${counts.features} compatible feature commit(s) detected.` };
  }
  if (counts.compatible > 0) {
    return { counts, requiredBump: "patch", reason: `${counts.compatible} compatible fix/improvement commit(s) detected.` };
  }
  if (counts.unknown > 0) {
    const applicationChange = changedFiles.some((path) =>
      /^(?:src|public)\//.test(path) || /^(?:index\.html|vite\.config\.ts)$/.test(path),
    );
    if (applicationChange) {
      return {
        counts,
        requiredBump: "patch",
        reason: `${counts.unknown} unclassified commit(s) change application files; conservative compatible patch selected.`,
      };
    }
    return {
      counts,
      requiredBump: "none",
      reason: `${counts.unknown} unclassified commit(s) affect only internal repository files; no automatic bump.`,
    };
  }
  return {
    counts,
    requiredBump: "none",
    reason: commits.length === 0
      ? "No changes exist after the reliable baseline."
      : "Only documentation, tests, CI, build, release, or maintenance commits were detected.",
  };
}

function commitsBetween(root: string, baseline: string, head: string): VersionCommit[] {
  const output = git(root, ["log", "--reverse", "--format=%H%x1f%s%x1f%b%x1e", `${baseline}..${head}`]);
  if (!output) return [];
  return output
    .split("\x1e")
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [hash = "", subject = "", ...body] = record.split("\x1f");
      return { hash, subject, body: body.join("\x1f").trim() };
    });
}

function resolveBaseline(
  root: string,
  currentVersion: string,
  permanentBranch: string,
  head: string,
  explicitBase?: string,
): string {
  if (explicitBase) return git(root, ["merge-base", explicitBase, head]);
  const branch = git(root, ["branch", "--show-current"]);
  if (!branch) throw new Error("Cannot determine a reliable baseline from detached HEAD; pass --base <ref>.");

  if (branch !== permanentBranch) {
    const remote = `origin/${permanentBranch}`;
    const baseRef = gitSucceeds(root, ["rev-parse", "--verify", remote]) ? remote : permanentBranch;
    if (!gitSucceeds(root, ["rev-parse", "--verify", baseRef])) {
      throw new Error(`Cannot resolve ${permanentBranch}; fetch it or pass --base <ref>.`);
    }
    return git(root, ["merge-base", baseRef, head]);
  }

  const tag = `v${currentVersion}`;
  const tagCommit = git(root, ["rev-list", "-n", "1", tag], true);
  if (!tagCommit || !gitSucceeds(root, ["merge-base", "--is-ancestor", tagCommit, head])) {
    throw new Error(`No reliable baseline: reachable tag ${tag} for package.json ${currentVersion} was not found.`);
  }
  return tagCommit;
}

export function determineNextVersion(
  options: { root?: string; base?: string; head?: string } = {},
): NextVersionResult {
  const root = options.root ?? process.cwd();
  const policy = loadRepositoryPolicy(root);
  const currentVersion = readPackageVersion(root);
  const head = options.head ?? "HEAD";
  const baseline = resolveBaseline(root, currentVersion, policy.permanentBranch, head, options.base);
  const commits = commitsBetween(root, baseline, head);
  const changedFiles = git(root, ["diff", "--name-only", `${baseline}..${head}`])
    .split(/\r?\n/)
    .filter(Boolean)
    .map((path) => path.replaceAll("\\", "/"));
  const classification = classifyVersionCommits(commits, changedFiles, policy);
  return {
    currentVersion,
    baseline,
    head,
    commits,
    changedFiles,
    ...classification,
    nextVersion:
      classification.requiredBump === "none"
        ? null
        : bumpVersion(currentVersion, classification.requiredBump),
  };
}

function optionValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

export function formatNextVersion(result: NextVersionResult): string {
  const lines = [
    `Current version: ${result.currentVersion}`,
    `Baseline: ${result.baseline}`,
    "Detected changes:",
    `- ${result.counts.breaking} breaking`,
    `- ${result.counts.features} features`,
    `- ${result.counts.compatible} compatible fixes/improvements`,
    `- ${result.counts.internal} internal-only`,
    `- ${result.counts.unknown} unclassified`,
    "",
    `Required bump: ${result.requiredBump}`,
    `Next version: ${result.nextVersion ?? "none"}`,
    `Reason: ${result.reason}`,
  ];
  return lines.join("\n");
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) {
  try {
    const args = process.argv.slice(2);
    const result = determineNextVersion({
      base: optionValue(args, "--base"),
      head: optionValue(args, "--head"),
    });
    if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
    else console.log(formatNextVersion(result));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
