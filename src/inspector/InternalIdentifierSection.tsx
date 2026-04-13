import { useMemo, useState } from "react";
import type {
  AttributeNode,
  DiagramDocument,
  EntityNode,
  InternalIdentifier,
} from "../types/diagram";

interface InternalIdentifierSectionProps {
  entity: EntityNode;
  diagram: DiagramDocument;
  onEntityChange: (
    entityId: string,
    patch: Partial<EntityNode>,
    attributePatches: Record<string, Partial<AttributeNode>>,
  ) => void;
  readOnly?: boolean;
}

interface IdentifierModalProps {
  attributes: AttributeNode[];
  initialSelection?: string[];
  onCancel: () => void;
  onConfirm: (selectedIds: string[]) => void;
}

function createInternalIdentifierId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `internalIdentifier-${Math.random().toString(36).slice(2, 11)}`;
}

function getEntityAttributes(entity: EntityNode, diagram: DiagramDocument): AttributeNode[] {
  const nodeMap = new Map(diagram.nodes.map((node) => [node.id, node]));
  const ids = new Set<string>();

  diagram.edges.forEach((edge) => {
    if (edge.type !== "attribute") {
      return;
    }

    if (edge.sourceId === entity.id) {
      const candidate = nodeMap.get(edge.targetId);
      if (candidate?.type === "attribute") {
        ids.add(candidate.id);
      }
      return;
    }

    if (edge.targetId === entity.id) {
      const candidate = nodeMap.get(edge.sourceId);
      if (candidate?.type === "attribute") {
        ids.add(candidate.id);
      }
    }
  });

  return Array.from(ids)
    .map((attributeId) => nodeMap.get(attributeId))
    .filter((node): node is AttributeNode => node?.type === "attribute")
    .sort((left, right) => left.label.localeCompare(right.label, "it", { sensitivity: "base" }));
}

function filterEligibleAttributes(
  attrs: AttributeNode[],
  currentIdentifiers: InternalIdentifier[],
  excludedIdentifierIndex?: number,
): AttributeNode[] {
  const used = new Set<string>();

  currentIdentifiers.forEach((identifier, index) => {
    if (index === excludedIdentifierIndex) {
      return;
    }

    identifier.attributeIds.forEach((attributeId) => used.add(attributeId));
  });

  return attrs.filter((attribute) => {
    if (attribute.isMultivalued === true) {
      return false;
    }

    if (attribute.isIdentifier === true) {
      return false;
    }

    if (used.has(attribute.id)) {
      return false;
    }

    return true;
  });
}

