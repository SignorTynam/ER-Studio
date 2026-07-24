import { expect, test, type Page } from "@playwright/test";
import { confirmNewProjectDialog } from "./utils/newProject";

// G5 — after an auto-layout, a success toast offers a one-click "Annulla" (undo)
// instead of requiring Ctrl+Z. The toast reuses the existing notice action support.

async function createDiagram(page: Page) {
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
  await schemaName.fill("Layout Schema");
  await schemaName.press("Enter");
  await expect(page.locator(".designer-canvas-region")).toBeVisible();

  await page.locator(".project-activity-rail").getByRole("button", { name: "Code", exact: true }).click();
  const editor = page.getByRole("textbox", { name: "Editor codice del programma" });
  await editor.fill("entity Customer\nentity Order\nentity Product");
  await expect(page.locator(".diagram-node")).toHaveCount(3);
  await page.locator(".project-activity-rail").getByRole("button", { name: "Code", exact: true }).click();
  const skipTour = page.getByRole("button", { name: "Salta tour" });
  if (await skipTour.isVisible()) {
    await skipTour.click();
  }
}

test("auto-layout offers a one-click Annulla toast", async ({ page }) => {
  await createDiagram(page);

  // Trigger auto-layout via the command menu (the ER command is the enabled "Organizza").
  await page.getByTestId("app-header-menu").click();
  await expect(page.getByTestId("command-menu")).toBeVisible();
  await page.getByTestId("command-menu-search").fill("Organizza");
  await page
    .locator('[data-testid="command-menu"] [role="option"]:not(.disabled)', { hasText: "Organizza" })
    .first()
    .click();

  // Confirm the non-destructive dialog.
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Organizza", exact: true }).click();

  // The success toast exposes an "Annulla" action; one click dismisses it (undo).
  const undo = page.locator(".workspace-toast-action", { hasText: "Annulla" });
  await expect(undo).toBeVisible();
  await undo.click();
  await expect(undo).toBeHidden();
});

test("organize selection is gated on a multi-node selection and offers Annulla", async ({ page }) => {
  await createDiagram(page);

  const option = (label: string) =>
    page.locator('[data-testid="command-menu"] [role="option"]', { hasText: label });

  // With no selection the command is disabled.
  await page.getByTestId("app-header-menu").click();
  await page.getByTestId("command-menu-search").fill("Organizza selezione");
  await expect(option("Organizza selezione")).toHaveClass(/disabled/);
  await page.keyboard.press("Escape");

  // Select two entities (additive with Shift).
  await page.locator('.diagram-node[aria-label="Nodo entity: CUSTOMER"]').click();
  await page.locator('.diagram-node[aria-label="Nodo entity: ORDER"]').click({ modifiers: ["Shift"] });

  // Now the command is enabled and its toast offers a one-click Annulla.
  await page.getByTestId("app-header-menu").click();
  await page.getByTestId("command-menu-search").fill("Organizza selezione");
  const command = option("Organizza selezione");
  await expect(command).not.toHaveClass(/disabled/);
  await command.click();

  const undo = page.locator(".workspace-toast-action", { hasText: "Annulla" });
  await expect(undo).toBeVisible();
  await undo.click();
  await expect(undo).toBeHidden();
});
