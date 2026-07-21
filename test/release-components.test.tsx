import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AppHeader } from "../src/components/AppHeader.tsx";
import { ReleaseCenter, formatUnreadBadge } from "../src/components/releases/ReleaseCenter.tsx";
import { I18nProvider } from "../src/i18n/I18nProvider.tsx";
import { localizeReleaseCatalog } from "../src/releases/releaseLocalization.ts";
import { RELEASE_CATALOG } from "../src/releases/releaseCatalog.ts";
import { translate } from "../src/i18n/index.ts";
import { APP_VERSION } from "../src/utils/appMeta.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

test("release center renders current badge, ordered releases and change sections", () => {
  const releases = localizeReleaseCatalog(RELEASE_CATALOG, (key, params) => translate(key, params, "en"));
  const markup = renderToStaticMarkup(<I18nProvider><ReleaseCenter currentVersion={APP_VERSION} releases={releases} unreadVersions={[APP_VERSION]} onClose={() => undefined} /></I18nProvider>);
  assert.match(markup, /data-testid="release-center"/);
  assert.match(markup, /Current version/);
  assert.match(markup, /Unread/);
  assert.match(markup, />New</);
  assert.match(markup, />Improved</);
  assert.ok(markup.indexOf("v7.0.0") < markup.indexOf("v6.3.0"));
});

test("unread badge formatting caps values above nine", () => {
  assert.equal(formatUnreadBadge(0), "");
  assert.equal(formatUnreadBadge(9), "9");
  assert.equal(formatUnreadBadge(10), "9+");
});
