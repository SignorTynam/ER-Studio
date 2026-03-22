export const APP_NAME = "Studio Diagrammi ER";
export const APP_VERSION = "2.4";
export const APP_TITLE = `${APP_NAME}`;

export interface AppChangelogEntry {
  version: string;
  date: string;
  updates: string[];
}

export const APP_CHANGELOG: AppChangelogEntry[] = [
  {
    version: "2.4",
    date: "2026-03-22",
    updates: [
      "Aggiunte entita deboli dedicate con doppio rettangolo, configurabili dall'Inspector e serializzate in ERS con la flag weak.",
      "Aggiunti attributi composti con nodo principale ovale, supporto ERS tramite multivalued e numero arbitrario di sotto-attributi collegabili.",
      "Generalizzazioni estese con vincoli ISA disjoint/overlap e total/partial, disponibili su canvas, Inspector e modalita codice.",
    ],
  },
  {
    version: "2.3",
    date: "2026-03-19",
    updates: [
      "Modalita codice aggiornata con sincronizzazione live: il diagramma si aggiorna automaticamente durante la scrittura del codice ERS valido.",
      "Rimosso il pulsante Applica al diagramma e semplificato il flusso operativo del pannello codice.",
      "Informazioni e guida allineate al nuovo comportamento live sync e alla versione 2.3.",
    ],
  },
  {
    version: "2.2",
    date: "2026-03-19",
    updates: [
      "Aggiornata la sezione Informazioni con stato notazione ER portato a v2.2 e descrizioni piu precise dei comandi principali.",
      "Allineata la versione applicativa e le etichette versione tra header, pagina iniziale e finestre informative.",
      "Migliorata la leggibilita del changelog con nuova voce di rilascio 2.2.",
    ],
  },
  {
    version: "2.1",
    date: "2026-03-19",
    updates: [
      "Aggiornata la sezione Informazioni con indicazioni piu chiare su strumenti, flusso di lavoro e stato della notazione ER.",
      "Allineata la versione applicativa e la scheda rilascio della pagina iniziale alla nuova versione 2.1.",
      "Migliorata la comunicazione delle funzionalita disponibili e dei prossimi elementi ER in roadmap.",
    ],
  },
  {
    version: "2.0",
    date: "2026-03-13",
    updates: [
      "Nuovo strumento Cancella (shortcut X): elimina con click diretto nodi e collegamenti.",
      "Flusso guidato per identificatore esterno: si crea selezionando identificatore sorgente e poi entita/attributo destinazione.",
      "Rendering identificatore esterno migliorato: linea stabile, routing anti-collisione e rispetto della posizione relativa degli elementi.",
      "Interazione completa identificatore esterno: trascinamento linea e pallina con offset persistenti.",
      "Rimozione identificatore esterno dedicata: con Delete sul simbolo oppure dal pulsante nell'Inspector, senza eliminare attributi.",
      "Validazioni cardinalita identificatore esterno aggiornate: richiesto (1,1) sul lato dipendente, nessun vincolo sull'altro lato.",
    ],
  },
  {
    version: "1.1",
    date: "2026-03-13",
    updates: [
      "Attributi con linea sempre dritta e aggancio corretto al bordo di entita/associazione.",
      "Migliorato posizionamento etichetta attributo sul lato opposto alla direzione del collegamento.",
      "Cardinalita configurabile da elenco (niente input libero), con supporto opzionale anche sui collegamenti attributo.",
      "Identificatore composto interno configurabile manualmente selezionando 2+ attributi.",
      "Blocco regola: un attributo nel composto interno non puo diventare identificatore singolo.",
      "Aggiunto identificatore esterno su associazione con controllo cardinalita obbligatorie 1:1 e 0:1.",
    ],
  },
  {
    version: "1.0",
    date: "2026-03-13",
    updates: [
      "Rinominato il menu Aiuto in Informazioni.",
      "Aggiunto il pulsante Novita con storico aggiornamenti.",
      "Introdotto versioning applicazione: Studio Diagrammi ER 1.0.",
      "Migliorata la resa attributi: cardinalita opzionale, etichetta dinamica e connessioni lineari.",
      "Aggiunto identificatore composto interno configurabile manualmente selezionando 2+ attributi.",
    ],
  },
];
