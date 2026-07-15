# Prompt — Fase B: Componenti condivisi (per Claude Code)

> Incolla tutto ciò che segue in Claude Code, dalla root del progetto ER Studio / buildER.
> Prerequisito: Fase A completata (token system esteso, `DESIGN-SYSTEM.md` esistente). Rispetta le regole invarianti in `CLAUDE.md`.

---

## Contesto

App React + TypeScript + Vite per diagrammi ER. Dopo la Fase A i token in `src/styles/tokens.css` sono l'unica fonte di verità (colori, tipografia, spaziatura, stati, ombre) e sono documentati in `DESIGN-SYSTEM.md`. Tutte le stringhe passano da `useI18n()` / `t(...)` con lingue `en` / `it` / `sq`.

**Situazione dei primitivi UI (rilevata):**
- Esistono **due set di componenti di pannello sovrapposti e in parte ridondanti**:
  - `src/components/workspace/WorkspacePanel.tsx` → `WorkspacePanel`, `WorkspacePanelHeader`, `WorkspacePanelHeaderActions`, `WorkspacePanelBody`, `PanelIconButton`, `PanelMenu`, `PanelMenuItem`, `PanelEmptyState`.
  - `src/components/panels.tsx` → `PanelShell`, `PanelHeader`, `PanelTabs`, `PanelSection`, `CollapsiblePanel`, `PanelCard`, `PanelStepCard`, `WarningCard`, `EmptyStateCard`, `CommandOptionRow`, `WorkspaceViewBar`, `WorkspaceViewButton`.
- **Manca una shell modale condivisa**: i ~12 modali/dialog ridefiniscono ognuno `role="dialog"` + backdrop + header + footer per conto proprio (es. `CardinalityModal`, `NotesModal`, `KeyboardShortcutsModal`, `CommandMenuModal`, `ChangelogModal`, `SqlReverseInputModal`, `ProjectTextFileModal`, `versioning/CommitDialog`, `RestoreVersionDialog`, `VersionDiffDialog`).
- **Mancano primitivi generici**: bottone testuale (non-icona), Input/Field con label+errore, Tooltip, Badge/pill riusabile.
- Icone: `components/icons/StudioIcon.tsx` (tipo `StudioIconName`, stile stroke).

## Obiettivo della Fase B

Consolidare i **primitivi riusati ovunque** in un'unica libreria coerente, così migliorarli una volta li migliora in tutta l'app. Ogni primitivo: una sola implementazione, varianti via prop, stati coerenti, stile 100% da token. **A parità di resa visiva** dove sostituisci codice esistente (i miglioramenti estetici veri arrivano nella Fase C).

## Regole invarianti (oltre a quelle di `CLAUDE.md`)

1. **Non ridisegnare le superfici** in questa fase: stai costruendo/consolidando i mattoni, non la casa. La resa deve restare equivalente.
2. **Migrazione incrementale e reversibile:** un primitivo (o un gruppo di consumer) per commit. Niente big-bang.
3. **Nessuna regressione funzionale né di accessibilità** (focus trap dei modali, `aria-*`, tastiera, Esc per chiudere).
4. **Nessuna nuova dipendenza** senza conferma.
5. Fermati e chiedi conferma prima di scelte che alterano look o comportamento.

## Task (in ordine)

### B1 — Inventario e riconciliazione dei primitivi esistenti
- Mappa tutti i componenti in `WorkspacePanel.tsx` e `panels.tsx`, chi li usa, e dove si sovrappongono (es. due `PanelHeader`, due empty-state, due set di card).
- Proponi (a parole, prima di codice) un elenco canonico: quale versione tenere per ciascun ruolo, quali unificare, quali deprecare. **Attendi conferma** prima di procedere.

### B2 — Primitivi mancanti da creare
Crea questi componenti condivisi, documentati e basati su token. Definisci le varianti via prop, non con classi locali:
- **Button** (testuale): varianti `primary | secondary | ghost | danger`, dimensioni, stato `disabled`, `loading`, icona opzionale a sinistra/destra. (Il `PanelIconButton` esistente resta il primitivo per i soli-icona; allinealo allo stesso linguaggio.)
- **Modal / Dialog shell:** backdrop + card + header (titolo, close) + body + footer azioni. Deve garantire **focus trap**, chiusura con **Esc**, `role="dialog"` + `aria-modal`, ripristino del focus alla chiusura, scroll-lock. Prop per dimensione e per footer personalizzato.
- **Field / Input:** wrapper con label, input/textarea/select, testo di aiuto, stato di errore + messaggio (`aria-invalid`, `aria-describedby`). Deve coprire i pattern di validazione già usati (nome vuoto, caratteri non validi, duplicati).
- **Tooltip:** accessibile (hover + focus), posizionamento base, ritardo, `prefers-reduced-motion`.
- **Badge / Pill:** neutro + varianti semantiche (info/success/warning/danger) coerenti coi token.
- (Verifica) **Toast:** `WorkspaceToastStack` esiste già — normalizzalo come primitivo con le stesse varianti semantiche, senza riscriverne la logica.

### B3 — Migrazione dei consumer
- **Modali:** ricondici i ~12 modali/dialog alla nuova Modal shell, uno alla volta (un commit per modale o per piccolo gruppo). Verifica focus trap e Esc su ciascuno.
- **Bottoni/field:** sostituisci le implementazioni locali coi primitivi Button/Field dove il cambiamento è a parità di resa.
- Rimuovi le varianti locali duplicate man mano che i primitivi le sostituiscono; elimina il codice morto.

### B4 — Documentazione
- Aggiorna `DESIGN-SYSTEM.md` con la sezione **Componenti**: per ogni primitivo, varianti, stati (default/hover/focus/active/disabled), note di accessibilità ed esempi d'uso.

## Verifica (obbligatoria prima di chiudere la fase)

- [ ] `npm run build` verde e test in `test/` verdi.
- [ ] Ogni modale migrato: apertura/chiusura, **Esc**, **focus trap**, ripristino focus, backdrop-click funzionano.
- [ ] Bottoni e field migrati mantengono la stessa resa e la stessa validazione.
- [ ] Nessun colore/spaziatura hardcoded introdotto; tutto da token.
- [ ] Stringhe nuove (se presenti) in `en` / `it` / `sq`.
- [ ] Screenshot before/after delle superfici che usano i primitivi migrati: resa equivalente.
- [ ] Codice duplicato dei vecchi primitivi rimosso (o marcato deprecato con motivazione).

## Output atteso a fine fase

1. Proposta di riconciliazione approvata (B1) e set canonico di primitivi.
2. Nuovi primitivi condivisi: Button, Modal shell, Field/Input, Tooltip, Badge (+ Toast normalizzato).
3. Consumer migrati (modali, bottoni, field) con commit separati.
4. `DESIGN-SYSTEM.md` aggiornato con la sezione Componenti.
5. Nota di sintesi: cosa è stato unificato, cosa deprecato, eventuali consumer non ancora migrati e perché.

---

Alla fine della Fase B saremo pronti per la **Fase C** (ridisegno delle superfici una alla volta: chrome → pannelli → canvas ER → modali → onboarding), che finalmente userà questi primitivi per cambiare davvero il look.
