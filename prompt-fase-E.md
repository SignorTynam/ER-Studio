# Prompt — Fase E: QA finale e chiusura (per Claude Code)

> Incolla tutto ciò che segue in Claude Code, dalla root del progetto ER Studio / buildER.
> Prerequisiti: Fasi A–D completate (token, primitivi condivisi, superfici ridisegnate, passata trasversale di a11y/responsive/motion/coerenza). Rispetta le regole invarianti in `CLAUDE.md`.

---

## Contesto

App React + TypeScript + Vite per diagrammi ER. Il redesign è implementato (Fasi A–D). La Fase E è di **verifica e sign-off**: non introduce nuovo design, ma **certifica** che tutto è coerente, accessibile, funzionante e documentato, e chiude eventuali difetti residui emersi solo guardando l'insieme. Tutte le stringhe passano da `useI18n()` / `t(...)` in `en` / `it` / `sq`. Playwright è già configurato (`playwright.config.ts`, cartella `tests`).

## Filosofia della fase

Modalità "collaudo": **misura, non ridisegnare**. Le uniche modifiche ammesse sono correzioni di difetti (bug, regressioni, incoerenze evidenti, violazioni residue). Qualsiasi cambiamento che alteri il look va prima proposto e confermato.

## Strumenti da sfruttare (plugin, skill e MCP)

All'avvio, **rileva quali skill e server MCP sono disponibili e autenticati**; usa quelli presenti, **salta con eleganza** quelli non disponibili e **dichiara** cosa hai usato.

- **Playwright** (già configurato) — motore della QA finale: suite di **regressione visiva** su tutte le superfici, agli screenshot dei breakpoint (860/640 + desktop), più smoke test dei flussi chiave (creazione/rename file, apertura modali con Esc/focus-trap, disegno sul canvas, versioning). Se la suite esistente è parziale, **proponimi** le prove mancanti prima di aggiungerle.
- **`design:accessibility-review`** — passata finale di conferma WCAG 2.1 AA su tutte le superfici (deve risultare pulita).
- **`design:design-system`** — audit finale di coerenza: token usati bene, nessun hardcoded non documentato, pattern uniformi.
- **`design:design-handoff`** (opzionale) — genera la spec di handoff dei componenti/superfici (stati, token, props, breakpoint) per uso futuro.
- **`design:ux-copy`** — solo se emergono microcopy/label da correggere.
- **Figma** (se connesso) — verifica finale di allineamento tra token del progetto e variabili di riferimento.

**Protocollo:** per ogni area, esegui lo strumento → registra l'esito → correggi solo i difetti → ri-verifica. Nessuna correzione "estetica" senza conferma.

## Task (in ordine)

### E1 — Regressione visiva completa (Playwright)
- Cattura screenshot before/after (o baseline) di tutte le superfici ai breakpoint chiave.
- Confronta e segnala differenze inattese; correggi solo le regressioni reali.

### E2 — Smoke test funzionale end-to-end
- Verifica i flussi critici: creazione/rename inline con validazione (nome vuoto, `\ /`, duplicati), dirty-state, resizer e collapse dei pannelli, undo/history, apertura/chiusura di **tutti** i modali (Esc, focus-trap, ripristino focus), interazioni canvas (drag, snap, selezione multipla, cardinalità), reverse SQL, versioning.
- Nessuna regressione funzionale ammessa.

### E3 — Conferma accessibilità e coerenza
- `design:accessibility-review` finale: zero violazioni AA bloccanti.
- `design:design-system` finale: coerenza confermata; elenco definitivo degli hardcoded residui **documentati** (con motivo) e conferma che non ce ne sono di nuovi.

### E4 — i18n e build
- Verifica che ogni stringa a schermo passi da `t(...)` e che `en` / `it` / `sq` siano allineate (nessuna chiave mancante o non tradotta).
- `npm run build` verde e suite `test/` + Playwright verdi.

### E5 — Documentazione e handoff
- Aggiorna `DESIGN-SYSTEM.md` e `PIANO-UI-UX.md` (spunta la checklist finale, segna le fasi come chiuse).
- (Opzionale) `design:design-handoff` per la spec dei componenti.
- Produci un **report di chiusura** `REDESIGN-REPORT.md`: cosa è cambiato per superficie (prima/dopo sintetico), metriche (es. debito hardcoded iniziale→finale, esito a11y), strumenti usati, e difetti noti residui.

## Vincoli globali

- Nessun ridisegno; solo correzione di difetti, con conferma per qualsiasi cambiamento visibile.
- Solo token e primitivi condivisi; nessun nuovo hardcoded.
- i18n allineata en/it/sq.
- Nessuna regressione funzionale o di accessibilità.
- Nessuna nuova dipendenza di runtime senza conferma (Playwright è già presente).

## Verifica di chiusura (definition of done del redesign)

- [ ] Regressione visiva Playwright: nessuna differenza inattesa ai breakpoint.
- [ ] Smoke test dei flussi critici: tutti verdi.
- [ ] `design:accessibility-review`: zero violazioni AA bloccanti su tutte le superfici.
- [ ] `design:design-system`: coerenza confermata, hardcoded residui documentati.
- [ ] `npm run build` + test + Playwright verdi.
- [ ] i18n allineata en/it/sq, nessuna chiave mancante.
- [ ] `DESIGN-SYSTEM.md` e `PIANO-UI-UX.md` aggiornati; `REDESIGN-REPORT.md` creato.
- [ ] Report finale con strumenti usati e difetti noti residui.

## Come iniziare

1. Rileva skill e MCP disponibili/autenticati e dichiarali.
2. Esegui E1→E4 come collaudo (misura → correggi solo difetti → ri-verifica), fermandoti a chiedere conferma per qualsiasi cambiamento che tocchi il look.
3. Chiudi con E5: documentazione, checklist spuntata e `REDESIGN-REPORT.md`.

---

> Nota autenticazione MCP: se Figma o altri connettori non sono autenticati, avvisami e procedi senza; potrò autenticarli con `/mcp` in Claude Code. Playwright non richiede autenticazione.
> Con la Fase E chiusa, il redesign UI/UX (Fasi A–E) è completo.
