# Testing Standards

## Organization

- Co-located (`feed-service.ts` + `feed-service.test.ts`) and `__tests__/` subdirectories both occur in this codebase; follow whichever convention the sibling files in that directory already use rather than introducing a third pattern.
- Integration tests that exercise multiple services together live under `src/__tests__/integration/`.
- File naming: `*.test.ts` / `*.test.tsx`.

## Mocking Prisma: never pass a delegate through `vi.mocked()`

**Rule**: When mocking `@/lib/db`'s `prisma.<model>` delegate, cast it directly — do not wrap it in `vi.mocked()`.

```typescript
// Wrong — do not do this
const mockFeed = vi.mocked(prisma.feed)

// Correct
const mockFeed = prisma.feed as unknown as Record<'findUnique' | 'findMany' | 'create' | 'update' | 'delete', Mock>
```

List only the methods actually used on that delegate in the union — this keeps a typo like `findUnqiue` from silently type-checking, while avoiding any reference to Prisma's own generated types.

`vi.mocked()` on the project's own functions (e.g. `vi.mocked(getAllFeeds)`, `vi.mocked(validateUrl)`) is fine and the preferred style — the rule applies specifically to Prisma delegates.

**Why**: `vi.mocked(prisma.<model>)` type-checks correctly but calling `.mockResolvedValue(...)` on the result forces TypeScript to resolve `Awaited<ReturnType<T>>`, which fully expands Prisma 7's deeply nested conditional/distributive return types. One call site went from ~5.6K to ~2.39M type instantiations (a ~425x jump). Across the codebase this pattern was costing multiple GB of type-checker memory and could freeze the whole devcontainer host. Full investigation: `docs/typescript-memory-investigation.md`.

## Vitest Config

- `exclude` in `vitest.config.ts` must keep `**/.claude/**` alongside `node_modules` and `.foundry` — git worktrees created under `.claude/worktrees/` lack generated files (`src/generated`) and duplicate-collect otherwise, producing spurious failures.
