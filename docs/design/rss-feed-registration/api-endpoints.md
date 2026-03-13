# RSSシードの登録 API エンドポイント仕様

**作成日**: 2026-03-13
**関連設計**: [architecture.md](architecture.md)
**関連要件定義**: [requirements.md](../../spec/rss-feed-registration/requirements.md)
**型定義**: [interfaces.ts](interfaces.ts)

**【信頼性レベル凡例】**:
- 🔵 **青信号**: EARS要件定義書・設計文書・ユーザヒアリングを参考にした確実な定義
- 🟡 **黄信号**: EARS要件定義書・設計文書・ユーザヒアリングから妥当な推測による定義
- 🔴 **赤信号**: EARS要件定義書・設計文書・ユーザヒアリングにない推測による定義

---

## 共通仕様

### ベースURL 🔵

**信頼性**: 🔵 *ヒアリングQ2: Route Handlersより*

```
/api
```

### 認証 🔵

**信頼性**: 🔵 *要件定義 REQ-404: 認証なしより*

すべてのエンドポイントは認証不要（共通リスト管理）。

### レスポンス共通フォーマット 🔵

**信頼性**: 🔵 *interfaces.ts 型定義より*

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

**信頼性**: 🔵 *要件定義 REQ-103, REQ-106, REQ-107, NFR-101・ヒアリングQ7より*

| コード | HTTP Status | 説明 |
|--------|------------|------|
| `FEED_ALREADY_EXISTS` | 409 | 同じURLのフィードが既に登録済み (REQ-103) |
| `FEED_NOT_FOUND` | 404 | 指定IDのフィードが存在しない |
| `INVALID_URL_FORMAT` | 400 | URL形式が不正 (REQ-402) |
| `URL_NOT_ALLOWED` | 400 | SSRF対策によりブロック (NFR-101) |
| `FEED_FETCH_FAILED` | 422 | RSS URLへのHTTPリクエスト失敗 (REQ-106) |
| `INVALID_FEED_FORMAT` | 422 | RSS/Atom形式でないコンテンツ (REQ-107) |
| `VALIDATION_ERROR` | 400 | 汎用バリデーションエラー |
| `INTERNAL_SERVER_ERROR` | 500 | サーバー内部エラー |

---

## エンドポイント一覧

### フィード一覧取得

#### GET /api/feeds 🔵

**信頼性**: 🔵 *REQ-002, REQ-003（一覧表示）より*

**説明**: 登録済みRSSフィード一覧を取得する

**クエリパラメータ**: なし（ページネーション不要、件数上限なし: REQ-403）

**リクエスト例**:
```http
GET /api/feeds
```

**レスポンス（成功 200）**:
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Example Tech Blog",
      "url": "https://example.com/feed.xml",
      "createdAt": "2026-03-13T10:00:00.000Z",
      "updatedAt": "2026-03-13T10:00:00.000Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "title": "Another RSS Feed",
      "url": "https://another.example.com/rss",
      "createdAt": "2026-03-12T09:00:00.000Z",
      "updatedAt": "2026-03-12T09:00:00.000Z"
    }
  ]
}
```

**フィードが0件の場合**:
```json
{
  "success": true,
  "data": []
}
```

---

### フィード詳細取得

#### GET /api/feeds/:id 🔵

**信頼性**: 🔵 *REQ-104（編集フォーム初期値取得）より*

**説明**: 指定IDのフィード詳細を取得する（編集フォーム用）

**パスパラメータ**:
- `id`: フィードID (UUID)

**リクエスト例**:
```http
GET /api/feeds/550e8400-e29b-41d4-a716-446655440000
```

**レスポンス（成功 200）**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "url": "https://example.com/feed.xml",
    "title": "Example Tech Blog",
    "description": "Latest articles from Example Tech Blog",
    "memo": "This is my note about this feed",
    "createdAt": "2026-03-13T10:00:00.000Z",
    "updatedAt": "2026-03-13T10:00:00.000Z",
    "lastFetchedAt": "2026-03-13T10:00:00.000Z"
  }
}
```

**エラーレスポンス（404）**:
```json
{
  "success": false,
  "error": {
    "code": "FEED_NOT_FOUND",
    "message": "Feed not found"
  }
}
```

---

### フィード登録

#### POST /api/feeds 🔵

**信頼性**: 🔵 *REQ-001, REQ-101, REQ-102, REQ-103・ヒアリングQ1より*

**説明**: RSSフィードURLを登録する。URLの検証（SSRF対策含む）、RSS/Atom形式確認、フィード情報の自動取得を実行する。

**リクエスト**:
```json
{
  "url": "https://example.com/feed.xml"
}
```

**バリデーション**:
| フィールド | 必須 | 検証内容 |
|-----------|------|---------|
| `url` | ✅ | http/https で始まる、2048文字以内、未登録URL |

