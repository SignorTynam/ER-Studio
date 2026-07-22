# Prompt — Fase J: Nome del progetto alla creazione + Drag & drop nell'Explorer (per Claude Code)

> Incolla tutto ciò che segue in Claude Code, dalla root del progetto ER Studio / buildER.
> Prerequisiti: Fasi A–I completate (design system, primitivi condivisi in `src/components/ui/`, superfici ridisegnate, a11y/responsive, ecc.). Rispetta le regole invarianti in `CLAUDE.md`.

---

## Contesto

App React + TypeScript + Vite per diagrammi ER, con Explorer in stile IDE (VS Code / Cursor). Due lacune rispetto a quello standard:

1. **La creazione del progetto non chiede il nome.** `handleNewProject()` in `App.tsx` (~riga 4598) crea il progetto con il nome di default `t("workspace.newDiagramName")` ("Nuovo diagramma") **senza chiedere nulla all'utente**. Esiste già la chiave i18n `projectName` ("Nome progetto") e un flusso `createProjectFromSchema(request.projectName, schema)` che accetta un nome.
2. **L'Explorer non ha drag & drop.** Non esiste alcuna logica di spostamento/riordino nel file-tree (verificato: nessun `moveNode`/`reparent` in `utils/projectExplorer.ts`; l'unico DnD è il **riordino delle tab** in `components/project/ProjectFileTabs.tsx`, `handleProjectTabReorder`, utile come riferimento di stile). Trascinare file dentro/fuori le cartelle è uno standard VS Code oggi assente.

**File e simboli rilevanti (Explorer):**
- `components/project/ProjectExplorer.tsx` — pannello, tree root, handler.
- `components/project/ProjectExplorerTreeItem.tsx` — riga (`role="treeitem"`, `data-project-node-id`, navigazione tastiera già presente in `handleKeyDown`), rename/create inline.
- `components/project/ProjectExplorerContextMenu.tsx` — menu contestuale.
- `utils/projectExplorer.ts` — stato e utilità del tree (`sortProjectExplorerNodes`, `resolveExplorerCreationParent`, `createEmptyProjectExplorerState`, ecc.).
- `App.tsx` — handler: `handleProjectExplorerCreateSchema/TextFile/SqlFile/Folder`, `handleProjectExplorerRename`, `handleProjectExplorerDelete`, `handleProjectExplorerToggleFolder`, `handleProjectExplorerSelectNode`.
- **Validazioni già esistenti** (create/rename): nome vuoto, caratteri `\ /`, **nomi duplicati nella cartella di destinazione**. Vanno riusate per lo spostamento.

## Obiettivo della Fase J

- **J1** — Alla creazione di un progetto, chiedere il **nome** (default "Nuovo diagramma" pre-compilato e pre-selezionato). *Blocco a rischio basso: fallo per primo.*
- **J2** — **Drag & drop nell'Explorer:** spostare file/cartelle dentro/fuori le cartelle e riordinare, con validazione, singolo undo e alternativa da tastiera. *Blocco delicato: tocca la logica del tree.*

## Strumenti da sfruttare (plugin, skill e MCP)

All'avvio, **rileva quali skill e server MCP sono disponibili e autenticati**; usa quelli presenti, **salta con eleganza** quelli non disponibili e **dichiara** cosa hai usato.

- **`design:design-critique`** — sull'interazione di drag & drop (indicatori di drop, feedback) prima di implementarla.
- **`design:ux-copy`** — testo del dialog "Nuovo progetto", label del campo nome, messaggi di validazione, voci di menu ("Sposta in…"), in `en`/`it`/`sq`.
- **`design:accessibility-review`** — dopo: il DnD deve avere un'alternativa da tastiera; il dialog deve avere focus trap e submit con Invio.
- **`design:design-system`** — solo token e primitivi condivisi.
- **Playwright** (già configurato) — test: creazione con nome personalizzato/validazione; spostamenti validi e rifiutati; undo.
- **Figma** (se connesso) — riferimenti visivi per gli indicatori di drop; mappa le variabili ai token.

## Task

