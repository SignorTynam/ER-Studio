# Prompt — Fase C: Ridisegno delle superfici (per Claude Code)

> Incolla tutto ciò che segue in Claude Code, dalla root del progetto ER Studio / buildER.
> Prerequisiti: Fasi A e B completate (token estesi in `tokens.css`, `DESIGN-SYSTEM.md` con sezione Componenti, primitivi condivisi Button/Modal/Field/Tooltip/Badge). Rispetta le regole invarianti in `CLAUDE.md`.

---

## Contesto

App React + TypeScript + Vite per diagrammi ER. Ora che token e primitivi sono consolidati, la Fase C **ridisegna davvero le superfici**, una alla volta, verso una UI **semplice, user-friendly e ben organizzata**, su misura per la modellazione ER. Tutte le stringhe passano da `useI18n()` / `t(...)` in `en` / `it` / `sq`.

## Strumenti da sfruttare (plugin, skill e MCP)

Questa fase deve **usare attivamente gli strumenti disponibili** per alzare la qualità del risultato. All'inizio, **rileva quali sono disponibili e autenticati** in questo ambiente (skill installati e server MCP connessi). Usa quelli presenti; se un server richiede autenticazione o non è disponibile, **saltalo con eleganza** e prosegui — non bloccarti e non inventare risultati.

**Skill di design (usali nel ciclo per-superficie):**
- `design:design-critique` — critica strutturata della superficie (usabilità, gerarchia, coerenza) prima di ridisegnare.
- `design:accessibility-review` — audit WCAG 2.1 AA (contrasto, focus, tastiera, target) dopo l'implementazione.
- `design:ux-copy` — microcopy, empty state, messaggi d'errore, label dei bottoni.
- `design:design-system` — verifica coerenza coi token e assenza di nuovi hardcoded.
- `design:design-handoff` — (opzionale) documentare stati/spec dei componenti ridisegnati.

**MCP di design (usali come fonte di verità visiva, se connessi e autenticati):**
- **Figma** — se esistono file/frame di riferimento: estrai contesto di design, screenshot, variabili/token e componenti del design system per allineare l'implementazione ai mockup. Preferisci i valori/variabili di Figma mappandoli ai token del progetto (mai copiarli come hardcoded).
- **Canva** — se utile, per generare/ispezionare mockup o esplorazioni visive di una superficie prima di implementarla.
- **Google Drive / altri** — per recuperare eventuali riferimenti visivi o linee guida salvate.

**Protocollo d'uso degli strumenti:**
1. All'avvio di ogni superficie, se un MCP di design è disponibile e ci sono riferimenti pertinenti, **caricali prima** di proporre il ridisegno.
2. Traduci sempre colori/spaziature dei riferimenti nei **token** del progetto; se manca un token, crealo in `tokens.css` (regola della Fase A).
3. Se nessun MCP è disponibile, procedi con `design:design-critique` sugli screenshot dell'app e con i principi del `PIANO-UI-UX.md`.
4. Riporta all'utente quali strumenti hai effettivamente usato per ciascuna superficie.

## Ciclo per ogni superficie (obbligatorio)

Lavora **una superficie per volta = un commit/PR a sé**. Per ciascuna:

1. **Critique** — `design:design-critique` (+ contesto Figma/Canva se disponibile) → lista di problemi concreti.
2. **Proposta di ridisegno** — a parole/token, con eventuali riferimenti dai mockup. **Fermati e chiedi conferma della direzione** prima di scrivere CSS.
3. **Implementazione** — solo i file di quella superficie, solo token e primitivi condivisi (Fase B), i18n rispettata.
4. **Verifica** — `npm run build` + test verdi, `design:accessibility-review`, screenshot before/after, `design:design-system` per intercettare hardcoded/incoerenze.
5. **Nota "prima/dopo"** di 1 riga per ogni cambiamento + strumenti usati.

## Ordine delle superfici (dal più strutturale all'isolato)

Procedi in quest'ordine, un blocco alla volta, aspettando conferma tra uno e l'altro.