function IdentifierModal({
  attributes,
  initialSelection = [],
  onCancel,
  onConfirm,
}: IdentifierModalProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelection));

  function toggle(attributeId: string) {
    const next = new Set(selected);
    if (next.has(attributeId)) {
      next.delete(attributeId);
    } else {
      next.add(attributeId);
    }
    setSelected(next);
  }

  return (
    <div className="help-modal-backdrop" role="dialog" aria-modal="true" aria-label="Identificatore interno">
      <div className="help-modal action-modal">
        <div className="help-modal-head">
          <h2>Crea o modifica identificatore interno</h2>
          <button type="button" className="help-close" onClick={onCancel}>
            Chiudi
          </button>
        </div>

        <div className="action-modal-content">
          <p>
            Seleziona uno o piu attributi. Un solo attributo crea un identificatore semplice, due o piu attributi
            creano un identificatore composto.
          </p>

          <div className="modal-attribute-list">
            {attributes.map((attribute) => (
              <label key={attribute.id} className="field checkbox-field">
                <span>{attribute.label}</span>
                <input
                  type="checkbox"
                  checked={selected.has(attribute.id)}
                  onChange={() => toggle(attribute.id)}
                />
              </label>
            ))}
            {attributes.length === 0 ? <p className="action-hint">Nessun attributo disponibile.</p> : null}
          </div>

          <div className="action-modal-actions">
            <button type="button" onClick={onCancel}>
              Annulla
            </button>
            <button
              type="button"
              onClick={() => onConfirm(Array.from(selected))}
              disabled={selected.size === 0}
            >
              Salva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function InternalIdentifierSection({
  entity,
  diagram,
  onEntityChange,
  readOnly,
}: InternalIdentifierSectionProps) {
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const attributes = useMemo(() => getEntityAttributes(entity, diagram), [diagram, entity]);
  const internalIdentifiers = entity.internalIdentifiers ?? [];
  const canAddIdentifier = useMemo(
    () => filterEligibleAttributes(attributes, internalIdentifiers).length > 0,
    [attributes, internalIdentifiers],
  );

  const selectedAttributeIds =
    modalIndex !== null && modalIndex < internalIdentifiers.length
      ? internalIdentifiers[modalIndex].attributeIds
      : [];

  const selectableAttributes = useMemo(() => {
    if (modalIndex === null) {
      return [] as AttributeNode[];
    }

    const editingIndex = modalIndex < internalIdentifiers.length ? modalIndex : undefined;
    const eligible = filterEligibleAttributes(attributes, internalIdentifiers, editingIndex);
    const byId = new Map(eligible.map((attribute) => [attribute.id, attribute]));

    selectedAttributeIds.forEach((attributeId) => {
      const selected = attributes.find((attribute) => attribute.id === attributeId);
      if (selected) {
        byId.set(selected.id, selected);
      }
    });

    return Array.from(byId.values()).sort((left, right) =>
      left.label.localeCompare(right.label, "it", { sensitivity: "base" }),
    );
  }, [attributes, internalIdentifiers, modalIndex, selectedAttributeIds]);

  function applyUpdate(nextIdentifiers: InternalIdentifier[]) {
    const attributePatches: Record<string, Partial<AttributeNode>> = {};
    const memberAttributeIds = new Set<string>();

    nextIdentifiers.forEach((identifier) => {
      identifier.attributeIds.forEach((attributeId) => memberAttributeIds.add(attributeId));
    });

    attributes.forEach((attribute) => {
      attributePatches[attribute.id] = {
        isCompositeInternal: memberAttributeIds.has(attribute.id),
      };
    });

    onEntityChange(
      entity.id,
      {
        internalIdentifiers: nextIdentifiers.length > 0 ? nextIdentifiers : undefined,
      },
      attributePatches,
    );
  }

  function handleAdd() {
    setModalIndex(internalIdentifiers.length);
  }

  function handleEdit(index: number) {
    setModalIndex(index);
  }

  function handleDelete(index: number) {
    const nextIdentifiers = [...internalIdentifiers];
    nextIdentifiers.splice(index, 1);
    applyUpdate(nextIdentifiers);
  }

  function handleSave(selectedIds: string[]) {
    if (modalIndex === null) {
      return;
    }

    const selectableIdSet = new Set(selectableAttributes.map((attribute) => attribute.id));
    const normalizedSelectedIds = selectedIds.filter((attributeId) => selectableIdSet.has(attributeId));
    if (normalizedSelectedIds.length === 0) {
      return;
    }

    const nextIdentifiers = [...internalIdentifiers];
    if (modalIndex >= internalIdentifiers.length) {
      nextIdentifiers.push({
        id: createInternalIdentifierId(),
        attributeIds: normalizedSelectedIds,
      });
    } else {
      nextIdentifiers[modalIndex] = {
        ...nextIdentifiers[modalIndex],
        attributeIds: normalizedSelectedIds,
      };
    }

    setModalIndex(null);
    applyUpdate(nextIdentifiers);
  }

  return (
    <section className="context-card">
      <div className="context-card-title">Identificatori interni</div>

      <div className="identifier-list">
        {internalIdentifiers.map((identifier, index) => {
          const labels = identifier.attributeIds
            .map((attributeId) => attributes.find((attribute) => attribute.id === attributeId)?.label ?? attributeId)
            .join(", ");
          const type = identifier.attributeIds.length === 1 ? "semplice" : "composto";

          return (
            <div key={identifier.id} className="identifier-row">
              <span className="identifier-attrs">{labels || "Identificatore senza attributi"}</span>
              <span className="identifier-type">{type}</span>
              {!readOnly ? (
                <span className="identifier-actions">
                  <button type="button" onClick={() => handleEdit(index)}>
                    Modifica
                  </button>
                  <button type="button" onClick={() => handleDelete(index)}>
                    Elimina
                  </button>
                </span>
              ) : null}
            </div>
          );
        })}

        {internalIdentifiers.length === 0 ? (
          <p className="action-hint">Nessun identificatore interno definito.</p>
        ) : null}
      </div>

      {!readOnly ? (
        <button
          type="button"
          className="identifier-add-button"
          onClick={handleAdd}
          disabled={!canAddIdentifier}
        >
          + Aggiungi identificatore
        </button>
      ) : null}

      {modalIndex !== null ? (
        <IdentifierModal
          attributes={selectableAttributes}
          initialSelection={selectedAttributeIds}
          onCancel={() => setModalIndex(null)}
          onConfirm={handleSave}
        />
      ) : null}
    </section>
  );
}
