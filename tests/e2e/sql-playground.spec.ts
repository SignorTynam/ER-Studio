import AxeBuilder from "@axe-core/playwright";
import { Buffer } from "node:buffer";
import { expect, test, type Page } from "@playwright/test";
import type { DiagramDocument, DiagramEdge, DiagramNode } from "../../src/types/diagram";
import { createEmptyProjectVersioningState, parseProjectFile, serializeProjectFile } from "../../src/utils/projectFile";
import { createEmptySchemaDocument, createProjectFromSchema } from "../../src/utils/projectExplorer";
import { createEmptyErTranslationWorkspace } from "../../src/utils/erTranslation";
import {
  applyLogicalTranslationChoice,
  buildLogicalTranslationOverview,
  createEmptyLogicalWorkspace,
  getLogicalTranslationChoicesForItem,
} from "../../src/utils/logicalTranslation";
import { parseDiagram, serializeDiagram } from "../../src/utils/diagram";

const VIEWPORT = { x: 180, y: 110, zoom: 1 };

function createPlaygroundProject(): string {
  const student: Extract<DiagramNode, { type: "entity" }> = {
    id: "entity-student", type: "entity", label: "STUDENT", x: 100, y: 100, width: 160, height: 80,
    internalIdentifiers: [{ id: "student-pk", attributeIds: ["student-id"] }],
    relationshipParticipations: [{ id: "student-enrollment", relationshipId: "relationship-enrollment", cardinality: "(0,N)" }],
  };
  const course: Extract<DiagramNode, { type: "entity" }> = {
    id: "entity-course", type: "entity", label: "COURSE", x: 500, y: 100, width: 160, height: 80,
    internalIdentifiers: [{ id: "course-pk", attributeIds: ["course-id"] }],
    relationshipParticipations: [{ id: "course-enrollment", relationshipId: "relationship-enrollment", cardinality: "(0,N)" }],
  };
  const attributes: Array<Extract<DiagramNode, { type: "attribute" }>> = [
    { id: "student-id", type: "attribute", label: "id", x: 40, y: 20, width: 100, height: 40, isIdentifier: true },
    { id: "student-name", type: "attribute", label: "name", x: 40, y: 210, width: 100, height: 40 },
    { id: "course-id", type: "attribute", label: "id", x: 620, y: 20, width: 100, height: 40, isIdentifier: true },
    { id: "course-title", type: "attribute", label: "title", x: 620, y: 210, width: 100, height: 40 },
  ];
  const relationship: Extract<DiagramNode, { type: "relationship" }> = {
    id: "relationship-enrollment", type: "relationship", label: "ENROLLMENT", x: 320, y: 110, width: 140, height: 70,
  };
  const edges: DiagramEdge[] = [
    { id: "student-id-edge", type: "attribute", sourceId: "student-id", targetId: student.id, label: "", lineStyle: "solid" },
    { id: "student-name-edge", type: "attribute", sourceId: "student-name", targetId: student.id, label: "", lineStyle: "solid" },
    { id: "course-id-edge", type: "attribute", sourceId: "course-id", targetId: course.id, label: "", lineStyle: "solid" },
    { id: "course-title-edge", type: "attribute", sourceId: "course-title", targetId: course.id, label: "", lineStyle: "solid" },
    { id: "student-enrollment-edge", type: "connector", sourceId: student.id, targetId: relationship.id, label: "", lineStyle: "solid", participationId: "student-enrollment" },
    { id: "course-enrollment-edge", type: "connector", sourceId: course.id, targetId: relationship.id, label: "", lineStyle: "solid", participationId: "course-enrollment" },
  ];
  const rawDiagram: DiagramDocument = {
    meta: { name: "university", version: 3 }, notes: "", nodes: [student, course, relationship, ...attributes], edges,
  };
  const diagram = parseDiagram(serializeDiagram(rawDiagram));
  const translationWorkspace = createEmptyErTranslationWorkspace(diagram);
  const translatedDiagram = translationWorkspace.translatedDiagram;
  let logicalWorkspace = createEmptyLogicalWorkspace(translatedDiagram);
  const stepOrder = ["entities", "weak-entities", "relationships", "multivalued-attributes", "generalizations"] as const;
  for (let guard = 0; guard < 40; guard += 1) {
    const overview = buildLogicalTranslationOverview(translatedDiagram, logicalWorkspace);
    const item = stepOrder.flatMap((step) => overview.itemsByStep[step]).find((candidate) => candidate.status === "pending");
    if (!item) break;
    const choices = getLogicalTranslationChoicesForItem(overview, item);
    const choice = choices.find((candidate) => candidate.recommended) ?? choices[0];
    if (!choice) throw new Error(`No logical choice for ${item.label}.`);
    logicalWorkspace = applyLogicalTranslationChoice(translatedDiagram, logicalWorkspace, choice, item.targetType, item.id);
  }
  if (logicalWorkspace.model.tables.length === 0) throw new Error("In-memory logical fixture generation failed.");
  const schema = createEmptySchemaDocument("university.erschema");
  schema.diagram = diagram;
  schema.translationWorkspace = translationWorkspace;
  schema.logicalWorkspace = logicalWorkspace;
  schema.logicalGenerated = true;
  schema.logicalStage = "schema";
  schema.view = { ...schema.view, current: "logical", logicalViewport: VIEWPORT };
  const explorer = createProjectFromSchema("Playground project", schema);
  const activeFile = explorer.files[explorer.project.activeFileId ?? ""];
  if (!activeFile || activeFile.kind !== "schema") throw new Error("Missing generated schema fixture.");
  const serialized = serializeProjectFile({
    diagram: activeFile.schema.diagram,
    translationWorkspace: activeFile.schema.translationWorkspace,
    logicalWorkspace: activeFile.schema.logicalWorkspace,
    logicalGenerated: true,
    logicalStage: "schema",
    diagramView: "logical",
    viewport: VIEWPORT,
    translationViewport: VIEWPORT,
    logicalViewport: VIEWPORT,
    workspace: activeFile.schema.workspace,
    versioning: createEmptyProjectVersioningState(),
    project: explorer.project,
    files: explorer.files,
    explorerView: explorer.view,
  });
  const parsed = parseProjectFile(serialized);
  if (!parsed.state.logicalGenerated || parsed.state.logicalWorkspace.model.tables.length === 0) {
    throw new Error("Serialized logical fixture generation failed.");
  }
  return serialized;
}

