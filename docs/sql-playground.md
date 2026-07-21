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

- `SqlPlaygroundWorkspace` e i componenti affini rendono command bar, editor condiviso, splitter, stati, errori e risultati.
- `useSqlPlayground` collega il rendering allo stato temporaneo della sessione.
- `SqlPlaygroundManager` crea il worker solo al primo utilizzo, instrada richieste tipizzate, conserva sessioni separate e pubblica eventi con unsubscribe esplicito.
- `sqlPlaygroundProtocol.ts` definisce richieste e risposte discriminate senza payload `any`.
- `sqlite.worker.ts` inizializza SQLite, possiede i database, prepara/finalizza gli statement, misura le versioni schema, esegue l'introspezione, esporta i byte e chiude le risorse.
- `SqlExplorerPanel`, `SqlExplorerTree` e `useSqlExplorer` presentano metadata reali senza eseguire SQLite nel main thread.
- `sqlExplorerIntrospection.ts` concentra query parametrizzate, quoting degli identificatori e cleanup degli statement.
- `src/utils/sqlPlayground.ts` contiene checksum, formattazione valori, limiti e download testabili senza React.

## Worker e SQLite WASM

La dipendenza runtime è `@sqlite.org/sqlite-wasm`, distribuzione ufficiale SQLite. Il modulo OO1 viene inizializzato dentro un Web Worker di tipo module. `sqlite3.wasm` è importato come asset Vite (`?url`), quindi worker e WASM ricevono nomi hashed e rispettano il base path della build.

Non sono richiesti `SharedArrayBuffer`, isolamento cross-origin, OPFS o header server speciali. I database generati usano `:memory:`; i file importati vengono deserializzati in memoria in sessioni separate dal Database Workspace.

## Creazione e ricreazione

Prima dello schema il worker esegue `PRAGMA foreign_keys = ON`. La creazione è atomica: lo schema viene applicato a una nuova istanza temporanea; il database precedente viene sostituito soltanto se tutte le istruzioni riescono. In caso di errore l'istanza temporanea viene chiusa e quella precedente rimane disponibile.

La sessione conserva il checksum dello schema usato. Se il SQL generato cambia, l'interfaccia mostra `Database da aggiornare` senza cancellare i dati. Se sono state eseguite modifiche, la ricreazione richiede conferma.

## Sessioni e privacy

Le sessioni generate usano `projectId:schemaFileId`; quelle importate usano `imported:<uuid>`. Query, risultati e database non si sovrascrivono. Chiudere o sostituire il progetto dispone solo le sessioni generate interessate; il worker termina quando viene disposto esplicitamente.

Tutto resta locale al browser. Dati e query non vengono inviati a servizi esterni, inclusi GitHub o servizi analytics, e non vengono aggiunti al file `.ersp`. Un reload perde la sessione salvo export manuale.

## Query e risultati

`Ctrl+Invio` o `Cmd+Invio` esegue la selezione, se presente, altrimenti l'intero editor. Gli script vengono letti con `sqlite3_complete`, non con uno split sui punti e virgola. Ogni statement viene finalizzato anche in caso di errore.

I result set rimangono separati e sono limitati a 500 righe visualizzate. `NULL`, stringhe vuote e BLOB hanno rappresentazioni distinte; i valori lunghi conservano il valore completo nel titolo accessibile. INSERT, UPDATE, DELETE e DDL mostrano modifiche, ultimo row id quando disponibile e durata approssimativa.

L'editor riusa `CodeEditorSurface`: numeri di riga, scroll sincronizzato, Tab, auto-pairing e highlighting SQL restano condivisi con gli altri editor. Il comando `Esegui` della command bar e `Ctrl/Cmd+Invio` chiamano la stessa funzione selezione-o-documento.

Il pannello Risultati usa uno splitter orizzontale con pointer capture e controllo da tastiera (`ArrowUp/ArrowDown`, con Shift per passi maggiori). Può essere chiuso lasciando una barra di riapertura; altezza e stato collapsed sopravvivono alla chiusura della tab nella sessione corrente, ma non vengono serializzati. Le tabelle mantengono semantica HTML e aggiungono row header numerati da 1.

## SQL Explorer

L'attività `SQL Explorer`, immediatamente prima di Export, rappresenta il database effettivo della sessione. Mostra `main` e database collegati con `ATTACH`, tabelle, colonne, viste, indici, trigger e foreign key; gli oggetti `sqlite_*` restano nascosti. Tipi, posizione PK, nullability, default, unique e azioni referenziali derivano dalle PRAGMA SQLite, non dal modello logico.

Il worker espone `inspect-schema` e legge `PRAGMA database_list`, `<database>.sqlite_schema`, `pragma_table_info`, `pragma_foreign_key_list`, `pragma_index_list` e `pragma_index_info`. Gli argomenti supportati sono bindati e i nomi database sono quotati da un helper dedicato. Prima e dopo ogni script viene confrontata una firma delle `schema_version` di tutti i database: il manager emette `schema-changed` soltanto quando la struttura cambia. Il tree conserva selezione ed espansioni ancora valide durante il refresh e supporta il pattern ARIA tree con roving tabindex.

SQL Explorer gestisce assenza di progetto/schema/sessione/database, loading, errore e retry. Aprirlo o ridimensionare/nascondere i risultati non ricrea il database, non chiude il Playground e non modifica il dirty state.

Quando sono presenti più sessioni, un selettore distingue database generati e importati. Le azioni sugli oggetti possono aprire/eseguire SELECT nella sessione corretta, mostrare la definizione, copiare il nome o avviare il reverse da metadata.

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
- `test/sql-playground-components.test.tsx`: command bar, editor condiviso, risultati, row header e collapsed state.
- `test/sql-explorer.test.ts`: introspezione SQLite reale, database collegati, metadata e firme schema.
- `test/sql-explorer-components.test.tsx`: empty state, splitter e tree ARIA.
- `tests/e2e/sql-playground.spec.ts`: worker/WASM reale, splitter, collapse, SQL Explorer, refresh DDL, responsive e Axe.

## Troubleshooting

- **Errore di inizializzazione:** verificare nella build la presenza di `sqlite3-*.wasm` e del chunk worker.
- **Errore nello schema:** controllare il dettaglio SQLite e l'indice dell'istruzione; il database precedente non viene distrutto.
- **Database da aggiornare:** ricreare esplicitamente dopo aver esportato eventuali dati utili.
- **Query con troppe righe:** il database esegue la query, ma la UI mostra solo le prime 500 righe per proteggere il browser.

## Limiti deliberati

L'import `.sqlite` è gestito dal Database Workspace documentato separatamente. Restano fuori scope backend, cloud sync, OPFS obbligatorio, collaborazione, AI, explain plan grafico e persistenza automatica.
