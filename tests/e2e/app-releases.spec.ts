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
const RELEASE_VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "compact desktop", width: 1024, height: 768 },
  { name: "portrait tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
  { name: "narrow mobile", width: 360, height: 800 },
] as const;

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

test("release announcement uses the available viewport without an empty modal header", async ({ page }) => {
  await page.addInitScript(({ localeStorageKey }) => {
    localStorage.setItem(localeStorageKey, "it");
    localStorage.setItem("builder:last-seen-release", "7.2.0");
  }, { localeStorageKey: I18N_STORAGE_KEY });
  await page.goto("/");

  const announcement = page.getByTestId("release-announcement");
  const closeButton = announcement.getByRole("button", { name: translate("common.actions.close", undefined, "it") });
  const primaryAction = announcement.getByRole("button", { name: translate("releases.actions.start", undefined, "it") });

  for (const viewport of RELEASE_VIEWPORTS) {
    await page.setViewportSize(viewport);
    await announcement.evaluate((element) => { element.scrollTop = 0; });
    await expect(announcement, `${viewport.name}: dialog`).toBeVisible();
    await expect(closeButton, `${viewport.name}: close`).toBeVisible();

    const geometry = await announcement.evaluate((element) => {
      const dialog = element.getBoundingClientRect();
      const modalHeader = element.querySelector(".ui-modal__head");
      const hero = element.querySelector(".release-announcement__hero");
      const close = element.querySelector(".ui-modal__close");
      if (!modalHeader || !hero || !close) throw new Error("Release announcement structure is incomplete.");
      const modalHeaderStyle = getComputedStyle(modalHeader);
      const heroRect = hero.getBoundingClientRect();
      const closeRect = close.getBoundingClientRect();
      return {
        dialog: { top: dialog.top, right: dialog.right, bottom: dialog.bottom, left: dialog.left, width: dialog.width },
        heroTop: heroRect.top,
        close: { top: closeRect.top, right: closeRect.right, bottom: closeRect.bottom, left: closeRect.left },
        modalHeaderPosition: modalHeaderStyle.position,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      };
    });

    expect(geometry.dialog.left, `${viewport.name}: left edge`).toBeGreaterThanOrEqual(0);
    expect(geometry.dialog.top, `${viewport.name}: top edge`).toBeGreaterThanOrEqual(0);
    expect(geometry.dialog.right, `${viewport.name}: right edge`).toBeLessThanOrEqual(geometry.viewportWidth);
    expect(geometry.dialog.bottom, `${viewport.name}: bottom edge`).toBeLessThanOrEqual(geometry.viewportHeight);
    expect(geometry.scrollWidth, `${viewport.name}: horizontal overflow`).toBeLessThanOrEqual(geometry.clientWidth);
    expect(geometry.close.left, `${viewport.name}: close left edge`).toBeGreaterThanOrEqual(geometry.dialog.left);
    expect(geometry.close.top, `${viewport.name}: close top edge`).toBeGreaterThanOrEqual(geometry.dialog.top);
    expect(geometry.close.right, `${viewport.name}: close right edge`).toBeLessThanOrEqual(geometry.dialog.right);
    expect(geometry.close.bottom, `${viewport.name}: close bottom edge`).toBeLessThanOrEqual(geometry.dialog.bottom);
    expect(geometry.modalHeaderPosition, `${viewport.name}: empty header removed from flow`).toBe("absolute");

    if (viewport.width >= 1024) {
      expect(geometry.dialog.width, `${viewport.name}: readable desktop width`).toBeGreaterThanOrEqual(800);
      expect(geometry.heroTop - geometry.dialog.top, `${viewport.name}: content starts without an empty header`).toBeLessThan(40);
      expect(geometry.scrollHeight, `${viewport.name}: no internal vertical scrollbar`).toBeLessThanOrEqual(geometry.clientHeight + 1);
    }

    await primaryAction.scrollIntoViewIfNeeded();
    await expect(primaryAction, `${viewport.name}: primary action`).toBeVisible();
  }
});
