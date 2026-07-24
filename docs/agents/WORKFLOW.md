# Repository workflow

This document defines the operating workflow shared by Codex and Claude Code.
The machine-readable branch and commit values live in
[`config/repository-policy.json`](../../config/repository-policy.json).

## Start every task

1. Run `git branch --show-current`, `git status --short`, and
   `git rev-parse HEAD`.
2. Preserve unrelated work. Do not delete it, overwrite it, reset it, clean it,
   or stash it automatically.
3. Inspect the relevant implementation, tests, documentation, and current
   repository conventions.
4. Start from an updated `main` unless the user explicitly requests a different
   base. Never implement directly on `main`.

## Automatic branch creation

If the user requests implementation or a branch without supplying its name:

1. classify the work;
2. derive a short, meaningful English description;
3. convert it to lowercase kebab-case;
4. create the branch and report the branch plus base commit;
5. do not ask for a name when it is deducible.

| Work | Prefix |
| --- | --- |
| New compatible feature | `feat/` |
| Bug fix | `fix/` |
| Refactor | `refactor/` |
| Tests only | `test/` |
| Documentation only | `docs/` |
| Tooling or maintenance | `chore/` |
| Version preparation | `release/` |

Names use one slash only, lowercase English words, and kebab-case. They contain
no spaces, underscores, accents, or extra path segments. `release/` is followed
by a full SemVer such as `release/7.1.0`. `main` is permanent; all other
branches are temporary and should be deleted after merge.

Validate with:

```bash
npm run repo:check-branch -- feat/add-diagram-search
```

## Commits

Use Conventional Commits:

```text
type(scope): imperative description
```

Allowed types are `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `build`,
`ci`, `perf`, and `release`. A breaking change may use `!` and must explain the
break in the body with `BREAKING CHANGE:`.

The description is English, imperative, starts with lowercase text, and has no
final period. Established proper names such as Codex, Claude, TypeScript, or
SQLite retain their official casing. The optional scope is short, lowercase,
and pertinent. One commit represents one logical unit; implementation and its
tests may share a commit. Valid examples:

```text
fix(translation): preserve multivalued subtype cardinality
feat(canvas): add relationship alignment guides
test(translation): cover collapse-up regression
docs(agents): document release workflow
chore(repo): enforce branch naming policy
release(app): prepare version 7.1.0
```

Do not use messages such as `update files`, `Changes`, `fix stuff`,
`Fixed bug.`, or `feat: Added New Feature`.

Before staging, inspect `git diff` and `git status --short`. Stage explicit
paths when the worktree is mixed; do not use `git add .` indiscriminately.
Never include unrelated changes or generated output. Do not amend, rewrite
history, force-push, or claim unexecuted tests without an explicit request.

Validate a message, message file, or PR range with:

```bash
npm run repo:check-commits -- --message "docs(agents): document workflow"
npm run repo:check-commits -- --file .git/COMMIT_EDITMSG
npm run repo:check-commits -- --base origin/main --head HEAD
```

## Pull Requests

Keep the PR focused, link its Issue, explain behavior and risk, list exact
tests run and skipped, and complete only applicable checklist items. UI work
includes before/after screenshots and tested viewports. Domain and file-format
work explains compatibility and regression coverage.

Do not merge automatically. Do not create tags or publish releases while
preparing a version. Push without force and confirm the final remote branch.

## Definition of done and final report

Before completion:

- inspect the final diff and `git diff --check`;
- run the matrix selected by [`TESTING.md`](TESTING.md);
- update affected docs and tests;
- confirm no secrets, real databases, logs, temporary files, or generated
  output were added;
- report the Issue, branch, base, commits, PR, files changed, contradictions
  resolved, checks and results, skipped checks with reasons, risks, and final
  working-tree state.

Notion is never required for this workflow. GitHub is the operational source
for code, Issues, branches, commits, PRs, Actions, tags, and releases.
