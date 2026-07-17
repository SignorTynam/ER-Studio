import { expect, test } from "@playwright/test";

test("shows the buildER loading screen and opens the studio without the ERS guide", async ({ page }) => {
  const consoleErrors: string[] = [];
  const failedLocalResponses: string[] = [];
  const baseUrl = "http://127.0.0.1:5173";
  const removedGuideLabel = ["Guida", "ERS"].join(" ");

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  page.on("response", (response) => {
    if (response.status() >= 400 && response.url().startsWith(baseUrl)) {
      failedLocalResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.addInitScript(() => {
    window.localStorage.setItem("chen-er-diagram-studio:locale", "it");
  });

  await page.goto("/");

  const loadingScreen = page.getByTestId("app-loading-screen");
  await expect(loadingScreen).toBeVisible();
  await expect(loadingScreen.getByRole("img", { name: "buildER" })).toBeVisible();
  await expect(page.getByTestId("app-loading-tip")).toContainText(/\S/);

  const faviconHref = await page.locator('link[rel~="icon"]').getAttribute("href");
  expect(faviconHref).toContain("favicon.svg");

  await expect(page.locator(".app-shell")).toBeVisible();
  await expect(page.locator(".workspace-welcome-page")).toBeVisible();
  await expect(page.locator(".designer-canvas-region")).toHaveCount(0);

  await page.keyboard.press("Control+KeyK");
  await expect(page.getByTestId("command-menu")).toBeVisible();
  await expect(page.getByText(removedGuideLabel)).toHaveCount(0);

  await page.getByTestId("command-menu-search").fill(removedGuideLabel);
  await expect(page.getByRole("option", { name: removedGuideLabel, exact: true })).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
  expect(failedLocalResponses).toEqual([]);
});
