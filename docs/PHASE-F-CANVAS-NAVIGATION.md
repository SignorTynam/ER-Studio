# Fase F — Orientamento e navigazione sul canvas ER

## F1 — Inquadratura e zoom

- Aggiunto il cluster viewport con zoom −/+, reset 100%, inquadra tutto e inquadra selezione.
- Riutilizzati i primitivi geometrici esistenti e il flusso request-token del canvas.
- Aggiunte le scorciatoie `Shift+1`, `Shift+2`, `Shift+0`, command menu e i18n en/it/sq.
- La transizione rispetta `prefers-reduced-motion` e viene interrotta dalle interazioni dirette.
- Verifica: unit test, Playwright funzionale, target ≥ 32 px e scansione axe del cluster.

## F2 — Minimap

- Aggiunta una rappresentazione SVG schematica, aggiornata con pan e zoom, senza ridisegnare il
  diagramma completo.
- Click, drag e frecce spostano la viewport; il pannello non sottrae eventi fuori dalle aree utili.
- Visibilità persistente, toggle dal pannello/command menu/tasto `M`; default chiuso sotto 860 px.
- Stili composti esclusivamente da token e primitivi condivisi.
- Verifica: 24 nodi in Playwright, pointer/tastiera/persistenza/responsive e scansione axe.

## F3 — Auto-layout concettuale

- Implementato un algoritmo Chen dedicato, deterministico e senza nuove dipendenze.
- Entità e relazioni formano il grafo principale; ISA impone il supertipo sopra i sottotipi;
  gli attributi vengono distribuiti attorno al proprio host con le utility già esistenti.
- La conferma usa la Modal condivisa. Il layout cambia solo `x`/`y`, viene salvato con un singolo
  `commitDiagram` ed è seguito da inquadra tutto.
- Accessi equivalenti: toolbar, command menu e `Shift+L`; testi completi in en/it/sq.
- Verifica: casi unitari per generalizzazioni, identificatori, attributi multipli/annidati e loop;
  Playwright per conferma, annullamento, fit e undo singolo, più scansione axe della Modal.

## Strumenti usati

- Build TypeScript/Vite e runner unitario Node/tsx.
- Playwright + Chromium e axe-core per flussi reali, responsive e accessibilità.
- Revisione diretta del design system e dei token del repository.

Le skill `design:design-critique`, `design:accessibility-review`, `design:ux-copy` e
`design:design-system` indicate nel brief non erano disponibili nell'ambiente; le relative
verifiche sono state svolte direttamente. Figma non è stato usato perché non era presente un
riferimento progettuale specifico da estrarre.

## Estensione a Translate e Logic

- Translate riusa HUD, minimappa e layout Chen del canvas ER, con preferenza minimappa separata,
  conferma specifica e commit singolo nella history della traduzione.
- Logic usa lo stesso cluster a cinque controlli e una minimappa derivata dai bounds reali delle
  tabelle. Il fit-selezione comprende tabelle, colonne e archi; le animazioni rispettano reduced
  motion.
- L'auto-layout logico continua a usare `autoLayoutLogicalModel`, ora con Modal di conferma,
  singolo undo e fit automatico.
- Command menu e scorciatoie (`Shift+1`, `Shift+2`, `Shift+0`, `M`, `Shift+L`) sono instradati
  alla vista attiva, senza comandi duplicati.
- Playwright verifica entrambe le viste con un progetto completo, inclusi axe, fit-selezione,
  conferma, scorciatoia e ripristino esatto con un solo undo.
