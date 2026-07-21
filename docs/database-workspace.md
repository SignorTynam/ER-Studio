# Database Workspace SQLite

## Scopo e flusso utente

Database Workspace apre un file locale `.sqlite`, `.sqlite3` o `.db` come copia temporanea nel browser. Non richiede un progetto, non carica dati in rete e non modifica il file originale.

1. Usare **Apri database SQLite…** dalla welcome page, dal menu Importa/Esporta, dalla command palette o dall'empty state di SQL Explorer.
2. Eseguire query o script con **Esegui** oppure `Ctrl/Cmd+Invio`.
3. Usare **Salva copia** per scaricare lo stato corrente; un database modificato usa il suffisso `-modified`.
4. Usare **Ripristina originale** per ricreare atomicamente la sessione dai byte immutabili letti all'apertura.
5. Avviare **Reverse Engineering** per scegliere tabelle, opzioni e destinazione del nuovo schema.

Più database importati possono convivere con un progetto e con i database generati dal SQL Playground. Le tab importate sono tecniche: non sono serializzate nel file `.ersp` e non entrano nel Source Control.

## Validazione e limiti

- Il main thread controlla nome, dimensione e header `SQLite format 3\0` prima di trasferire l'`ArrayBuffer` al worker.
- Il worker è autorevole: deserializza in un database nuovo, abilita le foreign key, legge versioni e metadata, esegue `quick_check` e pubblica la sessione solo se tutto riesce.
- File vuoti, file oltre 512 MiB, header non SQLite e file `-wal`/`-shm` separati vengono rifiutati. Oltre 64 MiB viene richiesta conferma per il consumo di memoria.
- WAL/SHM non vengono ricomposti: occorre selezionare un database principale già checkpointed.
- Query e risultati restano limitati a 500 righe visualizzate come nel Playground.

## Proprietà e ciclo di vita

`SqlPlaygroundManager` mantiene sessioni discriminate:

- `generated-schema`: database derivato da `projectId + schemaFileId`;
- `imported-sqlite`: database derivato da un file, con nome, dimensione, data apertura, firma schema e stato export.

Il worker possiede sia il database attivo sia una copia immutabile dei byte originali per ogni sessione importata. `sqlite3_deserialize` riceve memoria allocata da SQLite con `FREEONCLOSE | RESIZEABLE`; la chiusura della sessione libera database e buffer. Chiudere o cambiare progetto rimuove solo le sessioni generate da quel progetto, lasciando aperti i database importati.

Le modifiche DML/DDL impostano `hasSessionChanges` e `hasUnexportedChanges`. Un export azzera solo il secondo flag. Il restore azzera entrambi, risultati ed errori. Chiudere una tab con modifiche non esportate offre Annulla, Chiudi senza salvare e Salva copia; la stessa protezione è applicata alle azioni Chiudi altre, a destra e tutte.

## SQL Explorer

SQL Explorer elenca tutte le sessioni disponibili e legge metadata freschi dal worker. Per tabelle e viste offre le prime 100 righe e la generazione di un `SELECT`; per gli oggetti supportati offre definizione e copia nome; sulle tabelle può avviare il reverse engineering. Una query generata apre la sessione corretta, anche quando appartiene a una tab non attiva.

## Reverse Engineering da metadata

Il wizard non riparsa il testo del file: usa `database_list`, `sqlite_schema` e le PRAGMA `table_xinfo`, `foreign_key_list`, `index_list` e `index_xinfo`.

- conserva l'ordine delle primary key e delle foreign key composte;
- risolve una colonna target FK omessa tramite la PK ordinata della tabella destinazione;
- converte indici unique semplici in vincoli logici;
- segnala tabelle senza PK e riferimenti non risolti;
- conserva viste, trigger, indici parziali/a espressione e tabelle virtuali in un file `*-extras.sql` opzionale.

Le destinazioni sono: nuovo schema nel progetto corrente, nuovo progetto, oppure sostituzione confermata dello schema attivo. L'applicazione è effettuata solo al termine del wizard; un cambiamento DDL durante l'anteprima rende l'analisi stale e obbliga al refresh.

## Test e pubblicazione

- `test/database-workspace.test.ts`: validazione, nomi, dirty state, protocollo e adapter metadata.
- `tests/e2e/database-workspace.spec.ts`: SQLite WASM reale, apertura senza progetto, query, edit, export, restore, reverse, Axe e file non valido.
- `npm run build -- --base=/buildER/`: verifica asset worker/WASM per GitHub Pages.

La feature non usa backend, AI, telemetry, CDN SQLite, OPFS obbligatorio o persistenza automatica.
