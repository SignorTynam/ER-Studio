# Prompt — Fase I: Schermata Impostazioni centralizzata (per Claude Code)

> Incolla tutto ciò che segue in Claude Code, dalla root del progetto ER Studio / buildER.
> Prerequisiti: Fasi A–H completate (design system, primitivi condivisi in `src/components/ui/`, superfici ridisegnate, a11y/responsive, navigazione canvas, correzione guidata errori). Rispetta le regole invarianti in `CLAUDE.md`.

---

## Contesto

App React + TypeScript + Vite per diagrammi ER, con UI in stile IDE (tipo VS Code / Cursor). Oggi **le impostazioni esistono ma sono sparse** in punti diversi dell'interfaccia, senza una casa comune. Questo è il buco da colmare: una schermata Impostazioni unica, come in ogni IDE.

**Impostazioni già presenti oggi (da raccogliere, non reinventare):**
- **Lingua:** gestita da `useI18n()` → `locale`, `setLocale`, `SUPPORTED_LOCALES`, `getLanguageMenuLabel`; esposta come menu a tendina in `components/AppHeader.tsx` (`TopbarMenuId` include `"language"`).
- **Indicatori diagnostici sul canvas:** stato `showDiagnostics` in `App.tsx`, persistito nello snapshot di sessione (`features/workspace/workspaceSession.ts`, `WORKSPACE_SESSION_STORAGE_KEY`); oggi si attiva/disattiva solo dal toggle dentro `ErrorsPanel.tsx`.
- **Visibilità minimap:** helper `readCanvasMinimapVisibility` / `writeCanvasMinimapVisibility` in `canvas/CanvasMinimap.tsx`, chiave localStorage `builder:canvas:minimap-visible` (+ varianti `:logical`, `:translation`).
- **Altri stati persistiti** (localStorage): `builder:last-activity-panel`, `builder:source-control:changes-expanded`, `builder:source-control:history-expanded`, `builder:last-seen-release`.

**Persistenza attuale:** frammentata tra lo snapshot JSON di sessione e chiavi `localStorage` ad-hoc. Nessun punto unico di verità per le preferenze.

## Obiettivo della Fase I

Creare **una schermata Impostazioni unica** che raccolga le preferenze esistenti in sezioni chiare, sia apribile con una scorciatoia tipo IDE (`Ctrl+,`) e dalla command palette, e diventi il punto naturale dove aggiungere in futuro il **tema** e la **densità**. Le impostazioni oggi sparse restano funzionanti ma vengono **centralizzate**, non duplicate: gli stessi stati, un posto solo.

Non è un ridisegno delle superfici esistenti: è una nuova superficie che le mette in ordine.

## Strumenti da sfruttare (plugin, skill e MCP)

All'avvio, **rileva quali skill e server MCP sono disponibili e autenticati**; usa quelli presenti, **salta con eleganza** quelli non disponibili e **dichiara** cosa hai usato.

- **`design:design-critique`** — sull'architettura dell'informazione della schermata (quali sezioni, cosa va dove) prima di implementare.
- **`design:ux-copy`** — nomi delle sezioni, label e descrizioni brevi delle singole impostazioni, in `en`/`it`/`sq`.
- **`design:accessibility-review`** — dopo: navigazione tra sezioni e controlli da tastiera, focus trap, `aria` di tablist/lista.
- **`design:design-system`** — verifica uso esclusivo di token e dei primitivi `src/components/ui/*`.
- **Playwright** (già configurato) — test: apertura con `Ctrl+,`, cambio di ogni impostazione, persistenza dopo reload.
- **Figma** (se connesso) — riferimenti visivi per il layout impostazioni; mappa le variabili ai token.

## Task

### I1 — Inventario e architettura (progettazione, PRIMA di scrivere codice)
- Elenca tutte le preferenze esistenti (vedi sopra) e come sono oggi persistite.
- Proponi l'**architettura dell'informazione**: sezioni e quali impostazioni contengono. Proposta di partenza (adattala e confermala con me):
  - **Aspetto** — Lingua (oggi). Predisponi lo spazio per *Tema* e *Densità* (segnaposto o voci disabilitate "in arrivo", da attivare in fasi successive).
  - **Diagramma / Canvas** — Indicatori diagnostici sul canvas; Minimap visibile di default; (griglia/snap **solo se** esistono già come opzioni — verifica, non inventare feature nuove).
  - **Editor** — eventuali preferenze di editing già presenti.
  - **Scorciatoie** — riepilogo/scorciatoia che apre il `KeyboardShortcutsModal` esistente (non duplicare la lista).
  - **Info** — versione, changelog (riusa `ChangelogModal`), link.
- Proponi il **meccanismo di apertura**: **modale** basato sulla Modal shell (`src/components/ui/Modal.tsx`) con nav a sinistra e contenuto a destra, **oppure** pannello dedicato. Raccomanda uno dei due con motivazione e **attendi la mia conferma** prima di I2.
- Decidi con me se la lingua **resta anche** nel menu header (come scorciatoia) o si sposta interamente nelle Impostazioni. In ogni caso deve leggere/scrivere **lo stesso stato** (`setLocale`), senza duplicare la logica.

