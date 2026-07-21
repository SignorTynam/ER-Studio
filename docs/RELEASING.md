# Pubblicare una release di buildER

buildER usa `package.json` come fonte ufficiale della versione e il catalogo strutturato delle release per generare changelog e note. Versione, catalogo, traduzioni e changelog devono quindi essere preparati e portati su `main` prima della pubblicazione.

## Procedura consigliata: GitHub Actions

1. Prepara la nuova versione in `package.json` e `package-lock.json`, la relativa voce nel catalogo, le traduzioni italiane, inglesi e albanesi e il changelog generato.
2. Porta tutte le modifiche completate e revisionate sulla branch `main`.
3. Apri la scheda **Actions** del repository su GitHub.
4. Seleziona il workflow **GitHub Release**.
5. Premi **Run workflow**.
6. Seleziona la branch `main`.
7. Abilita la conferma **Confermo la pubblicazione della versione corrente dichiarata in package.json**.
8. Avvia il workflow e attendi il completamento di validazione release, controllo changelog, test, build, generazione delle note e pubblicazione.

Il workflow legge la versione direttamente da `package.json`, crea e invia il solo tag annotato corrispondente e pubblica la GitHub Release nella stessa esecuzione. Non è necessario:

- creare il tag dal terminale;
- compilare manualmente la pagina **New release**;
- premere **Generate release notes**;
- scrivere manualmente il titolo o la descrizione della release.

La pubblicazione manuale viene rifiutata se non è confermata o se il workflow è avviato da una branch diversa da `main`. Tutti i controlli vengono completati prima della creazione del tag.

## Procedura alternativa: tag locale

La pubblicazione tradizionale tramite tag resta supportata. Dopo avere preparato, verificato e portato la release nel repository, crea e invia il tag corrispondente alla versione dichiarata in `package.json`:

```bash
git tag -a vX.Y.Z -m "buildER vX.Y.Z"
git push origin vX.Y.Z
```

Il push di un tag `v*.*.*` avvia lo stesso workflow **GitHub Release**. Il workflow verifica che il tag coincida esattamente con `v` seguito dalla versione completa di `package.json`, esegue gli stessi controlli e crea la release senza ricreare o reinviare il tag.

## Controlli e gestione degli stati esistenti

Prima della pubblicazione il workflow esegue, nell'ordine:

```bash
npm ci --include=dev
npm run release:check
npm run changelog:check
npm test
npm run build
npm run release:notes -- --output release-notes.md
```

`release:check` verifica che la versione sia SemVer completa, sia presente come release corrente nel catalogo, non contenga contenuti segnaposto, disponga delle traduzioni richieste e sia coerente con lockfile e changelog. La pubblicazione si interrompe se un controllo fallisce o se le note non possono essere generate.

Il workflow controlla separatamente tag remoto e GitHub Release:

- se entrambi sono assenti, crea il tag annotato e poi la release;
- se il tag esiste sul commit atteso ma la release è assente, crea solo la release;
- se la release esiste già, termina senza modificarla o duplicarla;
- se il tag punta a un commit diverso, oppure esiste una release senza il relativo tag, termina senza correggere o sovrascrivere lo stato esistente.

Le versioni con suffisso SemVer, per esempio `7.1.0-beta.1`, vengono pubblicate come prerelease. Le versioni stabili vengono pubblicate come release normali. Il workflow usa esclusivamente il `GITHUB_TOKEN` fornito da GitHub Actions: non richiede PAT o secret personalizzati.
