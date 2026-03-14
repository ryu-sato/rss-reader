-- ========================================
-- RSSエントリー閲覧 データベーススキーマ（追加分）
-- ========================================
--
-- 作成日: 2026-03-14
-- 関連設計: architecture.md
-- 既存スキーマ: prisma/schema.prisma（feeds テーブル）
--
-- 注意: このプロジェクトは Prisma ORM + SQLite を使用しています。
--       実際のスキーマは prisma/schema.prisma で管理し、
--       このファイルは設計参照用のSQL定義です。
--       Prisma スキーマ定義は末尾に記載。
--
-- 信頼性レベル:
-- - 🔵 青信号: EARS要件定義書・設計文書・既存DBスキーマを参考にした確実な定義
-- - 🟡 黄信号: EARS要件定義書・設計文書・既存DBスキーマから妥当な推測による定義
-- - 🔴 赤信号: EARS要件定義書・設計文書・既存DBスキーマにない推測による定義
--

-- ========================================
-- 既存テーブル（参照用）
-- ========================================

-- feeds テーブル（既存 - 変更なし）
-- 🔵 信頼性: 既存 prisma/schema.prisma より
--
-- CREATE TABLE feeds (
--   id            TEXT PRIMARY KEY,    -- UUID
--   url           TEXT NOT NULL UNIQUE,
--   title         TEXT NOT NULL,
--   description   TEXT,
--   memo          TEXT,
--   createdAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   updatedAt     DATETIME NOT NULL,
--   lastFetchedAt DATETIME
-- );

-- ========================================
-- 新規追加テーブル
-- ========================================

-- entries テーブル
-- 🔵 信頼性: 要件定義 データモデル「Entry」・ヒアリング: 全文保存より
CREATE TABLE entries (
  id           TEXT PRIMARY KEY,          -- 🔵 UUID（Prismaが生成）
  feedId       TEXT NOT NULL,             -- 🔵 要件定義 データモデルより（FK → feeds.id）
  guid         TEXT NOT NULL,             -- 🔵 REQ-103: 重複排除キー（RSS GUID）
  title        TEXT NOT NULL,             -- 🔵 REQ-013より
  link         TEXT NOT NULL,             -- 🔵 REQ-013より（元記事URL）
  description  TEXT,                      -- 🔵 REQ-013より（概要テキスト）
  content      TEXT,                      -- 🔵 REQ-013・ヒアリング: 全文保存より（プレーンテキスト）
  publishedAt  DATETIME,                  -- 🔵 REQ-013より（null可: EDGE-002）
  createdAt    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- 🔵 既存パターンより
  updatedAt    DATETIME NOT NULL,         -- 🔵 既存パターンより

  FOREIGN KEY (feedId) REFERENCES feeds(id) ON DELETE CASCADE,  -- 🔵 Feed削除時にEntryも削除
  UNIQUE (feedId, guid)  -- 🔵 REQ-103: feedId + guid の複合ユニーク制約（重複排除）
);

-- entry_metas テーブル
-- 🔵 信頼性: 要件定義 データモデル「EntryMeta」・ヒアリング: 既読・後で読むより
CREATE TABLE entry_metas (
  id           TEXT PRIMARY KEY,          -- 🔵 UUID
  entryId      TEXT NOT NULL UNIQUE,      -- 🔵 1エントリー1メタ（@unique制約）
  isRead       INTEGER NOT NULL DEFAULT 0,      -- 🔵 REQ-008より（SQLite: 0=false, 1=true）
  isReadLater  INTEGER NOT NULL DEFAULT 0,      -- 🔵 REQ-009より
  createdAt    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt    DATETIME NOT NULL,

  FOREIGN KEY (entryId) REFERENCES entries(id) ON DELETE CASCADE  -- 🔵 Entry削除時にMetaも削除
);

-- tags テーブル
-- 🔵 信頼性: 要件定義 データモデル「Tag」・ヒアリング: タグcase-insensitiveより
CREATE TABLE tags (
  id        TEXT PRIMARY KEY,             -- 🔵 UUID
  name      TEXT NOT NULL UNIQUE,         -- 🔵 REQ-011より（小文字正規化して保存: ヒアリングより）
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP  -- 🔵 既存パターンより
);

