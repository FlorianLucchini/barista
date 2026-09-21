# Barista

A browser-based toolkit for inspecting Java code. You drop in a `.zip` of Java
sources and Barista analyses them **statically** — no AI, no backend, no upload.
Everything runs in the browser tab.

The first tool is a **UML class diagram generator**: it parses the sources,
resolves types, infers the relationships between them (generalization,
realization, composition, aggregation, association, dependency) and draws the
diagram. Every inferred relationship carries the **evidence** that produced it,
so the tool can always answer "why did you classify this edge that way?".

> Barista is a study aid as much as a utility. A tool that shows its reasoning
> teaches you something; a tool that says "trust me" does not. When a design
> decision trades a little convenience for a lot of explainability, take the
> explainability.

---

## Architecture

```
packages/core   Pure TypeScript. The analysis engine.
                zip → parse → resolve → infer → model → export
                Zero framework dependencies. Knows nothing about the UI.

apps/web        Angular 22. The interface.
                Consumes the model, runs layout, renders SVG.
```

### The one inviolable boundary

`packages/core` must **never** import from `apps/web`, `@angular/*`, or any DOM
API that is not part of the standard web platform available in a Worker.

This is the same rule as "the model must not depend on the view" — except here
it is enforced, not trusted. `pnpm deps:check` runs `dependency-cruiser` and
fails the build on violation. A Claude Code hook runs it automatically after any
edit inside `packages/core`.

Why it matters beyond dogma: the engine has to run inside a **Web Worker** (so
parsing a large project does not freeze the tab) and has to be testable in
plain Node without a browser. A stray `@angular/core` import breaks both.

### Pipeline stages

| Stage     | Input          | Output           | Lives in            |
| --------- | -------------- | ---------------- | ------------------- |
| `zip`     | `ArrayBuffer`  | `SourceFile[]`   | `core/src/zip/`     |
| `parse`   | `SourceFile[]` | `ParsedFile[]`   | `core/src/parse/`   |
| `resolve` | `ParsedFile[]` | `TypeRegistry`   | `core/src/resolve/` |
| `infer`   | `TypeRegistry` | `Relationship[]` | `core/src/infer/`   |
| `model`   | the above      | `ClassDiagram`   | `core/src/model/`   |
| `export`  | `ClassDiagram` | Mermaid/PlantUML | `core/src/export/`  |

**`resolve` is the hard part of this project, not `parse`.** Tree-sitter gives
you syntax, never semantics: it tells you a field has type `Engine`, but not
_which_ `Engine`. Mapping a simple name to a fully-qualified type requires a
symbol table built from `package` declarations, explicit imports, wildcard
imports, same-package visibility, implicit `java.lang`, and nested types like
`Outer.Inner`. Expect ambiguity, and make it explicit rather than guessing
silently. See `docs/adr/0003-type-resolution.md`.

---

## Commands

Run from the repo root. `pnpm verify` is what CI runs; run it before saying work
is done.

| Command                  | What it does                               |
| ------------------------ | ------------------------------------------ |
| `pnpm dev`               | Dev server for the web app                 |
| `pnpm test`              | All unit tests, once                       |
| `pnpm test:watch`        | TDD loop on `packages/core`                |
| `pnpm test:coverage`     | Tests with coverage report                 |
| `pnpm typecheck`         | TypeScript, no emit                        |
| `pnpm lint`              | ESLint across the workspace                |
| `pnpm deps:check`        | Architecture boundaries (**must pass**)    |
| `pnpm principles:ledger` | Report every justified principle exception |
| `pnpm e2e`               | Playwright end-to-end suite                |
| `pnpm verify`            | Everything above that gates CI             |

Node version is pinned in `.nvmrc` (Angular 22 needs ≥24.15). Run `nvm use`
first if commands fail with an engine error.

---

## Test-driven development is not optional

Every behavioural change follows red → green → refactor, in that order:

1. **Red.** Write the failing test first. Run it. _See it fail_, and confirm it
   fails for the reason you expect — a test that passes before the feature
   exists is testing nothing.
2. **Green.** Write the least code that makes it pass.
3. **Refactor.** Clean up with the test as a safety net.

Never write implementation before the test that demands it. If you are about to,
stop and write the test.

The full loop, including how to structure fixtures and what to do when a test is
hard to write, is in `.claude/skills/tdd-cycle/SKILL.md`. Use it.

### What deserves a test

The engine is deterministic — same input, same output — which makes it almost
perfectly testable. Take advantage of that:

- **Fixture-driven.** A Java snippet in `fixtures/` goes in, an expected model
  comes out. Prefer these over mocks; mocks of your own code prove nothing.
- **Every inference rule** needs a positive case, a negative case, and the
  ambiguous case you decided how to handle.
- **Every bug fix starts with the failing test that reproduces it.**

UI work: test behaviour and state, not markup details. A test asserting a CSS
class name breaks on every redesign and catches nothing.

