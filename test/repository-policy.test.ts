import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { validateAgentInstructions } from "../scripts/check-agent-instructions";
import { validateBranchName } from "../scripts/check-branch-name";
import { runCommitCheck, validateCommitMessage } from "../scripts/check-commit-message";
import {
  classifyVersionCommits,
  determineNextVersion,
  formatNextVersion,
  type VersionCommit,
} from "../scripts/determine-next-version";
import { loadRepositoryPolicy, validateRepositoryPolicy } from "../scripts/repositoryPolicy";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const policy = loadRepositoryPolicy(ROOT);

const VALID_BRANCHES = [
  "feat/add-diagram-search",
  "fix/generalization-collapse-up",
  "refactor/project-serializer",
  "test/release-policy",
  "docs/agent-architecture",
  "chore/repository-policy",
  "release/7.1.0",
  "main",
];

const INVALID_BRANCHES = [
  "Fix/Cardinality",
  "fix_cardinality",
  "fix/cardinalità",
  "feature/new-editor",
  "fix/foo/bar",
  "release/v7.1.0",
  "release/7.1",
];

const VALID_COMMITS = [
  "fix(translation): preserve multivalued subtype cardinality",
  "feat(canvas): add alignment guides",
  "docs(agents): document responsive policy",
  "docs(agents): add shared Codex and Claude architecture",
];

const INVALID_COMMITS = ["update files", "Fix bug", "feat: Added Feature.", "changes"];

test("repository policy JSON is valid and contains the canonical values", () => {
  const raw = JSON.parse(readFileSync(resolve(ROOT, "config/repository-policy.json"), "utf8"));
  assert.deepEqual(validateRepositoryPolicy(raw), []);
  assert.equal(policy.permanentBranch, "main");
  assert.equal(policy.commit.enforceAfter, "06e5b10d38ebc004bcfe07d378d9464e794bc9f4");
  assert.deepEqual(policy.requiredLocales, ["it", "en", "sq"]);
  assert.equal(policy.requiredViewports.length, 5);
});

test("branch validator accepts every required valid example", () => {
  for (const branch of VALID_BRANCHES) {
    assert.deepEqual(validateBranchName(branch, policy), [], branch);
  }
});

test("branch validator rejects every required invalid example", () => {
  for (const branch of INVALID_BRANCHES) {
    assert.notDeepEqual(validateBranchName(branch, policy), [], branch);
  }
});

test("commit validator accepts every required valid example", () => {
  for (const message of VALID_COMMITS) {
    assert.deepEqual(validateCommitMessage(message, policy), [], message);
  }
});

test("commit validator rejects every required invalid example", () => {
  for (const message of INVALID_COMMITS) {
    assert.notDeepEqual(validateCommitMessage(message, policy), [], message);
  }
});

test("breaking bang requires an explanatory marker", () => {
  assert.notDeepEqual(validateCommitMessage("feat(api)!: remove legacy import", policy), []);
  assert.deepEqual(
    validateCommitMessage(
      "feat(api)!: remove legacy import\n\nBREAKING CHANGE: old project imports are no longer accepted",
      policy,
    ),
    [],
  );
});

