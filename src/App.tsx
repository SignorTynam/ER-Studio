import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { DiagramCanvas } from "./canvas/DiagramCanvas";
import { AppHeader } from "./components/AppHeader";
import { useHistory } from "./hooks/useHistory";
import { InspectorPanel } from "./inspector/InspectorPanel";
import { Toolbar } from "./toolbar/Toolbar";
import type {
  DiagramDocument,
  DiagramEdge,
  DiagramNode,
  EditorMode,
  Point,
  SelectionState,
  ToolKind,
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
  parseDiagram,
  removeSelection,
  serializeDiagram,
  validateDiagram,
} from "./utils/diagram";
import { createExampleDiagram } from "./utils/example";
import { downloadPng, downloadSvg } from "./utils/export";
import { TOOL_BY_SHORTCUT, TOOL_LABEL_BY_KIND } from "./utils/toolConfig";

const DEFAULT_VIEWPORT: Viewport = {
  x: 180,
  y: 110,
  zoom: 1,
};

interface ToastMessage {
  id: number;
  message: string;
}

const ERROR_PATTERNS = [/errore/i, /impossibile/i, /non compatibile/i, /non valido/i, /non riuscito/i, /gia presente/i];

function downloadTextFile(content: string, fileName: string) {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
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

      return { ...edge, label: value };
    }),
  };
}

