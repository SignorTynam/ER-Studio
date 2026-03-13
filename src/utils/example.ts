import type { DiagramDocument } from "../types/diagram";

export function createExampleDiagram(): DiagramDocument {
  return {
    meta: {
      name: "Esempio Base",
      version: 1,
    },
    nodes: [
      { id: "student", type: "entity", label: "STUDENTE", x: 180, y: 230, width: 160, height: 64 },
      { id: "course", type: "entity", label: "CORSO", x: 620, y: 230, width: 140, height: 64 },
      {
        id: "attends",
        type: "relationship",
        label: "FREQUENTA",
        x: 430,
        y: 120,
        width: 130,
        height: 78,
      },
    ],
    edges: [
      {
        id: "e1",
        type: "connector",
        sourceId: "attends",
        targetId: "student",
        label: "",
        lineStyle: "solid",
        cardinality: "(0,N)",
      },
      {
        id: "e2",
        type: "connector",
        sourceId: "attends",
        targetId: "course",
        label: "",
        lineStyle: "solid",
        cardinality: "(1,N)",
      },
    ],
  };
}
