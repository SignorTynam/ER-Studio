import type { DiagramDocument, DiagramEdge, DiagramNode } from "../../../src/types/diagram";
import { parseDiagram, serializeDiagram } from "../../../src/utils/diagram";
import { createEmptyErTranslationWorkspace } from "../../../src/utils/erTranslation";
import {
  applyLogicalTranslationChoice,
  buildLogicalTranslationOverview,
  createEmptyLogicalWorkspace,
  getLogicalTranslationChoicesForItem,
} from "../../../src/utils/logicalTranslation";
import { createEmptyProjectVersioningState, parseProjectFile, serializeProjectFile } from "../../../src/utils/projectFile";
import {
  addProjectFile,
  createEmptySchemaDocument,
  createProjectFromSchema,
  createSchemaWorkspaceFile,
  createTextWorkspaceFile,
  setProjectActiveFile,
} from "../../../src/utils/projectExplorer";
import { ensureFileTabOpen } from "../../../src/utils/projectTabs";

const VIEWPORT = { x: 180, y: 110, zoom: 1 };

interface PlaygroundProjectOptions {
  schemaCount?: number;
  sqlFile?: {
    name?: string;
    content: string;
    active?: boolean;
  };
}

export function createPlaygroundProject(options: PlaygroundProjectOptions = {}): string {
  const student: Extract<DiagramNode, { type: "entity" }> = {
    id: "entity-student", type: "entity", label: "STUDENT", x: 100, y: 100, width: 160, height: 80,
    internalIdentifiers: [{ id: "student-pk", attributeIds: ["student-id"] }],
    relationshipParticipations: [{ id: "student-enrollment", relationshipId: "relationship-enrollment", cardinality: "(0,N)" }],
  };
  const course: Extract<DiagramNode, { type: "entity" }> = {
    id: "entity-course", type: "entity", label: "COURSE", x: 500, y: 100, width: 160, height: 80,
    internalIdentifiers: [{ id: "course-pk", attributeIds: ["course-id"] }],
    relationshipParticipations: [{ id: "course-enrollment", relationshipId: "relationship-enrollment", cardinality: "(0,N)" }],
  };
  const attributes: Array<Extract<DiagramNode, { type: "attribute" }>> = [
    { id: "student-id", type: "attribute", label: "id", x: 40, y: 20, width: 100, height: 40, isIdentifier: true },
    { id: "student-name", type: "attribute", label: "name", x: 40, y: 210, width: 100, height: 40 },
    { id: "course-id", type: "attribute", label: "id", x: 620, y: 20, width: 100, height: 40, isIdentifier: true },
    { id: "course-title", type: "attribute", label: "title", x: 620, y: 210, width: 100, height: 40 },
  ];
  const relationship: Extract<DiagramNode, { type: "relationship" }> = {
    id: "relationship-enrollment", type: "relationship", label: "ENROLLMENT", x: 320, y: 110, width: 140, height: 70,
  };
  const edges: DiagramEdge[] = [
    { id: "student-id-edge", type: "attribute", sourceId: "student-id", targetId: student.id, label: "", lineStyle: "solid" },
    { id: "student-name-edge", type: "attribute", sourceId: "student-name", targetId: student.id, label: "", lineStyle: "solid" },
    { id: "course-id-edge", type: "attribute", sourceId: "course-id", targetId: course.id, label: "", lineStyle: "solid" },
    { id: "course-title-edge", type: "attribute", sourceId: "course-title", targetId: course.id, label: "", lineStyle: "solid" },
    { id: "student-enrollment-edge", type: "connector", sourceId: student.id, targetId: relationship.id, label: "", lineStyle: "solid", participationId: "student-enrollment" },
    { id: "course-enrollment-edge", type: "connector", sourceId: course.id, targetId: relationship.id, label: "", lineStyle: "solid", participationId: "course-enrollment" },
  ];
  const rawDiagram: DiagramDocument = {
    meta: { name: "university", version: 3 }, notes: "", nodes: [student, course, relationship, ...attributes], edges,
  };
  const diagram = parseDiagram(serializeDiagram(rawDiagram));
  const translationWorkspace = createEmptyErTranslationWorkspace(diagram);
  const translatedDiagram = translationWorkspace.translatedDiagram;
  let logicalWorkspace = createEmptyLogicalWorkspace(translatedDiagram);
  const stepOrder = ["entities", "weak-entities", "relationships", "multivalued-attributes", "generalizations"] as const;
  for (let guard = 0; guard < 40; guard += 1) {
    const overview = buildLogicalTranslationOverview(translatedDiagram, logicalWorkspace);
    const item = stepOrder.flatMap((step) => overview.itemsByStep[step]).find((candidate) => candidate.status === "pending");
    if (!item) break;
    const choices = getLogicalTranslationChoicesForItem(overview, item);
    const choice = choices.find((candidate) => candidate.recommended) ?? choices[0];
    if (!choice) throw new Error(`No logical choice for ${item.label}.`);
    logicalWorkspace = applyLogicalTranslationChoice(translatedDiagram, logicalWorkspace, choice, item.targetType, item.id);
  }
  if (logicalWorkspace.model.tables.length === 0) throw new Error("In-memory logical fixture generation failed.");

  const schema = createEmptySchemaDocument("university.erschema");
  schema.diagram = diagram;
  schema.translationWorkspace = translationWorkspace;
  schema.logicalWorkspace = logicalWorkspace;
  schema.logicalGenerated = true;
  schema.logicalStage = "schema";
  schema.view = { ...schema.view, current: "logical", logicalViewport: VIEWPORT };
  let explorer = createProjectFromSchema("Playground project", schema);
  const primaryFile = explorer.files[explorer.project.activeFileId ?? ""];
  if (!primaryFile || primaryFile.kind !== "schema") throw new Error("Missing generated schema fixture.");

  for (let index = 1; index < (options.schemaCount ?? 1); index += 1) {
    const result = addProjectFile(
      explorer,
      explorer.project.rootId,
      createSchemaWorkspaceFile(`secondary-${index}.erschema`),
    );
    if (!result.ok) throw new Error("Unable to add the secondary schema fixture.");
    explorer = result.state;
  }

  if (options.sqlFile) {
    const sqlFile = createTextWorkspaceFile(
      options.sqlFile.name ?? "query.sql",
      "sql",
      options.sqlFile.content,
    );
    const result = addProjectFile(explorer, explorer.project.rootId, sqlFile);
    if (!result.ok) throw new Error("Unable to add the SQL file fixture.");
    explorer = result.state;
    if (options.sqlFile.active) {
      explorer = setProjectActiveFile(ensureFileTabOpen(explorer, sqlFile.id), sqlFile.id);
    }
  }

  const serialized = serializeProjectFile({
    diagram: primaryFile.schema.diagram,
    translationWorkspace: primaryFile.schema.translationWorkspace,
    logicalWorkspace: primaryFile.schema.logicalWorkspace,
    logicalGenerated: true,
    logicalStage: "schema",
    diagramView: "logical",
    viewport: VIEWPORT,
    translationViewport: VIEWPORT,
    logicalViewport: VIEWPORT,
    workspace: primaryFile.schema.workspace,
    versioning: createEmptyProjectVersioningState(),
    project: explorer.project,
    files: explorer.files,
    explorerView: explorer.view,
  });
  const parsed = parseProjectFile(serialized);
  if (!parsed.state.logicalGenerated || parsed.state.logicalWorkspace.model.tables.length === 0) {
    throw new Error("Serialized logical fixture generation failed.");
  }
  return serialized;
}
