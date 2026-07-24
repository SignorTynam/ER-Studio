import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { confirmNewProjectDialog } from "./utils/newProject";

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
  await schemaName.fill("Auto Layout Schema");
  await schemaName.press("Enter");
  await expect(page.locator(".designer-canvas-region")).toBeVisible();

  await page.locator(".project-activity-rail").getByRole("button", { name: "Code", exact: true }).click();
  const editor = page.getByRole("textbox", { name: "Editor codice del programma" });
  await editor.fill(
    [
      "entity Customer",
      "entity Order",
      "entity Product",
      "entity Supplier",
      "entity Shipment",
      "entity Warehouse",
    ].join("\n"),
  );
  await expect(page.locator(".diagram-node")).toHaveCount(6);
  await page.locator(".project-activity-rail").getByRole("button", { name: "Code", exact: true }).click();

  const skipTour = page.getByRole("button", { name: "Salta tour" });
  if (await skipTour.isVisible()) await skipTour.click();
}

function nodeSnapshot(page: Page) {
  return page.locator(".diagram-node").evaluateAll((nodes) =>
    nodes
      .map((node) => {
        const shape = node.querySelector("rect, ellipse, polygon");
        return {
          label: node.getAttribute("aria-label"),
          geometry: shape
            ? ["x", "y", "cx", "cy", "points"].map((name) => shape.getAttribute(name)).join("|")
            : null,
        };
      })
      .sort((left, right) => (left.label ?? "").localeCompare(right.label ?? "")),
  );
}

async function openAutoLayoutDialogFromCommandMenu(page: Page) {
  await page.getByTestId("app-header-menu").click();
  await page.getByTestId("command-menu-search").fill("Organizza automaticamente");
  await page.getByRole("option", { name: /Organizza automaticamente/ }).click();
  return page.getByRole("dialog", { name: "Organizzare il diagramma concettuale?" });
}

test("conceptual auto-layout confirms, fits, and is reverted by one undo", async ({ page }) => {
  await createDiagram(page);
  const before = await nodeSnapshot(page);

  // The toolbar action is non-destructive until the user confirms.
  await page.getByRole("button", { name: "Organizza", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "Organizzare il diagramma concettuale?" });
  await expect(dialog).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
  expect(accessibility.violations).toEqual([]);
  await dialog.getByRole("button", { name: "Annulla" }).click();
  expect(await nodeSnapshot(page)).toEqual(before);

  // The documented keyboard shortcut reaches the same confirmation flow.
  await page.locator(".canvas-panel").press("Shift+L");
  dialog = page.getByRole("dialog", { name: "Organizzare il diagramma concettuale?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Annulla" }).click();

  // Execute from the command menu and verify that semantics stay untouched.
  const viewportControls = page.getByRole("group", { name: "Controlli viewport" });
  await viewportControls.getByRole("button", { name: "Aumenta zoom" }).click();
  const perturbedZoom = await viewportControls.getByRole("button", { name: "Reset zoom" }).textContent();
  expect(perturbedZoom).toBeTruthy();
  dialog = await openAutoLayoutDialogFromCommandMenu(page);
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Organizza", exact: true }).click();
  await expect.poll(() => nodeSnapshot(page)).not.toEqual(before);
  await expect(viewportControls.getByRole("button", { name: "Reset zoom" })).not.toHaveText(perturbedZoom!);
  const after = await nodeSnapshot(page);
  expect(after.map(({ label }) => label)).toEqual(before.map(({ label }) => label));

  // The whole positional change is one history entry.
  // "Annulla" esiste in due posti legittimi: la toolbar (undo) e il toast dell'auto-layout
  // (Fase G5). Qui serve quello della toolbar, altrimenti il locator è ambiguo.
  await page
    .locator(".designer-context-toolbar")
    .getByRole("button", { name: "Annulla", exact: true })
    .click();
  await expect.poll(() => nodeSnapshot(page)).toEqual(before);
});
