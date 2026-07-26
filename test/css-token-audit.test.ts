import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { auditCssTokens } from "../scripts/audit-css-tokens";

const PROJECT_ROOT = fileURLToPath(new URL("..", import.meta.url));

test("CSS token audit reports deterministic token and selector evidence", () => {
  const root = mkdtempSync(resolve(tmpdir(), "builder-css-audit-"));
  try {
    mkdirSync(resolve(root, "src/styles"), { recursive: true });
    writeFileSync(
      resolve(root, "src/main.tsx"),
      'const className = "live-card";\nconst node = <div style={{ "--runtime-size": "8px" }} />;\nimport "./styles/tokens.css";\nimport "./styles/surface.css";\n',
    );
    writeFileSync(
      resolve(root, "src/styles/tokens.css"),
      ":root {\n  --color-bg: #ffffff;\n  --studio-bg: var(--color-bg);\n}\n",
    );
    writeFileSync(
      resolve(root, "src/styles/surface.css"),
      [
        ".live-card {",
        "  color: rgb(1, 2, 3);",
        "  padding: 8px;",
        "  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);",
        "}",
        ".dead-card {",
        "  color: var(--missing, #fff);",
        "  width: var(--runtime-size);",
        "  margin: 8px;",
        "}",
        "",
      ].join("\n"),
    );

    const first = auditCssTokens(root);
    const second = auditCssTokens(root);

    assert.deepEqual(first, second);
    assert.equal(first.summary.colorLiterals, 4);
    assert.equal(first.summary.rawColorLiterals, 4);
    assert.equal(first.summary.colorMixConstructs, 0);
    assert.equal(first.summary.colorLiteralsOutsideTokenSource, 3);
    assert.equal(first.summary.rawColorLiteralsOutsideTokenSource, 3);
    assert.equal(first.summary.shadowDeclarations, 1);
    assert.equal(first.summary.visualLiterals.spacing, 2);
    assert.equal(first.summary.missingVariableReferences, 1);
    assert.equal(first.summary.missingVariableReferencesWithoutFallback, 0);
    assert.equal(first.summary.aliasDeclarations, 1);
    assert.equal(first.summary.aliasesWithoutConsumers, 1);
    assert.deepEqual(first.potentiallyDeadClasses.map((item) => item.name), ["dead-card"]);
    assert.deepEqual(first.cssImports.unimported, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("current CSS imports are complete and removed landing selectors stay absent", () => {
  const audit = auditCssTokens(PROJECT_ROOT);
  const removedClassFamilies = audit.potentiallyDeadClasses
    .map((item) => item.name)
    .filter(
      (name) =>
        name.startsWith("landing-") ||
        /^(?:preview-node|preview-entity|preview-relationship|preview-attribute|preview-line|preview-cardinality)$/.test(
          name,
        ),
    );

  assert.deepEqual(audit.cssImports.unimported, []);
  assert.deepEqual(removedClassFamilies, []);
  assert.ok(audit.cssImports.ordered.includes("src/styles/tokens.css"));
  assert.equal(audit.aliases.filter((alias) => alias.consumerCount === 0).length, 0);
  assert.match(
    readFileSync(resolve(PROJECT_ROOT, "src/styles/tokens.css"), "utf8"),
    /--diagram-version-layout:\s*var\(--diagram-version-modified\);/,
  );
});
