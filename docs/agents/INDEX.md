# Canonical agent instruction index

Policy-Version: 1.0.0

This is the single routing index shared by Codex and Claude Code. Repository instructions are sufficient to begin work: Notion, prior conversations, and remembered project context are never prerequisites.

## Mandatory reading and precedence

For every repository modification, read:

1. [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md)
2. [`WORKFLOW.md`](WORKFLOW.md)
3. [`TESTING.md`](TESTING.md)

Then read every task-specific document selected below. A rule remains mandatory even when the user did not repeat it in the current prompt.

Apply instructions in this order:

1. platform safety and the user's explicit request;
2. root `AGENTS.md` or `CLAUDE.md` entrypoint;
3. this index and the routed canonical documents;
4. public contributor and specialist documentation;
5. implementation, tests, and machine-readable configuration.

When prose disagrees with executable behavior, inspect the implementation and tests, resolve the contradiction in the same change, and leave one documented source of truth. [`config/repository-policy.json`](../../config/repository-policy.json) is authoritative for values consumed by policy scripts.

## Routing table

| Task type | Mandatory documents |
| --- | --- |
| Any modification | `PROJECT_CONTEXT.md`, `WORKFLOW.md`, `TESTING.md` |
| Branch, commit, or Pull Request | `WORKFLOW.md`, [`CONTRIBUTING.md`](../../CONTRIBUTING.md) |
| Version update or preparation | `RELEASES.md`, [`docs/RELEASING.md`](../RELEASING.md) |
| Release publication | `RELEASES.md`, [`docs/RELEASING.md`](../RELEASING.md) |
| UI or component change | `RESPONSIVE_UI.md`, [`docs/CODEX_UI_STYLE_GUIDE.md`](../CODEX_UI_STYLE_GUIDE.md) |
| Responsive or layout change | `RESPONSIVE_UI.md` |
| Canvas, coordinates, zoom, pan, or drag | `RESPONSIVE_UI.md`, `TESTING.md` |
| Parser or serialization | `ER_DOMAIN.md`, `TESTING.md` |
| ER or logical transformation | `ER_DOMAIN.md`, `TESTING.md` |
| i18n change | `PROJECT_CONTEXT.md`, `TESTING.md` |
| Configuration or dependency | `WORKFLOW.md`, `TESTING.md` |

## Explicit task triggers

### Trigger: release

When the user says “update the app version”, “aggiorna la versione dell'app”, “prepare a release”, or equivalent, read [`RELEASES.md`](RELEASES.md), determine the SemVer bump automatically, and prepare the version without asking for a number when evidence makes the bump deterministic. “Publish the release” is a separate, post-merge operation.

### Trigger: branch

When the user requests implementation or branch creation without supplying a name, read [`WORKFLOW.md`](WORKFLOW.md), infer the type and a concise English kebab-case description, and create the branch without asking for a deducible name.

### Trigger: commit

Before staging or committing, read [`WORKFLOW.md`](WORKFLOW.md), inspect the diff, stage only in-scope files, and use the repository Conventional Commit policy.

### Trigger: responsive

Any UI, layout, canvas, modal, panel, or responsive change requires
[`RESPONSIVE_UI.md`](RESPONSIVE_UI.md), including its viewport, accessibility,
i18n, token, and canvas invariants.

## Completion

An activity ends only after the routed checks have run in proportion to risk, the diff and working tree have been inspected, documentation is aligned, and the final response reports what changed, tests run and skipped, risks, branch, commits, and PR or release state. Never claim a check that was not executed.
