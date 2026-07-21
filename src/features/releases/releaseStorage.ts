import { compareAppVersions, normalizeAppVersion } from "../../utils/versioning";

export const LAST_SEEN_RELEASE_STORAGE_KEY = "builder:last-seen-release";
export const LEGACY_LAST_SEEN_VERSION_STORAGE_KEY = "er-studio:last-seen-version";
export const LEGACY_SEEN_ANNOUNCEMENTS_STORAGE_KEY = "er-studio:seen-version-announcements";

export interface ReleaseStorageReadResult {
  lastSeen: string | null;
  firstRun: boolean;
  migrated: boolean;
}

export function getBrowserReleaseStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
}

function safeGet(storage: Storage, key: string): string | null {
  try { return storage.getItem(key); } catch { return null; }
}

function readNewestLegacyArray(storage: Storage): string | null {
  const raw = safeGet(storage, LEGACY_SEEN_ANNOUNCEMENTS_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.reduce<string | null>((newest, value) => {
      const normalized = normalizeAppVersion(value);
      if (!normalized) return newest;
      return !newest || compareAppVersions(normalized, newest) > 0 ? normalized : newest;
    }, null);
  } catch {
    return null;
  }
}

export function writeLastSeenRelease(version: unknown, storage: Storage | null = getBrowserReleaseStorage()): boolean {
  const normalized = normalizeAppVersion(version);
  if (!storage || !normalized) return false;
  try {
    storage.setItem(LAST_SEEN_RELEASE_STORAGE_KEY, normalized);
    return true;
  } catch {
    return false;
  }
}

export function readLastSeenRelease(storage: Storage | null = getBrowserReleaseStorage()): ReleaseStorageReadResult {
  if (!storage) return { lastSeen: null, firstRun: true, migrated: false };
  const rawCanonical = safeGet(storage, LAST_SEEN_RELEASE_STORAGE_KEY);
  const canonical = normalizeAppVersion(rawCanonical);
  if (canonical) {
    const normalizedInPlace = rawCanonical !== canonical;
    if (normalizedInPlace) writeLastSeenRelease(canonical, storage);
    return { lastSeen: canonical, firstRun: false, migrated: normalizedInPlace };
  }

  const legacySingle = normalizeAppVersion(safeGet(storage, LEGACY_LAST_SEEN_VERSION_STORAGE_KEY));
  const legacyArray = legacySingle ? null : readNewestLegacyArray(storage);
  const migratedValue = legacySingle ?? legacyArray;
  if (!migratedValue) return { lastSeen: null, firstRun: true, migrated: false };

  writeLastSeenRelease(migratedValue, storage);
  return { lastSeen: migratedValue, firstRun: false, migrated: true };
}