export default function App() {
  const history = useHistory<DiagramDocument>(createExampleDiagram());
  const [tool, setTool] = useState<ToolKind>("select");
  const [mode, setMode] = useState<EditorMode>("edit");
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT);
  const [selection, setSelection] = useState<SelectionState>({ nodeIds: [], edgeIds: [] });
  const [statusMessage, setStatusMessage] = useState("");
  const [errorToasts, setErrorToasts] = useState<ToastMessage[]>([]);
  const [helpOpen, setHelpOpen] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const issues = validateDiagram(history.present);

  useEffect(() => {
    if (!statusMessage || statusMessage.startsWith("Sorgente")) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setStatusMessage("");
    }, 2600);

    return () => window.clearTimeout(timeout);
  }, [statusMessage]);

  function dismissToast(toastId: number) {
    setErrorToasts((current) => current.filter((toast) => toast.id !== toastId));
  }

  function showErrorToast(message: string) {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setErrorToasts((current) => [...current, { id, message }]);
    window.setTimeout(() => {
      dismissToast(id);
    }, 4200);
  }

  function isErrorMessage(message: string): boolean {
    return ERROR_PATTERNS.some((pattern) => pattern.test(message));
  }

  function setStatus(message: string) {
    setStatusMessage(message);
  }

  function setStatusError(message: string) {
    setStatusMessage(message);
    showErrorToast(message);
  }

  function handleCanvasStatusMessage(message: string) {
    setStatusMessage(message);
    if (message && isErrorMessage(message)) {
      showErrorToast(message);
    }
  }

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
            setStatusError("Strumento non disponibile in modalita visualizzazione.");
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
        if (helpOpen) {
          setHelpOpen(false);
          return;
        }

        setSelection({ nodeIds: [], edgeIds: [] });
        setStatus("");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [helpOpen, history, selection, mode]);

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

  function handleNewDiagram() {
    history.commit(createEmptyDiagram("Nuovo diagramma"), history.present);
    setSelection({ nodeIds: [], edgeIds: [] });
    setViewport(DEFAULT_VIEWPORT);
    setStatus("Nuovo diagramma creato.");
  }

  function handleLoadExample() {
    history.commit(createExampleDiagram(), history.present);
    setSelection({ nodeIds: [], edgeIds: [] });
    setViewport(DEFAULT_VIEWPORT);
    setTool("select");
    setStatus("Esempio Chen caricato.");
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
    setStatus(`${nextNode.label} aggiunto.`);
    return nextNode.id;
  }

  function handleCreateEdge(type: "connector" | "attribute" | "inheritance", sourceId: string, targetId: string) {
    const sourceNode = findNode(history.present, sourceId);
    const targetNode = findNode(history.present, targetId);

    if (!sourceNode || !targetNode) {
      return { success: false, message: "Impossibile creare il collegamento: nodo mancante." };
    }

    if (!canConnect(type, sourceNode, targetNode)) {
      return { success: false, message: "Connessione non compatibile con la sintassi Chen." };
    }

    if (edgeAlreadyExists(history.present, type, sourceId, targetId)) {
      return { success: false, message: "Collegamento gia presente." };
    }

    const nextEdge = createEdge(type, sourceId, targetId);
    const nextDiagram = {
      ...history.present,
      edges: [...history.present.edges, nextEdge],
    };

    commitDiagram(nextDiagram);
    setSelection({ nodeIds: [], edgeIds: [nextEdge.id] });
    return { success: true, message: "Collegamento creato." };
  }

  function handleNodeChange(nodeId: string, patch: Partial<DiagramNode>) {
    const nextDiagram = updateNodeInDiagram(history.present, nodeId, patch);
    commitDiagram(nextDiagram);
  }

  function handleEdgeChange(edgeId: string, patch: Partial<DiagramEdge>) {
    const nextDiagram = updateEdgeInDiagram(history.present, edgeId, patch);
    commitDiagram(nextDiagram);
  }

  function handleRenameNode(nodeId: string, label: string) {
    handleNodeChange(nodeId, { label });
  }

  function handleRenameEdge(edgeId: string, label: string) {
    const nextDiagram = updateEdgeTextInDiagram(history.present, edgeId, label);
    commitDiagram(nextDiagram);
  }

  function handleDeleteSelection() {
    if (mode === "view") {
      return;
    }

    if (selection.nodeIds.length === 0 && selection.edgeIds.length === 0) {
      return;
    }

    const nextDiagram = removeSelection(history.present, selection);
    commitDiagram(nextDiagram);
    setSelection({ nodeIds: [], edgeIds: [] });
    setStatus("Selezione eliminata.");
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
      setStatus("Seleziona almeno due nodi per allineare.");
      return;
    }

    const nextDiagram = alignNodes(history.present, selection.nodeIds, axis);
    if (nextDiagram === history.present) {
      setStatus("Nodi gia allineati su questo asse.");
      return;
    }

    commitDiagram(nextDiagram);
    setStatus("Allineamento applicato.");
  }

  function handleSaveJson() {
    downloadTextFile(
      serializeDiagram(history.present),
      `${history.present.meta.name.toLowerCase().replace(/\s+/g, "-") || "diagramma-er"}.json`,
    );
    setStatus("Diagramma salvato in JSON.");
  }

  function handleLoadRequest() {
    fileInputRef.current?.click();
  }

  async function handleLoadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const rawText = await file.text();
      const parsed = parseDiagram(rawText);
      history.commit(parsed, history.present);
      setSelection({ nodeIds: [], edgeIds: [] });
      setViewport(DEFAULT_VIEWPORT);
      setStatus("Diagramma caricato.");
    } catch (error) {
      console.error(error);
      setStatusError("JSON non valido.");
    } finally {
      event.target.value = "";
    }
  }

  async function handleExportPng() {
    if (!svgRef.current) {
      return;
    }

    try {
      await downloadPng(svgRef.current, "chen-er-diagram.png");
      setStatus("PNG esportato.");
    } catch (error) {
      console.error(error);
      setStatusError("Export PNG non riuscito.");
    }
  }

  function handleExportSvg() {
    if (!svgRef.current) {
      return;
    }

    downloadSvg(svgRef.current, "chen-er-diagram.svg");
    setStatus("SVG esportato.");
  }

  return (
    <div className="app-shell">
      <AppHeader
        diagramName={history.present.meta.name}
        mode={mode}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onModeChange={handleModeChange}
        onNew={handleNewDiagram}
        onUndo={history.undo}
        onRedo={history.redo}
        onSave={handleSaveJson}
        onLoad={handleLoadRequest}
        onExportPng={handleExportPng}
        onExportSvg={handleExportSvg}
        onExample={handleLoadExample}
        onHelp={() => setHelpOpen(true)}
      />

      <div className="workspace-shell">
        <Toolbar activeTool={tool} mode={mode} onToolChange={setTool} />

        <DiagramCanvas
          diagram={history.present}
          selection={selection}
          tool={tool}
          mode={mode}
          viewport={viewport}
          statusMessage={statusMessage}
          svgRef={svgRef}
          onViewportChange={setViewport}
          onSelectionChange={setSelection}
          onPreviewDiagram={history.setPresent}
          onCommitDiagram={commitDiagram}
          onCreateNode={handleCreateNode}
          onCreateEdge={handleCreateEdge}
          onRenameNode={handleRenameNode}
          onRenameEdge={handleRenameEdge}
          onStatusMessageChange={handleCanvasStatusMessage}
        />

        <InspectorPanel
          diagram={history.present}
          selection={selection}
          mode={mode}
          issues={issues}
          onNodeChange={handleNodeChange}
          onEdgeChange={handleEdgeChange}
          onDeleteSelection={handleDeleteSelection}
          onDuplicateSelection={handleDuplicateSelection}
          onAlign={handleAlignSelection}
        />
      </div>

      <input
        ref={fileInputRef}
        className="hidden-input"
        type="file"
        accept="application/json,.json"
        onChange={handleLoadFile}
      />

      {helpOpen ? (
        <div className="help-modal-backdrop" role="presentation" onClick={() => setHelpOpen(false)}>
          <div
            className="help-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="help-modal-head">
              <h2 id="help-modal-title">Guida rapida</h2>
              <button type="button" className="help-close" onClick={() => setHelpOpen(false)}>
                Chiudi
              </button>
            </div>

            <ul className="help-list">
              <li>Doppio click per rinominare.</li>
              <li>Rotella per zoom.</li>
              <li>Usa Sposta per trascinare la vista.</li>
              <li>Trascina con il tasto centrale per pan.</li>
            </ul>
          </div>
        </div>
      ) : null}

      <div className="toast-stack" aria-live="assertive" aria-atomic="false">
        {errorToasts.map((toast) => (
          <div key={toast.id} className="toast toast-error" role="alert">
            <strong>Errore</strong>
            <p>{toast.message}</p>
            <button type="button" onClick={() => dismissToast(toast.id)} aria-label="Chiudi notifica errore">
              Chiudi
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
