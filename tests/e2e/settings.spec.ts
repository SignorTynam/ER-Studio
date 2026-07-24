import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { confirmNewProjectDialog } from "./utils/newProject";

// Pulisce lo storage e forza l'inglese SOLO al primo caricamento del contesto: così un
// reload non azzera le preferenze, e i test di persistenza restano deterministici.
async function seed(page: Page) {
  await page.addInitScript(() => {
    if (!window.sessionStorage.getItem("__settings_seeded")) {
      window.localStorage.clear();
      window.localStorage.setItem("chen-er-diagram-studio:locale", "en");
      window.sessionStorage.setItem("__settings_seeded", "1");
    }
  });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.locator(".app-shell")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /Create new project/i }).click();
  await confirmNewProjectDialog(page);
  await page.getByRole("complementary", { name: "Explorer" }).getByRole("button", { name: "Create schema" }).click();
  const rename = page.locator(".project-explorer-item__rename");
  await rename.fill("Settings QA");
  await rename.press("Enter");
  await expect(page.locator(".designer-canvas-region")).toBeVisible();
  const skipTour = page.getByRole("button", { name: "Skip tour" });
  if (await skipTour.isVisible().catch(() => false)) await skipTour.click();
}

test("opens with Ctrl+, and the header gear, switches sections, closes with Esc, a11y clean", async ({ page }) => {
  await seed(page);
  await page.locator(".designer-canvas-region").click();
  await page.keyboard.press("Control+Comma");

  const dialog = page.getByRole("dialog", { name: "Settings" });
  await expect(dialog).toBeVisible();

  const results = await new AxeBuilder({ page }).include('[data-testid="settings-modal"]').analyze();
  expect(results.violations).toEqual([]);

  // Nav a sezioni (tablist): Aspetto attiva di default, si passa a Diagramma.
  await expect(dialog.getByRole("tab", { name: "Appearance", selected: true })).toBeVisible();
  await dialog.getByRole("tab", { name: "Diagram" }).click();
  await expect(dialog.getByRole("switch", { name: "Show the minimap by default" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  // Riapribile dall'ingranaggio in header.
  await page.getByTestId("app-header-settings").click();
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
});

test("language changes from settings and persists after reload", async ({ page }) => {
  await seed(page);
  await page.getByTestId("app-header-settings").click();
  await page.getByRole("dialog", { name: "Settings" }).getByRole("combobox").selectOption("it");

  // L'interfaccia passa all'italiano (il titolo del dialogo si localizza).
  await expect(page.getByRole("dialog", { name: "Impostazioni" })).toBeVisible();

  await page.reload();
  await expect(page.locator(".app-shell")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("app-header-settings").click();
  await expect(page.getByRole("dialog", { name: "Impostazioni" })).toBeVisible();
});

test("minimap toggle syncs with the canvas and persists after reload", async ({ page }) => {
  await seed(page);

  // Default: minimap visibile (il canvas mostra "Hide minimap").
  await expect(page.getByRole("button", { name: "Hide minimap" })).toBeVisible();

  await page.getByTestId("app-header-settings").click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await dialog.getByRole("tab", { name: "Diagram" }).click();
  const minimapSwitch = dialog.getByRole("switch", { name: "Show the minimap by default" });
  await expect(minimapSwitch).toBeChecked();
  await minimapSwitch.uncheck();
  await page.keyboard.press("Escape");

  // Sincronizzazione: il canvas ora offre "Show minimap" (minimap nascosta).
  await expect(page.getByRole("button", { name: "Show minimap" })).toBeVisible();

  // Persistenza: dopo reload la preferenza resta (interruttore ancora spento).
  await page.reload();
  await expect(page.locator(".app-shell")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("app-header-settings").click();
  await page.getByRole("dialog", { name: "Settings" }).getByRole("tab", { name: "Diagram" }).click();
  await expect(page.getByRole("dialog", { name: "Settings" }).getByRole("switch", { name: "Show the minimap by default" })).not.toBeChecked();
});

test("diagnostics toggle stays in sync with the Errors panel toggle", async ({ page }) => {
  await seed(page);

  // Il pannello Errori mostra il toggle diagnostica come "Hide diagnostics" (attivo).
  await page.locator(".project-activity-rail").getByRole("button", { name: "Errors", exact: true }).click();
  await expect(page.getByRole("button", { name: "Hide diagnostics" })).toBeVisible();

  // Spegnendo la diagnostica dalle Impostazioni...
  await page.getByTestId("app-header-settings").click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await dialog.getByRole("tab", { name: "Diagram" }).click();
  await dialog.getByRole("switch", { name: "Diagnostic indicators on the canvas" }).uncheck();
  await page.keyboard.press("Escape");

  // ...il toggle del pannello Errori riflette lo stesso stato ("Show diagnostics").
  await expect(page.getByRole("button", { name: "Show diagnostics" })).toBeVisible();
});
