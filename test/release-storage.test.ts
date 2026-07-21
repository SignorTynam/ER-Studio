import assert from "node:assert/strict";
import test from "node:test";

import {
  LAST_SEEN_RELEASE_STORAGE_KEY,
  LEGACY_LAST_SEEN_VERSION_STORAGE_KEY,
  LEGACY_SEEN_ANNOUNCEMENTS_STORAGE_KEY,
  readLastSeenRelease,
  writeLastSeenRelease,
} from "../src/features/releases/releaseStorage.ts";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

test("reads the canonical key and normalizes legacy short versions", () => {
  const storage = new MemoryStorage();
  storage.setItem(LAST_SEEN_RELEASE_STORAGE_KEY, "v6.2");
  assert.deepEqual(readLastSeenRelease(storage), { lastSeen: "6.2.0", firstRun: false, migrated: true });
  assert.equal(storage.getItem(LAST_SEEN_RELEASE_STORAGE_KEY), "6.2.0");
});

test("migrates the legacy single key and historical array", () => {
  const single = new MemoryStorage();
  single.setItem(LEGACY_LAST_SEEN_VERSION_STORAGE_KEY, "6.2");
  assert.equal(readLastSeenRelease(single).lastSeen, "6.2.0");
  assert.equal(single.getItem(LAST_SEEN_RELEASE_STORAGE_KEY), "6.2.0");

  const array = new MemoryStorage();
  array.setItem(LEGACY_SEEN_ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(["5.0", 42, "6.1.0", "broken", "6.2"]));
  assert.equal(readLastSeenRelease(array).lastSeen, "6.2.0");
  assert.equal(array.getItem(LAST_SEEN_RELEASE_STORAGE_KEY), "6.2.0");
});

test("tolerates corrupt and unavailable storage", () => {
  const corrupt = new MemoryStorage();
  corrupt.setItem(LEGACY_SEEN_ANNOUNCEMENTS_STORAGE_KEY, "not-json");
  assert.deepEqual(readLastSeenRelease(corrupt), { lastSeen: null, firstRun: true, migrated: false });
  assert.deepEqual(readLastSeenRelease(null), { lastSeen: null, firstRun: true, migrated: false });
  assert.equal(writeLastSeenRelease("6.2", null), false);
});

test("writes the canonical full SemVer form", () => {
  const storage = new MemoryStorage();
  assert.equal(writeLastSeenRelease("v6.2", storage), true);
  assert.equal(storage.getItem(LAST_SEEN_RELEASE_STORAGE_KEY), "6.2.0");
});
