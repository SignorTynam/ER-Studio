import assert from "node:assert/strict";
import test from "node:test";

import type {
  ProjectCommit,
  ProjectCommitTag,
  ProjectVersioningState,
} from "../src/features/versioning/projectCommitSnapshot.ts";
import {
  applyProjectVersioningRetention,
  createProjectCommitTagInState,
  deleteProjectCommitTagInState,
  getVisibleProjectCommits,
  renameProjectCommitTagInState,
  updateProjectCommitTagInState,
  updateProjectVersioningSettingsInState,
} from "../src/features/versioning/projectVersioningMetadata.ts";
import { createProjectWideSnapshotForTest } from "./support/projectWideSnapshot.ts";
import { deleteProjectCommitInState } from "../src/features/versioning/useProjectVersioning.ts";

const snapshot = createProjectWideSnapshotForTest();

function commit(
  id: string,
  parentId: string | null,
  createdAt: string,
  options: { automatic?: boolean; tags?: string[] } = {},
): ProjectCommit {
  return {
    id,
    parentId,
    message: id,
    createdAt,
    snapshot,
    checksum: id,
    stats: {
      entityCount: 0,
      relationshipCount: 0,
      attributeCount: 0,
      edgeCount: 0,
    },
    automatic: options.automatic,
    tags: options.tags,
  };
}

