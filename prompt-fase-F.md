# Prompt — Fase F: Orientamento e navigazione sul canvas ER (per Claude Code)

> Incolla tutto ciò che segue in Claude Code, dalla root del progetto ER Studio / buildER.
> Prerequisiti: Fasi A–E completate (token, primitivi condivisi in `src/components/ui/`, superfici ridisegnate, a11y/responsive/motion verificati). Rispetta le regole invarianti in `CLAUDE.md`.

---

## Contesto

App React + TypeScript + Vite per diagrammi ER. Il redesign visivo è concluso. Questa fase aggiunge **funzionalità di navigazione** al canvas ER concettuale (`canvas/DiagramCanvas.tsx`), per rendere gestibili i diagrammi grandi (20+ entità). Non è un ridisegno estetico: sono feature nuove, coerenti col principio guida "su misura per l'ER" e costruite con i token e i primitivi già esistenti.

**Stato attuale rilevato (usalo, non reinventarlo):**
- `Viewport` è `{ x, y, zoom }` (`src/types/diagram.ts`), aggiornato dal canvas tramite la callback `onViewportChange(viewport)`.
- Esistono già i primitivi geometrici in utils (importati in `DiagramCanvas.tsx`): `getNodeBounds`, `getSelectionBounds`, `getBoundsForViewport(nodes)`, `viewportForBounds(bounds, rect, zoom)`, `expandBounds(bounds, padding)`, `normalizeBounds`, `clampZoom`. **Riusali** per calcolare inquadrature.
- Il "fit" esiste solo nei preview (SQL reverse / logico) tramite un meccanismo `fitRequestToken`; **sul canvas concettuale principale non è esposto** alcun comando "inquadra".
- La percentuale di zoom è già mostrata nella status bar (`BottomStatusBar.tsx`, `props.zoomPercent`, chiave `bottomStatus.zoomLabel`).
- L'auto-layout esiste **solo** per il modello logico/relazionale: `autoLayoutLogicalModel(...)` in `src/utils/logicalLayout.ts`. Sul canvas concettuale (entità/relazioni/attributi) **non c'è**.
- Command menu: `components/CommandMenuModal.tsx`; scorciatoie documentate in `components/KeyboardShortcutsModal.tsx`. Ogni nuova azione va registrata in entrambi.
- Icone: `components/icons/StudioIcon.tsx`. Nuove icone nello stesso stile stroke.
- i18n: `useI18n()` / `t(...)`, lingue `en` / `it` / `sq`. Ogni stringa nuova in tutte e tre.

## Obiettivo della Fase F

Tre feature, in ordine di rischio crescente:

