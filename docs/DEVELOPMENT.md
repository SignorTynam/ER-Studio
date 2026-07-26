# Guida sviluppo buildER

Questa guida riassume il flusso pubblico. Le regole canoniche per agenti sono
instradate da [`docs/agents/INDEX.md`](agents/INDEX.md).

## Setup e comandi

Richiede Node.js 20 LTS, npm 10 o superiore e Git.

```bash
npm install
npm run dev
npm run build
npm test
npm run test:e2e
```

Controlli repository:

```bash
npm run agents:check
npm run repo:check-branch
npm run repo:check-commits
npm run test:policy
```

## Branch e commit

La convenzione completa e in
[`docs/agents/WORKFLOW.md`](agents/WORKFLOW.md). Parti da commit più recente del branch più aggiornato (se non viene specificato diversamente) e
usa uno dei prefissi:

```text
feat/<description>
fix/<description>
refactor/<description>
test/<description>
docs/<description>
chore/<description>
release/<X.Y.Z>
```

Usa Conventional Commits in inglese, minuscoli e imperativi:

```text
feat(canvas): add stable attribute placement
fix(edges): preserve relationship cardinality
docs(readme): clarify development workflow
```

## Checklist Pull Request

- [ ] Scope limitato e Issue collegata.
- [ ] Branch e commit conformi.
- [ ] `npm run build` e suite pertinente superati.
- [ ] `npm run test:e2e` eseguito per UI, layout, responsive o flussi utente.
- [ ] Test non eseguiti dichiarati.
- [ ] Documentazione aggiornata.
- [ ] Nessun output generato, cache, log, segreto o database reale.
- [ ] Screenshot prima/dopo per modifiche visive.

## UI e dominio

Per modifiche UI usa `src/styles/tokens.css`, i componenti condivisi,
[`docs/CODEX_UI_STYLE_GUIDE.md`](CODEX_UI_STYLE_GUIDE.md) e
[`docs/agents/RESPONSIVE_UI.md`](agents/RESPONSIVE_UI.md).

Parser, reverse engineering, layout, trasformazioni e formati richiedono test
di regressione. Le invarianti sono in
[`docs/agents/ER_DOMAIN.md`](agents/ER_DOMAIN.md); le aree piu sensibili
includono:

- `src/utils/ers.ts`
- `src/utils/projectFile.ts`
- `src/utils/projectSchemaFile.ts`
- `src/utils/erTranslation.ts`
- `src/utils/logicalTranslation.ts`
- `src/utils/sqlReverseParser.ts`
- `src/utils/sqlReverseDiagram.ts`
- `src/utils/sqlReverseLayout.ts`
- `src/utils/diagram.ts`
