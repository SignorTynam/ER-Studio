# Prompt — Fase H: Da diagnostica passiva a correzione guidata (per Claude Code)

> Incolla tutto ciò che segue in Claude Code, dalla root del progetto ER Studio / buildER.
> Prerequisiti: Fasi A–G completate (design system, primitivi condivisi, superfici ridisegnate, a11y/responsive, navigazione canvas e sua rifinitura). Rispetta le regole invarianti in `CLAUDE.md`.

---

## Contesto

App React + TypeScript + Vite per diagrammi ER. L'esperienza di **validazione del modello** è già matura sul piano infrastrutturale:

- `ValidationIssue` (`src/types/diagram.ts`): `{ id, level: "warning" | "error", message, targetId, targetType: "node" | "edge" }`.
- `src/utils/validationIssuePresentation.ts`: trasforma l'issue in `ValidationIssuePresentation` `{ id, level, targetId, targetType, title, targetKind, message }` e localizza **15 tipi di problema** distinti per prefisso dell'id: `attribute-conflict-`, `attribute-invalid-cardinality-`, `attribute-` (host mancante), `relationship-identifier-`, `relationship-` (servono entità), `loop-role-missing-`, `loop-role-duplicate-`, `entity-no-attributes-`, `subtype-no-attributes-`, `supertype-no-relationship-`, `weak-entity-` (identificatore esterno mancante), `missing-` (endpoint arco), `invalid-` (connessione non valida), `duplicate-` (arco duplicato), `cardinality-` (cardinalità mancante).
- `src/components/validation/ErrorsPanel.tsx`: pannello con filtri (tutti/errori/avvisi), conteggi, navigazione da tastiera (frecce/Home/End/Enter), empty state, toggle degli indicatori sul canvas.
- `App.tsx`: `handleIssueNotice(issue)` → mostra il messaggio e chiama `selectIssueTarget(issue)`, che **seleziona il target e centra il viewport** su di esso.
- Badge con conteggio sull'activity rail (`getValidationActivityPresentation`).

**Il problema da risolvere:** l'app comunica sempre **cosa** è sbagliato, mai **come** sistemarlo. `ValidationIssuePresentation` porta solo `title`, `targetKind` e `message`: nessuna azione suggerita. L'utente riceve una diagnosi e deve dedurre da solo dove intervenire. Per un tool di modellazione ER — a maggior ragione se usato per studiare — questo è il punto di maggior valore mancante: la validazione è l'unico momento in cui l'app *insegna*.

**Bug collaterale da correggere:** in `App.tsx` ci sono **22 stringhe italiane hardcoded** passate a `setStatus(...)` / `setStatusMessage(...)`, che bypassano `t(...)` — fra cui **tutti e 4 gli step del tour guidato** (righe ~1938, 1944, 1950, 1955) e messaggi come `"Vista ER attiva."` (~4149), `"Sessione precedente ripristinata automaticamente."` (~1485), `"Tour chiuso. Ora puoi modellare liberamente."` (~1816). Un utente `en` o `sq` vede testo italiano proprio durante l'onboarding. Viola la regola invariante n.2 di `CLAUDE.md`.

## Obiettivo della Fase H

1. **H1** — Riportare le 22 stringhe hardcoded dentro l'i18n (correzione indipendente, da fare per prima).
2. **H2** — Definire il **catalogo delle correzioni** per i 15 tipi di problema.
3. **H3** — Estendere il modello dati con le azioni suggerite.
4. **H4** — Esporre le quick fix nell'interfaccia (pannello errori e, se sensato, contestualmente).
5. **H5** — Verifica.

## Strumenti da sfruttare (plugin, skill e MCP)

All'avvio, **rileva quali skill e server MCP sono disponibili e autenticati**; usa quelli presenti, **salta con eleganza** quelli non disponibili e **dichiara** cosa hai usato.

- **`design:ux-copy`** — centrale qui: i messaggi d'errore e le label delle azioni sono il cuore della feature. Devono spiegare il problema in modo comprensibile e nominare l'azione in modo inequivocabile, in `en`/`it`/`sq`.
- **`design:design-critique`** — sulla UI delle quick fix nel pannello errori, prima di implementarla.
- **`design:accessibility-review`** — dopo: le azioni devono essere raggiungibili da tastiera senza rompere la navigazione a frecce già presente nel pannello.
- **`design:design-system`** — verifica uso di token e primitivi.
- **Playwright** (già configurato) — test end-to-end: da errore a modello corretto, con undo funzionante.
- **Figma** (se connesso) — eventuali riferimenti visivi; mappa le variabili ai token.

## Task

### H1 — Rientro delle stringhe hardcoded nell'i18n (fallo per primo, commit a sé)
- Trova tutte le occorrenze di `setStatus("...")` / `setStatusMessage("...")` con testo letterale in `src/App.tsx` (ne risultano 22).
- Sostituiscile con chiavi i18n, aggiunte a `src/i18n/messages/en.ts`, `it.ts`, `sq.ts` con traduzioni corrette in tutte e tre.
- Presta attenzione agli **step del tour guidato**: sono onboarding, quindi usa `design:ux-copy` per una resa curata e coerente col resto del Quick tour già rifinito in Fase C5.
- Verifica che non restino altri testi utente hardcoded nella logica (controlla anche eventuali `title`, `label`, `alert`, `confirm` letterali).

### H2 — Catalogo delle correzioni (progettazione, PRIMA di scrivere codice)
Per ciascuno dei 15 tipi di problema, proponi in una tabella: **problema → azione suggerita → categoria**. Le categorie sono due:

