# RSS Reader アーキテクチャ設計（逆生成）

## 分析日時
2026-03-16

## システム概要

### 実装されたアーキテクチャ
- **パターン**: モノリシック フルスタックアプリケーション（Next.js App Router）
- **フレームワーク**: Next.js 16（App Router）
- **構成**: Single-process、フロントエンド・バックエンド一体型

### 技術スタック

#### フロントエンド
- **フレームワーク**: Next.js 16 / React 19（Server Components + Client Components）
- **状態管理**: ブラウザカスタムイベント + URL Search Params（外部ライブラリ不使用）
- **UI ライブラリ**: shadcn/ui 4 + @base-ui/react
- **スタイリング**: Tailwind CSS 4（CSS変数によるテーマ管理）
- **アイコン**: lucide-react
- **フォント**: Geist Sans / Geist Mono（next/font）

#### バックエンド
- **フレームワーク**: Next.js API Routes（App Router）
- **認証方式**: なし（デプロイ層でリバースプロキシ/OAuth対応）
- **ORM/データアクセス**: Prisma 7 + @prisma/adapter-libsql（LibSQL Adapter）
- **バリデーション**: Zod 4（スキーマバリデーション）
- **スケジューリング**: node-cron（毎時00分にフィード自動更新）
- **RSS解析**: rss-parser（RSS/Atom対応、カスタムフィールド拡張）
- **セキュリティ**: SSRF防御（DNS解決によるプライベートIPブロック）

#### データベース
- **DBMS**: SQLite（LibSQL経由）
- **キャッシュ**: Next.js file-based cache（メモリキャッシュ無効化）、`unstable_cache`（Digest）
- **接続**: Prisma Client（シングルトン、dev/prod切り替え）

#### インフラ・ツール
- **ビルドツール**: Next.js（Webpack）、standalone出力でDocker対応
- **テストフレームワーク**: Vitest 4 + @testing-library/react + jsdom
- **コード品質**: ESLint（Next.js推奨設定）
- **PWA**: Serwist（Service Worker、プリキャッシュ、ナビゲーションプリロード）

---

## レイヤー構成

### ディレクトリ構造

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # バックエンド: APIルート
│   │   ├── feeds/                # フィード管理API
│   │   ├── entries/              # 記事管理API
│   │   ├── tags/                 # タグ管理API
│   │   └── digests/              # ダイジェスト管理API
│   ├── feeds/                    # フロントエンド: フィード管理ページ
│   ├── read-later/               # フロントエンド: あとで読む
│   ├── digests/                  # フロントエンド: ダイジェスト
│   ├── settings/                 # フロントエンド: 設定
│   ├── layout.tsx                # ルートレイアウト
│   ├── page.tsx                  # ホーム（記事一覧）
│   └── sw.ts                     # Service Worker
├── components/                   # UIコンポーネント
│   ├── ui/                       # shadcn/ui プリミティブ
│   └── [ドメイン固有コンポーネント]
├── lib/                          # ビジネスロジック・ユーティリティ
│   ├── db.ts                     # Prismaクライアントシングルトン
│   ├── feed-service.ts           # フィードCRUD
│   ├── entry-service.ts          # 記事CRUD・重複排除
│   ├── entry-fetcher.ts          # RSS取得・解析・画像抽出
│   ├── rss-fetcher.ts            # RSSフェッチャー
│   ├── tag-service.ts            # タグCRUD
│   ├── digest-service.ts         # ダイジェストCRUD
│   ├── cron.ts                   # cronジョブ管理
│   ├── ssrf-guard.ts             # SSRF攻撃防御
│   └── errors.ts                 # エラー定義
├── types/                        # TypeScript型定義
│   ├── feed.ts
│   ├── entry.ts
│   └── digest.ts
├── hooks/                        # Reactカスタムフック
└── generated/                    # Prisma自動生成クライアント
```

### レイヤー責務分析
- **プレゼンテーション層**: `src/app/[pages]/`, `src/components/` — Server/Client Componentsによるレンダリング
- **アプリケーション層**: `src/app/api/` — HTTPリクエスト処理、バリデーション、レスポンス整形
- **ドメイン層**: `src/lib/[*-service].ts` — ビジネスロジック（フィード・記事・タグ・ダイジェスト管理）
- **インフラストラクチャ層**: `src/lib/db.ts`, `src/lib/rss-fetcher.ts`, `src/lib/ssrf-guard.ts` — DB接続、外部通信

---

## デザインパターン

### 発見されたパターン
- **Singleton Pattern**: Prismaクライアント（`src/lib/db.ts`）— dev/prod環境でグローバルインスタンス共有
- **Repository Pattern**: `*-service.ts` — Prismaを通じたデータアクセスの抽象化
- **Observer Pattern**: カスタムブラウザイベント（`entry:read`, `entry:unread`, `entry:updated`, `tag:deleted`）による疎結合なコンポーネント間通信
- **Cursor-based Pagination**: `beforeId`/`afterId` による無限スクロール
- **Upsert Pattern**: RSS記事の重複排除（`feedId + guid` ユニーク制約）
- **SSRF Guard**: URLフェッチ前のDNS解決によるプライベートIPブロック

---

## 非機能要件の実装状況

### セキュリティ
- **認証**: なし（デプロイ層で担保）
- **認可**: なし（デプロイ層で担保）
- **SSRF対策**: `src/lib/ssrf-guard.ts` — DNSベースのプライベートIPブロック（IPv4/IPv6）
- **コンテンツサニタイズ**: rehype-sanitize（Markdownレンダリング時のHTML無害化）
- **入力バリデーション**: Zodスキーマ（API境界）

### パフォーマンス
- **メモリキャッシュ**: 無効（`cacheMaxMemorySize: 0`、ファイルキャッシュのみ）
- **データ制限**: フィードあたり最大500記事（古い記事を自動削除）
- **インデックス**: `publishedAt DESC`、`feedId`、`tagId`、`createdAt DESC`
- **重複排除**: SQLウィンドウ関数による効率的なリンクベース重複排除
- **画像最適化**: Next.js Image component（全http/httpsドメイン許可）

### 運用・監視
- **ログ出力**: `console.error`（最小限）
- **エラートラッキング**: なし（Sonner toastによるUI通知のみ）
- **メトリクス収集**: なし
- **ヘルスチェック**: なし
- **スケジューリング**: node-cron（毎時00分、`src/instrumentation.ts`で初期化）
- **PWA**: Serwist Service Worker（オフラインサポート、プリキャッシュ）
