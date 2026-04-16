# Chen ER Diagram Studio (v3.8)

Editor web React + TypeScript per modellare diagrammi ER in stile Chen con canvas SVG, toolbar laterale, undo/redo, project file `.ersp`, export PNG/SVG e sincronizzazione ERS live.

## Novita 3.8

- Versione aggiornata a `3.8`.
- Introdotto il formato progetto `.ersp` con salvataggio e ripristino di workspace, vista corrente e viewport, piu compatibilita con i backup JSON legacy di versione 2.
- Aggiunto supporto i18n con interfaccia localizzata in italiano, inglese e albanese, oltre a un catalogo centralizzato per i testi comuni della UI.
- Allineata la serializzazione ERS alla regola `ID = nome`: export e parsing usano il nome corrente delle shape invece di codici legacy casuali.
- Corretto il flusso di rinomina delle shape: quando cambia il nome, vengono aggiornati anche id e riferimenti collegati per evitare errori nello schema ER.
- Vista Logica rifinita in stile designER/classico: tabelle rettangolari monocromatiche, nomi centrati, PK sottolineate e collegamenti FK ortogonali piu sobri.

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
- Salvataggio/caricamento progetto `.ersp`, export PNG/SVG e sorgente ERS con sincronizzazione live.
