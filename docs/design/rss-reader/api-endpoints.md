# API仕様書（逆生成）

## 分析日時
2026-03-16

## ベースURL
`/api/`

## 認証方式
なし（デプロイ層でリバースプロキシ/OAuthにて対応）

## 共通レスポンス形式

### 成功レスポンス
```typescript
{
  success: true;
  data: T;
}
```

### ページネーション付き成功レスポンス
```typescript
{
  success: true;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}
```

### エラーレスポンス
```typescript
{
  success: false;
  error: {
    code: string;
    message: string;
  };
}
```

---

## フィード API

### GET /api/feeds
**説明**: 全フィード一覧（未読数付き）を取得

**レスポンス** `200`:
```typescript
{
  success: true;
  data: FeedListItem[];
}

// FeedListItem
{
  id: string;
  url: string;
  title: string;
  description: string | null;
  faviconUrl: string | null;
  memo: string | null;
  createdAt: string;      // ISO 8601
  updatedAt: string;
  lastFetchedAt: string | null;
  unreadCount: number;
  lastEntryPublishedAt: string | null;
}
```

---

### POST /api/feeds
**説明**: 新規フィード登録（RSS取得・検証を含む）

**リクエスト**:
```typescript
{
  url: string;  // http/https URLのみ許可
}
```

**レスポンス** `201`:
```typescript
{
  success: true;
  data: {
    id: string;
    url: string;
    title: string;
    description: string | null;
    faviconUrl: string | null;
    memo: string | null;
    createdAt: string;
    updatedAt: string;
    lastFetchedAt: string | null;
  };
}
```

**エラー**:
- `400 INVALID_URL` — URLフォーマット不正
- `400 SSRF_DETECTED` — プライベートIP/ローカルホストへのアクセス検出
- `400 INVALID_FEED` — RSSフィードとして解析不可
- `409 FEED_ALREADY_EXISTS` — 同URLのフィードが既存

---

### GET /api/feeds/[id]
**説明**: 指定フィードの詳細取得

**レスポンス** `200`:
```typescript
{
  success: true;
  data: Feed;
}
```

**エラー**: `404 NOT_FOUND`

---

### PUT /api/feeds/[id]
**説明**: フィードメタデータ更新

**リクエスト**:
```typescript
{
  title?: string;
  description?: string | null;
  memo?: string | null;
}
```

**レスポンス** `200`: `{ success: true; data: Feed }`

**エラー**: `400 VALIDATION_ERROR`, `404 NOT_FOUND`

---

### DELETE /api/feeds/[id]
**説明**: フィード削除（関連記事・EntryMetaもカスケード削除）

**レスポンス** `200`: `{ success: true }`

**エラー**: `404 NOT_FOUND`

---

### POST /api/feeds/refresh
**説明**: 全フィードの記事を手動更新

**リクエスト**: なし

**レスポンス** `200`:
```typescript
{
  success: true;
  data: {
    updatedFeeds: number;
    newEntries: number;
  };
}
```

---

## 記事 API

### GET /api/entries
**説明**: 記事一覧をフィルタ・ページネーション付きで取得

**クエリパラメータ**:
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `feedId` | string | フィードIDでフィルタ |
| `tagId` | string | タグIDでフィルタ |
| `search` | string | タイトル全文検索 |
| `page` | number | ページ番号（デフォルト: 1）|
| `limit` | number | 1ページあたり件数（デフォルト: 20）|
| `afterId` | string | カーソルページネーション（ID以降）|
| `beforeId` | string | カーソルページネーション（ID以前）|
| `isReadLater` | boolean | あとで読む記事のみ |
| `isUnread` | boolean | 未読記事のみ |

**レスポンス** `200`:
```typescript
{
  success: true;
  data: {
    items: EntryListItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

// EntryListItem
{
  id: string;
  feedId: string;
  guid: string;
  title: string;
  link: string;
  description: string | null;
  imageUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  feed: {
    id: string;
    title: string;
    faviconUrl: string | null;
  };
  meta: {
    isRead: boolean;
    isReadLater: boolean;
  } | null;
  tags: {
    id: string;
    name: string;
  }[];
}
```

**注意**: `feedId`が未指定の場合、同一リンクの記事を重複排除（SQLウィンドウ関数使用）

---

### GET /api/entries/[id]
**説明**: 記事詳細（フルコンテンツ付き）取得

**レスポンス** `200`:
```typescript
{
  success: true;
  data: EntryDetail;
}

// EntryDetail extends EntryListItem
{
  // EntryListItemの全フィールド +
  content: string | null;
}
```

**エラー**: `404 NOT_FOUND`

---

### GET /api/entries/read-later-unread-count
**説明**: あとで読む・未読記事数の取得（サイドバー表示用）

