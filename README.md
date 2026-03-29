# Chen ER Diagram Studio (v2.5.2)

Editor web React + TypeScript per modellare diagrammi ER in stile Chen con canvas SVG, toolbar laterale, undo/redo, export PNG/SVG, salvataggio JSON e sincronizzazione ERS live.

## Novita 2.5.2

- Versione aggiornata a `2.5.2`.
- Workspace mantenuto in focus ER: la vista logica non viene ancora esposta in UI.
- Rifiniture su identificatori esterni e marker grafici per una resa piu coerente.

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
- Pulsante `Carica esempio` con scenario `CITTA'`, `PERSONA`, `UOMO`, `DONNA`, `MILITARE`, `LAVORATRICE`.
