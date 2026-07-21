# Prompt — Fase G: Rifinitura UI/UX delle funzionalità di navigazione del canvas (per Claude Code)

> Incolla tutto ciò che segue in Claude Code, dalla root del progetto ER Studio / buildER.
> Prerequisiti: Fasi A–F completate (design system, primitivi condivisi, superfici ridisegnate, a11y/responsive, e le nuove feature di navigazione: fit-to-screen/selection, minimap, auto-layout concettuale). Rispetta le regole invarianti in `CLAUDE.md`.

---

## Contesto

Le funzionalità di navigazione della Fase F sono state implementate e sono solide: `canvas/CanvasMinimap.tsx`, `utils/conceptualLayout.ts` (`autoLayoutConceptualDiagram`), `styles/canvas-navigation.css`, comandi *fit all* / *fit selection* (`Shift+1` / `Shift+2`) registrati in command menu e modale scorciatoie, i18n allineata `en`/`it`/`sq`. L'auto-layout ha già dialog di conferma, integrazione con undo (`commitDiagram`) e fit automatico dopo l'operazione.

Questa fase **non aggiunge feature nuove**: rifinisce quelle esistenti dove l'esperienza è ancora imperfetta, e sana l'incoerenza visiva tra i controlli nuovi (perfettamente tokenizzati) e il vecchio layer di overlay del canvas (ancora con valori hardcoded).

## Problemi rilevati (da risolvere, in ordine di priorità)

### G1 — La minimap distorce il diagramma (fedeltà)
In `CanvasMinimap.tsx` l'`<svg>` usa `preserveAspectRatio="none"` con un `viewBox` derivato dai bounds del mondo, mentre il contenitore ha dimensioni fisse (`--size-canvas-minimap-width/height`). Risultato: **la miniatura è stirata in modo non uniforme** — un diagramma largo appare schiacciato, i nodi perdono le proporzioni reali e anche il rettangolo del viewport risulta deformato. Questo rompe la corrispondenza mentale tra minimap e canvas, che è l'unico scopo della minimap.

- Correggi la proiezione mantenendo il rapporto d'aspetto (es. `preserveAspectRatio="xMidYMid meet"`, oppure calcolando un `viewBox` che rispetti l'aspect ratio del contenitore con letterboxing).
- **Attenzione:** la matematica di `worldPointFromPointer` e `centerViewport` assume oggi una mappatura lineare uniforme sull'intero rettangolo; va aggiornata coerentemente, altrimenti clic e drag puntano nel punto sbagliato. Verifica con test.

### G2 — La minimap non aiuta abbastanza a orientarsi
Oggi disegna solo rettangoli dei nodi. Per un diagramma ER l'orientamento passa dalle connessioni e dalla posizione di ciò che stai modificando.

- **Archi/relazioni:** disegna le connessioni in forma semplificata (linee sottili tra i centri dei nodi collegati). Mantieni la performance: nessun ricalcolo di routing, solo segmenti.
- **Selezione evidenziata:** i nodi selezionati devono essere riconoscibili nella minimap (colore accento dai token). È proprio quando si è persi in un diagramma grande che serve vedere dov'è la selezione.
- Valuta (proponendolo prima) un'interazione di zoom sulla minimap: rotellina per zoomare o doppio clic per *fit*.

### G3 — Affollamento e gerarchia degli overlay sul canvas
Nell'angolo in basso a destra convivono minimap, cluster dei controlli di zoom, `FloatingExportMenu` e i toast; in alto a sinistra c'è `.canvas-overlay-stack` (guidance, flow prompt, chip di affordance, pan hint).

- Verifica **collisioni e sovrapposizioni** a varie dimensioni di finestra e con minimap aperta/chiusa, inclusi i breakpoint `860px` e `640px`.
- Definisci un **sistema coerente di posizionamento e z-index** per tutti gli overlay del canvas (oggi la minimap usa `z-index: 19` fissato localmente), documentandolo con token/scala in `DESIGN-SYSTEM.md`.

### G4 — Incoerenza visiva tra controlli nuovi e overlay legacy
I nuovi controlli in `canvas-navigation.css` sono impeccabili (solo token, `--radius-panel`, `--elevation-popover`, scala tipografica). Il vecchio layer di overlay del canvas in `editor-refactor.css` (intorno alla riga 1657: `.canvas-overlay-stack`, `.canvas-guidance-main`, `.canvas-flow-prompt`, `.canvas-persistent-message-body`, `.canvas-affordance-chip`, `.canvas-pan-hint`, `.canvas-shortcut-chip`) usa ancora **valori hardcoded**: `top/left: 10px`, `gap: 8px`, `padding: 8px 10px`, `rgba(251, 252, 250, 0.92)`, `font-size: 0.78rem / 0.72rem`, `border-radius: 0`, alias legacy `--editor-*`.

