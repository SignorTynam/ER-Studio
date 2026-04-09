export const APP_NAME = "Studio Diagrammi ER";
export const APP_VERSION = "3.2.0";
export const APP_TITLE = `${APP_NAME}`;

export interface AppChangelogEntry {
  version: string;
  date: string;
  updates: string[];
}

export const APP_CHANGELOG: AppChangelogEntry[] = [
  {
    version: "3.2.0",
    date: "2026-04-09",
    updates: [
      "Validazione semantica degli identificatori esterni centralizzata nel dominio con invalidazione automatica quando i legami richiesti non sono piu coerenti.",
      "Sincronizzazione stato/UI sugli identificatori esterni invalidi: cleanup dei metadati residui e avvisi specifici mostrati all'utente durante l'editing.",
      "Routing grafico degli identificatori esterni rifinito su junction finali reali, con eliminazione di micro-stub e migliore leggibilita dei raccordi.",
      "Drag entita esteso agli attributi collegati (inclusi attributi identificanti e composti interni) per mantenere la struttura durante lo spostamento.",
      "Creazione elementi con identita separate: ID tecnico progressivo (`entity1`, `attribute1`, `relationship1`) distinto dal nome visuale (`ENTITA1`, `ATTRIBUTO1`, `RELAZIONE1`).",
      "Versione applicativa, metadata e documentazione allineati alla release 3.2.0.",
    ],
  },
  {
    version: "3.1.0",
    date: "2026-04-07",
    updates: [
      "UI contestuale rifinita: onboarding guidato alla prima apertura con step reali (crea entita, collega, rinomina).",
      "Toolbar piu focalizzata: azioni contestuali mostrate in base alla selezione anche con pannello strumenti chiuso.",
      "Rimosse le azioni duplicate tra barra contestuale e inspector embedded, con meno rumore durante l'editing.",
      "Messaggi di errore uniformati nel formato unico: cosa e successo, perche, e come risolvere in una sola frase.",
      "Export PNG corretto: risoluzione esplicita delle variabili CSS del canvas per evitare immagini nere o incomplete.",
      "Introdotti autosalvataggio locale e ripristino sessione automatico dopo chiusura o crash.",
      "Ripristino workspace esteso a diagramma ER, vista logica, viewport/selezioni, bozza ERS e stato pannelli.",
    ],
  },
  {
    version: "3.0.0",
    date: "2026-03-29",
    updates: [
      "Vista Logica riattivata nel workspace con switch dedicato ER/Logica in testata.",
      "Generazione automatica del modello relazionale dal diagramma ER con rendering tabelle, PK/FK e riferimenti.",
      "Flusso operativo logico completo: rigenera modello, auto-layout e adatta al viewport direttamente dalla barra azioni.",
    ],
  },
  {
    version: "2.5.2",
    date: "2026-03-29",
    updates: [
      "Release allineata alla richiesta corrente: workspace centrato su diagramma ER senza introdurre la vista logica in UI.",
      "Confermata la coerenza dell'identificatore esterno come attributo dell'entita anche nelle validazioni.",
      "Rifinito il rendering dei marker degli identificatori esterni composti (punti e raccordi) con geometria piu pulita.",
    ],
  },
  {
    version: "2.5.1",
    date: "2026-03-27",
    updates: [
      "Toast workspace unificati in overlay: non spostano piu il layout e sostituiscono i vecchi messaggi inline nel canvas.",
      "Esteso il flusso notifiche ai messaggi guidati di collegamento, alle rimozioni/eliminazioni e ai warning selezionati dall'inspector.",
      "Lista validazioni resa attivabile: cliccando un warning o un errore nell'inspector viene mostrato subito il relativo toast.",
      "Menu Workspace corretto come pannello floating ancorato al pulsante, senza clipping o testi schiacciati nell'header.",
      "Workspace laterale migliorato: rail strumenti piu largo di default e pannelli laterali ridimensionabili con drag handle e reset rapido.",
    ],
  },
  {
    version: "2.4.3",
    date: "2026-03-27",
    updates: [
      "Refactor geometria connector: anchor logico spostato al centro del bounding box per il calcolo di direzione, lato dominante e routing iniziale.",
      "Routing ortogonale reso piu stabile: i trunk paralleli si spostano senza cambiare lato di uscita o ingresso dei nodi.",
      "Clipping finale sul bordo separato dalla logica di routing, con linee piu bilanciate durante drag, move e resize.",
      "Toast workspace rifatti in overlay: non spostano il layout, si chiudono da soli e sono riservati ad avvisi ed errori.",
    ],
  },
  {
    version: "2.4.2",
    date: "2026-03-25",
    updates: [
      "Accessibilita tastiera estesa al canvas: focus su nodi e collegamenti, selezione da tastiera, spostamento con frecce e rinomina con Invio.",
      "Aggiunta protezione dalle modifiche non salvate su home, guida codice, nuovo diagramma e import JSON/ERS, oltre alla guardia prima di chiudere la pagina.",
      "Notifiche migliorate con toast di successo e azione rapida Annulla dove possibile; creazione collegamenti resa piu chiara con preview visiva ed Esc per annullare.",
    ],
  },
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
