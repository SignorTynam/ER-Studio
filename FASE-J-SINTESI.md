# Fase J — Sintesi: nome del progetto alla creazione + spostamento nell'Explorer

Obiettivo: due miglioramenti di workflow nell'Explorer. **J1** — chiedere il nome quando si crea un
progetto (niente più nome implicito). **J2** — poter **spostare** file/cartelle nell'albero, sia con
il mouse (drag & drop) sia **completamente da tastiera**. Un blocco = un commit.

## Strumenti usati (rilevati e dichiarati)

- **`design:design-critique`** — eseguito sull'**interazione** del drag & drop *prima* di
  implementarla (indicatori di drop, feedback, non "mockup visivo"). Esiti applicati:
  - Confermato il modello **reparenting-only**: l'albero è sempre ordinato come VS Code, quindi niente
    linee di inserimento tra righe — si sposta *dentro* una cartella, non *tra* due righe.
  - Un **solo** bersaglio evidenziato per volta; trascinando su un file si evidenzia il suo genitore
    (feedback coerente con dove il nodo finirà davvero).
  - Serve un percorso **senza mouse** equivalente → nasce *"Sposta in…"* (J2.c).
- **Playwright** (già configurato) — `tests/e2e/project-name.spec.ts` (J1) e
  `tests/e2e/explorer-move.spec.ts` (J2.c): percorso da tastiera, annuncio, destinazioni non valide.
- **Self-check design-system / a11y** — solo token e primitivi `ui/`; `MoveToDialog` su `ui/Modal`,
  status bar `aria-live` per l'annuncio; nessun colore/px hardcoded introdotto.
- **Nessuna libreria DnD esterna** (vincolo CLAUDE.md): drag & drop HTML5 nativo. Figma MCP non
  necessario per questa superficie.

## J1 — Nome del progetto alla creazione

- `handleNewProject` parte dal prompt riusabile `requestPromptDialog` (`hooks/useAppDialogs.ts`),
  esteso con una opzione **`validate`** (eseguita dopo il check "campo obbligatorio").
- Titolo *Nuovo progetto*, campo *Nome progetto* col default pre-compilato **e pre-selezionato**;
  Invio conferma, Esc annulla senza creare nulla.
- Validazione **coerente con l'albero**: obbligatorio + rifiuto di `/` e `\`
  (`projectExplorer.errors.invalid-characters`). Il nome alimenta diagramma **e** stato Explorer.
- Rischio basso, quindi **primo commit** come da brief.

## J2 — Spostamento nell'albero

### J2.a — Logica pura + test

`moveNode(state, nodeId, targetParentId)` (`utils/projectExplorer.ts`): funzione **pura**, non muta
l'input (→ reversibile in un singolo passo). Rifiuta: destinazione non-cartella (`missing-parent`),
nodo dentro sé stesso/discendente e la root (`invalid-move`), nome duplicato in destinazione
(`duplicate-name`, niente overwrite/auto-rename); **no-op** se già lì. `getValidMoveDestinations`
calcola le sole mete lecite (per il percorso da tastiera). Applicata via `applyProjectExplorerState`,
la stessa unità atomica di create/rinomina/elimina. 11 test in `test/project-explorer-move.test.ts`.

### J2.b — Drag & drop

Contesto React `projectExplorerDnd.ts` (`begin/hoverNode/dropOnNode/end`); ogni riga `draggable`.
Drop su **cartella** → dentro quella; su **file** → nel suo genitore; su area vuota → root. Un solo
`is-drop-target` (ring `--color-accent` + `--color-bg-selected`), origine `is-dragging`; destinazioni
invalide → nessun evidenziato + `dropEffect="none"`. Auto-espansione a 600 ms su cartella collassata.

### J2.c — Alternativa da tastiera + a11y

Il DnD nativo non è operabile senza mouse, quindi il percorso **completo senza mouse** è *"Sposta
in…"* nel menu contestuale (**Shift+F10 / ContextMenu**). Apre `MoveToDialog` (`ui/Modal` `sm`): una
`select` con **solo le destinazioni valide** (rientrate per profondità); se non ce ne sono, messaggio
`moveDialog.noDestinations` e *Sposta* disabilitato. Invio conferma, Esc chiude. L'esito è
**annunciato** dalla status bar `aria-live="polite"` (`status.moved`), come rinomina/elimina.

## Nota su "undo singolo"

Come create/rinomina/elimina, lo stato Explorer vive in `useState` (non nella history del diagramma):
"reversibile in un singolo passo" significa **operazione atomica non-mutante** (garantita dal test di
immutabilità di `moveNode`), non Ctrl+Z — coerente con le altre operazioni dell'albero.

## Verifica

- **`npm run build`** verde; **`npm test`** 738 pass / 0 fail / 2 skip (parità i18n en/it/sq inclusa).
- **Unit** `test/project-explorer-move.test.ts` (11): regole di `moveNode`, immutabilità dell'input,
  `getValidMoveDestinations` (esclude sé, discendenti, genitore attuale).
- **Playwright**: `project-name.spec.ts` (dialog nome: default, validazione vuoto + `/ \`, Invio crea,
  Esc annulla) e `explorer-move.spec.ts` (menu da tastiera → dialog → reparenting con annuncio;
  `draggable="true"` sulle righe; destinazioni non valide mai offerte + *Sposta* disabilitato).
- **i18n**: `projectExplorer.dialogs.*` (J1), `errors.invalid-move` + `status.moved` (J2.a),
  `contextMenu.moveTo` + `moveDialog.*` (J2.c) allineati in **en/it/sq**.
- **Design system / a11y**: solo token e primitivi; menu raggiungibile da tastiera, dialog focus-trap +
  Esc dalla Modal shell, `select` con label, esito annunciato via `aria-live`.
