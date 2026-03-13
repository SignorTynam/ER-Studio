export const CONNECTOR_CARDINALITY_PLACEHOLDER = "(X,Y)";

export const CONNECTOR_CARDINALITIES = [
  "(0,0)",
  "(0,1)",
  "(0,N)",
  "(1,0)",
  "(1,1)",
  "(1,N)",
  "(N,0)",
  "(N,1)",
  "(N,N)",
] as const;

export type ConnectorCardinality = (typeof CONNECTOR_CARDINALITIES)[number];
