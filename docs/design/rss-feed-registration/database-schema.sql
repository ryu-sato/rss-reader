-- ========================================
-- RSSシードの登録 データベーススキーマ
-- ========================================
--
-- 作成日: 2026-03-13
-- DB: SQLite (Prisma管理)
-- 関連設計: architecture.md
-- 注意: このファイルはSQLite構文で記述。実際の管理はprisma/schema.prismaを使用。
--
-- 信頼性レベル:
-- - 🔵 青信号: EARS要件定義書・設計文書・ユーザヒアリングを参考にした確実な定義
-- - 🟡 黄信号: EARS要件定義書・設計文書・ユーザヒアリングから妥当な推測による定義
-- - 🔴 赤信号: EARS要件定義書・設計文書・ユーザヒアリングにない推測による定義
--

-- ========================================
-- テーブル定義
-- ========================================

-- feeds テーブル
-- 🔵 信頼性: 要件定義 データモデル・ヒアリングQ5（保存情報）, Q8（最大文字数）より
CREATE TABLE feeds (
    -- 主キー
    id          TEXT        NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' ||
                                                          lower(hex(randomblob(2))) || '-4' ||
                                                          substr(lower(hex(randomblob(2))),2) || '-' ||
                                                          substr('89ab',abs(random()) % 4 + 1, 1) ||
                                                          substr(lower(hex(randomblob(2))),2) || '-' ||
                                                          lower(hex(randomblob(6)))),
                            -- 🔵 UUID v4形式 (SQLite標準関数で生成)

    -- フィード情報
    url         TEXT        NOT NULL UNIQUE,
                            -- 🔵 RSSフィードURL (REQ-401: UNIQUE制約, EDGE-101: max 2048)
    title       TEXT        NOT NULL,
                            -- 🔵 フィードタイトル自動取得 (REQ-102)
                            -- EDGE-003: タイトル空の場合はURLをフォールバック
    description TEXT        CHECK (length(description) <= 1000),
                            -- 🔵 フィード説明 (ヒアリングQ5, Q8: max 1000文字)
    memo        TEXT        CHECK (length(memo) <= 1000),
                            -- 🔵 ユーザー定義メモ (REQ-004, Q8: max 1000文字)

    -- 日時
    created_at  DATETIME    NOT NULL DEFAULT (datetime('now')),
                            -- 🔵 登録日時 (REQ-003)
    updated_at  DATETIME    NOT NULL DEFAULT (datetime('now')),
                            -- 🔵 最終更新日時 (REQ-003)
    last_fetched_at DATETIME,
                            -- 🔵 最終フェッチ日時 (note.md データモデルより)

    -- チェック制約
    CONSTRAINT feeds_url_check CHECK (
        url LIKE 'http://%' OR url LIKE 'https://%'
    ),
                            -- 🔵 REQ-402: http/https のみ許可
    CONSTRAINT feeds_url_length CHECK (length(url) <= 2048)
                            -- 🟡 EDGE-101: URL最大2048文字
);

-- ========================================
-- インデックス
-- ========================================

-- URL検索用（重複チェック時に使用）
-- 🔵 信頼性: REQ-103, REQ-401 重複チェック要件より（UNIQUE制約で自動作成されるが明示）
-- SQLite では UNIQUE 制約により自動的にインデックスが作成される
-- CREATE UNIQUE INDEX idx_feeds_url ON feeds(url);  -- UNIQUE制約で代替

-- 登録日時降順ソート用（一覧表示）
-- 🟡 信頼性: REQ-002, REQ-003（一覧表示）のパフォーマンスから推測
CREATE INDEX idx_feeds_created_at ON feeds(created_at DESC);

-- ========================================
-- トリガー
-- ========================================

-- updated_at 自動更新トリガー
-- 🔵 信頼性: REQ-104（編集時に updated_at を更新）より
CREATE TRIGGER feeds_updated_at
    AFTER UPDATE ON feeds
    FOR EACH ROW
BEGIN
    UPDATE feeds SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- ========================================
-- Prisma schema.prisma 対応定義（参考）
-- ========================================
--
-- 以下はPrismaスキーマファイル (prisma/schema.prisma) に記述する内容:
--
-- generator client {
--   provider = "prisma-client-js"
-- }
--
-- datasource db {
--   provider = "sqlite"
--   url      = env("DATABASE_URL")
-- }
--
-- model Feed {
--   id            String   @id @default(uuid())    // 🔵 UUID主キー
--   url           String   @unique                 // 🔵 UNIQUE制約 (REQ-401)
--   title         String                           // 🔵 NOT NULL (REQ-102)
--   description   String?                          // 🔵 nullable (ヒアリングQ5)
--   memo          String?                          // 🔵 nullable (REQ-004)
--   createdAt     DateTime @default(now())         // 🔵 登録日時 (REQ-003)
--   updatedAt     DateTime @updatedAt              // 🔵 自動更新 (REQ-003)
--   lastFetchedAt DateTime?                        // 🔵 最終フェッチ日時
--
--   @@map("feeds")
-- }
--
-- 注意: Prismaのバリデーション（max 1000文字等）はアプリケーション層で実装

-- ========================================
-- 信頼性レベルサマリー
-- ========================================
-- - 🔵 青信号: 10件 (83%)
-- - 🟡 黄信号: 2件 (17%)
-- - 🔴 赤信号: 0件 (0%)
--
-- 品質評価: 高品質
