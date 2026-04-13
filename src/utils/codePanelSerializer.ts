import type { DiagramDocument } from "../types/diagram";
import { serializeDiagramToErs } from "./ers";

export function serializeDiagramForCodePanel(diagram: DiagramDocument): string {
  if (diagram.nodes.length === 0 && diagram.edges.length === 0) {
    return "";
  }

  return serializeDiagramToErs(diagram);
}
