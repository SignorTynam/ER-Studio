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

- Entita, relazioni, attributi laterali, testo libero e gerarchie con frecce verso l'alto
- Drag-and-drop, snap to grid, zoom, pan, selezione multipla, duplicazione e allineamento
- Undo/redo e validazioni di base per attributi, relazioni e link di ereditarieta
- Modalita modifica e solo visualizzazione
- Salvataggio/caricamento JSON e export PNG/SVG
- Pulsante `Carica esempio` con scenario `CITTA'`, `PERSONA`, `UOMO`, `DONNA`, `MILITARE`, `LAVORATRICE`