- Portali sui token canonici e sulla scala tipografica, allineandoli visivamente ai nuovi controlli (stesse superfici, stessi raggi, stesse ombre, stessa densità).
- È parte del debito residuo di `editor-refactor.css` già noto: chiudilo almeno per l'area canvas.

### G5 — Rifinitura dell'auto-layout
L'implementazione è corretta (conferma, undo, fit finale, `setStatus`). Migliora la percezione:

- **Verifica se esiste "Organizza selezione"** oltre a "Organizza tutto"; se manca, valuta di aggiungerla (era prevista come opzione non distruttiva) — proponi prima.
- Il feedback oggi è un messaggio di stato: valuta un **toast con azione "Annulla"** che riporti allo stato precedente in un clic, invece di richiedere Ctrl+Z. Usa il sistema di toast esistente.
- Verifica la resa dell'algoritmo su casi ER complessi: generalizzazioni, identificatori interni/esterni, attributi multipli, relazioni ad anello. Se il risultato è scadente su qualche caso, segnalalo con esempi invece di forzare correzioni rischiose.

## Strumenti da sfruttare (plugin, skill e MCP)

All'avvio, **rileva quali skill e server MCP sono disponibili e autenticati**; usa quelli presenti, **salta con eleganza** quelli non disponibili e **dichiara** cosa hai usato.

- **`design:design-critique`** — sulla minimap e sul sistema di overlay del canvas, prima di modificarli.
- **`design:accessibility-review`** — dopo ogni blocco: focus, tastiera (la minimap è già focusabile con pan da frecce), contrasto dei nuovi colori, target ≥ 32px.
- **`design:design-system`** — verifica che G4 chiuda davvero l'hardcoded e che la scala di z-index sia coerente.
- **`design:ux-copy`** — testi di toast/azioni e label dei nuovi controlli.
- **Playwright** (già configurato) — test di regressione: fedeltà della minimap (nessuna distorsione), correttezza di clic/drag dopo il fix della proiezione, assenza di collisioni tra overlay ai breakpoint.
- **Figma** (se connesso) — riferimenti visivi per minimap/overlay; mappa le variabili ai token, mai hardcoded.

## Vincoli globali

- Solo token e primitivi condivisi (`src/components/ui/*`); nessun colore/spaziatura hardcoded introdotto.
- Ogni stringa via `t(...)` in `en` / `it` / `sq`.
- Nessuna regressione funzionale (pan/zoom, fit, drag minimap, selezione, undo/history, auto-layout) né di accessibilità.
- Rispetta responsive (`860px`, `640px`) e `prefers-reduced-motion`.
- Performance: la minimap deve restare fluida su diagrammi con 20+ entità; niente ridisegni costosi per frame.
- Nessuna nuova dipendenza senza conferma.
- **Un blocco (G1…G5) per commit.** Per G1 e G3 proponi l'approccio e attendi conferma prima di implementare.

## Verifica di chiusura

- [ ] `npm run build` verde; test in `test/` + Playwright verdi.
- [ ] G1: minimap proporzionata (nessuna distorsione); clic e drag centrano il punto corretto, verificato con test.
- [ ] G2: archi e selezione visibili nella minimap; performance invariata su diagrammi grandi.
- [ ] G3: nessuna collisione tra overlay ai breakpoint, con minimap aperta e chiusa; scala z-index documentata.
- [ ] G4: overlay legacy del canvas migrati ai token; `design:design-system` senza nuovi hardcoded nell'area canvas.
- [ ] G5: feedback dell'auto-layout migliorato; casi ER complessi verificati o segnalati.
- [ ] i18n allineata en/it/sq; `DESIGN-SYSTEM.md` aggiornato (overlay, z-index, minimap).
- [ ] Nota di sintesi per blocco: problema, prima/dopo, **strumenti effettivamente usati**.

## Come iniziare

1. Rileva skill e MCP disponibili/autenticati e dichiarali.
2. Parti da **G1** (è il difetto con l'impatto maggiore sulla fiducia nello strumento): proponi l'approccio alla proiezione → conferma → implementa → verifica con test.
3. Prosegui con G2, G3, G4, G5, un blocco per commit, senza passare oltre finché il precedente non è verificato.

---

> Nota autenticazione MCP: se Figma o altri connettori non sono autenticati, avvisami e procedi senza; potrò autenticarli con `/mcp` in Claude Code. Playwright non richiede autenticazione.
