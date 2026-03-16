# データベース設計（逆生成）

## 分析日時
2026-03-16

## スキーマ概要

- **DBMS**: SQLite（LibSQL経由、Prismaアダプタ使用）
- **スキーマファイル**: `prisma/schema.prisma`
- **マイグレーション**: `prisma/migrations/`

### テーブル一覧
| テーブル名 | 説明 |
|-----------|------|
| `feeds` | RSSフィード登録情報 |
| `entries` | RSS記事エントリ |
| `entry_metas` | 記事のユーザーメタデータ（既読・あとで読む） |
| `tags` | タグ定義 |
| `entry_tags` | 記事とタグの多対多中間テーブル |
| `digests` | ダイジェスト（メモ・まとめ） |

---

## ER図

```mermaid
erDiagram
    feeds {
        text id PK
        text url UK
        text title
        text description
        text favicon_url
        text memo
        datetime created_at
        datetime updated_at
        datetime last_fetched_at
    }

    entries {
        text id PK
        text feed_id FK
        text guid
        text title
        text link
        text description
        text content
        text image_url
        datetime published_at
        datetime created_at
        datetime updated_at
    }

    entry_metas {
        text id PK
        text entry_id FK_UK
        boolean is_read
        boolean is_read_later
        datetime created_at
        datetime updated_at
    }

    tags {
        text id PK
        text name UK
        datetime created_at
    }

    entry_tags {
        text entry_id PK_FK
        text tag_id PK_FK
    }

    digests {
        text id PK
        text title
        text content
        datetime created_at
    }

    feeds ||--o{ entries : "has"
    entries ||--o| entry_metas : "has"
    entries }o--o{ tags : "via entry_tags"
    entries ||--o{ entry_tags : "has"
    tags ||--o{ entry_tags : "has"
```

---

## テーブル詳細

### feeds テーブル

```sql
CREATE TABLE "feeds" (
    "id" TEXT NOT NULL PRIMARY KEY,       -- UUID
    "url" TEXT NOT NULL UNIQUE,           -- RSSフィードURL
    "title" TEXT NOT NULL,                -- フィードタイトル
    "description" TEXT,                   -- フィード説明
    "favicon_url" TEXT,                   -- ファビコンURL
    "memo" TEXT,                          -- ユーザーメモ
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "last_fetched_at" DATETIME            -- 最終フェッチ日時
);
```

**カラム説明**:
- `id`: cuid2によるUUID
- `url`: フィードのRSS/Atom URL（ユニーク制約）
- `title`: rss-parserから取得したフィードタイトル
- `description`: rss-parserから取得した説明文
- `favicon_url`: フィードサイトのファビコンURL
- `memo`: ユーザーが自由に入力できるメモ
- `last_fetched_at`: cronジョブ実行時に更新

---

### entries テーブル

```sql
CREATE TABLE "entries" (
    "id" TEXT NOT NULL PRIMARY KEY,       -- UUID
    "feed_id" TEXT NOT NULL,              -- FK: feeds.id
    "guid" TEXT NOT NULL,                 -- RSSのguid/id
    "title" TEXT NOT NULL,                -- 記事タイトル
    "link" TEXT NOT NULL,                 -- 記事URL
    "description" TEXT,                   -- 記事概要（HTML）
    "content" TEXT,                       -- 記事フルコンテンツ
    "image_url" TEXT,                     -- サムネイル画像URL
    "published_at" DATETIME,              -- 記事公開日時
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "entries_feed_id_guid_key" UNIQUE ("feed_id", "guid"),
    FOREIGN KEY ("feed_id") REFERENCES "feeds"("id") ON DELETE CASCADE
);

CREATE INDEX "entries_published_at_idx" ON "entries"("published_at" DESC);
CREATE INDEX "entries_feed_id_idx" ON "entries"("feed_id");
```

**カラム説明**:
- `guid`: RSSエントリのguid/id（フィード内でユニーク）
- `link`: 記事の実際のURL（重複排除の基準）
- `description`: RSSから取得した概要（HTMLを含む場合あり）
- `content`: フルコンテンツ（content:encodedフィールド等）
- `image_url`: メディアenclosure、OGP画像等から抽出

**ユニーク制約**: `(feed_id, guid)` — 同一フィード内の重複記事防止

---

### entry_metas テーブル

