import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { confirmNewProjectDialog } from "./utils/newProject";

async function createDiagram(page: Page, nodeCount = 24) {
  await page.addInitScript(() => {
    if (!window.sessionStorage.getItem("canvas-minimap:e2e-ready")) {
      window.localStorage.clear();
      window.localStorage.setItem("chen-er-diagram-studio:locale", "it");
      window.sessionStorage.setItem("canvas-minimap:e2e-ready", "true");
    }
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
  await schemaName.fill("Minimap Schema");
  await schemaName.press("Enter");
  await expect(page.locator(".designer-canvas-region")).toBeVisible();

  if (nodeCount > 0) {
    await page.locator(".project-activity-rail").getByRole("button", { name: "Code", exact: true }).click();
    const editor = page.getByRole("textbox", { name: "Editor codice del programma" });
    await editor.fill(Array.from({ length: nodeCount }, (_, index) => `entity Entity_${index + 1}`).join("\n"));
    await expect(page.locator(".diagram-node")).toHaveCount(nodeCount);
    await page.locator(".project-activity-rail").getByRole("button", { name: "Code", exact: true }).click();
  }

  const skipTour = page.getByRole("button", { name: "Salta tour" });
  if (nodeCount > 0 && await skipTour.isVisible()) await skipTour.click();
}

function canvasTransform(page: Page) {
  return page.evaluate(() => {
    const group = Array.from(document.querySelectorAll("svg.diagram-canvas g[transform]")).find((node) =>
      /scale/.test(node.getAttribute("transform") || ""),
    );
    return group?.getAttribute("transform") ?? null;
  });
}

test("minimap renders 20+ nodes, pans by pointer and keyboard, and persists its toggle", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await createDiagram(page);

  const minimap = page.getByRole("complementary", { name: "Minimappa" });
  await expect(minimap).toBeVisible();
  await expect(minimap.locator(".canvas-minimap__node")).toHaveCount(24);
  await expect(minimap.locator(".canvas-minimap__viewport")).toBeVisible();
  const targetSize = await minimap.getByRole("button", { name: "Nascondi minimappa" }).evaluate((button) => {
    const rect = button.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  expect(targetSize.width).toBeGreaterThanOrEqual(32);
  expect(targetSize.height).toBeGreaterThanOrEqual(32);

  const accessibility = await new AxeBuilder({ page }).include(".canvas-minimap").analyze();
  expect(accessibility.violations).toEqual([]);

  const map = minimap.locator(".canvas-minimap__map");
  const mapBox = await map.boundingBox();
  expect(mapBox).not.toBeNull();
  const beforeClick = await canvasTransform(page);
  await page.mouse.click(mapBox!.x + mapBox!.width * 0.2, mapBox!.y + mapBox!.height * 0.2);
  await expect.poll(() => canvasTransform(page)).not.toBe(beforeClick);

  const beforeDrag = await canvasTransform(page);
  const viewportBox = await minimap.locator(".canvas-minimap__viewport").boundingBox();
  expect(viewportBox).not.toBeNull();
  await page.mouse.move(viewportBox!.x + viewportBox!.width / 2, viewportBox!.y + viewportBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(viewportBox!.x + viewportBox!.width / 2 + 24, viewportBox!.y + viewportBox!.height / 2 + 12);
  await page.mouse.up();
  await expect.poll(() => canvasTransform(page)).not.toBe(beforeDrag);

  const beforeKeyboard = await canvasTransform(page);
  await map.press("ArrowRight");
  await expect.poll(() => canvasTransform(page)).not.toBe(beforeKeyboard);

  await minimap.getByRole("button", { name: "Nascondi minimappa" }).click();
  await expect(minimap).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Mostra minimappa" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Mostra minimappa" })).toBeVisible();

  await page.getByTestId("app-header-menu").click();
  await page.getByTestId("command-menu-search").fill("minimappa");
  await page.getByRole("option", { name: /Mostra o nascondi minimappa/ }).click();
  await expect(page.getByRole("complementary", { name: "Minimappa" })).toBeVisible();

  await page.locator(".canvas-panel").press("m");
  await expect(page.getByRole("button", { name: "Mostra minimappa" })).toBeVisible();
});

test("minimap defaults to collapsed below the 860px breakpoint", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 760 });
  await createDiagram(page, 0);
  await expect(page.getByRole("button", { name: "Mostra minimappa" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Minimappa" })).toHaveCount(0);
});

test("minimap projects the diagram without distortion", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await createDiagram(page);

  const map = page.getByRole("complementary", { name: "Minimappa" }).locator(".canvas-minimap__map");
  await expect(map).toBeVisible();

  // The viewBox aspect ratio must match the rendered container aspect ratio: with
  // preserveAspectRatio="none" that is what keeps the projection uniform (no stretch).
  const aspects = await map.evaluate((svg) => {
    const viewBox = (svg.getAttribute("viewBox") || "").split(/\s+/).map(Number);
    const rect = svg.getBoundingClientRect();
    return { viewBox: viewBox[2] / viewBox[3], client: rect.width / rect.height };
  });
  expect(Math.abs(aspects.viewBox - aspects.client)).toBeLessThan(0.02);
});

test("minimap highlights the selected node", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await createDiagram(page, 3);

  const minimap = page.getByRole("complementary", { name: "Minimappa" });
  await expect(minimap).toBeVisible();
  await expect(minimap.locator(".canvas-minimap__node--selected")).toHaveCount(0);

  await page.locator(".diagram-node").first().click();
  await expect(minimap.locator(".canvas-minimap__node--selected")).toHaveCount(1);
});

// G3 — the minimap and the zoom HUD must never overlap. Below 860px the minimap is
// forced collapsed (a single toggle) so it stays clear of the variably-anchored HUD.
for (const width of [1280, 860, 640]) {
  test(`zoom HUD and minimap never overlap at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 820 });
    await createDiagram(page, width > 860 ? 3 : 0);

    await expect(page.locator(".canvas-viewport-hud")).toBeVisible();
    await expect(page.locator(".canvas-minimap-layer")).toBeVisible();

    const overlap = await page.evaluate(() => {
      const rect = (selector: string) => document.querySelector(selector)?.getBoundingClientRect() ?? null;
      const hud = rect(".canvas-viewport-hud");
      const minimap = rect(".canvas-minimap-layer");
      if (!hud || !minimap) return false;
      return !(
        minimap.right <= hud.left ||
        hud.right <= minimap.left ||
        minimap.bottom <= hud.top ||
        hud.bottom <= minimap.top
      );
    });
    expect(overlap).toBe(false);
  });
}
