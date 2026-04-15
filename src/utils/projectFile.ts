import type { DiagramDocument, Viewport } from "../types/diagram";
import type { LogicalModel, LogicalTranslationState, LogicalWorkspaceDocument } from "../types/logical";
import { parseDiagram, serializeDiagram } from "./diagram";
import { createEmptyLogicalModel, createEmptyLogicalWorkspace, refreshLogicalWorkspace } from "./logicalTranslation";

export const PROJECT_FILE_KIND = "er-studio-project";
export const PROJECT_FILE_EXTENSION = ".ersp";
export const PROJECT_FILE_MIME_TYPE = "application/json;charset=utf-8";
export const PROJECT_FILE_ACCEPT = ".ersp,.json,application/json";
export const CURRENT_PROJECT_FILE_VERSION = 3;

export type ProjectFileWorkspaceView = "er" | "logical";
export type ParsedProjectFileSource = "project-file" | "legacy-project-json" | "legacy-diagram-json";
export type ProjectFileErrorCode =
  | "invalid-json"
  | "invalid-format"
  | "invalid-kind"
  | "unsupported-version"
  | "invalid-diagram"
  | "invalid-logical-workspace"
  | "invalid-view-state";

export interface ProjectFileViewState {
  current: ProjectFileWorkspaceView;
  erViewport: Viewport;
  logicalViewport: Viewport;
}

export interface ProjectFileState {
  diagram: DiagramDocument;
  logicalWorkspace: LogicalWorkspaceDocument;
  logicalGenerated: boolean;
  diagramView: ProjectFileWorkspaceView;
  viewport: Viewport;
  logicalViewport: Viewport;
  savedAt?: string;
}

export interface ProjectFileDocument {
  version: typeof CURRENT_PROJECT_FILE_VERSION;
  kind: typeof PROJECT_FILE_KIND;
  savedAt: string;
  diagram: DiagramDocument;
  logicalWorkspace: LogicalWorkspaceDocument;
  logicalGenerated: boolean;
  view: ProjectFileViewState;
}

export interface ParsedProjectFile {
  document: ProjectFileDocument;
  state: ProjectFileState;
  source: ParsedProjectFileSource;
}

export interface ParseProjectFileOptions {
  fallbackViewport?: Viewport;
  fallbackDiagramView?: ProjectFileWorkspaceView;
}

export interface ProjectFileErrorDetails {
  what: string;
  why: string;
  how: string;
}

export class ProjectFileError extends Error {
  readonly code: ProjectFileErrorCode;
  readonly details: ProjectFileErrorDetails;

  constructor(code: ProjectFileErrorCode, details: ProjectFileErrorDetails) {
    super(details.why);
    this.name = "ProjectFileError";
    this.code = code;
    this.details = details;
  }
}

type LegacyProjectFileDocument = {
  version: 2;
  kind: typeof PROJECT_FILE_KIND;
  savedAt?: unknown;
  diagram?: unknown;
  logicalWorkspace?: unknown;
  logicalGenerated?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cloneViewport(viewport: Viewport): Viewport {
  return {
    x: viewport.x,
    y: viewport.y,
    zoom: viewport.zoom,
  };
}

function getFallbackViewport(options?: ParseProjectFileOptions): Viewport {
  return cloneViewport(options?.fallbackViewport ?? { x: 0, y: 0, zoom: 1 });
}

function sanitizeViewport(value: unknown, fallback: Viewport): Viewport {
  if (!isRecord(value)) {
    return cloneViewport(fallback);
  }

  return {
    x: typeof value.x === "number" && Number.isFinite(value.x) ? value.x : fallback.x,
    y: typeof value.y === "number" && Number.isFinite(value.y) ? value.y : fallback.y,
    zoom:
      typeof value.zoom === "number" && Number.isFinite(value.zoom) && value.zoom > 0
        ? value.zoom
        : fallback.zoom,
  };
}

function sanitizeDiagramView(
  value: unknown,
  fallback: ProjectFileWorkspaceView,
): ProjectFileWorkspaceView {
  return value === "logical" ? "logical" : fallback;
}

function assertProjectFileRoot(value: unknown): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new ProjectFileError("invalid-format", {
      what: "il file progetto non e stato caricato",
      why: "la radice JSON non contiene un oggetto progetto valido",
      how: "esporta di nuovo il progetto oppure verifica il contenuto del file",
    });
  }
}

