# Contributing Guide

Grazie per contribuire a buildER. Questa e la guida pubblica per persone e contributor; gli agenti usano anche [`docs/agents/INDEX.md`](docs/agents/INDEX.md).

## Setup

Richiede Node.js 20 LTS o superiore, npm 10 o superiore e Git.

```bash
npm install
npm run dev
```

Usa `npm ci` per verificare un'installazione pulita come in CI.

## Branch

Parti sempre da `main` aggiornata e non lavorare direttamente su `main`. Usa una descrizione breve, inglese, minuscola e kebab-case:

- `feat/<description>`
- `fix/<description>`
- `refactor/<description>`
- `test/<description>`
- `docs/<description>`
- `chore/<description>`
- `release/<X.Y.Z>`

Non usare underscore, accenti, spazi o slash aggiuntivi. `release/` richiede SemVer completo. Valida con:

```bash
npm run repo:check-branch
```

I branch di lavoro sono temporanei e vanno eliminati dopo il merge.

## Commit

Usa commit piccoli e atomici nel formato:

```text
type(scope): imperative description
```

I tipi ammessi sono `feat`, `fix`, `refactor`, `test`, `docs`, `chore`,
`build`, `ci`, `perf` e `release`. La descrizione e inglese, imperativa,
inizia in minuscolo ed e senza punto finale; i nomi propri mantengono la grafia
ufficiale.

```text
feat(canvas): add alignment guides
fix(files): preserve project metadata
docs(agents): clarify testing policy
```

Controlla il diff prima dello staging e non includere modifiche non correlate o file generati. Valida con `npm run repo:check-commits`.

## Test

Esegui test proporzionati al rischio e riporta anche quelli non eseguiti:

```bash
npm test
npm run build
```

- UI, layout, responsive e flussi utente richiedono Playwright pertinente e
  screenshot prima/dopo.
- i18n richiede chiavi allineate in italiano, inglese e albanese.
- parser, serializzazione, trasformazioni ER e compatibilita file richiedono
  un test di regressione e round-trip quando pertinente.
- dipendenze richiedono `npm ci`, suite pertinente e build.
- policy repository richiede `npm run agents:check` e `npm run test:policy`.

## UI, accessibilita e formati

Usa `src/styles/tokens.css` e i componenti condivisi. Preserva focus visibile, tastiera, ARIA, contrasto WCAG AA, touch, `prefers-reduced-motion` e layout desktop/tablet/mobile. Segui
[`docs/agents/RESPONSIVE_UI.md`](docs/agents/RESPONSIVE_UI.md).

`.ersp`, `.erschema` e `.ers` sono API interne compatibili: non eliminare migrazioni legacy ne perdere campi silenziosamente. Le regole di dominio sono in [`docs/agents/ER_DOMAIN.md`](docs/agents/ER_DOMAIN.md).

## Pull Request

Ogni PR:

1. collega l'Issue;
2. descrive problema, soluzione, impatto e rischi;
3. elenca test eseguiti e non eseguiti;
4. include screenshot e viewport per modifiche visive;
5. documenta i18n, accessibilita, responsive e compatibilita file quando pertinenti;
6. aggiorna la documentazione interessata;
7. non contiene output generati, database reali, segreti o log.

Non fare merge, force-push o pubblicazione release automatica durante la preparazione. Per segnalazioni di sicurezza segui `security.md` senza aprire Issue pubbliche contenenti dettagli sensibili.
