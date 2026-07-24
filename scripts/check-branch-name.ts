import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { loadRepositoryPolicy, type RepositoryPolicy } from "./repositoryPolicy";

export function validateBranchName(branchName: string, policy: RepositoryPolicy): string[] {
  const branch = branchName.trim();
  const errors: string[] = [];
  if (!branch) return ["Branch name is empty."];

  const branchPattern = new RegExp(policy.branch.pattern);
  if (!branchPattern.test(branch)) {
    errors.push(
      `"${branch}" is not allowed. Use ${policy.permanentBranch}, <prefix>/english-kebab-case, or release/X.Y.Z.`,
    );
  }
  if (branch.startsWith("release/") && !new RegExp(policy.branch.releasePattern).test(branch)) {
    errors.push(`"${branch}" must use release/ followed by a full SemVer version.`);
  }
  return errors;
}

export function resolveBranchName(
  explicit: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
  root = process.cwd(),
): string {
  if (explicit?.trim()) return explicit.trim();
  if (env.GITHUB_HEAD_REF?.trim()) return env.GITHUB_HEAD_REF.trim();
  if (env.GITHUB_REF_NAME?.trim()) return env.GITHUB_REF_NAME.trim();
  try {
    return execFileSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8" }).trim();
  } catch (error) {
    throw new Error(`Cannot determine the branch from Git: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function runBranchCheck(args = process.argv.slice(2), root = process.cwd()): void {
  const policy = loadRepositoryPolicy(root);
  const explicit = args.find((arg) => !arg.startsWith("--"));
  const branch = resolveBranchName(explicit, process.env, root);
  const errors = validateBranchName(branch, policy);
  if (errors.length > 0) throw new Error(`Branch policy failed:\n- ${errors.join("\n- ")}`);
  console.log(`Branch "${branch}" satisfies repository policy ${policy.policyVersion}.`);
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) {
  try {
    runBranchCheck();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