- **Correzione diretta (auto-fix):** l'app può risolvere senza ambiguità semantica. Esempi plausibili: rimuovere un arco duplicato, eliminare un arco con endpoint mancante, eliminare un attributo orfano. Deve essere **un singolo step di undo** e non deve mai distruggere lavoro non correlato.
- **Correzione guidata (navigate-to-fix):** la decisione è dell'utente; l'app porta nel posto giusto e prepara il contesto. Esempi plausibili: cardinalità mancante → apre il `CardinalityModal` già esistente sull'arco corretto; entità debole senza identificatore esterno → seleziona l'entità e apre/mette a fuoco la sezione identificatore esterno nell'inspector (`inspector/ExternalIdentifierSection.tsx`); entità senza attributi → attiva la creazione di un attributo collegato a quell'entità; ruolo mancante in relazione ad anello → mette a fuoco il campo del ruolo.

**Regola non negoziabile:** dove la scelta è semantica (quale attributo è identificatore, quale cardinalità è corretta), l'app **non decide al posto dell'utente**: apre il posto giusto. Meglio nessuna quick fix che una quick fix che indovina.

Alcuni problemi potrebbero non avere un'azione sensata: in tal caso dichiaralo esplicitamente invece di forzarne una.

**Fermati e attendi la mia conferma del catalogo prima di procedere a H3.**

### H3 — Modello dati delle azioni
- Estendi `ValidationIssuePresentation` (in `utils/validationIssuePresentation.ts`) con le azioni suggerite, es. un campo `actions?: ValidationIssueAction[]` dove ogni azione ha `id`, `label` (localizzata), `kind: "auto" | "navigate"` ed eventuale icona `StudioIconName`.
- Mantieni la funzione di presentazione **pura**: deve descrivere *quale* azione è disponibile, non eseguirla. L'esecuzione resta in `App.tsx`, dove vive lo stato del diagramma.
- Riusa il meccanismo di commit esistente (`commitDiagram`) così ogni auto-fix è **un singolo undo**.
- Riusa `selectIssueTarget` per il posizionamento del viewport prima di aprire modali/inspector.

### H4 — Interfaccia
- **Pannello errori:** ogni riga di `ErrorsPanel.tsx` espone la sua azione (bottone o menu se più di una), usando i primitivi `Button`/`PanelIconButton`/`Tooltip` di `src/components/ui/`. Vincolo: **non rompere** la navigazione a frecce e `Enter` già implementata (`handleRowKeyDown`); l'azione deve essere raggiungibile da tastiera in modo prevedibile (proponi lo schema: es. `Tab` dalla riga all'azione, o scorciatoia dedicata).
- **Feedback:** dopo un auto-fix mostra un toast con esito e azione **Annulla** (sistema toast esistente), coerente con quanto proposto per l'auto-layout in Fase G.
- **Correzione guidata:** dopo la navigazione, l'elemento di destinazione deve ricevere il **focus** in modo evidente, così l'utente capisce dove è atterrato.
- Valuta (proponendolo) un accesso contestuale alla quick fix anche dal canvas o dall'inspector quando l'elemento selezionato ha problemi, senza introdurre rumore visivo.

## Vincoli globali

- Solo token e primitivi condivisi; nessun colore/spaziatura hardcoded.
- Ogni stringa via `t(...)` in `en` / `it` / `sq` — è il tema stesso di questa fase.
- Ogni auto-fix: **reversibile in un solo undo**, mai distruttivo oltre il proprio scopo.
- Nessuna regressione funzionale (validazione esistente, navigazione agli errori, indicatori sul canvas, filtri e tastiera del pannello) né di accessibilità.
- Nessuna nuova dipendenza senza conferma.
- Un blocco per commit (H1, poi H3, poi H4). H2 è progettazione e richiede la mia conferma.

## Verifica di chiusura

- [ ] `npm run build` verde; test in `test/` + Playwright verdi.
- [ ] H1: zero stringhe utente hardcoded in `App.tsx`; `en`/`it`/`sq` allineate; tour guidato tradotto e curato.
- [ ] H2: catalogo dei 15 tipi approvato, con categoria e motivazione (incluse le voci senza azione).
- [ ] H3: auto-fix reversibili in un singolo undo; funzione di presentazione rimasta pura.
- [ ] H4: azioni raggiungibili da mouse e tastiera; navigazione a frecce del pannello intatta; toast con Annulla; focus evidente dopo la navigazione.
- [ ] `design:accessibility-review` pulito sul pannello errori; `design:design-system` senza nuovi hardcoded.
- [ ] Test end-to-end di almeno 3 scenari reali: da diagramma con errori a diagramma valido, con undo verificato.
- [ ] `DESIGN-SYSTEM.md` aggiornato (pattern quick fix) e nota di sintesi con **strumenti effettivamente usati**.

## Come iniziare

1. Rileva skill e MCP disponibili/autenticati e dichiarali.
2. Esegui **H1** (correzione i18n, indipendente e a basso rischio) e chiudila con un commit.
3. Passa a **H2**: presentami il catalogo problema → azione → categoria e **attendi conferma**.
4. Solo dopo, implementa H3 e H4, un blocco per commit, verificando prima di proseguire.

---

> Nota autenticazione MCP: se Figma o altri connettori non sono autenticati, avvisami e procedi senza; potrò autenticarli con `/mcp` in Claude Code. Playwright non richiede autenticazione.
> Principio guida della fase: l'obiettivo non è correggere il modello al posto dell'utente, ma **accorciare la distanza tra capire l'errore e saperlo risolvere**.
