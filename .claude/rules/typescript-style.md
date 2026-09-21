# TypeScript style

Conventions specific to this repo. Formatting is Prettier's job — do not argue
with it, run `pnpm format`. What follows is about the decisions Prettier cannot
make for you.

---

## Naming

Names are the primary documentation. Spend time on them.

| Thing                      | Convention        | Example                        |
| -------------------------- | ----------------- | ------------------------------ |
| Types, interfaces, classes | `PascalCase`      | `TypeRegistry`, `Relationship` |
| Functions, variables       | `camelCase`       | `resolveSimpleName`            |
| Compile-time constants     | `SCREAMING_SNAKE` | `MAX_FILES`                    |
| Files                      | `kebab-case.ts`   | `symbol-table.ts`              |
| Test files                 | `*.spec.ts`       | `symbol-table.spec.ts`         |
| Angular components         | `*.component.ts`  | `diagram-canvas.component.ts`  |

No Hungarian notation, no `I` prefix on interfaces, no `_` prefix for "private"
— use the `private` keyword or `#field`.

Booleans read as predicates: `isResolved`, `hasEvidence`, `canInfer`. Functions
that return something read as nouns or questions; functions that do something
read as verbs.

Avoid abbreviations that are not universal. `rel` costs the reader a beat that
`relationship` does not; `id`, `url` and `ast` are fine.

## Types

Prefer `type` for unions and object shapes, `interface` for contracts that
something implements. Both are fine; be consistent within a file.

Model the domain precisely. Make illegal states unrepresentable:

```ts
// Weak: nothing stops kind:'generalization' with a multiplicity.
type Relationship = {
  kind: string;
  multiplicity?: string;
};

// Strong: the union encodes what can actually coexist.
type Relationship =
  | { kind: 'generalization'; from: TypeId; to: TypeId; evidence: Evidence }
  | {
      kind: 'association';
      from: TypeId;
      to: TypeId;
      multiplicity: Multiplicity;
      evidence: Evidence;
    };
```

Use `readonly` liberally — on properties, and `readonly T[]` for arrays that
callers must not mutate. The engine is a pipeline of pure transformations;
immutability is the default, not a special case.

Exhaustiveness is checked, never assumed:

```ts
function describe(r: Relationship): string {
  switch (r.kind) {
    case 'generalization':
      return '…';
    case 'association':
      return '…';
    default: {
      const unreachable: never = r; // compile error if a case is added
      throw new Error(`unhandled relationship kind: ${JSON.stringify(unreachable)}`);
    }
  }
}
```

## Functions

Pure by default in `packages/core`. Same input, same output, no side effects —
that is what makes the engine testable and what lets it run in a Worker.

Keep parameter lists short. Past three, take an options object with named
fields; the call site becomes self-documenting.

Return early to keep the happy path flat rather than nesting it inside
conditionals.

## Errors

Distinguish two categories, and treat them differently:

**Bugs** — a broken invariant, something that should be impossible. `throw`.
The stack trace is for us.

**Expected failure** — malformed Java, an unresolvable type, a corrupt zip.
These are _data_, not exceptions: the user needs to see them in the UI, and one
bad file must not abort the analysis of 400 good ones.

```ts
type Analysis = {
  diagram: ClassDiagram;
  diagnostics: readonly Diagnostic[]; // ← surfaced in the UI, never thrown
};
```

An unresolvable type is a normal outcome of analysing real code, not a crash.

Never swallow an error silently. If you catch it, either handle it or turn it
into a `Diagnostic`.

## Imports

Order, separated by blank lines: node builtins → external packages → workspace
packages (`@barista/core`) → relative. Within a group, alphabetical. ESLint
enforces this, `pnpm lint:fix` applies it.

No barrel file re-exporting an entire directory just for import cosmetics — it
defeats tree-shaking and hides the real dependency graph. A package's public
surface in `src/index.ts` is the exception, and it is deliberate.

No deep imports across packages. `@barista/core` exposes what it means to
expose; reaching into `@barista/core/src/resolve/internal` is a boundary
violation even though the file system allows it.

## Comments

Default to none. A comment that restates the code is noise that rots.

Write one when the _why_ is not recoverable from reading: a non-obvious
constraint, a workaround with a reason, a decision that looks wrong until you
know the context.

```ts
// Wildcard imports lose to explicit ones on ambiguity: JLS §7.5.2 makes a
// single-type import shadow an on-demand one, so we resolve in that order.
```

That comment earns its keep. `// increment the counter` does not.

JSDoc on the public API of `packages/core` (anything exported from
`src/index.ts`), because that is a contract other code relies on. Internal
functions get good names instead.
