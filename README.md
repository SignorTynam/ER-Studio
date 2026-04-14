# Chen ER Diagram Studio (v3.5)

Editor web React + TypeScript per modellare diagrammi ER in stile Chen con canvas SVG, toolbar laterale, undo/redo, export PNG/SVG, salvataggio JSON e sincronizzazione ERS live.

## Novita 3.5

- Versione aggiornata a `3.5`.
- Gestione cardinalita rifinita: partecipazioni entity-relazione tipizzate e cardinalita attributo gestita direttamente sul nodo attributo.
- Utility cardinalita centralizzate per risoluzione e rendering coerente delle etichette sui collegamenti.
- Inspector associazione semplificato: la rinomina resta nelle azioni rapide e non richiede piu il campo dedicato.
- Governance progetto aggiornata con `security.md`, `LICENSE`, `CONTRIBUTING.md` e `CHANGELOG.md`.

## Requisiti

- Node.js 18+ consigliato
- npm 9+ (o package manager compatibile)

## Avvio locale

```bash
npm install
npm run dev
```

## Build produzione

```bash
npm run build
npm run preview
```

## Funzionalita principali

- Entita, entita deboli dedicate, relazioni, attributi, attributi composti con sotto-attributi, testo libero e gerarchie ISA.
- Drag-and-drop, snap to grid, zoom, pan, selezione multipla, duplicazione e allineamento.
- Undo/redo e validazioni per attributi, relazioni e link di ereditarieta con vincoli disjoint/overlap e total/partial.
- Modalita modifica e sola lettura.
- Salvataggio/caricamento JSON, export PNG/SVG e sorgente ERS con sincronizzazione live.
