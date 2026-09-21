# 3. Resolve types with our own symbol table

- **Status:** accepted
- **Date:** 2026-09-21

## Context

A parser gives you syntax, not semantics. Tree-sitter reports that a field is
declared with type `Engine`. It does not report _which_ `Engine` — the one in
this file's package, one pulled in by an import, or one of several classes in
the project sharing that simple name.

Every relationship on the diagram depends on answering that question. An edge
from `Car` to `Engine` is only correct if both endpoints are the types the
compiler would have chosen. Get it wrong and the diagram is confidently,
invisibly incorrect: a plausible edge pointing at the wrong class.

Java's own resolution rules are well defined but not trivial. A simple name is
matched against, in order of precedence:

1. Nested and inner types of the enclosing class (`Outer.Inner`)
2. Explicit single-type imports — `import com.example.Engine;`
3. Types declared in the same package, with no import needed
4. Wildcard on-demand imports — `import com.example.*;`
5. Implicit `java.lang` — `String`, `Integer`, `Object`

The ordering matters and is easy to get backwards. The Java Language
Specification (§7.5.2) makes a single-type import **shadow** an on-demand one,
so an explicit `import a.Engine;` wins over `import b.*;` even when `b` also
contains an `Engine`. Resolving in the wrong order produces edges that point at
real classes, which makes the bug look like a modelling disagreement rather than
a defect.

Ambiguity is not an edge case. Two wildcard imports can both offer the same
simple name — which is a compile error in Java, but Barista sees only source and
must still produce something useful. Types from libraries cannot be resolved at
all, because there is no jar to look inside (see
[ADR 0001](0001-client-side-only.md)).

## Decision

Build a symbol table in `core/src/resolve/` that implements Java's resolution
order, and treat unresolved and ambiguous names as **data rather than failures**.

**Resolution order** follows the list above, single-type imports beating
wildcards.

**Three outcomes, all explicit.** A simple name resolves to exactly one project
type, resolves to a known external type, or fails to resolve. Each is a distinct
result the rest of the pipeline can reason about — never an exception, and never
a silent guess.

**Unresolvable is normal.** Real archives reference `java.util`, Spring,
JUnit and libraries we will never see. An unresolvable type emits a
`Diagnostic` the UI can surface, and analysis continues. One unknown type must
never abort the other 400 files.

**External types are not diagram nodes.** This is a product decision as much as
a technical one. `List<Customer>` must not put a `List` box on the canvas — it
yields an association from the owner to `Customer` with multiplicity `0..*`. A
diagram that renders every `java.util` class is technically faithful and
practically useless; the interesting structure drowns in framework noise.

**Ambiguity is reported, not resolved by coin flip.** When a simple name matches
two project types, the analysis records both candidates in a `Diagnostic` and
declines to draw a confident edge. Being visibly unsure beats being invisibly
wrong.

## Consequences

**What this buys**

Edges point at the types the compiler would have picked, which is the difference
between a diagram you can trust and a diagram that looks right.

Diagnostics give the UI something honest to show. "3 types could not be
resolved" is information a user can act on; a silently smaller diagram is not.

Filtering external types keeps diagrams readable on real projects without any
user configuration.

**What it costs**

This is the most intricate part of the engine, and the part most likely to
harbour subtle bugs. It needs the heaviest fixture coverage — one scenario per
resolution path, plus the ambiguous cases — which is why
`.claude/agents/java-fixture-author.md` lists them explicitly.

"External" is decided by heuristic: a type that resolves to no project source
file. A missing file therefore looks identical to a library type. Usually
harmless, occasionally confusing when someone uploads a partial archive and
wonders where their class went — the diagnostics exist to make that visible.

Generic type parameters (`T`, `E`) must be tracked per declaration and excluded
from resolution, or they become phantom types on the diagram.

Resolution runs after all files are parsed, since a type can reference a class
declared anywhere in the archive. The pipeline cannot stream file by file.

## Alternatives considered

**Match on simple names only, ignoring packages.** Far simpler, and correct for
small single-package projects — which describes a lot of coursework. Rejected
because it fails exactly where a diagram is most valuable: a multi-package
project, which is the case worth diagramming. It would silently merge two
distinct classes that happen to share a name.

**Bundle a JDK type index** so `java.util` and friends resolve properly.
Rejected as YAGNI for now. External types are not drawn, so resolving them fully
buys little beyond nicer multiplicity handling for a handful of collection
types, which a small allowlist covers. Worth revisiting if external types ever
need to appear on the diagram.

**Use a real Java compiler front end** for exact semantics. Rejected for the
same reason as in ADR 0002: enormous payload, heavy build toolchain, and
resolution accuracy well beyond what a class diagram requires.

**Defer resolution and let inference work on raw names.** Rejected because it
pushes ambiguity into the inference rules, where it would be handled
inconsistently by each of them. Resolving once, centrally, with explicit
outcomes keeps the hard problem in one place.
