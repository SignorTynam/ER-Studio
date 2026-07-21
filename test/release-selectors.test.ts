import assert from "node:assert/strict";
import test from "node:test";

import { buildReleaseAnnouncement, getHighestReleaseImpact, getUnseenReleases } from "../src/releases/releaseSelectors.ts";
import type { LocalizedAppRelease, ReleaseImpact } from "../src/releases/releaseTypes.ts";

function release(version: string, impact: ReleaseImpact, announcement: LocalizedAppRelease["announcement"] = impact === "patch" ? "toast" : "modal"): LocalizedAppRelease {
  return {
    version,
    date: "2026-01-01",
    impact,
    announcement,
    headline: `Release ${version}`,
    summary: `Summary ${version}`,
    highlights: [{ title: `Highlight ${version}`, description: version }],
    localizedSections: { added: [], changed: [`Change ${version}`], fixed: [] },
    changes: [`Change ${version}`],
  };
}

test("selects every release between the last seen and current versions", () => {
  const catalog = [release("6.4.0", "minor"), release("6.3.0", "minor"), release("6.2.0", "minor"), release("6.1.0", "minor")];
  assert.deepEqual(getUnseenReleases(catalog, "6.1", "6.4.0").map((item) => item.version), ["6.4.0", "6.3.0", "6.2.0"]);
  assert.deepEqual(getUnseenReleases(catalog, "6.5.0", "6.4.0"), []);
});

test("aggregates skipped releases by highest impact and caps content", () => {
  const releases = [release("7.0.0", "major"), release("6.4.0", "minor"), ...Array.from({ length: 7 }, (_, index) => release(`6.3.${7 - index}`, "patch"))];
  const announcement = buildReleaseAnnouncement(releases, "6.3.0", "7.0.0");
  assert.equal(getHighestReleaseImpact(releases), "major");
  assert.equal(announcement?.impact, "major");
  assert.equal(announcement?.mode, "modal");
  assert.equal(announcement?.releaseCount, 9);
  assert.ok((announcement?.highlights.length ?? 0) <= 3);
  assert.ok((announcement?.changes.length ?? 0) <= 6);
  assert.equal(announcement?.fromVersion, "6.3.0");
  assert.equal(announcement?.toVersion, "7.0.0");
});

test("uses toast, critical, and silent announcement modes correctly", () => {
  assert.equal(buildReleaseAnnouncement([release("6.2.1", "patch")], "6.2", "6.2.1")?.mode, "toast");
  assert.equal(buildReleaseAnnouncement([release("6.3.0", "minor"), release("6.2.1", "patch")], "6.2", "6.3")?.impact, "minor");
  assert.equal(buildReleaseAnnouncement([release("6.2.1", "patch", "critical")], "6.2", "6.2.1")?.mode, "critical");
  assert.equal(buildReleaseAnnouncement([release("6.2.1", "patch", "silent")], "6.2", "6.2.1"), null);
});
