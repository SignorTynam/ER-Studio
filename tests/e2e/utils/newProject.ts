import { expect, type Page } from "@playwright/test";

/**
 * Fase J1 — creare un progetto passa ora da un dialog che ne chiede il nome, quindi dopo il
 * click su "Crea nuovo progetto" l'Explorer non è ancora raggiungibile finché non si conferma.
 *
 * Il campo arriva precompilato con un default valido e già selezionato: per i seed dei test
 * basta confermare. Volutamente senza selettori localizzati (niente "Crea"/"Create"), così
 * l'helper funziona identico in en/it/sq.
 */
export async function confirmNewProjectDialog(page: Page): Promise<void> {
  // Attenzione: NON usare getByRole("dialog"), perché la guida di onboarding è anch'essa
  // role="dialog" (con aria-modal="false") e compare subito dopo la creazione del progetto.
  // Puntiamo alla shell modale condivisa (ui/Modal), che è l'unica aria-modal="true" qui.
  const dialog = page.locator('.ui-modal[role="dialog"]');
  await expect(dialog).toBeVisible();
  await dialog.getByRole("textbox").press("Enter");
  await expect(dialog).toBeHidden();
}
