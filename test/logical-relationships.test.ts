import assert from "node:assert/strict";
import test from "node:test";

import type { DiagramDocument, DiagramEdge, DiagramNode } from "../src/types/diagram.ts";
import {
  applyLogicalTranslationChoice,
  buildLogicalTranslationOverview,
  createEmptyLogicalWorkspace,
  getLogicalTranslationChoicesForItem,
} from "../src/utils/logicalTranslation.ts";
import { generateLogicalModel } from "../src/utils/logicalMapping.ts";

function createEntity(
  id: string,
  label: string,
  keyAttributeId: string,
  keyAttributeLabel: string,
  relationshipParticipations: NonNullable<Extract<DiagramNode, { type: "entity" }>["relationshipParticipations"]>,
): DiagramNode[] {
  const entity: Extract<DiagramNode, { type: "entity" }> = {
    id,
    type: "entity",
    label,
    x: 0,
    y: 0,
    width: 160,
    height: 80,
    internalIdentifiers: [
      {
        id: `${id}-pk`,
        attributeIds: [keyAttributeId],
      },
    ],
    relationshipParticipations,
  };

  const attribute: Extract<DiagramNode, { type: "attribute" }> = {
    id: keyAttributeId,
    type: "attribute",
    label: keyAttributeLabel,
    x: 0,
    y: 0,
    width: 100,
    height: 40,
    isIdentifier: true,
  };

  return [entity, attribute];
}

function createAttributeEdge(id: string, sourceId: string, targetId: string): DiagramEdge {
  return {
    id,
    type: "attribute",
    sourceId,
    targetId,
    label: "",
    lineStyle: "solid",
  };
}

function createConnectorEdge(id: string, sourceId: string, targetId: string, participationId: string): DiagramEdge {
  return {
    id,
    type: "connector",
    sourceId,
    targetId,
    label: "",
    lineStyle: "solid",
    participationId,
  };
}

function createRelationship(id: string, label: string): DiagramNode {
  return {
    id,
    type: "relationship",
    label,
    x: 0,
    y: 0,
    width: 120,
    height: 70,
  };
}

function createEntityWithoutKey(
  id: string,
  label: string,
  relationshipParticipations: NonNullable<Extract<DiagramNode, { type: "entity" }>["relationshipParticipations"]> = [],
): DiagramNode {
  return {
    id,
    type: "entity",
    label,
    x: 0,
    y: 0,
    width: 160,
    height: 80,
    relationshipParticipations,
  };
}

function createAttachedAttribute(
  hostId: string,
  attributeId: string,
  label: string,
  options: Partial<Extract<DiagramNode, { type: "attribute" }>> = {},
): { node: DiagramNode; edge: DiagramEdge } {
  return {
    node: {
      id: attributeId,
      type: "attribute",
      label,
      x: 0,
      y: 0,
      width: 100,
      height: 40,
      ...options,
    },
    edge: createAttributeEdge(`edge-${attributeId}`, attributeId, hostId),
  };
}

function createInheritanceEdge(id: string, subtypeId: string, supertypeId: string): DiagramEdge {
  return {
    id,
    type: "inheritance",
    sourceId: subtypeId,
    targetId: supertypeId,
    label: "",
    lineStyle: "solid",
  };
}

function createRelationshipRegressionDiagram(): DiagramDocument {
  const nodes: DiagramNode[] = [
    ...createEntity("entity-lezione", "LEZIONE", "attr-lezione-id", "idLezione", [
      { id: "part-lezione-orario", relationshipId: "rel-orario", cardinality: "(1,1)" },
    ]),
    ...createEntity("entity-edizione-corso", "EDIZIONE CORSO", "attr-edizione-id", "idEdizione", [
      { id: "part-edizione-orario", relationshipId: "rel-orario", cardinality: "(0,N)" },
      { id: "part-edizione-docenza", relationshipId: "rel-docenza", cardinality: "(0,1)" },
    ]),
    ...createEntity("entity-docente", "DOCENTE", "attr-docente-id", "idDocente", [
      { id: "part-docente-docenza", relationshipId: "rel-docenza", cardinality: "(0,N)" },
    ]),
    createRelationship("rel-orario", "ORARIO"),
    createRelationship("rel-docenza", "DOCENZA"),
  ];

  const edges: DiagramEdge[] = [
    createAttributeEdge("edge-attr-lezione-id", "attr-lezione-id", "entity-lezione"),
    createAttributeEdge("edge-attr-edizione-id", "attr-edizione-id", "entity-edizione-corso"),
    createAttributeEdge("edge-attr-docente-id", "attr-docente-id", "entity-docente"),
    createConnectorEdge("edge-lezione-orario", "entity-lezione", "rel-orario", "part-lezione-orario"),
    createConnectorEdge("edge-edizione-orario", "entity-edizione-corso", "rel-orario", "part-edizione-orario"),
    createConnectorEdge("edge-docente-docenza", "entity-docente", "rel-docenza", "part-docente-docenza"),
    createConnectorEdge("edge-edizione-docenza", "entity-edizione-corso", "rel-docenza", "part-edizione-docenza"),
  ];

  return {
    meta: {
      name: "Regressioni relazioni 1:N",
      version: 1,
    },
    notes: "",
    nodes,
    edges,
  };
}