### C1 — Chrome / cornice
`AppHeader.tsx`, activity rail (`styles/activity-rail.css`), tab dei file (`ProjectFileTabs.tsx`), status bar (`BottomStatusBar.tsx`, `WorkspaceStageBar.tsx`).
Obiettivo: cornice silenziosa e coerente che dà il tono all'app. Uniformare altezze, spaziature, stati attivi, tooltip; ridurre rumore visivo.

### C2 — Explorer e pannelli laterali
`components/project/*`, `versioning/SourceControlPanel.tsx`, `reverse/SqlReversePanel.tsx`, code panel.
Obiettivo: header di pannello uniformi, liste leggibili, stati `hover/selected/active` distinti. Per l'Explorer applica i miglioramenti già individuati: icone dei tipi di file distinguibili, cartelle aperte/chiuse, dirty-state discreto ma leggibile, densità respirabile, estensione file leggibile.

### C3 — Canvas ER (core) — la parte più importante
`canvas/DiagramCanvas.tsx`, `DiagramNode.tsx`, `DiagramEdge.tsx`, `toolbar/Toolbar.tsx`, `inspector/InspectorPanel.tsx` (+ sezioni identificatori).
Obiettivo:
- Nodi entità/relazione/attributo: leggibilità, gerarchia interna, chiave/identificatori evidenti, stato selezionato/hover chiaro.
- Archi e cardinalità: etichette chiare, tratti e direzione leggibili.
- Toolbar: raggruppamento strumenti, stato attivo, tooltip.
- Inspector: sezioni ben organizzate, form coerenti coi primitivi Field.
- Griglia/sfondo e feedback di interazione (drag, snap, selezione multipla) sobri e chiari.
Procedi con estrema cautela: è il cuore del prodotto. Ridisegna per sotto-parti (nodi, poi archi/cardinalità, poi toolbar, poi inspector), ognuna con conferma.

### C4 — Modali e dialog
Tutti i ~12 modali già ricondotti alla shell condivisa in Fase B: qui rifiniscine il contenuto e la gerarchia (titoli, spaziatura, footer azioni, empty state), con `design:ux-copy` per i testi.

### C5 — Onboarding / welcome
`workspace/WorkspaceWelcomePage.tsx`, `NoProjectWelcomePage.tsx`, `WorkspaceEmptyEditor.tsx`, `OnboardingGuide.tsx`, `VersionAnnouncement.tsx`, toast.
Obiettivo: ingresso chiaro e invitante, CTA primarie evidenti, microcopy curata (`design:ux-copy`), tutto via i18n.

## Vincoli globali

- Solo token e primitivi condivisi; nessun colore/spaziatura hardcoded.
- Ogni stringa via `t(...)` in `en` / `it` / `sq`.
- Nessuna regressione funzionale (creazione/rename inline, validazione, dirty-state, resizer, undo/history, versioning) né di accessibilità (ARIA, focus, tastiera, target ≥ 32px).
- Rispetta responsive (`@media 860px`, `640px`) e `prefers-reduced-motion`.
- Nessuna nuova dipendenza senza conferma.
- Non toccare più di una superficie per commit.

## Verifica di chiusura della fase

- [ ] Ogni superficie: build + test verdi, screenshot before/after, audit accessibilità passato.
- [ ] Nessun nuovo hardcoded (verificato con `design:design-system`).
- [ ] i18n allineata en/it/sq.
- [ ] `DESIGN-SYSTEM.md` aggiornato se sono nati nuovi pattern.
- [ ] Nota di sintesi per superficie: problemi risolti, prima/dopo, **strumenti (skill/MCP) effettivamente usati**.

## Come iniziare

1. Rileva skill e MCP disponibili/autenticati e dichiarali.
2. Parti da **C1 (chrome)**: esegui il ciclo per-superficie, fermandoti alla proposta di ridisegno per la mia conferma.
3. Non proseguire alla superficie successiva finché quella corrente non è verificata.

---

> Nota autenticazione MCP: se Figma, Canva, Notion, Linear o altri risultano non autenticati, avvisami e procedi senza; potrò autenticarli con `/mcp` in Claude Code (o dalle impostazioni connettori) e ripetere la superficie con i riferimenti visivi.
