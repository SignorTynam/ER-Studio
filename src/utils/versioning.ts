export interface ParsedAppVersion {
  raw: string;
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

export type AppUpdateKind = "first-run" | "none" | "patch" | "minor" | "major" | "downgrade" | "invalid";

export interface AppUpdateClassification {
  kind: AppUpdateKind;
  shouldShow: boolean;
  wow: boolean;
}

const APP_VERSION_PATTERN = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/i;

export function tryParseAppVersion(version: unknown): ParsedAppVersion | null {
  if (typeof version !== "string") return null;
  const trimmed = version.trim();
  const match = APP_VERSION_PATTERN.exec(trimmed);
  if (!match) return null;

  const major = Number(match[1]);
  const minor = Number(match[2] ?? 0);
  const patch = Number(match[3] ?? 0);
  if (![major, minor, patch].every(Number.isSafeInteger)) return null;

  return {
    raw: version,
    major,
    minor,
    patch,
    prerelease: match[4] || undefined,
  };
}

export function parseAppVersion(version: string): ParsedAppVersion {
  return tryParseAppVersion(version) ?? { raw: version, major: 0, minor: 0, patch: 0, prerelease: undefined };
}

export function normalizeAppVersion(version: unknown): string | null {
  const parsed = tryParseAppVersion(version);
  if (!parsed) return null;
  const core = `${parsed.major}.${parsed.minor}.${parsed.patch}`;
  return parsed.prerelease ? `${core}-${parsed.prerelease}` : core;
}

function comparePrerelease(left?: string, right?: string): -1 | 0 | 1 {
  if (!left && !right) return 0;
  if (left && !right) return -1;
  if (!left && right) return 1;

  const leftParts = left!.split(".");
  const rightParts = right!.split(".");
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const a = leftParts[index];
    const b = rightParts[index];
    if (a == null) return -1;
    if (b == null) return 1;
    if (a === b) continue;
    const aNumeric = /^\d+$/.test(a);
    const bNumeric = /^\d+$/.test(b);
    if (aNumeric && bNumeric) return Number(a) < Number(b) ? -1 : 1;
    if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
    return a < b ? -1 : 1;
  }
  return 0;
}

export function compareAppVersions(leftVersion: unknown, rightVersion: unknown): -1 | 0 | 1 {
  const left = tryParseAppVersion(leftVersion);
  const right = tryParseAppVersion(rightVersion);
  if (!left || !right) return 0;

  for (const part of ["major", "minor", "patch"] as const) {
    if (left[part] < right[part]) return -1;
    if (left[part] > right[part]) return 1;
  }
  return comparePrerelease(left.prerelease, right.prerelease);
}

export function isVersionNewer(candidate: unknown, reference: unknown): boolean {
  return tryParseAppVersion(candidate) !== null
    && tryParseAppVersion(reference) !== null
    && compareAppVersions(candidate, reference) > 0;
}

export function classifyAppUpdate(previous: string | null, current: string): AppUpdateClassification {
  if (!tryParseAppVersion(current)) return { kind: "invalid", shouldShow: false, wow: false };
  if (previous === null) return { kind: "first-run", shouldShow: false, wow: false };
  if (!tryParseAppVersion(previous)) return { kind: "invalid", shouldShow: false, wow: false };

  const comparison = compareAppVersions(previous, current);
  if (comparison === 0) return { kind: "none", shouldShow: false, wow: false };
  if (comparison > 0) return { kind: "downgrade", shouldShow: false, wow: false };

  const left = tryParseAppVersion(previous)!;
  const right = tryParseAppVersion(current)!;
  if (left.major !== right.major) return { kind: "major", shouldShow: true, wow: true };
  if (left.minor !== right.minor) return { kind: "minor", shouldShow: true, wow: true };
  return { kind: "patch", shouldShow: true, wow: false };
}