function getItemByLabel(
  overview: ReturnType<typeof buildLogicalTranslationOverview>,
  step: keyof ReturnType<typeof buildLogicalTranslationOverview>["itemsByStep"],
  label: string,
) {
  const item = overview.itemsByStep[step].find((candidate) => candidate.label === label);
  assert.ok(item, `Elemento di traduzione non trovato: ${step} -> ${label}`);
  return item;
}

function getRecommendedChoice(
  overview: ReturnType<typeof buildLogicalTranslationOverview>,
  item: Parameters<typeof getLogicalTranslationChoicesForItem>[1],
) {
  const choice = getLogicalTranslationChoicesForItem(overview, item).find((candidate) => candidate.recommended) ??
    getLogicalTranslationChoicesForItem(overview, item)[0];
  assert.ok(choice, `Scelta non trovata per ${item.label}`);
  return choice;
}

function getChoiceByRule(
  overview: ReturnType<typeof buildLogicalTranslationOverview>,
  item: Parameters<typeof getLogicalTranslationChoicesForItem>[1],
  rule: string,
) {
  const choice = getLogicalTranslationChoicesForItem(overview, item).find((candidate) => candidate.rule === rule);
  assert.ok(choice, `Scelta ${rule} non trovata per ${item.label}`);
  return choice;
}

function applyEntityChoices(diagram: DiagramDocument) {
  let workspace = createEmptyLogicalWorkspace(diagram);
  let overview = buildLogicalTranslationOverview(diagram, workspace);

  for (const label of ["LEZIONE", "EDIZIONE CORSO", "DOCENTE"]) {
    const item = getItemByLabel(overview, "entities", label);
    const choice = getRecommendedChoice(overview, item);
    workspace = applyLogicalTranslationChoice(diagram, workspace, choice, item.targetType, item.id);
    overview = buildLogicalTranslationOverview(diagram, workspace);
  }

  return { workspace, overview };
}

