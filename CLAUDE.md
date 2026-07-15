# CLAUDE.md — ER Studio / buildER

Guida per Claude Code su questo repository. Leggi e rispetta queste regole in ogni sessione.

## Cos'è il progetto

Applicazione **React + TypeScript + Vite** per la creazione di diagrammi **Entity-Relationship** (nome: buildER / ER Studio). Gestisce file `.erschema`, `.sql`, `.txt` in un workspace tipo IDE, con canvas ER, inspector delle proprietà, reverse engineering da SQL e versioning.

## Comandi

- `npm run dev` — avvia in sviluppo.
- `npm run build` — build di produzione (deve sempre passare prima di chiudere un lavoro).
- `npm test` / suite in `test/` — deve restare verde.

## Architettura UI (dove sta cosa)

- **Design token:** `src/styles/tokens.css` — unica fonte di verità per colori, spaziature, dimensioni, raggi, ombre, motion, focus. Tema solo **light**. Alias legacy `--studio-*`, `--editor-*`, `--panel-*` rimappano ai canonici `--color-*`.
- **Stili globali:** `src/index.css` + `src/styles/*.css`.
- **Superfici principali:** header (`components/AppHeader.tsx`), activity rail (`styles/activity-rail.css`), explorer e pannelli laterali (`components/project/*`, `components/versioning/*`, `components/reverse/*`), tab (`components/project/ProjectFileTabs.tsx`), **canvas ER** (`canvas/DiagramCanvas.tsx`, `DiagramNode.tsx`, `DiagramEdge.tsx`), toolbar (`toolbar/Toolbar.tsx`), inspector (`inspector/InspectorPanel.tsx`), status bar (`components/BottomStatusBar.tsx`), modali (`components/*Modal.tsx`, `components/versioning/*Dialog.tsx`), welcome/empty (`components/workspace/*`).
- **Icone:** `components/icons/StudioIcon.tsx` (tipo `StudioIconName`, stile a tratto/stroke). Nuove icone si aggiungono qui, nello stesso stile.

## Regole invarianti (UI/UX)

1. **Solo token, mai hardcoded.** Ogni colore, spaziatura, dimensione, raggio, ombra deve venire da un token di `tokens.css`. Vietati esadecimali/`rgb()`/px "magici" nei componenti e nei CSS nuovi. Se serve una sfumatura usa `color-mix(...)` sui token esistenti; se manca un token, crealo in `tokens.css`.
2. **i18n obbligatoria.** Nessuna stringa hardcoded a schermo. Ogni testo passa da `t(...)` / `useI18n()` e va aggiunto a tutte e tre le lingue: `src/i18n/messages/en.ts`, `it.ts`, `sq.ts`.
3. **Accessibilità preservata.** Mantieni e non regredire: ruoli ARIA, `aria-*`, focus visibile, navigazione da tastiera (frecce, Home/End, F2, Delete, Enter/Space, Esc, ContextMenu/Shift+F10), target ≥ 32px, contrasto WCAG AA.
4. **Scope stretto.** Modifica solo i file della superficie/task in corso. Niente refactor opportunistici fuori tema. Un commit = un'unità di lavoro coerente.
5. **Niente nuove dipendenze** senza conferma esplicita dell'utente.
6. **Nessuna regressione funzionale.** Creazione/rename inline, validazione (nome vuoto, caratteri `\ /`, duplicati), dirty-state, resizer, collapse, undo/history, versioning devono continuare a funzionare.
7. **Rispetta il responsive esistente** (`@media 860px`, `640px`) e `prefers-reduced-motion` (transizioni via token `--motion-*`).

## Metodo di lavoro

Per ogni superficie UI segui il ciclo: **critique → proposta di ridisegno (a parole/token) → conferma utente → implementazione → verifica**. Proponi la direzione *prima* di scrivere CSS quando la modifica altera il look.

Fermati e chiedi conferma all'utente per: direzione estetica, scelte di colore/densità che cambiano il look, qualsiasi trade-off funzionale, aggiunta di dipendenze.

## Prima di chiudere un lavoro

- `npm run build` verde e test in `test/` verdi.
- Nessuna stringa hardcoded (i18n allineata en/it/sq).
- Nessun colore/spaziatura hardcoded introdotto.
- Accessibilità e navigazione da tastiera invariate o migliorate.
- Per modifiche visive: confronto screenshot before/after e nota "prima/dopo" di 1 riga per cambiamento.

## Documenti di riferimento

- `PIANO-UI-UX.md` — roadmap completa del redesign (fasi A→E).
- `DESIGN-SYSTEM.md` — tavolozza, tipografia, spaziatura, stati (creato in Fase A).
