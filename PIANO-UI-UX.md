# Piano di miglioramento UI/UX — ER Studio / buildER

Documento di lavoro condiviso tra **Alion** e **Claude Code**.
Obiettivo: una UI **coerente, moderna e su misura** per un tool di modellazione ER — **semplice, user-friendly e ben organizzata**, senza riscrivere l'architettura.

> Come si usa questo piano: si procede una fase alla volta, dall'alto verso il basso. Ogni fase ha obiettivo, cosa fa Claude Code, cosa decidi tu, e come si verifica. Non passare alla fase successiva finché la precedente non è verificata.

---

## 0. Stato attuale (fotografia)

**Stack:** React + TypeScript + Vite. Diagrammi ER.

**Design system:** esiste già un token system in `src/styles/tokens.css` (colori `--color-*`, spaziature `--space-*`, dimensioni `--size-*`, raggi `--radius-*`, ombre `--elevation-*`, motion, focus-ring). Solo tema **light**. Alias legacy `--studio-*`, `--editor-*`, `--panel-*` che rimappano ai token canonici.

**Debito tecnico da sistemare:** colori hardcoded fuori dai token — **263 occorrenze in `editor-refactor.css`**, **71 in `panels.css`**, più poche altre. Questo è il primo ostacolo alla coerenza.

**Superfici UI principali (13 aree):**

| # | Area | File chiave |
|---|------|-------------|
| 1 | App header (barra scura in alto) | `components/AppHeader.tsx` |
| 2 | Activity rail (striscia icone a sinistra) | `styles/activity-rail.css` |
| 3 | Explorer + pannelli laterali (source control, reverse SQL, code) | `components/project/*`, `components/versioning/SourceControlPanel.tsx`, `components/reverse/SqlReversePanel.tsx` |
| 4 | Tab dei file | `components/project/ProjectFileTabs.tsx` |
| 5 | **Canvas ER (core)** | `canvas/DiagramCanvas.tsx`, `canvas/DiagramNode.tsx`, `canvas/DiagramEdge.tsx` |
| 6 | Toolbar di disegno | `toolbar/Toolbar.tsx` |
| 7 | Inspector (proprietà entità/attributi/relazioni) | `inspector/InspectorPanel.tsx` + sezioni |
| 8 | Status bar inferiore | `components/BottomStatusBar.tsx`, `WorkspaceStageBar.tsx` |
| 9 | Code panel / dock tecnico | `components/CodePanel.tsx`, `CodeModePanel.tsx`, `TechnicalDockPanel.tsx` |
| 10 | Modali (~12) | `CardinalityModal`, `NotesModal`, `KeyboardShortcutsModal`, `CommandMenuModal`, `ChangelogModal`, `SqlReverseInputModal`, versioning (`CommitDialog`, `RestoreVersionDialog`, `VersionDiffDialog`), `ProjectTextFileModal` |
| 11 | Welcome / empty state | `workspace/WorkspaceWelcomePage.tsx`, `NoProjectWelcomePage.tsx`, `WorkspaceEmptyEditor.tsx` |
| 12 | Onboarding + annunci | `components/OnboardingGuide.tsx`, `VersionAnnouncement.tsx` |
| 13 | Toast / feedback | `components/WorkspaceToastStack.tsx` |

**Internazionalizzazione:** tutte le stringhe passano da `useI18n()` / `t(...)`, lingue `en` / `it` / `sq`. Ogni testo nuovo va in tutte e tre.

---

## 1. Principi guida (la "bussola" del redesign)

Da concordare con Claude Code all'inizio e da rispettare in ogni fase. Serviranno da criterio per ogni decisione.

1. **Semplice prima di tutto.** Ridurre rumore visivo: meno bordi, meno riempimenti, meno stati che competono per l'attenzione. Il canvas ER è la star; tutto il resto è cornice silenziosa.
2. **Una sola fonte di verità per lo stile.** Ogni colore/spaziatura/dimensione viene da un token. Zero valori hardcoded nei componenti.
3. **Gerarchia chiara.** Tre livelli di superficie ben distinti: sfondo app → pannello → elemento elevato (modale/popover). Stati `hover / selected / active` sempre distinguibili.
4. **Coerenza dei pattern.** Un bottone icona, un header di pannello, una riga di lista, un modale: stesso comportamento e stesso look ovunque. Componenti condivisi, non varianti locali.
5. **Densità professionale ma respirabile.** Stile "IDE" (denso, efficiente) ma con spaziatura verticale sufficiente a leggere senza fatica.
6. **Accessibile per default.** Focus visibile, contrasto AA, navigazione da tastiera, target ≥ 32px. Non è una fase separata: è un vincolo di ogni fase.
7. **Su misura per l'ER.** Le decisioni visive servono la modellazione: entità, relazioni, cardinalità, identificatori, generalizzazioni devono essere leggibili a colpo d'occhio sul canvas.