function assertProjectKind(value: unknown): asserts value is typeof PROJECT_FILE_KIND {
  if (value !== PROJECT_FILE_KIND) {
    throw new ProjectFileError("invalid-kind", {
      what: "il file progetto non e stato caricato",
      why: `il campo kind non corrisponde a "${PROJECT_FILE_KIND}"`,
      how: "seleziona un file progetto ER Studio valido con estensione .ersp o un backup legacy compatibile",
    });
  }
}

function assertSupportedProjectVersion(
  value: unknown,
): asserts value is ProjectFileDocument["version"] | LegacyProjectFileDocument["version"] {
  if (value !== CURRENT_PROJECT_FILE_VERSION && value !== 2) {
    throw new ProjectFileError("unsupported-version", {
      what: "il file progetto non e stato caricato",
      why: "la versione del formato progetto non e supportata",
      how: "aggiorna l'applicazione o esporta nuovamente il progetto in un formato compatibile",
    });
  }
}

function looksLikeDiagramDocument(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && Array.isArray(value.nodes) && Array.isArray(value.edges);
}

function assertDiagramPayload(value: unknown): asserts value is Record<string, unknown> {
  if (!looksLikeDiagramDocument(value)) {
    throw new ProjectFileError("invalid-diagram", {
      what: "il file progetto non e stato caricato",
      why: "la sezione diagram non contiene un diagramma ER valido",
      how: "verifica che il file includa il diagramma completo oppure riesporta il progetto",
    });
  }
}

function sanitizeLogicalModel(value: unknown): LogicalModel {
  const fallback = createEmptyLogicalModel("modello-logico");
  if (!isRecord(value)) {
    throw new ProjectFileError("invalid-logical-workspace", {
      what: "il file progetto non e stato caricato",
      why: "la sezione logicalWorkspace.model non e valida",
      how: "riesporta il progetto da ER Studio oppure ripristina un backup integro",
    });
  }

  const candidate = value as Partial<LogicalModel>;
  const meta = candidate.meta;
  if (
    !isRecord(meta) ||
    typeof meta.name !== "string" ||
    typeof meta.generatedAt !== "string" ||
    typeof meta.sourceDiagramVersion !== "number" ||
    typeof meta.sourceSignature !== "string" ||
    !Array.isArray(candidate.tables) ||
    !Array.isArray(candidate.foreignKeys) ||
    ("uniqueConstraints" in candidate && !Array.isArray(candidate.uniqueConstraints)) ||
    !Array.isArray(candidate.edges) ||
    !Array.isArray(candidate.issues)
  ) {
    throw new ProjectFileError("invalid-logical-workspace", {
      what: "il file progetto non e stato caricato",
      why: "il modello logico salvato e incompleto o malformato",
      how: "riesporta il progetto da ER Studio oppure ripristina un backup integro",
    });
  }

  return {
    ...fallback,
    ...candidate,
    meta: {
      name: meta.name,
      generatedAt: meta.generatedAt,
      sourceDiagramVersion: meta.sourceDiagramVersion,
      sourceSignature: meta.sourceSignature,
    },
    tables: candidate.tables,
    foreignKeys: candidate.foreignKeys,
    uniqueConstraints: Array.isArray(candidate.uniqueConstraints) ? candidate.uniqueConstraints : [],
    edges: candidate.edges,
    issues: candidate.issues,
  } as LogicalModel;
}