1. **F1 — Inquadra tutto / Inquadra selezione (fit-to-screen & zoom-to-selection).**
2. **F2 — Minimap** (mini-mappa d'insieme con viewport trascinabile).
3. **F3 — Auto-layout del canvas concettuale** (riordino automatico di entità/relazioni/attributi).

Lavora **una feature per volta = un commit/PR a sé**, con conferma della direzione prima di implementare.

## Strumenti da sfruttare (plugin, skill e MCP)

All'avvio, **rileva quali skill e server MCP sono disponibili e autenticati**; usa quelli presenti, **salta con eleganza** quelli non disponibili, e **dichiara** cosa hai usato.

- **`design:design-critique`** — sulla proposta di UI dei controlli (fit, minimap) prima di implementare.
- **`design:accessibility-review`** — dopo ogni feature: focus, tastiera, target ≥ 32px, contrasto.
- **`design:ux-copy`** — label, tooltip e testi dei nuovi controlli/comandi.
- **`design:design-system`** — verifica che i nuovi componenti usino solo token e primitivi.
- **Playwright** (già configurato) — test: comportamento di fit/zoom, drag della minimap, e regressione visiva ai breakpoint.
- **Figma** (se connesso) — se hai riferimenti per minimap/controlli, estrai contesto e variabili e mappa ai token del progetto (mai hardcoded).

**Protocollo:** per ogni feature, critica/riferimenti → proposta → conferma → implementazione → verifica con skill/Playwright → nota di sintesi con strumenti usati.

## Feature

### F1 — Inquadra tutto / Inquadra selezione
Esporre come azioni utente ciò che i primitivi già permettono.

- **Comportamento:**
  - *Inquadra tutto*: calcola `getBoundsForViewport(nodes)`, applica `expandBounds` per un padding gradevole, poi `viewportForBounds(bounds, rect, zoom)` con `clampZoom`, e imposta il viewport via `onViewportChange`. Se non ci sono nodi, no-op.
  - *Inquadra selezione*: come sopra ma su `getSelectionBounds(selectedNodes)`; se non c'è selezione, fallback a "inquadra tutto".
  - *Reset zoom 100%* e *zoom in/out* già presenti: uniformali agli stessi controlli.
- **UI:** un cluster di controlli di zoom **flottante** sul canvas (in basso, coerente con la status bar) usando i primitivi `Button`/`IconButton` e `Tooltip`: zoom −, percentuale (clic = reset 100%), zoom +, inquadra tutto, inquadra selezione. Solo token per stile/posizione.
- **Scorciatoie:** registra in `CommandMenuModal` e `KeyboardShortcutsModal` con convenzioni comuni (es. *Fit all* = `Shift+1`, *Fit selection* = `Shift+2`, *Reset 100%* = `Shift+0` — proponi e conferma prima). Rispetta le scorciatoie già esistenti.
- **Animazione:** transizione morbida del viewport, che rispetti `prefers-reduced-motion`.

### F2 — Minimap
- **Comportamento:** mini-mappa in un angolo del canvas (default in basso a destra) che mostra l'insieme dei nodi in scala, con un rettangolo che rappresenta il viewport corrente. Trascinare il rettangolo (o cliccare) sposta il viewport (`onViewportChange`); si aggiorna al pan/zoom.
- **Requisiti:** performante su diagrammi grandi (deriva le posizioni dai bounds dei nodi, non ridisegnare l'intero diagramma pixel-perfect; bastano rettangoli). Comprimibile/nascondibile con stato ricordato. Non deve rubare eventi di interazione al canvas quando non serve.
- **UI/stile:** solo token (superficie elevata, bordo, ombra da `--elevation-*`); coerente coi pannelli. Accessibile: comando per mostrare/nascondere, `aria-label`, utilizzabile da tastiera dove sensato.
- **Responsive:** su viewport stretti (`860/640`) valuta di nasconderla di default.

### F3 — Auto-layout del canvas concettuale (feature a rischio — massima cautela)
- **Obiettivo:** un'azione "Organizza automaticamente" che dispone entità/relazioni/attributi in modo leggibile, riducendo il riordino manuale.
- **Approccio:** valuta se **adattare l'algoritmo esistente** `autoLayoutLogicalModel` (in `utils/logicalLayout.ts`) al modello concettuale, o se serve un layout dedicato (entità come nodi, relazioni come nodi intermedi, attributi ancorati al proprio host). **Proponi l'approccio a parole e attendi conferma prima di scrivere codice.**
- **Sicurezza (obbligatoria):**
  - L'operazione deve essere **un singolo step di undo** (integrazione con `useHistory`) e completamente reversibile.
  - **Non distruttiva per scelta:** chiedi conferma prima di riorganizzare un diagramma già disposto a mano (dialog con la Modal shell), oppure offri "Organizza selezione" oltre a "Organizza tutto".
  - Preserva la semantica del modello: cambia **solo le posizioni**, mai struttura/relazioni/cardinalità/identificatori.
  - Dopo il layout, esegui automaticamente *Inquadra tutto* (F1) per mostrare il risultato.
- **Accesso:** azione nella toolbar/command menu con label e tooltip curati (`design:ux-copy`), i18n en/it/sq.
- **Verifica extra:** test su diagrammi con generalizzazioni, identificatori esterni/interni, attributi multipli e relazioni ad anello (loop) — usa i casi in `test/` come riferimento e aggiungi copertura.

## Vincoli globali

- Solo token e primitivi condivisi (`src/components/ui/*`); nessun colore/spaziatura hardcoded.
- Ogni stringa via `t(...)` in `en` / `it` / `sq`; ogni nuova azione registrata in command menu + scorciatoie.
- Nessuna regressione funzionale (pan/zoom esistenti, selezione, drag, snap, undo/history, versioning) né di accessibilità.
- Rispetta responsive (`@media 860px`, `640px`) e `prefers-reduced-motion`.
- Riusa i primitivi geometrici esistenti invece di duplicarli.
- Nessuna nuova dipendenza senza conferma esplicita (se per la minimap o il layout proponi una libreria, fermati e chiedi prima).
- Una feature per commit; non mischiare F1/F2/F3.

## Verifica di chiusura della fase

- [ ] `npm run build` verde; test in `test/` + Playwright verdi.
- [ ] F1: inquadra tutto/selezione, reset 100%, zoom ± funzionano da controlli, scorciatoie e command menu; animazione rispetta reduced-motion.
- [ ] F2: minimap riflette pan/zoom, il drag sposta il viewport, performante su 20+ entità, comprimibile, accessibile.
- [ ] F3: auto-layout è un singolo undo, non distruttivo/confermato, cambia solo posizioni; regge generalizzazioni/identificatori/loop; seguito da fit automatico.
- [ ] `design:accessibility-review` pulito sui nuovi controlli; `design:design-system` senza nuovi hardcoded.
- [ ] i18n allineata en/it/sq; scorciatoie documentate nel modale.
- [ ] `DESIGN-SYSTEM.md` aggiornato (nuovi componenti: cluster zoom, minimap) e nota di sintesi per feature con **strumenti usati**.

## Come iniziare

1. Rileva skill e MCP disponibili/autenticati e dichiarali.
2. Parti da **F1** (rischio minimo, riusa i primitivi esistenti): proposta UI → conferma → implementazione → verifica.
3. Poi **F2**, infine **F3** (con proposta d'approccio e conferma prima di toccare l'algoritmo). Non passare alla feature successiva finché la precedente non è verificata.

---

> Nota autenticazione MCP: se Figma o altri connettori non sono autenticati, avvisami e procedi senza; potrò autenticarli con `/mcp` in Claude Code. Playwright non richiede autenticazione.
> F3 (auto-layout) è la parte con più rischio funzionale: se preferisci, si può rilasciare F1+F2 e trattare F3 come blocco separato successivo.
