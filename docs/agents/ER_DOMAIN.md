# ER domain and file-compatibility invariants

Parser, serialization, conceptual translation, logical translation, relational
schema, and SQL reverse work are high-risk. Preserve information explicitly;
never discard unsupported or malformed data silently.

## Conceptual model

- Cardinality retains both minimum and maximum bounds. Preserve optionality and
  custom supported bounds through parse, edit, transform, save, and round-trip.
- Simple, composite, and multivalued attributes have distinct semantics.
  Composite trees and multivalued cardinalities must survive transformations.
- Internal identifiers may be simple or composite. Their attribute references
  must remain direct, unique, and valid.
- External identifiers preserve imported identifier parts, relationship
  provenance, and optional local attributes. Do not collapse distinct external
  identifiers into one.
- Associations retain participants, per-side cardinalities, and foreign-key
  implications.
- ISA groups retain supertype, subtype membership, total/partial, and
  disjoint/overlap constraints.

## Transformations

Collapse-up, collapse-down, and substitution have different compatibility
conditions. Preserve attributes, identifiers, cardinalities, and hierarchy
semantics or return an explicit blocking reason. Composite split/merge and
simple multivalued corrections must retain the data needed by later logical
translation.

Logical translation must account for:

- strong and weak entities;
- internal, external, alternative, and composite identifiers;
- composite primary keys and UNIQUE constraints;
- relationship tables and foreign keys;
- nullable/required participation;
- multivalued-attribute tables;
- ISA mapping strategies;
- deterministic relational schema output.

SQL reverse engineering must preserve quoted identifiers, composite PK/FK
mappings, UNIQUE and nullable semantics, source spans, and unsupported
statements or issues. Conversion errors must be explicit and actionable.

## Round-trip and compatibility

- `.ersp` is the complete project format and currently migrates legacy project
  versions plus legacy diagram JSON into the multi-file structure.
- `.erschema` is the single-schema format and must reject unsupported kinds or
  versions explicitly.
- `.ers` is textual ERS source. Parser/serializer changes require semantic
  round-trip tests.
- Legacy compatibility is an internal API. Do not remove it during UI cleanup
  or unrelated refactors.
- Version fields for the application, diagram, project, schema, and local
  history are independent.
- Parsing errors must identify the failure; partial or unsupported input must
  not appear to succeed while losing data.

## Required regression evidence

Every parser or transformation bug includes:

1. minimum reproducible input;
2. current behavior;
3. expected behavior;
4. focused regression test;
5. cardinality check;
6. identifier check;
7. multivalued case check;
8. round-trip check when pertinent;
9. `.ersp`, `.erschema`, or `.ers` compatibility check as applicable;
10. review of related transformations and reverse paths.

Use the existing suites in `test/ers.test.ts`, `test/project-file.test.ts`,
`test/schema-file.test.ts`, `test/er-translation.test.ts`,
`test/logical-*.test.ts`, and `test/sql-reverse-*.test.ts` before creating a
new parallel test strategy.