function sanitizeLogicalWorkspace(value: unknown, diagram: DiagramDocument): LogicalWorkspaceDocument {
  const fallback = createEmptyLogicalWorkspace(diagram);
  if (!isRecord(value)) {
    throw new ProjectFileError("invalid-logical-workspace", {
      what: "il file progetto non e stato caricato",
      why: "la sezione logicalWorkspace non e valida",
      how: "riesporta il progetto da ER Studio oppure ripristina un backup integro",
    });
  }

  if (!isRecord(value.model) || !isRecord(value.translation) || !isRecord(value.transformation)) {
    throw new ProjectFileError("invalid-logical-workspace", {
      what: "il file progetto non e stato caricato",
      why: "la sezione logicalWorkspace non contiene tutte le strutture richieste",
      how: "riesporta il progetto da ER Studio oppure ripristina un backup integro",
    });
  }

  const translation = value.translation as Partial<LogicalTranslationState>;
  const meta = translation.meta;
  if (
    !isRecord(meta) ||
    typeof meta.createdAt !== "string" ||
    typeof meta.updatedAt !== "string" ||
    typeof meta.sourceSignature !== "string" ||
    !Array.isArray(translation.decisions) ||
    !Array.isArray(translation.mappings) ||
    !Array.isArray(translation.conflicts)
  ) {
    throw new ProjectFileError("invalid-logical-workspace", {
      what: "il file progetto non e stato caricato",
      why: "lo stato della traduzione logica e incompleto o malformato",
      how: "riesporta il progetto da ER Studio oppure ripristina un backup integro",
    });
  }

  try {
    return refreshLogicalWorkspace(diagram, {
      model: sanitizeLogicalModel(value.model),
      translation: translation as LogicalTranslationState,
      transformation: fallback.transformation,
    });
  } catch {
    throw new ProjectFileError("invalid-logical-workspace", {
      what: "il file progetto non e stato caricato",
      why: "il workspace logico salvato non e coerente con il diagramma ER",
      how: "rigenera il modello logico dal diagramma oppure importa un backup integro",
    });
  }
}

function sanitizeCurrentProjectView(
  value: unknown,
  options?: ParseProjectFileOptions,
): ProjectFileViewState {
  if (!isRecord(value) || !isRecord(value.erViewport) || !isRecord(value.logicalViewport)) {
    throw new ProjectFileError("invalid-view-state", {
      what: "il file progetto non e stato caricato",
      why: "lo stato delle viste salvate non e completo",
      how: "riesporta il progetto da ER Studio oppure apri un backup integro",
    });
  }

  const fallbackViewport = getFallbackViewport(options);
  const fallbackDiagramView = options?.fallbackDiagramView ?? "er";
  return {
    current: sanitizeDiagramView(value.current, fallbackDiagramView),
    erViewport: sanitizeViewport(value.erViewport, fallbackViewport),
    logicalViewport: sanitizeViewport(value.logicalViewport, fallbackViewport),
  };
}

function normalizeProjectState(
  diagram: DiagramDocument,
  logicalWorkspace: LogicalWorkspaceDocument,
  logicalGenerated: boolean,
  savedAt: string,
  view: ProjectFileViewState,
): ProjectFileState {
  const diagramView = view.current === "logical" && logicalGenerated ? "logical" : "er";
  return {
    diagram,
    logicalWorkspace,
    logicalGenerated,
    diagramView,
    viewport: cloneViewport(view.erViewport),
    logicalViewport: cloneViewport(view.logicalViewport),
    savedAt,
  };
}

function createProjectFileDocument(
  diagram: DiagramDocument,
  logicalWorkspace: LogicalWorkspaceDocument,
  logicalGenerated: boolean,
  savedAt: string,
  view: ProjectFileViewState,
): ProjectFileDocument {
  return {
    version: CURRENT_PROJECT_FILE_VERSION,
    kind: PROJECT_FILE_KIND,
    savedAt,
    diagram,
    logicalWorkspace,
    logicalGenerated,
    view,
  };
}

function parseLegacyProjectFile(
  value: LegacyProjectFileDocument,
  options?: ParseProjectFileOptions,
): ParsedProjectFile {
  assertDiagramPayload(value.diagram);
  const diagram = parseDiagram(JSON.stringify(value.diagram));
  const logicalWorkspace = sanitizeLogicalWorkspace(value.logicalWorkspace, diagram);
  const logicalGenerated = value.logicalGenerated === true;
  const fallbackViewport = getFallbackViewport(options);
  const view: ProjectFileViewState = {
    current: logicalGenerated && options?.fallbackDiagramView === "logical" ? "logical" : "er",
    erViewport: cloneViewport(fallbackViewport),
    logicalViewport: cloneViewport(fallbackViewport),
  };
  const savedAt =
    typeof value.savedAt === "string" && value.savedAt.trim().length > 0
      ? value.savedAt
      : new Date().toISOString();
  const document = createProjectFileDocument(diagram, logicalWorkspace, logicalGenerated, savedAt, view);

  return {
    document,
    state: normalizeProjectState(diagram, logicalWorkspace, logicalGenerated, savedAt, view),
    source: "legacy-project-json",
  };
}

