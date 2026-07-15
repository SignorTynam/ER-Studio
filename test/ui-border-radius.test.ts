import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";
import test from "node:test";

const PROJECT_ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC_ROOT = join(PROJECT_ROOT, "src");

function listFiles(root: string, predicate: (filePath: string) => boolean): string[] {
  const entries = readdirSync(root);
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = join(root, entry);
    const stats = statSync(entryPath);
    if (stats.isDirectory()) {
      files.push(...listFiles(entryPath, predicate));
    } else if (predicate(entryPath)) {
      files.push(entryPath);
    }
  }

  return files;
}

const cssFiles = listFiles(SRC_ROOT, (filePath) => filePath.endsWith(".css"));
const tsxFiles = listFiles(SRC_ROOT, (filePath) => filePath.endsWith(".tsx"));
const approvedRoundedIconSelectors = [
  ".designer-topbar-actions .designer-icon-button",
  ".studio-modal__close",
  ".help-close",
  ".notes-modal-close",
  ".entity-key-modal-close",
  ".command-palette-close",
  ".shortcuts-sheet-close",
  ".command-palette-title-icon",
  ".command-palette-item-icon",
  ".errors-modal-heading-icon",
  ".errors-modal-item-icon",
  ".errors-modal-diagnostics-icon",
  ".versioning-status-icon",
  ".versioning-restore-icon",
];

function readProjectFile(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

function displayPath(filePath: string): string {
  return relative(PROJECT_ROOT, filePath).replace(/\\/g, "/");
}

test("workspace radius tokens use the compact design-system scale", () => {
  const tokens = readProjectFile(join(SRC_ROOT, "styles", "tokens.css"));

  assert.match(tokens, /--radius-control:\s*4px;/);
  assert.match(tokens, /--radius-panel:\s*6px;/);
  assert.match(tokens, /--radius-dialog:\s*10px;/);
});

function isApprovedRoundedIconSelector(selectorText: string): boolean {
  const selectors = selectorText
    .split(",")
    .map((selector) => selector.trim())
    .filter(Boolean);
  return selectors.every((selector) => approvedRoundedIconSelectors.includes(selector));
}

test("new workspace surfaces avoid oversized decorative radii", () => {
  const workspaceStyleFiles = cssFiles.filter((filePath) =>
    /[\\/]styles[\\/](tokens|foundations|workspace-shell|activity-rail|editor-tabs|context-menu|panels-workspace|responsive)\.css$/.test(filePath),
  );
  const oversizedDeclarations: string[] = [];

  for (const filePath of workspaceStyleFiles) {
    const content = readProjectFile(filePath);
    for (const match of content.matchAll(/border-radius\s*:\s*([^;]+);/g)) {
      const value = match[1].trim();
      if (value.includes("var(--radius-") || value.startsWith("50%")) continue;
      const pixelValues = Array.from(value.matchAll(/([0-9.]+)px/g), (item) => Number(item[1]));
      if (pixelValues.some((radius) => radius > 10)) {
        oversizedDeclarations.push(`${displayPath(filePath)}: ${value}`);
      }
    }
  }

  assert.deepEqual(oversizedDeclarations, []);
});

test("approved rounded icon exceptions stay explicit", () => {
  const indexCss = readProjectFile(join(SRC_ROOT, "index.css"));

  assert.match(
    indexCss,
    /\.designer-topbar-actions \.designer-icon-button,[\s\S]*\.shortcuts-sheet-close\s*\{\s*border-radius:\s*999px !important;\s*\}/,
  );
  assert.match(
    indexCss,
    /\.command-palette-title-icon,[\s\S]*\.versioning-restore-icon\s*\{\s*border-radius:\s*10px !important;\s*\}/,
  );
});

test("tsx files do not use inline borderRadius", () => {
  const offenders: string[] = [];

  for (const filePath of tsxFiles) {
    const content = readProjectFile(filePath);
    if (/borderRadius|["']border-radius["']/.test(content)) {
      offenders.push(displayPath(filePath));
    }
  }

  assert.deepEqual(offenders, []);
});
