import type { LogicalModel, LogicalTable } from "../types/logical";

export const LOGICAL_TABLE_MIN_WIDTH = 220;
export const LOGICAL_TABLE_MAX_WIDTH = 480;
export const LOGICAL_TABLE_HEADER_HEIGHT = 42;
export const LOGICAL_TABLE_ROW_HEIGHT = 30;
export const LOGICAL_TABLE_HORIZONTAL_PADDING = 16;

interface AutoLayoutOptions {
  direction?: "left-right" | "top-bottom";
  marginX?: number;
  marginY?: number;
  gapX?: number;
  gapY?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function estimateTextWidth(value: string): number {
  return value.trim().length * 8.3;
}

function estimateColumnVisualWidth(table: LogicalTable): number {
  if (table.columns.length === 0) {
    return LOGICAL_TABLE_MIN_WIDTH;
  }

  const badgeWidth = 52;
  const referenceHintWidth = 36;

  const rowWidths = table.columns.map((column) => {
    const badgeCount =
      (column.isPrimaryKey ? 1 : 0) + (column.isForeignKey ? 1 : 0) + (column.isUnique === true ? 1 : 0);
    return estimateTextWidth(column.name) + badgeCount * badgeWidth + (column.isForeignKey ? referenceHintWidth : 0);
  });

  const longestRowWidth = Math.max(...rowWidths);
  return clamp(
    Math.ceil(longestRowWidth + LOGICAL_TABLE_HORIZONTAL_PADDING * 2),
    LOGICAL_TABLE_MIN_WIDTH,
    LOGICAL_TABLE_MAX_WIDTH,
  );
}

function estimateTableWidth(table: LogicalTable): number {
  const titleWidth = estimateTextWidth(table.name) + LOGICAL_TABLE_HORIZONTAL_PADDING * 2;
  const rowWidth = estimateColumnVisualWidth(table);
  return clamp(Math.ceil(Math.max(titleWidth, rowWidth)), LOGICAL_TABLE_MIN_WIDTH, LOGICAL_TABLE_MAX_WIDTH);
}

function estimateTableHeight(table: LogicalTable): number {
  const rows = Math.max(table.columns.length, 1);
  return LOGICAL_TABLE_HEADER_HEIGHT + rows * LOGICAL_TABLE_ROW_HEIGHT;
}

function sortTableIdsByName(ids: string[], tableById: Map<string, LogicalTable>): string[] {
  return [...ids].sort((leftId, rightId) => {
    const left = tableById.get(leftId);
    const right = tableById.get(rightId);

    if (!left || !right) {
      return leftId.localeCompare(rightId);
    }

    const nameDelta = left.name.localeCompare(right.name, "it", { sensitivity: "base" });
    if (nameDelta !== 0) {
      return nameDelta;
    }

    return left.id.localeCompare(right.id);
  });
}

export function normalizeLogicalModelGeometry(model: LogicalModel): LogicalModel {
  return {
    ...model,
    tables: model.tables.map((table) => ({
      ...table,
      width: estimateTableWidth(table),
      height: estimateTableHeight(table),
    })),
  };
}

function buildLayering(model: LogicalModel): string[][] {
  const tableIds = model.tables.map((table) => table.id);
  const tableById = new Map(model.tables.map((table) => [table.id, table]));

  const outgoing = new Map<string, Set<string>>();
  const incoming = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();

  tableIds.forEach((tableId) => {
    outgoing.set(tableId, new Set<string>());
    incoming.set(tableId, new Set<string>());
    inDegree.set(tableId, 0);
  });

  model.edges.forEach((edge) => {
    const parentId = edge.toTableId;
    const childId = edge.fromTableId;

    if (!outgoing.has(parentId) || !incoming.has(childId)) {
      return;
    }

    const parentOutgoing = outgoing.get(parentId) as Set<string>;
    if (parentOutgoing.has(childId)) {
      return;
    }

    parentOutgoing.add(childId);
    (incoming.get(childId) as Set<string>).add(parentId);
    inDegree.set(childId, (inDegree.get(childId) ?? 0) + 1);
  });

  const queue = sortTableIdsByName(
    tableIds.filter((tableId) => (inDegree.get(tableId) ?? 0) === 0),
    tableById,
  );

  const layerById = new Map<string, number>();
  tableIds.forEach((tableId) => layerById.set(tableId, 0));

  while (queue.length > 0) {
    const tableId = queue.shift() as string;
    const layer = layerById.get(tableId) ?? 0;
    const children = sortTableIdsByName([...(outgoing.get(tableId) ?? [])], tableById);

    children.forEach((childId) => {
      const currentLayer = layerById.get(childId) ?? 0;
      if (layer + 1 > currentLayer) {
        layerById.set(childId, layer + 1);
      }

      const nextInDegree = (inDegree.get(childId) ?? 1) - 1;
      inDegree.set(childId, nextInDegree);

      if (nextInDegree === 0) {
        queue.push(childId);
        queue.sort((leftId, rightId) => {
          const left = tableById.get(leftId);
          const right = tableById.get(rightId);
          if (!left || !right) {
            return leftId.localeCompare(rightId);
          }

          const nameDelta = left.name.localeCompare(right.name, "it", { sensitivity: "base" });
          if (nameDelta !== 0) {
            return nameDelta;
          }

          return left.id.localeCompare(right.id);
        });
      }
    });
  }

  const unresolved = sortTableIdsByName(
    tableIds.filter((tableId) => (inDegree.get(tableId) ?? 0) > 0),
    tableById,
  );

  if (unresolved.length > 0) {
    const maxLayer = Math.max(...[...layerById.values(), 0]);
    unresolved.forEach((tableId, index) => {
      layerById.set(tableId, maxLayer + index + 1);
    });
  }

  const layers = new Map<number, string[]>();
  layerById.forEach((layer, tableId) => {
    const bucket = layers.get(layer) ?? [];
    bucket.push(tableId);
    layers.set(layer, bucket);
  });

  const sortedLayerIndexes = [...layers.keys()].sort((left, right) => left - right);
  const orderedLayers = sortedLayerIndexes.map((index) => sortTableIdsByName(layers.get(index) ?? [], tableById));

  const indexById = new Map<string, number>();
  orderedLayers.forEach((layer, layerIndex) => {
    if (layerIndex === 0) {
      layer.forEach((tableId, index) => indexById.set(tableId, index));
      return;
    }

    layer.sort((leftId, rightId) => {
      const leftIncoming = [...(incoming.get(leftId) ?? [])];
      const rightIncoming = [...(incoming.get(rightId) ?? [])];

      const leftScore =
        leftIncoming.length > 0
          ? leftIncoming.reduce((sum, parentId) => sum + (indexById.get(parentId) ?? 0), 0) / leftIncoming.length
          : Number.MAX_SAFE_INTEGER;
      const rightScore =
        rightIncoming.length > 0
          ? rightIncoming.reduce((sum, parentId) => sum + (indexById.get(parentId) ?? 0), 0) / rightIncoming.length
          : Number.MAX_SAFE_INTEGER;

      if (leftScore !== rightScore) {
        return leftScore - rightScore;
      }

      const left = tableById.get(leftId);
      const right = tableById.get(rightId);
      if (!left || !right) {
        return leftId.localeCompare(rightId);
      }

      const nameDelta = left.name.localeCompare(right.name, "it", { sensitivity: "base" });
      if (nameDelta !== 0) {
        return nameDelta;
      }

      return left.id.localeCompare(right.id);
    });

    layer.forEach((tableId, index) => indexById.set(tableId, index));
  });

  return orderedLayers;
}

export function autoLayoutLogicalModel(
  inputModel: LogicalModel,
  options: AutoLayoutOptions = {},
): LogicalModel {
  const model = normalizeLogicalModelGeometry(inputModel);
  const direction = options.direction ?? "left-right";
  const marginX = options.marginX ?? 120;
  const marginY = options.marginY ?? 120;
  const gapX = options.gapX ?? 150;
  const gapY = options.gapY ?? 90;

  if (model.tables.length === 0) {
    return model;
  }

  const layers = buildLayering(model);
  const tableById = new Map(model.tables.map((table) => [table.id, table]));

  const layerSizes = layers.map((layer) => {
    const widths = layer.map((tableId) => tableById.get(tableId)?.width ?? LOGICAL_TABLE_MIN_WIDTH);
    const heights = layer.map((tableId) => tableById.get(tableId)?.height ?? LOGICAL_TABLE_HEADER_HEIGHT);
    return {
      maxWidth: Math.max(...widths, LOGICAL_TABLE_MIN_WIDTH),
      totalHeight: heights.reduce((sum, value) => sum + value, 0) + Math.max(0, heights.length - 1) * gapY,
      maxHeight: Math.max(...heights, LOGICAL_TABLE_HEADER_HEIGHT),
      totalWidth: widths.reduce((sum, value) => sum + value, 0) + Math.max(0, widths.length - 1) * gapX,
    };
  });

  const maxLayerHeight = Math.max(...layerSizes.map((size) => size.totalHeight), LOGICAL_TABLE_HEADER_HEIGHT);
  const maxLayerWidth = Math.max(...layerSizes.map((size) => size.totalWidth), LOGICAL_TABLE_MIN_WIDTH);

  let cursorX = marginX;
  let cursorY = marginY;
  const positionById = new Map<string, { x: number; y: number }>();

  if (direction === "left-right") {
    layers.forEach((layer, layerIndex) => {
      const layerSize = layerSizes[layerIndex];
      let rowY = marginY + (maxLayerHeight - layerSize.totalHeight) / 2;

      layer.forEach((tableId) => {
        const table = tableById.get(tableId);
        if (!table) {
          return;
        }

        positionById.set(table.id, {
          x: cursorX,
          y: rowY,
        });

        rowY += table.height + gapY;
      });

      cursorX += layerSize.maxWidth + gapX;
    });
  } else {
    layers.forEach((layer, layerIndex) => {
      const layerSize = layerSizes[layerIndex];
      let rowX = marginX + (maxLayerWidth - layerSize.totalWidth) / 2;

      layer.forEach((tableId) => {
        const table = tableById.get(tableId);
        if (!table) {
          return;
        }

        positionById.set(table.id, {
          x: rowX,
          y: cursorY,
        });

        rowX += table.width + gapX;
      });

      cursorY += layerSize.maxHeight + gapY;
    });
  }

  return {
    ...model,
    tables: model.tables.map((table) => {
      const nextPosition = positionById.get(table.id);
      if (!nextPosition) {
        return table;
      }

      return {
        ...table,
        x: Math.round(nextPosition.x),
        y: Math.round(nextPosition.y),
      };
    }),
  };
}
