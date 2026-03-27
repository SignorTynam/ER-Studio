# Chen ER Diagram Studio (v2.5.1)

Editor web React + TypeScript per modellare diagrammi ER in stile Chen con canvas SVG, toolbar laterale, undo/redo, export PNG/SVG, salvataggio JSON e sincronizzazione ERS live.

## Novita 2.5.1

- Sostituiti i popup JavaScript nativi (`prompt`/`confirm`) con modali applicative integrate.
- Messaggi di errore sui collegamenti piu espliciti: viene mostrato il motivo reale del vincolo Chen violato.
- Rimosso il pannello Workspace separato: le impostazioni del nodo/collegamento selezionato sono nel pannello Canvas.
- Migliorata la gestione attributi: creazione senza sovrapposizione, collegamenti a ventaglio verso l'host e dimensione multivalore basata sul contenuto del nome.
- Rimossi i campi manuali di posizione X/Y dal pannello: spostamento elementi direttamente sul canvas.
- Toast operativi in overlay (senza spostare il layout).

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