### J1 — Nome del progetto alla creazione
- Sostituisci in `handleNewProject()` la creazione silenziosa con un **dialog** (Modal shell `src/components/ui/Modal.tsx` + `Field`) che chiede il nome del progetto.
- **Default:** campo pre-compilato con "Nuovo diagramma" (`t("workspace.newDiagramName")`), testo pre-selezionato per sovrascrittura immediata (come fa il rename inline dell'Explorer).
- **Validazione:** riusa le regole esistenti — nome non vuoto, niente caratteri `\ /`; trimming. In caso di errore, messaggio inline con `aria-invalid`.
- **Comportamento:** Invio conferma, Esc annulla (nessun progetto creato), focus trap. Se l'utente conferma senza modificare, il progetto si chiama "Nuovo diagramma" (comportamento attuale preservato).
- Applica lo stesso nome a `createEmptyProjectExplorerState(nome)` e al diagramma (`createEmptyDiagram(nome)`), coerentemente con quanto già fatto oggi con il default.
- Verifica gli **altri punti d'ingresso** alla creazione (es. welcome page / `NoProjectWelcomePage`, command palette) così che tutti passino dallo stesso dialog o dallo stesso nome scelto — niente scorciatoie che ricreano il progretto senza nome.
- **i18n:** titolo dialog, label campo (`projectName` esiste già), placeholder, azioni, errori in `en`/`it`/`sq`.

### J2 — Drag & drop nell'Explorer

**J2.a — Logica di spostamento (prima il modello, poi la UI)**
- Aggiungi in `utils/projectExplorer.ts` una funzione pura `moveNode(state, nodeId, targetParentId, position?)` che restituisce il nuovo stato, con **tutte** le regole di validazione:
  - la destinazione deve essere una **cartella** (o la root);
  - **vietato** spostare una cartella dentro sé stessa o un proprio discendente;
  - **vietato** creare un duplicato di nome nella cartella di destinazione (riusa la stessa regola di create/rename); in tal caso l'operazione è rifiutata con messaggio chiaro (non sovrascrivere, non rinominare automaticamente senza chiedere);
  - no-op se la destinazione coincide con il parent attuale e la posizione non cambia;
  - mantieni l'ordinamento con `sortProjectExplorerNodes` (o gestisci il riordino esplicito se introduci posizioni manuali — decidilo e dichiaralo).
- Esponi `handleProjectExplorerMove(...)` in `App.tsx` che applica `moveNode` ed è **un singolo step di undo** (stesso meccanismo di history usato da create/rename/delete). Aggiorna la persistenza/dirty-state come per le altre operazioni sul tree.

**J2.b — Interazione drag & drop**
- Rendi le righe (`ProjectExplorerTreeItem.tsx`) trascinabili; al drag mostra indicatori chiari (solo token): evidenzia la **cartella di destinazione** e, per il riordino, una **linea di inserimento** tra le righe. Espandi automaticamente una cartella su cui si sosta (hover-to-expand) con un piccolo ritardo.
- Rifiuta visivamente i drop non validi (cursore/indicatore di "non consentito") secondo le regole di J2.a.
- Riusa lo stile/pattern del riordino tab esistente dove sensato, ma non forzare: il tree ha esigenze diverse (annidamento).
- **Performance:** fluido anche con molti file/cartelle.

**J2.c — Accessibilità (obbligatoria, non opzionale)**
- Il DnD deve avere un'**alternativa da tastiera**: aggiungi al menu contestuale e alla tastiera un flusso "Taglia" + "Incolla nella cartella" **oppure** "Sposta in…" (dialog con scelta della cartella di destinazione). Deve essere completamente utilizzabile senza mouse.
- Non rompere la navigazione a frecce / `F2` / `Delete` / menu contestuale già presente in `handleKeyDown`.
- Annuncia l'esito dello spostamento (es. `aria-live` o toast) per gli screen reader.

## Vincoli globali

- Solo token e primitivi condivisi (`src/components/ui/*`); nessun colore/spaziatura hardcoded.
- Ogni stringa via `t(...)` in `en` / `it` / `sq`.
- Ogni spostamento e ogni creazione: coerenti con dirty-state, salvataggio e **undo in un singolo step**.
- Nessuna regressione: create/rename/delete inline, validazione, resizer, collapse, navigazione tastiera del tree devono continuare a funzionare.
- Nessuna perdita di dati: uno spostamento non valido viene rifiutato in modo pulito, mai eseguito a metà.
- Nessuna nuova dipendenza (niente librerie DnD esterne) senza conferma esplicita.
- Un blocco per commit: J1, poi J2.a, poi J2.b, poi J2.c.

## Verifica di chiusura

- [ ] `npm run build` verde; test in `test/` + Playwright verdi.
- [ ] J1: creando un progetto compare il dialog col nome; default "Nuovo diagramma" pre-selezionato; validazione (vuoto, `\ /`) attiva; Invio/Esc/focus trap corretti; tutti i punti d'ingresso passano dal nome scelto.
- [ ] J2.a: `moveNode` copre tutte le regole (cartella-in-sé, discendente, duplicato, no-op); spostamenti reversibili in un singolo undo; test unitari sui casi limite.
- [ ] J2.b: drop su cartella e riordino funzionano con indicatori chiari; drop non validi rifiutati visivamente; hover-to-expand; performance ok su tanti file.
- [ ] J2.c: spostamento completabile **da sola tastiera**; navigazione a frecce/F2/Delete/menu intatta; esito annunciato per screen reader.
- [ ] `design:accessibility-review` pulito su Explorer e dialog; `design:design-system` senza nuovi hardcoded.
- [ ] i18n allineata en/it/sq; `DESIGN-SYSTEM.md` aggiornato (dialog creazione, pattern DnD del tree) con nota di sintesi e **strumenti usati**.

## Come iniziare

1. Rileva skill e MCP disponibili/autenticati e dichiarali.
2. Esegui **J1** (rischio basso) e chiudilo con un commit.
3. Passa a **J2.a** (logica pura + test) prima di qualsiasi UI; poi J2.b (interazione) e J2.c (accessibilità), un blocco per commit, verificando prima di proseguire.

---

> Nota autenticazione MCP: se Figma o altri connettori non sono autenticati, avvisami e procedi senza; potrò autenticarli con `/mcp` in Claude Code. Playwright non richiede autenticazione.
> J2 è la parte più delicata perché tocca la logica del file-tree: la regola d'oro è **prima la funzione pura con validazione e test, poi l'interazione**. Uno spostamento ambiguo non va indovinato: va rifiutato o chiesto.
