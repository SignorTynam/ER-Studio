import type {
  DiagramDocument,
  DiagramEdge,
  DiagramNode,
  EdgeKind,
  IsaCompleteness,
  IsaDisjointness,
  LineStyle,
  NodeKind,
} from "../types/diagram";
import { CONNECTOR_CARDINALITY_PLACEHOLDER, isSupportedCardinality } from "./cardinality";
import { canConnect, getMultivaluedAttributeSize, validateDiagram } from "./diagram";
import { GRID_SIZE, snapValue } from "./geometry";

const DEFAULT_NODE_SIZES: Record<NodeKind, { width: number; height: number }> = {
  entity: { width: 140, height: 64 },
  relationship: { width: 130, height: 78 },
  attribute: { width: 150, height: 28 },
  text: { width: 140, height: 24 },
};

const NODE_ORDER: NodeKind[] = ["entity", "relationship", "attribute", "text"];
const EDGE_ORDER: EdgeKind[] = ["connector", "attribute", "inheritance"];
const LEGACY_NODE_DIRECTIVES = new Set([
  "label",
  "at",
  "size",
  "identifier",
  "compositeInternal",
  "external",
  "sourceAttribute",
  "targetEntity",
  "targetAttribute",
  "offset",
  "markerOffset",
]);

interface RelationshipExternalSpec {
  mode: "entity" | "composite";
  sourceAttributeAlias?: string;
  targetEntityAlias?: string;
  targetAttributeAlias?: string;
  offset?: number;
  markerOffsetX?: number;
  markerOffsetY?: number;
}

interface ParsedNodeSpec {
  line: number;
  alias: string;
  node: DiagramNode;
  externalSpec?: RelationshipExternalSpec;
}

interface ParsedEdgeSpec {
  line: number;
  type: EdgeKind;
  sourceAlias: string;
  targetAlias: string;
  label: string;
  lineStyle: LineStyle;
  manualOffset?: number;
  cardinality?: string;
  isaDisjointness?: IsaDisjointness;
  isaCompleteness?: IsaCompleteness;
}

interface StructuredExpansion {
  source: string;
  lineMap: number[];
}

interface StructuredAttributeSpec {
  alias: string;
  label: string;
  isIdentifier: boolean;
  isCompositeInternal: boolean;
  isMultivalued: boolean;
  line: number;
}

interface StructuredAttributeFlags {
  isIdentifier: boolean;
  isCompositeInternal: boolean;
  isMultivalued: boolean;
}

interface StructuredConnectionSpec {
  entityAlias: string;
  cardinality?: string;
  line: number;
}

class ErsParseError extends Error {
  readonly line: number;
  readonly detail: string;

  constructor(line: number, message: string) {
    super(`ERS linea ${line}: ${message}`);
    this.line = line;
    this.detail = message;
    this.name = "ErsParseError";
  }
}

function humanizeAlias(alias: string): string {
  return alias
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return Number.parseFloat(value.toFixed(2)).toString();
}

function quoteValue(value: string): string {
  return JSON.stringify(value);
}

function isGeneratedNodeId(value: string): boolean {
  return /^(entity|relationship|attribute|text|connector|inheritance)-/i.test(value);
}

function normalizeAliasCandidate(value: string, allowDot: boolean): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(allowDot ? /[^a-zA-Z0-9_.-]+/g : /[^a-zA-Z0-9_-]+/g, "_")
    .replace(allowDot ? /^[._-]+|[._-]+$/g : /^[_-]+|[_-]+$/g, "");

  if (normalized.length > 0 && !/^\d/.test(normalized)) {
    return normalized;
  }

  return "";
}

function buildAliasSeed(node: DiagramNode): string {
  if (!isGeneratedNodeId(node.id)) {
    const normalizedId = normalizeAliasCandidate(node.id, true);
    if (normalizedId.length > 0) {
      return normalizedId;
    }
  }

  const normalizedLabel = normalizeAliasCandidate(node.label.toLowerCase(), true);
  if (normalizedLabel.length > 0) {
    return normalizedLabel;
  }

  return `${node.type}_node`;
}

function buildLocalAttributeAliasSeed(node: DiagramNode, hostAlias: string): string {
  if (!isGeneratedNodeId(node.id)) {
    const qualifiedPrefix = `${hostAlias}.`;
    if (node.id.startsWith(qualifiedPrefix)) {
      const scopedId = normalizeAliasCandidate(node.id.slice(qualifiedPrefix.length), false);
      if (scopedId.length > 0) {
        return scopedId;
      }
    }

    const tail = node.id.includes(".") ? node.id.slice(node.id.lastIndexOf(".") + 1) : node.id;
    const normalizedTail = normalizeAliasCandidate(tail, false);
    if (normalizedTail.length > 0) {
      return normalizedTail;
    }
  }

  const normalizedLabel = normalizeAliasCandidate(node.label.toLowerCase(), false);
  if (normalizedLabel.length > 0) {
    return normalizedLabel;
  }

  return "attribute";
}

function buildAttributeHostMap(diagram: DiagramDocument): Map<string, string> {
  const hostByAttributeId = new Map<string, string>();

  diagram.edges.forEach((edge) => {
    if (edge.type !== "attribute") {
      return;
    }

    const sourceNode = diagram.nodes.find((node) => node.id === edge.sourceId);
    const targetNode = diagram.nodes.find((node) => node.id === edge.targetId);

    if (
      sourceNode?.type === "attribute" &&
      (targetNode?.type === "entity" || targetNode?.type === "relationship" || targetNode?.type === "attribute")
    ) {
      hostByAttributeId.set(sourceNode.id, targetNode.id);
      return;
    }

    if (
      targetNode?.type === "attribute" &&
      (sourceNode?.type === "entity" || sourceNode?.type === "relationship")
    ) {
      hostByAttributeId.set(targetNode.id, sourceNode.id);
    }
  });

  return hostByAttributeId;
}

function assignNodeAliases(diagram: DiagramDocument): Map<string, string> {
  const hostByAttributeId = buildAttributeHostMap(diagram);
  const aliasByNodeId = new Map<string, string>();
  const usedTopLevelAliases = new Set<string>();

  const topLevelNodes = diagram.nodes.filter(
    (node) => node.type !== "attribute" || !hostByAttributeId.has(node.id),
  );

  [...topLevelNodes]
    .sort(compareNodes)
    .forEach((node) => {
      const baseAlias = buildAliasSeed(node);
      let alias = baseAlias;
      let suffix = 2;

      while (usedTopLevelAliases.has(alias)) {
        alias = `${baseAlias}_${suffix}`;
        suffix += 1;
      }

      usedTopLevelAliases.add(alias);
      aliasByNodeId.set(node.id, alias);
    });

  const localAliasesByHost = new Map<string, Set<string>>();

  [...diagram.nodes]
    .filter((node): node is Extract<DiagramNode, { type: "attribute" }> => node.type === "attribute")
    .sort(compareNodes)
    .forEach((node) => {
      const hostId = hostByAttributeId.get(node.id);
      if (!hostId) {
        return;
      }

      const hostAlias = aliasByNodeId.get(hostId) ?? hostId;
      const usedLocalAliases = localAliasesByHost.get(hostId) ?? new Set<string>();
      const baseLocalAlias = buildLocalAttributeAliasSeed(node, hostAlias);
      let localAlias = baseLocalAlias;
      let suffix = 2;

      while (usedLocalAliases.has(localAlias)) {
        localAlias = `${baseLocalAlias}_${suffix}`;
        suffix += 1;
      }

      usedLocalAliases.add(localAlias);
      localAliasesByHost.set(hostId, usedLocalAliases);
      aliasByNodeId.set(node.id, `${hostAlias}.${localAlias}`);
    });

  return aliasByNodeId;
}

function compareNodes(left: DiagramNode, right: DiagramNode): number {
  const kindDelta = NODE_ORDER.indexOf(left.type) - NODE_ORDER.indexOf(right.type);
  if (kindDelta !== 0) {
    return kindDelta;
  }

  const labelDelta = left.label.localeCompare(right.label, "it", { sensitivity: "base" });
  if (labelDelta !== 0) {
    return labelDelta;
  }

  return left.id.localeCompare(right.id);
}

function compareEdges(left: DiagramEdge, right: DiagramEdge, aliasByNodeId: Map<string, string>): number {
  const kindDelta = EDGE_ORDER.indexOf(left.type) - EDGE_ORDER.indexOf(right.type);
  if (kindDelta !== 0) {
    return kindDelta;
  }

  const leftKey = `${aliasByNodeId.get(left.sourceId) ?? left.sourceId}:${aliasByNodeId.get(left.targetId) ?? left.targetId}`;
  const rightKey = `${aliasByNodeId.get(right.sourceId) ?? right.sourceId}:${aliasByNodeId.get(right.targetId) ?? right.targetId}`;
  const edgeDelta = leftKey.localeCompare(rightKey, "it", { sensitivity: "base" });
  if (edgeDelta !== 0) {
    return edgeDelta;
  }

  return left.id.localeCompare(right.id);
}