test("la traduzione guidata 1:N assegna la FK al carrier corretto e nasconde le relazioni risolte", () => {
  const diagram = createRelationshipRegressionDiagram();
  let { workspace, overview } = applyEntityChoices(diagram);

  const orarioItem = getItemByLabel(overview, "relationships", "ORARIO");
  const docenzaItem = getItemByLabel(overview, "relationships", "DOCENZA");

  const orarioChoice = getRecommendedChoice(overview, orarioItem);
  const docenzaChoice = getRecommendedChoice(overview, docenzaItem);

  assert.equal(orarioChoice.label, "FK su LEZIONE");
  assert.match(
    orarioChoice.description,
    /PK del lato 1 \(EDIZIONE CORSO\) migra come FK nella tabella del lato N \(LEZIONE\)/,
  );
  assert.equal(docenzaChoice.label, "FK su EDIZIONE CORSO");
  assert.match(
    docenzaChoice.description,
    /PK del lato 1 \(DOCENTE\) migra come FK nella tabella del lato N \(EDIZIONE CORSO\)/,
  );

  workspace = applyLogicalTranslationChoice(diagram, workspace, orarioChoice, orarioItem.targetType, orarioItem.id);
  overview = buildLogicalTranslationOverview(diagram, workspace);
  workspace = applyLogicalTranslationChoice(diagram, workspace, docenzaChoice, docenzaItem.targetType, docenzaItem.id);
  overview = buildLogicalTranslationOverview(diagram, workspace);

  const appliedOrarioItem = getItemByLabel(overview, "relationships", "ORARIO");
  const appliedDocenzaItem = getItemByLabel(overview, "relationships", "DOCENZA");

  assert.equal(appliedOrarioItem.currentSummary, 'Relazione "ORARIO" assorbita come FK in "LEZIONE".');
  assert.equal(appliedDocenzaItem.currentSummary, 'Relazione "DOCENZA" assorbita come FK in "EDIZIONE CORSO".');

  const lezioneTable = workspace.model.tables.find((table) => table.sourceEntityId === "entity-lezione");
  const edizioneTable = workspace.model.tables.find((table) => table.sourceEntityId === "entity-edizione-corso");
  const docenteTable = workspace.model.tables.find((table) => table.sourceEntityId === "entity-docente");

  assert.ok(lezioneTable, "Tabella LEZIONE non generata");
  assert.ok(edizioneTable, "Tabella EDIZIONE CORSO non generata");
  assert.ok(docenteTable, "Tabella DOCENTE non generata");

  const orarioFk = workspace.model.foreignKeys.find((foreignKey) => foreignKey.sourceRelationshipId === "rel-orario");
  const docenzaFk = workspace.model.foreignKeys.find((foreignKey) => foreignKey.sourceRelationshipId === "rel-docenza");

  assert.ok(orarioFk, "FK per ORARIO non generata");
  assert.ok(docenzaFk, "FK per DOCENZA non generata");

  assert.equal(orarioFk.fromTableId, lezioneTable.id);
  assert.equal(orarioFk.toTableId, edizioneTable.id);
  assert.equal(orarioFk.required, true);
  assert.equal(docenzaFk.fromTableId, edizioneTable.id);
  assert.equal(docenzaFk.toTableId, docenteTable.id);
  assert.equal(docenzaFk.required, false);

  assert.ok(
    lezioneTable.columns.some((column) => column.isForeignKey && column.references.some((reference) => reference.targetTableId === edizioneTable.id)),
    "LEZIONE deve contenere la FK verso EDIZIONE CORSO",
  );
  assert.ok(
    edizioneTable.columns.some((column) => column.isForeignKey && column.references.some((reference) => reference.targetTableId === docenteTable.id)),
    "EDIZIONE CORSO deve contenere la FK verso DOCENTE",
  );

  assert.equal(
    workspace.transformation.nodes.some((node) => node.id === "rel-orario" || node.id === "rel-docenza"),
    false,
    "Le relazioni assorbite non devono restare come nodi attivi sul canvas logico",
  );

  const hiddenConnectorIds = new Set(["edge-lezione-orario", "edge-edizione-orario", "edge-docente-docenza", "edge-edizione-docenza"]);
  assert.equal(
    workspace.transformation.edges.some((edge) => typeof edge.sourceEdgeId === "string" && hiddenConnectorIds.has(edge.sourceEdgeId)),
    false,
    "I connector delle relazioni risolte non devono restare nel graph logico",
  );

  assert.ok(
    workspace.transformation.edges.some(
      (edge) =>
        edge.kind === "foreign-key" &&
        edge.sourceId === lezioneTable.id &&
        edge.targetId === edizioneTable.id &&
        edge.relatedTargetKeys.includes("relationship:rel-orario"),
    ),
    "Il graph logico deve esporre la FK ORARIO da LEZIONE a EDIZIONE CORSO",
  );
  assert.ok(
    workspace.transformation.edges.some(
      (edge) =>
        edge.kind === "foreign-key" &&
        edge.sourceId === edizioneTable.id &&
        edge.targetId === docenteTable.id &&
        edge.relatedTargetKeys.includes("relationship:rel-docenza"),
    ),
    "Il graph logico deve esporre la FK DOCENZA da EDIZIONE CORSO a DOCENTE",
  );
});

