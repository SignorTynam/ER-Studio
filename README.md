<p align="center">
  <img src="src/image/buildER%20no%20background.png" alt="buildER logo" width="520" />
</p>

# buildER

Editor web React + TypeScript per modellare diagrammi ER in stile Chen con canvas SVG, toolbar laterale, undo/redo, project file `.ersp`, export PNG/SVG/JPEG e sincronizzazione ERS live.

## Stato del progetto

buildER è la nuova evoluzione di ER Studio. La versione corrente è pubblicata e tracciata tramite le release GitHub e il catalogo applicativo.

## Novità principali

### Nuovo

- Apri e gestisci database SQLite reali nel browser, anche senza creare un progetto.
- Esplora tabelle, colonne, chiavi, relazioni, viste, indici e trigger con SQL Explorer.
- Crea un database SQLite dal modello logico, esegui query e scarica il risultato con SQL Playground.
- Trasforma un database SQLite in modello logico e diagramma ER con il Reverse Engineering guidato.
- Lavora con più database e sessioni indipendenti, senza modificare i file originali.
- Consulta tutte le release dal nuovo centro Novità nell'header.

### Miglioramenti

- Editor, comandi e risultati SQL sono più coerenti, leggibili e accessibili da tastiera.
- SQL Explorer si aggiorna automaticamente dopo le modifiche strutturali.
- Le viste database temporanee restano separate dai progetti `.ersp` e dalla loro cronologia.
- Gli annunci sono proporzionati all'aggiornamento: toast compatti per le correzioni e presentazioni dedicate per le release principali.
- Database Workspace, SQL Explorer, Reverse Engineering e Novità sono localizzati in italiano, inglese e albanese.

### Correzioni

- La chiusura di database importati con modifiche non salvate richiede una scelta esplicita e previene perdite accidentali.
- La normalizzazione SemVer evita annunci duplicati e mantiene compatibili le preferenze delle versioni precedenti.

## Funzionalità principali

- Modellazione ER in stile Chen: entità, entità deboli, relazioni, attributi, attributi composti, testo libero e gerarchie ISA.
- Canvas SVG con drag-and-drop, snap to grid, zoom, pan, selezione multipla, duplicazione e allineamento.
- Undo/redo, validazioni, cardinalità, vincoli ISA e controlli sugli identificatori.
- Salvataggio/caricamento progetto `.ersp`.
- Export PNG/SVG/JPEG con crop stretto del contenuto e sfondi coerenti per raster e vettoriale.
- Sorgente ERS con sincronizzazione live.
- Reverse engineering SQL con preview logica e preview ER.
- SQL Playground locale con command bar compatta, editor SQL condiviso con gutter/highlighting, risultati ridimensionabili e download `.sqlite`.
- SQL Explorer accessibile nell'activity rail, alimentato dall'introspezione del database SQLite WebAssembly reale nel Web Worker e aggiornato automaticamente dopo modifiche DDL.
- Database Workspace per aprire file `.sqlite`, `.sqlite3` e `.db` reali senza progetto, lavorare su una copia locale, esportare o ripristinare e gestire più sessioni indipendenti.
- Reverse Engineering da metadata SQLite con selezione tabelle, anteprime logica/ER, destinazioni progetto e conservazione opzionale di viste, trigger e indici non convertibili.
- UI responsive per desktop, tablet e telefono.
- Localizzazione in italiano, inglese e albanese.

## Requisiti

- Node.js 20 LTS consigliato.
- npm 10 o superiore consigliato.
- Git.

## Avvio locale

```bash
npm install
npm run dev
```

## Build e test

```bash
npm run build
npm test
npm run test:e2e
npm run preview
```

## Struttura del repository

```txt
buildER/
  docs/                    Documentazione tecnica e guide operative
  src/                     Codice sorgente React + TypeScript
  test/                    Test unitari e di integrazione
  tests/e2e/               Test end-to-end Playwright
  index.html               Entry HTML Vite
  package.json             Script npm e dipendenze
  playwright.config.ts     Configurazione Playwright
  tsconfig*.json           Configurazione TypeScript
  vite.config.ts           Configurazione Vite
```

Per la struttura dettagliata vedere `docs/REPOSITORY_STRUCTURE.md`.

## Documentazione utile

- `docs/ARCHITECTURE.md` — panoramica tecnica dei moduli e del flusso dati.
- `docs/DEVELOPMENT.md` — setup, branch, commit, checklist PR e regole operative.
- `docs/REPOSITORY_STRUCTURE.md` — dove mettere nuove feature, test, utility e documentazione.
- `docs/CODEX_UI_STYLE_GUIDE.md` — guida stile UI da seguire per Cursor/Codex e refactor grafici.
- `docs/reverse-engineering-sql.md` — note tecniche sul reverse engineering SQL.
- `docs/sql-reverse-attribute-layout.md` — note sul layout attributi da reverse SQL.
- `docs/sql-playground.md` — architettura, uso, limiti e troubleshooting del Playground SQLite locale.
- `docs/database-workspace.md` — apertura, sicurezza, sessioni, restore ed export di database SQLite locali.
- `docs/sql-reverse-engineering.md` — ingressi SQL testuale e SQLite reale verso la pipeline logico/ER.

## Regole di repository hygiene

- Non committare output generati: `dist/`, `coverage/`, `playwright-report/`, `*.tsbuildinfo`.
- Tenere la logica di dominio in `src/utils` e i tipi condivisi in `src/types`.
- Evitare CSS locale duplicato quando esistono token o componenti condivisi.
- Aggiornare test e documentazione quando una modifica tocca parser, layout, serializzazione, UI o flussi utente.
- Aprire branch piccoli e focalizzati partendo da `main`.
