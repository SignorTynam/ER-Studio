import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { loadRepositoryPolicy, type RepositoryPolicy } from "./repositoryPolicy";

interface CommitRecord {
  hash: string;
  message: string;
}

function optionValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function subjectFromMessage(message: string): string {
  return message.replace(/\r\n/g, "\n").split("\n")[0].trim();
}

export function validateCommitMessage(message: string, policy: RepositoryPolicy): string[] {
  const subject = subjectFromMessage(message);
  const errors: string[] = [];
  if (!subject) return ["Commit subject is empty."];
  if (!new RegExp(policy.commit.pattern).test(subject)) {
    errors.push(
      `"${subject}" must use an allowed Conventional Commit type, optional lowercase scope, and lowercase imperative subject.`,
    );
  }

  const description = subject.includes(": ") ? subject.slice(subject.indexOf(": ") + 2) : "";
  if (
    policy.commit.subjectMustStartLowercase &&
    description &&
    /^[A-ZÀ-ÖØ-Þ]/u.test(description)
  ) {
    errors.push("Commit description must start with lowercase text.");
  }
  if (policy.commit.forbidFinalPeriod && subject.endsWith(".")) {
    errors.push("Commit subject must not end with a period.");
  }

  const breakingBang = /^[a-z]+(?:\([^)]+\))?!:/.test(subject);
  const hasBreakingBody = policy.semver.breakingMarkers.some((marker) => message.includes(marker));
  if (breakingBang && !hasBreakingBody) {
    errors.push(`Breaking commit "${subject}" must include a BREAKING CHANGE: explanation in its body.`);
  }
  return errors;
}

function git(root: string, args: string[]): string {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  } catch (error) {
    throw new Error(`git ${args.join(" ")} failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function commitsInRange(root: string, base: string, head: string): CommitRecord[] {
  const output = git(root, ["log", "--reverse", "--format=%H%x1f%B%x1e", `${base}..${head}`]);
  if (!output) return [];
  return output
    .split("\x1e")
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const separator = record.indexOf("\x1f");
      return {
        hash: separator >= 0 ? record.slice(0, separator) : "unknown",
        message: separator >= 0 ? record.slice(separator + 1).trim() : record,
      };
    });
}

function defaultRange(root: string, policy: RepositoryPolicy): { base: string; head: string } {
  const head = "HEAD";
  const branch = git(root, ["branch", "--show-current"]);
  if (process.env.GITHUB_BASE_REF) {
    return { base: `origin/${process.env.GITHUB_BASE_REF}`, head: process.env.GITHUB_SHA ?? head };
  }
  if (branch === policy.permanentBranch) return { base: "HEAD^", head };
  const remoteBase = `refs/remotes/origin/${policy.permanentBranch}`;
  const baseRef = (() => {
    try {
      git(root, ["rev-parse", "--verify", remoteBase]);
      return `origin/${policy.permanentBranch}`;
    } catch {
      return policy.permanentBranch;
    }
  })();
  return { base: git(root, ["merge-base", baseRef, head]), head };
}

export function runCommitCheck(args = process.argv.slice(2), root = process.cwd()): void {
  const policy = loadRepositoryPolicy(root);
  const file = optionValue(args, "--file");
  const explicitMessage = optionValue(args, "--message");
  const positionalMessage = !file && !explicitMessage && args.length === 1 && !args[0].startsWith("--") ? args[0] : undefined;

  let commits: CommitRecord[];
  if (file) {
    const message = readFileSync(resolve(root, file), "utf8")
      .split(/\r?\n/)
      .filter((line) => !line.startsWith("#"))
      .join("\n")
      .trim();
    commits = [{ hash: file, message }];
  } else if (explicitMessage ?? positionalMessage) {
    commits = [{ hash: "argument", message: explicitMessage ?? positionalMessage ?? "" }];
  } else {
    const explicitBase = optionValue(args, "--base");
    const explicitHead = optionValue(args, "--head");
    const defaults = explicitBase && explicitHead ? null : defaultRange(root, policy);
    const base = explicitBase ?? defaults?.base;
    const head = explicitHead ?? defaults?.head;
    if (!base || !head) throw new Error("Commit range requires both --base and --head.");
    commits = commitsInRange(root, base, head);
    if (commits.length === 0) {
      console.log(`No commits found in ${base}..${head}; nothing to validate.`);
      return;
    }
  }

  const failures = commits.flatMap((commit) =>
    validateCommitMessage(commit.message, policy).map((error) => `${commit.hash.slice(0, 12)}: ${error}`),
  );
  if (failures.length > 0) throw new Error(`Commit policy failed:\n- ${failures.join("\n- ")}`);
  console.log(`${commits.length} commit message(s) satisfy repository policy ${policy.policyVersion}.`);
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) {
  try {
    runCommitCheck();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
