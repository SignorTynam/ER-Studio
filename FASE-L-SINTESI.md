# Fase L — Sintesi: toast affidabili e accessibili

Principio guida: **un toast con un'azione è una promessa.** Se scade prima che l'utente la raggiunga —
col mouse o con la tastiera — la promessa è rotta.

La fase è partita dal tempo (la pausa) ed è finita per scoprire che, in un caso, era **l'azione stessa
a tradire**: vedi in fondo.

## Strumenti usati (rilevati e dichiarati)

- **Browser in-app + `javascript_tool`** — la verifica decisiva. I toast durano 3,2–6,2 s: a colpi di
  screenshot il round-trip li faceva scadere e non si concludeva nulla. Guidando la pagina con script
  (dispatch di `mouseover`/`mouseout`, `focus()`, letture di `getComputedStyle` e `DOMMatrix`) ho
  potuto misurare con precisione pausa, residuo e stato dell'animazione.
- **Playwright** — `tests/e2e/workspace-toasts.spec.ts`, che trasforma quelle verifiche manuali in
  regressione automatica.
- **Self-check design-system / a11y** — solo token (`--space-0-5`, `--color-*`, `--motion-reveal`,
  `--z-*`); struttura ARIA rivista a mano e fissata nei test.
- **`design:ux-copy`** — non necessario: L2 si è risolto **rimuovendo** stringhe, non scrivendone.
- **Figma MCP** — non usato.

## Blocchi

| blocco | commit | cosa |
|---|---|---|
| L2 | `6e1507d` | via i titoli italiani hardcoded: la stack già localizza il default |
| L1 | `b36d6b9` | pausa su hover **e** focus per tutta la pila, ripresa dal residuo |
| L3 | `85986f3` | una sola live region parla: assertiva per gli errori, polite per il resto |
| L4 | `dd89c28` | countdown a token che si ferma insieme al timer |
| L5 | `7ab57b5` | z-index a token + scala documentata; audit geometrico delle collisioni |
| fix | `f85ec09` | **bug con perdita di dati** nell'undo catturato (sotto) + spec dei toast |

**L6**: la parte sostanziale è **già soddisfatta e testata** — azione e chiusura sono bottoni nativi in
tab order (posizioni 6 e 7 su 49) e il focus ferma il countdown, quindi l'azione è davvero
raggiungibile. Resta da decidere la **scorciatoia** proposta (`Alt+T`) per saltare sulla pila.

## Scoperte che valeva la pena avere

**1. L2 non richiedeva traduzioni nuove.** `setStatusWarning`/`setStatusError` forzavano
`title: "Operazione non valida"` / `"Errore"`, ma la toast stack **localizza già** il titolo di default
quando `title` è assente. Bastava non forzarlo: i valori italiani restano identici parola per parola,
en/sq si correggono da soli, zero chiavi aggiunte.

**2. Il doppio annuncio era peggio del previsto (L3).** Oltre alle live region annidate nei toast,
**l'intero footer della status bar** era `aria-live="polite"` e mostra lo stesso messaggio della
notice: stesso errore annunciato due volte, e per giunta zoom, nome file e nome progetto letti ad alta
voce a ogni cambiamento. Ora sull'intera pagina restano **esattamente due** live region.

**3. Il viewport è `pointer-events: none`.** `mouseenter`/`mouseleave` sul contenitore non sarebbero
mai scattati: la pausa su hover funziona perché usa `mouseover`/`mouseout`, che **risalgono** dai
singoli toast (`pointer-events: auto`).

**4. Nessuna collisione col canvas, una col pannello (L5).** Misurando i rect reali a 1280/863/640 px:
minimap e cluster zoom non toccano mai i toast. A **640 px** però il toast diventa quasi a tutta
larghezza e copre pannello laterale ed editor — e L1 lo rende più fastidioso, perché passandoci sopra
col mouse lo si mette in pausa proprio mentre si va verso ciò che copre. Lasciato invariato: cambiare
posizionamento è una scelta estetica da confermare.

## Il bug che il test nuovo ha fatto emergere

Scrivendo la spec che verifica *davvero* l'azione del toast (non solo che sparisca):

| undo da | nodi prima → dopo |
|---|---|
| toolbar | 3 → **3** ✅ |
| toast "Annulla" | 3 → **0** ❌ |

`useHistory.undo()` leggeva `past`/`present` dalla **closure del proprio render**. La toolbar usa
`onClick={handleUndoAction}`, quindi sempre la funzione corrente; il toast invece **cattura**
`handleUndoAction` alla creazione della notice — quando `past` conteneva ancora il diagramma vuoto,
perché il commit del layout non vi era ancora entrato. Risultato: cliccare "Annulla" dopo un
auto-layout **cancellava il diagramma** invece di riportarlo indietro.

Era rimasto invisibile perché `canvas-autolayout.spec.ts` clicca quel bottone da sempre, ma verifica
solo che il toast sparisca.

Fix: `past`/`present`/`future` passano da ref riallineate a ogni render. Ripara **5 punti** con lo
stesso pattern `onAction: handleUndoAction` (i quattro auto-layout e i toast degli auto-fix di Fase H).

**Regola da ricordare: qualsiasi callback consegnato a un toast va scritto per essere invocato molti
render dopo la sua creazione.**

## Verifica

- **`npm run build`** verde; **`npm test`** 744 pass / 0 fail / 2 skip.
- **Playwright** 80 pass / 1 fail — l'unico rosso è il preesistente bottone "What's new" a 35.6px
  contro il contratto ≤32px dell'header, **non correlato** a questa fase (verificato: nessun commit
  della sessione tocca `.designer-topbar-actions`). Lasciato rosso di proposito: allentare
  l'assertion avrebbe insabbiato un difetto di layout reale.
- **a11y**: due sole live region, errori assertivi e annunciati una volta, toast senza ruoli-live
  annidati, azione e chiusura raggiungibili da tastiera con il timer in pausa.
