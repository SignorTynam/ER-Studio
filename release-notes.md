# buildER v7.2.0

_2026-07-26_

buildER 7.2 aggiunge tag gestiti dall’utente e retention configurabile per la cronologia locale del progetto. Inoltre consolida il sistema dei token CSS e mantiene accessibili i controlli dell’onboarding sopra i pannelli mobile.

## Highlights

- **La cronologia sotto il tuo controllo** — Crea, rinomina, modifica ed elimina tag sui commit; configura la retention e scegli se mostrare i commit automatici senza indebolire le garanzie del ripristino.
- **Un sistema di design token più chiaro** — Le superfici condivise usano ora token CSS canonici controllati da un audit riproducibile, riducendo alias legacy e rendendo coerenti le decisioni visuali.
- **Onboarding mobile sempre raggiungibile** — Il tour guidato rimane sopra il Project Explorer aperto negli schermi stretti, con azioni visibili, cliccabili e senza overflow orizzontale.

## Added

- Aggiunti tag gestiti dall’utente per i commit locali, descrizioni, limiti configurabili della cronologia, protezione dei commit taggati, filtro dei commit automatici, anteprima della retention e persistenza .ersp compatibile.

## Changed

- Consolidati alias CSS legacy e stili hardcoded attorno ai design token canonici, con un audit strict riproducibile e un inventario aggiornato del debito dei token.

## Fixed

- Corretto il livello dell’onboarding mobile: Project Explorer non copre più il tour guidato e non intercetta le sue azioni nei viewport stretti.
