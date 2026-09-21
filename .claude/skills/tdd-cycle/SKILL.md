---
name: tdd-cycle
description: Use when implementing any feature, bug fix, or behavioural change in this repo - enforces the red/green/refactor loop, fixture conventions, and what to do when a test is hard to write. TDD is mandatory here, so this applies before writing any implementation code.
---

# The TDD cycle

TDD is not negotiable in this repo. The order — test first, then code — is the
whole point: it forces you to define the behaviour before you are emotionally
invested in an implementation, and it guarantees the test actually exercises
what you think it does.

## The loop

### 1. Red — write the failing test, and watch it fail

```bash
pnpm test:watch
```

Write the smallest test that expresses the next piece of behaviour. Run it.
**Confirm it fails, and that it fails for the right reason.**

This step is skipped more than any other, and skipping it is how you end up with
a test that passes against an empty implementation. A test you have never seen
fail is not evidence of anything.

If it fails with `ReferenceError: X is not defined`, good — that is the expected
red. If it fails because of a typo in the test itself, fix that first and get
back to an honest red.

### 2. Green — the least code that passes

Not the elegant version. Not the general version. The least code that turns the
test green. Hardcoding a return value is legitimate here if the test does not
yet demand more — the next test will force the generalisation.

### 3. Refactor — with the net in place

Now clean up: extract, rename, remove duplication, apply the principles from
`.claude/rules/design-principles.md`. The tests stay green throughout. If they
go red, you changed behaviour, not structure — undo and separate the two.

Then commit. One logical change per commit.

---

## Fixtures over mocks

The engine is deterministic — the same Java in, the same model out. That makes
real fixtures both possible and clearly better than mocks.

```
fixtures/
  <scenario-name>/
    src/…/*.java        the Java input
    expected.json       the model the pipeline should produce
    README.md           what this scenario proves, in two lines
```

A fixture directory is a specification. When someone asks "does Barista handle
wildcard imports?", the answer is a directory named `wildcard-imports`, not a
paragraph.

**Do not mock our own code.** A test where `resolve` is mocked to return the
right answer proves that mocks work, which nobody doubted. Mock only genuine
boundaries you do not control — and this project has almost none, because it has
no backend.

## What each inference rule owes you

Every rule in `core/src/infer/` needs three tests before it is done:

1. **The positive case** — the situation the rule exists to catch.
2. **The negative case** — a situation that looks similar but must _not_ match.
   This is the test that catches over-eager rules, and it is the one most often
   missing.
3. **The ambiguous case** — the situation where the rule genuinely cannot be
   sure. Assert on whatever you decided: a `Diagnostic`, a lower-confidence
   classification, a fallback. The point is that the ambiguity was a decision,
   not an accident.

Composition-vs-aggregation is heuristic by nature. The tests are where that
heuristic is pinned down and made reviewable.

## Bug fixes start red

A bug means a test was missing. Write the test that reproduces it, watch it
fail, then fix it. The regression test is the deliverable; the fix is almost
incidental.

## When a test is hard to write

Difficulty writing a test is a design signal, not an obstacle to route around.

| The pain                                | What it usually means                                   |
| --------------------------------------- | ------------------------------------------------------- |
| Needs elaborate setup                   | Too many dependencies — inject fewer, or split the unit |
| Needs to reach into internals to assert | The public surface is wrong, or the unit does too much  |
| Needs a DOM for logic                   | The logic belongs in `packages/core`                    |
| Needs to mock our own modules           | The dependency should be a parameter (EDP)              |
| Breaks whenever unrelated code changes  | Testing implementation instead of behaviour             |

Fix the design, not the test.

## UI tests

Test behaviour and state, never markup. An assertion on a CSS class breaks at
every redesign and catches nothing.

```ts
// Bad — couples the test to styling.
expect(host.querySelector('.rounded-2xl')).toBeTruthy();

// Good — asserts what the user actually gets.
expect(component.visibleRelationships()).toHaveLength(3);
```

Reach for Playwright (`pnpm e2e`) when the value is in the integration: dropping
a real zip, seeing a real diagram. Keep that suite small and meaningful — E2E
tests are slow, and a hundred of them will make you stop running any of them.

## Before you call it done

```bash
pnpm verify
```

Format, lint, typecheck, architecture boundaries, and the full unit suite. A
green terminal is evidence. "I believe it works" is not.
