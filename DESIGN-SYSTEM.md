# DESIGN-SYSTEM — buildER / ER Studio

Fonte di verità: **`src/styles/tokens.css`**. Tema solo **light** (`color-scheme: light`).
Regola fondante: **solo token, mai valori hardcoded** — nessun esadecimale, `rgb()/rgba()`
o px "magico" nei componenti e nei CSS; se serve una sfumatura si usa `color-mix(...)`
sui token; se manca un token, si aggiunge a `tokens.css` (documentato) e poi si usa.

Stato del debito pregresso e piano di convergenza: vedi `TOKEN-DEBT.md`.

## Tavolozza (uso semantico)

### Superfici

| Token | Valore | Uso |
|---|---|---|
| `--color-bg-app` | `#e8ecea` | Fondale applicazione (dietro i pannelli) |
| `--color-bg-header` | `#151a18` | Header scuro dell'app |
| `--color-bg-rail` | `#202724` | Activity rail scura |
| `--color-bg-sidebar` | `#f4f6f5` | Sidebar/Explorer |
| `--color-bg-panel` | `#f8faf9` | Pannelli e superfici di lavoro |
| `--color-bg-elevated` | `#ffffff` | Superfici sollevate: card, menu, input, righe attive di editor |
| `--color-bg-editor` | `#fbfcfb` | Area editor testo/codice |
| `--color-bg-diagram-canvas` | `#dfe3dc` | Canvas del diagramma ER |

### Stati di superficie

| Token | Valore | Uso |
|---|---|---|
| `--color-bg-hover` | `#e8eeeb` | Hover su righe/controlli |
| `--color-bg-selected` | `#dbe8e3` | Elemento selezionato (focus di navigazione) |
| `--color-bg-active` | `#cfe0da` | Elemento attivo/aperto (stato più forte del selected) |
| `--color-bg-disabled` | `#f2f4f1` | Sfondo controlli disabilitati |

Hover, selected e active sono **tre stati distinti e ordinati per intensità**: non
collassarli sullo stesso token.

### Bordi

| Token | Valore | Uso |
|---|---|---|
| `--color-border-subtle` | `#e2e7e4` | Separatori interni discreti |
| `--color-border-default` | `#cbd4cf` | Bordo standard di pannelli e controlli |
| `--color-border-strong` | `#9caaa2` | Bordo di enfasi/selezione neutra |

### Testo

| Token | Valore | Uso |
|---|---|---|
| `--color-text-primary` | `#17201c` | Testo principale |
| `--color-text-secondary` | `#4f5f57` | Testo secondario |
| `--color-text-muted` | `#748078` | Meta/didascalie (⚠ sotto AA come testo normale: vedi TOKEN-DEBT) |
| `--color-text-disabled` | `#9ca69f` | Testo disabilitato |
| `--color-text-on-accent` | `#ffffff` | Testo/icone su superfici accent o scure |

### Accento e semantici

| Token | Valore | Uso |
|---|---|---|
| `--color-accent` | `#2f6f62` | Azioni primarie, selezioni, indicatori attivi |
| `--color-accent-hover` | `#24594f` | Hover/pressed dell'accento |
| `--color-accent-muted` | `#dcebe6` | Tinta soft dell'accento (sfondi evidenziati) |
| `--color-danger` | `#bd4b3f` | Errori, azioni distruttive |
| `--color-warning` | `#a8741c` | Avvisi (⚠ come testo è sotto AA su sfondi chiari) |
| `--color-success` | `#2f7857` | Conferme |
| `--color-info` | `#3977a8` | Informazioni |
| `--color-modified` | `#ad6b19` | Indicatore "modificato/non salvato" (dot dirty di tab ed Explorer) |

## Tipografia

Font UI: ereditato dallo stack di piattaforma configurato in `foundations.css`.

| Token | Valore | Uso |
|---|---|---|
| `--font-size-2xs` | `0.68rem` | Micro-etichette, badge, contatori |
| `--font-size-xs` | `0.72rem` | Etichette uppercase, header di pannello |
| `--font-size-sm` | `0.76rem` | Testo secondario denso |
| `--font-size-md` | `0.82rem` | Testo base di liste, tree, form |
| `--font-size-lg` | `0.9rem` | Titoli di sezione |
| `--font-size-xl` | `1rem` | Titoli di pannello/dialogo |

