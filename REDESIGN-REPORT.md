# REDESIGN-REPORT — buildER / ER Studio

Report di chiusura del redesign UI/UX (Fasi A→E). Ultimo aggiornamento: **2026-07-17**.
Branch: `ui-fixes`. Documenti collegati: [`PIANO-UI-UX.md`](PIANO-UI-UX.md) (roadmap),
[`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md) (regole), [`TOKEN-DEBT.md`](TOKEN-DEBT.md) (inventario debito).

---

## 1. Sommario esecutivo

Il redesign è stato eseguito in cinque fasi incrementali, un commit per unità di lavoro,
a parità funzionale e senza nuove dipendenze di runtime.

| Fase | Ambito | Esito |
|---|---|---|
| **A** | Fondamenta: token system come unica fonte di verità, inventario debito | ✅ chiusa |
| **B** | Primitivi condivisi (`src/components/ui/`): Button, Modal, Field, Tooltip, Badge, Toast | ✅ chiusa |
| **C** | Ridisegno superfici: chrome → pannelli → canvas ER → modali → onboarding | ✅ chiusa |
| **D** | Trasversali: accessibilità, responsive, motion, coerenza token | ✅ chiusa |
| **E** | QA finale e sign-off (questo report) | ✅ chiusa |

**Definition of Done raggiunta:** build verde, 692 test unitari + 42 e2e verdi,
0 violazioni WCAG 2.1 AA su tutte le superfici scansionate, i18n allineata en/it/sq,
debito hardcoded residuo interamente documentato.

---

## 2. Metriche (iniziale → finale)

### Debito hardcoded (colori)
- **Fonte di verità:** prima 6+ blocchi `:root` sparsi (panels.css, editor-refactor.css,
  index.css); ora **un unico file** `tokens.css` con **176 custom property** canoniche.
- **Componenti e CSS nuovi:** **0 hardcoded** — tutte le superfici ridisegnate usano solo token
  e primitivi. I file introdotti in coda (`errors-panel.css`, `source-control-panel.css`) sono
  a **zero** valori grezzi.
- **Inventario iniziale** (Fase A, commit `50d1f19`): **1942 occorrenze** colore nei CSS
  (index.css 1213, editor-refactor.css 554, panels.css 119, il resto minore).
- **Residuo documentato** (con motivo, in `TOKEN-DEBT.md`):
  - `editor-refactor.css` ~365 e `panels.css` ~54 — **old-palette** ancora renderizzata:
    convertire = cambio di look, escluso dal vincolo "nessuna regressione".
  - `index.css` ~1213 — blocchi tema legacy (`--ui-*`, `--unibo-*`, editor blu), **verificati
    morti a runtime**, safe da rimuovere in un commit dedicato.
  - Manciata di valori **off-scala** documentati: `#1f1f1f` (fondo menu lingua), `#f1f5f2`/`#080a09`
    (testo/bordo chrome scuro), `#d3d9d1` + `rgba(238,242,237,.86)` (gutter editor),
    `rgba(7,11,9,.28)` (scrim drawer mobile), ombre `rgba(0,0,0,X)`.
- **Nessun nuovo hardcoded non documentato introdotto** in A→E.

### Accessibilità
- **axe-core (WCAG 2.1 AA):** **0 violazioni** su 4 superfici (welcome no-project, chrome+explorer+welcome,
  shell modale condivisa, command palette). Scansione automatizzata e **permanente** in `tests/e2e/accessibility.spec.ts`.
- Fix chiave: `--color-text-muted` `#748078`→`#636d66` (era sotto 4.5:1 su ogni sfondo chiaro; ora ≥4.51:1);
  ruoli ARIA corretti (tab-documento `tab`→`toolbar`, `tree` spostato sulla lista, logo decorativo).

### Test e verifica
- **Unitari:** 69 file / **692 test** verdi (2 skip), `test/`.
- **e2e Playwright:** 11 spec / **42 test** verdi — a11y (4), responsive (~15 config: 1280/1000/880/860/660/640
  + 8 no-project), i18n it/en/sq, command palette (Ctrl+K, focus-restore), reverse SQL, source control/versioning,
  layout editor/code.

---

## 3. Cosa è cambiato, per superficie (prima → dopo)

### Chrome — header, activity rail, tab file, status bar (Fase C1 + D1)
- **Prima:** palette mista, tab-documento con `role="tab"`/`tablist` semanticamente errati (nessun `tabpanel`).
- **Dopo:** command topbar su token, brand e menu unificati; tab-documento come **`toolbar` + `aria-current`**;
  activity rail e status bar coerenti; testo chrome su token on-dark.

### Pannelli laterali — Explorer, Source control, Reverse SQL, Code (Fase C2)
- **Prima:** header eterogenei, altezze e spaziature ad hoc, colori grezzi.
- **Dopo:** header di pannello unificati (`--size-panel-header` 36px), look piatto, primitivi condivisi,
  stati hover/selected/active distinti, empty-state guidati.

### Canvas ER — nodi, archi/cardinalità, toolbar, inspector (Fase C3)
- **Prima:** selezione a "halo", identificatori poco leggibili, etichette archi grezze.
- **Dopo:** selezione con **glow accent** oro, identificatori sottolineati + dot accent, **chip** per le
  etichette degli archi, toolbar su token. Stack inspector irraggiungibile **rimosso** (`ErWorkspaceSidebar` mai montato).

### Modali (Fase C4)
- **Prima:** 3 skin bespoke (`help-modal-*`, `studio-modal-*`) divergenti.
- **Dopo:** shell **`ui-modal`** unica dai token (focus-trap, Esc, ripristino focus, scroll-lock); 14–15 siti
  migrati. Eccezioni motivate: CommandMenu e VersionAnnouncement (look proprio, documentato).

### Onboarding / Welcome (Fase C5)
- **Prima:** gerarchia debole, contenuto ridondante.
- **Dopo:** CTA accent, sfoltimento, copy rivista (skill `design:ux-copy`).

### Fondamenta trasversali (Fasi A, B, D)
- **A:** `tokens.css` unica fonte; scala tipografica/spaziatura/stati/ombre; audit debito in `TOKEN-DEBT.md`.
- **B:** primitivi `src/components/ui/` + `ui.css`; Toast i18n-izzato; strategia doppia-classe per skin residue.
- **D:** durate motion su `--motion-*`; `prefers-reduced-motion` a tappeto (reset globale in `foundations.css`);
  5 breakpoint verificati senza overflow.

---

## 4. Strumenti usati

- **Playwright** (già configurato, nessuna auth) — motore della QA: 42 e2e su a11y/responsive/i18n/flussi.
- **@axe-core/playwright** — scansione WCAG 2.1 AA oggettiva (devDependency aggiunta su conferma in Fase D).
- **Skill `design:accessibility-review`** — passata di conferma a11y (l'evidenza oggettiva resta axe).
- **Skill `design:design-system`** — audit finale di coerenza token/pattern.
- **Skill `design:ux-copy`** — microcopy welcome/onboarding (Fase C5).
- **Script d'audit CSS** della Fase A — censimento hardcoded riproducibile.
- **Browser integrato** — verifiche runtime dei valori risolti (parità computed-style).
- **Figma MCP** — connesso ma **nessun file di riferimento** condiviso: non usato per l'allineamento token.
- Connettori Linear/Notion/Slack/Asana/Atlassian/Intercom — **non autenticati**, non necessari.

---

## 5. Difetti noti residui (non bloccanti)

Nessuno bloccante. Candidati di pulizia futura, già tracciati in `TOKEN-DEBT.md`:

1. **Rimozione blocchi tema morti di `index.css`** (~1213 occ.) — verificati non renderizzati; grande riduzione
   di debito in un commit dedicato. È il primo candidato pulito post-redesign.
2. **Convergenza old-palette** di `editor-refactor.css`/`panels.css` con la palette redesign — richiede scelte di
   look, quindi da proporre come mini-fase visiva, non come pulizia meccanica.
3. **Unificazione dei 5 breakpoint** (1180/900/680 + 860/640 legacy) in una scala unica — cambia dove i layout si
   riadattano, quindi da fare con verifica responsive dedicata.
4. **Potatura CSS orfani** dell'inspector legacy non montato.

### Copertura e2e — gap noti (coperti dagli unitari)
La suite e2e certifica layout/responsive/a11y/i18n e i flussi command-palette, reverse SQL e versioning.
Restano **coperti dai test unitari ma non e2e**: (a) create/rename inline con validazione (vuoto, `\ /`, duplicati),
(b) manipolazione diretta sul canvas (drag/snap/multi-selezione/cardinalità), (c) drag del resizer dei pannelli.
Aggiungerli in e2e è **proposto** (vedi nota di chiusura), non incluso: sono prove nuove, fuori dal mandato
"solo correzione difetti" della Fase E.

---

## 6. Definition of Done — checklist finale

- [x] Regressione visiva/responsive Playwright: nessuna differenza inattesa (42/42).
- [x] Smoke dei flussi critici verdi (e2e per i flussi coperti; unitari per i restanti).
- [x] `design:accessibility-review` / axe: **0 violazioni AA** su tutte le superfici scansionate.
- [x] `design:design-system`: coerenza confermata, hardcoded residui documentati, nessuno nuovo.
- [x] `npm run build` + test unitari + Playwright **verdi**.
- [x] i18n allineata en/it/sq, nessuna chiave mancante (enforced da `test/i18n.test.ts`).
- [x] `DESIGN-SYSTEM.md` e `PIANO-UI-UX.md` aggiornati; `REDESIGN-REPORT.md` creato.

**Il redesign UI/UX (Fasi A–E) è completo.**
