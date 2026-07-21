import assert from "node:assert/strict";
import test from "node:test";

import { buildGeneratedChangelog, replaceGeneratedChangelog } from "../scripts/generate-changelog.ts";
import { bumpVersion, containsPlaceholder, tagMatchesVersion } from "../scripts/releaseUtils.ts";
import { validateReleaseCatalog } from "../scripts/check-release.ts";
import { RELEASE_CATALOG } from "../src/releases/releaseCatalog.ts";

test("release bump handles patch, minor, and major", () => {
  assert.equal(bumpVersion("6.3.0", "patch"), "6.3.1");
  assert.equal(bumpVersion("6.3.9", "minor"), "6.4.0");
  assert.equal(bumpVersion("6.9.9", "major"), "7.0.0");
});

test("tag validation is exact and placeholder detection is strict", () => {
  assert.equal(tagMatchesVersion("v6.3.0", "6.3.0"), true);
  assert.equal(tagMatchesVersion("6.3.0", "6.3.0"), false);
  assert.equal(tagMatchesVersion("v6.3", "6.3.0"), false);
  assert.equal(containsPlaceholder("REPLACE_ME summary"), true);
});

test("catalog validation catches a missing current release", () => {
  assert.ok(validateReleaseCatalog("99.0.0").some((error) => error.includes("current package version is missing")));
});

test("catalog validation catches duplicates and invalid ordering", () => {
  const current = RELEASE_CATALOG[0];
  assert.ok(validateReleaseCatalog(current.version, [current, current]).some((error) => error.includes("duplicate version")));
  assert.ok(validateReleaseCatalog(current.version, [RELEASE_CATALOG[1], current]).some((error) => error.includes("ordered newest first")));
});

test("managed changelog replacement is deterministic and preserves legacy text", () => {
  const generated = buildGeneratedChangelog();
  const source = `before\n<!-- builder:generated-releases:start -->\nold\n<!-- builder:generated-releases:end -->\nafter`;
  const next = replaceGeneratedChangelog(source, generated);
  assert.match(next, /before/);
  assert.match(next, /after/);
  assert.match(next, /## \[6\.3\.0\]/);
  assert.equal(replaceGeneratedChangelog(next, generated), next);
});
