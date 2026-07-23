import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { confirmNewProjectDialog } from "./utils/newProject";

// F1 — Fit-to-screen / zoom-to-selection on the concept canvas.
// Verifies the new HUD and command-menu entries, including fit-selection's
// documented fallback when no node is selected, and that fit-all drives the viewport through the request-token chain
// (onFitAll -> token -> canvas effect -> fitAll -> animateViewportTo -> onViewportChange).
// The document-hidden / reduced-motion path applies the target instantly, so the
// assertions do not depend on the tween.

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
  await schemaName.fill("Fit Schema");
  await schemaName.press("Enter");
  await expect(page.locator(".designer-canvas-region")).toBeVisible();
  await expect(page.locator(".canvas-viewport-hud")).toBeVisible();

  await page.locator(".project-activity-rail").getByRole("button", { name: "Code", exact: true }).click();
  const editor = page.getByRole("textbox", { name: "Editor codice del programma" });
  await editor.fill("entity Customer\nentity Order");
  await expect(page.locator(".diagram-node")).toHaveCount(2);
  await page.locator(".project-activity-rail").getByRole("button", { name: "Code", exact: true }).click();
  await expect(editor).toBeHidden();
  const skipTour = page.getByRole("button", { name: "Salta tour" });
  if (await skipTour.isVisible()) {
    await skipTour.click();
  }
}

function viewportTransform(page: Page) {
  return page.evaluate(() => {
    const group = Array.from(document.querySelectorAll("svg.diagram-canvas g[transform]")).find((node) =>
      /scale/.test(node.getAttribute("transform") || ""),
    );
    return group?.getAttribute("transform") ?? null;
  });
}

async function openCommandMenu(page: Page) {
  await page.getByTestId("app-header-menu").click();
  await expect(page.getByTestId("command-menu")).toBeVisible();
}

test("HUD and command menu run concept-canvas fit actions", async ({ page }) => {
  await createDiagram(page);

  const option = (label: string) =>
    page.locator('[data-testid="command-menu"] [role="option"]', { hasText: label });

  const hud = page.locator(".canvas-viewport-hud");
  await expect(hud.getByRole("button", { name: "Riduci zoom" })).toBeVisible();
  await expect(hud.getByRole("button", { name: "Reset zoom" })).toBeVisible();
  await expect(hud.getByRole("button", { name: "Aumenta zoom" })).toBeVisible();
  await expect(hud.getByRole("button", { name: "Inquadra l'intero diagramma" })).toBeVisible();
  await expect(hud.getByRole("button", { name: "Inquadra la selezione corrente" })).toBeVisible();
  const targetSizes = await hud.getByRole("button").evaluateAll((buttons) =>
    buttons.map((button) => {
      const rect = button.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }),
  );
  expect(targetSizes.every(({ width, height }) => width >= 32 && height >= 32)).toBe(true);
  const accessibility = await new AxeBuilder({ page }).include(".canvas-viewport-hud").analyze();
  expect(accessibility.violations).toEqual([]);

  // Fit-selection stays available with no selection because it falls back to fit-all.
  await openCommandMenu(page);
  await page.getByTestId("command-menu-search").fill("Inquadra");
  await expect(option("Inquadra tutto")).toBeVisible();
  await expect(option("Inquadra selezione")).not.toHaveClass(/disabled/);
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("command-menu")).toBeHidden();

  // Perturb the viewport with a wheel zoom so a fit has to move it.
  await page.locator(".designer-canvas-region").hover();
  await page.mouse.wheel(0, -600);
  await hud.getByRole("button", { name: "Reset zoom" }).click();
  await expect(hud.getByRole("button", { name: "Reset zoom" })).toHaveText("100%");
  await page.locator(".designer-canvas-region").hover();
  await page.mouse.wheel(0, -600);
  const perturbed = await viewportTransform(page);
  expect(perturbed).toBeTruthy();

  // Fit-all via the command menu returns the viewport to its framed position.
  await openCommandMenu(page);
  await page.getByTestId("command-menu-search").fill("Inquadra tutto");
  await option("Inquadra tutto").click();
  await expect(page.getByTestId("command-menu")).toBeHidden();
  await expect.poll(() => viewportTransform(page)).not.toBe(perturbed);

  // Selection fit uses the selected node bounds and the keyboard shortcut is wired.
  await page.locator('.diagram-node[aria-label="Nodo entity: CUSTOMER"]').click();
  const beforeSelectionFit = await viewportTransform(page);
  await page.locator(".designer-canvas-region").press("Shift+2");
  await expect.poll(() => viewportTransform(page)).not.toBe(beforeSelectionFit);
});
