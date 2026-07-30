import { expect, test, type Page } from "@playwright/test";
import { confirmNewProjectDialog } from "./utils/newProject";

async function bootItalianWorkspace(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem("chen-er-diagram-studio:locale", "it");
  });
  await page.goto("/");
  await expect(page.locator(".app-shell")).toBeVisible();
}

async function createProject(page: Page) {
  await page
    .getByRole("main", { name: "Apri o crea un progetto" })
    .getByRole("button", { name: /Crea nuovo progetto/ })
    .click();
  await confirmNewProjectDialog(page);
  await expect(page.getByRole("region", { name: "buildER" })).toBeVisible();
}

async function createExplorerFile(page: Page, menuLabel: string, name: string) {
  const explorer = page.getByRole("complementary", { name: "Explorer" });
  if (await explorer.count() === 0) {
    await page.locator(".project-activity-rail").getByRole("button", { name: "File", exact: true }).click();
    await expect(explorer).toBeVisible();
  }
  await page
    .getByRole("complementary", { name: "Explorer" })
    .getByRole("button", { name: "Nuovo file", exact: true })
    .click();
  await page.getByRole("menuitem", { name: menuLabel, exact: true }).click();
  const nameInput = page.locator(".project-explorer-item__rename");
  await expect(nameInput).toBeFocused();
  await nameInput.fill(name);
  await nameInput.press("Enter");
  await expect(page.locator(".project-file-tab.active")).toContainText(name);
}

test("cerca file reali, li apre con Enter ed esegue un comando reale", async ({ page }) => {
  await bootItalianWorkspace(page);
  await createProject(page);
  await createExplorerFile(page, "Nuovo file testuale", "Appunti palette");
  await createExplorerFile(page, "Nuovo file SQL", "Query palette");
  await createExplorerFile(page, "Nuovo schema", "Modello palette");

  const headerControl = page.locator(".app-command-search");
  await headerControl.click();

  const palette = page.getByTestId("command-menu");
  const search = page.getByTestId("command-menu-search");
  await expect(palette).toBeVisible();
  await expect(search).toBeFocused();
  await expect(palette.getByText("File aperti", { exact: true })).toBeVisible();

  await search.fill("appunti palette");
  const noteOption = page.getByRole("option", { name: /Appunti palette\.txt/ });
  await expect(noteOption).toBeVisible();
  await expect(noteOption).toContainText("Appunti palette.txt");
  await search.press("Enter");
  await expect(palette).toBeHidden();
  await expect(page.locator(".project-file-tab.active")).toContainText("Appunti palette.txt");

  await headerControl.click();
  await search.fill("query palette sql");
  await expect(page.getByRole("option", { name: /Query palette\.sql/ })).toBeVisible();
  await search.press("Enter");
  await expect(page.locator(".project-file-tab.active")).toContainText("Query palette.sql");

  await headerControl.click();
  await search.fill("modello palette erschema");
  await expect(page.getByRole("option", { name: /Modello palette\.erschema/ })).toBeVisible();
  await search.press("Enter");
  await expect(page.locator(".project-file-tab.active")).toContainText("Modello palette.erschema");
  await expect(page.locator(".designer-canvas-region")).toBeVisible();

  await headerControl.click();
  await search.fill("apri");
  const firstSelection = await search.getAttribute("aria-activedescendant");
  expect(firstSelection).toBeTruthy();
  await search.press("ArrowDown");
  const secondSelection = await search.getAttribute("aria-activedescendant");
  expect(secondSelection).toBeTruthy();
  expect(secondSelection).not.toBe(firstSelection);
  await search.press("ArrowUp");
  await expect(search).toHaveAttribute("aria-activedescendant", firstSelection!);

  await search.fill("mostra welcome");
  await expect(page.getByRole("option", { name: /Mostra Welcome/ })).toBeVisible();
  await search.press("Enter");
  await expect(palette).toBeHidden();
  await expect(page.getByRole("region", { name: "buildER" })).toBeVisible();
});

test("supporta Ctrl+K, salta i disabilitati e ripristina il focus alla chiusura", async ({ page }) => {
  await bootItalianWorkspace(page);

  const palette = page.getByTestId("command-menu");
  const search = page.getByTestId("command-menu-search");
  const headerControl = page.locator(".app-command-search");

  await page.keyboard.press("Control+KeyK");
  await expect(palette).toBeVisible();
  await expect(search).toBeFocused();

  for (let index = 0; index < 8; index += 1) {
    const activeId = await search.getAttribute("aria-activedescendant");
    expect(activeId).toBeTruthy();
    await expect(page.locator(`#${activeId}`)).not.toHaveAttribute("aria-disabled", "true");
    await search.press("ArrowDown");
  }

  await page.keyboard.press("Control+KeyK");
  await expect(palette).toBeHidden();

  await headerControl.click();
  await expect(search).toBeFocused();
  await search.fill("risultato che non esiste 987654");
  await expect(palette.getByText("Nessun risultato", { exact: true })).toBeVisible();
  await expect(search).not.toHaveAttribute("aria-activedescendant", /.+/);
  await search.press("Escape");
  await expect(palette).toBeHidden();
  await expect(headerControl).toBeFocused();

  await headerControl.click();
  const catcher = page.locator(".command-palette-catcher");
  const catcherBox = await catcher.boundingBox();
  expect(catcherBox).not.toBeNull();
  await catcher.click({ position: { x: 4, y: catcherBox!.height - 4 } });
  await expect(palette).toBeHidden();
  await expect(headerControl).toBeFocused();
});

test("rimane contenuta nel viewport mobile", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await bootItalianWorkspace(page);
  await page.keyboard.press("Control+KeyK");

  const palette = page.getByTestId("command-menu");
  await expect(palette).toBeVisible();
  const box = await palette.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(360);
  expect(box!.y + box!.height).toBeLessThanOrEqual(640);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