async function bootProject(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem("chen-er-diagram-studio:locale", "it");
  });
  await page.goto("/");
  await expect(page.locator(".app-shell")).toBeVisible();
  await page.locator('input[type="file"][accept*=".ersp"]').setInputFiles({
    name: "sql-playground.ersp",
    mimeType: "application/json",
    buffer: Buffer.from(createPlaygroundProject()),
  });
  await expect(page.locator(".project-file-tab.active")).toContainText("university.erschema");
}

async function openPlaygroundFromPalette(page: Page): Promise<void> {
  await page.keyboard.press("Control+KeyK");
  const search = page.getByTestId("command-menu-search");
  await search.fill("apri sql playground");
  await expect(page.getByRole("option", { name: /Apri SQL Playground/ })).toBeVisible();
  await search.press("Enter");
  await expect(page.locator(".sql-playground-workspace")).toBeVisible();
}

test("runs real SQLite WASM, reports results and constraints, exports, and reopens the session", async ({ page }) => {
  test.setTimeout(60_000);
  await bootProject(page);
  await openPlaygroundFromPalette(page);

  await expect(page.getByText("Database non creato", { exact: true })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Crea database", exact: true }).click();
  await expect(page.getByText("Database pronto", { exact: true })).toBeVisible({ timeout: 20_000 });

  const editor = page.getByRole("textbox", { name: "Editor query SQL" });
  await expect(editor).toContainText("sqlite_master");
  await editor.press("Control+Enter");
  await expect(page.getByRole("cell", { name: "STUDENT", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "COURSE", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "ENROLLMENT", exact: true })).toBeVisible();

  await editor.fill(`INSERT INTO "STUDENT" ("id", "name") VALUES (1, 'Ada');
INSERT INTO "COURSE" ("id", "title") VALUES (10, 'Databases');
INSERT INTO "ENROLLMENT" ("student_id", "course_id") VALUES (1, 10);`);
  await editor.press("Control+Enter");
  await expect(page.getByText("3 istruzioni eseguite", { exact: true })).toBeVisible();
  await expect(page.getByText("Righe modificate", { exact: true })).toHaveCount(3);

  await editor.fill(`SELECT s.name, c.title
FROM "ENROLLMENT" e
JOIN "STUDENT" s ON s.id = e.student_id
JOIN "COURSE" c ON c.id = e.course_id;`);
  await editor.press("Control+Enter");
  await expect(page.getByRole("cell", { name: "Ada", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Databases", exact: true })).toBeVisible();

  await editor.fill(`INSERT INTO "STUDENT" ("id", "name") VALUES (1, 'Duplicate');`);
  await editor.press("Control+Enter");
  await expect(page.getByText(/UNIQUE constraint failed: STUDENT.id/i)).toBeVisible();

  await editor.fill(`INSERT INTO "ENROLLMENT" ("student_id", "course_id") VALUES (99, 10);`);
  await editor.press("Control+Enter");
  await expect(page.getByText(/FOREIGN KEY constraint failed/i)).toBeVisible();

  await page.getByRole("button", { name: /^university\.erschema/ }).click();
  const nameColumn = page.locator(".logical-column-row").filter({ hasText: /^name/ });
  await expect(nameColumn).toBeVisible();
  await nameColumn.click();
  await page.getByRole("toolbar", { name: "Strumenti schema logico" }).getByRole("button", { name: "Tipo" }).click();
  await page.locator(".designer-schema-type-shortcuts button", { hasText: "TEXT" }).click();
  await expect(nameColumn).toContainText("TEXT");
  await page.getByRole("button", { name: /^Playground · university\.erschema/ }).click();
  await expect(page.locator(".ui-badge", { hasText: "Database da aggiornare" })).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Ricrea database", exact: true }).click();
  const resetDialog = page.getByRole("dialog", { name: "Ricreare il database?" });
  await expect(resetDialog).toBeVisible();
  await resetDialog.getByRole("button", { name: "Ricrea database", exact: true }).click();
  await expect(page.getByText("Database pronto", { exact: true })).toBeVisible({ timeout: 20_000 });
  await editor.fill(`SELECT COUNT(*) AS total FROM "STUDENT";`);
  await editor.press("Control+Enter");
  await expect(page.getByRole("cell", { name: "0", exact: true })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Scarica database", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("university.sqlite");

  const playgroundTab = page.locator(".project-file-tab.active");
  await expect(playgroundTab).toContainText("Playground · university.erschema");
  await page.getByRole("button", { name: /^Chiudi tab Playground/ }).click();
  await expect(page.locator(".sql-playground-workspace")).toHaveCount(0);
  await openPlaygroundFromPalette(page);
  await expect(editor).toHaveValue(/SELECT COUNT\(\*\) AS total/);
  await expect(page.getByText("Database pronto", { exact: true })).toBeVisible();
});

test("command bar, shared editor, resizable results and SQL Explorer stay integrated", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await bootProject(page);
  await openPlaygroundFromPalette(page);

  const commandBar = page.locator(".sql-playground-command-bar");
  await expect(commandBar).toHaveCount(1);
  await expect(page.locator(".sql-playground-toolbar")).toHaveCount(0);
  const alignedControls = await commandBar.locator("h1, button").evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    return box.top + box.height / 2;
  }));
  expect(Math.max(...alignedControls) - Math.min(...alignedControls)).toBeLessThan(8);
  await expect(page.locator(".designer-code-line-numbers")).toBeVisible();
  await expect(page.locator(".sql-token-keyword").first()).toBeVisible();

  await page.getByRole("button", { name: "Crea database", exact: true }).click();
  await expect(page.getByText("Database pronto", { exact: true })).toBeVisible({ timeout: 20_000 });
  const editor = page.getByRole("textbox", { name: "Editor query SQL" });
  await editor.fill(`INSERT INTO "STUDENT" ("id", "name") VALUES (1, 'Ada');
INSERT INTO "STUDENT" ("id", "name") VALUES (2, 'Luca');
INSERT INTO "STUDENT" ("id", "name") VALUES (3, 'Mira');`);
  await page.getByRole("button", { name: "Esegui", exact: true }).click();
  await editor.fill(`SELECT id, name FROM "STUDENT" ORDER BY id;`);
  await editor.press("Control+Enter");
  await expect(page.getByRole("rowheader")).toHaveText(["1", "2", "3"]);

  const splitter = page.getByRole("separator", { name: "Ridimensiona pannello risultati" });
  const editorRegion = page.locator(".sql-playground-editor");
  const resultsPanel = page.locator(".sql-playground-results");
  const splitterBox = await splitter.boundingBox();
  const editorBefore = await editorRegion.boundingBox();
  const resultsBefore = await resultsPanel.boundingBox();
  expect(splitterBox && editorBefore && resultsBefore).toBeTruthy();
  await page.mouse.move(splitterBox!.x + splitterBox!.width / 2, splitterBox!.y + splitterBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(splitterBox!.x + splitterBox!.width / 2, splitterBox!.y - 72);
  await page.mouse.up();
  const editorAfterDrag = await editorRegion.boundingBox();
  const resultsAfterDrag = await resultsPanel.boundingBox();
  expect(resultsAfterDrag!.height).toBeGreaterThan(resultsBefore!.height + 40);
  expect(editorAfterDrag!.height).toBeLessThan(editorBefore!.height - 40);
  await splitter.focus();
  const beforeKeyboard = (await resultsPanel.boundingBox())!.height;
  await splitter.press("ArrowDown");
  expect((await resultsPanel.boundingBox())!.height).toBeLessThan(beforeKeyboard);

  const expandedHeight = (await editorRegion.boundingBox())!.height;
  await page.getByRole("button", { name: "Nascondi risultati" }).click();
  await expect(resultsPanel).toHaveClass(/is-collapsed/);
  expect((await editorRegion.boundingBox())!.height).toBeGreaterThan(expandedHeight);
  await page.getByRole("button", { name: "Mostra risultati" }).click();
  await expect(resultsPanel).not.toHaveClass(/is-collapsed/);

  const railButtons = page.locator(".project-activity-rail > .ui-tooltip-anchor > .project-activity-button");
  const labels = await railButtons.evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label")));
  expect(labels.indexOf("SQL Explorer")).toBe(labels.indexOf("Export") - 1);
  await page.getByRole("button", { name: "SQL Explorer", exact: true }).click();
  const explorer = page.locator(".sql-explorer-panel");
  await expect(explorer).toBeVisible();
  await expect(explorer.getByRole("treeitem", { name: /^main/ })).toBeVisible();
  await explorer.getByRole("treeitem", { name: /^Tabelle \(3\)/ }).click();
  await expect(explorer.getByRole("treeitem", { name: /^STUDENT/ })).toBeVisible();
  await explorer.getByRole("treeitem", { name: /^STUDENT/ }).click();
  await explorer.getByRole("treeitem", { name: /^Colonne \(2\)/ }).click();
  await expect(explorer.getByRole("treeitem", { name: /^id INTEGER.*Chiave primaria/ })).toBeVisible();
  await explorer.getByRole("treeitem", { name: /^ENROLLMENT/ }).click();
  await explorer.getByRole("treeitem", { name: /^Chiavi esterne \(2\)/ }).click();
  await expect(explorer.getByRole("treeitem", { name: /→ STUDENT\.id/ })).toBeVisible();

  await editor.fill("CREATE TABLE TEST_TABLE (id INTEGER PRIMARY KEY, value TEXT NOT NULL);");
  await editor.press("Control+Enter");
  await expect(explorer.getByRole("treeitem", { name: /^Tabelle \(4\)/ })).toBeVisible();
  await expect(explorer.getByRole("treeitem", { name: /^TEST_TABLE/ })).toBeVisible();
  await editor.fill("DROP TABLE TEST_TABLE;");
  await editor.press("Control+Enter");
  await expect(explorer.getByRole("treeitem", { name: /^Tabelle \(3\)/ })).toBeVisible();
  await expect(explorer.getByRole("treeitem", { name: /^TEST_TABLE/ })).toHaveCount(0);
  await explorer.locator(".workspace-panel__close").click();
  await expect(page.locator(".sql-playground-workspace")).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .include(".sql-playground-workspace")
    .include(".project-activity-panel")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
});

test("remains contained across supported viewports and passes the existing WCAG A/AA scan", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await bootProject(page);
  await openPlaygroundFromPalette(page);
  await page.getByRole("button", { name: "Crea database", exact: true }).click();
  await expect(page.getByText("Database pronto", { exact: true })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "SQL Explorer", exact: true }).click();
  const workspace = page.locator(".sql-playground-workspace");
  const explorer = page.locator(".sql-explorer-panel");
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1180, height: 760 },
    { width: 900, height: 760 },
    { width: 720, height: 760 },
    { width: 582, height: 760 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(workspace).toBeVisible();
    await expect(explorer).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await workspace.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    expect(await explorer.locator(".sql-explorer-panel__body").evaluate((element) => getComputedStyle(element).overflowX)).toBe("auto");
  }
  const results = await new AxeBuilder({ page })
    .include(".sql-playground-workspace")
    .include(".sql-explorer-panel")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
