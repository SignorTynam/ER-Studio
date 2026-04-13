# Chen ER Diagram Studio (v3.4)

Editor web React + TypeScript per modellare diagrammi ER in stile Chen con canvas SVG, toolbar laterale, undo/redo, export PNG/SVG, salvataggio JSON e sincronizzazione ERS live.

## Novita 3.4

- Versione aggiornata a `3.4`.
- Nuova sintassi ERS per identificatori interni composti: `identifier att1, att2` (con piu gruppi distinti supportati nella stessa entita).
- Compatibilita parser mantenuta per la forma legacy `composite att1, att2`.
- Drag migliorato: spostando una relazione si spostano insieme anche gli attributi collegati, mantenendo il drag individuale degli attributi.
- Esempio di progetto aggiornato a configurazione completa coerente con il JSON di riferimento.

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