**Decisione tua (blocco iniziale):** approvare 3–5 riferimenti visivi (screenshot di tool che ti piacciono: Linear, Figma, DrawSQL, dbdiagram, VS Code…) così Claude Code ha una direzione estetica concreta e non generica.

---

## 2. Fasi del lavoro

### Fase A — Fondamenta del design system (prerequisito di tutto)

**Obiettivo:** una base di token solida e completa, così ogni fase successiva "dipinge con la stessa tavolozza".

- Usa lo skill **`design:design-system`** per fare l'audit: incoerenze di naming, valori hardcoded, token mancanti.
- Claude Code produce un **inventario del debito**: elenco dei colori/spaziature hardcoded in `editor-refactor.css`, `panels.css`, ecc., mappati al token corrispondente (o a un nuovo token se manca).
- Estendere `tokens.css` dove serve: scala tipografica (oggi mancano token font-size/line-height espliciti), livelli di ombra, stati di superficie, colori semantici (info/success/warning/danger già presenti — verificarne il contrasto).
- Definire una **scala tipografica** e una **scala di spaziatura** ufficiali e documentarle in cima a `tokens.css`.

**Deliverable:** `tokens.css` completo + documento `DESIGN-SYSTEM.md` (tavolozza, tipografia, spaziatura, stati, componenti base). Nessun cambiamento visivo ancora percepibile — è preparazione.

**Verifica:** `npm run build` passa; l'app appare identica a prima (refactor a parità di resa).

---

### Fase B — Componenti condivisi (i "mattoni")

**Obiettivo:** standardizzare i primitivi riusati ovunque, così migliorarli una volta li migliora tutti.

Primitivi da consolidare (molti già esistono in `WorkspacePanel.tsx`, `panels.tsx`): **Button / IconButton**, **PanelHeader**, **Menu / MenuItem**, **Modal shell** (backdrop + card + header + footer), **Input / field + validazione**, **Empty state**, **Toast**, **Tooltip**, **Badge / pill**, **riga di lista/tree**.

- Per ciascuno: un'unica implementazione, varianti via prop, stati coerenti (default/hover/focus/active/disabled), stile 100% da token.
- Rimuovere le varianti locali duplicate man mano che i primitivi le sostituiscono.

**Deliverable:** set di componenti UI condivisi documentati. **Verifica:** ogni primitivo ha una piccola pagina/storia di prova o screenshot before/after.

---

### Fase C — Superfici, in ordine di priorità

Una superficie per volta, ciascuna come blocco di lavoro isolato (idealmente un commit/PR a sé). Per ognuna il ciclo è: **critique → ridisegno → implementazione → verifica** (vedi §3).

**Ordine consigliato** (dal più strutturale/riusabile al più isolato):

1. **Chrome / cornice** — App header, activity rail, tab dei file, status bar. Sono sempre a schermo e danno il "tono" all'app. Sistemarli presto alza subito la qualità percepita.
2. **Explorer + pannelli laterali** — Explorer (già analizzato: icone dei tipi, dirty-state, stati hover/selected/active, densità), source control, reverse SQL, code panel. Uniformare gli header e le liste dei pannelli.
3. **Canvas ER (core)** — la parte più delicata e più importante:
   - Nodi entità/relazione/attributo: leggibilità, gerarchia interna, chiave/identificatori, stato selezionato/hover.
   - Archi e cardinalità: chiarezza delle etichette, tratti, direzione.
   - Toolbar di disegno: raggruppamento strumenti, stato attivo, tooltip.
   - Inspector: organizzazione delle sezioni (entità/attributi/relazioni/identificatori), form coerenti.
   - Griglia, sfondo, feedback di interazione (drag, snap, selezione multipla).
4. **Modali e dialog** — applicare la shell modale condivisa (Fase B) a tutti i ~12 modali: stessa struttura, stessi bottoni, stessa validazione, focus trap, chiusura con Esc.
5. **Onboarding / welcome** — welcome page, empty state, guida onboarding, toast, annunci di versione: rendere l'ingresso chiaro e invitante, CTA primarie evidenti, testi via i18n (usa lo skill **`design:ux-copy`** per microcopy ed empty state).

**Deliverable per superficie:** modifiche mirate ai suoi file + nota "prima/dopo" di 1 riga per ogni cambiamento.

---

### Fase D — Cross-cutting (trasversali)

Da fare a tappeto una volta che le superfici sono a posto.

