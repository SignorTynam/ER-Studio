# Chen ER Diagram Studio (v3.2.0)

Editor web React + TypeScript per modellare diagrammi ER in stile Chen con canvas SVG, toolbar laterale, undo/redo, export PNG/SVG, salvataggio JSON e sincronizzazione ERS live.

## Novita 3.2.0

- Versione aggiornata a `3.2.0`.
- Validazione semantica degli identificatori esterni centralizzata nel dominio con invalidazione automatica quando i legami richiesti non sono piu coerenti.
- Sincronizzazione stato/UI sugli identificatori esterni invalidi: cleanup dei metadati residui e avvisi specifici mostrati all'utente durante l'editing.
- Routing grafico degli identificatori esterni rifinito su junction finali reali, con eliminazione di micro-stub e migliore leggibilita dei raccordi.
- Drag entita esteso agli attributi collegati (inclusi attributi identificanti e composti interni) per mantenere la struttura durante lo spostamento.
- Creazione elementi con identita separate: ID tecnico progressivo (`entity1`, `attribute1`, `relationship1`) distinto dal nome visuale (`ENTITA1`, `ATTRIBUTO1`, `RELAZIONE1`).

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