---

## Design principles

This project follows the design principles from FIUBA's _Paradigmas de la
Programación_, applied to TypeScript. They are written out, with concrete
TypeScript examples, in:

- `.claude/rules/design-principles.md` — SOLID, DRY, KISS, YAGNI, Tell Don't
  Ask, Demeter, PoLA, EDP, KOP, SoC, coupling and cohesion
- `.claude/rules/typescript-style.md` — naming, types, error handling, file
  layout
- `.claude/rules/prohibited.md` — the hard "do not" list

Read them before writing code in this repo. They are short.

### When you must violate a principle

Sometimes the principled version is genuinely worse. That is allowed — but it
must be **argued in the code**, never silently:

```ts
// PRINCIPLE-EXCEPTION: OCP
// Why: the six UML relationship kinds are fixed by the UML specification, so
//   a closed switch is honest here — a new kind would be a spec change, not a
//   feature. Polymorphic dispatch would spread six trivial classes across six
//   files and hide the exhaustiveness check the compiler gives us for free.
// Alternative considered: a RelationshipRenderer per kind, rejected as
//   ceremony over a stable, closed set.
// Revisit: if relationship kinds ever become user-extensible.
```

The format is enforced: `PRINCIPLE-EXCEPTION: <PRINCIPLE>` followed by `Why:`,
`Alternative considered:` and `Revisit:`. `pnpm principles:ledger` collects them
all into a report, so exceptions stay visible instead of quietly accumulating.
An exception without a real argument is just a violation with extra steps.

---

## Conventions

**Everything ships in English** — code, comments, commit messages, branch names,
docs, UI copy. No exceptions. (Conversation with the user is in Spanish; the
repo is not.)

### Commits

Conventional Commits, imperative mood, explaining _why_ when it is not obvious:

```
feat(core): resolve simple type names through wildcard imports
fix(infer): treat a field assigned in a setter as aggregation, not composition
test(resolve): cover two classes sharing a simple name across packages
docs(features): document the relationship inference rules
refactor(web): extract edge routing out of the diagram component
chore(ci): run dependency-cruiser on pull requests
```

Scopes: `core`, `web`, `ci`, `docs`, `harness`, or a pipeline stage (`parse`,
`resolve`, `infer`, `export`).

### Branches

`<type>/<short-kebab-description>` — `feat/type-resolution`,
`fix/nested-class-visibility`, `docs/inference-rules`.

Never commit directly to `main`. Work on a branch, open a PR, let CI run.

### Documentation

**Every feature is documented in `docs/` in the same change that ships it.** A
feature without docs is not done.

| Directory        | Holds                                                           |
| ---------------- | --------------------------------------------------------------- |
| `docs/features/` | One page per user-facing feature: what it does, how, edge cases |
| `docs/adr/`      | Architecture Decision Records — decisions and their _why_       |
| `docs/internal/` | Contributor-facing: pipeline internals, harness, roadmap        |

ADRs are append-only. Superseding a decision means a new ADR that links back,
never editing history to look smarter than you were.

---

## Working with subagents

This repo is built with a small crew. As the orchestrator, your job is to route
work and **review it**, not to do everything yourself.

| Agent                       | For                                    | Model  |
| --------------------------- | -------------------------------------- | ------ |
| `java-fixture-author`       | Writing Java fixture files             | haiku  |
| `core-engineer`             | Pipeline modules, TDD                  | sonnet |
| `ui-engineer`               | Angular components, design system      | sonnet |
| `docs-writer`               | Feature docs, ADRs, README sections    | haiku  |
| `design-principles-auditor` | Read-only audit against the principles | opus   |

Match the model to the difficulty. Writing twenty Java fixture classes is
mechanical — haiku does it well and fast. Designing the type resolver is not —
that is where the thinking budget belongs.

**Trust but verify.** An agent's summary reports what it _intended_. Read the
actual diff before calling the work done, and run `pnpm verify` yourself. A
green summary from an agent is not evidence; a green terminal is.

Parallelise only genuinely independent work. Two agents editing the same module
will produce a merge you have to untangle by hand.

---

## Things that will waste your time

- **Do not reach for `@angular/animations`.** Deprecated since 20.2, slated for
  removal in v23. Use the native `animate.enter` / `animate.leave` in core, and
  `motion` for anything spring-physics driven.
- **Do not add a backend.** The absence of one is a feature: the user's source
  code never leaves their machine. If something seems to need a server, it
  probably needs a Web Worker.
- **Do not put analysis logic in a component.** If it can be unit-tested without
  a DOM, it belongs in `packages/core`.
- **Do not let the parser leak upward.** Tree-sitter node types must not escape
  `core/src/parse/`. Everything downstream works on our own model types, so the
  parser stays swappable — `java-parser` is a proven fallback.
- **Do not guess at API surfaces.** Verify against the installed version before
  using something. This project was built on measured facts, not recalled ones.
