import { expect, test, type Page } from "@playwright/test";
import { confirmNewProjectDialog } from "./utils/newProject";
import { ensureDrawerOpen, seedProjectWithSchema } from "./utils/erSchemaProject";
import { describeProbe, probeControls, type ControlProbe } from "./utils/reachability";

/**
 * Regressioni del drawer modale e del dock onboarding.
 *
 * La copertura responsive generale vive in `responsive.spec.ts`; qui restano i
 * due difetti specifici di stacking: lo scrim che inghiottiva i click senza
 * chiudere nulla, e il dock onboarding stirato a tutta colonna.
 */

const TABLET_PORTRAIT = { width: 768, height: 1024 };

/** Chi intercetta davvero il click al centro di ogni strumento del canvas. */
async function probeToolbar(page: Page): Promise<ControlProbe[]> {
  return probeControls(page, [{ name: "ER toolbar", selector: '[aria-label="ER toolbar"] button' }]);
}

test("the modal drawer scrim gives the canvas tools back in one tap", async ({ page }) => {
  await seedProjectWithSchema(page, TABLET_PORTRAIT);
  await ensureDrawerOpen(page);

  const scrim = page.locator(".project-activity-scrim");
  const drawer = page.locator(".project-activity-content");
  await expect(scrim).toBeVisible();

  // Con il drawer aperto lo scrim copre la toolbar: e coerente con un drawer
  // modale, purche sia lo scrim a coprirla e non un pannello muto.
  const covered = await probeToolbar(page);
  expect(covered.length).toBeGreaterThan(0);
  expect(covered.some((hit) => hit.reachable)).toBe(false);

  await scrim.click();

  await expect(drawer).toHaveCount(0);
  await expect(scrim).toHaveCount(0);

  const reachable = await probeToolbar(page);
  const unreachable = reachable.filter((hit) => !hit.reachable);
  expect(
    unreachable,
    `strumenti non raggiungibili dopo la chiusura del drawer: ${unreachable.map(describeProbe).join(", ")}`,
  ).toEqual([]);
});

test("Escape closes the drawer only while it is modal", async ({ page }) => {
  // Attraversa la soglia con due reload, e ogni boot e ritardato di proposito
  // sotto Playwright: col timeout di default non ci sta sotto carico.
  test.slow();
  await seedProjectWithSchema(page, TABLET_PORTRAIT);
  await ensureDrawerOpen(page);

  await expect(page.locator(".project-activity-scrim")).toBeVisible();

  // Un solo Esc deve bastare. Con un handler che invertiva lo stato catturato
  // al momento della sottoscrizione, il primo Esc riapriva il drawer gia
  // aperto e ne serviva un secondo.
  await page.keyboard.press("Escape");
  await expect(page.locator(".project-activity-content")).toHaveCount(0);

  // Sopra la soglia il pannello e una colonna fissa, non un overlay: Esc non
  // deve piu chiuderlo, altrimenti diventa un tasto distruttivo sul desktop.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();
  await expect(page.locator('[aria-label="ER toolbar"]')).toBeVisible({ timeout: 20_000 });
  await ensureDrawerOpen(page);
  await expect(page.locator(".project-activity-scrim")).toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(page.locator(".project-activity-content")).toBeVisible();
});

test("the onboarding dock never blocks the canvas beneath its card", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem("chen-er-diagram-studio:locale", "en");
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const createProject = page.locator(".no-project-welcome-page .workspace-welcome-action-card--primary");
  await expect(createProject).toBeVisible({ timeout: 20_000 });
  await createProject.click();
  await confirmNewProjectDialog(page);

  const dock = page.locator(".workspace-onboarding-dock");
  await expect(dock).toBeVisible();

  const geometry = await page.evaluate(() => {
    const dockElement = document.querySelector<HTMLElement>(".workspace-onboarding-dock");
    const card = document.querySelector<HTMLElement>(".onboarding-guide");
    if (!dockElement || !card) return null;

    const dockBounds = dockElement.getBoundingClientRect();
    const cardBounds = card.getBoundingClientRect();
    return {
      dockHeight: Math.round(dockBounds.height),
      cardHeight: Math.round(cardBounds.height),
      dockWidth: Math.round(dockBounds.width),
      pointerEvents: window.getComputedStyle(dockElement).pointerEvents,
    };
  });

  expect(geometry).not.toBeNull();
  // Il dock deve vestire la card, non la colonna: se e piu alto, la parte
  // eccedente e una fascia invisibile che mangia i click sul canvas.
  expect(geometry!.dockHeight).toBe(geometry!.cardHeight);
  expect(geometry!.pointerEvents).toBe("none");
  // Allargarlo lo porta sopra il drawer Explorer sui viewport stretti.
  expect(geometry!.dockWidth).toBeLessThanOrEqual(360);
});
