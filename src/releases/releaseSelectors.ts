import { compareAppVersions, normalizeAppVersion, tryParseAppVersion } from "../utils/versioning";
import type { AppReleaseDefinition, LocalizedAppRelease, ReleaseAnnouncementModel, ReleaseImpact } from "./releaseTypes";

const IMPACT_WEIGHT: Record<ReleaseImpact, number> = { patch: 1, minor: 2, major: 3 };

export function sortReleasesNewestFirst<T extends AppReleaseDefinition>(catalog: readonly T[]): T[] {
  return [...catalog].sort((left, right) => compareAppVersions(right.version, left.version));
}

export function getUnseenReleases<T extends AppReleaseDefinition>(
  catalog: readonly T[],
  lastSeen: string | null,
  current: string,
): T[] {
  const normalizedCurrent = normalizeAppVersion(current);
  const normalizedSeen = normalizeAppVersion(lastSeen);
  if (!normalizedCurrent || !normalizedSeen || compareAppVersions(normalizedSeen, normalizedCurrent) >= 0) return [];
  return sortReleasesNewestFirst(catalog).filter((release) =>
    tryParseAppVersion(release.version) !== null
      && compareAppVersions(release.version, normalizedSeen) > 0
      && compareAppVersions(release.version, normalizedCurrent) <= 0,
  );
}

export function getHighestReleaseImpact(releases: readonly AppReleaseDefinition[]): ReleaseImpact {
  return releases.reduce<ReleaseImpact>((highest, release) =>
    IMPACT_WEIGHT[release.impact] > IMPACT_WEIGHT[highest] ? release.impact : highest,
  "patch");
}

function uniqueBy<T>(items: readonly T[], key: (item: T) => string, limit: number): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const value = key(item).trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(item);
    if (result.length >= limit) break;
  }
  return result;
}

export function buildReleaseAnnouncement(
  unseenReleases: readonly LocalizedAppRelease[],
  lastSeen: string,
  current: string,
): ReleaseAnnouncementModel | null {
  const automatic = unseenReleases.filter((release) => release.announcement !== "silent");
  if (automatic.length === 0) return null;
  const critical = automatic.some((release) => release.announcement === "critical");
  const impact = getHighestReleaseImpact(automatic);
  return {
    mode: critical ? "critical" : impact === "patch" ? "toast" : "modal",
    impact,
    fromVersion: normalizeAppVersion(lastSeen) ?? lastSeen,
    toVersion: normalizeAppVersion(current) ?? current,
    releaseCount: unseenReleases.length,
    releases: [...unseenReleases],
    highlights: uniqueBy(automatic.flatMap((release) => release.highlights), (item) => item.title, 3),
    changes: uniqueBy(automatic.flatMap((release) => release.changes), (item) => item, 6),
  };
}
