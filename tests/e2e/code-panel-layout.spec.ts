import { expect, test, type Page } from "@playwright/test";

async function openEditableCodePanel(page: Page) {
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
  await page
    .getByRole("complementary", { name: "Explorer" })
    .getByRole("button", { name: "Crea schema" })
    .click();

  const schemaName = page.locator(".project-explorer-item__rename");
  await schemaName.fill("Schema Code Panel");
  await schemaName.press("Enter");
  await expect(page.locator(".designer-canvas-region")).toBeVisible();

  await page
    .locator(".project-activity-rail")
    .getByRole("button", { name: "Code", exact: true })
    .click();
  await expect(page.getByRole("textbox", { name: "Editor codice del programma" })).toBeVisible();
}

const cases = [
  { name: "desktop", width: 1295, height: 861, narrowPanel: false, longDocument: false },
  { name: "pannello stretto", width: 1188, height: 861, narrowPanel: true, longDocument: true },
  { name: "viewport sotto 900px", width: 860, height: 800, narrowPanel: false, longDocument: false },
  { name: "viewport sotto 640px", width: 582, height: 800, narrowPanel: false, longDocument: false },
];

for (const currentCase of cases) {
  test(`textarea e highlight riempiono e restano allineati: ${currentCase.name}`, async ({ page }) => {
    await page.setViewportSize({ width: currentCase.width, height: currentCase.height });
    await openEditableCodePanel(page);

    if (currentCase.narrowPanel) {
      const resizer = page.getByRole("separator", { name: "Pannello workspace" });
      for (let index = 0; index < 10; index += 1) {
        await resizer.press("ArrowLeft");
      }
    }

    const editor = page.getByRole("textbox", { name: "Editor codice del programma" });
    const shortCode = "entity A {\n  ID\n}";
    const longCode = `${Array.from({ length: 80 }, (_, index) => `entity ENTITY_${index} { ATTRIBUTE_${index} }`).join("\n")}\nentity LONG_LINE { ${"ATTRIBUTE_WITH_A_LONG_NAME, ".repeat(24)} }`;
    await editor.fill(currentCase.longDocument ? longCode : shortCode);
    await expect(editor).toHaveValue(currentCase.longDocument ? longCode : shortCode);
    await editor.focus();

    const layout = await page.evaluate(() => {
      const scrollLayer = document.querySelector<HTMLElement>(".designer-code-scroll-layer");
      const highlight = document.querySelector<HTMLElement>(".designer-code-highlight");
      const input = document.querySelector<HTMLTextAreaElement>(".designer-code-input");
      const dock = document.querySelector<HTMLElement>(".diagram-code-panel.embedded");
      if (!scrollLayer || !highlight || !input || !dock) return null;
      const scrollRect = scrollLayer.getBoundingClientRect();
      const highlightRect = highlight.getBoundingClientRect();
      const inputRect = input.getBoundingClientRect();
      const inputStyle = getComputedStyle(input);
      const highlightStyle = getComputedStyle(highlight);
      return {
        scroll: { width: scrollRect.width, height: scrollRect.height },
        highlight: { width: highlightRect.width, height: highlightRect.height },
        input: { width: inputRect.width, height: inputRect.height },
        inputPosition: inputStyle.position,
        inputOverflow: inputStyle.overflow,
        highlightPosition: highlightStyle.position,
        highlightOverflow: highlightStyle.overflow,
        dockPosition: getComputedStyle(dock).position,
      };
    });

    expect(layout).not.toBeNull();
    expect(layout!.inputPosition).toBe("absolute");
    expect(layout!.highlightPosition).toBe("absolute");
    expect(layout!.inputOverflow).toBe("auto");
    expect(layout!.highlightOverflow).toBe("hidden");
    expect(layout!.dockPosition).toBe(currentCase.width < 900 ? "relative" : "static");
    expect(Math.abs(layout!.input.width - layout!.scroll.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(layout!.input.height - layout!.scroll.height)).toBeLessThanOrEqual(1);
    expect(Math.abs(layout!.highlight.width - layout!.scroll.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(layout!.highlight.height - layout!.scroll.height)).toBeLessThanOrEqual(1);

    if (currentCase.longDocument) {
      const scrollState = await page.evaluate(() => {
        const input = document.querySelector<HTMLTextAreaElement>(".designer-code-input");
        const highlight = document.querySelector<HTMLElement>(".designer-code-highlight");
        const lineNumbers = document.querySelector<HTMLElement>(".designer-code-line-numbers");
        if (!input || !highlight || !lineNumbers) return null;
        input.scrollTop = 240;
        input.scrollLeft = 180;
        input.dispatchEvent(new Event("scroll", { bubbles: true }));
        return {
          inputTop: input.scrollTop,
          inputLeft: input.scrollLeft,
          inputScrollWidth: input.scrollWidth,
          inputClientWidth: input.clientWidth,
          highlightTop: highlight.scrollTop,
          highlightLeft: highlight.scrollLeft,
          lineNumbersTop: lineNumbers.scrollTop,
        };
      });

      expect(scrollState).not.toBeNull();
      expect(scrollState!.inputTop).toBeGreaterThan(0);
      expect(scrollState!.inputLeft).toBeGreaterThan(0);
      expect(scrollState!.inputScrollWidth).toBeGreaterThan(scrollState!.inputClientWidth);
      expect(scrollState!.highlightTop).toBe(scrollState!.inputTop);
      expect(scrollState!.highlightLeft).toBe(scrollState!.inputLeft);
      expect(scrollState!.lineNumbersTop).toBe(scrollState!.inputTop);
    }
  });
}
