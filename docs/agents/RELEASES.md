# Version preparation and release publication

Read this document with [`docs/RELEASING.md`](../RELEASING.md). `package.json`
is the application-version source; `src/releases/releaseCatalog.ts`, the three
locale dictionaries, and the generated block in `CHANGELOG.md` describe the
release. Existing scripts remain the implementation source of truth.

## Two different operations

### Prepare or update the version

Preparation means:

- determine the next version from repository evidence;
- create `release/<version>` from updated `main`;
- update `package.json`, `package-lock.json`, the release catalog, Italian,
  English, and Albanian release content, and generated changelog;
- generate release notes from real changes, complete all placeholders, and run
  the release checks;
- commit, push, and open a PR.

Preparation does not create a tag, publish a GitHub Release, merge the PR, or
deploy. `release-notes.md` is generated only when explicitly requested and is
not committed unless the release process requires it.

### Publish the release

Publication occurs only after the preparation PR is merged into `main`. Verify
the declared version and existing remote tag/Release, then run the **GitHub
Release** workflow from `main` with explicit confirmation. The workflow
validates, creates only missing state, refuses to move a conflicting tag, and
verifies publication inputs. Never duplicate or overwrite an existing
release.

## Deterministic SemVer selection

Use the highest required level across all changes:

| Evidence | Bump |
| --- | --- |
| `BREAKING CHANGE` or Conventional Commit `!` | MAJOR |
| Compatible `feat` | MINOR |
| Compatible `fix`, `perf`, or `refactor` | PATCH |
| Only internal `docs`, `test`, `ci`, `chore`, or `build` | no automatic bump |

Examples: `7.0.0 + fix -> 7.0.1`, `7.0.1 + feat -> 7.1.0`, and
`7.1.0 + breaking -> 8.0.0`.

Evidence priority:

1. `BREAKING CHANGE` markers;
2. Conventional Commit `!`;
3. Conventional Commit types;
4. PR and release-catalog metadata;
5. actual API, file-format, and behavior changes when history is insufficient.

Do not choose randomly or ask for a number when the evidence is deterministic.
If compatibility is genuinely ambiguous, inspect file formats and internal
APIs, choose the most cautious level supported by evidence, and document the
reason without inventing a breaking change.

Run:

```bash
npm run release:next-version
npm run release:next-version -- --json
```

On a work branch the baseline is the merge-base with `main`. On `main`, the
exact tag for the current `package.json` version is accepted only when it is a
reachable reliable baseline. The catalog is useful evidence even when a
GitHub Release has not yet been published. Absence of a reliable baseline is
an error, not permission to guess.

## Preparation procedure

Start with a clean `release/<version>` branch. To create the draft files with a
known bump:

```bash
npm run release:prepare -- minor
```

To derive the bump automatically:

```bash
npm run release:prepare -- --auto
```

The existing preparation script inserts explicit `REPLACE_ME` values. Replace
every placeholder with content derived from commits, Issues, PRs, and the
actual diff; do not invent release claims. Then:

```bash
npm run changelog:generate
npm run release:check
npm run changelog:check
npm test
npm run build
npm run release:notes
```

Use `npm run release:finalize` for validation and optional note generation.
Even when a commit option is requested, finalization must not create a tag.
Tag creation belongs exclusively to publication after merge.

Only update README or other metadata if they truly embed the current
application version. Do not couple application SemVer to `.ersp`,
`.erschema`, diagram format versions, or local project history.