function normalizeCommentFreeLine(line: string): string {
  let inString = false;
  let escaped = false;

  for (let index = 0; index < line.length; index += 1) {
    const current = line[index];
    const next = line[index + 1];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (current === "\\") {
      escaped = true;
      continue;
    }

    if (current === "\"") {
      inString = !inString;
      continue;
    }

    if (!inString && current === "#") {
      return line.slice(0, index).trim();
    }

    if (!inString && current === "/" && next === "/") {
      return line.slice(0, index).trim();
    }
  }

  return line.trim();
}

function tokenizeLine(line: string): string[] {
  const tokens = line.match(/->|"(?:\\.|[^"\\])*"|[^\s]+/g);
  return tokens ?? [];
}

function tokenizeStructuredLine(line: string): string[] {
  const tokens = line.match(/\{|\}|->|"(?:\\.|[^"\\])*"|[^\s{}]+/g);
  return tokens ?? [];
}

function readToken(tokens: string[], state: { index: number }, line: number, message: string): string {
  const token = tokens[state.index];
  if (!token) {
    throw new ErsParseError(line, message);
  }

  state.index += 1;
  return token;
}

function readIdentifier(tokens: string[], state: { index: number }, line: number, message: string): string {
  const token = readToken(tokens, state, line, message);
  if (token === "->") {
    throw new ErsParseError(line, message);
  }

  return token;
}

function readStringValue(tokens: string[], state: { index: number }, line: number, message: string): string {
  const token = readToken(tokens, state, line, message);
  if (token.startsWith("\"")) {
    try {
      return JSON.parse(token) as string;
    } catch {
      throw new ErsParseError(line, "Stringa non valida.");
    }
  }

  return token;
}

function readNumberValue(tokens: string[], state: { index: number }, line: number, message: string): number {
  const token = readToken(tokens, state, line, message);
  const parsed = Number(token);

  if (!Number.isFinite(parsed)) {
    throw new ErsParseError(line, message);
  }

  return parsed;
}

function readEnumValue<T extends string>(
  tokens: string[],
  state: { index: number },
  line: number,
  allowedValues: readonly T[],
  label: string,
): T {
  const value = readIdentifier(tokens, state, line, `${label} mancante.`);
  if (!allowedValues.includes(value as T)) {
    throw new ErsParseError(line, `${label} non valido: "${value}".`);
  }

  return value as T;
}

function isQuotedToken(token: string | undefined): boolean {
  return typeof token === "string" && token.startsWith("\"");
}

function getDefaultLabelForAlias(alias: string): string {
  return humanizeAlias(alias);
}

function createNodeBase(alias: string, type: NodeKind): DiagramNode {
  const size = DEFAULT_NODE_SIZES[type];
  const base = {
    id: alias,
    type,
    label: getDefaultLabelForAlias(alias),
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
  };

  if (type === "attribute") {
    return {
      ...base,
      type,
      isIdentifier: false,
      isCompositeInternal: false,
      isMultivalued: false,
    };
  }

  if (type === "entity") {
    return {
      ...base,
      type,
      isWeak: false,
    };
  }

  return base as DiagramNode;
}

function assertUnqualifiedAlias(alias: string, line: number, label: string): void {
  if (alias.includes(".")) {
    throw new ErsParseError(line, `${label} non puo contenere ".".`);
  }
}

function readStructuredLabel(tokens: string[], state: { index: number }, alias: string, line: number): string {
  const nextToken = tokens[state.index];

  if (nextToken === "label") {
    state.index += 1;
    return readStringValue(tokens, state, line, "Label mancante.");
  }

  if (isQuotedToken(nextToken)) {
    return readStringValue(tokens, state, line, "Label mancante.");
  }

  return getDefaultLabelForAlias(alias);
}

function qualifyAttributeAlias(hostAlias: string, localAlias: string): string {
  return `${hostAlias}.${localAlias}`;
}

