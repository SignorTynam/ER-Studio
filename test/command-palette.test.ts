import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeCommandPaletteText,
  rankCommandPaletteEntries,
  type CommandPaletteSearchEntry,
} from "../src/utils/commandPalette.ts";

function entry(
  id: string,
  label: string,
  patch: Partial<CommandPaletteSearchEntry> = {},
): CommandPaletteSearchEntry {
  return {
    id,
    kind: "command",
    label,
    category: "Commands",
    order: 0,
    ...patch,
  };
}

test("normalizza maiuscole, minuscole e spazi multipli", () => {
  assert.equal(normalizeCommandPaletteText("  APRI   Progetto  ", "it"), "apri progetto");
});

test("rimuove accenti e segni diacritici", () => {
  assert.equal(normalizeCommandPaletteText("Entità", "it"), "entita");
});

test("richiede che tutti i token della query siano presenti", () => {
  const results = rankCommandPaletteEntries([
    entry("course", "Corso", { kind: "file", path: "didattica/schema-corso.erschema" }),
    entry("schema", "Nuovo schema"),
  ], "schema corso", "it");
  assert.deepEqual(results.map(({ id }) => id), ["course"]);
});

test("trova un file tramite il nome", () => {
  const results = rankCommandPaletteEntries([
    entry("students", "Schema Studenti.erschema", { kind: "file" }),
  ], "studenti", "it");
  assert.deepEqual(results.map(({ id }) => id), ["students"]);
});

test("trova un file tramite il percorso", () => {
  const results = rankCommandPaletteEntries([
    entry("course", "corso.erschema", { kind: "file", path: "didattica/corso.erschema" }),
  ], "didattica", "it");
  assert.deepEqual(results.map(({ id }) => id), ["course"]);
});

test("trova un file tramite l'estensione", () => {
  const results = rankCommandPaletteEntries([
    entry("query", "report", { kind: "file", extension: ".sql" }),
  ], ".sql", "it");
  assert.deepEqual(results.map(({ id }) => id), ["query"]);
});

test("trova un comando tramite la label", () => {
  const results = rankCommandPaletteEntries([entry("open", "Apri progetto")], "apri", "it");
  assert.deepEqual(results.map(({ id }) => id), ["open"]);
});

test("trova un comando tramite la scorciatoia", () => {
  const results = rankCommandPaletteEntries([
    entry("save", "Salva progetto", { shortcut: "Ctrl/Cmd S" }),
  ], "ctrl s", "it");
  assert.deepEqual(results.map(({ id }) => id), ["save"]);
});

test("un exact match precede un substring match", () => {
  const results = rankCommandPaletteEntries([
    entry("substring", "Apri schema logico"),
    entry("exact", "Schema"),
  ], "schema", "it");
  assert.deepEqual(results.map(({ id }) => id), ["exact", "substring"]);
});

test("un prefix match precede un match nel dettaglio", () => {
  const results = rankCommandPaletteEntries([
    entry("detail", "Modello", { detail: "Apri schema" }),
    entry("prefix", "Schema logico"),
  ], "schema", "it");
  assert.deepEqual(results.map(({ id }) => id), ["prefix", "detail"]);
});

test("un file attivo precede un file equivalente non attivo", () => {
  const results = rankCommandPaletteEntries([
    entry("inactive", "Schema", { kind: "file", order: 0 }),
    entry("active", "Schema", { kind: "file", order: 0, active: true }),
  ], "schema", "it");
  assert.deepEqual(results.map(({ id }) => id), ["active", "inactive"]);
});

test("l'ordinamento rimane stabile con score e ordine equivalenti", () => {
  const results = rankCommandPaletteEntries([
    entry("z", "Beta", { detail: "Target", order: 2 }),
    entry("a", "Alfa", { detail: "Target", order: 2 }),
    entry("first", "Gamma", { detail: "Target", order: 1 }),
  ], "target", "it");
  assert.deepEqual(results.map(({ id }) => id), ["first", "a", "z"]);
});

test("una query vuota restituisce l'ordine dichiarato", () => {
  const results = rankCommandPaletteEntries([
    entry("second", "Beta", { order: 2 }),
    entry("first", "Alfa", { order: 1 }),
  ], "", "it");
  assert.deepEqual(results.map(({ id }) => id), ["first", "second"]);
});

test("una query senza risultati restituisce un array vuoto", () => {
  assert.deepEqual(rankCommandPaletteEntries([entry("open", "Apri progetto")], "xyz", "it"), []);
});
