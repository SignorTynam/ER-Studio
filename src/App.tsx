import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent, PointerEvent as ReactPointerEvent } from "react";
import { DiagramCanvas } from "./canvas/DiagramCanvas";
import { AppHeader } from "./components/AppHeader";
import { CodeModeTutorialPage } from "./components/CodeModeTutorialPage";
import { LandingPage } from "./components/LandingPage";
import { useHistory } from "./hooks/useHistory";
import { Toolbar } from "./toolbar/Toolbar";
import type {
  DiagramDocument,
  DiagramEdge,
  DiagramNode,
  EditorMode,
  Point,
  SelectionState,
  ToolKind,
  ValidationIssue,
  Viewport,
} from "./types/diagram";
import {
  alignNodes,
  canConnect,
  createEdge,
  createEmptyDiagram,
  createNode,
  duplicateSelection,
  edgeAlreadyExists,
  findNode,
  getMultivaluedAttributeSize,
  parseDiagram,
  removeSelection,
  serializeDiagram,
  validateDiagram,
} from "./utils/diagram";
import { createExampleDiagram } from "./utils/example";
import { parseErsDiagram, serializeDiagramToErs } from "./utils/ers";
import { downloadPng, downloadSvg } from "./utils/export";
import { GRID_SIZE, snapValue } from "./utils/geometry";
import { TOOL_BY_SHORTCUT, TOOL_LABEL_BY_KIND } from "./utils/toolConfig";
import { APP_CHANGELOG, APP_NAME, APP_TITLE, APP_VERSION } from "./utils/appMeta";

const DEFAULT_VIEWPORT: Viewport = {
  x: 180,
  y: 110,
  zoom: 1,
};

interface WorkspaceNotice {
  id: number;
  message: string;
  tone: "success" | "warning" | "error";
  sticky?: boolean;
  stickyType?: "source-selection" | "selection-warning";
  targetId?: string;
}

interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}

interface PromptDialogState {
  title: string;
  label: string;
  placeholder?: string;
  confirmLabel: string;
  cancelLabel: string;
  required: boolean;
  requiredMessage: string;
}

type AppSurface = "landing" | "studio" | "code-tutorial";

const ERROR_PATTERNS = [/^errore[:\s]/i, /\berrore\b/i, /impossibile/i, /non compatibile/i, /non valido/i, /non riuscit[oa]/i];
const CANCELLATION_PATTERNS = [/annullat[oa]/i, /rimoss[oa]/i, /eliminat[oa]/i, /cancellat[oa]/i] as const;
const WARNING_PATTERNS = [
  /gia presente/i,
  /^nessun/i,
  /^nessuna/i,
  /^sorgente selezionata:/i,
  /seleziona almeno/i,
  /seleziona la destinazione/i,
  /apri la vista/i,
  /gia allineati/i,
  /non disponibile/i,
] as const;
const SUCCESS_PATTERNS = [/aggiunt[oa]/i, /creat[oa]/i, /caricat[oa]/i, /salvat[oa]/i, /esportat[oa]/i, /rigenerat[oa]/i] as const;
const NOTICE_DURATION_MS = {
  success: 3200,
  warning: 4400,
  error: 6200,
} as const;
const STATUS_FOLLOWUP_NOTICE_MS = 2600;
const ATTRIBUTE_CREATION_HORIZONTAL_OFFSET = 140;
const ATTRIBUTE_CREATION_STACK_GAP = 28;
const COMPOSITE_CHILD_HORIZONTAL_STEP = 24;
const COMPOSITE_CHILD_VERTICAL_GAP = 80;
const COMPOSITE_CHILD_VERTICAL_STEP = 44;
const INITIAL_WINDOW_WIDTH = typeof window === "undefined" ? 1440 : window.innerWidth;
const TOOLBAR_COLLAPSED_WIDTH = 62;
const DEFAULT_TOOLBAR_WIDTH = INITIAL_WINDOW_WIDTH >= 1680 ? 216 : 196;
const MIN_TOOLBAR_WIDTH = 180;
const MAX_TOOLBAR_WIDTH = 320;
const RESIZER_WIDTH = 12;

function isSourceSelectionPendingMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return (
    normalized.startsWith("sorgente selezionata:") &&
    normalized.includes("seleziona la destinazione") &&
    normalized.includes("premi esc per annullare")
  );
}

function sanitizeFileNameBase(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "diagramma-er";
}

const DEFAULT_ATTRIBUTE_SIZE = { width: 170, height: 72 };

