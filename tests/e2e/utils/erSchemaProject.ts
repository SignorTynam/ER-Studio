import { expect, type Page } from "@playwright/test";
import { confirmNewProjectDialog } from "./newProject";

/**
 * Semina un progetto con uno schema ER aperto, cioe lo stato in cui vive la
 * vera superficie di lavoro: canvas, toolbar contestuale, HUD del viewport,
 * tab di file e view switcher.
 *
 * Il seed avviene sempre a larghezza desktop — creare progetto e schema non e
 * cio che i test responsive verificano — e solo dopo si scende al viewport
 * sotto esame.
 */
export async function seedProjectWithSchema(
  page: Page,
  viewport?: { width: number; height: number },
): Promise<void> {
  // `addInitScript` rigira a ogni navigazione: senza guardia un reload
  // azzererebbe il progetto appena creato.
  await page.addInitScript(() => {
    if (window.sessionStorage.getItem("e2e-seeded") === "1") return;
    window.localStorage.clear();
    window.localStorage.setItem("chen-er-diagram-studio:locale", "en");
    // La guida onboarding ha test dedicati: qui deve stare fuori strada.
    window.localStorage.setItem("chen-er-diagram-studio:onboarding-v1:done", "1");
    window.sessionStorage.setItem("e2e-seeded", "1");
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const createProject = page.locator(".no-project-welcome-page .workspace-welcome-action-card--primary");
  await expect(createProject).toBeVisible({ timeout: 20_000 });
  await createProject.click();
  await confirmNewProjectDialog(page);

  await page.getByRole("button", { name: "Create schema", exact: true }).click();
  const nameInput = page.locator(".project-explorer-item__rename");
  await expect(nameInput).toBeVisible();
  await nameInput.fill("Schema");
  await nameInput.press("Enter");
  await expect(page.locator('[aria-label="ER toolbar"]')).toBeVisible();

  if (viewport) {
    await applyViewport(page, viewport);
  }
}

/**
 * Cambia viewport e ricarica, cosi lo stato che dipende dal breakpoint riparte
 * allineato. Il boot dell'app e ritardato di proposito sotto Playwright
 * (`VITE_APP_BOOT_DELAY_MS`), quindi serve piu del timeout di default.
 */
export async function applyViewport(page: Page, viewport: { width: number; height: number }): Promise<void> {
  await page.setViewportSize(viewport);
  await page.reload();
  await expect(page.locator('[aria-label="ER toolbar"]')).toBeVisible({ timeout: 20_000 });
}

/** Il drawer sotto soglia parte chiuso o aperto a seconda della sessione. */
export async function ensureDrawerOpen(page: Page): Promise<void> {
  if ((await page.locator(".project-activity-content").count()) === 0) {
    await page.locator(".project-activity-button").first().click();
  }
  await expect(page.locator(".project-activity-content")).toBeVisible();
}

export async function ensureDrawerClosed(page: Page): Promise<void> {
  if ((await page.locator(".project-activity-content").count()) > 0) {
    await page.locator(".project-activity-button").first().click();
  }
  await expect(page.locator(".project-activity-content")).toHaveCount(0);
}

/** Larghezza minima della striscia di scrim scoperta, in px. */
export const MIN_SCRIM_TAP_TARGET = 44;

/**
 * Chiude il drawer toccando lo scrim dove lo toccherebbe una persona: nella
 * striscia scoperta a destra del pannello.
 *
 * Non si puo cliccare il centro dello scrim — sui telefoni il drawer copre
 * gran parte della sua area e il centro cade sotto il pannello. Quella
 * striscia e l'unico bersaglio reale, quindi la sua larghezza e un requisito,
 * non un dettaglio: sotto la soglia di tocco il drawer diventa una trappola.
 */
export async function dismissDrawerByScrim(page: Page): Promise<void> {
  const scrim = page.locator(".project-activity-scrim");
  await expect(scrim).toBeVisible();

  const strip = await page.evaluate(() => {
    const scrimElement = document.querySelector<HTMLElement>(".project-activity-scrim");
    const drawer = document.querySelector<HTMLElement>(".project-activity-content");
    if (!scrimElement || !drawer) return null;

    const scrimBounds = scrimElement.getBoundingClientRect();
    const drawerBounds = drawer.getBoundingClientRect();
    return {
      left: drawerBounds.right,
      right: scrimBounds.right,
      top: scrimBounds.top,
      bottom: scrimBounds.bottom,
    };
  });

  expect(strip, "scrim o drawer assenti").not.toBeNull();

  const width = strip!.right - strip!.left;
  expect(
    width,
    `la striscia di scrim toccabile e larga ${Math.round(width)}px: sotto ${MIN_SCRIM_TAP_TARGET}px il drawer non si chiude col tocco`,
  ).toBeGreaterThanOrEqual(MIN_SCRIM_TAP_TARGET);

  await page.mouse.click(
    Math.round(strip!.left + width / 2),
    Math.round(strip!.top + (strip!.bottom - strip!.top) / 2),
  );
  await expect(page.locator(".project-activity-content")).toHaveCount(0);
}
