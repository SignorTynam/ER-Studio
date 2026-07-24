import { expect, test, type Page } from "@playwright/test";
import { confirmNewProjectDialog } from "./utils/newProject";

async function createProjectWithSchema(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem("chen-er-diagram-studio:locale", "en");
  });
  await page.goto("/");
  await expect(page.locator(".app-shell")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /Create new project/i }).click();
  await confirmNewProjectDialog(page);
  await page.getByRole("complementary", { name: "Explorer" }).getByRole("button", { name: "Create schema" }).click();
  const rename = page.locator(".project-explorer-item__rename");
  await rename.fill("Panel QA");
  await rename.press("Enter");
  await expect(page.locator(".designer-canvas-region")).toBeVisible();
}

async function assertPanelFits(page: Page, selector: string) {
  const metrics = await page.locator(selector).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      left: rect.left,
      right: rect.right,
      viewport: window.innerWidth,
      offenders: Array.from(element.querySelectorAll<HTMLElement>("*")).flatMap((child) => {
        const childRect = child.getBoundingClientRect();
        return childRect.right > rect.right + 1 || child.scrollWidth > child.clientWidth + 1
          ? [{ className: child.className, clientWidth: child.clientWidth, scrollWidth: child.scrollWidth, width: childRect.width, right: childRect.right }]
          : [];
      }).slice(0, 8),
    };
  });
  expect(metrics.scrollWidth, JSON.stringify(metrics.offenders)).toBeLessThanOrEqual(metrics.clientWidth + 1);
  expect(metrics.left).toBeGreaterThanOrEqual(0);
  expect(metrics.right).toBeLessThanOrEqual(metrics.viewport + 1);
}

for (const panelWidth of [220, 288, 320, 420]) {
  test(`Errors and Source Control fit a ${panelWidth}px activity panel`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await createProjectWithSchema(page);
    const activityPanel = page.locator(".project-activity-panel");
    await activityPanel.evaluate((element, width) => {
      element.style.setProperty("--project-explorer-width", `${width}px`);
    }, panelWidth);

    await page.locator(".project-activity-rail").getByRole("button", { name: "Errors", exact: true }).click();
    await expect(page.locator(".errors-panel")).toBeVisible();
    await assertPanelFits(page, ".errors-panel");
    await expect(page.locator(".errors-panel__filters")).toBeVisible();

    await page.locator(".project-activity-rail").getByRole("button", { name: "Version", exact: true }).click();
    await expect(page.locator(".source-control-panel")).toBeVisible();
    await assertPanelFits(page, ".source-control-panel");
    await expect(page.locator(".source-control-history-splitter")).toHaveCount(0);
    await expect(page.getByText("Repositories", { exact: true })).toHaveCount(0);
  });
}

for (const viewport of [880, 620]) {
  test(`activity panels stay usable at viewport ${viewport}px`, async ({ page }) => {
    await page.setViewportSize({ width: viewport, height: 760 });
    await createProjectWithSchema(page);
    await page.locator(".project-activity-rail").getByRole("button", { name: "Version", exact: true }).click();
    await expect(page.locator(".source-control-panel")).toBeVisible();
    await assertPanelFits(page, ".source-control-panel");
    await page.locator(".project-activity-rail").getByRole("button", { name: "Errors", exact: true }).click();
    await expect(page.locator(".errors-panel")).toBeVisible();
    await assertPanelFits(page, ".errors-panel");
  });
}

test("local snapshot history uses persisted disclosure and global confirmations", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await createProjectWithSchema(page);
  await page.locator(".project-activity-rail").getByRole("button", { name: "Version", exact: true }).click();
  const panel = page.locator(".source-control-panel");
  await panel.locator(".source-control-commit-input").fill("First local snapshot");
  await panel.locator(".source-control-primary-button").click();
  await expect(panel.getByText(/Local HEAD snapshot/)).toBeVisible();

  const historyDisclosure = panel.getByRole("button", { name: "Expand history" });
  await historyDisclosure.click();
  await expect(panel.locator(".source-control-history-row")).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("builder:source-control:history-expanded"))).toBe("true");
  await panel.locator(".source-control-history-row").click();
  await expect(panel.locator(".source-control-commit-details")).toBeVisible();
  await expect(panel.locator(".source-control-history-list")).toHaveCount(0);

  await panel.getByRole("button", { name: "Delete commit" }).click();
  await expect(page.getByRole("dialog", { name: "Delete snapshot" })).toBeVisible();
  await page.getByRole("dialog", { name: "Delete snapshot" }).getByRole("button", { name: "Cancel" }).click();
  await panel.getByRole("button", { name: "Restore", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Restore snapshot" })).toBeVisible();
});
