import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { loadRepositoryPolicy, validateRepositoryPolicy, type RepositoryPolicy } from "./repositoryPolicy";

const INSTRUCTION_FILE = /^(?:AGENTS(?:\.override)?|CLAUDE(?:\.local)?)\.md$/i;
const SKIPPED_DIRECTORIES = new Set([".git", "node_modules", "dist", "coverage", "playwright-report", "test-results"]);

function normalize(path: string): string {
  return path.replaceAll("\\", "/");
}

function walkFiles(root: string, directory = root): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      return SKIPPED_DIRECTORIES.has(entry.name) ? [] : walkFiles(root, absolute);
    }
    return entry.isFile() ? [normalize(relative(root, absolute))] : [];
  });
}

function policyVersion(source: string): string | null {
  return source.match(/^Policy-Version:\s*(\d+\.\d+\.\d+)\s*$/m)?.[1] ?? null;
}

function relativeMarkdownLinks(source: string): string[] {
  return [...source.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)]
    .map((match) => match[1].trim().replace(/^<|>$/g, "").split(/\s+["']/)[0])
    .filter((target) => !/^(?:https?:|mailto:|#)/i.test(target));
}

function matchesForbiddenPattern(path: string, pattern: string): boolean {
  const normalized = normalize(path);
  if (pattern.startsWith("*.")) return normalized.endsWith(pattern.slice(1));
  return normalized === pattern.replace(/\/$/, "") || normalized.startsWith(pattern);
}

function trackedFiles(root: string): string[] {
  if (!existsSync(resolve(root, ".git"))) return [];
  try {
    return execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" })
      .split("\0")
      .filter(Boolean)
      .map(normalize);
  } catch {
    return [];
  }
}

export function validateAgentInstructions(root = process.cwd()): string[] {
  const errors: string[] = [];
  const policyPath = resolve(root, "config/repository-policy.json");
  if (!existsSync(policyPath)) return ["config/repository-policy.json is missing."];

  let rawPolicy: unknown;
  try {
    rawPolicy = JSON.parse(readFileSync(policyPath, "utf8"));
  } catch (error) {
    return [`config/repository-policy.json is invalid JSON: ${error instanceof Error ? error.message : String(error)}`];
  }
  errors.push(...validateRepositoryPolicy(rawPolicy).map((error) => `config/repository-policy.json: ${error}`));
  if (errors.length > 0) return errors;
  const policy = loadRepositoryPolicy(root);

  const sources = new Map<string, string>();
  for (const path of [...policy.agentDocuments.entrypoints, ...policy.agentDocuments.required]) {
    const absolute = resolve(root, path);
    if (!existsSync(absolute) || !statSync(absolute).isFile()) {
      errors.push(`${path} is required but missing.`);
      continue;
    }
    sources.set(path, readFileSync(absolute, "utf8"));
  }

  const entryVersions = policy.agentDocuments.entrypoints.map((path) => ({
    path,
    version: policyVersion(sources.get(path) ?? ""),
  }));
  for (const entry of entryVersions) {
    if (!entry.version) errors.push(`${entry.path} must declare Policy-Version.`);
    else if (entry.version !== policy.policyVersion) {
      errors.push(`${entry.path} declares policy ${entry.version}, expected ${policy.policyVersion}.`);
    }
    if (!(sources.get(entry.path) ?? "").includes(policy.canonicalIndex)) {
      errors.push(`${entry.path} must point explicitly to ${policy.canonicalIndex}.`);
    }
  }
  const distinctVersions = new Set(entryVersions.map((entry) => entry.version).filter(Boolean));
  if (distinctVersions.size > 1) errors.push("AGENTS.md and CLAUDE.md declare different policy versions.");

  const indexSource = sources.get(policy.canonicalIndex) ?? "";
  for (const trigger of policy.agentDocuments.requiredTriggers) {
    if (!new RegExp(`^### Trigger: ${trigger}$`, "im").test(indexSource)) {
      errors.push(`${policy.canonicalIndex} is missing the "${trigger}" trigger.`);
    }
  }

  for (const [sourcePath, source] of sources) {
    for (const target of relativeMarkdownLinks(source)) {
      const pathOnly = decodeURIComponent(target.split("#")[0]);
      if (!pathOnly) continue;
      const absolute = resolve(dirname(resolve(root, sourcePath)), pathOnly);
      if (!existsSync(absolute)) errors.push(`${sourcePath}: relative Markdown link "${target}" does not exist.`);
    }
  }

  const allowedInstructions = new Set(policy.agentDocuments.allowedInstructionFiles.map(normalize));
  for (const path of walkFiles(root).filter((candidate) => INSTRUCTION_FILE.test(candidate.split("/").at(-1) ?? ""))) {
    if (!allowedInstructions.has(path)) {
      errors.push(`${path} is an undocumented competing agent instruction file.`);
    }
  }

  const packagePath = resolve(root, "package.json");
  if (!existsSync(packagePath)) {
    errors.push("package.json is missing.");
  } else {
    const metadata = JSON.parse(readFileSync(packagePath, "utf8")) as { scripts?: Record<string, string> };
    for (const script of policy.minimumVerificationScripts) {
      if (!metadata.scripts?.[script]) errors.push(`package.json is missing required script "${script}".`);
    }
  }

  for (const path of trackedFiles(root)) {
    const matched = policy.repositoryHygiene.forbiddenTrackedPatterns.find((pattern) =>
      matchesForbiddenPattern(path, pattern),
    );
    if (matched) errors.push(`${path} is tracked but forbidden by hygiene pattern "${matched}".`);
  }
  return errors;
}

export function runAgentInstructionCheck(root = process.cwd()): void {
  const errors = validateAgentInstructions(root);
  if (errors.length > 0) throw new Error(`Agent instruction validation failed:\n- ${errors.join("\n- ")}`);
  const policy = loadRepositoryPolicy(root);
  console.log(
    `Codex and Claude entrypoints share policy ${policy.policyVersion}; documents, links, triggers, scripts, and hygiene are valid.`,
  );
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) {
  try {
    runAgentInstructionCheck();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
