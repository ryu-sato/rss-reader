# Project Structure

## Organization Philosophy

**Domain-first**: コアドメイン（RSS コンテンツ = Feed / Entry）を `/src/domain/` に一元化し、
その上に機能モジュール（folder-by-feature）を `/src/features/<機能>/` として重ねる。
依存は常に上から下へ一方向で、`domain` は `features` / `app` / `components` を参照しない。

ドメインの定義と要件の対応は `docs/domain-model.md` を単一の情報源とする。構成を変えるときは
まずそちらを更新する。

## Directory Patterns

### Core Domain
**Location**: `/src/domain/`
**Purpose**: このアプリの存在理由そのもの（外部の RSS を取り込んで記事として保持する）に属する実装
**Sub-patterns**:
- `/domain/entry/` — Entry のエンティティ型・永続化・一覧クエリ記述子・RSS 取り込み・同期
- `/domain/feed/` — Feed のエンティティ型・永続化・フィードメタ取得
- `/domain/shared/` — Prisma クライアント（`db.ts`）、`AppError` と `ErrorCode`（`errors.ts`）、SSRF ガード
**Pattern**: エンティティ型はドメイン名のファイル（`entry.ts`, `feed.ts`）、永続化は `*-repository.ts`
**制約**: `@/features/`, `@/app/`, `@/components/`, `@/hooks/` を import しない。
コアが必要とする他ドメインの型は Prisma 生成型から直接導出する

### Feature Modules
**Location**: `/src/features/<機能>/`
**Purpose**: コアドメインに意味づけ・見せ方を与える支援ドメイン。`.kiro/specs/` の 1 スペックに 1 フォルダ対応
**Sub-patterns**: `components/`（その機能に閉じた React コンポーネント）、`lib/`（サービス・フック）、`types/`（API リクエスト/レスポンス型）
**現在の機能**: `feed-management`, `entry-viewing`, `read-status`, `tag-management`,
`preference-recommendations`, `digests`, `settings`, `auth`
**制約**: 機能どうしの相互参照は、画面の composition のために UI を借りる場合に限る。
他機能のサービス層を呼びたくなったら、その処理はコアドメインへ引き上げる

### App Router Pages & API
**Location**: `/src/app/`
**Purpose**: ルートセグメント、レイアウト、ページ、API ルートハンドラ
**Pattern**: 薄く保ち、処理はドメイン層 / 機能のサービスへ即座に委譲する

### Shared UI
**Location**: `/src/components/`
**Sub-patterns**:
- `/components/ui/` — shadcn ベースのデザインシステムのプリミティブ（ビジネスロジックを持たない）
- `/components/layout/` — サイドバーなどアプリ全体の骨格
**制約**: 特定機能のコンポーネントをここに置かない（`features/<機能>/components/` に置く）

### Generic Utilities
**Location**: `/src/lib/`, `/src/hooks/`
**Purpose**: ドメイン知識を持たない汎用処理のみ（`utils.ts`, `motion.ts`, `cron.ts`, `use-media-preference.ts`）
**制約**: ここにサービス層を置かない。データアクセスは `domain/*-repository.ts` か `features/*/lib/*-service.ts`

### Generated Code
**Location**: `/src/generated/`
**Purpose**: Prisma クライアントなどの自動生成物 — 手で編集しない

## Naming Conventions

- **Component files**: kebab-case (`entry-card-grid.tsx`, `sidebar-provider.tsx`)
- **Service / repository files**: kebab-case。コアの永続化は `-repository` 、機能のサービスは `-service` 接尾辞
- **API route files**: 機能フォルダ内の `route.ts`
- **Type files**: ドメイン名の kebab-case (`entry.ts`, `feed.ts`, `tag.ts`, `digest.ts`)
- **Test files**: 対象と同名 + `.test.ts` / `.test.tsx` を同じディレクトリに co-locate。
  同じ対象に複数の観点のテストを分ける場合は `<対象>.<観点>.test.tsx`（例: `tag-input.frequent-tags.test.tsx`）
- **Integration tests**: 複数ドメインをまたぐものだけ `/src/__tests__/integration/`

## Import Organization

```typescript
// パスエイリアスを使う（ディレクトリをまたぐ場合）
import { findManyEntries } from '@/domain/entry/entry-repository'
import { Button } from '@/components/ui/button'
import type { EntryListItem } from '@/domain/entry/entry'

// 同じディレクトリ内のみ相対 import
import { helper } from './helper'
```

**Path Aliases**: `@/` → `./src/` (`tsconfig.json`)

## Code Organization Principles

- **一方向の依存**: `app` → `features` → `domain` → `generated/prisma`。逆流させない
- **import 経路を二重化しない**: 同じ実装への再エクスポートシムを置かない。
  経路が二重になると「一元管理されている」という前提が静かに崩れる
- **Thin route handlers**: `/app/api/` は即座にサービス関数へ委譲する
- **No business logic in components**: コンポーネントは DB を直接触らない
- **Service layer owns DB**: Prisma を import してよいのは `domain/**` と `features/*/lib/*-service.ts` のみ
- **Zod at boundaries**: 外部入力（API リクエストボディ、フォームデータ）はサービスに渡す前に検証する

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_
