# Chen ER Diagram Studio (v3.6)

Editor web React + TypeScript per modellare diagrammi ER in stile Chen con canvas SVG, toolbar laterale, undo/redo, export PNG/SVG, salvataggio JSON e sincronizzazione ERS live.

## Novita 3.6

- Versione aggiornata a `3.6`.
- Identificatori interni composti ridisegnati con layout ortogonale pulito: backbone comune e rami lineari verso gli attributi membri.
- Eliminato il routing curvo degli identificatori composti.
- Posizione del backbone calcolata automaticamente da geometria entita e distribuzione attributi (senza coordinate hardcoded).
- Trascinamento del backbone composito: il gruppo degli attributi membri si comporta come un'unita coerente.
- Corretto il rendering con diagonali duplicate: i membri composti non mostrano piu il collegamento diretto attributo-entita quando il gruppo composito e attivo.

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
