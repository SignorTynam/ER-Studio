# Fase I — Sintesi: schermata Impostazioni centralizzata

Obiettivo: dare una **casa comune** alle preferenze finora sparse (lingua, diagnostica sul canvas,
minimap), stile IDE. *Gli stessi stati, un posto solo* — centralizzazione, non duplicazione.

## Strumenti usati (rilevati e dichiarati)

- **`design:design-critique`** — eseguito sull'**architettura dell'informazione** prima di
  implementare. Esito applicato: eliminata la sezione "Editor" (nessuna preferenza reale da
  esporre) e assorbita "Scorciatoie" dentro "Info" (niente sezioni-launcher a riga singola nella
  nav) → **3 sezioni** invece di 4/5.
- **Playwright** (già configurato) — `tests/e2e/settings.spec.ts`, incluso **axe** (`@axe-core`)
  sul dialogo Impostazioni: 0 violazioni.
- **Self-check design-system** — settings.css: 0 colori/hex/rgb hardcoded; spaziature/raggi/colori
  dai token; dimensioni dello switch **derivate dai token** via `calc`.
- **Figma MCP** — non necessario per questa superficie; non usato. (Se serviranno riferimenti
  visivi in futuro, `/mcp` per autenticare.)

## Decisioni (confermate)

- **3 sezioni**: Aspetto · Diagramma · Info.
- **Contenitore**: modale con nav a sinistra (riusa `ui/Modal`: focus-trap, Esc, scroll-lock, ARIA).
- **Lingua**: resta anche nel menu header **e** in Impostazioni — stessa `setLocale`, una sola fonte.

## Come funziona (I2)

- `components/settings/SettingsModal.tsx`: `role="tablist"` verticale (frecce/Home/End) + tabpanel;
  Aspetto (Lingua + Tema/Densità segnaposto "in arrivo"), Diagramma (2 switch), Info (3 launcher).
- **Nessun comportamento nuovo**: ogni controllo pilota lo **stato esistente**.
  - Lingua → `useI18n().setLocale`.
  - Diagnostica → stato `showDiagnostics` di App (condiviso col toggle di `ErrorsPanel`).
  - Minimap → nuovo `hooks/useCanvasMinimapVisibility` (`useSyncExternalStore` sopra
    `read/writeCanvasMinimapVisibility`): `DiagramCanvas` passa dallo `useState` locale allo store
    condiviso, così **canvas e Impostazioni restano sincronizzati** senza sollevare lo stato ad App.
- Apertura: **Ctrl+,**, command palette, ingranaggio in header (nuova icona `settings`); Esc chiude.
- i18n: blocco `settings.*` + `keyboardShortcuts.actions.openSettings` in **en/it/sq**; Ctrl+,
  documentata nel modale scorciatoie.

## I3 — rimandata (con motivo)

Il prompt lascia opzionale un unico store `usePreferences` versionato. **Rimandata**: il beneficio
non supera il rischio ora. La schermata funziona già agganciata agli stati esistenti, e per la
minimap `useCanvasMinimapVisibility` fornisce di fatto un primo "store di preferenza" riusabile —
un buon punto di partenza per un'eventuale unificazione futura, senza toccare `workspaceSession.ts`.

## Verifica (I4)

- **`npm run build`** verde; **`npm test`** 727 pass / 0 fail / 2 skip (parità i18n en/it/sq inclusa).
- **Playwright** `tests/e2e/settings.spec.ts` (4 scenari): apertura Ctrl+, + ingranaggio, cambio
  sezione, **axe pulito**, **lingua persistente dopo reload**, **minimap sincronizzata col canvas +
  persistente**, **diagnostica sincronizzata col pannello Errori**.
- **Accessibilità**: tablist verticale con frecce/Home/End, focus-trap + Esc dalla Modal shell,
  switch `role="switch"` con label associata e `aria-describedby`, select con label + descrizione;
  switch a 24px (target tocco WCAG 2.2 AA) con label ampia cliccabile. Contrasto sui token AA.
- **Design system**: solo token e primitivi (`Modal`, `Button`, `Badge`); nessun colore hardcoded.

## Predisposto per il tema scuro

La sezione **Aspetto** è la casa naturale del futuro toggle tema: aggiungerlo sarà **una riga**
(sostituire il segnaposto "in arrivo" con un `select` chiaro/scuro/sistema cablato al tema).
