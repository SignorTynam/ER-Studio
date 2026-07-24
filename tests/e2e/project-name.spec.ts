import { expect, test, type Page } from "@playwright/test";

async function freshApp(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem("chen-er-diagram-studio:locale", "en");
  });
  await page.goto("/");
  await expect(page.locator(".app-shell")).toBeVisible({ timeout: 20_000 });
}

test("new project asks for a name, validates empty and invalid chars, and applies it (Enter submits)", async ({ page }) => {
  await freshApp(page);
  await page.getByRole("main").getByRole("button", { name: /Create new project/i }).click();

  const dialog = page.getByRole("dialog", { name: "New project" });
  await expect(dialog).toBeVisible();

  const input = dialog.getByRole("textbox");
  await expect(input).toHaveValue("New diagram"); // default pre-compilato

  // Nome vuoto -> errore, niente progetto.
  await input.fill("");
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog).toBeVisible();

  // Caratteri non consentiti -> errore, niente progetto.
  await input.fill("Sales/ERD");
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog).toBeVisible();

  // Nome valido + Invio -> crea il progetto col nome scelto.
  await input.fill("Sales ERD");
  await input.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Sales ERD").first()).toBeVisible();
});

test("cancelling the new-project dialog creates nothing", async ({ page }) => {
  await freshApp(page);
  await page.getByRole("main").getByRole("button", { name: /Create new project/i }).click();

  const dialog = page.getByRole("dialog", { name: "New project" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  // Resta sulla welcome page: nessun progetto creato.
  await expect(page.getByRole("main").getByRole("button", { name: /Create new project/i })).toBeVisible();
});
