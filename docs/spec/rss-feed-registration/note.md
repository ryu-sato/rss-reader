# RSSフィード登録 コンテキストノート

**作成日**: 2026-03-13
**要件名**: RSSシードの登録（rss-feed-registration）

## プロジェクト概要

RSSリーダーWebアプリケーション。ユーザーがRSSフィードURLを登録・管理し、記事を閲覧できるサービス。

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js (フルスタック) |
| 言語 | TypeScript |
| DB | SQLite |
| ランタイム | Node.js |
| 開発環境 | Devcontainer (Node.js & TypeScript) |

## アーキテクチャ概要

- **フロントエンド**: Next.js App Router（React Server Components + Client Components）
- **バックエンド**: Next.js API Routes
- **データ永続化**: SQLite（ファイルベースDB）
- **RSSパース**: Node.js上でRSS/Atom取得・パース

## 機能スコープ（RSSフィード登録）

### 対象機能
- RSSフィードURLの入力と登録
- 登録時のリアルタイムURL検証（実際にフェッチしてRSSを確認）
- フィード情報（タイトル・説明）の自動取得
- 登録済みフィードの一覧表示
- フィード情報の編集
- フィードの削除（確認ダイアログあり）

### 非対象機能
- ユーザー認証（共通リストとして管理）
- フィードのカテゴリ・タグ付け（今回のスコープ外）
- 登録件数上限なし

## データモデル（想定）

```
Feed {
  id: string (UUID)
  url: string (unique)
  title: string
  description: string | null
  memo: string | null
  createdAt: datetime
  updatedAt: datetime
  lastFetchedAt: datetime | null
}
```

## 開発規約

- TypeScript厳格モード
- 新規プロジェクト（既存コードなし）
- Next.js App Router使用

## 注意事項

- URLの重複登録は不可（エラー表示）
- RSS URL検証は実際にHTTPリクエストを送信して確認
- フィード情報（タイトル・説明）はURL検証時に自動取得
- 削除時は確認ダイアログを表示

## 関連ファイル

- `docs/spec/rss-feed-registration/requirements.md` - 要件定義書
- `docs/spec/rss-feed-registration/user-stories.md` - ユーザーストーリー
- `docs/spec/rss-feed-registration/acceptance-criteria.md` - 受け入れ基準
- `docs/spec/rss-feed-registration/interview-record.md` - ヒアリング記録
