import { expect, test, type Page } from "@playwright/test";
import { confirmNewProjectDialog } from "./utils/newProject";

/**
 * Fase K — il motore di reverse engineering sapeva gia' molto piu' di quanto mostrasse.
 * Queste spec fissano cio' che ora e' visibile:
 *  K1  il dialetto SQL e' scegliibile e arriva davvero al parser;
 *  K2  gli statement non importabili si possono elencare, con frammento e riga;
 *  K3  dalla riga si salta al punto esatto nel SQL;
 *  K4  ogni diagnostica ha titolo, categoria e spiegazione — cosi' l'utente distingue
 *      "ho scritto male io" da "il tool non sa rappresentarlo in ER".
 */

async function openReversePanel(page: Page) {
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

  await page.locator(".project-activity-rail").getByRole("button", { name: "Reverse", exact: true }).click();
  await expect(page.locator(".sql-reverse-panel")).toBeVisible();
}

/** Locator stabili: il pannello e' sotto test, non le sue etichette. */
const editor = (page: Page) => page.locator(".sql-reverse-panel textarea.designer-code-input");
const analyze = (page: Page) => page.locator(".sql-reverse-panel__footer .project-activity-action.primary");
const dialect = (page: Page) => page.locator(".sql-reverse-panel__dialect-select");
const toggleWith = (page: Page, text: RegExp) =>
  page.locator(".sql-reverse-panel__meta-toggle").filter({ hasText: text });

async function analyzeSql(page: Page, sql: string) {
  await editor(page).fill(sql);
  await analyze(page).click();
}

test("K1 — il dialetto e' selezionabile, parte da Generico e arriva al parser", async ({ page }) => {
  await openReversePanel(page);

  // I cinque dialetti del motore, con "generic" come default (comportamento invariato).
  await expect(dialect(page).locator("option")).toHaveCount(5);
  await expect(dialect(page)).toHaveValue("generic");

  // Con MySQL selezionato, uno schema con identificatori fra backtick viene letto.
  await dialect(page).selectOption("mysql");
  await expect(dialect(page)).toHaveValue("mysql");
  await analyzeSql(
    page,
    [
      "CREATE TABLE `user_account` (",
      "  `id` INT PRIMARY KEY,",
      "  `email` VARCHAR(160) NOT NULL UNIQUE",
      ");",
    ].join("\n"),
  );

  // L'analisi riesce: si passa alla preview dell'import.
  await expect(page.locator(".sql-reverse-preview-frame")).toBeVisible();
});

test("K2 — gli statement non importabili si elencano con frammento e riga", async ({ page }) => {
  await openReversePanel(page);
  await analyzeSql(
    page,
    [
      "CREATE TABLE customer (",
      "  id INTEGER PRIMARY KEY,",
      "  email VARCHAR(160) NOT NULL UNIQUE",
      ");",
      "",
      "CREATE INDEX idx_customer_email ON customer (email);",
      "",
      "INSERT INTO customer (id, email) VALUES (1, 'a@b.com');",
    ].join("\n"),
  );

  // Il conteggio non e' piu' solo un numero: e' un disclosure, chiuso di default.
  const toggle = toggleWith(page, /istruzioni non supportate/);
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");

  const items = page.locator(".sql-reverse-panel__unsupported-item");
  await expect(items).toHaveCount(2);

  // Per ciascuno: che cosa era, il frammento reale e a che riga si trova.
  await expect(items.nth(0)).toContainText("CREATE INDEX");
  await expect(items.nth(0)).toContainText("idx_customer_email");
  await expect(items.nth(0)).toContainText("riga 6");
  await expect(items.nth(1)).toContainText("INSERT");
  await expect(items.nth(1)).toContainText("riga 8");

  // E il motivo, detto in termini di conseguenza sul diagramma.
  await expect(items.nth(0)).toContainText(/indici/i);
});

test("K3 — dalla riga elencata si salta al punto esatto nel SQL", async ({ page }) => {
  await openReversePanel(page);
  await analyzeSql(
    page,
    [
      "CREATE TABLE customer (",
      "  id INTEGER PRIMARY KEY,",
      "  email VARCHAR(160) NOT NULL UNIQUE",
      ");",
      "",
      "CREATE INDEX idx_customer_email ON customer (email);",
      "",
      "INSERT INTO customer (id, email) VALUES (1, 'a@b.com');",
    ].join("\n"),
  );

  await toggleWith(page, /istruzioni non supportate/).click();

  // La riga e' un bottone: raggiungibile e attivabile anche da tastiera.
  const jump = page.getByRole("button", { name: "Vai alla riga 8" });
  await expect(jump).toBeVisible();
  await jump.click();

  // Il cursore e' finito davvero sulla riga 8 dell'INSERT.
  const cursorLine = await editor(page).evaluate((element) => {
    const area = element as HTMLTextAreaElement;
    return area.value.slice(0, area.selectionStart).split(/\r?\n/).length;
  });
  expect(cursorLine).toBe(8);
});

test("K4 — ogni diagnostica ha categoria, titolo e conseguenza sul diagramma", async ({ page }) => {
  await openReversePanel(page);
  // ENGINE=... e' SQL valido senza equivalente ER; il nome tabella duplicato e' un errore utente.
  await analyzeSql(
    page,
    [
      "CREATE TABLE author (",
      "  id INTEGER PRIMARY KEY,",
      "  name VARCHAR(120) NOT NULL",
      ") ENGINE=InnoDB;",
      "",
      "CREATE TABLE author (",
      "  id INTEGER PRIMARY KEY,",
      "  nickname VARCHAR(60)",
      ");",
    ].join("\n"),
  );

  const toggle = toggleWith(page, /diagnostiche/);
  await expect(toggle).toBeVisible();
  await toggle.click();

  const issues = page.locator(".sql-reverse-panel__issue-item");
  await expect(issues.first()).toBeVisible();

  // La distinzione chiave della fase, visibile a colpo d'occhio.
  await expect(page.locator(".sql-reverse-panel__issues")).toContainText("Nessun equivalente ER");
  await expect(page.locator(".sql-reverse-panel__issues")).toContainText("SQL da correggere");

  // Titolo comprensibile al posto del codice grezzo...
  await expect(page.locator(".sql-reverse-panel__issues")).toContainText("Opzione di tabella ignorata");
  await expect(page.locator(".sql-reverse-panel__issues")).toContainText("Nome tabella duplicato");

  // ...e spiegazione che dice cosa comporta per il diagramma, non solo cosa non e' stato letto.
  await expect(page.locator(".sql-reverse-panel__issues")).toContainText(/l'entita' viene creata comunque|l'entità viene creata comunque/);
  await expect(page.locator(".sql-reverse-panel__issues")).toContainText(/una sola entit/i);

  // Nessun codice grezzo del motore a schermo.
  await expect(page.locator(".sql-reverse-panel__issues")).not.toContainText("UNSUPPORTED_TABLE_OPTION");
  await expect(page.locator(".sql-reverse-panel__issues")).not.toContainText("DUPLICATE_TABLE_NAME");
});
