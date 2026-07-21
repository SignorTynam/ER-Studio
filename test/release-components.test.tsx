import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AppHeader } from "../src/components/AppHeader.tsx";
import { ReleaseCenter, formatUnreadBadge } from "../src/components/releases/ReleaseCenter.tsx";
import { I18nProvider } from "../src/i18n/I18nProvider.tsx";
import { localizeReleaseCatalog } from "../src/releases/releaseLocalization.ts";
import { RELEASE_CATALOG } from "../src/releases/releaseCatalog.ts";
import { APP_VERSION } from "../src/utils/appMeta.ts";
import { translateForTest, withTestLocale } from "./utils/i18nTestUtils.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

function renderReleaseCenter(locale: "en" | "it"): string {
  return withTestLocale(locale, () => {
    const releases = localizeReleaseCatalog(
      RELEASE_CATALOG,
      (key, params) => translateForTest(locale, key, params),
    );

    return renderToStaticMarkup(
      <I18nProvider>
        <ReleaseCenter
          currentVersion={APP_VERSION}
          releases={releases}
          unreadVersions={[APP_VERSION]}
          onClose={() => undefined}
        />
      </I18nProvider>,
    );
  });
}

test("release center renders current badge, ordered releases and change sections in English", () => {
  const markup = renderReleaseCenter("en");
  assert.match(markup, /data-testid="release-center"/);
  assert.ok(markup.includes(translateForTest("en", "releases.center.current")));
  assert.ok(markup.includes(translateForTest("en", "releases.center.unread")));
  assert.ok(markup.includes(translateForTest("en", "releases.sections.added")));
  assert.ok(markup.includes(translateForTest("en", "releases.sections.changed")));
  assert.ok(markup.includes(translateForTest("en", "releases.sections.fixed")));
  assert.ok(markup.indexOf("v7.0.0") < markup.indexOf("v6.3.0"));
});

test("release center keeps consecutive English and Italian renders isolated", () => {
  const englishMarkup = renderReleaseCenter("en");
  const italianMarkup = renderReleaseCenter("it");

  assert.ok(englishMarkup.includes(translateForTest("en", "releases.center.current")));
  assert.ok(englishMarkup.includes(translateForTest("en", "releases.center.unread")));
  assert.ok(italianMarkup.includes(translateForTest("it", "releases.center.current")));
  assert.ok(italianMarkup.includes(translateForTest("it", "releases.center.unread")));
  assert.ok(!italianMarkup.includes(translateForTest("en", "releases.center.current")));
});

test("unread badge formatting caps values above nine", () => {
  assert.equal(formatUnreadBadge(0), "");
  assert.equal(formatUnreadBadge(9), "9");
  assert.equal(formatUnreadBadge(10), "9+");
});