Line-height: `--line-height-none` 1 · `--line-height-tight` 1.2 · `--line-height-snug` 1.35 ·
`--line-height-normal` 1.45 · `--line-height-relaxed` 1.55.

Font-weight: `--font-weight-regular` 400 · `--font-weight-medium` 500 ·
`--font-weight-semibold` 600 · `--font-weight-bold` 700 · `--font-weight-heavy` 800.
I pesi intermedi storici (650, 750, 760, 820…) sono debito da convergere.

## Spaziatura

Scala a passo 2/4px: `--space-0-5` 2 · `--space-1` 4 · `--space-1-5` 6 · `--space-2` 8 ·
`--space-2-5` 10 · `--space-3` 12 · `--space-3-5` 14 · `--space-4` 16 · `--space-4-5` 18 ·
`--space-5` 20 · `--space-6` 24 · `--space-8` 32.

## Dimensioni standard

| Token | Valore | Uso |
|---|---|---|
| `--size-header` | 44px | Altezza header app |
| `--size-activity-rail` | 48px | Larghezza activity rail |
| `--size-tab` | 36px | Altezza tab |
| `--size-editor-context` | 32px | Barra contestuale editor |
| `--size-tree-row` | 30px | Riga del file tree |
| `--size-input` / `--size-button` | 32px | Controlli standard (target minimo 32px) |
| `--size-button-sm` | 28px | Controlli compatti |
| `--size-icon-button` | 30px | Icon button |
| `--size-sidebar-min/default/max` | 220/288/420px | Larghezze Explorer |
| `--size-statusbar` | 24px | Status bar |

## Raggi

`--radius-control` 4px (controlli) · `--radius-panel` 6px (pannelli) · `--radius-dialog` 10px (dialoghi).
Nota: molte superfici legacy usano ancora radius 0 ("bordi netti"); la direzione unica
va decisa in Fase B — fino ad allora non introdurre nuovi valori di raggio fuori scala.

## Ombre / elevazioni

| Token | Uso |
|---|---|
| `--elevation-flat` | Nessuna ombra (default superfici piatte) |
| `--elevation-popover` | Popover, dropdown, menu contestuali |
| `--elevation-dialog` | Modali e dialoghi |

Esiste una scala legacy consolidata (`--studio-shadow-sm/panel/floating/shadow`) usata
dalle superfici storiche: non usarla per superfici nuove; verrà unificata su `--elevation-*`.

## Motion e focus

`--motion-fast` 120ms · `--motion-normal` 180ms — sempre dietro `transition` disattivabile
con `prefers-reduced-motion`. Focus visibile: `--focus-ring` (doppio anello, da usare come
`box-shadow`) oppure `outline: 2px solid var(--color-accent)` con `outline-offset: -2px`
dove il box-shadow non è praticabile. Non usare mai `--studio-focus-ring` dentro `outline:`
(è un valore box-shadow).

## Alias legacy

`--studio-*`, `--editor-*`, `--panel-*`, `--diagram-*`, `--text-main/muted`, `--warning/error/success-bg/border`
sono definiti in `tokens.css` come alias dei canonici (o con valori storici verbatim) per
compatibilità con i CSS esistenti. **Le superfici nuove usano solo i token canonici**
(`--color-*`, `--space-*`, `--size-*`, `--font-*`, `--radius-*`, `--elevation-*`, `--motion-*`).
Gli alias verranno progressivamente deprecati.

## Checklist per ogni modifica CSS

1. Nessun colore/px/rem hardcoded: solo token (o `color-mix` su token).
2. Stati hover/selected/active/disabled distinti coi token di stato.
3. Contrasto: testo normale ≥ 4.5:1, testo grande/UI ≥ 3:1 (attenzione a `--color-text-muted`).
4. Focus visibile e non rimosso; target interattivi ≥ 32px.
5. Transizioni via `--motion-*` e rispettose di `prefers-reduced-motion`.
6. Responsive: breakpoint esistenti (`860px`, `640px`) invariati.

## Componenti condivisi (Fase B)

Libreria canonica: **`src/components/ui/`** (import da `../components/ui`). Regola di fase:
la resa visiva di Button/Modal/Field viaggia ancora sulle classi legacy (doppia classe);
la Fase C sposterà il look sulle classi `ui-*` e ritirerà le skin.

