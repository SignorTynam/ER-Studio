import { createContext, useContext } from "react";

/**
 * Fase J2.b — stato del drag & drop dell'Explorer, condiviso via context così da non doverlo
 * far scendere come prop attraverso ogni livello ricorsivo di `ProjectExplorerTreeItem`.
 *
 * Il modello è "reparenting" (l'albero è sempre ordinato, come in VS Code): trascinare sposta un
 * nodo dentro una cartella. `dropTargetFolderId` è la cartella evidenziata come destinazione
 * (per un file sotto il cursore è la sua cartella genitore); `null` = nessuna destinazione valida.
 */
export interface ProjectExplorerDnd {
  draggingNodeId: string | null;
  dropTargetFolderId: string | null;
  begin: (nodeId: string) => void;
  end: () => void;
  /** Aggiorna l'evidenziazione in base al nodo sotto il cursore; restituisce l'effetto del cursore. */
  hoverNode: (hoveredNodeId: string) => "move" | "none";
  dropOnNode: (hoveredNodeId: string) => void;
}

const ProjectExplorerDndContext = createContext<ProjectExplorerDnd | null>(null);

export const ProjectExplorerDndProvider = ProjectExplorerDndContext.Provider;

export function useProjectExplorerDnd(): ProjectExplorerDnd | null {
  return useContext(ProjectExplorerDndContext);
}
