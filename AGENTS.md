# buildER agent entrypoint

Policy-Version: 1.0.0

buildER is a React, TypeScript, and Vite web editor for Chen-style
Entity-Relationship diagrams. It includes ERS source synchronization, logical
and relational transformations, SQL reverse engineering, SQLite workspaces,
responsive SVG canvases, project-file compatibility, and local project
versioning.

## Mandatory start for every task

1. Before changing the repository, read
   [`docs/agents/INDEX.md`](docs/agents/INDEX.md).
2. Follow its routing table and read every document required for the task.
3. Inspect the current branch, working tree, relevant implementation, and
   tests. Repository instructions apply even when the user does not repeat
   them in the prompt.
4. Use the sources and precedence declared in the canonical index. Do not
   replace repository evidence with remembered conversation context or
   external workspace documentation.
5. Complete the routed checks and report the exact validation performed,
   skipped checks, risks, branch, commits, and Pull Request status.

The detailed and shared rules live under `docs/agents/`; this entrypoint does
not redefine them.
