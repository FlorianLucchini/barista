# Design principles

The principles taught in FIUBA's _Paradigmas de la Programación_, translated to
the TypeScript this repo is written in. They are not decoration: `pnpm verify`
and code review both check against them, and violating one requires a written
argument in the code (see "Justified exceptions" at the end).

Read this once before writing code here. It is deliberately short.

---

## The two that everything else serves

Every principle below is a tactic. These two are the goal.

### Low coupling

A module should depend on as little as possible, and on abstractions rather than
details. The test: _if I change this file, how many other files must I open?_

The flagship example in this repo is the `core` / `web` boundary. The engine
does not import Angular, so the engine can be tested in Node, run in a Worker,
and survive a UI rewrite. That property is worth more than any convenience an
import would buy.

### High cohesion

Everything inside a module belongs together and serves one purpose. The test:
_can I describe what this file does in one sentence, without "and"?_

`resolve/symbol-table.ts` — "maps simple type names to fully-qualified names".
One sentence, no "and". Good. A file that parses **and** resolves **and** caches
is three files wearing a trenchcoat.

---

## SOLID

### S — Single Responsibility

A module has one reason to change. Our pipeline stages exist precisely so that a
change to the parser does not ripple into inference.

```ts
// Bad: two reasons to change — the UML spec, and the file format.
class DiagramExporter {
  toMermaid(d: ClassDiagram): string {
    /* ... */
  }
  downloadAsFile(text: string): void {
    /* ... */
  } // ← DOM, not export logic
}

// Good: serialisation is pure and testable; saving is the UI's problem.
function toMermaid(diagram: ClassDiagram): string {
  /* ... */
}
```

### O — Open/Closed

Open for extension, closed for modification. Adding a new **inference rule**
must not mean editing the inference engine — rules are registered, and the
engine iterates over them.

```ts
export interface InferenceRule {
  readonly id: string;
  appliesTo(candidate: FieldCandidate): boolean;
  infer(candidate: FieldCandidate): Relationship | null;
}

// Adding composition detection = adding a rule to the array. The engine
// never changes.
const rules: readonly InferenceRule[] = [compositionRule, aggregationRule /* … */];
```

Note the honest limit: OCP applies where the set is genuinely open. The six UML
relationship _kinds_ are fixed by the spec — a closed union type is correct
there, and pretending otherwise is ceremony. Extend what varies; close what does
not.

### L — Liskov Substitution

A subtype must be usable anywhere its supertype is, without surprises. In
TypeScript the usual violation is an implementation that throws for part of the
interface it claims to satisfy:

```ts
// Violation: Bicycle is not substitutable for Vehicle.
class Bicycle implements Vehicle {
  startEngine(): void {
    throw new Error('bicycles have no engine');
  }
}
```

If you need that `throw`, the interface is wrong, not the class. Split it — which
is exactly ISP.

### I — Interface Segregation

Many small interfaces beat one fat one. Clients should not depend on methods
they never call. A `Parser` that only ever needs `parse()` should not be handed
an object with twelve methods.

### D — Dependency Inversion

Depend on abstractions, not concretions — and let the high-level policy define
the abstraction, not the low-level detail.

```ts
// The engine defines what it needs; tree-sitter conforms to it.
export interface JavaParser {
  parse(source: SourceFile): ParsedFile;
}
```

This is what keeps `java-parser` a viable fallback: nothing downstream of
`core/src/parse/` knows which parser produced the result.

---

## The rest

### DRY — Don't Repeat Yourself

Every piece of knowledge has one authoritative representation. Note _knowledge_,
not _characters_: two functions that happen to look alike but change for
different reasons are not duplication, and merging them couples things that
should move independently. Duplicated **logic** is a bug waiting to be fixed in
only one place.

### KISS — Keep It Simple

The simplest thing that works, wins. Clever code is a loan against your future
self's afternoon.

### YAGNI — You Aren't Gonna Need It

Build what the current requirement demands. No speculative abstraction layers,
no "we might need a plugin system later". When later arrives, you will know more
than you do now.

### Tell, Don't Ask

Tell an object what you want; do not interrogate it and decide on its behalf.
Pulling data out of an object to make a decision about it means that decision
belongs _inside_ the object.

```ts
// Ask: the caller reaches in and decides.
if (relationship.kind === 'composition' && relationship.evidence.length > 0) {
  label = relationship.evidence[0].summary;
}

// Tell: the object answers for itself.
const label = relationship.describe();
```

### Principle of Least Knowledge (Demeter)

Talk to your immediate collaborators, not to their internals.
`a.getB().getC().doThing()` couples you to the shape of a graph you do not own.
Each `.` past the first is a dependency you did not mean to take.

### Principle of Least Astonishment

Code should do what its name promises, and nothing more. A getter that mutates,
a `validate()` that also saves, a constructor that fires a network request —
each is a small betrayal that costs someone an hour later.

### Explicit Dependencies Principle

A unit must declare everything it needs, in its constructor or parameters. No
reaching for globals, singletons or module-level mutable state.

```ts
// Hidden dependency: untestable, and the signature lies about what it needs.
function resolve(name: string): string {
  return globalRegistry.lookup(name);
}

// Explicit: the signature tells the whole truth, and tests inject a fake.
function resolve(name: string, registry: TypeRegistry): string {
  /* … */
}
```

### Knuth's Optimization Principle

"Premature optimization is the root of all evil." Measure first. This repo's
stack was chosen from measured numbers, and performance work should be too. If
you optimise something, the commit message states the before and after.

### Separation of Concerns

Parsing is not resolution, resolution is not inference, inference is not
rendering. The directory layout under `packages/core/src/` is this principle
made physical — keep it that way.

---

## Justified exceptions

Sometimes the principled version is genuinely worse. That is allowed, but it is
argued in the code, never silent:

```ts
// PRINCIPLE-EXCEPTION: DRY
// Why: the Mermaid and PlantUML serialisers look similar today, but they track
//   two independent external specifications. Merging them would couple our
//   output to whichever spec changes first.
// Alternative considered: a shared template with per-dialect tokens; rejected
//   because the shared abstraction would have to grow a flag per divergence.
// Revisit: if a third dialect appears and all three still agree.
```

Required fields, in order: `PRINCIPLE-EXCEPTION: <NAME>`, `Why:`,
`Alternative considered:`, `Revisit:`.

`pnpm principles:ledger` collects every one of these into a report, so they stay
visible instead of quietly breeding. An exception without a genuine argument is
a violation with extra paperwork — and review will treat it as one.
