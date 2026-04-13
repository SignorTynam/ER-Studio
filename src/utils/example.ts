import type { DiagramDocument } from "../types/diagram";
import { parseDiagram } from "./diagram";

const COMPLETE_EXAMPLE_JSON_SOURCE = `{
  "meta": {
    "name": "Esempio Completo",
    "version": 1
  },
  "nodes": [
    {
      "id": "CITTA",
      "type": "entity",
      "x": 331.4093379918681,
      "y": -57.31177209208977,
      "width": 140,
      "height": 64,
      "isWeak": false,
      "internalIdentifiers": [
        {
          "id": "internalIdentifier-simple-CODICE_ISTAT",
          "attributeIds": [
            "CODICE_ISTAT"
          ]
        }
      ]
    },
    {
      "id": "CODICE_ISTAT",
      "type": "attribute",
      "x": 354.4193308966099,
      "y": -108.79869017425253,
      "width": 150,
      "height": 28,
      "isIdentifier": true,
      "isCompositeInternal": false,
      "isMultivalued": false
    },
    {
      "id": "NOME",
      "type": "attribute",
      "x": 512.4093379918681,
      "y": -59.31177209208977,
      "width": 150,
      "height": 28,
      "isIdentifier": false,
      "isCompositeInternal": false,
      "isMultivalued": false
    },
    {
      "id": "PROVINCIA",
      "type": "attribute",
      "x": 551.4093379918681,
      "y": 1.6882279079102318,
      "width": 150,
      "height": 28,
      "isIdentifier": false,
      "isCompositeInternal": false,
      "isMultivalued": false
    },
    {
      "id": "PERSONA",
      "type": "entity",
      "x": 392.28506794223296,
      "y": 279.43931670609356,
      "width": 140,
      "height": 64,
      "isWeak": false,
      "internalIdentifiers": [
        {
          "id": "internalIdentifier-ers-persona-1",
          "attributeIds": [
            "NOME_2",
            "COGNOME",
            "DATA_NASCITA"
          ]
        },
        {
          "id": "internalIdentifier-simple-CODICE_FISCALE",
          "attributeIds": [
            "CODICE_FISCALE"
          ]
        }
      ]
    },
    {
      "id": "CODICE_FISCALE",
      "type": "attribute",
      "x": 357.346477101595,
      "y": 283.9900070952582,
      "width": 150,
      "height": 28,
      "isIdentifier": true,
      "isCompositeInternal": false,
      "isMultivalued": false
    },
    {
      "id": "NOME_2",
      "type": "attribute",
      "x": 610.7681711458447,
      "y": 324.1551601805893,
      "width": 150,
      "height": 28,
      "isIdentifier": false,
      "isCompositeInternal": true,
      "isMultivalued": false
    },
    {
      "id": "COGNOME",
      "type": "attribute",
      "x": 595.5992031819626,
      "y": 255.16896796388215,
      "width": 150,
      "height": 28,
      "isIdentifier": false,
      "isCompositeInternal": true,
      "isMultivalued": false
    },
    {
      "id": "DATA_NASCITA",
      "type": "attribute",
      "x": 606.2174807566801,
      "y": 288.70585056975403,
      "width": 150,
      "height": 28,
      "isIdentifier": false,
      "isCompositeInternal": true,
      "isMultivalued": false
    },
    {
      "id": "COMUNE_NASCITA",
      "type": "attribute",
      "x": 562.2274736614219,
      "y": 231.73964416253045,
      "width": 150,
      "height": 28,
      "isIdentifier": false,
      "isCompositeInternal": false,
      "isMultivalued": false
    },
    {
      "id": "UOMO",
      "type": "entity",
      "x": 607.7343775530684,
      "y": 555.5145336487484,
      "width": 140,
      "height": 64,
      "isWeak": false
    },
    {
      "id": "DONNA",
      "type": "entity",
      "x": 148.175145990073,
      "y": 492.40552311331714,
      "width": 140,
      "height": 64,
      "isWeak": false
    },
    {
      "id": "MILITARE",
      "type": "entity",
      "x": 705.9176936144256,
      "y": 400.3155869706407,
      "width": 140,
      "height": 64,
      "isWeak": true
    },
    {
      "id": "LAVORATRICE",
      "type": "entity",
      "x": -88,
      "y": 415,
      "width": 140,
      "height": 64,
      "isWeak": false
    },
    {
      "id": "RESIDENZA",
      "type": "relationship",
      "x": 277.74582218872126,
      "y": 134.30032745643686,
      "width": 130,
      "height": 78
    },
    {
      "id": "DAL",
      "type": "attribute",
      "x": 234.47783659414975,
      "y": 207.6996725435631,
      "width": 150,
      "height": 28,
      "isIdentifier": false,
      "isCompositeInternal": false,
      "isMultivalued": false
    },
    {
      "id": "SERVIZIO",
      "type": "relationship",
      "x": 898.6673306816978,
      "y": 193.88244829073795,
      "width": 130,
      "height": 78
    },
    {
      "id": "GRADO",
      "type": "attribute",
      "x": 1065.8524695765125,
      "y": 218.3179501182806,
      "width": 150,
      "height": 28,
      "isIdentifier": false,
      "isCompositeInternal": false,
      "isMultivalued": false
    },
    {
      "id": "IMPIEGO",
      "type": "relationship",
      "x": 155,
      "y": 62,
      "width": 130,
      "height": 78
    },
    {
      "id": "RUOLO",
      "type": "attribute",
      "x": 134.31268350881857,
      "y": 37.80723134808326,
      "width": 150,
      "height": 28,
      "isIdentifier": false,
      "isCompositeInternal": false,
      "isMultivalued": false
    },
    {
      "id": "DOMICILIO_FISCALE",
      "type": "relationship",
      "x": 463.81340937427416,
      "y": 119.9024341002217,
      "width": 130,
      "height": 78,
      "isExternalIdentifier": false
    },
    {
      "id": "RECAPITI",
      "type": "attribute",
      "x": 381.7167548912246,
      "y": 411.4593025155771,
      "width": 110,
      "height": 52,
      "isIdentifier": false,
      "isCompositeInternal": false,
      "isMultivalued": true
    },
    {
      "id": "TIPO_RECAPITO",
      "type": "attribute",
      "x": 384.52017136075693,
      "y": 472.1351743711057,
      "width": 150,
      "height": 28,
      "isIdentifier": false,
      "isCompositeInternal": false,
      "isMultivalued": false
    },
    {
      "id": "VALORE_RECAPITO",
      "type": "attribute",
      "x": 487.66915351515536,
      "y": 498.7634448505649,
      "width": 150,
      "height": 28,
      "isIdentifier": false,
      "isCompositeInternal": false,
      "isMultivalued": false
    },
    {
      "id": "ESEMPIO COMPLETO CHEN",
      "type": "text",
      "x": -125.17659772098406,
      "y": -78.05286798553126,
      "width": 140,
      "height": 24
    }
  ],
  "edges": [
    {
      "id": "attribute-citta.codice_istat-citta-1",
      "sourceId": "CODICE_ISTAT",
      "targetId": "CITTA",
      "label": "",
      "lineStyle": "solid",
      "type": "attribute"
    },
    {
      "id": "attribute-citta.nome-citta-1",
      "sourceId": "NOME",
      "targetId": "CITTA",
      "label": "",
      "lineStyle": "solid",
      "type": "attribute"
    },
    {
      "id": "attribute-citta.provincia-citta-1",
      "sourceId": "PROVINCIA",
      "targetId": "CITTA",
      "label": "",
      "lineStyle": "solid",
      "type": "attribute"
    },
    {
      "id": "attribute-persona.codice_fiscale-persona-1",
      "sourceId": "CODICE_FISCALE",
      "targetId": "PERSONA",
      "label": "",
      "lineStyle": "solid",
      "type": "attribute"
    },
    {
      "id": "attribute-persona.nome-persona-1",
      "sourceId": "NOME_2",
      "targetId": "PERSONA",
      "label": "",
      "lineStyle": "solid",
      "type": "attribute"
    },
    {
      "id": "attribute-persona.cognome-persona-1",
      "sourceId": "COGNOME",
      "targetId": "PERSONA",
      "label": "",
      "lineStyle": "solid",
      "type": "attribute"
    },
    {
      "id": "attribute-persona.data_nascita-persona-1",
      "sourceId": "DATA_NASCITA",
      "targetId": "PERSONA",
      "label": "",
      "lineStyle": "solid",
      "type": "attribute"
    },
    {
      "id": "attribute-persona.comune_nascita-persona-1",
      "sourceId": "COMUNE_NASCITA",
      "targetId": "PERSONA",
      "label": "",
      "lineStyle": "solid",
      "type": "attribute"
    },
    {
      "id": "attribute-residenza.dal-residenza-1",
      "sourceId": "DAL",
      "targetId": "RESIDENZA",
      "label": "",
      "lineStyle": "solid",
      "type": "attribute"
    },
    {
      "id": "connector-residenza-persona-1",
      "sourceId": "RESIDENZA",
      "targetId": "PERSONA",
      "label": "",
      "lineStyle": "solid",
      "type": "connector",
      "cardinality": "(1,1)"
    },
    {
      "id": "connector-residenza-citta-1",
      "sourceId": "RESIDENZA",
      "targetId": "CITTA",
      "label": "",
      "lineStyle": "solid",
      "type": "connector",
      "cardinality": "(0,N)"
    },
    {
      "id": "attribute-servizio.grado-servizio-1",
      "sourceId": "GRADO",
      "targetId": "SERVIZIO",
      "label": "",
      "lineStyle": "solid",
      "type": "attribute"
    },
    {
      "id": "connector-servizio-militare-1",
      "sourceId": "SERVIZIO",
      "targetId": "MILITARE",
      "label": "",
      "lineStyle": "solid",
      "type": "connector",
      "cardinality": "(1,1)"
    },
    {
      "id": "connector-servizio-citta-1",
      "sourceId": "SERVIZIO",
      "targetId": "CITTA",
      "label": "",
      "lineStyle": "solid",
      "type": "connector",
      "cardinality": "(0,N)"
    },
    {
      "id": "attribute-impiego.ruolo-impiego-1",
      "sourceId": "RUOLO",
      "targetId": "IMPIEGO",
      "label": "",
      "lineStyle": "solid",
      "type": "attribute"
    },
    {
      "id": "connector-impiego-lavoratrice-1",
      "sourceId": "IMPIEGO",
      "targetId": "LAVORATRICE",
      "label": "",
      "lineStyle": "solid",
      "type": "connector",
      "cardinality": "(0,N)"
    },
    {
      "id": "connector-impiego-citta-1",
      "sourceId": "IMPIEGO",
      "targetId": "CITTA",
      "label": "",
      "lineStyle": "solid",
      "type": "connector",
      "cardinality": "(0,N)"
    },
    {
      "id": "connector-domicilio_fiscale-persona-1",
      "sourceId": "DOMICILIO_FISCALE",
      "targetId": "PERSONA",
      "label": "",
      "lineStyle": "solid",
      "type": "connector",
      "cardinality": "(1,1)"
    },
    {
      "id": "connector-domicilio_fiscale-citta-1",
      "sourceId": "DOMICILIO_FISCALE",
      "targetId": "CITTA",
      "label": "",
      "lineStyle": "solid",
      "type": "connector",
      "cardinality": "(0,N)"
    },
    {
      "id": "attribute-tipo_recapito-recapiti-1",
      "sourceId": "TIPO_RECAPITO",
      "targetId": "RECAPITI",
      "label": "",
      "lineStyle": "solid",
      "type": "attribute"
    },
    {
      "id": "attribute-valore_recapito-recapiti-1",
      "sourceId": "VALORE_RECAPITO",
      "targetId": "RECAPITI",
      "label": "",
      "lineStyle": "solid",
      "type": "attribute"
    },
    {
      "id": "attribute-recapiti-persona-1",
      "sourceId": "RECAPITI",
      "targetId": "PERSONA",
      "label": "",
      "lineStyle": "solid",
      "type": "attribute"
    },
    {
      "id": "inheritance-uomo-persona-1",
      "sourceId": "UOMO",
      "targetId": "PERSONA",
      "label": "",
      "lineStyle": "solid",
      "type": "inheritance",
      "isaDisjointness": "disjoint",
      "isaCompleteness": "total"
    },
    {
      "id": "inheritance-donna-persona-1",
      "sourceId": "DONNA",
      "targetId": "PERSONA",
      "label": "",
      "lineStyle": "solid",
      "type": "inheritance",
      "isaDisjointness": "disjoint",
      "isaCompleteness": "total"
    },
    {
      "id": "inheritance-militare-uomo-1",
      "sourceId": "MILITARE",
      "targetId": "UOMO",
      "label": "",
      "lineStyle": "solid",
      "type": "inheritance",
      "isaDisjointness": "overlap",
      "isaCompleteness": "partial"
    },
    {
      "id": "inheritance-lavoratrice-donna-1",
      "sourceId": "LAVORATRICE",
      "targetId": "DONNA",
      "label": "",
      "lineStyle": "solid",
      "type": "inheritance",
      "isaDisjointness": "overlap",
      "isaCompleteness": "partial"
    }
  ]
}`;

export function createExampleDiagram(): DiagramDocument {
  return parseDiagram(COMPLETE_EXAMPLE_JSON_SOURCE);
}
