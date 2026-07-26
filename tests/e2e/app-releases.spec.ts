import { expect, test } from "@playwright/test";
import { I18N_STORAGE_KEY, translate } from "../../src/i18n/index.ts";
import { RELEASE_CATALOG } from "../../src/releases/releaseCatalog.ts";
import { getUnseenReleases } from "../../src/releases/releaseSelectors.ts";

const CURRENT_RELEASE_VERSION = RELEASE_CATALOG[0].version;
const SEEDED_LAST_SEEN_VERSION = "6.3";
const EXPECTED_UNREAD_COUNT = getUnseenReleases(
  RELEASE_CATALOG,
  SEEDED_LAST_SEEN_VERSION,
  CURRENT_RELEASE_VERSION,
).length;

test("acknowledges an automatic release once and keeps the release center available", async ({ page }) => {
  await page.addInitScript(({ localeStorageKey, lastSeenVersion }) => {
    localStorage.setItem(localeStorageKey, "en");
    if (!sessionStorage.getItem("release-test-seeded")) {
      localStorage.setItem("builder:last-seen-release", lastSeenVersion);
      sessionStorage.setItem("release-test-seeded", "true");
    }
  }, { localeStorageKey: I18N_STORAGE_KEY, lastSeenVersion: SEEDED_LAST_SEEN_VERSION });
  await page.goto("/");

  const announcement = page.getByTestId("release-announcement");
  await expect(announcement).toBeVisible();
  await expect(announcement).toContainText(`v6.3.0 → v${CURRENT_RELEASE_VERSION}`);
  await expect(page.getByTestId("app-header-release-center")).toHaveAttribute(
    "aria-label",
    new RegExp(`${EXPECTED_UNREAD_COUNT}$`),
  );
  await announcement.getByRole("button", { name: translate("releases.actions.start", undefined, "en") }).click();
  await expect(announcement).toBeHidden();

  await page.reload();
  await expect(page.getByTestId("release-announcement")).toHaveCount(0);
  const releaseCenterButton = page.getByTestId("app-header-release-center");
  await expect(releaseCenterButton).toHaveAttribute("aria-label", /0/);
  await releaseCenterButton.click();
  await expect(page.getByTestId("release-center")).toBeVisible();
  await expect(page.getByTestId("release-center")).toContainText(`v${CURRENT_RELEASE_VERSION}`);
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("release-center")).toHaveCount(0);
  await expect(releaseCenterButton).toBeFocused();
});
