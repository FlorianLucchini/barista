# Roadmap

Where the project actually is, and what comes next. This file is honest about
what does not exist yet — a roadmap that reads like a feature list is a
marketing page, and nobody can plan against one.

**Current state: phase 0 complete.** The repository, harness, conventions and
infrastructure exist. No analysis code has been written yet.

---

## Phase 0 — Foundations ✅

Repository scaffolding, tooling and the rules everything else inherits.

| Item                                       | State       |
| ------------------------------------------ | ----------- |
| Monorepo layout, pnpm workspaces           | done        |
| `CLAUDE.md`, rules, skills, agents         | done        |
| Design principles and the exception ledger | done        |
| `dependency-cruiser` boundary enforcement  | done        |
| Docker image and compose preview           | done        |
| CI and GitHub Pages deployment             | done        |
| ADRs 0001–0004                             | done        |
| Angular app and core package scaffolding   | in progress |

---

## Phase 1 — The engine

Everything in `packages/core`. Pure TypeScript, strict TDD, no UI.

The stages depend on each other in order, so they land in order. Each one is
done when its fixtures pass and its behaviour is documented.

| Stage     | What it does                      | Notes                                                                              |
| --------- | --------------------------------- | ---------------------------------------------------------------------------------- |
| `zip`     | `ArrayBuffer` → `SourceFile[]`    | `fflate`. Filter to `.java`, enforce `BARISTA_MAX_FILES`, reject nothing silently. |
| `parse`   | `SourceFile[]` → `ParsedFile[]`   | tree-sitter queries. Must not leak node types upward.                              |
| `resolve` | `ParsedFile[]` → `TypeRegistry`   | **The hard one.** See [ADR 0003](../adr/0003-type-resolution.md).                  |
| `infer`   | `TypeRegistry` → `Relationship[]` | Six UML kinds, each carrying its evidence.                                         |
| `model`   | → `ClassDiagram`                  | The shape the UI consumes.                                                         |

The inference rules, in rough order of difficulty:

- **Generalization** and **realization** — read directly off `extends` and
  `implements`. Unambiguous once resolution works.
- **Dependency** — a type appearing only in parameters, returns or locals.
- **Association** — a type appearing as a field, with multiplicity derived from
  collection and array types.
- **Composition vs aggregation** — heuristic, and the only genuinely uncertain
  rule. Ownership is inferred from where the instance comes from: constructed
  internally suggests composition, received from outside suggests aggregation.
  This needs the fullest fixture coverage of anything in the project, including
  the case where a field is both constructed _and_ assigned from a setter.

Every relationship carries `Evidence`: the file, the line, and a
human-readable reason. This is part of the return type from the first test, not
a later addition — the tool's ability to explain itself is the feature.

---

## Phase 2 — The interface

Everything in `apps/web`. Angular 22, zoneless, signals.

- Design system: tokens, type scale, elevation, motion. Documented in
  `docs/internal/design-system.md` before components are built on it.
- Archive intake — drag and drop, file picker, honest progress while a large
  project is processed.
- Web Worker wiring so analysis and layout never touch the main thread.
- Diagram canvas: SVG rendered by us, ELK for layout, `d3-zoom` for pan and
  zoom via a single root transform.
- The six UML relationship notations — hollow triangle, dashed triangle, filled
  diamond, hollow diamond, plain line, dashed arrow — with multiplicity labels.
- The inspector panel, where an edge explains why it was classified as it was.
  This is the feature that makes Barista a study aid rather than a picture
  generator.
- Diagnostics surfaced visibly: unresolved types, ambiguous names, skipped
  files.

---

## Phase 3 — Output and hardening

- **Text exports** — Mermaid and PlantUML. All six relationship kinds map
  cleanly to both (`<|--`, `<|..`, `*--`, `o--`, `-->`, `..>`), it is roughly
  40 lines with no dependencies, and it is ideal TDD material. Likely the
  easiest real value in the project.
- **Image exports** — SVG is near-free since we own the markup. PNG needs
  canvas rasterisation with fonts and styles inlined.
- **Playwright end-to-end tests.** None exist today. The CI workflow documents
  their absence rather than running an empty suite and reporting green. Enabling
  them means adding Playwright to `apps/web`, writing specs for the real path
  (drop a zip, get a diagram), and adding a CI job that installs Chromium.
- **Filtering by package**, which is the intended answer to large projects
  rather than faster layout. Past ~250 classes a single canvas is unreadable
  however well it is laid out.
- Accessibility pass: keyboard navigation of the diagram, focus order, contrast,
  `prefers-reduced-motion` honoured throughout.

---

## Possible future tools

**Not commitments.** Barista is a toolkit, so the shape allows more than one
tool — but YAGNI applies, and each of these gets built only when there is a
concrete need behind it. Recorded here so the idea is not lost, not so it is
scheduled.

- **Package dependency graph** — the same engine, aggregated to package level.
  Would answer "does my model package depend on my view package?" directly. The
  cheapest of these, since it reuses the whole pipeline.
- **Design principle checker** — flag likely violations in uploaded Java: fat
  interfaces, feature envy, god classes. Natural fit for the project's origin,
  but heuristic-heavy, and a checker with a high false-positive rate is worse
  than none.
- **Coupling and cohesion metrics** — afferent and efferent coupling per class,
  computed from relationships already inferred.
- **Sequence diagram sketching** from method bodies. Considerably harder than it
  sounds: it needs call-graph analysis and control flow, not just declarations.
  Listed mostly to record that it was considered.

---

## Known limitations, permanently

These follow from the architecture rather than from unfinished work. They are
listed so nobody plans around fixing them cheaply.

- **No dependency resolution.** Source only — no `.class` files, no jars, no
  Maven or Gradle graph. Library types are classified as external and kept off
  the diagram. ([ADR 0001](../adr/0001-client-side-only.md))
- **Browser-bound resources.** Very large projects compete with the tab.
- **Composition vs aggregation is a heuristic**, and UML itself is ambiguous
  here. Barista shows its reasoning and allows correction rather than claiming
  certainty it does not have.
- **No strict CSP** on the deployed site, because the tree-sitter runtime's
  Emscripten glue uses `eval`. ([ADR 0002](../adr/0002-tree-sitter-for-parsing.md))
