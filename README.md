# Chen ER Diagram Studio (v3.7)

Editor web React + TypeScript per modellare diagrammi ER in stile Chen con canvas SVG, toolbar laterale, undo/redo, export PNG/SVG, salvataggio JSON e sincronizzazione ERS live.

## Novita 3.7

- Versione aggiornata a `3.7`.
- Completato restyling del workspace della vista Logico, integrandolo nativamente come first-class citizen della UI a 5 colonne.
- Risolto il problema di flessibilità verticale nel pannello Canvas Logico che limitava la sua visualizzazione (rimosso blocco fisso da 150px).
- Tradotte in italiano le opzioni dei vincoli e coperture ISA all'interno dell'inspector.
- Rifinito il rendering dei badge ISA con colori piu tenui e testo piu leggibile, per migliorare l'estetica e la chiarezza visiva.
- Nuovo aggiornamento della vista Logica alla release 3.7, con miglioramenti significativi all'usabilita, alla flessibilita del layout e alla coerenza visiva dei diagrammi logici.


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