### Button (`ui/Button.tsx`)
- Varianti: `primary` (azione principale, skin `mode-button active`) · `secondary` (default, skin `header-button`) · `danger` (skin `header-button`, semantica distruttiva) · `ghost` (stilato da token in `ui.css`).
- Dimensioni: `md` (32px) · `sm` (28px) — in Fase B effettive solo su `ghost`.
- Stati: `disabled`; `loading` → spinner + `aria-busy` + input bloccato.
- Icone opzionali `iconLeft`/`iconRight` dal set `StudioIcon`. `type="button"` di default.

### Modal (`ui/Modal.tsx`)
- Struttura: backdrop → card (`role="dialog"`, `aria-modal`) → header (titolo/sottotitolo/close) → children → footer opzionale.
- Comportamento garantito: focus iniziale (rispetta `autoFocus`/`data-autofocus` del contenuto), focus trap su Tab/Shift+Tab, Esc, click sul backdrop, ripristino del focus alla chiusura, scroll-lock del body con conteggio; `busy` blocca tutte le vie di chiusura.
- Header custom: `hideClose` + `ariaLabelledBy` puntato all'heading nei children.
- `legacySkin`: `help` (default, famiglia `help-modal-*`) · `studio` (famiglia `studio-modal-*`) · `none`.
- I form con submit renderizzano il footer dentro il proprio `<form>` (classi `ui-modal__footer action-modal-actions`).

### Field (`ui/Field.tsx`)
- `label` + controllo + `help` + `error`; con children-funzione fornisce `{ id, invalid, describedBy }` per `aria-invalid`/`aria-describedby`.
- L'errore ha `role="alert"`; copre i pattern di validazione esistenti (nome vuoto, caratteri non validi, duplicati).

### Tooltip (`ui/Tooltip.tsx`)
- Compare su hover **e** focus, ritardo configurabile (default 350ms), Esc per nascondere, transizione disattivata con `prefers-reduced-motion`.
- Il nodo resta nel DOM (`data-visible`): con children-funzione fornisce l'`aria-describedby` da mettere sul controllo. Adozione prevista in Fase C (oggi l'app usa `title` nativi).

### Badge (`ui/Badge.tsx`)
- Toni: `neutral | info | success | warning | danger` dai token semantici, maiuscoletto compatto. Adozione delle pill esistenti in Fase C.

### Toast (`WorkspaceToastStack`)
- Normalizzato in Fase B: titoli default e tempo relativo via i18n (`workspaceToasts.*`, en/it/sq), `role="alert"` per gli errori, `aria-live="polite"` sullo stack. Toni allineati alla scala semantica (`error` esterno ↔ `danger` dei token).

### Icon button
- `PanelIconButton` (riesportato da `ui/`) resta il primitivo per i soli-icona: `aria-label` obbligatoria, 28–30px, stile dalle co-classi di superficie fino alla Fase C.

### Deprecati
- `components/panels.tsx` (`PanelShell`, `PanelHeader`, `PanelTabs`, `PanelSection`, `CollapsiblePanel`, `PanelCard`, `WarningCard`, `EmptyStateCard`): **@deprecated**, vivi solo per inspector/dock/sidebar fino al ridisegno di Fase C. Rimossi gli orfani `WorkspacePanelBody`, `PanelStepCard`, `WorkspaceViewBar`, `WorkspaceViewButton`, `CommandOptionRow`.

## Chrome scuro (Fase C1)

Il chrome (header, activity rail, status bar) vive su `--color-bg-header`: **un solo scuro**.
Token dedicati per la leggibilità su scuro: `--color-accent-on-dark` `#73bbaa` (indicatori
attivi, focus ring del chrome) e `--color-modified-on-dark` `#e4b466` (dot "modificato",
toni warning della status bar). Testi su scuro via `color-mix` su `--color-text-on-accent`
(88% valori · 78% testo · 54% etichette · 8–16% superfici hover/bordi). Geometria a spigolo
netto: nessuna forma rotonda nel chrome (eccezioni 999px rimaste solo sui close dei modali,
in revisione in Fase C4). Ritmo verticale: header `--size-header` 44 · tab `--size-tab` 36 ·
status `--size-statusbar` 24; indicatore attivo delle tab singolo (barra superiore accent).
Tooltip: primitivo `ui/Tooltip` (posizioni `top|bottom|right`) su tutti gli icon-button di
header e rail al posto dei `title` nativi.
