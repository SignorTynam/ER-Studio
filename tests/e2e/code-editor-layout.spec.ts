import { expect, test } from "@playwright/test";
import { confirmNewProjectDialog } from "./utils/newProject";

for (const viewport of [
  { name: "desktop", width: 1295, height: 861 },
  { name: "mobile", width: 582, height: 861 },
]) {
  test(`l'editor ERS usa tutta l'area disponibile su ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.localStorage.setItem("chen-er-diagram-studio:locale", "it");
    });
    await page.goto("/");
    await expect(page.locator(".app-shell")).toBeVisible();

    await page
      .getByRole("main", { name: "Apri o crea un progetto" })
      .getByRole("button", { name: /Crea nuovo progetto/ })
      .click();
    await confirmNewProjectDialog(page);
    await page
      .getByRole("complementary", { name: "Explorer" })
      .getByRole("button", { name: "Crea schema" })
      .click();
    const schemaName = page.locator(".project-explorer-item__rename");
    await schemaName.fill("Schema layout");
    await schemaName.press("Enter");
    await expect(page.locator(".designer-canvas-region")).toBeVisible();

    await page.locator(".project-activity-rail").getByRole("button", { name: "Code", exact: true }).click();
    const editorBody = page.locator(".code-activity-panel__body");
    const editor = page.getByRole("textbox", { name: "Editor codice del programma" });
    await expect(editorBody).toBeVisible();
    await expect(editor).toBeVisible();

    const bodyBox = await editorBody.boundingBox();
    const editorBox = await editor.boundingBox();
    expect(bodyBox).not.toBeNull();
    expect(editorBox).not.toBeNull();
    expect(editorBox!.height).toBeGreaterThanOrEqual(bodyBox!.height - 2);
    expect(editorBox!.width).toBeGreaterThan(120);

    await editor.focus();
    await editor.press("Control+End");
    await editor.pressSequentially("\n/* layout test */");
    await expect(editor).toHaveValue(/layout test/);
  });
}
