import { expect, test, type Page } from "@playwright/test";

async function freshApp(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem("chen-er-diagram-studio:locale", "en");
  });
  await page.goto("/");
  await expect(page.locator(".app-shell")).toBeVisible({ timeout: 20_000 });
}

async function createProject(page: Page, name: string) {
  await page.getByRole("main").getByRole("button", { name: /Create new project/i }).click();
  const dialog = page.getByRole("dialog", { name: "New project" });
  await dialog.getByRole("textbox").fill(name);
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(dialog).toBeHidden();
}

async function createViaInline(page: Page, value: string) {
  const input = page.getByRole("textbox", { name: "Name" });
  await expect(input).toBeVisible();
  await input.fill(value);
  await input.press("Enter");
  await expect(input).toBeHidden();
}

test("keyboard-accessible 'Move to…' reparents a file into a folder and announces it", async ({ page }) => {
  await freshApp(page);
  await createProject(page, "Move QA");

  // Seed: uno schema in root + una cartella in root.
  await page.getByRole("button", { name: "Create schema" }).click();
  await createViaInline(page, "Report");
  await page.getByRole("button", { name: "New folder" }).click();
  await createViaInline(page, "Docs");

  const reportRow = page.getByRole("treeitem", { name: /Report/ });
  await expect(reportRow).toHaveAttribute("data-depth", "0");
  // J2.b: il drag & drop è attivo, quindi la riga è trascinabile.
  await expect(reportRow).toHaveAttribute("draggable", "true");

  // J2.c: il menu contestuale è raggiungibile da tastiera (Shift+F10), senza mouse.
  await reportRow.focus();
  await page.keyboard.press("Shift+F10");
  await page.getByRole("menuitem", { name: "Move to…" }).click();

  // Dialog "Sposta in…": unica destinazione valida = Docs (la root, parent attuale, è esclusa).
  const dialog = page.getByTestId("move-to-dialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("select").selectOption({ index: 0 });
  await dialog.getByRole("button", { name: "Move" }).click();
  await expect(dialog).toBeHidden();

  // Report è ora dentro Docs (profondità 1) e l'esito è annunciato nella status bar (aria-live).
  await expect(page.getByRole("treeitem", { name: /Report/ })).toHaveAttribute("data-depth", "1");
  await expect(page.getByText(/Moved .*Report.* to .*Docs/)).toBeVisible();
});

test("the 'Move to…' dialog never offers an invalid destination (self and current parent excluded)", async ({ page }) => {
  await freshApp(page);
  await createProject(page, "Guard QA");

  // Un'unica cartella in root: nessuna destinazione valida (né sé stessa né la root che la contiene).
  await page.getByRole("button", { name: "New folder" }).click();
  await createViaInline(page, "Solo");

  await page.getByRole("treeitem", { name: /Solo/ }).click({ button: "right" });
  await page.getByRole("menuitem", { name: "Move to…" }).click();

  const dialog = page.getByTestId("move-to-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("No valid destination folder.")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Move" })).toBeDisabled();
});
