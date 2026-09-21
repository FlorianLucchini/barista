# Prohibited

The hard "do not" list. Most of these are enforced by ESLint,
`dependency-cruiser` or a hook — the rest are enforced by review.

If you believe a case genuinely warrants breaking one of these, it needs a
`PRINCIPLE-EXCEPTION` block (see `design-principles.md`). Items marked
**never** are not negotiable and have no exception path.

---

## Architecture

- **never** — `packages/core` importing `@angular/*`, `apps/web`, or anything
  DOM-only. It has to run in a Worker and in Node. Enforced by `pnpm deps:check`.
- **never** — adding a backend, an upload endpoint, or any network call that
  carries user source code off the machine. The absence of a server is the
  product's main privacy guarantee, not an implementation detail.
- Analysis logic inside an Angular component. If it can be tested without a DOM,
  it belongs in `packages/core`.
- Tree-sitter types escaping `core/src/parse/`. Downstream code works on our own
  model types so the parser stays swappable.

## State

- Module-level mutable state (`let` at module scope, mutable exported objects,
  singletons holding data). Constants are fine: `const MAX_FILES = 2000`.
  Hidden state makes tests order-dependent and dependencies invisible — it
  breaks the Explicit Dependencies Principle.
- Mutating function parameters. Return new values.

## Types

- `any`. Use `unknown` and narrow, or write the type. ESLint errors on it.
- Type assertions (`as Foo`) used to silence the compiler rather than to express
  a fact the compiler cannot know. `as unknown as Foo` is always wrong.
- Non-null assertions (`!`) on values that can genuinely be null. Handle it.
- `instanceof` chains or `kind` switches used _instead of_ polymorphism where
  the set of cases is open. Closed sets fixed by an external spec (the six UML
  relationship kinds) are the legitimate case — and a discriminated union with
  an exhaustiveness check is better than `instanceof` there anyway.

## Shape of code

- Functions longer than ~40 lines, or with more than 3 levels of nesting. Both
  are symptoms — usually a function doing several things. Extract.
- Files longer than ~300 lines. Same reasoning, one level up.
- Boolean parameters that select behaviour (`render(diagram, true)`). The call
  site becomes unreadable. Two functions, or an options object with a named
  field.
- Comments explaining _what_ the code does. Name things better instead. Comments
  earn their place by explaining _why_: a constraint, a trade-off, a subtlety
  that would otherwise surprise a reader.

## Testing

- Implementation written before its failing test. This is TDD; the order is the
  point.
- `.skip`, `.only` or commented-out tests committed. A test worth disabling is
  worth fixing or deleting.
- Mocking our own code to test our own code. Use real fixtures — the engine is
  deterministic, so there is rarely an excuse.
- Asserting on CSS class names or DOM structure in UI tests. Test behaviour;
  markup is allowed to change.

## Angular specifics

- **never** — `@angular/animations`. Deprecated since 20.2, removal announced
  for v23. Use native `animate.enter` / `animate.leave`, and `motion` for
  spring-driven animation.
- `NgModule`. Standalone components only.
- `*ngIf` / `*ngFor`. Use `@if` / `@for` control flow.
- Subscribing to observables in components without teardown. Prefer signals;
  where a stream is genuinely right, use `takeUntilDestroyed`.
- `ViewEncapsulation.None` to "just make the style work". It leaks globally and
  the next person pays.

## Repository hygiene

- Committing directly to `main`.
- Commit messages, branch names, code, comments or docs in Spanish. The repo is
  public and ships in English. (Talking to the user is Spanish; the repo is not.)
- Committing a feature without its `docs/` page.
- Leaving `console.log` behind. Structured logging or nothing.
- Committing `.env`, credentials, or anything from `.gitignore`.
- `--no-verify` to get past a failing hook. Fix the reason it failed.