function parseCurrentProjectFile(
  value: Record<string, unknown>,
  options?: ParseProjectFileOptions,
): ParsedProjectFile {
  assertDiagramPayload(value.diagram);
  const diagram = parseDiagram(JSON.stringify(value.diagram));
  const logicalWorkspace = sanitizeLogicalWorkspace(value.logicalWorkspace, diagram);
  const logicalGenerated = value.logicalGenerated === true;
  const view = sanitizeCurrentProjectView(value.view, options);
  const savedAt =
    typeof value.savedAt === "string" && value.savedAt.trim().length > 0
      ? value.savedAt
      : new Date().toISOString();
  const document = createProjectFileDocument(diagram, logicalWorkspace, logicalGenerated, savedAt, view);

  return {
    document,
    state: normalizeProjectState(diagram, logicalWorkspace, logicalGenerated, savedAt, view),
    source: "project-file",
  };
}

function parseLegacyDiagramJson(rawText: string, options?: ParseProjectFileOptions): ParsedProjectFile {
  const diagram = parseDiagram(rawText);
  const logicalWorkspace = createEmptyLogicalWorkspace(diagram);
  const logicalGenerated = false;
  const savedAt = new Date().toISOString();
  const fallbackViewport = getFallbackViewport(options);
  const view: ProjectFileViewState = {
    current: options?.fallbackDiagramView ?? "er",
    erViewport: cloneViewport(fallbackViewport),
    logicalViewport: cloneViewport(fallbackViewport),
  };
  const document = createProjectFileDocument(diagram, logicalWorkspace, logicalGenerated, savedAt, view);

  return {
    document,
    state: normalizeProjectState(diagram, logicalWorkspace, logicalGenerated, savedAt, view),
    source: "legacy-diagram-json",
  };
}

export function isProjectFileDocument(value: unknown): value is ProjectFileDocument {
  return (
    isRecord(value) &&
    value.version === CURRENT_PROJECT_FILE_VERSION &&
    value.kind === PROJECT_FILE_KIND &&
    typeof value.savedAt === "string" &&
    looksLikeDiagramDocument(value.diagram) &&
    isRecord(value.logicalWorkspace) &&
    isRecord(value.view) &&
    isRecord(value.view.erViewport) &&
    isRecord(value.view.logicalViewport)
  );
}

export function serializeProjectFile(state: ProjectFileState): string {
  const diagram = JSON.parse(serializeDiagram(state.diagram)) as DiagramDocument;
  const logicalWorkspace = sanitizeLogicalWorkspace(state.logicalWorkspace, diagram);
  const logicalGenerated = state.logicalGenerated === true;
  const view: ProjectFileViewState = {
    current: state.diagramView === "logical" && logicalGenerated ? "logical" : "er",
    erViewport: cloneViewport(state.viewport),
    logicalViewport: cloneViewport(state.logicalViewport),
  };
  const document = createProjectFileDocument(
    diagram,
    logicalWorkspace,
    logicalGenerated,
    state.savedAt ?? new Date().toISOString(),
    view,
  );

  return JSON.stringify(document, null, 2);
}

export function parseProjectFile(rawText: string, options?: ParseProjectFileOptions): ParsedProjectFile {
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(rawText) as unknown;
  } catch {
    throw new ProjectFileError("invalid-json", {
      what: "il file progetto non e stato caricato",
      why: "il contenuto non e un JSON valido",
      how: "verifica il file .ersp o .json legacy e riprova",
    });
  }

  assertProjectFileRoot(parsedJson);

  if ("kind" in parsedJson) {
    assertProjectKind(parsedJson.kind);
    assertSupportedProjectVersion(parsedJson.version);

    if (parsedJson.version === 2) {
      return parseLegacyProjectFile(parsedJson as LegacyProjectFileDocument, options);
    }

    return parseCurrentProjectFile(parsedJson, options);
  }

  if (looksLikeDiagramDocument(parsedJson)) {
    return parseLegacyDiagramJson(rawText, options);
  }

  throw new ProjectFileError("invalid-format", {
    what: "il file progetto non e stato caricato",
    why: "il contenuto JSON non rappresenta ne un progetto ER Studio ne un diagramma legacy compatibile",
    how: "seleziona un file .ersp valido oppure un backup .json esportato da una versione precedente",
  });
}
