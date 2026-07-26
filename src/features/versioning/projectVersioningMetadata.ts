import type {
  ProjectCommit,
  ProjectCommitTag,
  ProjectVersioningSettings,
  ProjectVersioningState,
} from "./projectCommitSnapshot";

export const DEFAULT_PROJECT_VERSIONING_MAX_COMMITS = 200;
export const MIN_PROJECT_VERSIONING_MAX_COMMITS = 1;
export const MAX_PROJECT_VERSIONING_MAX_COMMITS = 1_000;
export const PROJECT_COMMIT_TAG_NAME_MAX_LENGTH = 50;
export const PROJECT_COMMIT_TAG_DESCRIPTION_MAX_LENGTH = 280;
export const PROJECT_COMMIT_TAG_ID_MAX_LENGTH = 200;
export const PROJECT_INTERNAL_COMMIT_TAGS = ["auto-backup", "auto-restore"] as const;

export interface ProjectCommitTagInput {
  name: string;
  description?: string;
  color?: string;
}

export type ProjectCommitTagValidationReason =
  | "empty-name"
  | "name-too-long"
  | "description-too-long"
  | "duplicate-name"
  | "reserved-name";

export interface ProjectVersioningRetentionSummary {
  limit: number;
  totalBefore: number;
  totalAfter: number;
  removedCommitIds: string[];
  removedTagIds: string[];
  protectedCommitIds: string[];
  protectedTaggedCommitIds: string[];
  overflowCount: number;
}

export interface ProjectVersioningRetentionResult {
  versioning: ProjectVersioningState;
  summary: ProjectVersioningRetentionSummary;
}

export type CreateProjectCommitTagResult =
  | {
      status: "created";
      versioning: ProjectVersioningState;
      tag: ProjectCommitTag;
    }
  | {
      status: "invalid";
      reason: ProjectCommitTagValidationReason | "missing-commit" | "id-unavailable";
      versioning: ProjectVersioningState;
    };

export type UpdateProjectCommitTagResult =
  | {
      status: "updated";
      versioning: ProjectVersioningState;
      tag: ProjectCommitTag;
    }
  | {
      status: "unchanged";
      versioning: ProjectVersioningState;
      tag: ProjectCommitTag;
    }
  | {
      status: "invalid";
      reason: ProjectCommitTagValidationReason | "missing-tag";
      versioning: ProjectVersioningState;
    };

export type DeleteProjectCommitTagResult =
  | {
      status: "deleted";
      versioning: ProjectVersioningState;
      deletedTag: ProjectCommitTag;
      retention: ProjectVersioningRetentionSummary;
    }
  | {
      status: "missing-tag";
      versioning: ProjectVersioningState;
    };

export type ProjectVersioningSettingsValidationReason =
  | "max-commits-not-integer"
  | "max-commits-out-of-range"
  | "keep-tagged-commits-not-boolean"
  | "include-automatic-commits-not-boolean";

export type UpdateProjectVersioningSettingsResult =
  | {
      status: "updated";
      versioning: ProjectVersioningState;
      retention: ProjectVersioningRetentionSummary;
    }
  | {
      status: "unchanged";
      versioning: ProjectVersioningState;
      retention: ProjectVersioningRetentionSummary;
    }
  | {
      status: "invalid";
      reason: ProjectVersioningSettingsValidationReason;
      versioning: ProjectVersioningState;
    };

interface ValidatedTagInput {
  name: string;
  description?: string;
  color?: string;
}

export function normalizeProjectCommitTagName(value: string): string {
  return value.trim();
}

export function getProjectCommitTagNameKey(value: string): string {
  return normalizeProjectCommitTagName(value).normalize("NFKC").toLowerCase();
}

