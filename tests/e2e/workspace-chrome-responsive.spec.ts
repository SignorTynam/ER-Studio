import { expect, test } from "@playwright/test";

test("welcome, empty actions, and compact header stay balanced", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem("chen-er-diagram-studio:locale", "sq");
  });

  await page.setViewportSize({ width: 1295, height: 861 });
  await page.goto("/");

  const createProject = page.locator(
    ".no-project-welcome-page .workspace-welcome-action-card--primary",
  );
  await expect(createProject).toHaveCount(1);
  await createProject.click();

  await expect(page.locator(".workspace-welcome-page")).toBeVisible();
  await expect(page.locator(".workspace-welcome-workflow")).toHaveCount(0);
  await expect(page.locator(".workspace-welcome-tips")).toBeVisible();

  const desktopColumns = await page.evaluate(() => {
    const project = document.querySelector<HTMLElement>(".workspace-welcome-project");
    const tips = document.querySelector<HTMLElement>(".workspace-welcome-tips");
    if (!project || !tips) return null;
    return {
      projectLeft: project.getBoundingClientRect().left,
      tipsLeft: tips.getBoundingClientRect().left,
    };
  });
  expect(desktopColumns).not.toBeNull();
  expect(desktopColumns!.tipsLeft).toBeGreaterThan(desktopColumns!.projectLeft);

  const closeWelcome = page.locator(".project-file-tab__close");
  await expect(closeWelcome).toHaveCount(1);
  await closeWelcome.click();
  await expect(page.locator(".workspace-empty-editor")).toBeVisible();

  for (const viewport of [
    { width: 703, height: 861 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport);
    const geometry = await page.evaluate(() => {
      const headerButtons = Array.from(
        document.querySelectorAll<HTMLElement>(".designer-topbar-actions .designer-icon-button"),
      ).filter((button) => button.getBoundingClientRect().width > 0);
      const actions = Array.from(
        document.querySelectorAll<HTMLElement>(".workspace-empty-editor__button"),
      );
      const panel = document.querySelector<HTMLElement>(".workspace-empty-editor__panel");

      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        headerSizes: headerButtons.map((button) => button.getBoundingClientRect().width),
        actionWidths: actions.map((button) => button.getBoundingClientRect().width),
        panelWidth: panel?.getBoundingClientRect().width ?? 0,
      };
    });

    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth + 1);
    expect(geometry.headerSizes.every((size) => size <= 32)).toBe(true);
    expect(new Set(geometry.actionWidths.map(Math.round)).size).toBeGreaterThan(1);
    expect(geometry.actionWidths.every((size) => size < geometry.panelWidth)).toBe(true);
  }
});
