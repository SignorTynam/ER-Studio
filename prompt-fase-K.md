# Prompt — Fase K: Reverse engineering SQL — rendere visibile ciò che il motore già sa (per Claude Code)

> Incolla tutto ciò che segue in Claude Code, dalla root del progetto ER Studio / buildER.
> Prerequisiti: Fasi A–J completate (design system, primitivi condivisi in `src/components/ui/`, superfici ridisegnate, a11y/responsive). Rispetta le regole invarianti in `CLAUDE.md`.

---

## Contesto

App React + TypeScript + Vite per diagrammi ER, con funzione di **reverse engineering da SQL**. Il motore è tecnicamente ricco, ma l'interfaccia ne espone solo una frazione: questa fase colma il divario **senza cambiare il parser**, rendendo visibile ciò che il modello dati già contiene.

**Cosa il motore sa già (verificato in `src/types/sqlReverse.ts`):**
- `SqlReverseDialect` = `"generic" | "sqlite" | "postgresql" | "mysql" | "sqlserver"`, con default `"generic"` in `DEFAULT_*_OPTIONS` e campo `dialect` in options e result.
- `SqlReverseIssueCode`: **17 codici tipizzati** — `UNSUPPORTED_STATEMENT`, `UNSUPPORTED_TABLE_OPTION`, `UNSUPPORTED_COLUMN_CONSTRAINT`, `UNSUPPORTED_TABLE_CONSTRAINT`, `DUPLICATE_TABLE_NAME`, `DUPLICATE_COLUMN_NAME`, `MISSING_TABLE_NAME`, `MISSING_COLUMN_NAME`, `MISSING_COLUMN_TYPE`, `INVALID_CREATE_TABLE`, `INVALID_PRIMARY_KEY`, `INVALID_FOREIGN_KEY`, `INVALID_UNIQUE_CONSTRAINT`, `UNRESOLVED_REFERENCE`, `UNSUPPORTED_ALTER_TABLE`, `UNSUPPORTED_INDEX`, `PARSER_RECOVERY`.
- `SqlReverseIssue` porta `code`, `message`, `rawFragment`, `statementIndex` e `sourceSpan { start, end, line?, column? }`.
- `SqlUnsupportedStatement` è un tipo strutturato; il risultato espone `unsupportedStatements` e `unsupportedStatementCount`.

**Cosa arriva oggi all'utente (verificato in `components/reverse/SqlReversePanel.tsx`):**
- Il pannello mostra le issue come **stringhe piatte** (`buildDiagnostics` usa solo `message`, `level`, riga/colonna); **`code` e `rawFragment` vengono scartati**.
- **Nessun selettore di dialetto** nell'interfaccia: l'utente non può dichiarare che il SQL è MySQL o SQL Server.
- Gli statement non supportati sono solo un **conteggio** nel footer (`t("sqlReversePanel.unsupported", { count })`): non c'è modo di vedere **quali**.
- `CodeEditorSurface` evidenzia le righe con problemi e ha un popover navigabile, ma **manca un "vai alla riga"** che porti il cursore al punto esatto del SQL a partire dal messaggio.
- `SqlReversePreviewFrame` propone solo **Fatto / Annulla** sull'intero import: nessun riepilogo di cosa verrà creato.

**File coinvolti:** `components/reverse/SqlReversePanel.tsx`, `components/editor/CodeEditorSurface.tsx`, `components/SqlReversePreviewFrame.tsx`, `types/sqlReverse.ts`, `utils/sqlReverseParser.ts` (sola lettura, salvo passaggio del dialetto), `App.tsx` (`sqlReverseWorkflow`, `handleAnalyzeSqlReverseWorkflow`, `handleLoadSqlReverseFile`), i18n `en`/`it`/`sq`.

## Obiettivo della Fase K

Rendere il reverse engineering **comprensibile e affidabile**, distinguendo sempre *"ho scritto male io"* da *"il tool non supporta questo costrutto"*. In blocchi a rischio crescente:

- **K1** — Selettore del dialetto SQL.
- **K2** — Elenco navigabile degli statement non supportati.
- **K3** — Salto alla riga dalla diagnostica.
- **K4** — I 17 codici diventano spiegazioni comprensibili.
- **K5** — Riepilogo dell'import prima di applicare *(opzionale, da confermare)*.

## Strumenti da sfruttare (plugin, skill e MCP)

All'avvio, **rileva quali skill e server MCP sono disponibili e autenticati**; usa quelli presenti, **salta con eleganza** quelli non disponibili e **dichiara** cosa hai usato.

- **`design:ux-copy`** — centrale in K4: scrivere 17 titoli + spiegazioni che un utente capisca, in `en`/`it`/`sq`. È il cuore della fase.
- **`design:design-critique`** — sull'organizzazione del pannello (dialetto, diagnostiche, non supportati) prima di implementare.
- **`design:accessibility-review`** — dopo ogni blocco: liste navigabili da tastiera, focus dopo il salto alla riga, `aria` corretti.
- **`design:design-system`** — solo token e primitivi condivisi.
- **Playwright** (già configurato) — test: parsing con dialetti diversi, elenco non supportati, salto alla riga, riepilogo.
- **Figma** (se connesso) — riferimenti visivi; mappa le variabili ai token.

## Task

### K1 — Selettore del dialetto SQL
- Aggiungi nel `SqlReversePanel` un controllo per scegliere il dialetto tra i 5 valori di `SqlReverseDialect`, con `"generic"` come default (comportamento attuale preservato).
- Collega la scelta alle options passate al parser (`dialect` esiste già in `SqlReverseOptions`): **non modificare la logica di parsing**, solo far arrivare il valore scelto.
- Ri-analizza automaticamente al cambio dialetto se un'analisi è già stata fatta, oppure segnala chiaramente che serve rilanciare l'analisi (scegli e dichiara il comportamento).
- Etichette dei dialetti e tooltip esplicativo (`design:ux-copy`), i18n in `en`/`it`/`sq`.
- Considera di ricordare l'ultima scelta come preferenza (coerentemente con la schermata Impostazioni della Fase I, se già presente).

### K2 — Elenco degli statement non supportati
- Il conteggio nel footer diventa **cliccabile** e apre/espande un elenco degli `unsupportedStatements`: per ciascuno, il frammento SQL (`rawFragment` o equivalente), la riga, e il motivo.
- Usa i primitivi condivisi (lista, `Badge`, `Button`); navigabile da tastiera.
- Messaggio chiave da comunicare: **cosa è stato ignorato e perché**, così l'utente non teme una perdita silenziosa di dati.

### K3 — Salto alla riga dalla diagnostica
- Da un messaggio di diagnostica (nel popover di `CodeEditorSurface` e dalle liste di K2) deve essere possibile **saltare al punto esatto** del SQL: scroll alla riga, cursore posizionato, riga evidenziata temporaneamente.
- `sourceSpan` fornisce già `line`, `column`, `startOffset`, `endOffset`: usali; non ricalcolare posizioni.
- Dopo il salto, il **focus** deve essere prevedibile e visibile (requisito di accessibilità).

### K4 — Dai codici alle spiegazioni (il cuore della fase)
- Crea una mappatura da `SqlReverseIssueCode` a **titolo breve + spiegazione comprensibile**, con una distinzione esplicita di **categoria**:
  - **Errore nel SQL** (es. `INVALID_CREATE_TABLE`, `MISSING_COLUMN_NAME`, `DUPLICATE_TABLE_NAME`) → "c'è un problema nel tuo SQL".
  - **Limite del tool / non rappresentabile in ER** (es. `UNSUPPORTED_INDEX`, `UNSUPPORTED_TABLE_OPTION`, `UNSUPPORTED_COLUMN_CONSTRAINT`) → "questo costrutto esiste ma non ha senso in un diagramma ER, lo ignoro".
  - **Recupero del parser** (`PARSER_RECOVERY`) → "ho saltato una parte per continuare".
  - Colloca ogni codice in una categoria; se per qualcuno la categoria è ambigua, dichiaralo invece di forzarlo.