test("il mapping logico diretto mantiene la stessa regola generale 1:N", () => {
  const diagram = createRelationshipRegressionDiagram();
  const model = generateLogicalModel(diagram);

  const lezioneTable = model.tables.find((table) => table.sourceEntityId === "entity-lezione");
  const edizioneTable = model.tables.find((table) => table.sourceEntityId === "entity-edizione-corso");
  const docenteTable = model.tables.find((table) => table.sourceEntityId === "entity-docente");

  assert.ok(lezioneTable, "Tabella LEZIONE non generata");
  assert.ok(edizioneTable, "Tabella EDIZIONE CORSO non generata");
  assert.ok(docenteTable, "Tabella DOCENTE non generata");

  const orarioFk = model.foreignKeys.find((foreignKey) => foreignKey.sourceRelationshipId === "rel-orario");
  const docenzaFk = model.foreignKeys.find((foreignKey) => foreignKey.sourceRelationshipId === "rel-docenza");

  assert.ok(orarioFk, "FK ORARIO non generata");
  assert.ok(docenzaFk, "FK DOCENZA non generata");

  assert.equal(orarioFk.fromTableId, lezioneTable.id);
  assert.equal(orarioFk.toTableId, edizioneTable.id);
  assert.equal(docenzaFk.fromTableId, edizioneTable.id);
  assert.equal(docenzaFk.toTableId, docenteTable.id);
});

function createGeneralizationPipelineRegressionDiagram(): DiagramDocument {
  const personaNodes = createEntity("entity-persona", "PERSONA", "attr-persona-cf", "CF", []);
  const datoreNodes = createEntity("entity-datore", "DATORE", "attr-datore-id", "Codice", [
    { id: "part-datore-impiego-corrente", relationshipId: "rel-impiego-corrente", cardinality: "(0,N)" },
    { id: "part-datore-impiego-passato", relationshipId: "rel-impiego-passato", cardinality: "(0,N)" },
  ]);
  const edizioneNodes = createEntity("entity-edizione-corso", "EDIZIONE CORSO", "attr-edizione-id", "idEdizione", [
    { id: "part-edizione-orario", relationshipId: "rel-orario", cardinality: "(0,N)" },
    { id: "part-edizione-docenza", relationshipId: "rel-docenza", cardinality: "(0,1)" },
  ]);
  const lezioneNodes = createEntity("entity-lezione", "LEZIONE", "attr-lezione-id", "idLezione", [
    { id: "part-lezione-orario", relationshipId: "rel-orario", cardinality: "(1,1)" },
  ]);

  const partecipanteNode = createEntityWithoutKey("entity-partecipante", "PARTECIPANTE");
  const docenteNode = createEntityWithoutKey("entity-docente", "DOCENTE", [
    { id: "part-docente-docenza", relationshipId: "rel-docenza", cardinality: "(0,N)" },
  ]);
  const dipendenteNode = createEntityWithoutKey("entity-dipendente", "DIPENDENTE", [
    { id: "part-dipendente-impiego-corrente", relationshipId: "rel-impiego-corrente", cardinality: "(1,1)" },
    { id: "part-dipendente-impiego-passato", relationshipId: "rel-impiego-passato", cardinality: "(0,N)" },
  ]);
  const internoNode = createEntityWithoutKey("entity-interno", "INTERNO");
  const collaboratoreNode = createEntityWithoutKey("entity-collaboratore", "COLLABORATORE");

  const docenteTelefono = createAttachedAttribute("entity-docente", "attr-docente-telefono", "Telefono");
  const dipendentePosizione = createAttachedAttribute("entity-dipendente", "attr-dipendente-posizione", "Posizione");
  const internoBadge = createAttachedAttribute("entity-interno", "attr-interno-badge", "Badge");
  const collaboratoreContratto = createAttachedAttribute("entity-collaboratore", "attr-collaboratore-contratto", "Contratto");
  const impiegoCorrenteDataInizio = createAttachedAttribute("rel-impiego-corrente", "attr-impiego-corrente-data-inizio", "DataInizio");
  const impiegoPassatoDataInizio = createAttachedAttribute("rel-impiego-passato", "attr-impiego-passato-data-inizio", "DataInizio");
  const impiegoPassatoDataFine = createAttachedAttribute("rel-impiego-passato", "attr-impiego-passato-data-fine", "DataFine");

  const nodes: DiagramNode[] = [
    ...personaNodes,
    ...datoreNodes,
    ...edizioneNodes,
    ...lezioneNodes,
    partecipanteNode,
    docenteNode,
    dipendenteNode,
    internoNode,
    collaboratoreNode,
    docenteTelefono.node,
    dipendentePosizione.node,
    internoBadge.node,
    collaboratoreContratto.node,
    createRelationship("rel-orario", "ORARIO"),
    createRelationship("rel-docenza", "DOCENZA"),
    createRelationship("rel-impiego-corrente", "IMPIEGO CORRENTE"),
    createRelationship("rel-impiego-passato", "IMPIEGO PASSATO"),
    impiegoCorrenteDataInizio.node,
    impiegoPassatoDataInizio.node,
    impiegoPassatoDataFine.node,
  ];

  const edges: DiagramEdge[] = [
    createInheritanceEdge("edge-partecipante-persona", "entity-partecipante", "entity-persona"),
    createInheritanceEdge("edge-docente-persona", "entity-docente", "entity-persona"),
    createInheritanceEdge("edge-dipendente-partecipante", "entity-dipendente", "entity-partecipante"),
    createInheritanceEdge("edge-interno-docente", "entity-interno", "entity-docente"),
    createInheritanceEdge("edge-collaboratore-docente", "entity-collaboratore", "entity-docente"),
    docenteTelefono.edge,
    dipendentePosizione.edge,
    internoBadge.edge,
    collaboratoreContratto.edge,
    impiegoCorrenteDataInizio.edge,
    impiegoPassatoDataInizio.edge,
    impiegoPassatoDataFine.edge,
    ...personaNodes.slice(1).map((attributeNode) => createAttributeEdge(`edge-${attributeNode.id}`, attributeNode.id, "entity-persona")),
    ...datoreNodes.slice(1).map((attributeNode) => createAttributeEdge(`edge-${attributeNode.id}`, attributeNode.id, "entity-datore")),
    ...edizioneNodes.slice(1).map((attributeNode) => createAttributeEdge(`edge-${attributeNode.id}`, attributeNode.id, "entity-edizione-corso")),
    ...lezioneNodes.slice(1).map((attributeNode) => createAttributeEdge(`edge-${attributeNode.id}`, attributeNode.id, "entity-lezione")),
    createConnectorEdge("edge-lezione-orario", "entity-lezione", "rel-orario", "part-lezione-orario"),
    createConnectorEdge("edge-edizione-orario", "entity-edizione-corso", "rel-orario", "part-edizione-orario"),
    createConnectorEdge("edge-docente-docenza", "entity-docente", "rel-docenza", "part-docente-docenza"),
    createConnectorEdge("edge-edizione-docenza", "entity-edizione-corso", "rel-docenza", "part-edizione-docenza"),
    createConnectorEdge("edge-dipendente-impiego-corrente", "entity-dipendente", "rel-impiego-corrente", "part-dipendente-impiego-corrente"),
    createConnectorEdge("edge-datore-impiego-corrente", "entity-datore", "rel-impiego-corrente", "part-datore-impiego-corrente"),
    createConnectorEdge("edge-dipendente-impiego-passato", "entity-dipendente", "rel-impiego-passato", "part-dipendente-impiego-passato"),
    createConnectorEdge("edge-datore-impiego-passato", "entity-datore", "rel-impiego-passato", "part-datore-impiego-passato"),
  ];

  return {
    meta: {
      name: "Pipeline generalizzazioni e relazioni",
      version: 1,
    },
    notes: "",
    nodes,
    edges,
  };
}

