import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { confirmNewProjectDialog } from "./utils/newProject";

/**
 * Fase D1: scansione WCAG 2.1 A/AA automatica sulle superfici raggiungibili.
 * axe copre ~30% dei criteri in modo oggettivo; tastiera e focus sono
 * verificati a parte in keyboard.spec.ts.
 */

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function scan(page: Page, include?: string) {
  const builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  if (include) {
    builder.include(include);
  }
  return builder.analyze();
}

function formatViolations(results: Awaited<ReturnType<typeof scan>>): string {
  return results.violations
    .map((violation) => {
      const nodes = violation.nodes
        .slice(0, 4)
        .map((node) => `  -> ${node.target.join(" ")}\n     ${node.failureSummary?.replace(/\n/g, "\n     ")}`);
      return `[${violation.impact}] ${violation.id}: ${violation.help}\n${nodes.join("\n")}`;
    })
    .join("\n");
}

async function bootStudio(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("chen-er-diagram-studio:locale", "en");
  });
  await page.goto("/");
  await expect(page.locator(".app-shell")).toBeVisible({ timeout: 20_000 });
}

async function createProject(page: Page) {
  const createButton = page.getByRole("button", { name: /Create new project/i });
  if (await createButton.count()) {
    await createButton.first().click();
    await confirmNewProjectDialog(page);
  }
  await expect(page.locator(".project-explorer")).toBeVisible();
}

test("no-project welcome has no WCAG violations", async ({ page }) => {
  await bootStudio(page);
  const results = await scan(page);
  expect(formatViolations(results), formatViolations(results)).toBe("");
});

test("workspace chrome, explorer and welcome have no WCAG violations", async ({ page }) => {
  await bootStudio(page);
  await createProject(page);
  const results = await scan(page);
  expect(formatViolations(results), formatViolations(results)).toBe("");
});

test("shared modal shell has no WCAG violations", async ({ page }) => {
  await bootStudio(page);
  await createProject(page);

  await page.getByRole("button", { name: "About", exact: true }).click();
  await page.getByRole("menuitem", { name: /What's New/i }).click();
  await expect(page.locator(".ui-modal")).toBeVisible();

  const results = await scan(page, ".ui-modal-backdrop");
  expect(formatViolations(results), formatViolations(results)).toBe("");
});

test("command palette has no WCAG violations", async ({ page }) => {
  await bootStudio(page);
  await createProject(page);

  await page.getByTestId("app-header-menu").click();
  await expect(page.getByTestId("command-menu")).toBeVisible();

  const results = await scan(page, '[data-testid="command-menu"]');
  expect(formatViolations(results), formatViolations(results)).toBe("");
});
