# Fase H — Sintesi: da diagnostica passiva a correzione guidata

Obiettivo: accorciare la distanza tra *capire* un errore di validazione e *saperlo risolvere*, senza
mai decidere la semantica al posto dell'utente. *Meglio nessuna quick fix che una che indovina.*

## Cosa è cambiato (blocchi H1→H5)

| Blocco | Prima | Dopo | Commit |
|---|---|---|---|
| **H1** | 26 stringhe di stato hardcoded in `App.tsx` | tutte via `t(...)`, allineate en/it/sq | `dfeaf0e` |
| **H3** | il pannello Errori descriveva solo *cosa* è sbagliato | catalogo puro problema→azione (`getValidationIssueActions`) + dispatcher esecuzione (`handleValidationIssueAction`) | `c0e4224` |
| **H4** | righe di sola lettura | ogni riga espone la sua azione (PanelIconButton + Tooltip), navigazione tastiera invariata, toast Annulla dopo auto-fix | `7fbd263` |
| **H5** | — | estrazione `computeValidationAutoFix` testabile, test modello + e2e, docs | *(questo commit)* |

## Catalogo azioni (H2, confermato)

15 tipi di problema → **7 auto** / **6 navigate** / **2 senza azione**.

- **auto** (correzione non ambigua, singolo undo, toast Annulla): elimina collegamento
  `missing-`/`invalid-`/`duplicate-`, elimina attributo orfano `attribute-`, azzera cardinalità
  non ammessa `attribute-invalid-cardinality-`, **aggiungi attributo** `entity-no-attributes-` /
  `subtype-no-attributes-` (crea un attributo di default che l'utente rinomina).
- **navigate** (porta nel posto giusto, l'utente decide, nessun default sensato):
  `attribute-conflict-` e `relationship-identifier-` → proprietà; `loop-role-*` → ruolo;
  `weak-entity-` → identificatore esterno; `cardinality-` → imposta cardinalità.

> **Correzione post-feedback:** `entity-no-attributes-` / `subtype-no-attributes-` erano `navigate`,
> ma l'etichetta "Aggiungi attributo" prometteva di *aggiungere* mentre si limitava a navigare (il
> warning restava). Un attributo vuoto è uno scaffold — non un'ipotesi semantica — e l'app ha già il
> comando "aggiungi attributo alla selezione": promosso quindi ad `auto` (riusa `createAttributeForHost`).
- **nessuna azione** (dichiarata esplicitamente): `relationship-` (relazione senza entità),
  `supertype-no-relationship-`.

## Principi implementativi

- **Presentazione pura**: `utils/validationIssuePresentation.ts` dice *quale* azione offrire, non la
  esegue. L'esecuzione vive in `App.tsx`.
- **Un singolo undo**: ogni auto-fix passa da `computeValidationAutoFix` → `commitDiagram(next, prev)`.
- **Accessibilità preservata**: la riga passa a `div[role="option"]` focusabile; l'azione è in uno
  `span` sorella rivelato su hover/focus-within/selezione — fuori dal tab order quando la riga non è
  attiva, raggiungibile appena riceve il focus. Frecce/Home/End/Enter invariati.

## Verifica (tool usati)

- **`npm run build`** (`tsc -b && vite build`) — verde.
- **`npm test`** — 727 pass / 0 fail / 2 skip. Nuovi: `test/validation-issue-actions.test.ts`
  (catalogo + ordine prefissi + invariante auto/navigate), `test/validation-auto-fix.test.ts`
  (per ogni auto: **errore → modello valido**, input non mutato ⇒ undo affidabile, inclusa l'aggiunta
  attributo via `createAttributeForHost`).
- **Playwright** `tests/e2e/errors-quick-fix.spec.ts` — flusso reale: azione per riga, navigazione a
  frecce preservata, **axe pulito** sul pannello, **"Aggiungi attributo" aggiunge il nodo e risolve
  l'avviso** (2→1) con toast Annulla.
- **i18n** `test/i18n.test.ts` — parità en/it/sq delle nuove chiavi (`validationIssues.actions.*`,
  `workspace.validationFix.*`).

## Nota onesta sulla raggiungibilità degli auto-fix

L'auto-fix **"aggiungi attributo"** è pienamente raggiungibile dalla UI (basta un'entità senza
attributi) ed è verificato end-to-end. Gli auto-fix di **rimozione** (collegamento invalido/mancante/
duplicato, attributo orfano, cardinalità non ammessa) invece **non** sono raggiungibili dalla UI
normale: l'app impedisce di creare attributi orfani (lo strumento attributo richiede un host) e
collegamenti incompatibili, e la cancellazione di un'entità fa cascata sui suoi attributi. Nascono
quindi solo da **dati legacy/importati** o reverse engineering, perciò la loro correttezza (errore →
modello valido, singolo undo) è verificata in modo **deterministico a livello di modello**
(`test/validation-auto-fix.test.ts`). Il meccanismo toast+Annulla è lo stesso dell'auto-layout
(Fase G5), già coperto da e2e.