function consumeBracketDirectives(tokens: string[], state: { index: number }, line: number): string[] {
  const firstToken = tokens[state.index];
  if (!firstToken || !firstToken.startsWith("[")) {
    return [];
  }

  const rawTokens: string[] = [];
  while (state.index < tokens.length) {
    const token = tokens[state.index];
    rawTokens.push(token);
    state.index += 1;
    if (token.includes("]")) {
      break;
    }
  }

  const rawGroup = rawTokens.join(" ");
  const openIndex = rawGroup.indexOf("[");
  const closeIndex = rawGroup.lastIndexOf("]");
  if (openIndex < 0 || closeIndex < openIndex) {
    throw new ErsParseError(line, "Sintassi args non valida: manca ] nel blocco attributo.");
  }

  if (rawGroup.slice(closeIndex + 1).trim().length > 0) {
    throw new ErsParseError(line, "Sintassi args non valida dopo ].");
  }

  const content = rawGroup.slice(openIndex + 1, closeIndex).trim();
  if (!content) {
    return [];
  }

  return content
    .split(/[,\s]+/g)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function applyAttributeDirective(flags: StructuredAttributeFlags, directive: string, line: number): void {
  const normalized = directive.trim().toLowerCase();
  switch (normalized) {
    case "identifier":
    case "id":
      flags.isIdentifier = true;
      return;
    case "composite":
    case "compositeinternal":
      flags.isCompositeInternal = true;
      return;
    case "multivalued":
    case "multi":
      flags.isMultivalued = true;
      return;
    default:
      throw new ErsParseError(line, `Direttiva attributo non riconosciuta: "${directive}".`);
  }
}

function validateStructuredAttributeFlags(flags: StructuredAttributeFlags, line: number): void {
  if (flags.isIdentifier && flags.isCompositeInternal) {
    throw new ErsParseError(line, "Un attributo non puo essere sia identifier sia composite.");
  }

  if (flags.isMultivalued && (flags.isIdentifier || flags.isCompositeInternal)) {
    throw new ErsParseError(line, "Un attributo multivalued non puo essere anche identifier o composite.");
  }
}

function parseStructuredAttributeDeclaration(
  tokens: string[],
  line: number,
  options?: { allowQualifiedAlias?: boolean },
): StructuredAttributeSpec {
  const keyword = tokens[0];
  if (!["attribute", "identifier", "composite", "multivalued"].includes(keyword)) {
    throw new ErsParseError(line, `Istruzione non valida nel blocco: "${keyword}".`);
  }

  const state = { index: 1 };
  const alias = readIdentifier(tokens, state, line, "Nome attributo mancante.");
  if (!options?.allowQualifiedAlias) {
    assertUnqualifiedAlias(alias, line, "Il nome attributo");
  }
  const label = readStructuredLabel(tokens, state, alias, line);
  const flags: StructuredAttributeFlags = {
    isIdentifier: keyword === "identifier",
    isCompositeInternal: keyword === "composite",
    isMultivalued: keyword === "multivalued",
  };

  while (state.index < tokens.length) {
    if (tokens[state.index]?.startsWith("[")) {
      const directives = consumeBracketDirectives(tokens, state, line);
      directives.forEach((directive) => applyAttributeDirective(flags, directive, line));
      continue;
    }

    const directive = readIdentifier(tokens, state, line, "Direttiva attributo non valida.");
    applyAttributeDirective(flags, directive, line);
  }

  validateStructuredAttributeFlags(flags, line);
  return {
    alias,
    label,
    isIdentifier: flags.isIdentifier,
    isCompositeInternal: flags.isCompositeInternal,
    isMultivalued: flags.isMultivalued,
    line,
  };
}

function parseStructuredConnections(
  tokens: string[],
  state: { index: number },
  line: number,
): StructuredConnectionSpec[] {
  const connections: StructuredConnectionSpec[] = [];

  while (state.index < tokens.length && tokens[state.index] !== "{") {
    const entityAlias = readIdentifier(tokens, state, line, "Entita della relazione mancante.");
    assertUnqualifiedAlias(entityAlias, line, "Il nome entita");

    let cardinality: string | undefined;
    if (state.index < tokens.length && tokens[state.index] !== "{") {
      if (tokens[state.index] === "card") {
        state.index += 1;
      }

      if (state.index < tokens.length && tokens[state.index] !== "{") {
        cardinality = readStringValue(tokens, state, line, "Cardinalita relazione non valida.");
      }
    }

    connections.push({
      entityAlias,
      cardinality: cardinality ?? CONNECTOR_CARDINALITY_PLACEHOLDER,
      line,
    });
  }

  return connections;
}

function readStructuredAttributeReference(tokens: string[], state: { index: number }, line: number, label: string): string {
  const reference = readIdentifier(tokens, state, line, `${label} mancante.`);
  if (!reference.includes(".")) {
    throw new ErsParseError(line, `${label} deve usare la forma entita.attributo.`);
  }
  return reference;
}

function parseStructuredExternal(tokens: string[], line: number): RelationshipExternalSpec {
  const state = { index: 1 };
  const external: RelationshipExternalSpec = {
    mode: readEnumValue(tokens, state, line, ["entity", "composite"], "Modalita external"),
  };

  while (state.index < tokens.length) {
    const directive = readIdentifier(tokens, state, line, "Direttiva external non valida.");

    switch (directive) {
      case "from":
      case "sourceAttribute":
        external.sourceAttributeAlias = readStructuredAttributeReference(
          tokens,
          state,
          line,
          "Attributo sorgente external",
        );
        break;
      case "to":
      case "targetEntity":
        external.targetEntityAlias = readIdentifier(tokens, state, line, "Entita target external mancante.");
        assertUnqualifiedAlias(external.targetEntityAlias, line, "Il nome entita");
        break;
      case "target":
      case "targetAttribute":
        external.targetAttributeAlias = readStructuredAttributeReference(
          tokens,
          state,
          line,
          "Attributo target external",
        );
        break;
      case "offset":
        external.offset = readNumberValue(tokens, state, line, "Offset external non valido.");
        break;
      case "markerOffset":
        external.markerOffsetX = readNumberValue(tokens, state, line, "Marker offset X non valido.");
        external.markerOffsetY = readNumberValue(tokens, state, line, "Marker offset Y non valido.");
        break;
      default:
        throw new ErsParseError(line, `Direttiva external non riconosciuta: "${directive}".`);
    }
  }

  if (!external.sourceAttributeAlias || !external.targetEntityAlias) {
    throw new ErsParseError(line, "Una relazione external richiede almeno from/sourceAttribute e to/targetEntity.");
  }

  if (external.mode === "composite" && !external.targetAttributeAlias) {
    throw new ErsParseError(line, "La modalita external composite richiede target/targetAttribute.");
  }

  return external;
}

function emitLegacyAttributeLines(hostAlias: string, attribute: StructuredAttributeSpec): string[] {
  const qualifiedAlias = qualifyAttributeAlias(hostAlias, attribute.alias);
  const parts = ["attribute", qualifiedAlias, "label", quoteValue(attribute.label)];

  if (attribute.isIdentifier) {
    parts.push("identifier");
  }

  if (attribute.isCompositeInternal) {
    parts.push("compositeInternal");
  }

  if (attribute.isMultivalued) {
    parts.push("multivalued");
  }

  return [parts.join(" "), `attribute-link ${qualifiedAlias} -> ${hostAlias}`];
}

function buildLegacyRelationshipLine(alias: string, label: string, externalSpec?: RelationshipExternalSpec): string {
  const parts = ["relationship", alias, "label", quoteValue(label)];

  if (externalSpec) {
    parts.push("external", externalSpec.mode);

    if (externalSpec.sourceAttributeAlias) {
      parts.push("sourceAttribute", externalSpec.sourceAttributeAlias);
    }
    if (externalSpec.targetEntityAlias) {
      parts.push("targetEntity", externalSpec.targetEntityAlias);
    }
    if (externalSpec.targetAttributeAlias) {
      parts.push("targetAttribute", externalSpec.targetAttributeAlias);
    }
    if (typeof externalSpec.offset === "number" && externalSpec.offset !== 0) {
      parts.push("offset", formatNumber(externalSpec.offset));
    }
    if (
      typeof externalSpec.markerOffsetX === "number" ||
      typeof externalSpec.markerOffsetY === "number"
    ) {
      parts.push(
        "markerOffset",
        formatNumber(externalSpec.markerOffsetX ?? 0),
        formatNumber(externalSpec.markerOffsetY ?? 0),
      );
    }
  }

  return parts.join(" ");
}

function collectStructuredBlockLines(
  rawLines: string[],
  startIndex: number,
  headerLine: number,
  closesInline: boolean,
): { nextIndex: number; body: Array<{ line: number; tokens: string[] }> } {
  if (closesInline) {
    return { nextIndex: startIndex, body: [] };
  }

  const body: Array<{ line: number; tokens: string[] }> = [];

  for (let index = startIndex + 1; index < rawLines.length; index += 1) {
    const line = index + 1;
    const normalized = normalizeCommentFreeLine(rawLines[index]);

    if (normalized.length === 0) {
      continue;
    }

    const tokens = tokenizeStructuredLine(normalized);
    if (tokens.length === 1 && tokens[0] === "}") {
      return { nextIndex: index, body };
    }
    if (tokens.includes("}")) {
      throw new ErsParseError(line, "La parentesi di chiusura deve stare da sola sulla riga.");
    }

    body.push({ line, tokens });
  }

  throw new ErsParseError(headerLine, "Blocco non chiuso.");
}

function looksLikeStructuredEntity(tokens: string[]): boolean {
  if (tokens[0] !== "entity") {
    return false;
  }

  return tokens[2] !== "label" && !tokens.slice(2).some((token) => LEGACY_NODE_DIRECTIVES.has(token));
}

function looksLikeStructuredTopLevelNode(tokens: string[]): boolean {
  if (!["attribute", "identifier", "composite", "multivalued", "text"].includes(tokens[0])) {
    return false;
  }

  return tokens[2] !== "label" && !tokens.slice(2).some((token) => LEGACY_NODE_DIRECTIVES.has(token));
}

function expandStructuredEntity(
  rawLines: string[],
  startIndex: number,
): { nextIndex: number; emitted: Array<{ line: number; text: string }> } {
  const line = startIndex + 1;
  const tokens = tokenizeStructuredLine(normalizeCommentFreeLine(rawLines[startIndex]));
  const state = { index: 1 };
  const alias = readIdentifier(tokens, state, line, "Nome entita mancante.");
  assertUnqualifiedAlias(alias, line, "Il nome entita");
  const label = readStructuredLabel(tokens, state, alias, line);
  let isWeak = false;

  let hasBlock = false;
  let closesInline = false;

  while (state.index < tokens.length) {
    const token = tokens[state.index];
    if (token === "weak") {
      isWeak = true;
      state.index += 1;
      continue;
    }
    if (token === "{") {
      hasBlock = true;
      state.index += 1;
      continue;
    }
    if (token === "}") {
      if (!hasBlock) {
        throw new ErsParseError(line, "Parentesi di chiusura inattesa.");
      }
      closesInline = true;
      state.index += 1;
      continue;
    }

    throw new ErsParseError(line, `Sintassi entita non valida: "${token}".`);
  }

  const entityParts = ["entity", alias, "label", quoteValue(label)];
  if (isWeak) {
    entityParts.push("weak");
  }

  const emitted: Array<{ line: number; text: string }> = [{ line, text: entityParts.join(" ") }];

  if (!hasBlock) {
    return { nextIndex: startIndex, emitted };
  }

  const { nextIndex, body } = collectStructuredBlockLines(rawLines, startIndex, line, closesInline);
  body.forEach((entry) => {
    const attribute = parseStructuredAttributeDeclaration(entry.tokens, entry.line);
    emitLegacyAttributeLines(alias, attribute).forEach((text) => {
      emitted.push({ line: attribute.line, text });
    });
  });

  return { nextIndex, emitted };
}

function expandStructuredRelation(
  rawLines: string[],
  startIndex: number,
): { nextIndex: number; emitted: Array<{ line: number; text: string }> } {
  const line = startIndex + 1;
  const tokens = tokenizeStructuredLine(normalizeCommentFreeLine(rawLines[startIndex]));
  const state = { index: 1 };
  const alias = readIdentifier(tokens, state, line, "Nome relazione mancante.");
  assertUnqualifiedAlias(alias, line, "Il nome relazione");
  const label = readStructuredLabel(tokens, state, alias, line);
  const inlineConnections = parseStructuredConnections(tokens, state, line);

  let hasBlock = false;
  let closesInline = false;

  while (state.index < tokens.length) {
    const token = tokens[state.index];
    if (token === "{") {
      hasBlock = true;
      state.index += 1;
      continue;
    }
    if (token === "}") {
      if (!hasBlock) {
        throw new ErsParseError(line, "Parentesi di chiusura inattesa.");
      }
      closesInline = true;
      state.index += 1;
      continue;
    }

    throw new ErsParseError(line, `Sintassi relazione non valida: "${token}".`);
  }

  const allConnections = [...inlineConnections];
  const relationAttributes: StructuredAttributeSpec[] = [];
  let externalSpec: RelationshipExternalSpec | undefined;
  let nextIndex = startIndex;

  if (hasBlock) {
    const collected = collectStructuredBlockLines(rawLines, startIndex, line, closesInline);
    nextIndex = collected.nextIndex;

    collected.body.forEach((entry) => {
      const keyword = entry.tokens[0];

      if (keyword === "connect") {
        const localState = { index: 1 };
        const entityAlias = readIdentifier(entry.tokens, localState, entry.line, "Entita relation mancante.");
        assertUnqualifiedAlias(entityAlias, entry.line, "Il nome entita");

        let cardinality = CONNECTOR_CARDINALITY_PLACEHOLDER;
        if (localState.index < entry.tokens.length) {
          if (entry.tokens[localState.index] === "card") {
            localState.index += 1;
          }
          if (localState.index < entry.tokens.length) {
            cardinality = readStringValue(entry.tokens, localState, entry.line, "Cardinalita connect non valida.");
          }
        }
        if (localState.index < entry.tokens.length) {
          throw new ErsParseError(entry.line, "Sintassi connect non valida.");
        }

        allConnections.push({ entityAlias, cardinality, line: entry.line });
        return;
      }

      if (["attribute", "identifier", "composite", "multivalued"].includes(keyword)) {
        relationAttributes.push(parseStructuredAttributeDeclaration(entry.tokens, entry.line));
        return;
      }

      if (keyword === "external") {
        externalSpec = parseStructuredExternal(entry.tokens, entry.line);
        return;
      }

      throw new ErsParseError(entry.line, `Istruzione non valida nel blocco relation: "${keyword}".`);
    });
  }

  const emitted: Array<{ line: number; text: string }> = [
    { line, text: buildLegacyRelationshipLine(alias, label, externalSpec) },
  ];

  relationAttributes.forEach((attribute) => {
    emitLegacyAttributeLines(alias, attribute).forEach((text) => {
      emitted.push({ line: attribute.line, text });
    });
  });

  allConnections.forEach((connection) => {
    emitted.push({
      line: connection.line,
      text: `connector ${alias} -> ${connection.entityAlias} card ${quoteValue(
        connection.cardinality ?? CONNECTOR_CARDINALITY_PLACEHOLDER,
      )}`,
    });
  });

  return { nextIndex, emitted };
}

function expandStructuredTopLevelNode(tokens: string[], line: number): string {
  if (tokens[0] === "text") {
    const state = { index: 1 };
    const alias = readIdentifier(tokens, state, line, "Nome elemento mancante.");
    const label = readStructuredLabel(tokens, state, alias, line);
    if (state.index < tokens.length) {
      throw new ErsParseError(line, "Sintassi text non valida.");
    }

    return `text ${alias} label ${quoteValue(label)}`;
  }

  const attribute = parseStructuredAttributeDeclaration(tokens, line, { allowQualifiedAlias: true });
  const parts = ["attribute", attribute.alias, "label", quoteValue(attribute.label)];
  if (attribute.isIdentifier) {
    parts.push("identifier");
  }
  if (attribute.isCompositeInternal) {
    parts.push("compositeInternal");
  }
  if (attribute.isMultivalued) {
    parts.push("multivalued");
  }
  return parts.join(" ");
}

function expandStructuredErs(rawSource: string): StructuredExpansion {
  const rawLines = rawSource.split(/\r?\n/);
  const emittedLines: string[] = [];
  const lineMap: number[] = [];

  function pushLine(text: string, sourceLine: number) {
    emittedLines.push(text);
    lineMap.push(sourceLine);
  }

  for (let index = 0; index < rawLines.length; index += 1) {
    const line = index + 1;
    const normalized = normalizeCommentFreeLine(rawLines[index]);

    if (normalized.length === 0) {
      pushLine("", line);
      continue;
    }

    const tokens = tokenizeStructuredLine(normalized);
    if (tokens.length === 0) {
      pushLine("", line);
      continue;
    }

    const keyword = tokens[0];

    if (keyword === "entity" && looksLikeStructuredEntity(tokens)) {
      const expansion = expandStructuredEntity(rawLines, index);
      expansion.emitted.forEach((entry) => pushLine(entry.text, entry.line));
      index = expansion.nextIndex;
      continue;
    }

    if (keyword === "relation") {
      const expansion = expandStructuredRelation(rawLines, index);
      expansion.emitted.forEach((entry) => pushLine(entry.text, entry.line));
      index = expansion.nextIndex;
      continue;
    }

    if (looksLikeStructuredTopLevelNode(tokens)) {
      pushLine(expandStructuredTopLevelNode(tokens, line), line);
      continue;
    }

    pushLine(normalizeCommentFreeLine(rawLines[index]), line);
  }

  return {
    source: emittedLines.join("\n"),
    lineMap,
  };
}

function parseNodeStatement(
  nodeType: NodeKind,
  tokens: string[],
  line: number,
  initialAttributeFlags?: {
    isIdentifier?: boolean;
    isCompositeInternal?: boolean;
    isMultivalued?: boolean;
  },
): ParsedNodeSpec {
  const state = { index: 1 };
  const alias = readIdentifier(tokens, state, line, "Nome elemento mancante.");
  const node = createNodeBase(alias, nodeType);
  let externalSpec: RelationshipExternalSpec | undefined;

  if (node.type === "attribute" && initialAttributeFlags) {
    node.isIdentifier = initialAttributeFlags.isIdentifier === true;
    node.isCompositeInternal = initialAttributeFlags.isCompositeInternal === true;
    node.isMultivalued = initialAttributeFlags.isMultivalued === true;
  }

  while (state.index < tokens.length) {
    if (tokens[state.index]?.startsWith("[")) {
      if (node.type !== "attribute") {
        throw new ErsParseError(line, "La sintassi [args] e valida solo per gli attributi.");
      }

      const directives = consumeBracketDirectives(tokens, state, line);
      directives.forEach((directive) =>
        applyAttributeDirective(
          node as StructuredAttributeFlags,
          directive,
          line,
        ),
      );
      continue;
    }

    const directive = readIdentifier(tokens, state, line, "Direttiva non valida.");

    switch (directive) {
      case "label":
        node.label = readStringValue(tokens, state, line, "Label mancante.");
        break;
      case "at":
        node.x = readNumberValue(tokens, state, line, "Coordinata X non valida.");
        node.y = readNumberValue(tokens, state, line, "Coordinata Y non valida.");
        break;
      case "size":
        node.width = readNumberValue(tokens, state, line, "Larghezza non valida.");
        node.height = readNumberValue(tokens, state, line, "Altezza non valida.");
        break;
      case "identifier":
        if (node.type !== "attribute") {
          throw new ErsParseError(line, "La flag identifier e valida solo per gli attributi.");
        }
        node.isIdentifier = true;
        break;
      case "compositeInternal":
        if (node.type !== "attribute") {
          throw new ErsParseError(line, "La flag compositeInternal e valida solo per gli attributi.");
        }
        node.isCompositeInternal = true;
        break;
      case "multivalued":
        if (node.type !== "attribute") {
          throw new ErsParseError(line, "La flag multivalued e valida solo per gli attributi.");
        }
        node.isMultivalued = true;
        break;
      case "weak":
        if (node.type !== "entity") {
          throw new ErsParseError(line, "La flag weak e valida solo per le entita.");
        }
        node.isWeak = true;
        break;
      case "external":
        if (node.type !== "relationship") {
          throw new ErsParseError(line, "La direttiva external e valida solo per le relazioni.");
        }
        externalSpec = externalSpec ?? { mode: "entity" };
        externalSpec.mode = readEnumValue(tokens, state, line, ["entity", "composite"], "Modalita external");
        break;
      case "sourceAttribute":
        if (node.type !== "relationship") {
          throw new ErsParseError(line, "La direttiva sourceAttribute e valida solo per le relazioni.");
        }
        externalSpec = externalSpec ?? { mode: "entity" };
        externalSpec.sourceAttributeAlias = readIdentifier(
          tokens,
          state,
          line,
          "sourceAttribute richiede un attributo sorgente.",
        );
        break;
      case "targetEntity":
        if (node.type !== "relationship") {
          throw new ErsParseError(line, "La direttiva targetEntity e valida solo per le relazioni.");
        }
        externalSpec = externalSpec ?? { mode: "entity" };
        externalSpec.targetEntityAlias = readIdentifier(
          tokens,
          state,
          line,
          "targetEntity richiede un'entita.",
        );
        break;
      case "targetAttribute":
        if (node.type !== "relationship") {
          throw new ErsParseError(line, "La direttiva targetAttribute e valida solo per le relazioni.");
        }
        externalSpec = externalSpec ?? { mode: "composite" };
        externalSpec.targetAttributeAlias = readIdentifier(
          tokens,
          state,
          line,
          "targetAttribute richiede un attributo.",
        );
        break;
      case "offset":
        if (node.type !== "relationship") {
          throw new ErsParseError(line, "La direttiva offset e valida solo per le relazioni in external mode.");
        }
        externalSpec = externalSpec ?? { mode: "entity" };
        externalSpec.offset = readNumberValue(tokens, state, line, "Offset external non valido.");
        break;
      case "markerOffset":
        if (node.type !== "relationship") {
          throw new ErsParseError(line, "La direttiva markerOffset e valida solo per le relazioni in external mode.");
        }
        externalSpec = externalSpec ?? { mode: "entity" };
        externalSpec.markerOffsetX = readNumberValue(tokens, state, line, "Marker offset X non valido.");
        externalSpec.markerOffsetY = readNumberValue(tokens, state, line, "Marker offset Y non valido.");
        break;
      default:
        throw new ErsParseError(line, `Direttiva non riconosciuta: "${directive}".`);
    }
  }

  if (node.type === "attribute") {
    validateStructuredAttributeFlags(
      {
        isIdentifier: node.isIdentifier === true,
        isCompositeInternal: node.isCompositeInternal === true,
        isMultivalued: node.isMultivalued === true,
      },
      line,
    );
  }

  if (node.type === "attribute" && node.isMultivalued === true) {
    const nextSize = getMultivaluedAttributeSize(node.label);
    node.width = nextSize.width;
    node.height = nextSize.height;
  }

  if (
    node.type === "relationship" &&
    externalSpec &&
    (!externalSpec.sourceAttributeAlias || !externalSpec.targetEntityAlias)
  ) {
    throw new ErsParseError(
      line,
      "Una relazione external richiede almeno sourceAttribute e targetEntity.",
    );
  }

  if (node.type === "relationship" && externalSpec?.mode === "composite" && !externalSpec.targetAttributeAlias) {
    throw new ErsParseError(line, "La modalita external composite richiede targetAttribute.");
  }

  return { line, alias, node, externalSpec };
}

function parseEdgeStatement(edgeType: EdgeKind, tokens: string[], line: number): ParsedEdgeSpec {
  const state = { index: 1 };
  const sourceAlias = readIdentifier(tokens, state, line, "Elemento sorgente mancante.");
  const arrow = readToken(tokens, state, line, "Operatore -> mancante.");

  if (arrow !== "->") {
    throw new ErsParseError(line, "Sintassi collegamento non valida: usa -> tra sorgente e destinazione.");
  }

  const targetAlias = readIdentifier(tokens, state, line, "Elemento destinazione mancante.");
  const edge: ParsedEdgeSpec = {
    line,
    type: edgeType,
    sourceAlias,
    targetAlias,
    label: "",
    lineStyle: "solid",
  };

  while (state.index < tokens.length) {
    const directive = readIdentifier(tokens, state, line, "Direttiva collegamento non valida.");

    switch (directive) {
      case "card":
        if (edgeType === "inheritance") {
          throw new ErsParseError(line, "La direttiva card non e valida per inheritance.");
        }
        edge.cardinality = readStringValue(tokens, state, line, "Cardinalita mancante.");
        break;
      case "label":
        edge.label = readStringValue(tokens, state, line, "Label collegamento mancante.");
        break;
      case "style":
        edge.lineStyle = readEnumValue(tokens, state, line, ["solid", "dashed"], "Stile linea");
        break;
      case "offset":
        edge.manualOffset = readNumberValue(tokens, state, line, "Offset collegamento non valido.");
        break;
      case "disjoint":
      case "overlap":
        if (edgeType !== "inheritance") {
          throw new ErsParseError(line, `La direttiva ${directive} e valida solo per inheritance.`);
        }
        edge.isaDisjointness = directive as IsaDisjointness;
        break;
      case "total":
      case "partial":
        if (edgeType !== "inheritance") {
          throw new ErsParseError(line, `La direttiva ${directive} e valida solo per inheritance.`);
        }
        edge.isaCompleteness = directive as IsaCompleteness;
        break;
      case "disjointness":
        if (edgeType !== "inheritance") {
          throw new ErsParseError(line, "La direttiva disjointness e valida solo per inheritance.");
        }
        edge.isaDisjointness = readEnumValue(
          tokens,
          state,
          line,
          ["disjoint", "overlap"] as const,
          "Vincolo ISA",
        );
        break;
      case "completeness":
        if (edgeType !== "inheritance") {
          throw new ErsParseError(line, "La direttiva completeness e valida solo per inheritance.");
        }
        edge.isaCompleteness = readEnumValue(
          tokens,
          state,
          line,
          ["total", "partial"] as const,
          "Copertura ISA",
        );
        break;
      default:
        throw new ErsParseError(line, `Direttiva collegamento non riconosciuta: "${directive}".`);
    }
  }

  return edge;
}

function getAttributeHostNodes(diagram: DiagramDocument): Map<string, DiagramNode[]> {
  const map = new Map<string, DiagramNode[]>();

  diagram.edges.forEach((edge) => {
    if (edge.type !== "attribute") {
      return;
    }

    const source = diagram.nodes.find((node) => node.id === edge.sourceId);
    const target = diagram.nodes.find((node) => node.id === edge.targetId);

    if (
      source?.type === "attribute" &&
      (target?.type === "entity" || target?.type === "relationship" || target?.type === "attribute")
    ) {
      const bucket = map.get(target.id) ?? [];
      bucket.push(source);
      map.set(target.id, bucket);
      return;
    }

    if (target?.type === "attribute" && (source?.type === "entity" || source?.type === "relationship")) {
      const bucket = map.get(source.id) ?? [];
      bucket.push(target);
      map.set(source.id, bucket);
    }
  });

  return map;
}

function getLocalAttributeAlias(
  attribute: Extract<DiagramNode, { type: "attribute" }>,
  hostAlias: string,
  aliasByNodeId: Map<string, string>,
): string {
  const qualifiedAlias = aliasByNodeId.get(attribute.id) ?? attribute.id;
  const prefix = `${hostAlias}.`;

  if (qualifiedAlias.startsWith(prefix)) {
    return qualifiedAlias.slice(prefix.length);
  }

  return qualifiedAlias;
}

function formatNamedDefinition(keyword: string, alias: string, label: string): string {
  if (label === alias) {
    return `${keyword} ${alias}`;
  }

  return `${keyword} ${alias} ${quoteValue(label)}`;
}

function getAttributeKeyword(attribute: Extract<DiagramNode, { type: "attribute" }>):
  | "attribute"
  | "identifier"
  | "composite"
  | "multivalued" {
  if (attribute.isIdentifier === true) {
    return "identifier";
  }

  if (attribute.isCompositeInternal === true) {
    return "composite";
  }

  if (attribute.isMultivalued === true) {
    return "multivalued";
  }

  return "attribute";
}

function buildAttributeDeclaration(
  attribute: Extract<DiagramNode, { type: "attribute" }>,
  hostAlias: string,
  aliasByNodeId: Map<string, string>,
): string {
  const alias = getLocalAttributeAlias(attribute, hostAlias, aliasByNodeId);
  return `  ${formatNamedDefinition(getAttributeKeyword(attribute), alias, attribute.label)}`;
}

function buildStandaloneAttributeLine(
  attribute: Extract<DiagramNode, { type: "attribute" }>,
  alias: string,
): string {
  return `${formatNamedDefinition(getAttributeKeyword(attribute), alias, attribute.label)}`;
}

function buildNestedAttributeLegacyLines(
  diagram: DiagramDocument,
  aliasByNodeId: Map<string, string>,
): string[] {
  const nestedAttributes = [...diagram.nodes]
    .filter((node): node is Extract<DiagramNode, { type: "attribute" }> => node.type === "attribute")
    .filter((attribute) =>
      diagram.edges.some(
        (edge) =>
          edge.type === "attribute" &&
          edge.sourceId === attribute.id &&
          diagram.nodes.find((candidate) => candidate.id === edge.targetId)?.type === "attribute",
      ),
    )
    .sort(compareNodes);

  return nestedAttributes.flatMap((attribute) => {
    const alias = aliasByNodeId.get(attribute.id) ?? attribute.id;
    const parentEdge = diagram.edges.find(
      (edge) =>
        edge.type === "attribute" &&
        edge.sourceId === attribute.id &&
        diagram.nodes.find((candidate) => candidate.id === edge.targetId)?.type === "attribute",
    );
    const hostAlias = parentEdge ? aliasByNodeId.get(parentEdge.targetId) ?? parentEdge.targetId : undefined;

    if (!hostAlias) {
      return [];
    }

    return [buildStandaloneAttributeLine(attribute, alias), `attribute-link ${alias} -> ${hostAlias}`];
  });
}

function buildEntityBlock(
  entity: Extract<DiagramNode, { type: "entity" }>,
  aliasByNodeId: Map<string, string>,
  attributesByHostId: Map<string, DiagramNode[]>,
): string[] {
  const entityAlias = aliasByNodeId.get(entity.id) ?? entity.id;
  const lines = [
    `${formatNamedDefinition("entity", entityAlias, entity.label)}${entity.isWeak === true ? " weak" : ""} {`,
  ];
  const attributes = (attributesByHostId.get(entity.id) ?? [])
    .filter((node): node is Extract<DiagramNode, { type: "attribute" }> => node.type === "attribute")
    .sort(compareNodes);

  attributes.forEach((attribute) => {
    lines.push(buildAttributeDeclaration(attribute, entityAlias, aliasByNodeId));
  });

  lines.push("}");
  return lines;
}

function buildRelationLines(
  relationship: Extract<DiagramNode, { type: "relationship" }>,
  diagram: DiagramDocument,
  aliasByNodeId: Map<string, string>,
  attributesByHostId: Map<string, DiagramNode[]>,
): string[] {
  const relationAlias = aliasByNodeId.get(relationship.id) ?? relationship.id;
  const connectors = diagram.edges
    .filter(
      (edge): edge is Extract<DiagramEdge, { type: "connector" }> =>
        edge.type === "connector" && (edge.sourceId === relationship.id || edge.targetId === relationship.id),
    )
    .map((edge) => {
      const entityId = edge.sourceId === relationship.id ? edge.targetId : edge.sourceId;
      return {
        entityAlias: aliasByNodeId.get(entityId) ?? entityId,
        cardinality: edge.cardinality ?? CONNECTOR_CARDINALITY_PLACEHOLDER,
      };
    })
    .sort((left, right) => left.entityAlias.localeCompare(right.entityAlias, "it", { sensitivity: "base" }));
  const attributes = (attributesByHostId.get(relationship.id) ?? [])
    .filter((node): node is Extract<DiagramNode, { type: "attribute" }> => node.type === "attribute")
    .sort(compareNodes);

  if (
    connectors.length === 2 &&
    attributes.length === 0 &&
    relationship.isExternalIdentifier !== true
  ) {
    return [
      `${formatNamedDefinition("relation", relationAlias, relationship.label)} ${connectors[0].entityAlias} ${quoteValue(
        connectors[0].cardinality,
      )} ${connectors[1].entityAlias} ${quoteValue(connectors[1].cardinality)}`,
    ];
  }

  const lines = [`${formatNamedDefinition("relation", relationAlias, relationship.label)} {`];

  connectors.forEach((connector) => {
    lines.push(`  connect ${connector.entityAlias} ${quoteValue(connector.cardinality)}`);
  });

  attributes.forEach((attribute) => {
    lines.push(buildAttributeDeclaration(attribute, relationAlias, aliasByNodeId));
  });

  if (relationship.isExternalIdentifier === true) {
    const sourceAttributeAlias =
      relationship.externalIdentifierSourceAttributeId &&
      aliasByNodeId.get(relationship.externalIdentifierSourceAttributeId);
    const targetEntityAlias =
      relationship.externalIdentifierTargetEntityId &&
      aliasByNodeId.get(relationship.externalIdentifierTargetEntityId);
    const targetAttributeAlias =
      relationship.externalIdentifierTargetAttributeId &&
      aliasByNodeId.get(relationship.externalIdentifierTargetAttributeId);

    if (sourceAttributeAlias && targetEntityAlias) {
      const externalParts = [
        "  external",
        relationship.externalIdentifierMode ?? "entity",
        "from",
        sourceAttributeAlias,
        "to",
        targetEntityAlias,
      ];

      if (targetAttributeAlias) {
        externalParts.push("target", targetAttributeAlias);
      }

      lines.push(externalParts.join(" "));
    }
  }

  lines.push("}");
  return lines;
}

function buildEdgeId(edgeType: EdgeKind, sourceId: string, targetId: string, occurrence: number): string {
  return `${edgeType}-${sourceId}-${targetId}-${occurrence}`;
}

function resolveNodeAlias(
  alias: string,
  aliasMap: Map<string, ParsedNodeSpec>,
  line: number,
  expectedType?: NodeKind,
): DiagramNode {
  const target = aliasMap.get(alias);

  if (!target) {
    throw new ErsParseError(line, `Riferimento non trovato: "${alias}".`);
  }

  if (expectedType && target.node.type !== expectedType) {
    throw new ErsParseError(line, `"${alias}" deve essere di tipo ${expectedType}.`);
  }

  return target.node;
}

export function serializeDiagramToErs(diagram: DiagramDocument): string {
  const aliasByNodeId = assignNodeAliases(diagram);
  const attributesByHostId = getAttributeHostNodes(diagram);
  const attributeHostMap = buildAttributeHostMap(diagram);
  const entityLines = [...diagram.nodes]
    .filter((node): node is Extract<DiagramNode, { type: "entity" }> => node.type === "entity")
    .sort(compareNodes)
    .flatMap((entity) => buildEntityBlock(entity, aliasByNodeId, attributesByHostId));
  const relationLines = [...diagram.nodes]
    .filter((node): node is Extract<DiagramNode, { type: "relationship" }> => node.type === "relationship")
    .sort(compareNodes)
    .flatMap((relationship) => buildRelationLines(relationship, diagram, aliasByNodeId, attributesByHostId));
  const orphanAttributeLines = [...diagram.nodes]
    .filter(
      (node): node is Extract<DiagramNode, { type: "attribute" }> =>
        node.type === "attribute" && !attributeHostMap.has(node.id),
    )
    .sort(compareNodes)
    .map((attribute) => buildStandaloneAttributeLine(attribute, aliasByNodeId.get(attribute.id) ?? attribute.id));
  const nestedAttributeLines = buildNestedAttributeLegacyLines(diagram, aliasByNodeId);
  const textLines = [...diagram.nodes]
    .filter((node): node is Extract<DiagramNode, { type: "text" }> => node.type === "text")
    .sort(compareNodes)
    .map((node) => formatNamedDefinition("text", aliasByNodeId.get(node.id) ?? node.id, node.label));
  const inheritanceLines = [...diagram.edges]
    .filter((edge): edge is Extract<DiagramEdge, { type: "inheritance" }> => edge.type === "inheritance")
    .sort((left, right) => compareEdges(left, right, aliasByNodeId))
    .map((edge) => {
      const sourceAlias = aliasByNodeId.get(edge.sourceId) ?? edge.sourceId;
      const targetAlias = aliasByNodeId.get(edge.targetId) ?? edge.targetId;
      const parts = ["inheritance", sourceAlias, "->", targetAlias];

      if (edge.isaDisjointness) {
        parts.push(edge.isaDisjointness);
      }
      if (edge.isaCompleteness) {
        parts.push(edge.isaCompleteness);
      }
      if (edge.label.trim()) {
        parts.push("label", quoteValue(edge.label));
      }
      if (edge.lineStyle !== "solid") {
        parts.push("style", edge.lineStyle);
      }
      if (typeof edge.manualOffset === "number" && edge.manualOffset !== 0) {
        parts.push("offset", formatNumber(edge.manualOffset));
      }

      return parts.join(" ");
    });

  const sections = [
    "# ER Studio source file",
    "# Modifica la struttura qui. Posizioni e dimensioni restano nel canvas.",
    `diagram ${quoteValue(diagram.meta.name)}`,
  ];

  if (entityLines.length > 0) {
    sections.push("", "# Entities", ...entityLines);
  }
  if (relationLines.length > 0) {
    sections.push("", "# Relations", ...relationLines);
  }
  if (
    orphanAttributeLines.length > 0 ||
    nestedAttributeLines.length > 0 ||
    textLines.length > 0 ||
    inheritanceLines.length > 0
  ) {
    sections.push("", ...orphanAttributeLines, ...nestedAttributeLines, ...textLines, ...inheritanceLines);
  }

  return sections.join("\n");
}

function buildEdgeMatchKey(edge: DiagramEdge, aliasByNodeId: Map<string, string>): string {
  const sourceAlias = aliasByNodeId.get(edge.sourceId) ?? edge.sourceId;
  const targetAlias = aliasByNodeId.get(edge.targetId) ?? edge.targetId;

  if (edge.type === "inheritance") {
    return `${edge.type}:${sourceAlias}->${targetAlias}`;
  }

  const [left, right] = [sourceAlias, targetAlias].sort((a, b) =>
    a.localeCompare(b, "it", { sensitivity: "base" }),
  );
  return `${edge.type}:${left}<->${right}`;
}

function queueExistingEdgesByKey(diagram: DiagramDocument): Map<string, DiagramEdge[]> {
  const aliasByNodeId = assignNodeAliases(diagram);
  const queued = new Map<string, DiagramEdge[]>();

  [...diagram.edges]
    .sort((left, right) => compareEdges(left, right, aliasByNodeId))
    .forEach((edge) => {
      const key = buildEdgeMatchKey(edge, aliasByNodeId);
      const bucket = queued.get(key) ?? [];
      bucket.push(edge);
      queued.set(key, bucket);
    });

  return queued;
}

function autoPlaceDiagram(diagram: DiagramDocument, lockedNodeIds: Set<string>): DiagramDocument {
  const nodeMap = new Map(diagram.nodes.map((node) => [node.id, node]));
  const hostByAttributeId = buildAttributeHostMap(diagram);
  const nextNodes = new Map<string, DiagramNode>();

  function getNode(nodeId: string): DiagramNode {
    return nextNodes.get(nodeId) ?? (nodeMap.get(nodeId) as DiagramNode);
  }

  function setNode(node: DiagramNode) {
    nextNodes.set(node.id, node);
  }

  const entityNodes = [...diagram.nodes]
    .filter((node): node is Extract<DiagramNode, { type: "entity" }> => node.type === "entity")
    .sort(compareNodes);
  const lockedEntities = entityNodes.filter((node) => lockedNodeIds.has(node.id));
  let nextEntityX =
    lockedEntities.length > 0
      ? Math.max(...lockedEntities.map((node) => node.x + node.width)) + 200
      : 160;
  const baseEntityY =
    lockedEntities.length > 0
      ? snapValue(lockedEntities.reduce((sum, node) => sum + node.y, 0) / lockedEntities.length, GRID_SIZE)
      : 240;

  entityNodes.forEach((entity) => {
    if (lockedNodeIds.has(entity.id)) {
      return;
    }

    const placed = {
      ...entity,
      x: snapValue(nextEntityX, GRID_SIZE),
      y: snapValue(baseEntityY, GRID_SIZE),
    };

    nextEntityX = placed.x + placed.width + 80;
    setNode(placed);
  });

  const relationshipNodes = [...diagram.nodes]
    .filter((node): node is Extract<DiagramNode, { type: "relationship" }> => node.type === "relationship")
    .sort(compareNodes);
  let fallbackRelationX = 200;
  let fallbackRelationY = baseEntityY - 140;

  relationshipNodes.forEach((relationship) => {
    if (lockedNodeIds.has(relationship.id)) {
      return;
    }

    const connectedEntities = diagram.edges
      .filter(
        (edge) =>
          edge.type === "connector" &&
          (edge.sourceId === relationship.id || edge.targetId === relationship.id),
      )
      .map((edge) => (edge.sourceId === relationship.id ? edge.targetId : edge.sourceId))
      .map((entityId) => getNode(entityId))
      .filter((node): node is Extract<DiagramNode, { type: "entity" }> => node.type === "entity");

    if (connectedEntities.length > 0) {
      const averageCenterX =
        connectedEntities.reduce((sum, node) => sum + node.x + node.width / 2, 0) /
        connectedEntities.length;
      const minY = Math.min(...connectedEntities.map((node) => node.y));

      setNode({
        ...relationship,
        x: snapValue(averageCenterX - relationship.width / 2, GRID_SIZE),
        y: snapValue(Math.max(60, minY - 140), GRID_SIZE),
      });
      return;
    }

    const placed = {
      ...relationship,
      x: snapValue(fallbackRelationX, GRID_SIZE),
      y: snapValue(fallbackRelationY, GRID_SIZE),
    };

    fallbackRelationX = placed.x + placed.width + 120;
    fallbackRelationY = baseEntityY + 180;
    setNode(placed);
  });

  const attributesByHostId = new Map<string, Array<Extract<DiagramNode, { type: "attribute" }>>>();

  [...diagram.nodes]
    .filter((node): node is Extract<DiagramNode, { type: "attribute" }> => node.type === "attribute")
    .sort(compareNodes)
    .forEach((attribute) => {
      const hostId = hostByAttributeId.get(attribute.id);
      if (!hostId) {
        return;
      }

      const bucket = attributesByHostId.get(hostId) ?? [];
      bucket.push(attribute);
      attributesByHostId.set(hostId, bucket);
    });

  function positionHostedAttributes(
    hostId: string,
    attributes: Array<Extract<DiagramNode, { type: "attribute" }>>,
  ) {
    const host = getNode(hostId);
    let identifierIndex = 0;
    let regularIndex = 0;
    let compositeIndex = 0;

    attributes.forEach((attribute) => {
      if (lockedNodeIds.has(attribute.id)) {
        return;
      }

      let x = host.x + host.width + 80;
      let y = host.y + regularIndex * 56;

      if (attribute.isIdentifier === true) {
        x = host.x - attribute.width - 80;
        y = host.y + identifierIndex * 56;
        identifierIndex += 1;
      } else if (attribute.isCompositeInternal === true) {
        x = host.x + host.width / 2 - attribute.width / 2 + compositeIndex * 24;
        y = host.y + host.height + 80 + compositeIndex * 44;
        compositeIndex += 1;
      } else {
        regularIndex += 1;
      }

      setNode({
        ...attribute,
        x: snapValue(x, GRID_SIZE),
        y: snapValue(y, GRID_SIZE),
      });
    });
  }

  attributesByHostId.forEach((attributes, hostId) => {
    const host = getNode(hostId);
    if (host.type === "attribute") {
      return;
    }

    positionHostedAttributes(hostId, attributes);
  });

  const pendingAttributeHosts = new Map(
    [...attributesByHostId.entries()].filter(([hostId]) => getNode(hostId).type === "attribute"),
  );

  let guard = 0;
  while (pendingAttributeHosts.size > 0 && guard < pendingAttributeHosts.size + 4) {
    let progressed = false;

    [...pendingAttributeHosts.entries()].forEach(([hostId, attributes]) => {
      const host = getNode(hostId);
      const hostPlaced = lockedNodeIds.has(hostId) || nextNodes.has(hostId);

      if (!hostPlaced) {
        return;
      }

      positionHostedAttributes(hostId, attributes);
      pendingAttributeHosts.delete(hostId);
      progressed = true;
    });

    if (!progressed) {
      break;
    }

    guard += 1;
  }

  pendingAttributeHosts.forEach((attributes, hostId) => {
    positionHostedAttributes(hostId, attributes);
  });

  const orphanAttributes = [...diagram.nodes]
    .filter(
      (node): node is Extract<DiagramNode, { type: "attribute" }> =>
        node.type === "attribute" && !hostByAttributeId.has(node.id),
    )
    .sort(compareNodes);
  let orphanAttributeX = 160;
  const orphanAttributeY = baseEntityY + 260;

  orphanAttributes.forEach((attribute) => {
    if (lockedNodeIds.has(attribute.id)) {
      return;
    }

    setNode({
      ...attribute,
      x: snapValue(orphanAttributeX, GRID_SIZE),
      y: snapValue(orphanAttributeY, GRID_SIZE),
    });
    orphanAttributeX += attribute.width + 60;
  });

  const textNodes = [...diagram.nodes]
    .filter((node): node is Extract<DiagramNode, { type: "text" }> => node.type === "text")
    .sort(compareNodes);
  let textX = 160;
  const textY = baseEntityY + 360;

  textNodes.forEach((textNode) => {
    if (lockedNodeIds.has(textNode.id)) {
      return;
    }

    setNode({
      ...textNode,
      x: snapValue(textX, GRID_SIZE),
      y: snapValue(textY, GRID_SIZE),
    });
    textX += textNode.width + 80;
  });

  return {
    ...diagram,
    nodes: diagram.nodes.map((node) => nextNodes.get(node.id) ?? node),
  };
}

function parseLegacyErsDiagram(rawSource: string): DiagramDocument {
  const lines = rawSource.split(/\r?\n/);
  const parsedNodes: ParsedNodeSpec[] = [];
  const parsedEdges: ParsedEdgeSpec[] = [];
  const aliasMap = new Map<string, ParsedNodeSpec>();
  let diagramName = "Diagramma ER";

  lines.forEach((lineText, index) => {
    const line = index + 1;
    const normalized = normalizeCommentFreeLine(lineText);

    if (normalized.length === 0) {
      return;
    }

    const tokens = tokenizeLine(normalized);
    if (tokens.length === 0) {
      return;
    }

    const keyword = tokens[0];

    if (keyword === "diagram") {
      if (tokens.length < 2) {
        throw new ErsParseError(line, "La direttiva diagram richiede un nome.");
      }
      diagramName = readStringValue(tokens, { index: 1 }, line, "Nome diagramma mancante.");
      return;
    }

    if (
      ["entity", "relationship", "attribute", "text", "identifier", "composite", "multivalued"].includes(
        keyword,
      )
    ) {
      const parsedNode = parseNodeStatement(
        keyword === "identifier" || keyword === "composite" || keyword === "multivalued"
          ? "attribute"
          : (keyword as NodeKind),
        tokens,
        line,
        keyword === "identifier"
          ? { isIdentifier: true }
          : keyword === "composite"
            ? { isCompositeInternal: true }
            : keyword === "multivalued"
              ? { isMultivalued: true }
              : undefined,
      );
      if (aliasMap.has(parsedNode.alias)) {
        throw new ErsParseError(line, `Nome elemento duplicato: "${parsedNode.alias}".`);
      }
      parsedNodes.push(parsedNode);
      aliasMap.set(parsedNode.alias, parsedNode);
      return;
    }

    if (keyword === "connector" || keyword === "attribute-link" || keyword === "inheritance") {
      const edgeType = keyword === "attribute-link" ? "attribute" : (keyword as EdgeKind);
      parsedEdges.push(parseEdgeStatement(edgeType, tokens, line));
      return;
    }

    throw new ErsParseError(line, `Istruzione non riconosciuta: "${keyword}".`);
  });

  const occurrenceByKey = new Map<string, number>();
  const edges: DiagramEdge[] = parsedEdges.map((edgeSpec) => {
    const sourceNode = resolveNodeAlias(edgeSpec.sourceAlias, aliasMap, edgeSpec.line);
    const targetNode = resolveNodeAlias(edgeSpec.targetAlias, aliasMap, edgeSpec.line);

    if (!canConnect(edgeSpec.type, sourceNode, targetNode)) {
      throw new ErsParseError(
        edgeSpec.line,
        `Il collegamento tra "${edgeSpec.sourceAlias}" e "${edgeSpec.targetAlias}" non e compatibile.`,
      );
    }

    const key = `${edgeSpec.type}:${sourceNode.id}:${targetNode.id}`;
    const occurrence = (occurrenceByKey.get(key) ?? 0) + 1;
    occurrenceByKey.set(key, occurrence);

    const baseEdge = {
      id: buildEdgeId(edgeSpec.type, sourceNode.id, targetNode.id, occurrence),
      sourceId: sourceNode.id,
      targetId: targetNode.id,
      label: edgeSpec.label,
      lineStyle: edgeSpec.lineStyle,
      ...(typeof edgeSpec.manualOffset === "number" ? { manualOffset: edgeSpec.manualOffset } : {}),
    };

    if (edgeSpec.type === "inheritance") {
      return {
        ...baseEdge,
        type: "inheritance" as const,
        isaDisjointness: edgeSpec.isaDisjointness,
        isaCompleteness: edgeSpec.isaCompleteness,
      };
    }

    if (edgeSpec.type === "attribute") {
      if (edgeSpec.cardinality && !isSupportedCardinality(edgeSpec.cardinality)) {
        throw new ErsParseError(edgeSpec.line, `Cardinalita attributo non valida: "${edgeSpec.cardinality}".`);
      }

      return {
        ...baseEdge,
        type: "attribute" as const,
        cardinality: edgeSpec.cardinality,
      };
    }

    if (edgeSpec.cardinality && !isSupportedCardinality(edgeSpec.cardinality)) {
      throw new ErsParseError(edgeSpec.line, `Cardinalita connettore non valida: "${edgeSpec.cardinality}".`);
    }

    return {
      ...baseEdge,
      type: "connector" as const,
      cardinality: edgeSpec.cardinality ?? CONNECTOR_CARDINALITY_PLACEHOLDER,
    };
  });

  const nodes = parsedNodes.map((entry) => {
    if (entry.node.type !== "relationship" || !entry.externalSpec) {
      return entry.node;
    }

    const sourceAttribute = resolveNodeAlias(
      entry.externalSpec.sourceAttributeAlias as string,
      aliasMap,
      entry.line,
      "attribute",
    );
    const targetEntity = resolveNodeAlias(
      entry.externalSpec.targetEntityAlias as string,
      aliasMap,
      entry.line,
      "entity",
    );
    const targetAttribute =
      entry.externalSpec.targetAttributeAlias
        ? resolveNodeAlias(
            entry.externalSpec.targetAttributeAlias,
            aliasMap,
            entry.line,
            "attribute",
          )
        : undefined;

    return {
      ...entry.node,
      isExternalIdentifier: true,
      externalIdentifierMode: entry.externalSpec.mode,
      externalIdentifierSourceAttributeId: sourceAttribute.id,
      externalIdentifierTargetEntityId: targetEntity.id,
      externalIdentifierTargetAttributeId: targetAttribute?.id,
      externalIdentifierOffset: entry.externalSpec.offset,
      externalIdentifierMarkerOffsetX: entry.externalSpec.markerOffsetX,
      externalIdentifierMarkerOffsetY: entry.externalSpec.markerOffsetY,
    };
  });

  const diagram: DiagramDocument = {
    meta: {
      name: diagramName,
      version: 1,
    },
    nodes,
    edges,
  };

  const issues = validateDiagram(diagram).filter((issue) => issue.level === "error");
  if (issues.length > 0) {
    throw new Error(issues[0].message);
  }

  return diagram;
}

function mergeDiagramConfiguration(
  parsedDiagram: DiagramDocument,
  existingDiagram?: DiagramDocument,
): DiagramDocument {
  if (!existingDiagram) {
    return autoPlaceDiagram(parsedDiagram, new Set<string>());
  }

  const parsedAliasByNodeId = assignNodeAliases(parsedDiagram);
  const existingAliasByNodeId = assignNodeAliases(existingDiagram);
  const existingNodeByAlias = new Map<string, DiagramNode>();

  existingDiagram.nodes.forEach((node) => {
    const alias = existingAliasByNodeId.get(node.id);
    if (alias) {
      existingNodeByAlias.set(alias, node);
    }
  });

  const lockedNodeIds = new Set<string>();
  const nodes = parsedDiagram.nodes.map((node) => {
    const alias = parsedAliasByNodeId.get(node.id) ?? node.id;
    const existingNode = existingNodeByAlias.get(alias);

    if (!existingNode || existingNode.type !== node.type) {
      return node;
    }

    lockedNodeIds.add(node.id);
    return {
      ...node,
      x: existingNode.x,
      y: existingNode.y,
      width: existingNode.width,
      height: existingNode.height,
    };
  });

  const parsedWithNodeConfig = {
    ...parsedDiagram,
    nodes,
  };

  const existingEdgesByKey = queueExistingEdgesByKey(existingDiagram);
  const parsedAliasMap = assignNodeAliases(parsedWithNodeConfig);
  const edges = parsedWithNodeConfig.edges.map((edge) => {
    const key = buildEdgeMatchKey(edge, parsedAliasMap);
    const bucket = existingEdgesByKey.get(key);
    const existingEdge = bucket?.shift();

    if (!existingEdge) {
      return edge;
    }

    return {
      ...edge,
      label: edge.label || existingEdge.label,
      lineStyle: existingEdge.lineStyle,
      manualOffset: existingEdge.manualOffset,
      ...(edge.type === "attribute" && edge.cardinality == null && existingEdge.type === "attribute"
        ? { cardinality: existingEdge.cardinality }
        : {}),
    };
  });

  return autoPlaceDiagram(
    {
      ...parsedWithNodeConfig,
      edges,
    },
    lockedNodeIds,
  );
}

export function parseErsDiagram(rawSource: string, existingDiagram?: DiagramDocument): DiagramDocument {
  const expanded = expandStructuredErs(rawSource);

  try {
    const parsed = parseLegacyErsDiagram(expanded.source);
    return mergeDiagramConfiguration(parsed, existingDiagram);
  } catch (error) {
    if (error instanceof ErsParseError) {
      const mappedLine = expanded.lineMap[error.line - 1] ?? error.line;
      throw new ErsParseError(mappedLine, error.detail);
    }

    throw error;
  }
}
