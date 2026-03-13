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
import { APP_CHANGELOG, APP_NAME, APP_TITLE, APP_VERSION } from "./utils/appMeta";

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
  const attributeEdge = diagram.edges.find(
    (edge) =>
      edge.type === "attribute" && (edge.sourceId === attributeId || edge.targetId === attributeId),
  );
  if (!attributeEdge) {
    return undefined;
  }

  const hostId = attributeEdge.sourceId === attributeId ? attributeEdge.targetId : attributeEdge.sourceId;
  const hostNode = diagram.nodes.find((node) => node.id === hostId);
  return hostNode?.type === "entity" ? hostNode : undefined;
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

export default function App() {
  const history = useHistory<DiagramDocument>(createExampleDiagram());
  const [tool, setTool] = useState<ToolKind>("select");
  const [mode, setMode] = useState<EditorMode>("edit");
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT);
  const [selection, setSelection] = useState<SelectionState>({ nodeIds: [], edgeIds: [] });
  const [statusMessage, setStatusMessage] = useState("");
  const [errorToasts, setErrorToasts] = useState<ToastMessage[]>([]);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  const [introOpen, setIntroOpen] = useState(true);

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
  }, [aboutOpen, history, introOpen, selection, mode, whatsNewOpen]);

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
    setTool("select");
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

  function handleNodeChange(nodeId: string, patch: Partial<DiagramNode>) {
    const currentNode = history.present.nodes.find((node) => node.id === nodeId);
    const attributePatch = patch as Partial<Extract<DiagramNode, { type: "attribute" }>>;

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

    if (
      currentNode?.type === "attribute" &&
      attributePatch.isIdentifier === true &&
      currentNode.isCompositeInternal === true
    ) {
      setStatusError("Un attributo nel composto interno non puo essere anche identificatore singolo.");
      return;
    }

    const nextDiagram = updateNodeInDiagram(history.present, nodeId, patch);
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

        return !linkedToRelationship;
      });

      if (targetIds.length !== nodeIds.length) {
        setStatusError("Alcuni attributi sono collegati a un'associazione e non possono essere identificatori.");
      }
    }

    if (targetIds.length === 0) {
      return;
    }

    const nextDiagram = updateNodesInDiagram(history.present, targetIds, patch);
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
      setStatusError("Nessun identificatore esterno da rimuovere sulla relazione selezionata.");
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
        appTitle={APP_TITLE}
        appVersion={APP_VERSION}
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
        onAbout={() => {
          setWhatsNewOpen(false);
          setAboutOpen(true);
        }}
        onWhatsNew={() => {
          setAboutOpen(false);
          setWhatsNewOpen(true);
        }}
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
          onCreateExternalIdentifier={handleCreateExternalIdentifierFromSelection}
          onDeleteNode={handleDeleteNodeById}
          onDeleteEdge={handleDeleteEdgeById}
          onDeleteExternalIdentifier={handleClearExternalIdentifier}
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
          onNodesChange={handleNodesChange}
          onEdgeChange={handleEdgeChange}
          onClearExternalIdentifier={handleClearExternalIdentifier}
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
                  Apri About
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
              <h2 id="about-modal-title">About</h2>
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
                <summary>Strumenti e Shortcut</summary>
                <ul className="help-list">
                  <li>Selezione rapida strumenti: S Sposta, V Selezione, E Entita, R Relazione, A Attributo, C Collegamento, G Generalizzazione, T Testo.</li>
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
                  <li>Con Selezione puoi trascinare la cardinalita di un collegamento per spostare la linea.</li>
                  <li>I pulsanti di allineamento funzionano con almeno due nodi selezionati.</li>
                </ul>
              </details>

              <details className="help-section">
                <summary>Navigazione Canvas</summary>
                <ul className="help-list">
                  <li>Navigazione canvas: rotella per zoom, tool Sposta per pan, oppure trascina con tasto centrale.</li>
                </ul>
              </details>

              <details className="help-section">
                <summary>Comandi Tastiera</summary>
                <ul className="help-list">
                  <li>Ctrl/Cmd+S salva JSON, Ctrl/Cmd+D duplica selezione, Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z o Ctrl/Cmd+Y redo.</li>
                  <li>Delete/Backspace elimina la selezione; Esc annulla selezione corrente e chiude i modal About/New.</li>
                </ul>
              </details>

              <details className="help-section">
                <summary>Validazioni ed Errori</summary>
                <ul className="help-list">
                  <li>I messaggi di errore appaiono come toast in alto a destra.</li>
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
              <h2 id="new-modal-title">New</h2>
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