### I2 — Costruzione della schermata
- Implementa la superficie Impostazioni con i **primitivi condivisi**: Modal shell, `Field` (per select/checkbox/radio), `Button`, `Tooltip`, `Badge`, righe di lista. Solo token per lo stile.
- **Struttura tipo IDE:** colonna di navigazione delle sezioni a sinistra, contenuto della sezione a destra; ogni impostazione con label + descrizione breve + controllo.
- **Cablaggio agli stati esistenti:** ogni controllo legge e scrive lo **stato già esistente** (lingua → `setLocale`; diagnostica → lo stato `showDiagnostics` e il suo percorso di persistenza; minimap → gli helper `read/writeCanvasMinimapVisibility`). **Nessun comportamento nuovo** dietro i controlli esistenti: solo un punto d'accesso unico.
- **Apertura:** scorciatoia `Ctrl+,` (convenzione VS Code) — registrala e documentala in `KeyboardShortcutsModal`; voce nella command palette (`CommandMenuModal.tsx`, ~56 comandi già presenti); ed eventuale accesso dall'header. Chiusura con `Esc` (focus trap già fornito dalla Modal shell).
- **i18n:** tutte le stringhe nuove in `en` / `it` / `sq`.

### I3 — Unificazione della persistenza (opzionale, a rischio — solo con conferma)
- Valuta di introdurre un **unico hook/store delle preferenze** (es. `usePreferences`) che incapsula la lettura/scrittura su `localStorage` con una chiave versionata, e a cui i controlli delle Impostazioni si agganciano.
- Se lo fai: **migrazione non distruttiva** dalle chiavi attuali (leggi le vecchie chiavi come fallback, non perdere le preferenze salvate), e **non toccare** il ripristino della sessione di lavoro (`workspaceSession.ts`) senza verifica dedicata.
- Se il rischio supera il beneficio, **fermati e proponimi** di rimandarla: la schermata Impostazioni funziona anche restando agganciata agli stati attuali.

### I4 — Verifica
Vedi checklist sotto.

## Vincoli globali

- Solo token e primitivi condivisi (`src/components/ui/*`); nessun colore/spaziatura hardcoded.
- Ogni stringa via `t(...)` in `en` / `it` / `sq`.
- **Nessun comportamento nuovo nascosto:** i controlli riflettono impostazioni esistenti; niente feature inventate (tema/densità restano segnaposto finché non affrontate in una fase dedicata).
- Nessuna regressione: i toggle esistenti (diagnostica in `ErrorsPanel`, minimap sul canvas, menu lingua) devono continuare a funzionare e a restare sincronizzati con le Impostazioni.
- Nessuna regressione di accessibilità; focus trap, tastiera, `aria` corretti.
- Nessuna nuova dipendenza senza conferma.
- Un blocco per commit; I1 richiede la mia conferma, I3 è opzionale e va confermata a parte.

## Verifica di chiusura

- [ ] `npm run build` verde; test in `test/` + Playwright verdi.
- [ ] Schermata Impostazioni apribile con `Ctrl+,`, da command palette e da header; chiusa con `Esc`.
- [ ] Lingua, diagnostica canvas e visibilità minimap modificabili dalle Impostazioni, **sincronizzate** con i loro toggle originali (cambiando in un posto cambia anche nell'altro).
- [ ] Le preferenze **persistono dopo reload** (verificato con Playwright); nessuna preferenza salvata persa (se fatta I3, migrazione verificata).
- [ ] `design:accessibility-review` pulito (navigazione sezioni/controlli da tastiera, focus trap); `design:design-system` senza nuovi hardcoded.
- [ ] i18n allineata en/it/sq; scorciatoia `Ctrl+,` documentata nel modale scorciatoie.
- [ ] `DESIGN-SYSTEM.md` aggiornato (pattern schermata Impostazioni) e nota di sintesi con **strumenti effettivamente usati**.

## Come iniziare

1. Rileva skill e MCP disponibili/autenticati e dichiarali.
2. Esegui **I1**: inventario + architettura delle sezioni + meccanismo di apertura, e **attendi la mia conferma**.
3. Implementa **I2** (schermata cablata agli stati esistenti). Valuta **I3** solo se il beneficio è chiaro, con conferma separata.
4. Chiudi con I4 e la nota di sintesi.

---

> Nota autenticazione MCP: se Figma o altri connettori non sono autenticati, avvisami e procedi senza; potrò autenticarli con `/mcp` in Claude Code. Playwright non richiede autenticazione.
> Questa schermata è pensata anche come **casa del futuro tema scuro**: progettala così che aggiungere il toggle del tema in una fase successiva sia banale (una voce nella sezione Aspetto).
