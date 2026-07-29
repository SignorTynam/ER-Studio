import { expect, test, type Page } from "@playwright/test";
import { confirmNewProjectDialog } from "./utils/newProject";

/**
 * Regressione di raggiungibilita, non di layout.
 *
 * Le suite responsive esistenti verificano che nulla sfondi il viewport, ma
 * misurano solo bounding box: un controllo puo stare dentro lo schermo, essere
 * visibile e non ricevere comunque nessun click perche un overlay gli sta
 * sopra. E esattamente quello che succedeva sotto i 900px, dove il drawer
 * dell'Explorer copriva l'intera toolbar del canvas e il suo scrim (uno
 * pseudo-elemento ::after) inghiottiva i click senza chiudere nulla.
 *
 * Questi test usano quindi `elementFromPoint` sul centro di ogni pulsante:
 * l'asserzione e "chi riceve davvero il click", non "dove sta il rettangolo".
 */

const TABLET_PORTRAIT = { width: 768, height: 1024 };

interface ToolbarHit {
  label: string;
  reachable: boolean;
  blockedBy: string;
}

/**
 * Il seed avviene sempre a larghezza desktop — creare progetto e schema non e
 * cio che stiamo verificando — e solo dopo si scende al viewport sotto esame,
 * con un reload che rimette in pari lo stato dipendente dal breakpoint.
 */
async function seedProjectWithSchema(page: Page, viewport: { width: number; height: number }): Promise<void> {
  // `addInitScript` rigira a ogni navigazione: senza guardia il reload che
  // segue il cambio viewport azzererebbe il progetto appena creato.
  await page.addInitScript(() => {
    if (window.sessionStorage.getItem("e2e-seeded") === "1") return;
    window.localStorage.clear();
    window.localStorage.setItem("chen-er-diagram-studio:locale", "en");
    // La guida onboarding ha un test dedicato piu sotto: qui deve stare
    // fuori strada.
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

  await page.setViewportSize(viewport);
  await page.reload();
  // Il boot dell'app e ritardato di proposito in Playwright
  // (VITE_APP_BOOT_DELAY_MS), quindi dopo un reload serve piu del timeout
  // di default.
  await expect(page.locator('[aria-label="ER toolbar"]')).toBeVisible({ timeout: 20_000 });
}

/** Il drawer sotto soglia parte chiuso se la sessione lo ricorda cosi. */
async function ensureDrawerOpen(page: Page): Promise<void> {
  if ((await page.locator(".project-activity-content").count()) === 0) {
    await page.locator(".project-activity-button").first().click();
  }
  await expect(page.locator(".project-activity-content")).toBeVisible();
}

/** Chi intercetta davvero il click al centro di ogni strumento del canvas. */
async function probeToolbar(page: Page): Promise<ToolbarHit[]> {
  return page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll<HTMLElement>('[aria-label="ER toolbar"] button'));
    return buttons.map((button) => {
      const bounds = button.getBoundingClientRect();
      const hit = document.elementFromPoint(
        Math.round(bounds.x + bounds.width / 2),
        Math.round(bounds.y + bounds.height / 2),
      );
      return {
        label: button.getAttribute("aria-label") ?? "",
        reachable: hit != null && button.contains(hit),
        blockedBy: hit instanceof HTMLElement ? hit.className : "",
      };
    });
  });
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
    `strumenti non raggiungibili dopo la chiusura del drawer: ${unreachable
      .map((hit) => `${hit.label} (coperto da ${hit.blockedBy})`)
      .join(", ")}`,
  ).toEqual([]);
});

test("Escape closes the drawer only while it is modal", async ({ page }) => {
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
