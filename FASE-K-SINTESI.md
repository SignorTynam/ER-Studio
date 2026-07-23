# Fase K — Sintesi: reverse engineering SQL, rendere visibile ciò che il motore sa

Obiettivo: il parser SQL era già ricco — 5 dialetti, 17 codici di problema tipizzati, span sorgente,
statement non supportati strutturati — ma l'interfaccia ne mostrava una frazione. Questa fase **espone
dati già esistenti**, senza toccare il comportamento di analisi.

Principio guida: *l'utente deve sempre poter distinguere un proprio errore da un limite dello
strumento, e sapere cosa è finito nel diagramma e cosa no.*

## Strumenti usati (rilevati e dichiarati)

- **`design:ux-copy`** — usato per il cuore della fase (K4): 17 titoli + 17 spiegazioni + 3 etichette
  di categoria, in en/it/sq. Vincolo che ha guidato la scrittura: ogni spiegazione deve dire **cosa
  comporta per il diagramma**, non solo cosa non è stato letto.
- **Browser in-app** — verifica dal vivo di ogni blocco su schemi reali (MySQL con backtick,
  CREATE INDEX + INSERT, ENGINE + tabella duplicata).
- **Playwright** — `tests/e2e/sql-reverse-panel.spec.ts`, una spec consolidata invece di quattro con
  lo stesso seed.
- **Self-check design-system** — solo token e primitivi condivisi (`Badge`, `Tooltip`,
  `.settings-select`); nessun colore/px introdotto a mano.
- **Figma MCP** — non necessario per questa superficie; non usato.

## Scoperta che ha condizionato tutta la fase

Il reverse engineering gira in **beta gated su CREATE TABLE**: `validateSqlReverseBetaSource` parsa e,
se trova un solo statement non supportato, **rifiuta l'intero import**. Gli statement non sono
"ignorati con grazia" come lasciava intendere la traccia: **bloccano**.

Conseguenza pratica: la copy di K2 dice *"non importabili"*, non *"ignorati"*. E il conteggio dei
"costrutti ignorati" a preview aperta può contenere solo issue di categoria `tool-limit` (opzioni di
tabella, vincoli senza equivalente ER), mai statement interi — che a quel punto non possono esistere.

## Blocchi

| blocco | commit | cosa |
|---|---|---|
| K1 | `deaf7d3` | selettore del dialetto, valore fino al parser, ricordato, ri-analisi al cambio |
| K2 | `9f29ca1` | elenco navigabile degli statement non importabili (frammento, riga, motivo) |
| K3 | `1761e7e` | `revealLine` dal popover e dalle liste: scroll, cursore, pulsazione, focus |
| K4 | `6540f37` | i 17 codici → categoria + titolo + spiegazione; catalogo puro + i18n |
| test | `9bb38cc` | spec Playwright consolidata K1–K4 |

**K5 (riepilogo dell'import): proposto ma mai deciso** — resta aperto. Nella proposta avevo escluso lo
split "6 entità + 2 associazioni" perché la provenienza delle relazioni non è esposta dal risultato e
il numero rischiava di contraddire ciò che è disegnato.

## Le due ambiguità dichiarate (K4)

La traccia chiedeva di dichiarare le categorie ambigue invece di forzarle:

- **`MISSING_COLUMN_TYPE`** → messo in `sql-error`, ma una colonna senza tipo è **legale in SQLite**.
  La copy resta gentile ("l'attributo viene creato senza tipo"), non parla di errore.
- **`UNRESOLVED_REFERENCE`** → messo in `sql-error` (riferimento a una tabella non nello schema), ma
  potrebbe essere un limite del parser. La conseguenza — nessuna relazione disegnata — è la stessa.

## Verifica

- **`npm run build`** verde; **`npm test`** 744 pass / 0 fail / 2 skip.
- **`test/sql-reverse-issue-catalog.test.ts`**: i 17 codici sono tutti categorizzati, le 3 categorie
  sono tutte usate, e i casi chiave della distinzione sono fissati.
- **Playwright** `tests/e2e/sql-reverse-panel.spec.ts`: dialetto che arriva al parser (MySQL legge i
  backtick), elenco con frammento e riga 6/8, salto verificato leggendo `selectionStart` della
  textarea (non a occhio), categorie/titoli/spiegazioni presenti e **nessun codice grezzo** a schermo.
- **i18n** allineata en/it/sq (parità garantita da `test/i18n.test.ts`).
