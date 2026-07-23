# Prompt — Fase L: Toast affidabili e accessibili (per Claude Code)

> Incolla tutto ciò che segue in Claude Code, dalla root del progetto ER Studio / buildER.
> Prerequisiti: Fasi A–K completate (design system, primitivi condivisi in `src/components/ui/`, superfici ridisegnate, a11y/responsive). Rispetta le regole invarianti in `CLAUDE.md`.

---

## Contesto

App React + TypeScript + Vite per diagrammi ER. Il sistema di **toast** (notifiche transitorie) è già maturo, ma ha difetti che lo rendono inaffidabile proprio quando conta di più — cioè quando un toast contiene un'**azione** (es. "Annulla" dell'auto-layout della Fase G e degli auto-fix della Fase H).

**Architettura attuale (verificata):**
- `components/WorkspaceToastStack.tsx` — rendering: max 4 toast visibili (`MAX_VISIBLE_WORKSPACE_TOASTS`), ordinati per `createdAt` desc, `aria-live="polite"` sul viewport; ogni toast è `role="alert"` (errori) o `role="status"`; header con icona/titolo/tempo relativo/chiusura; body con messaggio e bottone azione opzionale (`actionLabel` + `onAction`).
- `hooks/useWorkspaceNotices.ts` — stato e ciclo di vita: `showNotice(...)` con auto-dismiss via `setTimeout` e durate per tono (`NOTICE_DURATION_MS`: success 3200, info 3600, warning 4400, error 6200), deduplica (`getWorkspaceNoticeDeduplicationKey`), notice "sticky" (durata `null`), storia max 8. Il tipo `WorkspaceNotice` ha `title?`, `message`, `tone`, `sticky?`, `actionLabel?`, `onAction?`, `createdAt`.
- Stili in `src/styles/*` (classi `workspace-toast*`).

## Problemi da risolvere

### L1 — Il timer non si ferma su hover/focus (il più importante)
`showNotice` avvia un `setTimeout` che chiude il toast dopo 3,2–6,2s, **senza pausa** al passaggio del mouse o al focus da tastiera. Conseguenza: un toast con azione ("Annulla") **sparisce mentre l'utente lo legge o allunga il mouse**, e le azioni sono di fatto **irraggiungibili da tastiera** (non si fa in tempo a tabularci sopra). È il difetto che rende inaffidabile tutta la feature.

### L2 — Due stringhe italiane hardcoded
In `useWorkspaceNotices.ts`: `title: "Operazione non valida"` (~riga 198, in `setStatusWarning`) e `title: "Errore"` (~riga 208, in `setStatusError`) bypassano `t(...)`. Un utente `en`/`sq` vede testo italiano. Viola la regola invariante n.2 di `CLAUDE.md`.

### L3 — Correttezza della live region per gli screen reader
Il viewport è `aria-live="polite"` e contiene figli con `role="alert"`/`role="status"`: annidare ruoli-live dentro una live region può causare **doppio annuncio o annuncio mancante** dei toast inseriti dinamicamente. Gli errori dovrebbero essere **assertivi** e annunciati una sola volta; il resto polite.

### L4 — Nessuna indicazione della scadenza
Non c'è barra di progresso/countdown: l'utente non sa quanto resterà un toast. Per i toast con azione, è il complemento naturale della pausa (L1).

### L5 — Possibile collisione con gli overlay del canvas
Toast e controlli del canvas (minimap, cluster zoom — Fasi F/G) rischiano di occupare lo stesso angolo. Va verificato che non si coprano, coerentemente con il sistema di z-index/posizionamento degli overlay già toccato nella Fase G.

## Strumenti da sfruttare (plugin, skill e MCP)

All'avvio, **rileva quali skill e server MCP sono disponibili e autenticati**; usa quelli presenti, **salta con eleganza** quelli non disponibili e **dichiara** cosa hai usato.

- **`design:accessibility-review`** — centrale qui: pausa su focus, ordine di tabulazione verso l'azione, correttezza `aria-live`/`role`, contrasto, `prefers-reduced-motion`.
- **`design:design-critique`** — sull'aspetto del countdown/progress e della pausa (feedback visivo) prima di implementare.
- **`design:ux-copy`** — per i titoli di default che sostituiscono le stringhe hardcoded (L2), in `en`/`it`/`sq`.
- **`design:design-system`** — solo token e primitivi condivisi; nessun nuovo hardcoded.
- **Playwright** (già configurato) — test: auto-dismiss, **pausa su hover e su focus**, ripresa del timer all'uscita, dismiss con tastiera, non-collisione ai breakpoint.
- **Figma** (se connesso) — riferimenti visivi per progress/countdown; mappa le variabili ai token.

## Task