**レスポンス** `200`:
```typescript
{
  success: true;
  data: {
    count: number;
  };
}
```

---

### PUT /api/entries/[id]/meta
**説明**: 記事メタデータ（既読・あとで読む）更新

**リクエスト**:
```typescript
{
  isRead?: boolean;
  isReadLater?: boolean;
}
```

**レスポンス** `200`:
```typescript
{
  success: true;
  data: {
    id: string;
    entryId: string;
    isRead: boolean;
    isReadLater: boolean;
    createdAt: string;
    updatedAt: string;
  };
}
```

**注意**: `isRead: true`の場合、同一リンクを持つ全記事が既読に設定される

**エラー**: `400 VALIDATION_ERROR`, `404 NOT_FOUND`

---

## タグ API

### GET /api/tags
**説明**: 全タグ一覧取得

**レスポンス** `200`:
```typescript
{
  success: true;
  data: {
    id: string;
    name: string;
    createdAt: string;
    _count: {
      entries: number;
    };
  }[];
}
```

---

### POST /api/tags
**説明**: タグ作成・記事へのタグ付け

**リクエスト**:
```typescript
{
  name: string;   // 自動でlowercaseに正規化
  entryId: string;
}
```

**レスポンス** `201`:
```typescript
{
  success: true;
  data: {
    id: string;
    name: string;
    createdAt: string;
  };
}
```

**注意**: 同名タグは upsert（既存タグを再利用）

**エラー**: `400 VALIDATION_ERROR`, `404 ENTRY_NOT_FOUND`

---

### PATCH /api/tags/[tagId]
**説明**: タグ名変更

**リクエスト**:
```typescript
{
  name: string;
}
```

**レスポンス** `200`: `{ success: true; data: Tag }`

**エラー**: `400 VALIDATION_ERROR`, `404 NOT_FOUND`, `409 TAG_ALREADY_EXISTS`

---

### DELETE /api/tags/[tagId]
**説明**: タグ削除（全EntryTag関連も削除）

**レスポンス** `200`: `{ success: true }`

**エラー**: `404 NOT_FOUND`

---

### DELETE /api/tags/[tagId]/entries/[entryId]
**説明**: 記事からタグを削除

**レスポンス** `200`: `{ success: true }`

**エラー**: `404 NOT_FOUND`

---

## ダイジェスト API

### GET /api/digests
**説明**: ダイジェスト一覧取得（ページネーション付き）

**クエリパラメータ**:
| パラメータ | 型 | デフォルト |
|-----------|-----|---------|
| `page` | number | 1 |
| `limit` | number | 20 |

**レスポンス** `200`:
```typescript
{
  success: true;
  data: {
    items: DigestListItem[];
    pagination: { page, limit, total, hasNext, hasPrev };
  };
}

// DigestListItem
{
  id: string;
  title: string | null;
  content: string;         // Markdownテキスト
  createdAt: string;
}
```

---

### POST /api/digests
**説明**: 新規ダイジェスト作成

**リクエスト**:
```typescript
{
  title?: string | null;
  content: string;   // 必須
}
```

**レスポンス** `201`: `{ success: true; data: Digest }`

**エラー**: `400 VALIDATION_ERROR`

---

### GET /api/digests/[id]
**説明**: ダイジェスト詳細取得（`unstable_cache`でキャッシュ）

**レスポンス** `200`: `{ success: true; data: Digest }`

**エラー**: `404 NOT_FOUND`

---

### PATCH /api/digests/[id]
**説明**: ダイジェスト更新

**リクエスト**:
```typescript
{
  title?: string | null;
  content?: string;
}
```

**レスポンス** `200`: `{ success: true; data: Digest }`

**エラー**: `400 VALIDATION_ERROR`, `404 NOT_FOUND`

---

### DELETE /api/digests/[id]
**説明**: ダイジェスト削除

**レスポンス** `200`: `{ success: true }`

**エラー**: `404 NOT_FOUND`

---

## エラーコード一覧

| コード | HTTPステータス | 説明 |
|--------|--------------|------|
| `INVALID_URL` | 400 | URLフォーマット不正 |
| `SSRF_DETECTED` | 400 | プライベートIPへのアクセス試行 |
| `INVALID_FEED` | 400 | RSSフィード解析失敗 |
| `VALIDATION_ERROR` | 400 | Zodバリデーションエラー |
| `NOT_FOUND` | 404 | リソース未存在 |
| `ENTRY_NOT_FOUND` | 404 | 記事未存在 |
| `FEED_ALREADY_EXISTS` | 409 | URL重複 |
| `TAG_ALREADY_EXISTS` | 409 | タグ名重複 |
| `INTERNAL_ERROR` | 500 | サーバー内部エラー |
