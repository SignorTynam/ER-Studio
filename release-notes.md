# buildER v7.1.0

_2026-07-25_

buildER 7.1 rende i file SQL parte integrante del workspace: puoi creare un database nel Playground dal DDL corrente, avviare subito il Reverse Engineering e lavorare con diagnostica più utile. Explorer, canvas, impostazioni, errori e notifiche ricevono inoltre un ampio aggiornamento di usabilità e accessibilità.

## Highlights

- **File SQL davvero operativi** — Editor condiviso, Playground con creazione del database dal DDL, richiesta del nome quando manca e Reverse Engineering immediato sul contenuto corrente.
- **Workspace più facile da organizzare** — Spostamento e drag-and-drop nell'Explorer, impostazioni centralizzate, minimappa e navigazione canvas migliorate, topbar e Source Control più puliti.
- **Errori e notifiche più utili** — Quick fix guidati, diagnostica navigabile, toast accessibili e localizzati, stati vuoti coerenti e comportamento responsive rifinito.

## Added

- Aggiunti il workflow dedicato per i file SQL, la creazione di database Playground dal DDL, il Reverse Engineering diretto, il selettore del dialetto, le spiegazioni per gli statement non supportati, la schermata Impostazioni, lo spostamento dei file nell'Explorer e i quick fix nel pannello Errori.

## Changed

- Migliorati topbar, Source Control, stati vuoti, minimappa, auto-layout e navigazione del canvas, diagnostica dell'editor, responsive design, localizzazione italiana/inglese/albanese, accessibilità dei toast e documentazione tecnica.

## Fixed

- Corretti la cronologia undo/redo con stato obsoleto, gli annunci duplicati dei toast, il timer durante hover e focus, alcune azioni di correzione guidata e la generazione degli identificatori progetto, ora basata su UUID sicuri; aggiunti anche controlli repository per branch, commit e SemVer.
