import { expect, test, type Page } from "@playwright/test";
import { confirmNewProjectDialog } from "./utils/newProject";

async function createEmptyProject(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem("chen-er-diagram-studio:locale", "en");
  });
  await page.goto("/");
  await expect(page.locator(".app-shell")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /Create new project/i }).click();
  await confirmNewProjectDialog(page);
  const skipTour = page.getByRole("button", { name: "Skip tour" });
  if (await skipTour.isVisible()) await skipTour.click();
}

async function commitFromPanel(page: Page, message: string) {
  const panel = page.locator(".source-control-panel");
  await panel.locator(".source-control-commit-input").fill(message);
  await panel.locator(".source-control-primary-button").click();
  await expect(panel.locator(".source-control-commit-input")).toHaveValue("");
}

test("commit tags, automatic filtering, and retention are managed from Source Control", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 860 });
  await createEmptyProject(page);

  const activityRail = page.locator(".project-activity-rail");
  await activityRail.getByRole("button", { name: "Version", exact: true }).click();
  const panel = page.locator(".source-control-panel");
  await commitFromPanel(page, "Initial project");
  await panel.getByRole("button", { name: "Expand history" }).click();
  await panel.locator(".source-control-history-row").click();

  await panel.getByRole("button", { name: "Add tag" }).click();
  const createTagDialog = page.getByRole("dialog", { name: "New commit tag" });
  await createTagDialog.getByRole("textbox", { name: "Name" }).fill("Release 1");
  await createTagDialog.getByRole("textbox", { name: "Optional description" }).fill("Ready for review");
  await createTagDialog.getByRole("button", { name: "Save" }).click();
  await expect(panel.getByRole("button", { name: "Release 1" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Workspace notifications" })).toContainText("Tag Release 1 created");

  await panel.getByRole("button", { name: "Add tag" }).click();
  const duplicateTagDialog = page.getByRole("dialog", { name: "New commit tag" });
  await duplicateTagDialog.getByRole("textbox", { name: "Name" }).fill("release 1");
  await duplicateTagDialog.getByRole("button", { name: "Save" }).click();
  await expect(duplicateTagDialog.getByRole("alert")).toContainText("already exists");
  await duplicateTagDialog.getByRole("button", { name: "Cancel" }).click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("app-header-file-menu").click();
  await page.getByRole("menu", { name: "File" }).getByRole("menuitem", { name: "Save Project" }).click();
  const projectDownload = await downloadPromise;
  const projectPath = await projectDownload.path();
  if (!projectPath) throw new Error("The project download did not produce a local path.");
  await page.locator('input[type="file"][accept*=".ersp"]').setInputFiles(projectPath);
  await expect(panel.getByRole("button", { name: "Release 1" })).toBeVisible();

  await activityRail.getByRole("button", { name: "File", exact: true }).click();
  await page.getByRole("main", { name: "buildER" }).getByRole("button", { name: /New note/ }).click();
  await page.getByRole("dialog", { name: "New file" }).getByRole("button", { name: "Save" }).click();
  await activityRail.getByRole("button", { name: "Version", exact: true }).click();
  await commitFromPanel(page, "Add project notes");

  await page.getByRole("textbox", { name: "Editor for notes.txt" }).fill("Retention test");
  await commitFromPanel(page, "Update project notes");

  await panel.getByRole("button", { name: "Restore", exact: true }).click();
  const restoreDialog = page.getByRole("dialog", { name: "Restore snapshot" });
  await restoreDialog.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByRole("region", { name: "Workspace notifications" })).toContainText("automatic backup");

  await panel.getByRole("button", { name: "Back to history" }).click();
  await expect(panel.locator(".source-control-history-row")).toHaveCount(4);
  await expect(panel.getByText("Automatic backup before restore", { exact: true })).toHaveCount(0);
  await panel.locator(".source-control-settings summary").click();
  await expect(panel.getByText("4 of 5 commits visible")).toBeVisible();

  await panel.getByRole("checkbox", { name: /Show automatic commits/ }).check();
  await expect(panel.locator(".source-control-history-row")).toHaveCount(5);
  await expect(panel.getByText("Automatic backup before restore", { exact: true })).toBeVisible();
  await expect(panel.getByText("5 of 5 commits visible")).toBeVisible();

  await panel.getByRole("spinbutton", { name: /Maximum commits/ }).fill("2");
  await panel.getByRole("button", { name: "Apply" }).click();
  let retentionDialog = page.getByRole("dialog", { name: "Confirm history cleanup" });
  await expect(retentionDialog).toContainText("Commits removed");
  await expect(retentionDialog).toContainText("Protected commits");
  await expect(retentionDialog).toContainText("Commits remaining");
  await retentionDialog.getByRole("button", { name: "Cancel" }).click();
  await expect(panel.locator(".source-control-history-row")).toHaveCount(5);
  await expect(panel.getByRole("spinbutton", { name: /Maximum commits/ })).toHaveValue("200");

  await panel.getByRole("spinbutton", { name: /Maximum commits/ }).fill("2");
  await panel.getByRole("button", { name: "Apply" }).click();
  retentionDialog = page.getByRole("dialog", { name: "Confirm history cleanup" });
  await retentionDialog.getByRole("button", { name: "Apply and remove" }).click();
  await expect(panel.locator(".source-control-history-row")).toHaveCount(2);

  await panel.locator(".source-control-history-row").filter({ hasText: "Release 1" }).click();
  await panel.getByRole("button", { name: "Release 1" }).click();
  const editTagDialog = page.getByRole("dialog", { name: "Edit commit tag" });
  await editTagDialog.getByRole("textbox", { name: "Name" }).fill("Stable");
  await editTagDialog.getByRole("button", { name: "Save" }).click();
  await expect(panel.getByRole("button", { name: "Stable" })).toBeVisible();

  await panel.getByRole("button", { name: "Stable" }).click();
  await page.getByRole("dialog", { name: "Edit commit tag" }).getByRole("button", { name: "Delete tag" }).click();
  await expect(panel.getByRole("button", { name: "Stable" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Workspace notifications" })).toContainText("Tag Stable deleted");
});
