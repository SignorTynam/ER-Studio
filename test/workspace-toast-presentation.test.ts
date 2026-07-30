import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/**
 * Presentazione dei toast.
 *
 * Il riquadro era nato flex ed e stato convertito a grid, ma le proprieta di
 * allineamento dell'era flex erano rimaste in un blocco precedente. Su una
 * griglia a colonna implicita `justify-content: space-between` fa collassare
 * la traccia sul contenuto: testata, corpo e countdown restavano schiacciati
 * in ~205px dentro un toast largo 372, con un terzo del riquadro vuoto e il
 * testo mandato a capo senza motivo.
 */

const INDEX_CSS = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
const TOAST_COMPONENT = readFileSync(
  new URL("../src/components/WorkspaceToastStack.tsx", import.meta.url),
  "utf8",
);

/** Corpo della regola CSS che parte dal selettore dato. */
function ruleBody(css: string, selector: string): string | null {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) return null;
  const end = css.indexOf("}", start);
  return end === -1 ? null : css.slice(start, end);
}

test("the toast grid fills its track instead of collapsing on the content", () => {
  const rule = ruleBody(INDEX_CSS, ".workspace-toast-viewport .workspace-toast");
  assert.ok(rule, "manca la regola del toast");

  assert.match(rule, /display:\s*grid/);
  // Senza colonna esplicita, un `justify-content` ereditato torna a stringere.
  assert.match(rule, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});

test("the flex-era toast rules are gone instead of layered underneath", () => {
  // Erano quattro blocchi `.workspace-toast` sovrapposti, ognuno a
  // sovrascrivere un pezzo del precedente.
  assert.doesNotMatch(INDEX_CSS, /^\.workspace-toast \{/m);
  assert.doesNotMatch(INDEX_CSS, /justify-content:\s*space-between;[\s\S]{0,120}workspace-toast/);
});

test("dead toast selectors are removed, not left for the next reader", () => {
  // Il componente rende viewport/stack/head/body/icon e `tone-<tono>`:
  // queste classi appartenevano a markup precedenti.
  for (const dead of [
    ".workspace-toast-center",
    ".workspace-toast-badge",
    ".workspace-toast-warning",
    ".workspace-toast-success",
    ".workspace-toast-error",
  ]) {
    const declarations = INDEX_CSS.match(new RegExp(`^\\s*\\${dead}[^\\n]*\\{`, "gm")) ?? [];
    assert.deepEqual(declarations, [], `${dead} e ancora dichiarata nel CSS`);
    assert.ok(!TOAST_COMPONENT.includes(dead.slice(1)), `${dead} non e resa dal componente`);
  }
});

test("the toast stack cannot push a toast past the bottom of the screen", () => {
  const viewport = ruleBody(INDEX_CSS, ".workspace-toast-viewport");
  const stack = ruleBody(INDEX_CSS, ".workspace-toast-viewport .workspace-toast-stack");
  assert.ok(viewport && stack);

  // Il contenitore e `fixed`: senza un limite in basso la pagina non puo
  // scorrere fino a un toast uscito dallo schermo e la sua X resta irraggiungibile.
  assert.match(viewport, /position:\s*fixed/);
  assert.match(viewport, /bottom:/);
  assert.match(stack, /max-height:\s*100%/);
  assert.match(stack, /overflow-y:\s*auto/);
});

test("toast tones come from the semantic tokens", () => {
  for (const [tone, token] of [
    ["success", "--color-success"],
    ["warning", "--color-warning"],
    ["error", "--color-danger"],
    ["info", "--color-info"],
  ] as const) {
    const border = ruleBody(INDEX_CSS, `.workspace-toast-viewport .workspace-toast.tone-${tone}`);
    const icon = ruleBody(
      INDEX_CSS,
      `.workspace-toast-viewport .workspace-toast.tone-${tone} .workspace-toast-icon`,
    );
    assert.ok(border && icon, `manca il tono ${tone}`);
    assert.match(border, new RegExp(`var\\(${token}\\)`), `il bordo ${tone} non usa ${token}`);
    assert.match(icon, new RegExp(`var\\(${token}\\)`), `l'icona ${tone} non usa ${token}`);
  }
});
