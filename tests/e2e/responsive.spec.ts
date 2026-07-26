import { expect, test, type Page } from "@playwright/test";
import { confirmNewProjectDialog } from "./utils/newProject";

/**
 * Fase D2: verifica responsive assertiva (niente snapshot pixel, che sarebbero
 * fragili al rendering dei font). Per ogni breakpoint controlla che il layout
 * non produca scroll orizzontale e che i controlli chiave restino usabili.
 *
 * L'app dichiara cinque breakpoint: 1180/900/680 in responsive.css e 860/640
 * nei file legacy. Le larghezze qui sotto attraversano ognuna di quelle fasce.
 */
const VIEWPORTS = [
  { name: "desktop-1280", width: 1280, height: 860 },
  { name: "laptop-1000", width: 1000, height: 800 },
  { name: "tablet-880", width: 880, height: 800 },
  { name: "narrow-860", width: 860, height: 760 },
  { name: "small-660", width: 660, height: 720 },
  { name: "mobile-640", width: 640, height: 720 },
];

async function bootWithProject(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("chen-er-diagram-studio:locale", "en");
  });
  await page.goto("/");
  await expect(page.locator(".app-shell")).toBeVisible({ timeout: 20_000 });
  const createButton = page.getByRole("button", { name: /Create new project/i });
  if (await createButton.count()) {
    await createButton.first().click();
    await confirmNewProjectDialog(page);
  }
  await expect(page.locator(".workspace-welcome-page")).toBeVisible();
}

/** Scroll orizzontale del documento: sintomo classico di layout che sfonda. */
async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
  });
}

/** Elementi che sporgono oltre il bordo destro della finestra. */
async function clippedElements(page: Page) {
  return page.evaluate(() => {
    const selectors = [
      ".app-header",
      ".bottom-status-bar",
      ".project-file-tabs",
      ".workspace-welcome-page__content",
      ".project-activity-rail",
    ];
    const offenders: string[] = [];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      // 1px di tolleranza per gli arrotondamenti del layout
      if (rect.right > window.innerWidth + 1) {
        offenders.push(`${selector} (right ${Math.round(rect.right)} > ${window.innerWidth})`);
      }
    }
    return offenders;
  });
}

for (const viewport of VIEWPORTS) {
  test(`layout holds at ${viewport.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await bootWithProject(page);

    const screenshot = await page.screenshot({ fullPage: false });
    await testInfo.attach(`welcome-${viewport.name}`, { body: screenshot, contentType: "image/png" });

    const overflow = await horizontalOverflow(page);
    expect(
      overflow.scrollWidth,
      `scroll orizzontale a ${viewport.width}px: ${overflow.scrollWidth} > ${overflow.clientWidth}`,
    ).toBeLessThanOrEqual(overflow.clientWidth + 1);

    const clipped = await clippedElements(page);
    expect(clipped, `elementi oltre il bordo a ${viewport.width}px: ${clipped.join(", ")}`).toEqual([]);

    // Il comando primario resta raggiungibile a ogni larghezza.
    await expect(page.locator(".app-command-search")).toBeVisible();
  });
}

test("explorer stays usable and collapsible at 860px", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 860, height: 760 });
  await bootWithProject(page);

  const explorer = page.locator(".project-explorer");
  await expect(explorer).toBeVisible();

  const width = await explorer.evaluate((el) => el.getBoundingClientRect().width);
  expect(width, "l'explorer non deve occupare piu' di meta' schermo").toBeLessThanOrEqual(860 * 0.6);

  const screenshot = await page.screenshot();
  await testInfo.attach("explorer-860", { body: screenshot, contentType: "image/png" });

  // Il collapse dal rail continua a funzionare.
  await page.locator(".project-activity-button").first().click();
  await expect(page.locator(".project-activity-panel--collapsed")).toBeVisible();
});

test("onboarding stays interactive above the open Explorer at 360px", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await bootWithProject(page);

  const explorer = page.locator(".project-explorer");
  const onboarding = page.getByRole("dialog", { name: "Guided onboarding" });
  const skipTour = onboarding.getByRole("button", { name: "Skip tour" });

  await expect(explorer).toBeVisible();
  await expect(onboarding).toBeVisible();
  await expect(skipTour).toBeVisible();

  const screenshot = await page.screenshot();
  await testInfo.attach("onboarding-explorer-360", { body: screenshot, contentType: "image/png" });

  await skipTour.click();
  await expect(onboarding).toBeHidden();
});
