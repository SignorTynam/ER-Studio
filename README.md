# Chen ER Diagram Studio (v3.3)

Editor web React + TypeScript per modellare diagrammi ER in stile Chen con canvas SVG, toolbar laterale, undo/redo, export PNG/SVG, salvataggio JSON e sincronizzazione ERS live.

## Novita 3.3

- Versione aggiornata a `3.3`.
- Refactor identificatori interni: ogni entita puo gestire piu identificatori interni con struttura dedicata.
- Nuova sezione UI dedicata agli identificatori interni con creazione, modifica, eliminazione e selezione attributi via modal.
- Coerenza tra flussi legacy e nuova UI: gli identificatori semplici/composti restano sincronizzati tra lista e flag attributo.
- Rendering canvas corretto per composti multipli: identificatori composti diversi sulla stessa entita non vengono piu accorpati in un solo gruppo grafico.
- Modal degli identificatori robusto anche nei pannelli embedded (portal su body), senza clipping laterale.
- Vincolo cardinalita rafforzato: un attributo che partecipa a identificatori interni non espone cardinalita opzionale.

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