test("commit range validation grandfathers history through the configured cutoff", () => {
  const root = mkdtempSync(resolve(tmpdir(), "builder-policy-commits-"));
  try {
    execFileSync("git", ["init", "-b", "main"], { cwd: root });
    execFileSync("git", ["config", "user.name", "Policy Test"], { cwd: root });
    execFileSync("git", ["config", "user.email", "policy@example.invalid"], { cwd: root });
    mkdirSync(resolve(root, "config"), { recursive: true });

    const fixturePolicy = JSON.parse(
      readFileSync(resolve(ROOT, "config/repository-policy.json"), "utf8"),
    ) as { commit: { enforceAfter: string } };
    fixturePolicy.commit.enforceAfter = "0".repeat(40);
    writeFileSync(resolve(root, "config/repository-policy.json"), `${JSON.stringify(fixturePolicy, null, 2)}\n`);
    writeFileSync(resolve(root, "fixture.txt"), "bootstrap\n");
    execFileSync("git", ["add", "config/repository-policy.json", "fixture.txt"], { cwd: root });
    execFileSync("git", ["commit", "-m", "chore(repo): create policy fixture"], { cwd: root });
    const base = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();

    writeFileSync(resolve(root, "fixture.txt"), "legacy\n");
    execFileSync("git", ["add", "fixture.txt"], { cwd: root });
    execFileSync("git", ["commit", "-m", "Legacy commit."], { cwd: root });
    const cutoff = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();

    fixturePolicy.commit.enforceAfter = cutoff;
    writeFileSync(resolve(root, "config/repository-policy.json"), `${JSON.stringify(fixturePolicy, null, 2)}\n`);
    execFileSync("git", ["add", "config/repository-policy.json"], { cwd: root });
    execFileSync("git", ["commit", "-m", "ci(repo): activate commit policy"], { cwd: root });
    writeFileSync(resolve(root, "fixture.txt"), "current\n");
    execFileSync("git", ["add", "fixture.txt"], { cwd: root });
    execFileSync("git", ["commit", "-m", "fix(repo): preserve current history"], { cwd: root });

    assert.doesNotThrow(() => runCommitCheck(["--base", base, "--head", "HEAD"], root));

    writeFileSync(resolve(root, "fixture.txt"), "invalid\n");
    execFileSync("git", ["add", "fixture.txt"], { cwd: root });
    execFileSync("git", ["commit", "-m", "Invalid new commit."], { cwd: root });
    assert.throws(
      () => runCommitCheck(["--base", base, "--head", "HEAD"], root),
      /Invalid new commit\./,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("SemVer classification uses the highest detected change", () => {
  const commits: VersionCommit[] = [
    { hash: "a", subject: "fix(canvas): preserve coordinates", body: "" },
    { hash: "b", subject: "feat(canvas): add guides", body: "" },
  ];
  const minor = classifyVersionCommits(commits, ["src/canvas/DiagramCanvas.tsx"], policy);
  assert.equal(minor.requiredBump, "minor");

  const major = classifyVersionCommits(
    [...commits, { hash: "c", subject: "feat(files)!: replace project format", body: "BREAKING CHANGE: format 6 is removed" }],
    ["src/utils/projectFile.ts"],
    policy,
  );
  assert.equal(major.requiredBump, "major");

  const none = classifyVersionCommits(
    [{ hash: "d", subject: "docs(agents): clarify workflow", body: "" }],
    ["docs/agents/WORKFLOW.md"],
    policy,
  );
  assert.equal(none.requiredBump, "none");
});

test("next-version detection uses the main merge-base and does not modify files", () => {
  const root = mkdtempSync(resolve(tmpdir(), "builder-policy-version-"));
  try {
    mkdirSync(resolve(root, "config"), { recursive: true });
    cpSync(resolve(ROOT, "config/repository-policy.json"), resolve(root, "config/repository-policy.json"));
    writeFileSync(resolve(root, "package.json"), '{"name":"fixture","version":"7.0.0"}\n');
    execFileSync("git", ["init", "-b", "main"], { cwd: root });
    execFileSync("git", ["config", "user.name", "Policy Test"], { cwd: root });
    execFileSync("git", ["config", "user.email", "policy@example.invalid"], { cwd: root });
    execFileSync("git", ["add", "package.json", "config/repository-policy.json"], { cwd: root });
    execFileSync("git", ["commit", "-m", "chore(repo): create fixture"], { cwd: root });
    execFileSync("git", ["tag", "v7.0.0"], { cwd: root });
    execFileSync("git", ["switch", "-c", "fix/preserve-files"], { cwd: root });
    writeFileSync(resolve(root, "fixture.txt"), "changed\n");
    execFileSync("git", ["add", "fixture.txt"], { cwd: root });
    execFileSync("git", ["commit", "-m", "fix(files): preserve project metadata"], { cwd: root });

    const result = determineNextVersion({ root });
    assert.equal(result.requiredBump, "patch");
    assert.equal(result.nextVersion, "7.0.1");
    assert.match(formatNextVersion(result), /Next version: 7\.0\.1/);
    assert.equal(JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).version, "7.0.0");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("agent instruction checker validates the real shared architecture", () => {
  assert.deepEqual(validateAgentInstructions(ROOT), []);
});

test("agent instruction checker reports a missing Claude entrypoint", () => {
  const root = mkdtempSync(resolve(tmpdir(), "builder-policy-agents-"));
  try {
    const files = [
      "AGENTS.md",
      "CLAUDE.md",
      "package.json",
      "config/repository-policy.json",
      ...policy.agentDocuments.required,
    ];
    for (const file of files) {
      const destination = resolve(root, file);
      mkdirSync(dirname(destination), { recursive: true });
      cpSync(resolve(ROOT, file), destination);
    }
    rmSync(resolve(root, "CLAUDE.md"));
    assert.ok(validateAgentInstructions(root).some((error) => error.includes("CLAUDE.md is required but missing")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("repository policy workflow wires documented PR checks with read-only permissions", () => {
  const workflow = readFileSync(resolve(ROOT, ".github/workflows/repository-policy.yml"), "utf8");
  assert.match(workflow, /^on:\s*\n\s+pull_request:/m);
  assert.match(workflow, /permissions:\s*\n\s+contents: read/m);
  for (const command of [
    "npm ci",
    "npm run agents:check",
    "npm run repo:check-branch",
    "npm run repo:check-commits",
    "npm run test:policy",
    "npm test",
    "npm run build",
    "npm run release:check",
    "npm run changelog:check",
    "npm run release:notes",
  ]) {
    assert.match(workflow, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(workflow, /contents:\s*write/);
});
