# Documentation

Barista's documentation, organised by who is reading it.

For what the project is and how to run it, start with the
[root README](../README.md).

## Features

User-facing documentation: what each feature does, how to use it, and how it
behaves at the edges.

_Nothing here yet — the engine is phase 1. See the
[roadmap](internal/roadmap.md)._

Every feature ships with its page in the same change. A feature without docs is
not finished.

## Architecture decisions

Why the project is built the way it is. Read these before proposing an
architectural change — the reasoning, and the alternatives already rejected,
are recorded here.

| ADR                                         | Decision                                   |
| ------------------------------------------- | ------------------------------------------ |
| [0001](adr/0001-client-side-only.md)        | No backend: everything runs in the browser |
| [0002](adr/0002-tree-sitter-for-parsing.md) | Parse Java with tree-sitter                |
| [0003](adr/0003-type-resolution.md)         | Resolve types with our own symbol table    |
| [0004](adr/0004-elk-for-layout.md)          | Lay out the diagram with ELK               |

ADRs are append-only. Superseding a decision means a new ADR that links back to
the old one, never an edit that makes past reasoning look better than it was.

## Internal

Contributor-facing material.

| Document                       | Covers                                                                 |
| ------------------------------ | ---------------------------------------------------------------------- |
| [Roadmap](internal/roadmap.md) | Where the project is, what comes next, and what will never be possible |
| [Docker](internal/docker.md)   | Building and previewing the production image                           |

## Conventions

The rules the code follows live alongside the harness rather than here, because
they are read by both people and agents:

| File                                                                          | Covers                                                                  |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [`CLAUDE.md`](../CLAUDE.md)                                                   | Architecture, commands, TDD, conventions, delegation                    |
| [`.claude/rules/design-principles.md`](../.claude/rules/design-principles.md) | SOLID, DRY, KISS, YAGNI, Tell Don't Ask, Demeter, coupling and cohesion |
| [`.claude/rules/typescript-style.md`](../.claude/rules/typescript-style.md)   | Naming, types, error handling, imports, comments                        |
| [`.claude/rules/prohibited.md`](../.claude/rules/prohibited.md)               | The hard "do not" list                                                  |
| [`.claude/skills/tdd-cycle/SKILL.md`](../.claude/skills/tdd-cycle/SKILL.md)   | The red/green/refactor loop and fixture conventions                     |
