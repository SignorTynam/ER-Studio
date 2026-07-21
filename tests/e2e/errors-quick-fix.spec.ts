import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Due entita nude producono due warning "entity-no-attributes", ognuno con
// l'azione guidata "Add attribute" (navigate). Seeding deterministico via editor.
async function seedTwoBareEntities(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem("chen-er-diagram-studio:locale", "en");
  });
  await page.goto("/");
  await expect(page.locator(".app-shell")).toBeVisible({ timeout: 20_000 });

  await page.getByRole("button", { name: /Create new project/i }).click();
  await page.getByRole("complementary", { name: "Explorer" }).getByRole("button", { name: "Create schema" }).click();
  const rename = page.locator(".project-explorer-item__rename");
  await rename.fill("Quick Fix QA");
  await rename.press("Enter");
  await expect(page.locator(".designer-canvas-region")).toBeVisible();

  await page.locator(".project-activity-rail").getByRole("button", { name: "Code", exact: true }).click();
  const editor = page.getByRole("textbox", { name: "Program code editor" });
  await editor.fill("entity Alpha\nentity Beta");
  await expect(page.locator(".diagram-node")).toHaveCount(2);
  await page.locator(".project-activity-rail").getByRole("button", { name: "Code", exact: true }).click();

  const skipTour = page.getByRole("button", { name: "Skip tour" });
  if (await skipTour.isVisible().catch(() => false)) await skipTour.click();
}

test("errors panel offers a per-row guided fix, keeps keyboard nav, and navigates on click", async ({ page }) => {
  await seedTwoBareEntities(page);

  await page.locator(".project-activity-rail").getByRole("button", { name: "Errors", exact: true }).click();
  const panel = page.locator(".errors-panel");
  await expect(panel).toBeVisible();

  const rows = panel.locator(".errors-panel__row");
  await expect(rows).toHaveCount(2);

  // Ogni riga espone la sua azione guidata (presente nel DOM, rivelata su focus/hover).
  await expect(panel.locator(".errors-panel__row-action")).toHaveCount(2);

  // Accessibilita del pannello con le nuove azioni.
  const results = await new AxeBuilder({ page }).include(".errors-panel").analyze();
  expect(results.violations).toEqual([]);

  // La navigazione a frecce fra le righe resta invariata.
  await rows.first().focus();
  await page.keyboard.press("ArrowDown");
  await expect(rows.nth(1)).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(rows.first()).toBeFocused();

  // Il focus sulla riga rivela l'azione (focus-within): deve essere raggiungibile da tastiera.
  const firstRowFix = rows.first().locator(".errors-panel__row-action");
  await expect(firstRowFix).toBeVisible();
  await expect(firstRowFix).toHaveAccessibleName("Add attribute");

  // Eseguire il quick-fix "navigate": porta l'utente sull'entita giusta senza
  // modificare il modello (nessun auto-fix), selezionandola sul canvas.
  await firstRowFix.click();

  await expect(page.locator(".diagram-node")).toHaveCount(2); // navigate non muta il modello
  const selected = page.locator(".diagram-node.selected");
  await expect(selected).toHaveCount(1);
  await expect(selected).toHaveAttribute("aria-label", /ALPHA/i);
});