```sql
CREATE TABLE "entry_metas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entry_id" TEXT NOT NULL UNIQUE,      -- FK: entries.id (1:1)
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "is_read_later" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    FOREIGN KEY ("entry_id") REFERENCES "entries"("id") ON DELETE CASCADE
);
```

**設計意図**:
- `entries`から分離することで、記事データと状態データを疎結合に
- 記事が存在してもmetaレコードがない場合はデフォルト値（未読・未保存）として扱う
- 同一リンクの記事を既読にする際、全関連entryのmetaを一括更新

---

### tags テーブル

```sql
CREATE TABLE "tags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,          -- lowercase正規化済み
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**設計意図**:
- タグ名はAPI受信時にlowercaseに正規化してupsert
- 全ユーザー共通のグローバルタグ（ユーザー分離なし）

---

### entry_tags テーブル（中間テーブル）

```sql
CREATE TABLE "entry_tags" (
    "entry_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    PRIMARY KEY ("entry_id", "tag_id"),
    FOREIGN KEY ("entry_id") REFERENCES "entries"("id") ON DELETE CASCADE,
    FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE
);

CREATE INDEX "entry_tags_tag_id_idx" ON "entry_tags"("tag_id");
```

---

### digests テーブル

```sql
CREATE TABLE "digests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,                         -- 任意タイトル
    "content" TEXT NOT NULL,              -- Markdownコンテンツ
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "digests_created_at_idx" ON "digests"("created_at" DESC);
```

---

## 制約・関係性

### 外部キー制約（カスケード削除）
| 親テーブル | 子テーブル | 動作 |
|-----------|-----------|------|
| `feeds` | `entries` | フィード削除時、関連記事を全削除 |
| `entries` | `entry_metas` | 記事削除時、メタデータを削除 |
| `entries` | `entry_tags` | 記事削除時、タグ関連を削除 |
| `tags` | `entry_tags` | タグ削除時、全記事のタグ関連を削除 |

### ユニーク制約
| テーブル | カラム | 説明 |
|---------|-------|------|
| `feeds` | `url` | 同一URLの二重登録防止 |
| `entries` | `(feed_id, guid)` | 同一フィード内の記事重複防止 |
| `entry_metas` | `entry_id` | 記事1件につきメタ1件 |
| `tags` | `name` | タグ名の一意性 |

---

## データアクセスパターン

### よく使用されるクエリ

#### 記事一覧（重複排除）
フィードIDが未指定の場合、同一リンクの記事を重複排除するためSQLウィンドウ関数を使用:

```sql
-- 同一リンクのうち最新記事のみを取得
WITH ranked AS (
  SELECT *,
    ROW_NUMBER() OVER (
      PARTITION BY link
      ORDER BY published_at DESC, created_at DESC
    ) AS rn
  FROM entries
)
SELECT * FROM ranked WHERE rn = 1
ORDER BY published_at DESC, created_at DESC;
```

#### 既読状態の伝播
```sql
-- 同一リンクの全記事を既読に更新
UPDATE entry_metas
SET is_read = true
WHERE entry_id IN (
  SELECT id FROM entries WHERE link = :link
);
```

#### フィードの未読数集計
```sql
SELECT f.id, COUNT(e.id) AS unread_count
FROM feeds f
LEFT JOIN entries e ON e.feed_id = f.id
LEFT JOIN entry_metas em ON em.entry_id = e.id
WHERE em.is_read = false OR em.id IS NULL
GROUP BY f.id;
```

### パフォーマンス考慮事項

- **`entries.published_at DESC`インデックス**: 記事一覧の降順ソートを高速化
- **`entries.feed_id`インデックス**: フィード別フィルタリングを高速化
- **`entry_tags.tag_id`インデックス**: タグ別フィルタリングを高速化
- **`digests.created_at DESC`インデックス**: ダイジェスト一覧ソートを高速化
- **500件制限**: フィードあたり最大500記事（cronジョブ時に自動削除）

---

## マイグレーション履歴

| ファイル | 内容 |
|---------|------|
| `20260314053940_init` | `feeds`テーブル初期作成 |
| `20260314092543_add_entry_tables` | `entries`, `entry_metas`, `tags`, `entry_tags`テーブル追加 |
| `20260314100000_add_image_url_to_entries` | `entries.image_url`カラム追加 |
| `20260314152200_add_feed_favicon` | `feeds.favicon_url`カラム追加 |
| `20260315082601_add_digest_table` | `digests`テーブル追加 |
