# Chen ER Diagram Studio (v3.0.0)

Editor web React + TypeScript per modellare diagrammi ER in stile Chen con canvas SVG, toolbar laterale, undo/redo, export PNG/SVG, salvataggio JSON e sincronizzazione ERS live.

## Novita 3.0.0

- Versione aggiornata a `3.0.0`.
- Vista `ER / Logica` disponibile in header con passaggio immediato tra le due modalita.
- Modello logico/relazionale generato dal diagramma ER con tabelle, PK, FK e collegamenti.
- Azioni dedicate in vista logica: `Rigenera`, `Layout auto`, `Adatta`.

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
