# RSSエントリー閲覧 API エンドポイント仕様

**作成日**: 2026-03-14
**関連設計**: [architecture.md](architecture.md)
**関連要件定義**: [requirements.md](../../spec/rss-entry-view/requirements.md)
**型定義**: [interfaces.ts](interfaces.ts)

**【信頼性レベル凡例】**:
- 🔵 **青信号**: EARS要件定義書・設計文書・既存API仕様を参考にした確実な定義
- 🟡 **黄信号**: EARS要件定義書・設計文書・既存API仕様から妥当な推測による定義
- 🔴 **赤信号**: EARS要件定義書・設計文書・既存API仕様にない推測による定義

---

## 共通仕様

### ベースURL 🔵

**信頼性**: 🔵 *既存 rss-feed-registration API仕様より*

```
/api
```

### 認証 🔵

**信頼性**: 🔵 *要件定義 REQ-402: 認証なしより*

すべてのエンドポイントは認証不要（共通リスト管理）。

### レスポンス共通フォーマット 🔵

**信頼性**: 🔵 *既存 rss-feed-registration API仕様・src/types/feed.ts より*

**成功時**:
```json
{
  "success": true,
  "data": { ... }
}
```

**エラー時**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message in English"
  }
}
```

### エラーコード一覧 🔵

**信頼性**: 🔵 *既存エラーコードパターン・要件定義より*

| コード | HTTP Status | 説明 |
|--------|------------|------|
| `ENTRY_NOT_FOUND` | 404 | 指定IDのエントリーが存在しない |
| `TAG_NOT_FOUND` | 404 | 指定IDのタグが存在しない |
| `VALIDATION_ERROR` | 400 | 汎用バリデーションエラー |
| `INTERNAL_SERVER_ERROR` | 500 | サーバー内部エラー |

---

## エンドポイント一覧

### エントリー一覧取得

#### GET /api/entries 🔵

**信頼性**: 🔵 *REQ-001, REQ-003, REQ-004, REQ-005・ヒアリングより*

**説明**: 全フィードのエントリー一覧を公開日時降順で取得する。フィード別・タグ別フィルタリング、ページネーション対応。

**クエリパラメータ**:

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `page` | number | - | 1 | ページ番号（1始まり） |
| `limit` | number | - | 20 | 1ページあたりの件数 |
| `feedId` | string | - | - | フィードIDでフィルター（REQ-004） |
| `tagId` | string | - | - | タグIDでフィルター（REQ-005） |
| `afterId` | string | - | - | 指定エントリーの次のエントリー取得（REQ-007: 前後ナビ用） |
| `beforeId` | string | - | - | 指定エントリーの前のエントリー取得（REQ-007: 前後ナビ用） |

**注意**: `feedId` と `tagId` を両方指定した場合は AND 条件でフィルタリング（ヒアリング: AND条件より）

**リクエスト例**:
```http
GET /api/entries?page=1&feedId=550e8400-e29b-41d4-a716-446655440000&tagId=tag-id-001
```

**レスポンス（成功 200）**:
```json
{
  "success": true,
  "data": [
    {
      "id": "entry-id-001",
      "title": "Next.js 15 リリース",
      "link": "https://nextjs.org/blog/next-15",
      "publishedAt": "2026-03-14T09:00:00.000Z",
      "createdAt": "2026-03-14T09:05:00.000Z",
      "feed": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "Next.js Blog"
      },
      "meta": {
        "id": "meta-id-001",
        "entryId": "entry-id-001",
        "isRead": false,
        "isReadLater": true,
        "createdAt": "2026-03-14T09:10:00.000Z",
        "updatedAt": "2026-03-14T09:10:00.000Z"
      },
      "tags": [
        {
          "entryId": "entry-id-001",
          "tagId": "tag-id-001",
          "tag": { "id": "tag-id-001", "name": "tech", "createdAt": "2026-03-14T09:00:00.000Z" }
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**エントリーが0件の場合**:
```json
{
  "success": true,
  "data": [],
  "pagination": { "page": 1, "limit": 20, "total": 0, "hasNext": false, "hasPrev": false }
}
```

---

### エントリー詳細取得

#### GET /api/entries/:id 🔵

**信頼性**: 🔵 *REQ-006（モーダル詳細表示）・既存 GET /api/feeds/:id パターンより*

**説明**: 指定IDのエントリー詳細を取得する（モーダル表示用）。全文・メタ情報・タグを含む。

**パスパラメータ**:
- `id`: エントリーID (UUID)

**リクエスト例**:
```http
GET /api/entries/entry-id-001
```

**レスポンス（成功 200）**:
```json
{
  "success": true,
  "data": {
    "id": "entry-id-001",
    "feedId": "550e8400-e29b-41d4-a716-446655440000",
    "guid": "https://nextjs.org/blog/next-15#guid",
    "title": "Next.js 15 リリース",
    "link": "https://nextjs.org/blog/next-15",
    "description": "Next.js 15がリリースされました。主な変更点は...",
    "content": "Next.js 15がリリースされました。主な変更点は...\n\n詳細な変更内容...",
    "publishedAt": "2026-03-14T09:00:00.000Z",
    "createdAt": "2026-03-14T09:05:00.000Z",
    "updatedAt": "2026-03-14T09:05:00.000Z",
    "feed": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Next.js Blog"
    },
    "meta": {
      "id": "meta-id-001",
      "entryId": "entry-id-001",
      "isRead": true,
      "isReadLater": false,
      "createdAt": "2026-03-14T09:10:00.000Z",
      "updatedAt": "2026-03-14T09:15:00.000Z"
    },
    "tags": [
      {
        "entryId": "entry-id-001",
        "tagId": "tag-id-001",
        "tag": { "id": "tag-id-001", "name": "tech", "createdAt": "2026-03-14T09:00:00.000Z" }
      }
    ]
  }
}
```

**エラーレスポンス（404）**:
```json
{
  "success": false,
  "error": {
    "code": "ENTRY_NOT_FOUND",
    "message": "Entry not found"
  }
}
```

---

### エントリーメタ情報更新

#### PUT /api/entries/:id/meta 🔵

**信頼性**: 🔵 *REQ-008, REQ-009, REQ-101・NFR-201（即時反映）より*

**説明**: エントリーの既読・後で読むフラグを更新する。EntryMeta が存在しない場合は新規作成（upsert）。

**パスパラメータ**:
- `id`: エントリーID (UUID)

**リクエスト**:
```json
{
  "isRead": true,
  "isReadLater": false
}
```

**バリデーション**:

| フィールド | 必須 | 説明 |
|-----------|------|------|
| `isRead` | - | boolean、省略可 |
| `isReadLater` | - | boolean、省略可 |

**レスポンス（成功 200）**:
```json
{
  "success": true,
  "data": {
    "id": "meta-id-001",
    "entryId": "entry-id-001",
    "isRead": true,
    "isReadLater": false,
    "createdAt": "2026-03-14T09:10:00.000Z",
    "updatedAt": "2026-03-14T09:20:00.000Z"
  }
}
```

**エラーレスポンス（404）**:
```json
{
  "success": false,
  "error": {
    "code": "ENTRY_NOT_FOUND",
    "message": "Entry not found"
  }
}
```

---

### タグ一覧取得

#### GET /api/tags 🔵

**信頼性**: 🔵 *REQ-012（既存タグ選択）・タグ入力Comboboxの候補表示より*

**説明**: 登録済みタグ一覧を取得する（タグ入力の候補表示用）。

**クエリパラメータ**: なし

**リクエスト例**:
```http
GET /api/tags
```

**レスポンス（成功 200）**:
```json
{
  "success": true,
  "data": [
    { "id": "tag-id-001", "name": "tech", "createdAt": "2026-03-14T09:00:00.000Z" },
    { "id": "tag-id-002", "name": "design", "createdAt": "2026-03-14T10:00:00.000Z" }
  ]
}
```

---

### タグ作成・エントリーへの付与

#### POST /api/tags 🔵

**信頼性**: 🔵 *REQ-010, REQ-011, REQ-012・ヒアリング: タグcase-insensitiveより*

**説明**: タグを作成（または既存タグを検索）してエントリーに付与する。タグ名は小文字正規化して保存。既存タグ名の場合はupsertで重複作成しない。

**リクエスト**:
```json
{
  "name": "Tech",
  "entryId": "entry-id-001"
}
```

**バリデーション**:

| フィールド | 必須 | 説明 |
|-----------|------|------|
| `name` | ✅ | タグ名（サーバー側で `toLowerCase()` して保存） |
| `entryId` | ✅ | 付与先エントリーID |

**レスポンス（成功 201）**:
```json
{
  "success": true,
  "data": {
    "id": "tag-id-001",
    "name": "tech",
    "createdAt": "2026-03-14T09:00:00.000Z"
  }
}
```

**エラーレスポンス（404: エントリー未存在）**:
```json
{
  "success": false,
  "error": {
    "code": "ENTRY_NOT_FOUND",
    "message": "Entry not found"
  }
}
```

---

### タグのエントリーからの解除

#### DELETE /api/tags/:tagId/entries/:entryId 🔵

**信頼性**: 🔵 *REQ-010（タグ削除）・モーダルのタグ×ボタンより*

**説明**: エントリーからタグを解除する（EntryTagの削除）。Tagテーブル自体は削除しない。

**パスパラメータ**:
- `tagId`: タグID (UUID)
- `entryId`: エントリーID (UUID)

**リクエスト例**:
```http
DELETE /api/tags/tag-id-001/entries/entry-id-001
```

**レスポンス（成功 200）**:
```json
{
  "success": true
}
```

**エラーレスポンス（404）**:
```json
{
  "success": false,
  "error": {
    "code": "TAG_NOT_FOUND",
    "message": "Tag not found on this entry"
  }
}
```

---

## Route Handler 実装ファイルマッピング 🔵

**信頼性**: 🔵 *アーキテクチャ設計 ディレクトリ構造より*

| エンドポイント | ファイルパス | HTTP メソッド |
|--------------|------------|-------------|
| `/api/entries` | `src/app/api/entries/route.ts` | GET |
| `/api/entries/:id` | `src/app/api/entries/[id]/route.ts` | GET |
| `/api/entries/:id/meta` | `src/app/api/entries/[id]/meta/route.ts` | PUT |
| `/api/tags` | `src/app/api/tags/route.ts` | GET, POST |
| `/api/tags/:tagId/entries/:entryId` | `src/app/api/tags/[tagId]/entries/[entryId]/route.ts` | DELETE |

---

## CORS設定 🔵

**信頼性**: 🔵 *既存 rss-feed-registration API仕様より*

Next.jsのデフォルト設定を使用。フロントエンドとバックエンドが同一Next.jsアプリなので追加のCORS設定は不要。

---

## 関連文書

- **アーキテクチャ**: [architecture.md](architecture.md)
- **型定義**: [interfaces.ts](interfaces.ts)
- **データフロー**: [dataflow.md](dataflow.md)
- **DBスキーマ**: [database-schema.sql](database-schema.sql)
- **要件定義**: [requirements.md](../../spec/rss-entry-view/requirements.md)
- **既存API仕様**: [../rss-feed-registration/api-endpoints.md](../rss-feed-registration/api-endpoints.md)

## 信頼性レベルサマリー

- 🔵 青信号: 25件 (96%)
- 🟡 黄信号: 1件 (4%)
- 🔴 赤信号: 0件 (0%)

**品質評価**: 高品質
