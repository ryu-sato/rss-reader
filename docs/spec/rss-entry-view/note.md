# RSSエントリー閲覧 コンテキストノート

**作成日**: 2026-03-14
**要件名**: RSSエントリー閲覧（rss-entry-view）

## プロジェクト概要

RSSリーダーWebアプリケーション。登録済みRSSフィードのエントリー（記事）を一覧表示・閲覧する機能。
全フィードをまとめ読みでき、既読管理・後で読む・タグ付けなどのメタ情報管理も提供する。

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js (フルスタック, App Router) |
| 言語 | TypeScript (strict mode) |
| DB | SQLite (Prisma ORM) |
| UIコンポーネント | shadcn/ui |
| スタイリング | Tailwind CSS |
| ランタイム | Node.js |
| 開発環境 | Devcontainer (Node.js & TypeScript) |

## アーキテクチャ概要

- **フロントエンド**: Next.js App Router（React Server Components + Client Components）
- **バックエンド**: Next.js API Routes
- **データ永続化**: SQLite（Prisma経由）
- **RSSパース**: `rss-parser` ライブラリ（既存実装）
- **定期取得**: cron ジョブ（1時間ごと）

## 機能スコープ（RSSエントリー閲覧）

### 対象機能
- 全フィードのエントリーをまとめた一覧表示（時系列降順、20件/ページ）
- エントリーのモーダル閲覧（タイトル・公開日時・全文・元記事リンク・前後ナビ）
- 既読管理（既読/未読フラグ）
- 後で読む（ブックマーク）
- タグ付け（自由入力で新規作成 + 既存タグ選択）
- フィード別フィルタリング
- タグ別フィルタリング
- 1時間ごとの定期自動取得（バックグラウンド）

### 非対象機能
- ユーザー認証（共通リスト管理）
- フィード別エントリー一覧（全フィードまとめ表示のみ）
- エントリーの検索（フルテキスト検索）
- エントリーのエクスポート

## データモデル（想定）

```
Entry {
  id: string (UUID)
  feedId: string (FK → Feed.id)
  guid: string (RSS entry GUID, unique per feed)
  title: string
  link: string
  description: string | null  (概要)
  content: string | null       (全文)
  publishedAt: datetime | null
  createdAt: datetime
  updatedAt: datetime
}

EntryMeta {
  id: string (UUID)
  entryId: string (FK → Entry.id, unique)
  isRead: boolean (default: false)
  isReadLater: boolean (default: false)
  createdAt: datetime
  updatedAt: datetime
}

Tag {
  id: string (UUID)
  name: string (unique)
  createdAt: datetime
}

EntryTag {
  entryId: string (FK → Entry.id)
  tagId: string (FK → Tag.id)
  PRIMARY KEY (entryId, tagId)
}
```

## 開発規約

- TypeScript 厳格モード
- Next.js App Router 使用
- エラーメッセージは英語で表示
- URL scheme 制限: http/https のみ

## 注意事項

- 1フィードあたりエントリー保存上限: 500件（超過分は古い順に削除）
- エントリーの全文（content）もDBに保存
- 定期取得間隔: 1時間
- ページネーション: 20件/ページ、公開日時降順（新しい順）
- 既読・後で読む・タグはモーダルから設定可能
- タグは自由入力で新規作成、既登録タグは選択可能

## 関連ファイル

- `docs/spec/rss-entry-view/requirements.md` - 要件定義書
- `docs/spec/rss-entry-view/user-stories.md` - ユーザーストーリー
- `docs/spec/rss-entry-view/acceptance-criteria.md` - 受け入れ基準
- `docs/spec/rss-entry-view/interview-record.md` - ヒアリング記録
- `docs/spec/rss-feed-registration/requirements.md` - 依存機能（フィード登録）
- `src/types/feed.ts` - 既存型定義
- `src/lib/feed-service.ts` - 既存フィードサービス
- `src/lib/rss-fetcher.ts` - 既存RSSフェッチャー
