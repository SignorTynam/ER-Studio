# Prompt — Miglioramento UI/UX del pannello Explorer (ER Studio / buildER)

> Copia tutto ciò che segue e passalo a un agente di coding (o usalo tu come brief).
> È scritto sulla base dell'architettura reale del progetto.

---

## Contesto del progetto

App React + TypeScript + Vite chiamata **buildER / ER Studio**: editor di diagrammi Entity-Relationship. Il pannello **Explorer** è un file-tree in stile VS Code che gestisce file `.erschema` (schemi ER), `.sql`, `.txt` e cartelle.

File coinvolti (NON introdurre nuove dipendenze, NON riscrivere l'architettura):

- `src/components/project/ProjectExplorer.tsx` — pannello: header, toolbar (nuovo file / nuova cartella / more), tree root, empty-state, resizer, context-menu.
- `src/components/project/ProjectExplorerTreeItem.tsx` — riga singola (chevron, icona, nome, dirty-dot, azioni hover) + riga di creazione inline + rename inline.
- `src/components/project/ProjectExplorerContextMenu.tsx` — menu contestuale.
- `src/styles/project-explorer.css` — tutti gli stili (usa le CSS variables del tema).
- `src/components/icons/StudioIcon.tsx` — set di icone (`StudioIconName`).
- `src/i18n/messages/{en,it,sq}.ts` — tutte le stringhe passano da `useI18n()` / `t(...)`.

## Vincoli tecnici (obbligatori)

1. **Usa SOLO le CSS variables esistenti** del design system: `--editor-panel`, `--editor-panel-strong`, `--editor-panel-muted`, `--editor-border`, `--editor-text`, `--editor-text-strong`, `--editor-text-muted`, `--editor-accent`, `--editor-accent-soft`, `--studio-accent`, `--studio-accent-strong`, `--studio-accent-soft`, `--studio-danger`, `--studio-warning`, `--studio-focus-ring`, `--studio-shadow-*`. Niente colori hardcoded nuovi; se servono sfumature usa `color-mix(...)` come già fa il file.
2. **Nessuna stringa hardcoded**: ogni testo nuovo va aggiunto alle 3 lingue (`en`, `it`, `sq`) e usato via `t(...)`.
3. **Preserva l'accessibilità già presente**: `role="tree"/"treeitem"/"group"`, `aria-selected`, `aria-expanded`, `aria-current`, navigazione da tastiera (frecce, Home/End, F2 rinomina, Delete, Enter/Space, ContextMenu/Shift+F10), focus ring visibile. Le modifiche NON devono romperla.
4. **Nessuna regressione funzionale**: creazione inline, rename inline con validazione (nome vuoto, caratteri `\ /`, duplicati), dirty-state, resizer, collapse-all, stato collassato del pannello devono continuare a funzionare.
5. Le icone devono venire da `StudioIcon`; se ne servono di nuove, aggiungi il nome a `StudioIconName` e disegnale nello stesso stile a tratto (stroke) del set esistente.
6. Rispetta i breakpoint responsive già definiti (`@media 860px`, `640px`).

## Obiettivo

Migliorare **leggibilità, gerarchia visiva, chiarezza dei tipi di file e feedback di stato** del pannello Explorer, mantenendo il linguaggio visivo "Studio" (piatto, bordi netti, header in maiuscoletto, accento verde). Deve restare denso e professionale come VS Code, ma più leggibile e meno rumoroso.

## Problemi attuali da risolvere (in ordine di priorità)

1. **Icone dei tipi di file poco distinguibili.** Schema `.erschema` usa l'icona `entity` (sembra un monitor), `sql` usa `database`, `text` usa `fileText`. A colpo d'occhio i tipi si confondono. → Dai a ogni tipo un'icona chiara e un **colore d'accento dedicato** (usando le variabili del tema o `color-mix`), es. schema = accento primario, sql = tinta secondaria, testo = neutro. Le cartelle devono avere icona **aperta vs chiusa** distinta (ora usano sempre `openProject`).

2. **Dirty-dot troppo rumoroso.** Il pallino di "non salvato" (`.project-explorer-item__dirty`) appare marcato accanto a ogni file modificato e domina la riga. → Rendilo più discreto ma leggibile: pallino piccolo allineato a destra, oppure grassetto/corsivo del nome + tooltip, coerente con il marcatore dirty delle tab (`.project-file-tab__dirty`). Deve restare accessibile (`aria-label` "modificato").

3. **Gerarchia e densità.** Righe a `min-height: 29px`, font `0.82rem`, linee-guida di indentazione sottili. → Rivedi spaziatura verticale, allineamento icona/nome, e rendi le **guide di indentazione** (`.project-explorer-children` border-left) più leggibili ma discrete. Migliora il contrasto tra stato **hover / selected / active** (oggi sono molto simili: hover e selected usano entrambi `--editor-panel-muted`).

4. **Estensione file nascosta.** `.project-explorer-item__extension` ha `opacity: 0` di default e compare solo in hover. → Valuta se mostrare l'estensione/tipo in modo sempre leggibile ma sobrio (badge o testo muted a destra), soprattutto per distinguere file con nome uguale ed estensione diversa.

5. **Azioni di riga solo in hover.** Il bottone "more" (`.project-explorer-item__actions`) è `opacity: 0` finché non passi il mouse: invisibile da tastiera/touch finché non c'è focus. → Assicura che compaia anche su focus-visible (già parziale) e sia raggiungibile da tastiera; valuta un'affordance touch.

6. **Header e metadati.** Il conteggio file/cartelle è sepolto nel menu "more". Header con titolo in maiuscoletto + 3 icon-button. → Migliora la gerarchia dell'header (titolo progetto + eventuale sottotitolo/percorso), rendi i pulsanti toolbar più riconoscibili con tooltip chiari, e valuta di esporre un conteggio sintetico in modo discreto.

7. **Empty-state.** `.project-explorer-empty` esiste già ma è minimale. → Rendilo più guidato e invitante (icona, titolo, 1 riga di aiuto, CTA primaria "Nuovo schema" + secondaria), mantenendo i testi via i18n.

8. **Micro-interazioni.** Le transizioni esistono (140ms). → Aggiungi feedback coerenti e sobri per hover/expand/collapse/selezione senza animazioni invadenti; rispetta `prefers-reduced-motion`.

## Deliverable richiesto

- Modifiche mirate a `project-explorer.css`, `ProjectExplorerTreeItem.tsx`, `ProjectExplorer.tsx` (e `StudioIcon.tsx` / file i18n se servono icone o stringhe nuove).
- Per ogni cambiamento: **una frase** che spiega il problema risolto.
- Nessuna modifica fuori dallo scope del pannello Explorer.
- Alla fine: un breve elenco puntato "prima/dopo" dei miglioramenti applicati, e conferma che navigazione da tastiera, i18n e dirty-state non sono regrediti.

## Criteri di accettazione

- [ ] I 4 tipi (schema/sql/testo/cartella) sono distinguibili a colpo d'occhio per icona e/o colore.
- [ ] Cartella aperta e chiusa hanno icone diverse.
- [ ] Stati hover / selected / active sono chiaramente distinti.
- [ ] Dirty-state leggibile ma non rumoroso, con `aria-label`.
- [ ] Solo CSS variables del tema, nessun colore nuovo hardcoded.
- [ ] Tutte le stringhe nuove in en + it + sq.
- [ ] Accessibilità e navigazione da tastiera invariate o migliorate.
- [ ] Rispetto di `prefers-reduced-motion` e dei breakpoint responsive esistenti.
