# Prompt — Fase A: Fondamenta del design system (per Claude Code)

> Incolla tutto ciò che segue in Claude Code, dalla root del progetto ER Studio / buildER.
> Questa fase NON deve produrre cambiamenti visivi: è preparazione. Se qualcosa cambia a schermo, è un bug.

---

## Contesto

App React + TypeScript + Vite per diagrammi ER. Esiste già un design token system in `src/styles/tokens.css` (token canonici `--color-*`, `--space-*`, `--size-*`, `--radius-*`, `--elevation-*`, motion, focus-ring) con alias legacy `--studio-*`, `--editor-*`, `--panel-*` che rimappano ai canonici. Tema solo **light**. Tutte le stringhe passano da `useI18n()` / `t(...)` con lingue `en` / `it` / `sq`.

Problema noto: molti colori/spaziature sono **hardcoded** nei CSS invece di usare i token — in particolare `src/styles/editor-refactor.css` (~263 valori esadecimali) e `src/styles/panels.css` (~71), più occorrenze minori in altri file. Questo è il primo ostacolo alla coerenza visiva.

## Obiettivo della Fase A

Rendere il token system **completo e unica fonte di verità**, mappare tutto il debito di valori hardcoded, ed estendere `tokens.css` dove mancano scale (tipografia in primis). **A parità di resa visiva.**

## Regole invarianti (valgono per tutta la fase)

1. **Nessun cambiamento visivo.** Ogni refactor colore/spaziatura deve produrre lo stesso identico pixel. Se un valore hardcoded non corrisponde esattamente a un token esistente, NON forzarlo: creane uno nuovo o segnalalo nel report, non "avvicinarlo".
2. **Solo modifiche a token e CSS.** Nessuna modifica a logica, componenti `.tsx`, o comportamento.
3. **Nessuna nuova dipendenza.**
4. **Non introdurre tema scuro** in questa fase (solo predisporre la struttura se banale, senza attivarlo).
5. Fermati e chiedi conferma prima di qualsiasi scelta che possa alterare la resa.

## Task (in ordine)

### A1 — Audit del token system
- Leggi `src/styles/tokens.css` e mappa i token esistenti (colori, spaziature, dimensioni, raggi, ombre, motion, focus).
- Verifica il contrasto dei colori semantici (`--color-danger`, `--color-warning`, `--color-success`, `--color-info`, testo su sfondi) rispetto a WCAG AA e segnala eventuali problemi (senza correggerli ancora).
- Individua incoerenze di naming e alias ridondanti tra `--color-*`, `--studio-*`, `--editor-*`, `--panel-*`.

### A2 — Inventario del debito hardcoded
- Trova tutti i valori hardcoded (esadecimali, `rgb/rgba`, px "magici" di spaziatura/dimensione) in `src/index.css` e `src/styles/*.css`, dando priorità a `editor-refactor.css` e `panels.css`.
- Produci una tabella: **file · riga · valore attuale · token corrispondente** (o "TOKEN MANCANTE → proposta").
- Non modificare ancora nulla: prima l'inventario, poi la sostituzione approvata.

### A3 — Estensione dei token mancanti
Aggiungi a `tokens.css`, documentati con commenti, le scale oggi assenti o implicite:
- **Tipografia:** scala esplicita di `font-size` e `line-height` (es. `--text-xs … --text-lg`), più `font-weight` semantici. Oggi i componenti usano valori come `0.72rem`, `0.82rem`, `0.9rem` sparsi: mappali a una scala.
- **Spaziatura/dimensioni:** verifica che i px ricorrenti nei CSS abbiano un token in `--space-*` / `--size-*`; aggiungi i mancanti.
- **Stati di superficie:** token chiari per `hover / selected / active / disabled` (oggi hover e selected collassano spesso sullo stesso `--editor-panel-muted`).
- **Ombre/elevazioni:** conferma che `--elevation-*` copra popover, modali, dropdown.

### A4 — Sostituzione controllata (a parità di resa)
- Sostituisci i valori hardcoded con i token, file per file, partendo da `panels.css` (più piccolo) poi `editor-refactor.css`.
- Ogni file sostituito = un commit separato, con nota "refactor a parità di resa".

### A5 — Documentazione
- Scrivi `DESIGN-SYSTEM.md` alla root: tavolozza colori (con uso semantico), scala tipografica, scala di spaziatura, dimensioni standard, raggi, ombre, stati dei componenti, e la regola "solo token, mai hardcoded".

## Verifica (obbligatoria prima di chiudere la fase)

- [ ] `npm run build` passa senza errori.
- [ ] La suite di test in `test/` resta verde.
- [ ] **Confronto visivo before/after:** screenshot delle superfici principali (header, explorer, canvas, un modale) identici prima e dopo. Segnala qualsiasi differenza.
- [ ] `tokens.css` non contiene più scale implicite per tipografia/spaziatura.
- [ ] Inventario del debito completato; residui hardcoded elencati con motivazione se lasciati.
- [ ] `DESIGN-SYSTEM.md` creato.

## Output atteso a fine fase

1. Tabella-inventario del debito hardcoded (file/riga/valore/token).
2. `tokens.css` esteso e commentato.
3. CSS refactorati a parità di resa (commit separati per file).
4. `DESIGN-SYSTEM.md`.
5. Nota di sintesi: cosa è cambiato, cosa è rimasto hardcoded e perché, eventuali problemi di contrasto AA da affrontare nelle fasi successive.
