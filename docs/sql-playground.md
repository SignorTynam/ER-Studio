# SQL Playground locale

## Obiettivo

SQL Playground trasforma il modello logico dello schema attivo in un database SQLite reale, eseguito interamente nel browser. L'utente può lanciare query e script, leggere result set e riepiloghi DML, verificare i vincoli e scaricare il database come file `.sqlite` senza backend o credenziali.

## Flusso

```txt
Schema attivo
  → generateLogicalSql({ dialect: "sqlite", quoteIdentifiers: true })
  → checksum deterministico
  → creazione atomica nel worker
  → query e risultati
  → export dei byte SQLite
```

Il Playground si apre dal pulsante `Prova SQL` della vista SQL logica o dal comando `Apri SQL Playground`. La tab tecnica usa la shell esistente, è chiudibile e non viene serializzata nel progetto.

## Architettura

- `SqlPlaygroundWorkspace` e i componenti affini rendono editor, stati, errori e risultati.
- `useSqlPlayground` collega il rendering allo stato temporaneo della sessione.
- `SqlPlaygroundManager` crea il worker solo al primo utilizzo, instrada richieste tipizzate e conserva query e risultati separati.
- `sqlPlaygroundProtocol.ts` definisce richieste e risposte discriminate senza payload `any`.
- `sqlite.worker.ts` inizializza SQLite, possiede i database, prepara/finalizza gli statement, esporta i byte e chiude le risorse.
- `src/utils/sqlPlayground.ts` contiene checksum, formattazione valori, limiti e download testabili senza React.

## Worker e SQLite WASM

La dipendenza runtime è `@sqlite.org/sqlite-wasm`, distribuzione ufficiale SQLite. Il modulo OO1 viene inizializzato dentro un Web Worker di tipo module. `sqlite3.wasm` è importato come asset Vite (`?url`), quindi worker e WASM ricevono nomi hashed e rispettano il base path della build.

Non sono richiesti `SharedArrayBuffer`, isolamento cross-origin, OPFS o header server speciali. La prima versione usa database `:memory:`.

## Creazione e ricreazione

Prima dello schema il worker esegue `PRAGMA foreign_keys = ON`. La creazione è atomica: lo schema viene applicato a una nuova istanza temporanea; il database precedente viene sostituito soltanto se tutte le istruzioni riescono. In caso di errore l'istanza temporanea viene chiusa e quella precedente rimane disponibile.

La sessione conserva il checksum dello schema usato. Se il SQL generato cambia, l'interfaccia mostra `Database da aggiornare` senza cancellare i dati. Se sono state eseguite modifiche, la ricreazione richiede conferma.

## Sessioni e privacy

L'identificatore è `projectId:schemaFileId`. Query, risultati e database di due schemi non si sovrascrivono. Chiudere e riaprire la tab mantiene la sessione; chiudere o sostituire il progetto dispone i database e termina il worker.

Tutto resta locale al browser. Dati e query non vengono inviati a servizi esterni, inclusi GitHub o servizi analytics, e non vengono aggiunti al file `.ersp`. Un reload perde la sessione salvo export manuale.

## Query e risultati

`Ctrl+Invio` o `Cmd+Invio` esegue la selezione, se presente, altrimenti l'intero editor. Gli script vengono letti con `sqlite3_complete`, non con uno split sui punti e virgola. Ogni statement viene finalizzato anche in caso di errore.

I result set rimangono separati e sono limitati a 500 righe visualizzate. `NULL`, stringhe vuote e BLOB hanno rappresentazioni distinte; i valori lunghi conservano il valore completo nel titolo accessibile. INSERT, UPDATE, DELETE e DDL mostrano modifiche, ultimo row id quando disponibile e durata approssimativa.

## Export `.sqlite`

Il manager richiede al worker i byte serializzati, crea un Blob `application/vnd.sqlite3`, avvia il download con un nome derivato dallo schema e revoca sempre l'Object URL. L'export non modifica il dirty state del progetto.

## GitHub Pages

Per verificare la pubblicazione sotto repository path:

```bash
npm run build -- --base=/buildER/
```

In `dist` devono essere presenti il worker e il file `.wasm`; i riferimenti devono iniziare con `/buildER/assets/` e non devono contenere URL CDN. SQLite resta fuori dal chunk principale e viene richiesto solo aprendo il Playground.

## Test

- `test/sql-playground.test.ts`: checksum, valori, limiti, errori, export e SQL SQLite reale.
- `test/sql-playground-components.test.tsx`: markup accessibile di editor, risultati ed errori.
- `tests/e2e/sql-playground.spec.ts`: worker/WASM reale, tabelle, DML, PK/FK, stale, ricreazione, export, riapertura, responsive e Axe.

## Troubleshooting

- **Errore di inizializzazione:** verificare nella build la presenza di `sqlite3-*.wasm` e del chunk worker.
- **Errore nello schema:** controllare il dettaglio SQLite e l'indice dell'istruzione; il database precedente non viene distrutto.
- **Database da aggiornare:** ricreare esplicitamente dopo aver esportato eventuali dati utili.
- **Query con troppe righe:** il database esegue la query, ma la UI mostra solo le prime 500 righe per proteggere il browser.

## Limiti deliberati

Nessun import `.sqlite`, backend, cloud sync, OPFS obbligatorio, collaborazione, AI, explain plan grafico o persistenza automatica. Queste capacità non sono simulate con controlli inattivi.
