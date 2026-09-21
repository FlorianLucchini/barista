# 2. Parse Java with tree-sitter

- **Status:** accepted
- **Date:** 2026-09-21

## Context

Barista needs to turn Java source into a syntax tree in the browser. Two
candidates were viable, and both were measured against 471 real Java files
(1,416 KB) before choosing.

|                  | `java-parser` 3.0.1                     | `web-tree-sitter` 0.27.0 + `tree-sitter-java` 0.23.5    |
| ---------------- | --------------------------------------- | ------------------------------------------------------- |
| Parse 471 files  | 718 ms                                  | **203 ms**                                              |
| Average per file | 1.5 ms                                  | 0.43 ms                                                 |
| Payload, gzipped | **62 KB**, single JS file               | ~155 KB (84 KB runtime wasm, 21 KB glue, 50 KB grammar) |
| Browser setup    | zero polyfills, zero console errors     | needs `.wasm` served and `locateFile` configured        |
| Extraction model | hand-written walk over a Chevrotain CST | declarative S-expression queries                        |
| Last release     | Aug 2025                                | runtime Aug 2026, grammar Dec 2024                      |

Both parsed Java 21 completely: generics, `record`, `sealed`/`permits`, nested
and inner classes, annotations, varargs, switch expressions, multiple
`implements`. Neither failed on any file in the corpus.

On raw numbers this is not obviously decisive. `java-parser` is 2.5× lighter and
simpler to deploy; tree-sitter is 3.5× faster, which barely matters when the
slower option already finishes a large project in under a second.

The decision came from the extraction code instead. A working extractor was
built on `java-parser` — pulling out type names, `extends`, `implements`, field
types and nested generic arguments — and it took roughly 200 lines of manual CST
traversal. The equivalent in tree-sitter was a four-line query.

More importantly: **the hand-written walker silently missed nested classes on
its first pass, and the query did not.** It produced a plausible result with
`InnerBay` and `StaticNested` quietly absent. Nothing threw, nothing warned;
the diagram would simply have been missing types, and nobody would have known
which ones.

That is the failure mode this project can least afford. Relationship inference
is built on top of extraction, and a type that never enters the model cannot
produce a wrong edge — it produces a missing one, which is far harder to notice
than an incorrect one.

## Decision

Parse with `web-tree-sitter` loading the `tree-sitter-java` grammar, and extract
using tree-sitter queries rather than manual traversal.

The parser is confined to `core/src/parse/`. Tree-sitter node types never appear
downstream — `pnpm deps:check` enforces this with the `parser-does-not-leak`
rule. Everything after parsing consumes Barista's own model types.

The WebAssembly payload is loaded lazily, on first analysis, not at page load.
Nobody pays 155 KB for visiting the landing page.

## Consequences

**What this buys**

Extraction is declarative, which makes it far harder to get quietly wrong. A
query states which shapes to match; it cannot forget a branch of the tree the
way a hand-written recursive walk can.

Parsing is fast enough to be invisible — 0.43 ms per file average, 3.16 ms at
the slowest — leaving the performance budget for type resolution and layout,
which is where it is actually needed.

Adding support for a new syntactic construct usually means adding a query, not
extending a traversal.

**What it costs**

The build has to ship and serve two `.wasm` files, and the loader needs
`locateFile` pointed at them. They must be served as `application/wasm`;
anything else and the browser refuses to stream-compile, falling back to a
slower path that is unpleasant to diagnose. The nginx configuration sets this
explicitly for that reason.

**The Emscripten glue uses direct `eval`.** Rolldown warns about it at build
time, and a strict Content Security Policy without `unsafe-eval` breaks parsing
entirely. This rules out the CSP a static site would otherwise want. The
deployed nginx config deliberately ships no CSP header and documents why.

The grammar's last release was December 2024. Java syntax is stable and it
handles Java 21 completely, so this is tolerable — but it is a dependency moving
slowly enough to keep an eye on.

Roughly 93 KB more gzipped payload than the alternative, deferred to first use.

## Alternatives considered

**`java-parser` 3.0.1.** Lighter, simpler to deploy, no WebAssembly, no `eval`,
no CSP conflict. Rejected on extraction ergonomics and the nested-class miss
described above — but it remains a **proven fallback**, not a hypothetical one:
full extraction was implemented and working on it before the switch, including
recovering nested generic arguments from `Map<String, List<Truck>>` and
detecting inline `new` expressions for the composition signal. The
`parser-does-not-leak` boundary exists specifically so this door stays open.

**Compiling a Java parser to WebAssembly ourselves** (JavaParser via TeaVM, or
similar). Rejected outright: a far larger payload, a build toolchain nobody
wants to maintain, and no advantage over a grammar that already works.

**Regular expressions over the source.** Genuinely considered and dismissed
quickly. Java's grammar defeats it — nested generics, annotations, comments
containing code, strings containing braces. It would work on the examples and
fail on real projects.
