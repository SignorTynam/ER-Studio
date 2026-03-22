# Chen ER Diagram Studio

Editor web React + TypeScript per modellare diagrammi ER in stile Chen con canvas SVG, toolbar laterale, pannello proprieta, undo/redo, export PNG/SVG e salvataggio JSON.

## Requisiti

- Node.js 18+ consigliato
- npm 9+ oppure un package manager compatibile

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

- Entita, entita deboli dedicate, relazioni, attributi, attributi composti con sotto-attributi, testo libero e gerarchie ISA
- Drag-and-drop, snap to grid, zoom, pan, selezione multipla, duplicazione e allineamento
- Undo/redo e validazioni per attributi, relazioni e link di ereditarieta con vincoli disjoint/overlap e total/partial
- Modalita modifica e solo visualizzazione
- Salvataggio/caricamento JSON, export PNG/SVG e sorgente ERS con sincronizzazione live
- Pulsante `Carica esempio` con scenario `CITTA'`, `PERSONA`, `UOMO`, `DONNA`, `MILITARE`, `LAVORATRICE`