export function normalizeProjectCommitTagDescription(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function normalizeProjectCommitTagColor(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function isReservedProjectCommitTagName(value: string): boolean {
  const normalized = getProjectCommitTagNameKey(value);
  return PROJECT_INTERNAL_COMMIT_TAGS.some((tag) => tag === normalized);
}

export function isValidProjectCommitTagId(value: string): boolean {
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= PROJECT_COMMIT_TAG_ID_MAX_LENGTH;
}

export function normalizeProjectVersioningMaxCommits(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_PROJECT_VERSIONING_MAX_COMMITS;
  }
  return Math.min(
    MAX_PROJECT_VERSIONING_MAX_COMMITS,
    Math.max(MIN_PROJECT_VERSIONING_MAX_COMMITS, Math.trunc(value)),
  );
}

export function normalizeProjectVersioningSettings(
  settings: ProjectVersioningSettings | null | undefined,
): Required<ProjectVersioningSettings> {
  return {
    maxCommits: normalizeProjectVersioningMaxCommits(settings?.maxCommits),
    keepTaggedCommits: settings?.keepTaggedCommits !== false,
    includeAutomaticCommits: settings?.includeAutomaticCommits === true,
  };
}

function validateTagInput(
  versioning: ProjectVersioningState,
  input: ProjectCommitTagInput,
  ignoredTagId?: string,
): { ok: true; value: ValidatedTagInput } | { ok: false; reason: ProjectCommitTagValidationReason } {
  const name = normalizeProjectCommitTagName(input.name);
  if (!name) {
    return { ok: false, reason: "empty-name" };
  }
  if (name.length > PROJECT_COMMIT_TAG_NAME_MAX_LENGTH) {
    return { ok: false, reason: "name-too-long" };
  }
  if (isReservedProjectCommitTagName(name)) {
    return { ok: false, reason: "reserved-name" };
  }
  if (
    versioning.tags.some(
      (tag) => tag.id !== ignoredTagId && getProjectCommitTagNameKey(tag.name) === getProjectCommitTagNameKey(name),
    )
  ) {
    return { ok: false, reason: "duplicate-name" };
  }

  const description = normalizeProjectCommitTagDescription(input.description);
  if (description && description.length > PROJECT_COMMIT_TAG_DESCRIPTION_MAX_LENGTH) {
    return { ok: false, reason: "description-too-long" };
  }

  return {
    ok: true,
    value: {
      name,
      description,
      color: normalizeProjectCommitTagColor(input.color),
    },
  };
}

function createSecureProjectCommitTagId(
  randomUuid: (() => string) | undefined = globalThis.crypto?.randomUUID?.bind(globalThis.crypto),
): string | null {
  return randomUuid ? `tag-${randomUuid()}` : null;
}

export interface CreateProjectCommitTagOptions {
  id?: string;
  createdAt?: string;
  randomUuid?: () => string;
}

export function createProjectCommitTagInState(
  versioning: ProjectVersioningState,
  commitId: string,
  input: ProjectCommitTagInput,
  options: CreateProjectCommitTagOptions = {},
): CreateProjectCommitTagResult {
  if (!versioning.commits.some((commit) => commit.id === commitId)) {
    return { status: "invalid", reason: "missing-commit", versioning };
  }

  const validation = validateTagInput(versioning, input);
  if (!validation.ok) {
    return { status: "invalid", reason: validation.reason, versioning };
  }

  const id = options.id?.trim() || createSecureProjectCommitTagId(options.randomUuid);
  if (!id || !isValidProjectCommitTagId(id) || versioning.tags.some((tag) => tag.id === id)) {
    return { status: "invalid", reason: "id-unavailable", versioning };
  }

  const tag: ProjectCommitTag = {
    id,
    name: validation.value.name,
    commitId,
    createdAt: options.createdAt ?? new Date().toISOString(),
    description: validation.value.description,
    color: validation.value.color,
  };
  return {
    status: "created",
    tag,
    versioning: {
      ...versioning,
      tags: [...versioning.tags, tag],
    },
  };
}

export function updateProjectCommitTagInState(
  versioning: ProjectVersioningState,
  tagId: string,
  input: ProjectCommitTagInput,
): UpdateProjectCommitTagResult {
  const existing = versioning.tags.find((tag) => tag.id === tagId);
  if (!existing) {
    return { status: "invalid", reason: "missing-tag", versioning };
  }

  const validation = validateTagInput(versioning, input, tagId);
  if (!validation.ok) {
    return { status: "invalid", reason: validation.reason, versioning };
  }

  const nextTag: ProjectCommitTag = {
    ...existing,
    name: validation.value.name,
    description: validation.value.description,
    color: validation.value.color,
  };
  if (
    nextTag.name === existing.name
    && nextTag.description === existing.description
    && nextTag.color === existing.color
  ) {
    return { status: "unchanged", versioning, tag: existing };
  }

  return {
    status: "updated",
    tag: nextTag,
    versioning: {
      ...versioning,
      tags: versioning.tags.map((tag) => (tag.id === tagId ? nextTag : tag)),
    },
  };
}

export function renameProjectCommitTagInState(
  versioning: ProjectVersioningState,
  tagId: string,
  name: string,
): UpdateProjectCommitTagResult {
  const existing = versioning.tags.find((tag) => tag.id === tagId);
  return updateProjectCommitTagInState(versioning, tagId, {
    name,
    description: existing?.description,
    color: existing?.color,
  });
}

function compareProjectCommitsOldestFirst(left: ProjectCommit, right: ProjectCommit): number {
  const leftTime = Date.parse(left.createdAt);
  const rightTime = Date.parse(right.createdAt);
  const byDate = (Number.isFinite(leftTime) ? leftTime : 0) - (Number.isFinite(rightTime) ? rightTime : 0);
  return byDate !== 0 ? byDate : left.id.localeCompare(right.id);
}

function removeParentCycles(commits: ProjectCommit[]): ProjectCommit[] {
  const parents = new Map(commits.map((commit) => [commit.id, commit.parentId]));
  let changed = true;
  while (changed) {
    changed = false;
    for (const startId of [...parents.keys()].sort()) {
      const path: string[] = [];
      const positions = new Map<string, number>();
      let currentId: string | null = startId;
      while (currentId && parents.has(currentId)) {
        const cycleStart = positions.get(currentId);
        if (cycleStart !== undefined) {
          const cycle = path.slice(cycleStart).sort();
          const breaker = cycle[0];
          parents.set(breaker, null);
          changed = true;
          break;
        }
        positions.set(currentId, path.length);
        path.push(currentId);
        currentId = parents.get(currentId) ?? null;
      }
      if (changed) break;
    }
  }

  return commits.map((commit) => {
    const parentId = parents.get(commit.id) ?? null;
    return parentId === commit.parentId ? commit : { ...commit, parentId };
  });
}

function applyRetentionPlan(versioning: ProjectVersioningState): ProjectVersioningRetentionResult {
  const settings = normalizeProjectVersioningSettings(versioning.settings);
  const existingCommitIds = new Set(versioning.commits.map((commit) => commit.id));
  const validTags = versioning.tags.filter((tag) => existingCommitIds.has(tag.commitId));
  const protectedTaggedCommitIds = settings.keepTaggedCommits
    ? new Set(validTags.map((tag) => tag.commitId))
    : new Set<string>();
  const protectedCommitIds = new Set(protectedTaggedCommitIds);
  if (versioning.headCommitId && existingCommitIds.has(versioning.headCommitId)) {
    protectedCommitIds.add(versioning.headCommitId);
  }

  const removedCommitIds: string[] = [];
  let remainingCount = versioning.commits.length;
  for (const commit of [...versioning.commits].sort(compareProjectCommitsOldestFirst)) {
    if (remainingCount <= settings.maxCommits) break;
    if (protectedCommitIds.has(commit.id)) continue;
    removedCommitIds.push(commit.id);
    remainingCount -= 1;
  }

  const removedIds = new Set(removedCommitIds);
  const retainedIds = new Set(versioning.commits.filter((commit) => !removedIds.has(commit.id)).map((commit) => commit.id));
  const originalById = new Map(versioning.commits.map((commit) => [commit.id, commit]));
  const reparented = versioning.commits
    .filter((commit) => retainedIds.has(commit.id))
    .map((commit) => {
      let parentId = commit.parentId;
      const seen = new Set([commit.id]);
      while (parentId && !retainedIds.has(parentId)) {
        if (seen.has(parentId)) {
          parentId = null;
          break;
        }
        seen.add(parentId);
        parentId = originalById.get(parentId)?.parentId ?? null;
      }
      if (parentId && seen.has(parentId)) {
        parentId = null;
      }
      return parentId === commit.parentId ? commit : { ...commit, parentId };
    });
  const commits = removeParentCycles(reparented);
  const tags = validTags.filter((tag) => retainedIds.has(tag.commitId));
  const retainedTagIds = new Set(tags.map((tag) => tag.id));
  const removedTagIds = versioning.tags.filter((tag) => !retainedTagIds.has(tag.id)).map((tag) => tag.id);
  const headCommitId =
    versioning.headCommitId && retainedIds.has(versioning.headCommitId) ? versioning.headCommitId : null;
  const summary: ProjectVersioningRetentionSummary = {
    limit: settings.maxCommits,
    totalBefore: versioning.commits.length,
    totalAfter: commits.length,
    removedCommitIds,
    removedTagIds,
    protectedCommitIds: [...protectedCommitIds].filter((id) => retainedIds.has(id)).sort(),
    protectedTaggedCommitIds: [...protectedTaggedCommitIds].filter((id) => retainedIds.has(id)).sort(),
    overflowCount: Math.max(0, commits.length - settings.maxCommits),
  };

  const changed =
    commits.length !== versioning.commits.length
    || tags.length !== versioning.tags.length
    || commits.some((commit, index) => commit !== versioning.commits[index])
    || headCommitId !== versioning.headCommitId;

  return {
    versioning: changed
      ? {
          ...versioning,
          headCommitId,
          commits,
          tags,
        }
      : versioning,
    summary,
  };
}

export function previewProjectVersioningRetention(
  versioning: ProjectVersioningState,
): ProjectVersioningRetentionSummary {
  return applyRetentionPlan(versioning).summary;
}

export function applyProjectVersioningRetention(
  versioning: ProjectVersioningState,
): ProjectVersioningRetentionResult {
  return applyRetentionPlan(versioning);
}

export function deleteProjectCommitTagInState(
  versioning: ProjectVersioningState,
  tagId: string,
): DeleteProjectCommitTagResult {
  const deletedTag = versioning.tags.find((tag) => tag.id === tagId);
  if (!deletedTag) {
    return { status: "missing-tag", versioning };
  }
  const retention = applyProjectVersioningRetention({
    ...versioning,
    tags: versioning.tags.filter((tag) => tag.id !== tagId),
  });
  return {
    status: "deleted",
    deletedTag,
    versioning: retention.versioning,
    retention: retention.summary,
  };
}

function validateSettingsPatch(
  patch: Partial<ProjectVersioningSettings>,
): ProjectVersioningSettingsValidationReason | null {
  if (patch.maxCommits !== undefined) {
    if (!Number.isInteger(patch.maxCommits)) return "max-commits-not-integer";
    if (
      patch.maxCommits < MIN_PROJECT_VERSIONING_MAX_COMMITS
      || patch.maxCommits > MAX_PROJECT_VERSIONING_MAX_COMMITS
    ) {
      return "max-commits-out-of-range";
    }
  }
  if (patch.keepTaggedCommits !== undefined && typeof patch.keepTaggedCommits !== "boolean") {
    return "keep-tagged-commits-not-boolean";
  }
  if (patch.includeAutomaticCommits !== undefined && typeof patch.includeAutomaticCommits !== "boolean") {
    return "include-automatic-commits-not-boolean";
  }
  return null;
}

export function updateProjectVersioningSettingsInState(
  versioning: ProjectVersioningState,
  patch: Partial<ProjectVersioningSettings>,
): UpdateProjectVersioningSettingsResult {
  const reason = validateSettingsPatch(patch);
  if (reason) {
    return { status: "invalid", reason, versioning };
  }

  const current = normalizeProjectVersioningSettings(versioning.settings);
  const settings: Required<ProjectVersioningSettings> = {
    ...versioning.settings,
    ...current,
    ...patch,
  };
  const unchanged =
    settings.maxCommits === current.maxCommits
    && settings.keepTaggedCommits === current.keepTaggedCommits
    && settings.includeAutomaticCommits === current.includeAutomaticCommits;
  if (unchanged) {
    return {
      status: "unchanged",
      versioning,
      retention: previewProjectVersioningRetention(versioning),
    };
  }

  const candidate = {
    ...versioning,
    settings,
  };
  const shouldApplyRetention =
    settings.maxCommits !== current.maxCommits
    || (current.keepTaggedCommits && !settings.keepTaggedCommits);
  if (!shouldApplyRetention) {
    const preview = previewProjectVersioningRetention(candidate);
    return {
      status: "updated",
      versioning: candidate,
      retention: {
        ...preview,
        totalAfter: candidate.commits.length,
        removedCommitIds: [],
        removedTagIds: [],
        overflowCount: Math.max(0, candidate.commits.length - settings.maxCommits),
      },
    };
  }

  const retention = applyProjectVersioningRetention(candidate);
  return {
    status: "updated",
    versioning: retention.versioning,
    retention: retention.summary,
  };
}

export function getVisibleProjectCommits(versioning: ProjectVersioningState): ProjectCommit[] {
  const settings = normalizeProjectVersioningSettings(versioning.settings);
  if (settings.includeAutomaticCommits) {
    return [...versioning.commits];
  }

  const userTaggedCommitIds = new Set(versioning.tags.map((tag) => tag.commitId));
  return versioning.commits.filter(
    (commit) =>
      commit.automatic !== true
      || commit.id === versioning.headCommitId
      || userTaggedCommitIds.has(commit.id),
  );
}