test("la pipeline materializza prima le PK derivate dei sottotipi e poi le FK dipendenti", () => {
  const diagram = createGeneralizationPipelineRegressionDiagram();
  let workspace = createEmptyLogicalWorkspace(diagram);
  let overview = buildLogicalTranslationOverview(diagram, workspace);

  for (const label of [
    "PERSONA",
    "PARTECIPANTE",
    "DOCENTE",
    "DIPENDENTE",
    "INTERNO",
    "COLLABORATORE",
    "DATORE",
    "EDIZIONE CORSO",
    "LEZIONE",
  ]) {
    const item = getItemByLabel(overview, "entities", label);
    const choice = getRecommendedChoice(overview, item);
    workspace = applyLogicalTranslationChoice(diagram, workspace, choice, item.targetType, item.id);
    overview = buildLogicalTranslationOverview(diagram, workspace);
  }

  for (const label of ["DOCENTE", "PARTECIPANTE", "PERSONA"]) {
    const item = getItemByLabel(overview, "generalizations", label);
    const choice = getRecommendedChoice(overview, item);
    workspace = applyLogicalTranslationChoice(diagram, workspace, choice, item.targetType, item.id);
    overview = buildLogicalTranslationOverview(diagram, workspace);
  }

  const orarioItem = getItemByLabel(overview, "relationships", "ORARIO");
  const docenzaItem = getItemByLabel(overview, "relationships", "DOCENZA");
  const impiegoCorrenteItem = getItemByLabel(overview, "relationships", "IMPIEGO CORRENTE");
  const impiegoPassatoItem = getItemByLabel(overview, "relationships", "IMPIEGO PASSATO");

  workspace = applyLogicalTranslationChoice(
    diagram,
    workspace,
    getRecommendedChoice(overview, orarioItem),
    orarioItem.targetType,
    orarioItem.id,
  );
  overview = buildLogicalTranslationOverview(diagram, workspace);
  workspace = applyLogicalTranslationChoice(
    diagram,
    workspace,
    getRecommendedChoice(overview, docenzaItem),
    docenzaItem.targetType,
    docenzaItem.id,
  );
  overview = buildLogicalTranslationOverview(diagram, workspace);
  workspace = applyLogicalTranslationChoice(
    diagram,
    workspace,
    getChoiceByRule(overview, impiegoCorrenteItem, "relationship-table"),
    impiegoCorrenteItem.targetType,
    impiegoCorrenteItem.id,
  );
  overview = buildLogicalTranslationOverview(diagram, workspace);
  workspace = applyLogicalTranslationChoice(
    diagram,
    workspace,
    getRecommendedChoice(overview, impiegoPassatoItem),
    impiegoPassatoItem.targetType,
    impiegoPassatoItem.id,
  );
  overview = buildLogicalTranslationOverview(diagram, workspace);

  const tableBySourceEntityId = new Map(
    workspace.model.tables
      .filter((table) => typeof table.sourceEntityId === "string")
      .map((table) => [table.sourceEntityId as string, table]),
  );
  const docenteTable = tableBySourceEntityId.get("entity-docente");
  const dipendenteTable = tableBySourceEntityId.get("entity-dipendente");
  const internoTable = tableBySourceEntityId.get("entity-interno");
  const collaboratoreTable = tableBySourceEntityId.get("entity-collaboratore");
  const edizioneTable = tableBySourceEntityId.get("entity-edizione-corso");
  const lezioneTable = tableBySourceEntityId.get("entity-lezione");
  const datoreTable = tableBySourceEntityId.get("entity-datore");
  const partecipanteTable = tableBySourceEntityId.get("entity-partecipante");
  const personaTable = tableBySourceEntityId.get("entity-persona");

  assert.ok(docenteTable, "Tabella DOCENTE non generata");
  assert.ok(dipendenteTable, "Tabella DIPENDENTE non generata");
  assert.ok(internoTable, "Tabella INTERNO non generata");
  assert.ok(collaboratoreTable, "Tabella COLLABORATORE non generata");
  assert.ok(edizioneTable, "Tabella EDIZIONE CORSO non generata");
  assert.ok(lezioneTable, "Tabella LEZIONE non generata");
  assert.ok(datoreTable, "Tabella DATORE non generata");
  assert.ok(partecipanteTable, "Tabella PARTECIPANTE non generata");
  assert.ok(personaTable, "Tabella PERSONA non generata");

  const modelIssueMessages = workspace.model.issues.map((issue) => issue.message);
  assert.equal(
    modelIssueMessages.some((message) => /destinazione non ha PK disponibile/i.test(message)),
    false,
    "La pipeline non deve piu produrre warning per PK mancanti sui sottotipi",
  );

  const docentePkColumns = docenteTable.columns.filter((column) => column.isPrimaryKey);
  const dipendentePkColumns = dipendenteTable.columns.filter((column) => column.isPrimaryKey);
  const internoPkColumns = internoTable.columns.filter((column) => column.isPrimaryKey);
  const collaboratorePkColumns = collaboratoreTable.columns.filter((column) => column.isPrimaryKey);

  assert.ok(
    docentePkColumns.some((column) => column.references.some((reference) => reference.targetTableId === personaTable.id)),
    "DOCENTE deve avere una PK derivata da PERSONA",
  );
  assert.ok(
    dipendentePkColumns.some((column) => column.references.some((reference) => reference.targetTableId === partecipanteTable.id)),
    "DIPENDENTE deve avere una PK derivata da PARTECIPANTE",
  );
  assert.ok(
    internoPkColumns.some((column) => column.references.some((reference) => reference.targetTableId === docenteTable.id)),
    "INTERNO deve avere una PK derivata da DOCENTE",
  );
  assert.ok(
    collaboratorePkColumns.some((column) => column.references.some((reference) => reference.targetTableId === docenteTable.id)),
    "COLLABORATORE deve avere una PK derivata da DOCENTE",
  );

  const docenzaFk = workspace.model.foreignKeys.find((foreignKey) => foreignKey.sourceRelationshipId === "rel-docenza");
  const orarioFk = workspace.model.foreignKeys.find((foreignKey) => foreignKey.sourceRelationshipId === "rel-orario");
  const impiegoCorrenteTable = workspace.model.tables.find((table) => table.sourceRelationshipId === "rel-impiego-corrente");
  const impiegoPassatoTable = workspace.model.tables.find((table) => table.sourceRelationshipId === "rel-impiego-passato");

  assert.ok(docenzaFk, "La FK di DOCENZA deve essere stata generata");
  assert.ok(orarioFk, "La FK di ORARIO deve essere stata generata");
  assert.ok(impiegoCorrenteTable, "IMPIEGO CORRENTE deve restare una tabella propria");
  assert.ok(impiegoPassatoTable, "IMPIEGO PASSATO deve restare una tabella propria");

  assert.equal(docenzaFk.fromTableId, edizioneTable.id);
  assert.equal(docenzaFk.toTableId, docenteTable.id);
  assert.equal(orarioFk.fromTableId, lezioneTable.id);
  assert.equal(orarioFk.toTableId, edizioneTable.id);

  const impiegoCorrenteFks = workspace.model.foreignKeys.filter((foreignKey) => foreignKey.sourceRelationshipId === "rel-impiego-corrente");
  const impiegoPassatoFks = workspace.model.foreignKeys.filter((foreignKey) => foreignKey.sourceRelationshipId === "rel-impiego-passato");
  assert.ok(
    impiegoCorrenteFks.some((foreignKey) => foreignKey.toTableId === dipendenteTable.id),
    "IMPIEGO CORRENTE deve poter referenziare DIPENDENTE dopo la propagazione PK",
  );
  assert.ok(
    impiegoPassatoFks.some((foreignKey) => foreignKey.toTableId === dipendenteTable.id),
    "IMPIEGO PASSATO deve poter referenziare DIPENDENTE dopo la propagazione PK",
  );
  assert.ok(
    impiegoCorrenteFks.some((foreignKey) => foreignKey.toTableId === datoreTable.id),
    "IMPIEGO CORRENTE deve mantenere anche la FK verso DATORE",
  );
  assert.ok(
    impiegoPassatoFks.some((foreignKey) => foreignKey.toTableId === datoreTable.id),
    "IMPIEGO PASSATO deve mantenere anche la FK verso DATORE",
  );

  const entitySummaries = new Map(
    workspace.translation.decisions
      .filter((decision) => decision.targetType === "entity")
      .map((decision) => [decision.targetId, decision.summary]),
  );
  assert.equal(
    entitySummaries.get("entity-docente"),
    'Tabella sottotipo "DOCENTE" fissata con PK derivata da "PERSONA".',
  );
  assert.equal(
    entitySummaries.get("entity-dipendente"),
    'Tabella sottotipo "DIPENDENTE" fissata con PK derivata da "PARTECIPANTE".',
  );
  assert.equal(
    entitySummaries.get("entity-interno"),
    'Tabella sottotipo "INTERNO" fissata con PK derivata da "DOCENTE".',
  );
  assert.equal(
    entitySummaries.get("entity-collaboratore"),
    'Tabella sottotipo "COLLABORATORE" fissata con PK derivata da "DOCENTE".',
  );

  assert.equal(
    workspace.transformation.nodes.some((node) =>
      ["rel-orario", "rel-docenza", "rel-impiego-corrente", "rel-impiego-passato"].includes(node.id),
    ),
    false,
    "Le relazioni assorbite o trasformate non devono restare come rombi attivi sul canvas logico",
  );
});
