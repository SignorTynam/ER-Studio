import { Buffer } from "node:buffer";
import { expect, test, type Page } from "@playwright/test";
import { createPlaygroundProject } from "./utils/sqlPlaygroundProject";

const INITIAL_SQL = `SELECT id, name
FROM "STUDENT"
ORDER BY id;`;

async function bootSqlFileProject(
  page: Page,
  options: { schemaCount?: number; sql?: string } = {},
) {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem("chen-er-diagram-studio:locale", "it");
  });
  await page.goto("/");
  await expect(page.locator(".app-shell")).toBeVisible();
  await page.locator('input[type="file"][accept*=".ersp"]').setInputFiles({
    name: "sql-file-workflow.ersp",
    mimeType: "application/json",
    buffer: Buffer.from(createPlaygroundProject({
      schemaCount: options.schemaCount,
      sqlFile: {
        name: "query.sql",
        content: options.sql ?? INITIAL_SQL,
        active: true,
      },
    })),
  });
  await expect(page.locator(".project-file-tab.active")).toContainText("query.sql");
}

test("a workspace SQL file seeds one Playground session without auto-executing", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await bootSqlFileProject(page);

  const sourceEditor = page.getByRole("textbox", { name: "Editor SQL per query.sql" });
  const currentSql = `SELECT name
FROM "STUDENT"
WHERE id > 10;`;
  await expect(page.locator(".workspace-text-editor--sql .designer-code-line-numbers")).toBeVisible();
  await expect(page.locator(".workspace-text-editor--sql .sql-token-keyword").first()).toBeVisible();
  await sourceEditor.fill(currentSql);
  await expect(page.locator(".project-file-tab.active")).toHaveClass(/dirty/);

  await page.getByRole("button", { name: "Apri nel Playground", exact: true }).click();
  await expect(page.locator(".sql-playground-workspace")).toBeVisible();
  const playgroundEditor = page.getByRole("textbox", { name: "Editor query SQL" });
  await expect(playgroundEditor).toHaveValue(currentSql);
  await expect(page.getByText("Crea il database ed esegui una query per vedere i risultati.", { exact: true })).toBeVisible();
  await expect(page.locator(".project-file-tab", { hasText: "Playground" })).toHaveCount(1);

  await page.locator(".project-file-tab", { hasText: "query.sql" }).click();
  await expect(sourceEditor).toHaveValue(currentSql);
  await page.getByRole("button", { name: "Apri nel Playground", exact: true }).click();
  await expect(page.locator(".project-file-tab", { hasText: "Playground" })).toHaveCount(1);
  await expect(playgroundEditor).toHaveValue(currentSql);
});

test("Reverse Engineering binds and edits the same SQL file without importing or analyzing", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await bootSqlFileProject(page);

  const sourceEditor = page.getByRole("textbox", { name: "Editor SQL per query.sql" });
  const currentSql = "CREATE TABLE CurrentSource (id INTEGER PRIMARY KEY);";
  await sourceEditor.fill(currentSql);
  await page.getByRole("button", { name: "Avvia Reverse Engineering", exact: true }).click();

  const reversePanel = page.locator(".sql-reverse-panel");
  await expect(reversePanel).toBeVisible();
  await expect(reversePanel).toContainText("query.sql");
  const reverseEditor = reversePanel.getByRole("textbox", { name: "Editor SQL Reverse" });
  await expect(reverseEditor).toHaveValue(currentSql);
  await expect(page.locator(".sql-reverse-preview-shell")).toHaveCount(0);

  const updatedSql = `${currentSql}\nCREATE INDEX idx_current ON CurrentSource(id);`;
  await reverseEditor.fill(updatedSql);
  await page.locator(".project-file-tab", { hasText: "query.sql" }).click();
  await expect(sourceEditor).toHaveValue(updatedSql);
  await expect(page.locator(".project-file-tab", { hasText: "query.sql" })).toHaveCount(1);
  await expect(page.getByRole("complementary", { name: "Explorer" }).getByText("query", { exact: true })).toHaveCount(1);
});

