---
name: ship-feature
description: Use when delivering any change to this repo end to end - from branching through TDD, documentation, verification and the pull request. Covers what "done" means here and the order things happen in.
---

# Shipping a feature

The full path from idea to merged. Skipping steps here is how a repo rots, so
the list is short on purpose — every item earns its place.

## 1. Branch

Never work on `main`.

```bash
git switch -c feat/type-resolution
```

`<type>/<short-kebab-description>`, English, where type is `feat`, `fix`,
`refactor`, `docs`, `test` or `chore`.

## 2. Understand before you change

If you are touching code you did not just write, read it first. This repo is
indexed with CodeGraph, which answers "what calls this and what does it call" in
one shot rather than a dozen greps:

```bash
codegraph explore "TypeRegistry resolution"
```

## 3. Build it, test first

Follow `.claude/skills/tdd-cycle/SKILL.md`. The short version: failing test,
watch it fail, minimum code to pass, refactor with the tests green.

Keep commits small and logical. One reason per commit — a commit that does two
things cannot be reverted cleanly when one of them turns out to be wrong.

```
feat(resolve): prefer explicit imports over wildcard imports

Java's JLS §7.5.2 makes a single-type import shadow an on-demand one.
Resolving in the other order silently picked the wrong type whenever a
wildcard import happened to contain a matching simple name.
```

The body explains _why_. The diff already shows what.

## 4. Document it

**A feature without documentation is not done.** In the same branch:

- `docs/features/<feature>.md` for anything a user can see or touch, including
  the limitations section — especially the limitations section
- `docs/adr/NNNN-<decision>.md` when you made an architectural decision worth
  a future reader's time
- Update the README if the change alters what the project _is_ or how it is run

Delegate this to the `docs-writer` agent when the change is substantial. Review
what comes back against the actual code.

## 5. Verify, for real

```bash
pnpm verify
```

Format, lint, typecheck, architecture boundaries, full unit suite. Then, if you
touched the UI, actually open it:

```bash
pnpm dev
```

Type checking proves the code compiles. It does not prove the feature works.
Drop a real zip in, look at the diagram, try the edge case you were worried
about. "The tests pass" and "the feature works" are different claims, and only
one of them is evidence for the other.

If you added a principle exception, confirm it is well-formed:

```bash
pnpm principles:ledger
```

## 6. Pull request

```bash
git push -u origin feat/type-resolution
gh pr create --title "feat(resolve): prefer explicit imports over wildcards" --body "…"
```

The description covers: what changed, why, how it was tested, and anything a
reviewer should look at closely. Link the ADR if there is one. Screenshots or a
short clip for UI work — a diagram change is much faster to review as an image
than as a diff.

CI runs `pnpm verify` on the PR. Green CI is the floor, not the goal.

---

## What "done" means here

Work through this honestly before claiming a feature is finished:

- [ ] Tests were written **before** the implementation, and seen to fail first
- [ ] Positive, negative and ambiguous cases all covered
- [ ] `pnpm verify` passes — output seen, not assumed
- [ ] UI changes exercised in a real browser
- [ ] Documented in `docs/`
- [ ] Principle exceptions argued in code, ledger clean
- [ ] Commits and branch in English, Conventional Commits format
- [ ] No `console.log`, no `.only`, no commented-out code left behind
- [ ] Nothing committed that `.gitignore` should have caught

If an item does not apply, say so explicitly rather than quietly skipping it.
