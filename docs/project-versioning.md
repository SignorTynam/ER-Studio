# Project Versioning

buildER stores project version history inside the same `.ersp` file as the current working project. The feature is intentionally local and domain-specific: it does not use Git, GitHub sync, IndexedDB, or localStorage as the canonical project history.

## File model

Current `.ersp` files keep both:

- the current working copy, including ER diagram, translation workspace, logical workspace, viewports, code draft, selections, panels, toolbar state, focus mode, and diagnostics preference;
- `versioning`, a `ProjectVersioningState` with commits, tags, settings, and `headCommitId`.

Older `.ersp` files remain supported. Missing or malformed workspace/versioning data is sanitized during parsing and falls back to safe defaults instead of blocking file load.

## Commits and snapshots

A `ProjectCommit` stores a complete `ProjectCommitSnapshot`. The snapshot is normalized and cloned before it is saved so later workspace mutations do not alter historical commits. Snapshot checksums and equality helpers are deterministic and are used by commit creation, dirty state, diff, and restore logic.

Commit statistics are derived from the snapshot and include ER counts, logical table count, and warning/error counts when available.

## User tags and internal markers

`ProjectVersioningState.tags` is the only collection of user-authored commit tags. User tag names are trimmed, required, limited to 50 characters, globally unique without regard to case, and cannot use the reserved internal names `auto-backup` or `auto-restore`. Descriptions are optional, trimmed, and limited to 280 characters. Existing `color` values are preserved for file compatibility even though the Source Control panel does not expose a color picker.

`ProjectCommit.tags` has a separate purpose: it stores internal commit markers such as `auto-backup` and `auto-restore`. These values are serialized for compatibility and diagnostics, but they are not shown as user tags and never protect a commit from retention.

Tag identifiers use `crypto.randomUUID()` through the same secure browser mechanism used by project objects. There is no timestamp or `Math.random()` fallback. File loading removes malformed identifiers, duplicate identifiers, case-insensitive duplicate names, reserved names, and tags whose commit no longer exists. The first valid file entry wins deterministically.

## HEAD and working copy

`headCommitId` points to the latest committed project version. The working copy is the current editable project state. It may match HEAD, differ from HEAD, or exist without any commit yet.

Dirty state is computed by comparing the current working snapshot with HEAD and classifies changes into broad categories:

- ER schema;
- layout and viewports;
- logical model;
- ERS code draft;
- saved workspace state.

The boolean dirty helper remains available for legacy callers, but new UI should prefer the structured dirty state.

## Source Control composer

The activity-panel composer always uses a vertical flow: the commit message
textarea occupies the first row and the action row sits below it, aligned to the
end. The layout is the same at desktop and narrow panel widths, so placeholder
text and validation feedback retain usable space. `Ctrl+Enter` and `Cmd+Enter`
submit through the same guarded commit handler as the button; disabled and busy
states remain authoritative.

The selected commit shows its user tags as compact editable chips. Creating and editing uses an accessible modal; deleting a tag may first show a retention preview when that deletion makes old commits eligible for cleanup.

## History settings and retention

New projects default to:

- at most 200 commits, with a supported range of 1–1,000;
- preserving commits that have at least one user tag;
- hiding ordinary automatic commits in the timeline.

Retention is pure and immutable. It runs after a manual commit, after both automatic restore commits have been planned, after the maximum changes, when tagged-commit protection changes from enabled to disabled, and after a user tag is deleted. Candidates are ordered from oldest to newest by `createdAt`, then by commit ID. HEAD is always protected. User-tagged commits are protected only while `keepTaggedCommits` is enabled; internal markers do not count.

When commits are removed, retained children are reparented to the nearest retained ancestor. Parent cycles are removed, orphan user tags are discarded, and HEAD is kept valid. If protected commits alone exceed the configured maximum, they remain and the retention summary reports the unavoidable overflow. The UI previews destructive changes with current, removed, protected, orphan-tag, remaining, and overflow counts before applying them.

Loading or merely displaying a project never applies retention. File parsing only sanitizes the stored data and clamps settings to the central bounds.

`includeAutomaticCommits` is a presentation filter only. When disabled, the timeline still includes every manual commit, HEAD even when automatic, and automatic commits that have a user tag. Toggling it does not create or delete commits, apply retention, change dirty state or diffs, or alter serialization.

## Diff

Version diff is implemented in `src/features/versioning/projectVersionDiff.ts` as pure logic. It compares normalized snapshots and returns sectioned results for ER, layout, logical model, code, and workspace changes. The UI only renders the computed result and does not own diff rules.

## Restore

Restoring a commit never moves HEAD backward or deletes commits. The restore flow creates:

1. an automatic backup commit for the current working copy;
2. an automatic restore commit containing the target snapshot;
3. a new HEAD pointing to the restore commit.

After restore, retention runs once against the state containing both automatic commits. The working copy is then applied from the retained restore HEAD and should be clean against it. Backup and restore commits are saved in `.ersp` files and workspace sessions like any other commit when retained.

## Module boundaries

- `projectCommitSnapshot.ts`: snapshot types, clone, normalize, checksum, stats, commit draft creation.
- `projectVersioningMetadata.ts`: pure tag validation and mutations, settings normalization, timeline filtering, retention preview, and retention application.
- `projectVersionDiff.ts`: pure diff types and comparison logic.
- `projectVersionRestore.ts`: pure restore planning/state update logic followed by retention.
- `useProjectVersioning.ts`: React hook orchestration for versioning state, commits, visible commits, tags, settings, HEAD, and dirty state.
- UI components render dialogs, timeline, diff, and restore confirmation without duplicating domain logic.
