# Prompt — Fase D: Trasversali (accessibilità, responsive, motion, coerenza) — per Claude Code

> Incolla tutto ciò che segue in Claude Code, dalla root del progetto ER Studio / buildER.
> Prerequisiti: Fasi A, B, C completate (token estesi, primitivi condivisi in `src/components/ui/`, tutte le superfici ridisegnate). Rispetta le regole invarianti in `CLAUDE.md`.

---

## Contesto

App React + TypeScript + Vite per diagrammi ER. Le superfici sono già ridisegnate (Fase C). La Fase D è una **passata trasversale a tappeto** su tutta l'app per rifinire accessibilità, responsive, motion e coerenza finale — senza ridisegnare, ma correggendo ciò che stona tra una superficie e l'altra. Tutte le stringhe passano da `useI18n()` / `t(...)` in `en` / `it` / `sq`.

Debito residuo noto da chiudere in questa fase: colori/spaziature ancora hardcoded, in particolare `src/styles/editor-refactor.css` (~148 occorrenze) e minori in `panels.css`, `tokens.css`, `workspace-shell.css`, `app-command-bar.css`.

## Strumenti da sfruttare (plugin, skill e MCP)

Questa fase deve **usare attivamente gli strumenti disponibili**. All'avvio, **rileva quali skill e server MCP sono disponibili e autenticati**; usa quelli presenti, **salta con eleganza** quelli non disponibili (non bloccarti, non inventare risultati) e **dichiara** cosa hai usato.

**Skill di design (centrali in questa fase):**
- `design:accessibility-review` — è lo strumento principale: audit WCAG 2.1 AA su ogni superficie (contrasto, focus, tastiera, screen reader, target touch).
- `design:design-system` — passata finale di coerenza: intercetta hardcoded residui, token usati male, incoerenze tra superfici.
- `design:ux-copy` — per correggere eventuali microcopy/errori/label emersi durante l'audit.

**MCP e tooling (se disponibili):**
- **Playwright** (già installato nel progetto: `@playwright/test`) — usalo per **automatizzare** i controlli: test di regressione visiva before/after, screenshot ai vari breakpoint, verifica navigazione da tastiera e focus, e controlli di accessibilità automatici (es. axe) dove possibile. Se non esiste già una configurazione, proponimela prima di crearla.
- **Figma** — se connesso e ci sono variabili/token di riferimento, verifica che i token del progetto siano allineati (mappa, non copiare hardcoded).
- Altri MCP di design/documentazione: usali solo se pertinenti.

**Protocollo:** per ogni area, prima misura con lo strumento (audit/skill/Playwright), poi correggi, poi ri-verifica. Riporta gli esiti.

## Task (in ordine)

### D1 — Accessibilità WCAG 2.1 AA (a tappeto)
- Esegui `design:accessibility-review` su tutte le superfici: chrome, explorer/pannelli, canvas ER, toolbar, inspector, modali, welcome/onboarding, toast.
- Correggi: contrasto insufficiente (testo e stati su sfondo), `focus-visible` mancante o poco visibile, ordine di tabulazione, `aria-*` e ruoli, label dei controlli icona, focus trap dei modali, target < 32px.
- Verifica la navigazione da tastiera end-to-end (albero explorer, canvas, modali, menu) e con screen reader dove possibile.
- Ogni correzione usa solo token; se un colore non passa il contrasto AA, aggiusta/crea il token in `tokens.css` (documentandolo) invece di introdurre un valore locale.

### D2 — Responsive
- Verifica i breakpoint esistenti (`@media 860px`, `640px`) su **tutte** le superfici ridisegnate: niente overflow, testo tagliato, controlli sovrapposti, pannelli inutilizzabili.
- Usa Playwright per catturare screenshot ai breakpoint chiave e confrontarli.
- Correggi le regressioni mantenendo il comportamento dei resizer e dei pannelli collassabili.

### D3 — Motion e prefers-reduced-motion
- Uniforma le transizioni ai token `--motion-*`; niente durate hardcoded.
- Verifica che **tutte** le animazioni rispettino `prefers-reduced-motion: reduce` (incluse quelle di canvas, modali, toast, hover).

### D4 — Coerenza finale e chiusura del debito token
- Esegui `design:design-system` come audit finale.
- Elimina i colori/spaziature hardcoded residui (priorità `editor-refactor.css`), sostituendoli con token a **parità di resa**. Se un valore è intenzionalmente fuori scala (es. tratti del diagramma, gradienti), lascialo ma **documentane** il motivo.
- Uniforma le ultime incoerenze tra superfici (spaziature, dimensioni icone, pesi tipografici, raggi, ombre).

### D5 — Documentazione
- Aggiorna `DESIGN-SYSTEM.md` con eventuali token nuovi e con le note di accessibilità (rapporti di contrasto validati, pattern di focus).

## Vincoli globali

- Nessun ridisegno di superficie: solo rifinitura trasversale a parità di intento visivo.
- Solo token e primitivi condivisi; nessun nuovo hardcoded.
- Ogni stringa via `t(...)` in `en` / `it` / `sq`.
- Nessuna regressione funzionale (creazione/rename inline, validazione, dirty-state, resizer, undo/history, versioning) né di accessibilità.
- Nessuna nuova dipendenza senza conferma (Playwright è già presente).
- Modifiche in blocchi coerenti e piccoli (per area/superficie = un commit).

## Verifica di chiusura della fase

- [ ] `npm run build` verde e test in `test/` verdi.
- [ ] `design:accessibility-review` senza violazioni AA bloccanti su tutte le superfici.
- [ ] Screenshot responsive ai breakpoint (860/640) senza regressioni; catturati con Playwright.
- [ ] Tutte le animazioni rispettano `prefers-reduced-motion`.
- [ ] `design:design-system` finale pulito; debito hardcoded chiuso o documentato.
- [ ] i18n allineata en/it/sq.
- [ ] `DESIGN-SYSTEM.md` aggiornato (token + note a11y).
- [ ] Nota di sintesi per area: cosa misurato, cosa corretto, **strumenti (skill/MCP/Playwright) effettivamente usati**.

## Come iniziare

1. Rileva skill e MCP disponibili/autenticati e dichiarali.
2. Parti da **D1 (accessibilità)** superficie per superficie; misura → correggi → ri-verifica.
3. Procedi a D2, D3, D4, D5 in ordine, con commit per area.

---

> Nota autenticazione MCP: se Figma o altri connettori non sono autenticati, avvisami e procedi senza; potrò autenticarli con `/mcp` in Claude Code (o dalle impostazioni connettori). Playwright non richiede autenticazione.
> Dopo la Fase D resta solo la **Fase E** (QA finale: regression visiva completa, build/test, checklist, handoff opzionale).
