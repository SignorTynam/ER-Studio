import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  DEFAULT_HISTORY_LIMIT,
  areHistoryValuesEqual,
  cloneHistoryValue,
  normalizeHistoryLimit,
  trimFutureEntries,
  trimPastEntries,
} from "../src/hooks/useHistory.ts";

test("trimPastEntries keeps the latest entries", () => {
  assert.deepEqual(trimPastEntries([1, 2, 3, 4], 2), [3, 4]);
});

test("trimFutureEntries keeps the next redo entries", () => {
  assert.deepEqual(trimFutureEntries([1, 2, 3, 4], 2), [1, 2]);
});

test("history trimming returns empty arrays for zero or negative limits", () => {
  assert.deepEqual(trimPastEntries([1, 2, 3], 0), []);
  assert.deepEqual(trimFutureEntries([1, 2, 3], 0), []);
  assert.deepEqual(trimPastEntries([1, 2, 3], -1), []);
  assert.deepEqual(trimFutureEntries([1, 2, 3], -1), []);
});

test("normalizeHistoryLimit floors positive values and clamps invalid values", () => {
  assert.equal(normalizeHistoryLimit(2.8), 2);
  assert.equal(normalizeHistoryLimit(-3), 0);
  assert.equal(normalizeHistoryLimit(Number.POSITIVE_INFINITY), DEFAULT_HISTORY_LIMIT);
});

test("areHistoryValuesEqual returns true for the same reference", () => {
  const value = { a: 1 };

  assert.equal(areHistoryValuesEqual(value, value), true);
});

test("areHistoryValuesEqual keeps JSON equality fallback", () => {
  assert.equal(areHistoryValuesEqual({ a: 1 }, { a: 1 }), true);
});

test("areHistoryValuesEqual uses a custom comparator", () => {
  assert.equal(areHistoryValuesEqual({ a: 1 }, { a: 2 }, () => true), true);
});

test("cloneHistoryValue creates an independent nested copy", () => {
  const original = { nested: { value: 1 } };
  const cloned = cloneHistoryValue(original);

  cloned.nested.value = 2;

  assert.equal(original.nested.value, 1);
  assert.equal(cloned.nested.value, 2);
});

/** Corpo di una funzione dichiarata nel sorgente, bilanciando le graffe. */
function getFunctionBody(source: string, functionName: string): string {
  const signatureIndex = source.indexOf(`function ${functionName}(`);
  assert.notEqual(signatureIndex, -1, `${functionName} deve esistere`);

  const bodyStart = source.indexOf("{", signatureIndex);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    else if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(bodyStart + 1, index);
    }
  }

  assert.fail(`${functionName} deve avere un corpo chiuso`);
}

test("undo e redo leggono dalle ref, non dalla closure del render", () => {
  // Regressione (Fase L): `undo` puo' essere CATTURATO in una closure e invocato molti render
  // dopo — e' il caso dell'azione "Annulla" di un toast, creata insieme al commit e cliccata
  // secondi piu' tardi. Leggendo `past`/`present` dal render di cattura, l'undo ripristinava una
  // baseline vecchia: dopo un auto-layout riportava al diagramma VUOTO invece che allo stato
  // pre-layout, perdendo il lavoro con un solo click.
  const source = readFileSync(new URL("../src/hooks/useHistory.ts", import.meta.url), "utf8");
  const undoBody = getFunctionBody(source, "undo");
  const redoBody = getFunctionBody(source, "redo");

  assert.match(undoBody, /pastRef\.current/);
  assert.match(undoBody, /presentRef\.current/);
  assert.match(redoBody, /futureRef\.current/);
  assert.match(redoBody, /presentRef\.current/);

  // Nessuna lettura diretta dello stato del render dentro undo/redo.
  assert.doesNotMatch(undoBody, /\bpast\.length\b/);
  assert.doesNotMatch(undoBody, /\bpast\[/);
  assert.doesNotMatch(undoBody, /clone\(present\)/);
  assert.doesNotMatch(redoBody, /\bfuture\.length\b/);
  assert.doesNotMatch(redoBody, /\[next, \.\.\.remaining\] = future\b/);
  assert.doesNotMatch(redoBody, /clone\(present\)/);
});

test("useHistory source keeps history bounded", () => {
  const source = readFileSync(new URL("../src/hooks/useHistory.ts", import.meta.url), "utf8");

  assert.equal(source.includes("DEFAULT_HISTORY_LIMIT"), true);
  assert.equal(source.includes("maxEntries"), true);
  assert.equal(source.includes("setPast((currentPast) => [...currentPast, cloneValue(previous)])"), false);
  assert.equal(source.includes("setPast((currentPast) => [...currentPast, clone(present)])"), false);
});
