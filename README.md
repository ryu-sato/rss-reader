# RSS Reader

RSSリーダーWebアプリケーション。ユーザーがRSSフィードURLを登録・管理し、記事を閲覧できるサービス。

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **言語**: TypeScript (strict mode)
- **スタイリング**: Tailwind CSS v4 + shadcn/ui
- **ORM**: Prisma
- **DB**: SQLite (`prisma/dev.db`)
- **RSSパース**: rss-parser
- **テスト**: Vitest + Testing Library

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env` ファイルを作成:

```env
DATABASE_URL="file:./dev.db"
```

### 3. データベースのセットアップ (TASK-0002以降)

```bash
npx prisma migrate dev --name init
npx prisma generate
```

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# テスト実行（ウォッチモード）
npm run test

# テスト実行（1回のみ）
npm run test:run

# カバレッジ付きテスト
npm run test:coverage

# ビルド
npm run build

# Lint
npm run lint
```

## プロジェクト構造

```
./
├── app/                      # Next.js App Router
│   ├── page.tsx              # フィード一覧ページ
│   ├── feeds/
│   │   ├── new/page.tsx      # フィード登録ページ
│   │   └── [id]/edit/page.tsx # フィード編集ページ
│   └── api/feeds/            # API Route Handlers
├── components/
│   ├── ui/                   # shadcn/ui コンポーネント
│   ├── feed-list.tsx
│   ├── feed-form.tsx
│   └── delete-confirm-dialog.tsx
├── lib/
│   ├── db.ts                 # Prisma クライアント
│   ├── feed-service.ts       # ビジネスロジック
│   ├── rss-fetcher.ts        # RSS取得・パース
│   └── ssrf-guard.ts         # SSRF対策
├── prisma/
│   ├── schema.prisma         # DBスキーマ
│   └── dev.db                # SQLiteファイル
└── types/
    └── feed.ts               # 型定義
```

## Getting Started (Next.js)

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
