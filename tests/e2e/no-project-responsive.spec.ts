import { expect, test, type Page } from "@playwright/test";

const VIEWPORTS = [
  { name: "wide-desktop", width: 1440, height: 900 },
  { name: "desktop", width: 1024, height: 768 },
  { name: "above-compact", width: 901, height: 800 },
  { name: "compact-boundary", width: 900, height: 800 },
  { name: "reported-regression", width: 761, height: 861 },
  { name: "tablet", width: 640, height: 720 },
  { name: "small-mobile", width: 390, height: 844 },
  { name: "minimum-mobile", width: 320, height: 568 },
];

async function openNoProjectWelcome(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem("chen-er-diagram-studio:locale", "en");
  });
  await page.goto("/");
  await expect(page.locator(".no-project-welcome-page")).toBeVisible({ timeout: 20_000 });
}

for (const viewport of VIEWPORTS) {
  test(`no-project welcome fills the workspace at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await openNoProjectWelcome(page);

    const geometry = await page.evaluate(() => {
      const workspace = document.querySelector<HTMLElement>(".app-workspace-region");
      const welcome = document.querySelector<HTMLElement>(".no-project-welcome-page");
      const content = document.querySelector<HTMLElement>(".no-project-welcome-page__content");
      if (!workspace || !welcome || !content) return null;

      const workspaceRect = workspace.getBoundingClientRect();
      const welcomeRect = welcome.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();

      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        workspaceWidth: workspaceRect.width,
        welcomeWidth: welcomeRect.width,
        welcomeLeft: welcomeRect.left,
        workspaceLeft: workspaceRect.left,
        contentLeft: contentRect.left,
        contentRight: contentRect.right,
      };
    });

    expect(geometry).not.toBeNull();
    expect(geometry!.documentWidth).toBeLessThanOrEqual(geometry!.viewportWidth + 1);
    expect(Math.abs(geometry!.welcomeLeft - geometry!.workspaceLeft)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry!.welcomeWidth - geometry!.workspaceWidth)).toBeLessThanOrEqual(1);
    expect(geometry!.contentLeft).toBeGreaterThanOrEqual(0);
    expect(geometry!.contentRight).toBeLessThanOrEqual(geometry!.viewportWidth + 1);

    await expect(page.getByRole("heading", { name: "Open or create a project" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Create new project/i })).toBeVisible();
  });
}
