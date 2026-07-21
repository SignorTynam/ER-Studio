import { expect, test } from "@playwright/test";
import { I18N_STORAGE_KEY, translate } from "../../src/i18n/index.ts";

test("acknowledges an automatic release once and keeps the release center available", async ({ page }) => {
  await page.addInitScript((localeStorageKey) => {
    localStorage.setItem(localeStorageKey, "en");
    if (!sessionStorage.getItem("release-test-seeded")) {
      localStorage.setItem("builder:last-seen-release", "6.3");
      sessionStorage.setItem("release-test-seeded", "true");
    }
  }, I18N_STORAGE_KEY);
  await page.goto("/");

  const announcement = page.getByTestId("release-announcement");
  await expect(announcement).toBeVisible();
  await expect(announcement).toContainText("v6.3.0 → v7.0.0");
  await expect(page.getByTestId("app-header-release-center")).toHaveAttribute("aria-label", /1/);
  await announcement.getByRole("button", { name: translate("releases.actions.start", undefined, "en") }).click();
  await expect(announcement).toBeHidden();

  await page.reload();
  await expect(page.getByTestId("release-announcement")).toHaveCount(0);
  const releaseCenterButton = page.getByTestId("app-header-release-center");
  await expect(releaseCenterButton).toHaveAttribute("aria-label", /0/);
  await releaseCenterButton.click();
  await expect(page.getByTestId("release-center")).toBeVisible();
  await expect(page.getByTestId("release-center")).toContainText("v7.0.0");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("release-center")).toHaveCount(0);
  await expect(releaseCenterButton).toBeFocused();
});
