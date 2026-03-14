# TASK-0001 設定作業実行

## 作業概要

- **タスクID**: TASK-0001
- **作業内容**: Next.jsプロジェクト初期化・依存パッケージ設定
- **実行日時**: 2026-03-14
- **タスクタイプ**: DIRECT

## 設計文書参照

- `docs/spec/rss-feed-registration/note.md` - 技術スタック・コンテキスト
- `docs/design/rss-feed-registration/architecture.md` - アーキテクチャ設計
- `docs/design/rss-feed-registration/database-schema.sql` - DBスキーマ
- `docs/tasks/rss-feed-registration/TASK-0001.md` - タスク仕様

## 実行した作業

### 1. Next.jsプロジェクト初期化

`create-next-app` を一時ディレクトリで実行後、ファイルを移動（`.devcontainer` 競合回避のため）。

```bash
npx create-next-app@latest rss-reader-init \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias="@/*" \
  --yes
```

- Next.js: 16.1.6
- TypeScript: strict mode 有効（`tsconfig.json: "strict": true`）
- Tailwind CSS v4
- App Router 構成（`app/` ディレクトリ）

### 2. 依存パッケージのインストール

```bash
npm install @prisma/client
npm install --save-dev prisma
npm install rss-parser
npm install --save-dev vitest @vitejs/plugin-react jsdom \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

**注意**: `@types/rss-parser` は npm に存在しないためスキップ（`rss-parser` 自体に型定義が含まれる）。

### 3. shadcn/ui のセットアップ

```bash
npx shadcn@latest init --yes --defaults
npx shadcn@latest add dialog alert-dialog form input textarea label sonner --yes
npm install react-hook-form @hookform/resolvers zod
```

**インストール済みコンポーネント**:
- `components/ui/button.tsx`
- `components/ui/dialog.tsx`
- `components/ui/alert-dialog.tsx`
- `components/ui/input.tsx`
- `components/ui/textarea.tsx`
- `components/ui/label.tsx`
- `components/ui/sonner.tsx`（`toast` は deprecated のため `sonner` を使用）

**注意**: shadcn v4 では `form` コンポーネントはレジストリから個別インストール不可。`react-hook-form` + `zod` を手動インストール済み。

### 4. Vitest 設定ファイル作成

**作成ファイル**: `vitest.config.ts`
**作成ファイル**: `vitest.setup.ts`

### 5. package.json スクリプト追加

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

## 作業結果

- [x] Next.js + TypeScript + Tailwind CSS + App Router プロジェクト作成完了
- [x] `@prisma/client`, `prisma` インストール済み
- [x] `rss-parser` インストール済み
- [x] Vitest 設定完了（`vitest.config.ts`, `vitest.setup.ts` 作成）
- [x] shadcn/ui 初期化済み（button, dialog, alert-dialog, input, textarea, label, sonner）
- [x] `react-hook-form`, `@hookform/resolvers`, `zod` インストール済み
- [x] TypeScript strict mode 有効
- [x] `npm run test:run` 実行確認（テストファイルなし = 正常）

## 遭遇した問題と解決方法

### 問題1: `.devcontainer` 競合

- **発生状況**: `create-next-app .` 実行時に `.devcontainer` フォルダが競合
- **解決方法**: `/tmp/rss-reader-init` で作成後 `rsync` でファイルをコピー

### 問題2: `@types/rss-parser` が npm に存在しない

- **発生状況**: `npm install --save-dev @types/rss-parser` が 404 エラー
- **解決方法**: スキップ（`rss-parser` 自体に TypeScript 型定義が含まれている）

### 問題3: `toast` コンポーネントが deprecated

- **発生状況**: `npx shadcn@latest add toast` でエラー
- **解決方法**: `sonner` コンポーネントを使用

## 次のステップ

- `/tsumiki:direct-verify` を実行して設定を確認
- TASK-0002: Prisma + SQLiteセットアップ・DBスキーマ
