# Chen ER Diagram Studio (v3.1.0)

Editor web React + TypeScript per modellare diagrammi ER in stile Chen con canvas SVG, toolbar laterale, undo/redo, export PNG/SVG, salvataggio JSON e sincronizzazione ERS live.

## Novita 3.1.0

- Versione aggiornata a `3.1.0`.
- Onboarding guidato alla prima apertura con step reali su canvas.
- Toolbar contestuale semplificata: azioni rilevanti in base alla selezione, anche in rail chiuso.
- Rimozione azioni duplicate tra pannelli contestuali per ridurre rumore visivo.
- Messaggi di errore uniformati in formato unico (cosa, perche, soluzione).
- Export PNG corretto con resa colori/stili affidabile.
- Autosalvataggio locale e ripristino automatico sessione dopo chiusura o crash.

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