### L1 — Pausa su hover e focus (con ripresa)
- In `useWorkspaceNotices.ts` / `WorkspaceToastStack.tsx`, quando il puntatore è sopra **la pila** dei toast o **il focus da tastiera** è dentro un toast, **metti in pausa l'auto-dismiss**; alla fine dell'hover/focus **riprendi** il conto alla rovescia (dal tempo rimanente, non da zero — traccia il tempo residuo).
- La pausa deve valere per **tutti** i toast visibili mentre l'utente interagisce con la pila (comportamento tipo Sonner/Radix), non solo per quello sotto il cursore.
- I toast **sticky** (durata `null`) restano invariati.
- Non rompere deduplica, storia, `removeNotice`, `clearNotices`, `dismissStickyNotices`.

### L2 — Rientro delle stringhe hardcoded nell'i18n
- Sostituisci `"Operazione non valida"` e `"Errore"` con chiavi i18n (es. `workspaceToasts.defaultTitles.warning` / `.error` già esistono per i titoli di default — riusale o aggiungi chiavi dedicate se il contesto è diverso), aggiunte/verificate in `en`/`it`/`sq`.
- Verifica che non restino altri titoli/messaggi di notice hardcoded nel hook o nei chiamanti.

### L3 — Live region corretta
- Rivedi il pattern: gli **errori** devono essere annunciati in modo **assertivo** e una sola volta; success/info/warning **polite**. Evita il doppio annuncio dovuto a `role="alert"` annidato in `aria-live`.
- Proponi l'approccio (es. due region separate polite/assertive, oppure gestione mirata dei ruoli) e verifica con `design:accessibility-review`. Mantieni `aria-label` e l'associazione titolo/`aria-labelledby`.

### L4 — Indicatore di scadenza
- Aggiungi un **countdown/progress** discreto per i toast non-sticky (barra o anello), solo con token, che **si mette in pausa insieme al timer** (L1).
- Deve rispettare `prefers-reduced-motion`: con reduced-motion, niente animazione continua — usa un'indicazione statica o nessuna, non un movimento fastidioso.

### L5 — Non-collisione con gli overlay del canvas
- Verifica dove vengono renderizzati i toast rispetto a minimap/cluster zoom (Fasi F/G) ai vari breakpoint (`860px`, `640px`).
- Se si sovrappongono, riconcilia posizionamento e z-index nel sistema di overlay già definito, documentando la scala. Nessun valore hardcoded.

### L6 — Accessibilità da tastiera dei toast *(completa L1)*
- Con la pausa su focus attiva, garantisci che si possa **raggiungere e attivare l'azione** e la chiusura di un toast da tastiera in modo prevedibile. Valuta (proponendola) una scorciatoia per spostare il focus sulla pila dei toast, stile IDE.

## Vincoli globali

- Solo token e primitivi condivisi; nessun colore/spaziatura hardcoded.
- Ogni stringa via `t(...)` in `en` / `it` / `sq`.
- Nessuna regressione: durate per tono, deduplica, sticky, storia max 8, max 4 visibili, azioni esistenti devono continuare a funzionare.
- `prefers-reduced-motion` rispettato per enter/exit e per il countdown.
- Nessuna nuova dipendenza (niente librerie di toast esterne) senza conferma esplicita.
- Un blocco per commit: L2 (rapido) → L1 → L3 → L4 → L5 → L6. L3 richiede la mia conferma dell'approccio.

## Verifica di chiusura

- [ ] `npm run build` verde; test in `test/` + Playwright verdi.
- [ ] L1: hover e focus **mettono in pausa** l'auto-dismiss dell'intera pila; all'uscita il timer **riprende dal residuo**; sticky invariati (verificato con Playwright).
- [ ] L2: nessun titolo/messaggio di notice hardcoded; `en`/`it`/`sq` allineate.
- [ ] L3: errori annunciati una sola volta e in modo assertivo; nessun doppio annuncio; `design:accessibility-review` pulito.
- [ ] L4: countdown presente, in pausa insieme al timer, e rispettoso di `prefers-reduced-motion`.
- [ ] L5: nessuna collisione toast/overlay del canvas ai breakpoint; z-index documentato.
- [ ] L6: azione e chiusura di un toast raggiungibili e attivabili da tastiera.
- [ ] `design:design-system` senza nuovi hardcoded; `DESIGN-SYSTEM.md` aggiornato (pattern toast: pausa, countdown, live region) con nota di sintesi e **strumenti usati**.

## Come iniziare

1. Rileva skill e MCP disponibili/autenticati e dichiarali.
2. Esegui **L2** (rapido, chiude un bug i18n) e committa.
3. Passa a **L1** (il cuore: pausa su hover/focus con ripresa), poi L3 (con conferma dell'approccio), L4, L5, L6 — un blocco per commit, verificando prima di proseguire.

---

> Nota autenticazione MCP: se Figma o altri connettori non sono autenticati, avvisami e procedi senza; potrò autenticarli con `/mcp` in Claude Code. Playwright non richiede autenticazione.
> Principio guida della fase: un toast con un'azione è una **promessa** all'utente. Se scade prima che possa raggiungerla — col mouse o con la tastiera — la promessa è rotta. La pausa su hover/focus è ciò che la mantiene.