**レスポンス（成功 201）**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "url": "https://example.com/feed.xml",
    "title": "Example Tech Blog",
    "description": "Latest articles from Example Tech Blog",
    "memo": null,
    "createdAt": "2026-03-13T10:00:00.000Z",
    "updatedAt": "2026-03-13T10:00:00.000Z",
    "lastFetchedAt": "2026-03-13T10:00:00.000Z"
  }
}
```

**エラーレスポンス一覧**:

```json
// 400: URL形式不正 (REQ-402)
{
  "success": false,
  "error": {
    "code": "INVALID_URL_FORMAT",
    "message": "URL must start with http:// or https://"
  }
}
```

```json
// 400: URL長超過 (EDGE-101)
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "URL must be 2048 characters or less"
  }
}
```

```json
// 400: SSRF対策 (NFR-101)
{
  "success": false,
  "error": {
    "code": "URL_NOT_ALLOWED",
    "message": "URL is not allowed"
  }
}
```

```json
// 409: 重複URL (REQ-103, REQ-401)
{
  "success": false,
  "error": {
    "code": "FEED_ALREADY_EXISTS",
    "message": "Feed with this URL already exists"
  }
}
```

```json
// 422: HTTP取得失敗 (REQ-106, EDGE-001, EDGE-002)
{
  "success": false,
  "error": {
    "code": "FEED_FETCH_FAILED",
    "message": "Failed to fetch the feed URL"
  }
}
```

```json
// 422: RSS/Atom形式エラー (REQ-107)
{
  "success": false,
  "error": {
    "code": "INVALID_FEED_FORMAT",
    "message": "URL is not a valid RSS/Atom feed"
  }
}
```

---

### フィード更新

#### PUT /api/feeds/:id 🔵

**信頼性**: 🔵 *REQ-104（フィード編集）・ヒアリングQ1より*

**説明**: 指定IDのフィード情報を更新する（タイトル・説明・メモのみ更新可能、URLは変更不可）

**パスパラメータ**:
- `id`: フィードID (UUID)

**リクエスト**:
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "memo": "My updated note"
}
```

**バリデーション**:
| フィールド | 必須 | 検証内容 |
|-----------|------|---------|
| `title` | - | 省略可、空文字不可 |
| `description` | - | 省略可、1000文字以内、null可 |
| `memo` | - | 省略可、1000文字以内、null可 |

**レスポンス（成功 200）**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "url": "https://example.com/feed.xml",
    "title": "Updated Title",
    "description": "Updated description",
    "memo": "My updated note",
    "createdAt": "2026-03-13T10:00:00.000Z",
    "updatedAt": "2026-03-13T12:00:00.000Z",
    "lastFetchedAt": "2026-03-13T10:00:00.000Z"
  }
}
```

**エラーレスポンス（404）**:
```json
{
  "success": false,
  "error": {
    "code": "FEED_NOT_FOUND",
    "message": "Feed not found"
  }
}
```

---

### フィード削除

#### DELETE /api/feeds/:id 🔵

**信頼性**: 🔵 *REQ-105（削除・確認ダイアログあり）・ヒアリングQ9より*

**説明**: 指定IDのフィードを削除する。フロントエンド側で確認ダイアログを表示した後に呼び出す。

**パスパラメータ**:
- `id`: フィードID (UUID)

**リクエスト例**:
```http
DELETE /api/feeds/550e8400-e29b-41d4-a716-446655440000
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
    "code": "FEED_NOT_FOUND",
    "message": "Feed not found"
  }
}
```

---

## Route Handler 実装ファイルマッピング 🔵

**信頼性**: 🔵 *アーキテクチャ設計 ディレクトリ構造より*

| エンドポイント | ファイルパス | HTTP メソッド |
|--------------|------------|-------------|
| `/api/feeds` | `app/api/feeds/route.ts` | GET, POST |
| `/api/feeds/:id` | `app/api/feeds/[id]/route.ts` | GET, PUT, DELETE |

---

## CORS設定 🟡

**信頼性**: 🟡 *Next.jsデフォルト動作から推測（同一オリジン）*

Next.jsのデフォルト設定を使用。フロントエンドとバックエンドが同一Next.jsアプリなので追加のCORS設定は不要。

---

## 関連文書

- **アーキテクチャ**: [architecture.md](architecture.md)
- **型定義**: [interfaces.ts](interfaces.ts)
- **データフロー**: [dataflow.md](dataflow.md)
- **DBスキーマ**: [database-schema.sql](database-schema.sql)
- **要件定義**: [requirements.md](../../spec/rss-feed-registration/requirements.md)

## 信頼性レベルサマリー

- 🔵 青信号: 22件 (92%)
- 🟡 黄信号: 2件 (8%)
- 🔴 赤信号: 0件 (0%)

**品質評価**: 高品質
