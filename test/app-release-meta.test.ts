import assert from "node:assert/strict";
import test from "node:test";

import packageMetadata from "../package.json";
import { APP_VERSION } from "../src/utils/appMeta.ts";
import { RELEASE_CATALOG } from "../src/releases/releaseCatalog.ts";

test("package.json is the only editable source for the current application version", () => {
  assert.equal(APP_VERSION, packageMetadata.version);
  assert.match(APP_VERSION, /^\d+\.\d+\.\d+$/);
  assert.equal(RELEASE_CATALOG[0].version, APP_VERSION);
});
