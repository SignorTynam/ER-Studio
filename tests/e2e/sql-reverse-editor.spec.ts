import { Buffer } from "node:buffer";
import { expect, test, type Page } from "@playwright/test";

async function bootItalianProject(page: Page) {
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
  await expect(page.getByRole("main", { name: "buildER" })).toBeVisible();
}

async function createExplorerFile(page: Page, menuLabel: string, name: string) {
  const explorer = page.getByRole("complementary", { name: "Explorer" });
  if (await explorer.count() === 0) {
    await page.locator(".project-activity-rail").getByRole("button", { name: "File", exact: true }).click();
    await expect(explorer).toBeVisible();
  }
  await explorer.getByRole("button", { name: "Nuovo file", exact: true }).click();
  await page.getByRole("menuitem", { name: menuLabel, exact: true }).click();
  const nameInput = page.locator(".project-explorer-item__rename");
  await nameInput.fill(name);
  await nameInput.press("Enter");
  await expect(page.locator(".project-file-tab.active")).toContainText(name);
}

test("SQL workspace files stay decoupled while Reverse upload binds a file without opening a tab", async ({ page }) => {
  await bootItalianProject(page);
  await createExplorerFile(page, "Nuovo file SQL", "query");

  await expect(page.locator(".project-file-tab.active")).toContainText("query.sql");
  await expect(page.locator(".sql-reverse-panel")).toHaveCount(0);
  const workspaceSqlEditor = page.getByRole("textbox", { name: /query\.sql/i });
  await workspaceSqlEditor.fill("SELECT 1;");

  await page.locator(".project-activity-rail").getByRole("button", { name: "Reverse", exact: true }).click();
  const reversePanel = page.locator(".sql-reverse-panel");
  await expect(reversePanel).toBeVisible();
  const reverseEditor = reversePanel.getByRole("textbox", { name: "Editor SQL Reverse" });
  await expect(reverseEditor).toHaveValue("");

  await reversePanel.locator('input[type="file"]').setInputFiles({
    name: "import.sql",
    mimeType: "text/sql",
    buffer: Buffer.from("CREATE TABLE Imported (id INTEGER PRIMARY KEY);"),
  });
  await expect(reverseEditor).toHaveValue("CREATE TABLE Imported (id INTEGER PRIMARY KEY);");
  await expect(reversePanel).toContainText("import.sql");

  await page.locator(".project-activity-rail").getByRole("button", { name: "File", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Explorer" }).getByText("import", { exact: true })).toBeVisible();
  await expect(page.locator(".project-file-tab.active")).toContainText("query.sql");
  await expect(page.locator(".project-file-tab")).toHaveCount(1);

  await page.locator(".project-activity-rail").getByRole("button", { name: "Reverse", exact: true }).click();
  await reverseEditor.fill("CREATE TABLE Broken (\n  id INTEGER");
  await reversePanel.getByRole("button", { name: "Analizza codice" }).click();
  await expect(reversePanel.locator(".code-editor-line--error")).toBeVisible();
  await expect(reversePanel.locator(".code-editor-diagnostic-popover")).toBeVisible();
  await expect(reversePanel.locator(".sql-reverse-panel__issues, .sql-reverse-panel__error")).toHaveCount(0);

  await reversePanel.getByRole("button", { name: "Cancella" }).click();
  await expect(reverseEditor).toHaveValue("");
  await page.locator(".project-activity-rail").getByRole("button", { name: "File", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Explorer" }).getByText("import", { exact: true })).toBeVisible();
});

test("ERS diagnostics stay inline and Code/Reverse headers share height on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 582, height: 800 });
  await bootItalianProject(page);
  await createExplorerFile(page, "Nuovo schema", "diagnostics");

  await page.locator(".project-activity-rail").getByRole("button", { name: "Code", exact: true }).click();
  const codePanel = page.locator(".code-activity-panel");
  const codeEditor = codePanel.getByRole("textbox", { name: "Editor codice del programma" });
  await codeEditor.fill("entity A {\n  ???\n}");
  await expect(codePanel.locator('.code-editor-line--error[data-line="2"]')).toBeVisible({ timeout: 4000 });
  await expect(codePanel.locator(".code-editor-diagnostic-popover")).toBeVisible();
  await expect(codePanel.locator(".designer-code-error")).toHaveCount(0);
  const codeHeaderHeight = await codePanel.locator(".workspace-panel__header").evaluate((element) => element.getBoundingClientRect().height);

  await page.locator(".project-activity-rail").getByRole("button", { name: "Reverse", exact: true }).click();
  const reversePanel = page.locator(".sql-reverse-panel");
  const reverseHeader = reversePanel.locator(".workspace-panel__header");
  await expect(reverseHeader.getByRole("button", { name: "Importa file SQL" })).toBeVisible();
  await expect(reverseHeader.getByRole("button", { name: "Chiudi pannello" })).toBeVisible();
  const reverseHeaderHeight = await reverseHeader.evaluate((element) => element.getBoundingClientRect().height);
  expect(reverseHeaderHeight).toBe(codeHeaderHeight);

  const panelBox = await reversePanel.boundingBox();
  const footerBox = await reversePanel.locator(".sql-reverse-panel__footer").boundingBox();
  expect(panelBox).not.toBeNull();
  expect(footerBox).not.toBeNull();
  expect(footerBox!.y + footerBox!.height).toBeLessThanOrEqual(panelBox!.y + panelBox!.height + 1);
});
