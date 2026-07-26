import assert from "node:assert/strict";
import test from "node:test";

import { restoreProjectCommitInState } from "../src/features/versioning/projectVersionRestore.ts";
import { createProjectCommitInState } from "../src/features/versioning/useProjectVersioning.ts";
import { createEmptyProjectVersioningState } from "../src/utils/projectFile.ts";
import { cloneProjectCommitSnapshot } from "../src/features/versioning/projectCommitSnapshot.ts";
import { createProjectWideSnapshotForTest } from "./support/projectWideSnapshot.ts";

test("restore project-wide commit ripristina file tree completo e active file", async () => {
  const firstSnapshot = createProjectWideSnapshotForTest();
  const first = await createProjectCommitInState(createEmptyProjectVersioningState(), {
    snapshot: firstSnapshot,
    message: "Initial project",
  });
  assert.equal(first.status, "created");
  if (first.status !== "created") throw new Error("first commit failed");

  const currentSnapshot = cloneProjectCommitSnapshot(firstSnapshot);
  assert.ok(currentSnapshot.files);
  const note = Object.values(currentSnapshot.files).find((file) => file.kind === "text");
  assert.ok(note && note.kind === "text");
  currentSnapshot.files[note.id] = { ...note, content: "Changed note" };
  currentSnapshot.activeFileId = note.id;

  const result = await restoreProjectCommitInState(first.versioning, first.commit.id, currentSnapshot, {
    backupCommitId: "backup-project",
    restoreCommitId: "restore-project",
  });

  assert.equal(result.status, "restored");
  if (result.status !== "restored") return;
  assert.deepEqual(result.restoreCommit.snapshot.project?.fileTree, firstSnapshot.project?.fileTree);
  assert.deepEqual(result.restoreCommit.snapshot.files, firstSnapshot.files);
  assert.equal(result.restoreCommit.snapshot.activeFileId, firstSnapshot.activeFileId);
  assert.equal(result.versioning.headCommitId, "restore-project");
});

test("restore applica retention dopo avere creato entrambi i commit automatici", async () => {
  const firstSnapshot = createProjectWideSnapshotForTest();
  const first = await createProjectCommitInState(createEmptyProjectVersioningState(), {
    snapshot: firstSnapshot,
    message: "Initial project",
  });
  assert.equal(first.status, "created");
  if (first.status !== "created") return;

  const currentSnapshot = cloneProjectCommitSnapshot(firstSnapshot);
  assert.ok(currentSnapshot.files);
  const note = Object.values(currentSnapshot.files).find((file) => file.kind === "text");
  assert.ok(note && note.kind === "text");
  currentSnapshot.files[note.id] = { ...note, content: "Changed before retention restore" };
  const result = await restoreProjectCommitInState(
    {
      ...first.versioning,
      settings: {
        ...first.versioning.settings,
        maxCommits: 2,
      },
    },
    first.commit.id,
    currentSnapshot,
    {
      backupCommitId: "backup-retained",
      restoreCommitId: "restore-head",
      createdAt: "2030-07-25T20:00:00.000Z",
    },
  );

  assert.equal(result.status, "restored");
  if (result.status !== "restored") return;
  assert.deepEqual(result.versioning.commits.map((commit) => commit.id), ["backup-retained", "restore-head"]);
  assert.equal(result.versioning.commits[0]?.parentId, null);
  assert.equal(result.versioning.commits[1]?.parentId, "backup-retained");
  assert.equal(result.versioning.headCommitId, "restore-head");
});
