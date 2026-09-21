## What this changes

<!-- One paragraph. What behaviour is different after this merges? -->

## Why

<!-- The reason, not the restatement. Link an issue if there is one. -->

## How to check it

<!-- The steps a reviewer follows to see it working. A Java snippet that
     demonstrates the change is worth more than a description of it. -->

---

## Checklist

- [ ] **Test written first.** The failing test came before the implementation,
      and I watched it fail for the right reason.
- [ ] `pnpm verify` passes locally (format, lint, typecheck, boundaries, tests).
- [ ] **Docs updated in the same change.** Feature pages in `docs/features/`,
      and an ADR in `docs/adr/` if this decided something architectural.
- [ ] Any principle violation carries a `PRINCIPLE-EXCEPTION` block with a real
      argument, and `pnpm principles:ledger` reports it as well-formed.
- [ ] Commits follow Conventional Commits, in English, imperative mood.
- [ ] Branch name follows `<type>/<short-kebab-description>`.
- [ ] No analysis logic added to an Angular component — it belongs in
      `packages/core`.
- [ ] `packages/core` gained no dependency on Angular, the DOM, or `apps/web`.

## Notes for the reviewer

<!-- Anything you are unsure about, a trade-off you made, something you
     deliberately left out. Saying "I could not decide between X and Y" is more
     useful than picking one silently. -->