- Mostra nel pannello: titolo comprensibile, categoria (badge), messaggio, `rawFragment` quando utile, e riga cliccabile (K3).
- **Vincolo:** la spiegazione deve dire cosa comporta per il diagramma risultante, non solo cosa non è stato letto.
- Tutte le stringhe in `en`/`it`/`sq`, scritte con `design:ux-copy`. **Presentami la tabella codice → titolo → categoria → spiegazione e attendi conferma prima di implementare.**

### K5 — Riepilogo dell'import *(opzionale — proponi e attendi conferma)*
- Prima di applicare, il `SqlReversePreviewFrame` mostra un riepilogo sintetico del tipo: *"8 tabelle → 6 entità + 2 associazioni; 4 chiavi esterne → 4 relazioni; 3 costrutti ignorati"*.
- Valuta se è utile e fattibile con i dati già disponibili nel risultato. **Non introdurre** selezione/esclusione parziale degli oggetti in questa fase: sarebbe un cambiamento funzionale profondo, da trattare a parte.

## Vincoli globali

- **Non modificare la logica del parser** (`sqlReverseParser.ts`) se non per ricevere il dialetto scelto. Questa fase espone informazioni esistenti, non cambia il comportamento di analisi.
- Solo token e primitivi condivisi; nessun colore/spaziatura hardcoded.
- Ogni stringa via `t(...)` in `en` / `it` / `sq`.
- Nessuna regressione: analisi, import da file, preview, conferma/annulla, evidenziazione righe, popover diagnostiche.
- Nessuna nuova dipendenza senza conferma.
- Un blocco per commit (K1 → K2 → K3 → K4 → K5). K4 richiede la mia conferma della tabella; K5 va proposta prima.

## Verifica di chiusura

- [ ] `npm run build` verde; test in `test/` + Playwright verdi.
- [ ] K1: dialetto selezionabile fra i 5 valori; default `generic` invariato; il valore arriva al parser; comportamento al cambio dichiarato e coerente.
- [ ] K2: statement non supportati elencabili con frammento e motivo; navigabili da tastiera.
- [ ] K3: dal messaggio si salta alla riga corretta, con focus visibile; verificato su un file SQL lungo (usa `examples/sql-reverse/*.sql`).
- [ ] K4: tabella dei 17 codici approvata e implementata; ogni diagnostica mostra titolo, categoria e spiegazione; distinzione errore-utente / limite-tool sempre chiara.
- [ ] K5: proposta presentata; implementata solo se confermata.
- [ ] `design:accessibility-review` pulito sul pannello reverse; `design:design-system` senza nuovi hardcoded.
- [ ] i18n allineata en/it/sq; `DESIGN-SYSTEM.md` aggiornato e nota di sintesi con **strumenti effettivamente usati**.

## Come iniziare

1. Rileva skill e MCP disponibili/autenticati e dichiarali.
2. Verifica sui file di esempio in `examples/sql-reverse/` (`company.sql`, `library.sql`, `university.sql`, `mysql-style.sql`) — quest'ultimo è ideale per testare K1.
3. Esegui **K1**, poi K2, poi K3 (blocchi concreti e a rischio basso), un commit ciascuno.
4. Passa a **K4** presentandomi prima la tabella dei codici. Proponi K5 solo alla fine.

---

> Nota autenticazione MCP: se Figma o altri connettori non sono autenticati, avvisami e procedi senza; potrò autenticarli con `/mcp` in Claude Code. Playwright non richiede autenticazione.
> Principio guida della fase: l'utente deve sempre poter distinguere **un proprio errore** da **un limite dello strumento**, e sapere esattamente cosa è finito nel diagramma e cosa no.
