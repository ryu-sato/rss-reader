# Testing Standards

## Organization

- 原則 co-located: 対象と同じディレクトリに同名 + `.test.ts` / `.test.tsx` を置く（`entry-repository.ts` ↔ `entry-repository.test.ts`）。`__tests__/` サブディレクトリは新設せず、対象を別ディレクトリへ移すときはテストも一緒に動かす。
- 同じ対象に観点の違うテストを分けるときは `<対象>.<観点>.test.tsx`（例: `tag-input.frequent-tags.test.tsx`）。
- 複数ドメインをまたぐ結合テストだけ `src/__tests__/integration/` に置く。App Router のページを横断的に検証するものは `src/app/__tests__/`。

## DB リセットはスイートに 1 回

`vitest.setup.ts` の `beforeAll` で `prisma migrate reset` を 1 度だけ実行する。
テストごと（`beforeEach`）にリセットすると、テスト件数ぶんの CLI プロセス起動と
マイグレーション再適用が走って極端に遅くなるため、この形を崩さない。
実 DB を使うテストは、自分が作ったデータを自分で片付ける前提で書く。

## Mocking Prisma: never pass a delegate through `vi.mocked()`

**Rule**: When mocking `@/domain/shared/db`'s `prisma.<model>` delegate, cast it directly — do not wrap it in `vi.mocked()`.

```typescript
// Wrong — do not do this
const mockFeed = vi.mocked(prisma.feed)

// Correct
const mockFeed = prisma.feed as unknown as Record<'findUnique' | 'findMany' | 'create' | 'update' | 'delete', Mock>
```

List only the methods actually used on that delegate in the union — this keeps a typo like `findUnqiue` from silently type-checking, while avoiding any reference to Prisma's own generated types.

`vi.mocked()` on the project's own functions (e.g. `vi.mocked(getAllFeeds)`, `vi.mocked(validateUrl)`) is fine and the preferred style — the rule applies specifically to Prisma delegates.

**Why**: `vi.mocked(prisma.<model>)` type-checks correctly but calling `.mockResolvedValue(...)` on the result forces TypeScript to resolve `Awaited<ReturnType<T>>`, which fully expands Prisma 7's deeply nested conditional/distributive return types. One call site went from ~5.6K to ~2.39M type instantiations (a ~425x jump). Across the codebase this pattern was costing multiple GB of type-checker memory and could freeze the whole devcontainer host. Full investigation: `.kiro/steering/typescript-memory-investigation.md`.

## モック対象のモジュールパスは実装の import 元と一致させる

再エクスポートのシムを置かない方針なので、1 つのモジュールが複数の実装を束ねることはない。
`vi.mock()` は対象ごとに個別に書く。

```typescript
vi.mock('@/domain/entry/entry-repository', () => ({ findManyEntries: vi.fn() }))
vi.mock('@/features/read-status/lib/entry-meta-service', () => ({ updateEntryMeta: vi.fn() }))
```

## Vitest Config

- `exclude` in `vitest.config.ts` must keep `**/.claude/**` alongside `node_modules` and `.foundry` — git worktrees created under `.claude/worktrees/` lack generated files (`src/generated`) and duplicate-collect otherwise, producing spurious failures.