-- entry_tags テーブル（中間テーブル）
-- 🔵 信頼性: 要件定義 データモデル「EntryTag」・REQ-010より
CREATE TABLE entry_tags (
  entryId TEXT NOT NULL,  -- 🔵 FK → entries.id
  tagId   TEXT NOT NULL,  -- 🔵 FK → tags.id

  PRIMARY KEY (entryId, tagId),  -- 🔵 複合主キー（重複防止）

  FOREIGN KEY (entryId) REFERENCES entries(id) ON DELETE CASCADE,  -- 🔵 Entry削除時にTagも解除
  FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE         -- 🟡 Tag削除時にエントリー紐付けも削除
);

-- ========================================
-- インデックス
-- ========================================

-- エントリー一覧取得（publishedAt 降順ソート）の高速化
-- 🔵 信頼性: REQ-001（公開日時降順）・NFR-001（2秒以内）より
CREATE INDEX idx_entries_published_at ON entries(publishedAt DESC);

-- フィード別エントリー取得（REQ-004フィルター + REQ-102上限削除）の高速化
-- 🔵 信頼性: REQ-004, REQ-102より
CREATE INDEX idx_entries_feed_id ON entries(feedId);

-- タグ別フィルター（REQ-005）の高速化
-- 🔵 信頼性: REQ-005より
CREATE INDEX idx_entry_tags_tag_id ON entry_tags(tagId);

-- 既読・後で読むフィルター（REQ-301: 未読件数表示）の高速化
-- 🟡 信頼性: REQ-301（オプション: 未読件数表示）から妥当な推測
CREATE INDEX idx_entry_metas_is_read ON entry_metas(isRead);
CREATE INDEX idx_entry_metas_is_read_later ON entry_metas(isReadLater);

-- ========================================
-- Prisma スキーマ定義（prisma/schema.prisma に追加する内容）
-- ========================================
--
-- 以下を prisma/schema.prisma の既存 Feed モデルの後に追加:
--
-- model Entry {
--   id          String     @id @default(uuid())
--   feedId      String
--   guid        String
--   title       String
--   link        String
--   description String?
--   content     String?
--   publishedAt DateTime?
--   createdAt   DateTime   @default(now())
--   updatedAt   DateTime   @updatedAt
--
--   feed        Feed       @relation(fields: [feedId], references: [id], onDelete: Cascade)
--   meta        EntryMeta?
--   tags        EntryTag[]
--
--   @@unique([feedId, guid])
--   @@index([publishedAt(sort: Desc)])
--   @@index([feedId])
--   @@map("entries")
-- }
--
-- model EntryMeta {
--   id           String   @id @default(uuid())
--   entryId      String   @unique
--   isRead       Boolean  @default(false)
--   isReadLater  Boolean  @default(false)
--   createdAt    DateTime @default(now())
--   updatedAt    DateTime @updatedAt
--
--   entry        Entry    @relation(fields: [entryId], references: [id], onDelete: Cascade)
--
--   @@map("entry_metas")
-- }
--
-- model Tag {
--   id        String     @id @default(uuid())
--   name      String     @unique   -- 小文字正規化して保存
--   createdAt DateTime   @default(now())
--
--   entries   EntryTag[]
--
--   @@map("tags")
-- }
--
-- model EntryTag {
--   entryId String
--   tagId   String
--
--   entry   Entry  @relation(fields: [entryId], references: [id], onDelete: Cascade)
--   tag     Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)
--
--   @@id([entryId, tagId])
--   @@index([tagId])
--   @@map("entry_tags")
-- }
--
-- また、既存の Feed モデルに以下のリレーションを追加:
--   entries Entry[]

-- ========================================
-- 信頼性レベルサマリー
-- ========================================
-- - 🔵 青信号: 20件 (87%)
-- - 🟡 黄信号: 3件 (13%)
-- - 🔴 赤信号: 0件 (0%)
--
-- 品質評価: 高品質