- **Accessibilità:** passata con lo skill **`design:accessibility-review`** (WCAG 2.1 AA) su ogni superficie: contrasto, focus-visible, navigazione tastiera, aria, target touch.
- **Responsive:** verificare i breakpoint esistenti (`@media 860px`, `640px`) su tutte le superfici ridisegnate; niente overflow o elementi tagliati.
- **Motion:** transizioni coerenti (token `--motion-*`), rispetto di `prefers-reduced-motion`.
- **Coerenza finale:** seconda passata di `design:design-system` per intercettare regressioni o nuovi hardcoded introdotti.

---

### Fase E — QA e chiusura

- Regression visiva: screenshot before/after di ogni superficie affiancati.
- `npm run build` + suite di test esistente (`test/`) verde.
- i18n: nessuna stringa hardcoded; `en` / `it` / `sq` allineate.
- Checklist finale (§4) tutta spuntata.
- (Opzionale) `design:design-handoff` per documentare gli stati dei componenti se in futuro serviranno ad altri.

---

## 3. Come lavorare con Claude Code (metodo operativo)

Questo è il "come", vale per ogni superficie della Fase C.

1. **Un blocco = una superficie = un commit.** Mai toccare più superfici insieme: diff piccoli, revisione facile, rollback sicuro.
2. **Ciclo a 4 passi per superficie:**
   - **Critique** — lancia lo skill `design:design-critique` sulla superficie attuale (screenshot o codice) → lista di problemi concreti.
   - **Ridisegno** — Claude Code propone la soluzione a parole/token *prima* di scrivere CSS, tu approvi la direzione.
   - **Implementazione** — modifiche solo ai file di quella superficie, solo con token, i18n rispettata.
   - **Verifica** — build + screenshot before/after + check accessibilità.
3. **Regole invarianti che Claude Code deve rispettare sempre** (mettile nel `CLAUDE.md` del repo):
   - Solo token da `tokens.css`, mai colori/spaziature hardcoded.
   - Ogni stringa via `t(...)`, aggiunta a `en`/`it`/`sq`.
   - Non rompere accessibilità e navigazione da tastiera esistenti.
   - Niente nuove dipendenze senza chiederti conferma.
   - Nessun cambiamento fuori dallo scope della superficie in lavorazione.
4. **Punti di decisione tua** (Claude Code si ferma e chiede): direzione estetica, scelte di colore/densità che cambiano il "look", qualsiasi trade-off funzionale.
5. **Traccia i progressi** in una checklist viva (§4), spuntando le superfici completate.

---

## 4. Checklist di avanzamento

> ✅ **Redesign completo — Fasi A→E chiuse il 2026-07-17.** Dettagli in [`REDESIGN-REPORT.md`](REDESIGN-REPORT.md).

**Fondamenta**
- [x] Audit design system completato (debito hardcoded mappato)
- [x] `tokens.css` esteso (tipografia, spaziatura, stati, ombre)
- [x] `DESIGN-SYSTEM.md` scritto
- [x] `CLAUDE.md` con le regole invarianti

**Componenti condivisi**
- [x] Button / IconButton · [x] PanelHeader · [x] Menu · [x] Modal shell · [x] Input/field · [x] Empty state · [x] Toast · [x] Tooltip · [x] Badge · [x] Riga lista/tree

**Superfici**
- [x] App header · [x] Activity rail · [x] Tab file · [x] Status bar
- [x] Explorer · [x] Source control · [x] Reverse SQL · [x] Code panel
- [x] Canvas: nodi · [x] Canvas: archi/cardinalità · [x] Toolbar · [x] Inspector
- [x] Modali (tutti ricondotti alla shell condivisa)
- [x] Welcome / empty · [x] Onboarding · [x] Toast/annunci

**Trasversali**
- [x] Accessibilità AA · [x] Responsive · [x] Motion · [x] Passata finale coerenza

**Chiusura**
- [x] Regression visiva (42/42 e2e) · [x] Build + test verdi (692 unit) · [x] i18n allineata (en/it/sq) · [x] Checklist completa

---

## 5. Ordine di attacco consigliato (TL;DR)

1. **Fase A** — token e audit (nessun cambiamento visibile, ma abilita tutto il resto).
2. **Fase B** — componenti condivisi.
3. **Fase C** nell'ordine: chrome → pannelli laterali → **canvas ER** → modali → onboarding.
4. **Fase D** — accessibilità, responsive, motion, coerenza.
5. **Fase E** — QA e chiusura.

Iniziare dalle fondamenta (A+B) non è "perdere tempo": rende ogni superficie successiva 3–4× più veloce e coerente, ed è ciò che trasforma tanti ritocchi locali in un vero redesign unitario.