function tag(id: string, name: string, commitId: string): ProjectCommitTag {
  return {
    id,
    name,
    commitId,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function state(overrides: Partial<ProjectVersioningState> = {}): ProjectVersioningState {
  return {
    version: 1,
    enabled: true,
    headCommitId: null,
    commits: [],
    tags: [],
    settings: {
      maxCommits: 200,
      keepTaggedCommits: true,
      includeAutomaticCommits: false,
    },
    ...overrides,
  };
}

test("user tags are trimmed, globally unique, validated, and immutable", () => {
  const original = state({
    headCommitId: "c1",
    commits: [commit("c1", null, "2026-01-01T00:00:00.000Z")],
  });
  const before = JSON.stringify(original);
  const created = createProjectCommitTagInState(
    original,
    "c1",
    { name: "  Release 1  ", description: "  reviewed  ", color: "  #08f  " },
    { id: "tag-release", createdAt: "2026-01-02T00:00:00.000Z" },
  );
  assert.equal(created.status, "created");
  if (created.status !== "created") return;
  assert.deepEqual(created.tag, {
    id: "tag-release",
    name: "Release 1",
    commitId: "c1",
    createdAt: "2026-01-02T00:00:00.000Z",
    description: "reviewed",
    color: "#08f",
  });
  assert.equal(JSON.stringify(original), before);

  const duplicate = createProjectCommitTagInState(
    created.versioning,
    "c1",
    { name: "release 1" },
    { id: "tag-duplicate" },
  );
  assert.deepEqual(
    { status: duplicate.status, reason: duplicate.status === "invalid" ? duplicate.reason : undefined },
    { status: "invalid", reason: "duplicate-name" },
  );
  const reserved = createProjectCommitTagInState(
    created.versioning,
    "c1",
    { name: "AUTO-RESTORE" },
    { id: "tag-reserved" },
  );
  assert.equal(reserved.status, "invalid");
  if (reserved.status === "invalid") assert.equal(reserved.reason, "reserved-name");
  const empty = createProjectCommitTagInState(
    created.versioning,
    "c1",
    { name: "   " },
    { id: "tag-empty" },
  );
  assert.equal(empty.status, "invalid");
  if (empty.status === "invalid") assert.equal(empty.reason, "empty-name");
  const tooLong = createProjectCommitTagInState(
    created.versioning,
    "c1",
    { name: "x".repeat(51) },
    { id: "tag-long" },
  );
  assert.equal(tooLong.status, "invalid");
  if (tooLong.status === "invalid") assert.equal(tooLong.reason, "name-too-long");
  const missingCommit = createProjectCommitTagInState(
    created.versioning,
    "missing",
    { name: "Missing" },
    { id: "tag-missing" },
  );
  assert.equal(missingCommit.status, "invalid");
  if (missingCommit.status === "invalid") assert.equal(missingCommit.reason, "missing-commit");
  assert.equal(
    updateProjectCommitTagInState(created.versioning, "missing-tag", { name: "Missing" }).status,
    "invalid",
  );

  const renamed = renameProjectCommitTagInState(created.versioning, created.tag.id, " Stable ");
  assert.equal(renamed.status, "updated");
  if (renamed.status !== "updated") return;
  assert.equal(renamed.tag.name, "Stable");
  assert.equal(renamed.tag.description, "reviewed");
  assert.equal(renamed.tag.color, "#08f");

  const updated = updateProjectCommitTagInState(renamed.versioning, created.tag.id, {
    name: "Stable",
    description: " ",
    color: "#0a0",
  });
  assert.equal(updated.status, "updated");
  if (updated.status === "updated") {
    assert.equal(updated.tag.description, undefined);
    assert.equal(updated.tag.color, "#0a0");
  }
});

test("tag identifiers are generated only through the injected secure UUID source", () => {
  const original = state({
    headCommitId: "c1",
    commits: [commit("c1", null, "2026-01-01T00:00:00.000Z")],
  });
  const created = createProjectCommitTagInState(
    original,
    "c1",
    { name: "Secure" },
    { randomUuid: () => "00000000-0000-4000-8000-000000000001" },
  );
  assert.equal(created.status, "created");
  if (created.status === "created") {
    assert.equal(created.tag.id, "tag-00000000-0000-4000-8000-000000000001");
  }
});

test("retention protects HEAD and user-tagged commits, ignores internal markers, and reparents safely", () => {
  const original = state({
    headCommitId: "c4",
    commits: [
      commit("c1", null, "2026-01-01T00:00:00.000Z"),
      commit("c2", "c1", "2026-01-02T00:00:00.000Z"),
      commit("c3", "c2", "2026-01-03T00:00:00.000Z", { automatic: true, tags: ["auto-backup"] }),
      commit("c4", "c3", "2026-01-04T00:00:00.000Z", { automatic: true, tags: ["auto-restore"] }),
    ],
    tags: [tag("tag-c1", "Milestone", "c1"), tag("tag-c2", "Release", "c2")],
    settings: {
      maxCommits: 2,
      keepTaggedCommits: true,
      includeAutomaticCommits: false,
    },
  });

  const result = applyProjectVersioningRetention(original);
  assert.deepEqual(result.summary.removedCommitIds, ["c3"]);
  assert.equal(result.summary.overflowCount, 1);
  assert.deepEqual(result.versioning.commits.map((item) => item.id), ["c1", "c2", "c4"]);
  assert.equal(result.versioning.commits.find((item) => item.id === "c4")?.parentId, "c2");
  assert.equal(result.versioning.headCommitId, "c4");
  assert.deepEqual(result.versioning.tags.map((item) => item.id), ["tag-c1", "tag-c2"]);
  assert.equal(original.commits[3].parentId, "c3");
});

test("disabling tag protection and deleting a tag immediately reapplies retention", () => {
  const original = state({
    headCommitId: "c2",
    commits: [
      commit("c1", null, "2026-01-01T00:00:00.000Z"),
      commit("c2", "c1", "2026-01-02T00:00:00.000Z"),
    ],
    tags: [tag("tag-c1", "Keep", "c1")],
    settings: {
      maxCommits: 1,
      keepTaggedCommits: true,
      includeAutomaticCommits: false,
    },
  });
  const protectedResult = applyProjectVersioningRetention(original);
  assert.equal(protectedResult.summary.overflowCount, 1);

  const deleted = deleteProjectCommitTagInState(protectedResult.versioning, "tag-c1");
  assert.equal(deleted.status, "deleted");
  if (deleted.status === "deleted") {
    assert.deepEqual(deleted.retention.removedCommitIds, ["c1"]);
    assert.deepEqual(deleted.versioning.commits.map((item) => item.id), ["c2"]);
    assert.equal(deleted.versioning.commits[0].parentId, null);
  }

  const unprotected = updateProjectVersioningSettingsInState(original, { keepTaggedCommits: false });
  assert.equal(unprotected.status, "updated");
  if (unprotected.status === "updated") {
    assert.deepEqual(unprotected.retention.removedCommitIds, ["c1"]);
    assert.deepEqual(unprotected.versioning.tags, []);
  }
});

test("manual commit deletion removes its user tags and reparents retained children", () => {
  const original = state({
    headCommitId: "c3",
    commits: [
      commit("c1", null, "2026-01-01T00:00:00.000Z"),
      commit("c2", "c1", "2026-01-02T00:00:00.000Z"),
      commit("c3", "c2", "2026-01-03T00:00:00.000Z"),
    ],
    tags: [tag("tag-c2", "Delete me", "c2")],
  });
  const deleted = deleteProjectCommitInState(original, "c2");
  assert.equal(deleted.status, "deleted");
  if (deleted.status === "deleted") {
    assert.deepEqual(deleted.versioning.tags, []);
    assert.equal(deleted.versioning.commits.find((item) => item.id === "c3")?.parentId, "c1");
  }
});

test("settings updates distinguish invalid, unchanged, and retention-producing changes", () => {
  const original = state({
    headCommitId: "c2",
    commits: [
      commit("c1", null, "2026-01-01T00:00:00.000Z"),
      commit("c2", "c1", "2026-01-02T00:00:00.000Z"),
    ],
  });
  const invalid = updateProjectVersioningSettingsInState(original, { maxCommits: 0 });
  assert.deepEqual(
    { status: invalid.status, reason: invalid.status === "invalid" ? invalid.reason : undefined },
    { status: "invalid", reason: "max-commits-out-of-range" },
  );
  assert.equal(updateProjectVersioningSettingsInState(original, { maxCommits: 200 }).status, "unchanged");

  const updated = updateProjectVersioningSettingsInState(original, { maxCommits: 1 });
  assert.equal(updated.status, "updated");
  if (updated.status === "updated") {
    assert.deepEqual(updated.retention.removedCommitIds, ["c1"]);
    assert.equal(updated.versioning.settings.maxCommits, 1);
  }
});

test("automatic commit visibility is a presentation-only filter with HEAD and user-tag exceptions", () => {
  const original = state({
    headCommitId: "c4",
    commits: [
      commit("c1", null, "2026-01-01T00:00:00.000Z"),
      commit("c2", "c1", "2026-01-02T00:00:00.000Z", { automatic: true, tags: ["auto-backup"] }),
      commit("c3", "c2", "2026-01-03T00:00:00.000Z", { automatic: true }),
      commit("c4", "c3", "2026-01-04T00:00:00.000Z", { automatic: true, tags: ["auto-restore"] }),
    ],
    tags: [tag("tag-c3", "Reviewed", "c3")],
  });
  const before = JSON.stringify(original);
  assert.deepEqual(getVisibleProjectCommits(original).map((item) => item.id), ["c1", "c3", "c4"]);
  assert.equal(JSON.stringify(original), before);

  const visible = getVisibleProjectCommits({
    ...original,
    settings: { ...original.settings, includeAutomaticCommits: true },
  });
  assert.deepEqual(visible.map((item) => item.id), ["c1", "c2", "c3", "c4"]);

  const overLimit = {
    ...original,
    settings: {
      maxCommits: 1,
      keepTaggedCommits: true,
      includeAutomaticCommits: false,
    },
  };
  const toggled = updateProjectVersioningSettingsInState(overLimit, { includeAutomaticCommits: true });
  assert.equal(toggled.status, "updated");
  if (toggled.status === "updated") {
    assert.equal(toggled.versioning.commits.length, overLimit.commits.length);
    assert.equal(toggled.retention.removedCommitIds.length, 0);
  }
});

test("retention removes pre-existing parent loops instead of creating new ones", () => {
  const original = state({
    headCommitId: "c3",
    commits: [
      commit("c1", "c2", "2026-01-01T00:00:00.000Z"),
      commit("c2", "c1", "2026-01-02T00:00:00.000Z"),
      commit("c3", "c2", "2026-01-03T00:00:00.000Z"),
    ],
  });
  const result = applyProjectVersioningRetention(original);
  const parents = new Map(result.versioning.commits.map((item) => [item.id, item.parentId]));
  for (const commitItem of result.versioning.commits) {
    const visited = new Set<string>();
    let current: string | null = commitItem.id;
    while (current) {
      assert.equal(visited.has(current), false);
      visited.add(current);
      current = parents.get(current) ?? null;
    }
  }
});

test("retention is a no-op below the limit and uses commit id to break equal-date ties", () => {
  const belowLimit = state({
    headCommitId: "c2",
    commits: [
      commit("c1", null, "2026-01-01T00:00:00.000Z"),
      commit("c2", "c1", "2026-01-02T00:00:00.000Z"),
    ],
  });
  const untouched = applyProjectVersioningRetention(belowLimit);
  assert.equal(untouched.versioning, belowLimit);
  assert.deepEqual(untouched.summary.removedCommitIds, []);

  const equalDates = state({
    headCommitId: "c3",
    commits: [
      commit("b", null, "2026-01-01T00:00:00.000Z"),
      commit("a", "b", "2026-01-01T00:00:00.000Z"),
      commit("c3", "a", "2026-01-02T00:00:00.000Z"),
    ],
    settings: {
      maxCommits: 2,
      keepTaggedCommits: false,
      includeAutomaticCommits: false,
    },
  });
  const reduced = applyProjectVersioningRetention(equalDates);
  assert.deepEqual(reduced.summary.removedCommitIds, ["a"]);
  assert.equal(reduced.versioning.commits.find((item) => item.id === "c3")?.parentId, "b");

  const orphaned = applyProjectVersioningRetention(state({
    headCommitId: "c1",
    commits: [commit("c1", null, "2026-01-01T00:00:00.000Z")],
    tags: [tag("orphan", "Orphan", "missing")],
  }));
  assert.deepEqual(orphaned.summary.removedTagIds, ["orphan"]);
  assert.deepEqual(orphaned.versioning.tags, []);
});