function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function downloadTextFile(content: string, fileName: string, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function updateNodeInDiagram(
  diagram: DiagramDocument,
  nodeId: string,
  patch: Partial<DiagramNode>,
): DiagramDocument {
  return {
    ...diagram,
    nodes: diagram.nodes.map((node) => (node.id === nodeId ? { ...node, ...patch } : node)),
  };
}

function updateNodesInDiagram(
  diagram: DiagramDocument,
  nodeIds: string[],
  patch: Partial<DiagramNode>,
): DiagramDocument {
  const targetIds = new Set(nodeIds);

  return {
    ...diagram,
    nodes: diagram.nodes.map((node) => (targetIds.has(node.id) ? { ...node, ...patch } : node)),
  };
}

function updateEdgeInDiagram(
  diagram: DiagramDocument,
  edgeId: string,
  patch: Partial<DiagramEdge>,
): DiagramDocument {
  return {
    ...diagram,
    edges: diagram.edges.map((edge) => (edge.id === edgeId ? { ...edge, ...patch } : edge)),
  };
}

function updateEdgesInDiagram(
  diagram: DiagramDocument,
  edgeIds: string[],
  patch: Partial<DiagramEdge>,
): DiagramDocument {
  const targetIds = new Set(edgeIds);
  return {
    ...diagram,
    edges: diagram.edges.map((edge) => (targetIds.has(edge.id) ? { ...edge, ...patch } : edge)),
  };
}

function updateEdgeTextInDiagram(diagram: DiagramDocument, edgeId: string, value: string): DiagramDocument {
  return {
    ...diagram,
    edges: diagram.edges.map((edge) => {
      if (edge.id !== edgeId) {
        return edge;
      }

      if (edge.type === "connector") {
        return { ...edge, cardinality: value };
      }

      if (edge.type === "attribute") {
        return { ...edge, cardinality: value || undefined };
      }

      return { ...edge, label: value };
    }),
  };
}

function clearExternalIdentifierFromRelationship(
  diagram: DiagramDocument,
  relationshipId: string,
): DiagramDocument {
  return {
    ...diagram,
    nodes: diagram.nodes.map((node) => {
      if (node.id !== relationshipId || node.type !== "relationship") {
        return node;
      }

      return {
        ...node,
        isExternalIdentifier: false,
        externalIdentifierMode: undefined,
        externalIdentifierSourceAttributeId: undefined,
        externalIdentifierTargetEntityId: undefined,
        externalIdentifierTargetAttributeId: undefined,
        externalIdentifierOffset: undefined,
        externalIdentifierMarkerOffsetX: undefined,
        externalIdentifierMarkerOffsetY: undefined,
      };
    }),
  };
}

function findEntityHostForAttribute(diagram: DiagramDocument, attributeId: string): DiagramNode | undefined {
  const visited = new Set<string>();
  let currentAttributeId = attributeId;

  while (!visited.has(currentAttributeId)) {
    visited.add(currentAttributeId);
    const attributeEdge = diagram.edges.find(
      (edge) => edge.type === "attribute" && edge.sourceId === currentAttributeId,
    ) ?? diagram.edges.find(
      (edge) =>
        edge.type === "attribute" &&
        edge.targetId === currentAttributeId &&
        diagram.nodes.find((node) => node.id === edge.sourceId)?.type !== "attribute",
    );

    if (!attributeEdge) {
      return undefined;
    }

    const hostId = attributeEdge.sourceId === currentAttributeId ? attributeEdge.targetId : attributeEdge.sourceId;
    const hostNode = diagram.nodes.find((node) => node.id === hostId);

    if (hostNode?.type === "entity") {
      return hostNode;
    }

    if (hostNode?.type !== "attribute") {
      return undefined;
    }

    currentAttributeId = hostNode.id;
  }

  return undefined;
}

function findRelationshipBetweenEntities(
  diagram: DiagramDocument,
  entityAId: string,
  entityBId: string,
): DiagramNode | undefined {
  for (const node of diagram.nodes) {
    if (node.type !== "relationship") {
      continue;
    }

    const connectedEntityIds = diagram.edges
      .filter((edge) => edge.type === "connector" && (edge.sourceId === node.id || edge.targetId === node.id))
      .map((edge) => (edge.sourceId === node.id ? edge.targetId : edge.sourceId));

    if (connectedEntityIds.includes(entityAId) && connectedEntityIds.includes(entityBId)) {
      return node;
    }
  }

  return undefined;
}

function getNodeKindLabel(node: DiagramNode): string {
  if (node.type === "entity") {
    return "entita";
  }

  if (node.type === "relationship") {
    return "associazione";
  }

  if (node.type === "attribute") {
    return "attributo";
  }

  return "testo";
}

function getConnectionFailureReason(
  edgeType: "connector" | "attribute" | "inheritance",
  sourceNode: DiagramNode,
  targetNode: DiagramNode,
): string {
  if (sourceNode.id === targetNode.id) {
    return "Non puoi collegare un elemento a se stesso.";
  }

  const sourceKind = getNodeKindLabel(sourceNode);
  const targetKind = getNodeKindLabel(targetNode);

  if (edgeType === "connector") {
    if (sourceNode.type === "entity" && targetNode.type === "entity") {
      return "Due entita non si collegano direttamente: inserisci un'associazione tra le due.";
    }

    if (sourceNode.type === "relationship" && targetNode.type === "relationship") {
      return "Due associazioni non si collegano direttamente con un collegamento Chen.";
    }

    if (sourceNode.type === "attribute" || targetNode.type === "attribute") {
      return "Per un attributo usa lo strumento Attributo, non Collegamento.";
    }

    return `Collegamento non valido tra ${sourceKind} e ${targetKind}: il collegamento Chen richiede un'entita e un'associazione.`;
  }

  if (edgeType === "inheritance") {
    return `La generalizzazione richiede due entita. Hai selezionato ${sourceKind} e ${targetKind}.`;
  }

  const oneIsAttribute = sourceNode.type === "attribute" || targetNode.type === "attribute";
  if (!oneIsAttribute) {
    return `Il collegamento attributo richiede almeno un attributo. Hai selezionato ${sourceKind} e ${targetKind}.`;
  }

  return `Un attributo puo essere collegato solo a entita, associazione o attributo. Hai selezionato ${sourceKind} e ${targetKind}.`;
}

type AttributeCreationHost = Extract<DiagramNode, { type: "entity" | "relationship" | "attribute" }>;
type AttributeNodeDraft = Extract<DiagramNode, { type: "attribute" }>;

function findDirectHostedAttributes(
  diagram: DiagramDocument,
  hostId: string,
): AttributeNodeDraft[] {
  const nodeById = new Map(diagram.nodes.map((node) => [node.id, node]));

  return diagram.edges.flatMap((edge) => {
    if (edge.type !== "attribute") {
      return [];
    }

    const candidateId =
      edge.sourceId === hostId
        ? edge.targetId
        : edge.targetId === hostId
          ? edge.sourceId
          : undefined;

    if (!candidateId) {
      return [];
    }

    const candidateNode = nodeById.get(candidateId);
    return candidateNode?.type === "attribute" ? [candidateNode] : [];
  });
}

function getNextAttributePosition(
  diagram: DiagramDocument,
  hostNode: AttributeCreationHost,
  nextAttribute: AttributeNodeDraft,
): Point {
  const hostedAttributes = findDirectHostedAttributes(diagram, hostNode.id);

  if (hostNode.type === "attribute") {
    const hostSize =
      hostNode.isMultivalued === true
        ? { width: hostNode.width, height: hostNode.height }
        : getMultivaluedAttributeSize(hostNode.label);
    const compositeIndex = hostedAttributes.length;

    return {
      x: snapValue(
        hostNode.x + hostSize.width / 2 - nextAttribute.width / 2 + compositeIndex * COMPOSITE_CHILD_HORIZONTAL_STEP,
        GRID_SIZE,
      ),
      y: snapValue(
        hostNode.y + hostSize.height + COMPOSITE_CHILD_VERTICAL_GAP + compositeIndex * COMPOSITE_CHILD_VERTICAL_STEP,
        GRID_SIZE,
      ),
    };
  }

  const regularAttributes = hostedAttributes.filter(
    (attribute) => attribute.isIdentifier !== true && attribute.isCompositeInternal !== true,
  );
  const hostCenterX = hostNode.x + hostNode.width / 2;
  const leftAttributes = regularAttributes.filter(
    (attribute) => attribute.x + attribute.width / 2 < hostCenterX,
  );
  const rightAttributes = regularAttributes.filter(
    (attribute) => attribute.x + attribute.width / 2 >= hostCenterX,
  );
  const useLeftSide = leftAttributes.length > 0 && rightAttributes.length === 0;
  const sideAttributes = useLeftSide ? leftAttributes : rightAttributes;
  const baseY = hostNode.y + hostNode.height / 2 - nextAttribute.height / 2;
  const nextY =
    sideAttributes.length === 0
      ? baseY
      : Math.max(...sideAttributes.map((attribute) => attribute.y + attribute.height)) +
        ATTRIBUTE_CREATION_STACK_GAP;

  return {
    x: snapValue(
      useLeftSide
        ? hostNode.x - ATTRIBUTE_CREATION_HORIZONTAL_OFFSET - nextAttribute.width / 2
        : hostNode.x + hostNode.width + ATTRIBUTE_CREATION_HORIZONTAL_OFFSET - nextAttribute.width / 2,
      GRID_SIZE,
    ),
    y: snapValue(nextY, GRID_SIZE),
  };
}

export default function App() {
  const initialDiagramRef = useRef<DiagramDocument>(createExampleDiagram());
  const history = useHistory<DiagramDocument>(initialDiagramRef.current);
  const initialSerializedCode = serializeDiagramToErs(initialDiagramRef.current);
  const [surface, setSurface] = useState<AppSurface>("landing");
  const [tool, setTool] = useState<ToolKind>("select");
  const [mode, setMode] = useState<EditorMode>("edit");
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT);
  const [selection, setSelection] = useState<SelectionState>({ nodeIds: [], edgeIds: [] });
  const [statusMessage, setStatusMessage] = useState("");
  const [notices, setNotices] = useState<WorkspaceNotice[]>([]);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  const [introOpen, setIntroOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [promptDialog, setPromptDialog] = useState<PromptDialogState | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const [promptError, setPromptError] = useState("");
  const [codeDraft, setCodeDraft] = useState(() => initialSerializedCode);
  const [codeDirty, setCodeDirty] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [toolbarCollapsed, setToolbarCollapsed] = useState(INITIAL_WINDOW_WIDTH < 1460);
  const [focusMode, setFocusMode] = useState(false);
  const [windowWidth, setWindowWidth] = useState(INITIAL_WINDOW_WIDTH);
  const [toolbarWidth, setToolbarWidth] = useState(DEFAULT_TOOLBAR_WIDTH);

  const svgRef = useRef<SVGSVGElement>(null);
  const jsonFileInputRef = useRef<HTMLInputElement | null>(null);
  const ersFileInputRef = useRef<HTMLInputElement | null>(null);
  const lastSerializedCodeRef = useRef(codeDraft);
  const codeDraftRef = useRef(codeDraft);
  const codeDirtyRef = useRef(codeDirty);
  const lastSavedDiagramRef = useRef(serializeDiagram(initialDiagramRef.current));
  const lastSavedCodeRef = useRef(initialSerializedCode);
  const hasUnsavedChangesRef = useRef(false);
  const nextNoticeIdRef = useRef(1);
  const noticeTimeoutsRef = useRef(new Map<number, number>());
  const confirmDialogResolverRef = useRef<((confirmed: boolean) => void) | null>(null);
  const promptDialogResolverRef = useRef<((value: string | null) => void) | null>(null);
  const promptInputRef = useRef<HTMLInputElement | null>(null);
  const panelResizeRef = useRef<{
    panel: "toolbar";
    startClientX: number;
    startWidth: number;
  } | null>(null);

  const issues = validateDiagram(history.present);
  const selectedNode =
    selection.nodeIds.length === 1 && selection.edgeIds.length === 0
      ? history.present.nodes.find((node) => node.id === selection.nodeIds[0])
      : undefined;
  const selectedEdge =
    selection.edgeIds.length === 1 && selection.nodeIds.length === 0
      ? history.present.edges.find((edge) => edge.id === selection.edgeIds[0])
      : undefined;
  const selectedWarningIssue =
    selectedNode
      ? issues.find(
          (issue) =>
            issue.level === "warning" &&
            issue.targetType === "node" &&
            issue.targetId === selectedNode.id,
        )
      : selectedEdge
        ? issues.find(
            (issue) =>
              issue.level === "warning" &&
              issue.targetType === "edge" &&
              issue.targetId === selectedEdge.id,
          )
      : undefined;
  const selectionItemCount = selection.nodeIds.length + selection.edgeIds.length;
  const hasSelection = selectionItemCount > 0;
  const effectiveToolbarCollapsed = focusMode || toolbarCollapsed;
  const toolbarResizeBounds = {
    min: MIN_TOOLBAR_WIDTH,
    max: clampValue(Math.floor(windowWidth * 0.28), 220, MAX_TOOLBAR_WIDTH),
  };
  const visibleToolbarWidth = focusMode
    ? 0
    : effectiveToolbarCollapsed
      ? TOOLBAR_COLLAPSED_WIDTH
      : clampValue(toolbarWidth, toolbarResizeBounds.min, toolbarResizeBounds.max);
  const workspaceShellStyle = {
    "--toolbar-width": `${visibleToolbarWidth}px`,
    "--toolbar-resizer-width": !focusMode && !effectiveToolbarCollapsed ? `${RESIZER_WIDTH}px` : "0px",
    "--inspector-resizer-width": "0px",
    "--inspector-width": "0px",
  } as CSSProperties;

  useEffect(() => {
    if (!statusMessage || isSourceSelectionPendingMessage(statusMessage)) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setStatusMessage("");
    }, 2600);

    return () => window.clearTimeout(timeout);
  }, [statusMessage]);

  useEffect(() => {
    if (!selectedWarningIssue) {
      dismissStickyNotices("selection-warning");
      return;
    }

    showSelectionWarningNotice(selectedWarningIssue);
  }, [selectedWarningIssue]);

  useEffect(() => {
    const currentCode = codeDirtyRef.current ? codeDraftRef.current : serializeDiagramToErs(history.present);
    hasUnsavedChangesRef.current =
      serializeDiagram(history.present) !== lastSavedDiagramRef.current || currentCode !== lastSavedCodeRef.current;
  }, [history.present, codeDraft]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasUnsavedChangesRef.current) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (windowWidth < 1460) {
      setToolbarCollapsed(true);
    }
  }, [windowWidth]);

  useEffect(() => {
    setToolbarWidth((current) => clampValue(current, toolbarResizeBounds.min, toolbarResizeBounds.max));
  }, [toolbarResizeBounds.max, toolbarResizeBounds.min]);

  useEffect(() => {
    if (!promptDialog) {
      return;
    }

    const timeout = window.setTimeout(() => {
      promptInputRef.current?.focus();
      promptInputRef.current?.select();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [promptDialog]);

  useEffect(() => {
    return () => {
      if (confirmDialogResolverRef.current) {
        confirmDialogResolverRef.current(false);
        confirmDialogResolverRef.current = null;
      }

      if (promptDialogResolverRef.current) {
        promptDialogResolverRef.current(null);
        promptDialogResolverRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    function handleResizePointerMove(event: PointerEvent) {
      const currentResize = panelResizeRef.current;
      if (!currentResize) {
        return;
      }

      const nextWidth = clampValue(
        currentResize.startWidth + (event.clientX - currentResize.startClientX),
        toolbarResizeBounds.min,
        toolbarResizeBounds.max,
      );
      setToolbarWidth(nextWidth);
    }

    function stopResize() {
      if (!panelResizeRef.current) {
        return;
      }

      panelResizeRef.current = null;
      document.body.classList.remove("workspace-resizing");
    }

    window.addEventListener("pointermove", handleResizePointerMove);
    window.addEventListener("pointerup", stopResize);

    return () => {
      window.removeEventListener("pointermove", handleResizePointerMove);
      window.removeEventListener("pointerup", stopResize);
      document.body.classList.remove("workspace-resizing");
    };
  }, [toolbarResizeBounds.max, toolbarResizeBounds.min]);

  useEffect(() => {
    return () => {
      noticeTimeoutsRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      noticeTimeoutsRef.current.clear();
    };
  }, []);

  function clearNoticeTimer(noticeId: number) {
    const timeoutId = noticeTimeoutsRef.current.get(noticeId);
    if (timeoutId === undefined) {
      return;
    }

    window.clearTimeout(timeoutId);
    noticeTimeoutsRef.current.delete(noticeId);
  }

  function dismissNotice(noticeId: number) {
    clearNoticeTimer(noticeId);
    setNotices((current) => current.filter((notice) => notice.id !== noticeId));
  }

  function dismissStickyNotices(stickyType?: WorkspaceNotice["stickyType"]) {
    setNotices((current) => {
      const stickyNotices = current.filter(
        (notice) => notice.sticky && (stickyType === undefined || notice.stickyType === stickyType),
      );
      if (stickyNotices.length === 0) {
        return current;
      }

      stickyNotices.forEach((notice) => clearNoticeTimer(notice.id));
      return current.filter((notice) => !stickyNotices.some((stickyNotice) => stickyNotice.id === notice.id));
    });
  }

  function showSelectionWarningNotice(issue: ValidationIssue) {
    if (issue.level !== "warning") {
      return;
    }

    setNotices((current) => {
      const existing = current.find((notice) => notice.stickyType === "selection-warning");
      if (existing && existing.targetId === issue.targetId && existing.message === issue.message) {
        return current;
      }

      const selectionWarningNotices = current.filter((notice) => notice.stickyType === "selection-warning");
      selectionWarningNotices.forEach((notice) => clearNoticeTimer(notice.id));

      const retained = current.filter((notice) => notice.stickyType !== "selection-warning");
      return [
        {
          id: nextNoticeIdRef.current++,
          message: issue.message,
          tone: "warning",
          sticky: true,
          stickyType: "selection-warning",
          targetId: issue.targetId,
        },
        ...retained,
      ];
    });
  }

  function showNotice(notice: Omit<WorkspaceNotice, "id">, duration: number | null = NOTICE_DURATION_MS[notice.tone]) {
    const id = nextNoticeIdRef.current++;

    setNotices((current) => {
      const preservedSelectionWarningNotices =
        notice.stickyType === "selection-warning"
          ? []
          : current.filter((item) => item.stickyType === "selection-warning");
      const retained = current.filter((item) => item.message !== notice.message && !item.sticky).slice(0, 1);
      const removed = current.filter(
        (item) =>
          !retained.some((kept) => kept.id === item.id) &&
          !preservedSelectionWarningNotices.some((kept) => kept.id === item.id),
      );
      removed.forEach((item) => clearNoticeTimer(item.id));
      return [{ id, ...notice }, ...preservedSelectionWarningNotices, ...retained];
    });

    if (duration !== null) {
      const timeoutId = window.setTimeout(() => {
        dismissNotice(id);
      }, duration);
      noticeTimeoutsRef.current.set(id, timeoutId);
    }
  }

  function showErrorNotice(message: string) {
    showNotice({
      message,
      tone: "error",
    });
  }

  function showWarningNotice(message: string) {
    const sticky = isSourceSelectionPendingMessage(message);
    showNotice(
      {
        message,
        tone: "warning",
        sticky,
        stickyType: sticky ? "source-selection" : undefined,
      },
      sticky ? null : NOTICE_DURATION_MS.warning,
    );
  }

  function showSuccessNotice(message: string) {
    showNotice({
      message,
      tone: "success",
    });
  }

  function getNoticeTone(message: string): WorkspaceNotice["tone"] | null {
    if (!message.trim()) {
      return null;
    }

    if (CANCELLATION_PATTERNS.some((pattern) => pattern.test(message))) {
      return "error";
    }

    if (ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
      return "error";
    }

    if (WARNING_PATTERNS.some((pattern) => pattern.test(message))) {
      return "warning";
    }

    if (SUCCESS_PATTERNS.some((pattern) => pattern.test(message))) {
      return "success";
    }

    return null;
  }

  function markDocumentBaseline(diagram: DiagramDocument) {
    lastSavedDiagramRef.current = serializeDiagram(diagram);
    lastSavedCodeRef.current = serializeDiagramToErs(diagram);
    hasUnsavedChangesRef.current = false;
  }

  function markDiagramSaved(diagram: DiagramDocument) {
    lastSavedDiagramRef.current = serializeDiagram(diagram);
  }

  function markCodeSaved(code: string) {
    lastSavedCodeRef.current = code;
  }

  function closeConfirmDialog(confirmed: boolean) {
    const resolve = confirmDialogResolverRef.current;
    confirmDialogResolverRef.current = null;
    setConfirmDialog(null);
    resolve?.(confirmed);
  }

  function requestConfirmDialog(options: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
  }): Promise<boolean> {
    return new Promise((resolve) => {
      if (confirmDialogResolverRef.current) {
        confirmDialogResolverRef.current(false);
      }

      confirmDialogResolverRef.current = resolve;
      setConfirmDialog({
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel ?? "Conferma",
        cancelLabel: options.cancelLabel ?? "Annulla",
      });
    });
  }

  function closePromptDialog(value: string | null) {
    const resolve = promptDialogResolverRef.current;
    promptDialogResolverRef.current = null;
    setPromptDialog(null);
    setPromptValue("");
    setPromptError("");
    resolve?.(value);
  }

  function requestPromptDialog(options: {
    title: string;
    label: string;
    initialValue: string;
    placeholder?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    required?: boolean;
    requiredMessage?: string;
  }): Promise<string | null> {
    return new Promise((resolve) => {
      if (promptDialogResolverRef.current) {
        promptDialogResolverRef.current(null);
      }

      promptDialogResolverRef.current = resolve;
      setPromptDialog({
        title: options.title,
        label: options.label,
        placeholder: options.placeholder,
        confirmLabel: options.confirmLabel ?? "Salva",
        cancelLabel: options.cancelLabel ?? "Annulla",
        required: options.required === true,
        requiredMessage: options.requiredMessage ?? "Il campo non puo essere vuoto.",
      });
      setPromptValue(options.initialValue);
      setPromptError("");
    });
  }

  function submitPromptDialog() {
    if (!promptDialog) {
      return;
    }

    const normalized = promptValue.trim();
    if (promptDialog.required && !normalized) {
      setPromptError(promptDialog.requiredMessage);
      return;
    }

    closePromptDialog(normalized);
  }

  async function confirmDiscardChanges(actionLabel: string): Promise<boolean> {
    if (!hasUnsavedChangesRef.current) {
      return true;
    }

    return requestConfirmDialog({
      title: "Modifiche non salvate",
      message: `Ci sono modifiche non salvate. Vuoi davvero ${actionLabel}? Le modifiche non salvate andranno perse.`,
      confirmLabel: "Continua",
      cancelLabel: "Annulla",
    });
  }

  function openStudioSurface() {
    setSurface("studio");
    setIntroOpen(false);
  }

  async function openLandingSurface() {
    if (surface === "studio" && !(await confirmDiscardChanges("tornare alla home"))) {
      return;
    }

    setSurface("landing");
    setAboutOpen(false);
    setWhatsNewOpen(false);
    setIntroOpen(false);
  }

  async function openCodeTutorialSurface() {
    if (surface === "studio" && !(await confirmDiscardChanges("aprire la guida ERS"))) {
      return;
    }

    setSurface("code-tutorial");
    setAboutOpen(false);
    setWhatsNewOpen(false);
    setIntroOpen(false);
  }

  function setStatus(message: string) {
    setStatusMessage(message);
    if (!message.trim()) {
      dismissStickyNotices("source-selection");
      return;
    }

    const tone = getNoticeTone(message);
    if (tone === "error") {
      showErrorNotice(message);
      return;
    }

    if (tone === "warning") {
      showWarningNotice(message);
      return;
    }

    if (tone === "success") {
      showSuccessNotice(message);
      return;
    }

    if (notices.some((notice) => notice.sticky)) {
      showNotice(
        {
          message,
          tone: "success",
        },
        STATUS_FOLLOWUP_NOTICE_MS,
      );
    }
  }

  function setStatusWarning(message: string) {
    setStatusMessage(message);
    showWarningNotice(message);
  }

  function setStatusError(message: string) {
    setStatusMessage(message);
    showErrorNotice(message);
  }

  function handleCanvasStatusMessage(message: string) {
    setStatus(message);
  }

  function handleIssueNotice(issue: ValidationIssue) {
    setStatusMessage(issue.message);
    if (issue.level === "error") {
      showErrorNotice(issue.message);
      return;
    }

    const warningTargetSelected =
      issue.targetType === "node"
        ? selectedNode?.id === issue.targetId
        : selectedEdge?.id === issue.targetId;

    if (!warningTargetSelected) {
      return;
    }

    showWarningNotice(issue.message);
  }

  function handleToggleToolRail() {
    setToolbarCollapsed((current) => !current);
  }

  function handleToggleFocusMode() {
    setFocusMode((current) => {
      const next = !current;
      setStatus(next ? "Modalita focus attiva: il canvas diventa protagonista." : "Modalita focus disattivata.");
      return next;
    });
  }

  function handlePanelResizeStart(
    panel: "toolbar",
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    panelResizeRef.current = {
      panel,
      startClientX: event.clientX,
      startWidth: toolbarWidth,
    };
    document.body.classList.add("workspace-resizing");
  }

  function resetPanelWidth(panel: "toolbar") {
    if (panel === "toolbar") {
      setToolbarWidth(clampValue(DEFAULT_TOOLBAR_WIDTH, toolbarResizeBounds.min, toolbarResizeBounds.max));
    }
  }

  function replaceCodeDraft(nextCode: string) {
    codeDraftRef.current = nextCode;
    codeDirtyRef.current = false;
    lastSerializedCodeRef.current = nextCode;
    setCodeDraft(nextCode);
    setCodeDirty(false);
  }

  function syncCodeDraftWithDiagram(diagram: DiagramDocument) {
    replaceCodeDraft(serializeDiagramToErs(diagram));
    setCodeError("");
  }

  function applyWorkspaceDocument(
    nextDiagram: DiagramDocument,
    status: string,
  ) {
    history.commit(nextDiagram, history.present);
    syncCodeDraftWithDiagram(nextDiagram);
    markDocumentBaseline(nextDiagram);
    setSelection({ nodeIds: [], edgeIds: [] });
    setViewport(DEFAULT_VIEWPORT);
    setTool("select");
    setStatus(status);
  }

  function updateCodeDraft(nextCode: string) {
    codeDraftRef.current = nextCode;
    const nextDirty = nextCode !== lastSerializedCodeRef.current;
    codeDirtyRef.current = nextDirty;
    setCodeDraft(nextCode);
    setCodeDirty(nextDirty);
    if (codeError) {
      setCodeError("");
    }
  }

  useEffect(() => {
    if (!codeDirtyRef.current) {
      return;
    }

    const timeout = window.setTimeout(() => {
      try {
        const parsed = parseErsDiagram(codeDraftRef.current, history.present);
        const parsedSerialized = serializeDiagramToErs(parsed);

        if (parsedSerialized !== lastSerializedCodeRef.current) {
          history.commit(parsed, history.present);
        }

        if (codeError) {
          setCodeError("");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Codice ERS non valido.";
        setCodeError(message);
      }
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [codeDraft, history, codeError]);

  useEffect(() => {
    const nextSerializedCode = serializeDiagramToErs(history.present);
    const draftWasSynced = codeDraftRef.current === lastSerializedCodeRef.current;
    lastSerializedCodeRef.current = nextSerializedCode;

    if (!codeDirtyRef.current || draftWasSynced) {
      codeDraftRef.current = nextSerializedCode;
      codeDirtyRef.current = false;
      setCodeDraft(nextSerializedCode);
      setCodeDirty(false);
      setCodeError("");
    }
  }, [history.present]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isEditingField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;

      if (isEditingField) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        handleSaveJson();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        handleDuplicateSelection();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === ".") {
        event.preventDefault();
        handleToggleFocusMode();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          history.redo();
        } else {
          history.undo();
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        history.redo();
        return;
      }

      if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        const shortcut = event.key.toLowerCase();
        const nextTool = TOOL_BY_SHORTCUT[shortcut];

        if (nextTool) {
          event.preventDefault();
          if (mode === "view" && nextTool !== "select" && nextTool !== "move") {
            setStatusWarning("Strumento non disponibile in modalita visualizzazione.");
            return;
          }

          setTool(nextTool);
          setStatus(`Strumento attivo: ${TOOL_LABEL_BY_KIND[nextTool]}.`);
          return;
        }
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        handleDeleteSelection();
        return;
      }

      if (event.key === "Escape") {
        if (promptDialog) {
          event.preventDefault();
          closePromptDialog(null);
          return;
        }

        if (confirmDialog) {
          event.preventDefault();
          closeConfirmDialog(false);
          return;
        }

        if (introOpen) {
          setIntroOpen(false);
          return;
        }

        if (aboutOpen) {
          setAboutOpen(false);
          return;
        }

        if (whatsNewOpen) {
          setWhatsNewOpen(false);
          return;
        }

        setSelection({ nodeIds: [], edgeIds: [] });
        setStatus("");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [aboutOpen, confirmDialog, history, introOpen, mode, promptDialog, selection, whatsNewOpen]);

  function commitDiagram(nextDiagram: DiagramDocument, previousDiagram?: DiagramDocument) {
    history.commit(nextDiagram, previousDiagram);
  }

  function handleModeChange(nextMode: EditorMode) {
    setMode(nextMode);
    if (nextMode === "view") {
      setTool("select");
      setStatus("");
    }
  }

  async function handleNewDiagram() {
    if (!(await confirmDiscardChanges("creare un nuovo diagramma"))) {
      return;
    }

    applyWorkspaceDocument(
      createEmptyDiagram("Nuovo diagramma"),
      "Nuovo diagramma creato.",
    );
  }

  async function handleLoadExample() {
    if (!(await confirmDiscardChanges("caricare l'esempio"))) {
      return;
    }

    applyWorkspaceDocument(
      createExampleDiagram(),
      "Esempio Chen caricato.",
    );
  }

  function handleCreateNode(
    nodeType: Extract<ToolKind, "entity" | "relationship" | "attribute" | "text">,
    point: Point,
  ) {
    const nextNode = createNode(nodeType, point);
    const nextDiagram = {
      ...history.present,
      nodes: [...history.present.nodes, nextNode],
    };
    commitDiagram(nextDiagram);
    setSelection({ nodeIds: [nextNode.id], edgeIds: [] });
    setTool("select");
    setStatus(`${nextNode.label} aggiunto.`);
    return nextNode.id;
  }

  function handleCreateEdge(type: "connector" | "attribute" | "inheritance", sourceId: string, targetId: string) {
    let resolvedSourceId = sourceId;
    let resolvedTargetId = targetId;
    let sourceNode = findNode(history.present, resolvedSourceId);
    let targetNode = findNode(history.present, resolvedTargetId);

    if (!sourceNode || !targetNode) {
      return { success: false, message: "Impossibile creare il collegamento: nodo mancante." };
    }

    if (
      type === "attribute" &&
      sourceNode.type === "attribute" &&
      targetNode.type === "attribute" &&
      sourceNode.isMultivalued === true &&
      targetNode.isMultivalued !== true
    ) {
      resolvedSourceId = targetId;
      resolvedTargetId = sourceId;
      sourceNode = targetNode;
      targetNode = findNode(history.present, resolvedTargetId) as DiagramNode;
    }

    if (!canConnect(type, sourceNode, targetNode)) {
      return {
        success: false,
        message: getConnectionFailureReason(type, sourceNode, targetNode),
      };
    }

    if (edgeAlreadyExists(history.present, type, resolvedSourceId, resolvedTargetId)) {
      return { success: false, message: "Collegamento gia presente." };
    }

    const nextEdge = createEdge(type, resolvedSourceId, resolvedTargetId);
    const nextDiagramBase = {
      ...history.present,
      edges: [...history.present.edges, nextEdge],
    };
    const nextDiagram =
      type === "attribute" && sourceNode.type === "attribute" && targetNode.type === "attribute"
        ? (() => {
            const nextSize = getMultivaluedAttributeSize(targetNode.label);
            return updateNodeInDiagram(nextDiagramBase, targetNode.id, {
              isMultivalued: true,
              width: nextSize.width,
              height: nextSize.height,
            } as Partial<DiagramNode>);
          })()
        : nextDiagramBase;

    commitDiagram(nextDiagram);
    setSelection({ nodeIds: [], edgeIds: [nextEdge.id] });
    setTool("select");
    return { success: true, message: "Collegamento creato." };
  }

  function handleCreateExternalIdentifierFromSelection(sourceAttributeId: string, targetId: string) {
    const sourceAttribute = history.present.nodes.find((node) => node.id === sourceAttributeId);
    if (sourceAttribute?.type !== "attribute" || sourceAttribute.isIdentifier !== true) {
      return { success: false, message: "Errore: seleziona prima un attributo identificatore sorgente." };
    }

    const sourceEntity = findEntityHostForAttribute(history.present, sourceAttributeId);
    if (!sourceEntity) {
      return { success: false, message: "Errore: l'attributo sorgente deve appartenere a un'entita." };
    }

    const targetNode = history.present.nodes.find((node) => node.id === targetId);
    if (!targetNode) {
      return { success: false, message: "Errore: destinazione identificatore esterno non valida." };
    }

    let targetEntity: DiagramNode | undefined;
    let targetAttributeId: string | undefined;
    let mode: "entity" | "composite";

    if (targetNode.type === "attribute") {
      if (targetNode.isIdentifier === true) {
        return { success: false, message: "Errore: per il composto esterno seleziona un attributo normale (non identificatore)." };
      }

      targetEntity = findEntityHostForAttribute(history.present, targetNode.id);
      if (!targetEntity) {
        return { success: false, message: "Errore: l'attributo destinazione deve appartenere a un'entita." };
      }

      targetAttributeId = targetNode.id;
      mode = "composite";
    } else if (targetNode.type === "entity") {
      targetEntity = targetNode;
      mode = "entity";
    } else {
      return { success: false, message: "Errore: seleziona un attributo o un'entita come destinazione." };
    }

    if (targetEntity.id === sourceEntity.id) {
      return { success: false, message: "Errore: origine e destinazione devono essere entita diverse." };
    }

    const relationship = findRelationshipBetweenEntities(history.present, sourceEntity.id, targetEntity.id);
    if (!relationship || relationship.type !== "relationship") {
      return { success: false, message: "Errore: nessuna relazione valida tra le due entita selezionate." };
    }

    const nextDiagram = updateNodeInDiagram(history.present, relationship.id, {
      isExternalIdentifier: true,
      externalIdentifierMode: mode,
      externalIdentifierSourceAttributeId: sourceAttribute.id,
      externalIdentifierTargetEntityId: targetEntity.id,
      externalIdentifierTargetAttributeId: targetAttributeId,
    } as Partial<DiagramNode>);

    commitDiagram(nextDiagram);
    setSelection({ nodeIds: [relationship.id], edgeIds: [] });
    return {
      success: true,
      message:
        mode === "composite"
          ? "Identificatore esterno composto creato. Verifica cardinalita (1,1) e (0,1)."
          : "Identificatore esterno creato. Verifica cardinalita (1,1) e (0,1).",
      };
  }

  function handleCreateAttributeFromSelection() {
    if (mode === "view" || selection.nodeIds.length !== 1 || selection.edgeIds.length > 0) {
      return;
    }

    const hostNode = history.present.nodes.find((node) => node.id === selection.nodeIds[0]);
    if (!hostNode || (hostNode.type !== "entity" && hostNode.type !== "relationship" && hostNode.type !== "attribute")) {
      return;
    }

    const draftAttribute = createNode("attribute", { x: 0, y: 0 }) as Extract<DiagramNode, { type: "attribute" }>;
    const nextAttribute = {
      ...draftAttribute,
      ...getNextAttributePosition(history.present, hostNode, draftAttribute),
    };
    const nextEdge = createEdge("attribute", nextAttribute.id, hostNode.id);
    const nextDiagramBase: DiagramDocument = {
      ...history.present,
      nodes: [...history.present.nodes, nextAttribute],
      edges: [...history.present.edges, nextEdge],
    };
    const nextDiagram =
      hostNode.type === "attribute"
        ? (() => {
            const nextSize = getMultivaluedAttributeSize(hostNode.label);
            return updateNodeInDiagram(nextDiagramBase, hostNode.id, {
              isMultivalued: true,
              width: nextSize.width,
              height: nextSize.height,
            } as Partial<DiagramNode>);
          })()
        : nextDiagramBase;

    commitDiagram(nextDiagram);
    setSelection({ nodeIds: [nextAttribute.id], edgeIds: [] });
    setTool("select");
    setStatus(`Attributo collegato a ${hostNode.label}.`);
  }

  function handleNodeChange(nodeId: string, patch: Partial<DiagramNode>) {
    const currentNode = history.present.nodes.find((node) => node.id === nodeId);
    const attributePatch = patch as Partial<Extract<DiagramNode, { type: "attribute" }>>;
    let normalizedAttributePatch = attributePatch;

    const attributeLinkedToRelationship =
      currentNode?.type === "attribute" &&
      history.present.edges.some((edge) => {
        if (edge.type !== "attribute") {
          return false;
        }

        const isLinked = edge.sourceId === currentNode.id || edge.targetId === currentNode.id;
        if (!isLinked) {
          return false;
        }

        const hostId = edge.sourceId === currentNode.id ? edge.targetId : edge.sourceId;
        const hostNode = history.present.nodes.find((node) => node.id === hostId);
        return hostNode?.type === "relationship";
      });

    if (
      currentNode?.type === "attribute" &&
      attributeLinkedToRelationship &&
      (attributePatch.isIdentifier === true || attributePatch.isCompositeInternal === true)
    ) {
      setStatusError("Un'associazione non puo avere identificatori.");
      return;
    }

    if (currentNode?.type === "attribute") {
      if (attributePatch.isIdentifier === true) {
        normalizedAttributePatch = {
          ...normalizedAttributePatch,
          isCompositeInternal: false,
          isMultivalued: false,
        };
      }

      if (attributePatch.isCompositeInternal === true) {
        normalizedAttributePatch = {
          ...normalizedAttributePatch,
          isIdentifier: false,
          isMultivalued: false,
        };
      }

      if (attributePatch.isMultivalued === true) {
        normalizedAttributePatch = {
          ...normalizedAttributePatch,
          isIdentifier: false,
          isCompositeInternal: false,
        };
      }
    }

    const attributeWillBeMultivalued =
      currentNode?.type === "attribute" &&
      (normalizedAttributePatch.isMultivalued === true ||
        (currentNode.isMultivalued === true && normalizedAttributePatch.isMultivalued !== false));
    const nextMultivaluedSize =
      currentNode?.type === "attribute" && attributeWillBeMultivalued
        ? getMultivaluedAttributeSize(typeof patch.label === "string" ? patch.label : currentNode.label)
        : null;

    const nextPatch =
      currentNode?.type === "attribute" && attributeWillBeMultivalued && nextMultivaluedSize
        ? {
            ...patch,
            ...normalizedAttributePatch,
            width: nextMultivaluedSize.width,
            height: nextMultivaluedSize.height,
          }
        : currentNode?.type === "attribute" &&
            normalizedAttributePatch.isMultivalued === false &&
            currentNode.isMultivalued === true
          ? {
              ...patch,
              ...normalizedAttributePatch,
              width: DEFAULT_ATTRIBUTE_SIZE.width,
              height: DEFAULT_ATTRIBUTE_SIZE.height,
            }
        : currentNode?.type === "attribute"
          ? {
              ...patch,
              ...normalizedAttributePatch,
            }
          : patch;

    const nextDiagram = updateNodeInDiagram(history.present, nodeId, nextPatch);
    commitDiagram(nextDiagram);
  }

  function handleNodesChange(nodeIds: string[], patch: Partial<DiagramNode>) {
    if (nodeIds.length === 0) {
      return;
    }

    const attributePatch = patch as Partial<Extract<DiagramNode, { type: "attribute" }>>;
    const wantsIdentifierMode = attributePatch.isIdentifier === true || attributePatch.isCompositeInternal === true;

    let targetIds = nodeIds;
    if (wantsIdentifierMode) {
      targetIds = nodeIds.filter((nodeId) => {
        const node = history.present.nodes.find((item) => item.id === nodeId);
        if (node?.type !== "attribute") {
          return true;
        }

        const linkedToRelationship = history.present.edges.some((edge) => {
          if (edge.type !== "attribute") {
            return false;
          }

          const isLinked = edge.sourceId === node.id || edge.targetId === node.id;
          if (!isLinked) {
            return false;
          }

          const hostId = edge.sourceId === node.id ? edge.targetId : edge.sourceId;
          const hostNode = history.present.nodes.find((candidate) => candidate.id === hostId);
          return hostNode?.type === "relationship";
        });

        return !linkedToRelationship && node.isMultivalued !== true;
      });

      if (targetIds.length !== nodeIds.length) {
        setStatusError("Alcuni attributi sono composti o collegati a un'associazione e non possono essere identificatori.");
      }
    }

    if (attributePatch.isMultivalued === true) {
      targetIds = targetIds.filter((nodeId) => {
        const node = history.present.nodes.find((item) => item.id === nodeId);
        return node?.type !== "attribute" || (node.isIdentifier !== true && node.isCompositeInternal !== true);
      });

      if (targetIds.length !== nodeIds.length) {
        setStatusError("Gli attributi usati in un identificatore non possono diventare composti.");
      }
    }

    if (targetIds.length === 0) {
      return;
    }

    const nextDiagram = updateNodesInDiagram(history.present, targetIds, patch);
    commitDiagram(nextDiagram);
  }

  function handleEdgeChange(edgeId: string, patch: Partial<DiagramEdge>) {
    const currentEdge = history.present.edges.find((edge) => edge.id === edgeId);

    const updatesIsaGroup =
      currentEdge?.type === "inheritance" &&
      ("isaDisjointness" in patch || "isaCompleteness" in patch);

    const nextDiagram =
      updatesIsaGroup && currentEdge
        ? updateEdgesInDiagram(
            history.present,
            history.present.edges
              .filter(
                (edge) => edge.type === "inheritance" && edge.targetId === currentEdge.targetId,
              )
              .map((edge) => edge.id),
            patch,
          )
        : updateEdgeInDiagram(history.present, edgeId, patch);

    commitDiagram(nextDiagram);
  }

  function handleRenameNode(nodeId: string, label: string) {
    handleNodeChange(nodeId, { label });
  }

  function handleRenameEdge(edgeId: string, label: string) {
    const nextDiagram = updateEdgeTextInDiagram(history.present, edgeId, label);
    commitDiagram(nextDiagram);
  }

  async function handleRenameSelectionQuick() {
    if (mode === "view") {
      return;
    }

    if (selectedNode) {
      const nextLabel = await requestPromptDialog({
        title: "Rinomina elemento",
        label: "Nuovo nome elemento",
        initialValue: selectedNode.label,
        required: true,
        requiredMessage: "Il nome elemento non puo essere vuoto.",
      });
      if (nextLabel == null) {
        return;
      }

      if (nextLabel === selectedNode.label) {
        return;
      }

      handleRenameNode(selectedNode.id, nextLabel);
      setStatus("Elemento rinominato.");
      return;
    }

    if (!selectedEdge) {
      return;
    }

    const promptLabel =
      selectedEdge.type === "connector"
        ? "Nuova cardinalita"
        : selectedEdge.type === "attribute"
          ? "Nuova cardinalita opzionale"
          : "Nuovo nome collegamento";
    const currentValue =
      selectedEdge.type === "connector" || selectedEdge.type === "attribute"
        ? selectedEdge.cardinality ?? ""
        : selectedEdge.label;
    const nextValue = await requestPromptDialog({
      title: "Aggiorna collegamento",
      label: promptLabel,
      initialValue: currentValue,
      required: selectedEdge.type === "connector",
      requiredMessage: "La cardinalita del collegamento non puo essere vuota.",
    });
    if (nextValue == null) {
      return;
    }

    if (nextValue === currentValue.trim()) {
      return;
    }

    handleRenameEdge(selectedEdge.id, nextValue);
    setStatus("Collegamento aggiornato.");
  }

  function handleDeleteSelection() {
    if (mode === "view") {
      return;
    }

    if (selection.nodeIds.length === 0 && selection.edgeIds.length === 0) {
      return;
    }

    if (selection.nodeIds.length === 1 && selection.edgeIds.length === 0) {
      const selectedNode = history.present.nodes.find((node) => node.id === selection.nodeIds[0]);
      if (selectedNode?.type === "relationship" && selectedNode.isExternalIdentifier === true) {
        const nextDiagram = clearExternalIdentifierFromRelationship(history.present, selectedNode.id);
        commitDiagram(nextDiagram);
        setSelection({ nodeIds: [selectedNode.id], edgeIds: [] });
        setStatus("Identificatore esterno rimosso.");
        return;
      }
    }

    const nextDiagram = removeSelection(history.present, selection);
    commitDiagram(nextDiagram);
    setSelection({ nodeIds: [], edgeIds: [] });
    setStatus("Selezione eliminata.");
  }

  function handleDeleteNodeById(nodeId: string) {
    if (mode === "view") {
      return;
    }

    const nextDiagram = removeSelection(history.present, { nodeIds: [nodeId], edgeIds: [] });
    commitDiagram(nextDiagram);
    setSelection({ nodeIds: [], edgeIds: [] });
    setStatus("Elemento eliminato.");
  }

  function handleDeleteEdgeById(edgeId: string) {
    if (mode === "view") {
      return;
    }

    const nextDiagram = removeSelection(history.present, { nodeIds: [], edgeIds: [edgeId] });
    commitDiagram(nextDiagram);
    setSelection({ nodeIds: [], edgeIds: [] });
    setStatus("Collegamento eliminato.");
  }

  function handleClearExternalIdentifier(relationshipId: string) {
    const relationshipNode = history.present.nodes.find((node) => node.id === relationshipId);
    if (
      !relationshipNode ||
      relationshipNode.type !== "relationship" ||
      relationshipNode.isExternalIdentifier !== true
    ) {
      setStatusWarning("Nessun identificatore esterno da rimuovere sulla relazione selezionata.");
      return;
    }

    const nextDiagram = clearExternalIdentifierFromRelationship(history.present, relationshipId);
    commitDiagram(nextDiagram);
    setSelection({ nodeIds: [relationshipId], edgeIds: [] });
    setStatus("Identificatore esterno rimosso.");
  }

  function handleDuplicateSelection() {
    if (mode === "view") {
      return;
    }

    const duplicated = duplicateSelection(history.present, selection);
    if (!duplicated) {
      return;
    }

    commitDiagram(duplicated.diagram);
    setSelection(duplicated.selection);
    setStatus("Selezione duplicata.");
  }

  function handleAlignSelection(axis: "left" | "center" | "top" | "middle") {
    if (mode === "view") {
      return;
    }

    if (selection.nodeIds.length < 2) {
      setStatusWarning("Seleziona almeno due nodi per allineare.");
      return;
    }

    const nextDiagram = alignNodes(history.present, selection.nodeIds, axis);
    if (nextDiagram === history.present) {
      setStatusWarning("Nodi gia allineati su questo asse.");
      return;
    }

    commitDiagram(nextDiagram);
    setStatus("Allineamento applicato.");
  }

  function handleSaveJson() {
    downloadTextFile(
      serializeDiagram(history.present),
      `${sanitizeFileNameBase(history.present.meta.name)}.json`,
      "application/json;charset=utf-8",
    );
    markDiagramSaved(history.present);
    if (!codeDirtyRef.current) {
      markCodeSaved(serializeDiagramToErs(history.present));
    }
    setStatus("Diagramma salvato in JSON.");
  }

  function handleSaveErs() {
    const source = codeDirtyRef.current ? codeDraftRef.current : serializeDiagramToErs(history.present);
    downloadTextFile(source, `${sanitizeFileNameBase(history.present.meta.name)}.ers`);
    markCodeSaved(source);
    if (!codeDirtyRef.current && !codeError) {
      markDiagramSaved(history.present);
    }
    setStatus(codeDirtyRef.current ? "Bozza ERS scaricata." : "Codice ERS scaricato.");
  }

  async function handleLoadRequest() {
    if (!(await confirmDiscardChanges("caricare un file JSON"))) {
      return;
    }

    jsonFileInputRef.current?.click();
  }

  async function handleLoadErsRequest() {
    if (!(await confirmDiscardChanges("caricare un file ERS"))) {
      return;
    }

    ersFileInputRef.current?.click();
  }

  async function handleLoadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const rawText = await file.text();
      const parsed = parseDiagram(rawText);
      applyWorkspaceDocument(
        parsed,
        "Diagramma caricato.",
      );
    } catch (error) {
      console.error(error);
      setStatusError("JSON non valido.");
    } finally {
      event.target.value = "";
    }
  }

  async function handleLoadErsFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const rawText = await file.text();
      const parsed = parseErsDiagram(rawText, history.present);
      applyWorkspaceDocument(
        parsed,
        "Codice ERS caricato.",
      );
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Codice ERS non valido.";
      setCodeError(message);
      setStatusError(message);
    } finally {
      event.target.value = "";
    }
  }

  function handleResetCodeFromDiagram() {
    syncCodeDraftWithDiagram(history.present);
    setStatus("Codice ERS rigenerato dal diagramma.");
  }

  async function handleExportPng() {
    if (!svgRef.current) {
      setStatusWarning("Canvas non disponibile per esportare il PNG.");
      return;
    }

    try {
      await downloadPng(svgRef.current, "chen-er-diagram.png");
      setStatus("PNG esportato.");
    } catch (error) {
      console.error(error);
      setStatusError("Esportazione PNG non riuscita.");
    }
  }

  function handleExportSvg() {
    if (!svgRef.current) {
      setStatusWarning("Canvas non disponibile per esportare l'SVG.");
      return;
    }

    downloadSvg(svgRef.current, "chen-er-diagram.svg");
    setStatus("SVG esportato.");
  }

  if (surface === "landing") {
    return (
      <LandingPage
        appTitle={APP_TITLE}
        appVersion={APP_VERSION}
        latestRelease={APP_CHANGELOG[0]}
        onOpenStudio={openStudioSurface}
        onOpenCodeTutorial={openCodeTutorialSurface}
      />
    );
  }

  if (surface === "code-tutorial") {
    return (
      <CodeModeTutorialPage
        appTitle={APP_TITLE}
        appVersion={APP_VERSION}
        onBackHome={openLandingSurface}
        onOpenStudio={openStudioSurface}
        onOpenCodeStudio={openStudioSurface}
      />
    );
  }

  return (
    <div className={focusMode ? "app-shell focus-mode" : "app-shell"}>
      <AppHeader
        appTitle={APP_TITLE}
        appVersion={APP_VERSION}
        diagramName={history.present.meta.name}
        mode={mode}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        focusMode={focusMode}
        toolRailCollapsed={effectiveToolbarCollapsed}
        onModeChange={handleModeChange}
        onNew={handleNewDiagram}
        onUndo={history.undo}
        onRedo={history.redo}
        onSave={handleSaveJson}
        onSaveErs={handleSaveErs}
        onLoad={handleLoadRequest}
        onLoadErs={handleLoadErsRequest}
        onExportPng={handleExportPng}
        onExportSvg={handleExportSvg}
        onExample={handleLoadExample}
        onResetErs={handleResetCodeFromDiagram}
        onOpenErsGuide={openCodeTutorialSurface}
        onAbout={() => {
          setWhatsNewOpen(false);
          setAboutOpen(true);
        }}
        onWhatsNew={() => {
          setAboutOpen(false);
          setWhatsNewOpen(true);
        }}
        onToggleFocusMode={handleToggleFocusMode}
        onToggleToolRail={handleToggleToolRail}
        onHome={openLandingSurface}
      />

      <div className="app-workspace-region">
        {notices.length > 0 ? (
          <section className="workspace-toast-center" aria-live="polite" aria-atomic="false">
            <div className="workspace-toast-stack">
              {notices.map((notice) => (
                <article
                  key={notice.id}
                  className={
                    notice.tone === "error"
                      ? "workspace-toast workspace-toast-error"
                      : notice.tone === "warning"
                        ? "workspace-toast workspace-toast-warning"
                        : "workspace-toast workspace-toast-success"
                  }
                  role={notice.tone === "error" ? "alert" : "status"}
                >
                  <div className="workspace-toast-body">
                    <span className="workspace-toast-badge">
                      {notice.tone === "error" ? "Errore" : notice.tone === "warning" ? "Avviso" : "Successo"}
                    </span>
                    <p>{notice.message}</p>
                  </div>
                  <button
                    type="button"
                    className="workspace-toast-close"
                    onClick={() => dismissNotice(notice.id)}
                    aria-label="Chiudi toast"
                  >
                    x
                  </button>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <div
          className={[
            "workspace-shell",
            effectiveToolbarCollapsed ? "toolbar-collapsed" : "",
            focusMode ? "workspace-shell-focus" : "",
            hasSelection ? "workspace-has-selection" : "workspace-idle",
          ]
            .filter(Boolean)
            .join(" ")}
          style={workspaceShellStyle}
        >
          <Toolbar
            diagram={history.present}
            selection={selection}
            activeTool={tool}
            mode={mode}
            collapsed={effectiveToolbarCollapsed}
            canUndo={history.canUndo}
            canRedo={history.canRedo}
            selectionItemCount={selectionItemCount}
            issues={issues}
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            onToolChange={setTool}
            onUndo={history.undo}
            onRedo={history.redo}
            onDuplicateSelection={handleDuplicateSelection}
            onDeleteSelection={handleDeleteSelection}
            onCreateAttributeForSelection={handleCreateAttributeFromSelection}
            onRenameSelection={handleRenameSelectionQuick}
            onNodeChange={handleNodeChange}
            onNodesChange={handleNodesChange}
            onEdgeChange={handleEdgeChange}
            onClearExternalIdentifier={handleClearExternalIdentifier}
            onAlign={handleAlignSelection}
            onIssueSelect={handleIssueNotice}
            onToggleCollapse={handleToggleToolRail}
          />

          <button
            type="button"
            className={
              !focusMode && !effectiveToolbarCollapsed
                ? "workspace-resizer workspace-resizer-active"
                : "workspace-resizer"
            }
            onPointerDown={(event) => handlePanelResizeStart("toolbar", event)}
            onDoubleClick={() => resetPanelWidth("toolbar")}
            aria-label="Ridimensiona pannello strumenti"
            title="Trascina per allargare o ridurre il pannello strumenti"
            disabled={focusMode || effectiveToolbarCollapsed}
          />

          <div className="workspace-main diagram-only">
            <DiagramCanvas
              diagram={history.present}
              selection={selection}
              tool={tool}
              mode={mode}
              viewport={viewport}
              issues={issues}
              statusMessage={statusMessage}
              svgRef={svgRef}
              onViewportChange={setViewport}
              onSelectionChange={setSelection}
              onPreviewDiagram={history.setPresent}
              onCommitDiagram={commitDiagram}
              onCreateNode={handleCreateNode}
              onCreateEdge={handleCreateEdge}
              onCreateExternalIdentifier={handleCreateExternalIdentifierFromSelection}
              onDeleteNode={handleDeleteNodeById}
              onDeleteEdge={handleDeleteEdgeById}
              onDeleteSelection={handleDeleteSelection}
              onDeleteExternalIdentifier={handleClearExternalIdentifier}
              onRenameNode={handleRenameNode}
              onRenameEdge={handleRenameEdge}
              onStatusMessageChange={handleCanvasStatusMessage}
            />
          </div>
        </div>
      </div>

      <input
        ref={jsonFileInputRef}
        className="hidden-input"
        type="file"
        accept="application/json,.json"
        onChange={handleLoadFile}
      />
      <input
        ref={ersFileInputRef}
        className="hidden-input"
        type="file"
        accept=".ers,text/plain"
        onChange={handleLoadErsFile}
      />

      {confirmDialog ? (
        <div className="help-modal-backdrop" role="presentation" onClick={() => closeConfirmDialog(false)}>
          <div
            className="help-modal action-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="help-modal-head">
              <h2 id="confirm-dialog-title">{confirmDialog.title}</h2>
            </div>

            <div className="action-modal-content">
              <p>{confirmDialog.message}</p>
              <div className="action-modal-actions">
                <button type="button" className="header-button" onClick={() => closeConfirmDialog(false)}>
                  {confirmDialog.cancelLabel}
                </button>
                <button type="button" className="mode-button active" onClick={() => closeConfirmDialog(true)}>
                  {confirmDialog.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {promptDialog ? (
        <div className="help-modal-backdrop" role="presentation" onClick={() => closePromptDialog(null)}>
          <div
            className="help-modal action-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="prompt-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="help-modal-head">
              <h2 id="prompt-dialog-title">{promptDialog.title}</h2>
            </div>

            <form
              className="action-modal-content"
              onSubmit={(event) => {
                event.preventDefault();
                submitPromptDialog();
              }}
            >
              <label className="field action-modal-field">
                <span>{promptDialog.label}</span>
                <input
                  ref={promptInputRef}
                  value={promptValue}
                  placeholder={promptDialog.placeholder}
                  onChange={(event) => {
                    setPromptValue(event.target.value);
                    if (promptError) {
                      setPromptError("");
                    }
                  }}
                />
              </label>
              {promptError ? <p className="action-modal-error">{promptError}</p> : null}

              <div className="action-modal-actions">
                <button type="button" className="header-button" onClick={() => closePromptDialog(null)}>
                  {promptDialog.cancelLabel}
                </button>
                <button type="submit" className="mode-button active">
                  {promptDialog.confirmLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {introOpen ? (
        <div className="intro-modal-backdrop" role="presentation" onClick={() => setIntroOpen(false)}>
          <div
            className="intro-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="intro-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="intro-modal-head">
              <h2 id="intro-modal-title">Benvenuto in {APP_TITLE}</h2>
              <button type="button" className="help-close" onClick={() => setIntroOpen(false)}>
                Chiudi
              </button>
            </div>

            <div className="intro-modal-content">
              <p>
                Questa applicazione ti aiuta a costruire diagrammi ER in stile Chen in modo rapido: crea entita,
                relazioni e attributi, collega i nodi e valida la consistenza del modello.
              </p>

              <div className="intro-grid">
                <article>
                  <h3>1. Crea</h3>
                  <p>Seleziona uno strumento, clicca sul canvas e inserisci i tuoi elementi principali.</p>
                </article>
                <article>
                  <h3>2. Collega</h3>
                  <p>Usa Collegamento o Generalizzazione per definire relazioni e cardinalita.</p>
                </article>
                <article>
                  <h3>3. Rifinisci</h3>
                  <p>Rinomina con doppio click, allinea i nodi e correggi i warning nelle validazioni.</p>
                </article>
              </div>

              <div className="intro-actions">
                <button
                  type="button"
                  className="header-button"
                  onClick={() => {
                    setIntroOpen(false);
                    setAboutOpen(true);
                  }}
                >
                  Apri la guida
                </button>
                <button type="button" className="mode-button active" onClick={() => setIntroOpen(false)}>
                  Inizia a disegnare
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {aboutOpen ? (
        <div className="help-modal-backdrop" role="presentation" onClick={() => setAboutOpen(false)}>
          <div
            className="help-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="help-modal-head">
              <h2 id="about-modal-title">Informazioni</h2>
              <button type="button" className="help-close" onClick={() => setAboutOpen(false)}>
                Chiudi
              </button>
            </div>

            <div className="about-meta">
              <strong>{APP_TITLE}</strong>
              <span>Versione corrente {APP_VERSION}</span>
            </div>

            <div className="help-sections">
              <details className="help-section" open>
                <summary>Strumenti e scorciatoie</summary>
                <ul className="help-list">
                  <li>Selezione rapida strumenti: S Sposta, V Selezione, X Cancella, E Entita, R Relazione, A Attributo, C Collegamento, G Generalizzazione, T Testo.</li>
                </ul>
              </details>

              <details className="help-section">
                <summary>Inserimento e Collegamenti</summary>
                <ul className="help-list">
                  <li>Con Entita, Relazione, Attributo o Testo: clic sul canvas per inserire l'elemento; dopo l'inserimento il tool torna su Selezione.</li>
                  <li>Collegamenti: scegli Collegamento o Generalizzazione, clicca il nodo sorgente e poi il nodo destinazione.</li>
                </ul>
              </details>

              <details className="help-section">
                <summary>Selezione e Modifica</summary>
                <ul className="help-list">
                  <li>Con Selezione puoi trascinare nodi e box di selezione; Shift+click aggiunge/rimuove nodi dalla selezione.</li>
                  <li>Doppio click su nodo o collegamento per rinominare/aggiornare il testo (cardinalita inclusa).</li>
                  <li>Nell'ispettore puoi attivare entita deboli dedicate, attributi composti e vincoli ISA avanzati sulle generalizzazioni.</li>
                  <li>Con Selezione puoi trascinare la cardinalita di un collegamento per spostare la linea.</li>
                  <li>I pulsanti di allineamento funzionano con almeno due nodi selezionati.</li>
                </ul>
              </details>

              <details className="help-section">
                <summary>Navigazione del canvas</summary>
                <ul className="help-list">
                  <li>Navigazione canvas: rotella per zoom, strumento Sposta per pan, oppure trascina con tasto centrale.</li>
                </ul>
              </details>

              <details className="help-section">
                <summary>Comandi Tastiera</summary>
                <ul className="help-list">
                  <li>Ctrl/Cmd+S salva JSON, Ctrl/Cmd+D duplica selezione, Ctrl/Cmd+Z annulla, Ctrl/Cmd+Shift+Z o Ctrl/Cmd+Y ripete.</li>
                  <li>Delete/Backspace elimina la selezione; Esc annulla la selezione corrente e chiude le finestre informazioni/novita.</li>
                  <li>Nel canvas usa Tab per mettere a fuoco nodi e collegamenti, frecce per spostare la selezione, Invio per rinominare ed Esc per annullare un collegamento in corso.</li>
                </ul>
              </details>

              <details className="help-section">
                <summary>Modalita codice e sincronizzazione live</summary>
                <ul className="help-list">
                  <li>In vista Affiancata, il codice ERS viene validato in tempo reale e il diagramma si aggiorna automaticamente quando la sintassi e valida.</li>
                  <li>Se il codice e incompleto o non valido, viene mostrato l'errore nel pannello senza alterare l'ultimo stato valido del diagramma.</li>
                  <li>Usa Rigenera dal diagramma per riallineare rapidamente il sorgente ERS allo stato corrente del canvas.</li>
                </ul>
              </details>

              <details className="help-section">
                <summary>Validazioni ed Errori</summary>
                <ul className="help-list">
                  <li>Avvisi ed errori operativi compaiono come toast flottanti in overlay, senza spostare il layout, e i problemi del modello restano evidenziati su nodi e collegamenti.</li>
                </ul>
              </details>

              <details className="help-section">
                <summary>Stato Notazione ER (v{APP_VERSION})</summary>
                <ul className="help-list">
                  <li>Disponibile: entita, entita deboli dedicate, relazioni, attributi, attributi composti, cardinalita, generalizzazione e identificatori semplici/composti interni/esterni.</li>
                  <li>Disponibile: vincoli ISA avanzati disjoint/overlap e total/partial su ogni collegamento di generalizzazione.</li>
                  <li>Ancora non coperto: attributi derivati e altri simboli EER specialistici non ancora presenti nel canvas.</li>
                </ul>
              </details>
            </div>
          </div>
        </div>
      ) : null}

      {whatsNewOpen ? (
        <div className="help-modal-backdrop" role="presentation" onClick={() => setWhatsNewOpen(false)}>
          <div
            className="help-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="help-modal-head">
              <h2 id="new-modal-title">Novita</h2>
              <button type="button" className="help-close" onClick={() => setWhatsNewOpen(false)}>
                Chiudi
              </button>
            </div>

            <div className="changelog-content">
              {APP_CHANGELOG.map((entry) => (
                <article key={`${entry.version}-${entry.date}`} className="changelog-entry">
                  <header>
                    <strong>{APP_NAME} {entry.version}</strong>
                    <span>{entry.date}</span>
                  </header>
                  <ul className="help-list">
                    {entry.updates.map((update) => (
                      <li key={update}>{update}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}
