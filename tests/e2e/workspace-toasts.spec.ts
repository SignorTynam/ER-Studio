import { expect, test, type Page } from "@playwright/test";
import { confirmNewProjectDialog } from "./utils/newProject";

/**
 * Fase L — un toast con un'azione è una promessa: se scade prima che l'utente la raggiunga,
 * col mouse o con la tastiera, la promessa è rotta.
 *
 * Queste spec fissano il comportamento verificato a mano durante la fase:
 *  L1  l'auto-dismiss si ferma su hover E su focus, e riprende dal tempo residuo;
 *  L3  l'annuncio agli screen reader avviene una volta sola, dalla region giusta;
 *  L4  il countdown rispecchia la durata reale e si ferma insieme al timer;
 *  L6  l'azione del toast è raggiungibile e attivabile da tastiera.
 */

/** NOTICE_DURATION_MS.success in useWorkspaceNotices. */
const SUCCESS_TOAST_MS = 3200;
/** Margine per coprire il tempo di rendering senza rendere i test lenti. */
const SETTLE_MS = 1500;

async function seedDiagram(page: Page) {
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
  await schemaName.fill("Toast Schema");
  await schemaName.press("Enter");
  await expect(page.locator(".designer-canvas-region")).toBeVisible();

  await page.locator(".project-activity-rail").getByRole("button", { name: "Code", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Editor codice del programma" })
    .fill("entity Customer\nentity Order\nentity Product");
  await expect(page.locator(".diagram-node")).toHaveCount(3);
  await page.locator(".project-activity-rail").getByRole("button", { name: "Code", exact: true }).click();

  const skipTour = page.getByRole("button", { name: "Salta tour" });
  if (await skipTour.isVisible()) {
    await skipTour.click();
  }
}

/** Posizioni dei nodi: serve per dimostrare che l'undo del toast ha davvero agito. */
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

/** Auto-layout dal command menu: e' il percorso che produce un toast success con azione. */
async function triggerAutoLayoutToast(page: Page) {
  await page.getByTestId("app-header-menu").click();
  await expect(page.getByTestId("command-menu")).toBeVisible();
  await page.getByTestId("command-menu-search").fill("Organizza");
  await page
    .locator('[data-testid="command-menu"] [role="option"]:not(.disabled)', { hasText: "Organizza" })
    .first()
    .click();

  const dialog = page.locator('.ui-modal[role="dialog"]');
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Organizza", exact: true }).click();
  await expect(dialog).toBeHidden();
}

/** Porta il puntatore lontano dalla pila, così l'hover non tiene in pausa il timer. */
async function movePointerAway(page: Page) {
  await page.mouse.move(0, 500);
}

test("senza interazione il toast scade da solo", async ({ page }) => {
  await seedDiagram(page);
  await triggerAutoLayoutToast(page);

  const toast = page.locator(".workspace-toast").first();
  await expect(toast).toBeVisible();

  // Nessuno lo tocca: deve chiudersi da solo entro la sua durata.
  await movePointerAway(page);
  await expect(toast).toBeHidden({ timeout: SUCCESS_TOAST_MS + 3000 });
});

test("L1 — il puntatore sul toast ferma l'auto-dismiss, uscendo riprende", async ({ page }) => {
  await seedDiagram(page);
  await triggerAutoLayoutToast(page);

  const toast = page.locator(".workspace-toast").first();
  await expect(toast).toBeVisible();

  await toast.hover();
  // Ben oltre la durata: finché il puntatore è sopra, il toast non se ne va.
  await page.waitForTimeout(SUCCESS_TOAST_MS + SETTLE_MS);
  await expect(toast).toBeVisible();

  // Uscendo riparte dal residuo e scade.
  await movePointerAway(page);
  await expect(toast).toBeHidden({ timeout: SUCCESS_TOAST_MS + 3000 });
});

test("L1 + L6 — il focus ferma il timer e l'azione si attiva da tastiera", async ({ page }) => {
  await seedDiagram(page);
  const before = await nodeSnapshot(page);
  await triggerAutoLayoutToast(page);

  const toast = page.locator(".workspace-toast").first();
  const undo = toast.locator(".workspace-toast-action");
  await expect(undo).toBeVisible();

  // Il puntatore non c'entra: qui a tenere vivo il toast deve essere il focus.
  await movePointerAway(page);
  await undo.focus();
  await expect(undo).toBeFocused();

  await page.waitForTimeout(SUCCESS_TOAST_MS + SETTLE_MS);
  // Il toast è ancora lì e il focus non è andato perso: la promessa regge.
  await expect(undo).toBeFocused();

  // E l'azione si attiva da tastiera, riportando il diagramma com'era.
  await page.keyboard.press("Enter");
  await expect(toast).toBeHidden();
  await expect.poll(() => nodeSnapshot(page)).toEqual(before);
});

test("L4 — il countdown usa la durata reale e si ferma col timer", async ({ page }) => {
  await seedDiagram(page);
  await triggerAutoLayoutToast(page);

  const toast = page.locator(".workspace-toast").first();
  const countdown = toast.locator(".workspace-toast-countdown");
  await expect(countdown).toHaveCount(1);

  // La barra dura esattamente quanto il toast, non un valore inventato.
  await expect(countdown).toHaveCSS("animation-duration", `${SUCCESS_TOAST_MS / 1000}s`);
  await expect(countdown).toHaveCSS("animation-play-state", "running");

  await toast.hover();
  await expect(toast).toHaveAttribute("data-paused", "true");
  await expect(countdown).toHaveCSS("animation-play-state", "paused");
});

test("L3 — annuncio una volta sola, dalla region con l'urgenza giusta", async ({ page }) => {
  await seedDiagram(page);
  await triggerAutoLayoutToast(page);

  const toast = page.locator(".workspace-toast").first();
  await expect(toast).toBeVisible();

  // Le due region esistono sempre e sono le uniche a parlare.
  await expect(page.locator(".workspace-toast-announcer")).toHaveCount(2);

  // Niente live region annidate: né sul contenitore né sui singoli toast.
  expect(await page.locator(".workspace-toast-viewport").getAttribute("aria-live")).toBeNull();
  expect(await toast.getAttribute("role")).toBeNull();

  // Un toast success parla dalla region polite, non da quella assertiva.
  await expect(page.locator('.workspace-toast-announcer[aria-live="polite"]')).not.toBeEmpty();
  await expect(page.locator('.workspace-toast-announcer[aria-live="assertive"]')).toBeEmpty();
});