test("ambiguous schemas keep the source untouched and require an explicit schema choice", async ({ page }) => {
  test.setTimeout(60_000);
  await bootSqlFileProject(page, { schemaCount: 2 });
  const sourceEditor = page.getByRole("textbox", { name: "Editor SQL per query.sql" });
  await expect(sourceEditor).toHaveValue(INITIAL_SQL);

  await page.getByRole("button", { name: "Apri nel Playground", exact: true }).click();
  await expect(page.getByLabel("Operazione non valida").getByText(/sono disponibili più schemi/i)).toBeVisible();
  await expect(page.locator(".sql-playground-workspace")).toHaveCount(0);
  await expect(sourceEditor).toHaveValue(INITIAL_SQL);
});

test("workspace panels expose structured empty states and a vertical commit composer", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1024, height: 768 });
  await bootSqlFileProject(page);

  const rail = page.locator(".project-activity-rail");
  await rail.getByRole("button", { name: "SQL Explorer", exact: true }).click();
  const sqlExplorer = page.locator(".sql-explorer-panel");
  await expect(sqlExplorer.locator(".workspace-panel__empty--card")).toBeVisible();
  await expect(sqlExplorer.getByText("Playground SQL non aperto", { exact: true })).toBeVisible();
  await expect(sqlExplorer.getByRole("button", { name: "Apri SQL Playground", exact: true })).toBeVisible();
  await expect(sqlExplorer.getByRole("button", { name: "Aggiungi database", exact: true })).toBeVisible();

  await rail.getByRole("button", { name: "Errors", exact: true }).click();
  const errorsPanel = page.locator(".errors-panel");
  await expect(errorsPanel.locator(".workspace-panel__empty--card.workspace-panel__empty--success")).toBeVisible();
  await expect(errorsPanel.getByText("Diagramma valido", { exact: true })).toBeVisible();

  await rail.getByRole("button", { name: "Version", exact: true }).click();
  const composer = page.locator(".source-control-commit-composer");
  const input = composer.locator(".source-control-commit-input");
  const submit = composer.locator(".source-control-commit-submit-row");
  await expect(input).toBeVisible();
  await expect(submit).toBeVisible();
  const layout = await composer.evaluate((element) => {
    const inputBox = element.querySelector("textarea")?.getBoundingClientRect();
    const submitBox = element.querySelector(".source-control-commit-submit-row")?.getBoundingClientRect();
    return {
      columns: getComputedStyle(element).gridTemplateColumns,
      inputBottom: inputBox?.bottom ?? 0,
      submitTop: submitBox?.top ?? 0,
    };
  });
  expect(layout.columns.trim().split(/\s+/)).toHaveLength(1);
  expect(layout.submitTop).toBeGreaterThanOrEqual(layout.inputBottom);

  await input.fill("Snapshot SQL workflow");
  await input.press("Control+Enter");
  await expect(page.getByRole("region", { name: "Notifiche workspace" })).toContainText("Commit creato");
  await expect(input).toHaveValue("");
});

for (const viewport of [
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
]) {
  test(`SQL file actions stay usable at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize(viewport);
    await bootSqlFileProject(page);
    await page.locator(".project-activity-rail").getByRole("button", { name: "File", exact: true }).click();
    await expect(page.getByRole("complementary", { name: "Explorer" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Apri nel Playground", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Avvia Reverse Engineering", exact: true })).toBeVisible();
    const overflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      editor: document.querySelector(".workspace-text-editor")!.scrollWidth
        - document.querySelector(".workspace-text-editor")!.clientWidth,
    }));
    expect(overflow.document).toBeLessThanOrEqual(1);
    expect(overflow.editor).toBeLessThanOrEqual(1);
  });
}
