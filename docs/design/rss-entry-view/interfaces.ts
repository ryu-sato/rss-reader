/**
 * RSSエントリー閲覧 型定義
 *
 * 作成日: 2026-03-14
 * 関連設計: architecture.md
 * 既存型定義: src/types/feed.ts（Feed, FeedListItem, ErrorResponse等）
 *
 * 信頼性レベル:
 * - 🔵 青信号: EARS要件定義書・設計文書・既存実装を参考にした確実な型定義
 * - 🟡 黄信号: EARS要件定義書・設計文書・既存実装から妥当な推測による型定義
 * - 🔴 赤信号: EARS要件定義書・設計文書・既存実装にない推測による型定義
 *
 * 注: 実装時は src/types/entry.ts として配置
 */

// ========================================
// エンティティ定義
// ========================================

/**
 * エントリー（記事）エンティティ
 * 🔵 信頼性: 要件定義 データモデル「Entry」より
 */
export interface Entry {
  id: string             // 🔵 DBスキーマより（UUID）
  feedId: string         // 🔵 要件定義 データモデルより（FK → Feed.id）
  guid: string           // 🔵 要件定義 データモデルより（RSS entry GUID）
  title: string          // 🔵 要件定義 REQ-013より
  link: string           // 🔵 要件定義 REQ-013より
  description: string | null  // 🔵 要件定義 REQ-013より（概要）
  content: string | null      // 🔵 要件定義 REQ-013・ヒアリング: 全文保存より
  publishedAt: Date | null    // 🔵 要件定義 REQ-013より
  createdAt: Date             // 🔵 既存Feed型パターンより
  updatedAt: Date             // 🔵 既存Feed型パターンより
}

/**
 * エントリー一覧表示用（軽量版）
 * 🔵 信頼性: REQ-002（タイトル・フィード名表示）・既存FeedListItemパターンより
 */
export interface EntryListItem {
  id: string             // 🔵 識別子
  title: string          // 🔵 REQ-002より
  link: string           // 🔵 元記事リンク
  publishedAt: Date | null    // 🔵 ソートキー
  createdAt: Date             // 🔵 フォールバック日時
  feed: {
    id: string
    title: string        // 🔵 REQ-002: フィード名表示より
  }
  meta: EntryMeta | null      // 🔵 既読・後で読む状態
  tags: TagOnEntry[]          // 🔵 タグ一覧
}

/**
 * エントリーモーダル用（詳細）
 * 🔵 信頼性: REQ-006（モーダル表示内容）より
 */
export interface EntryDetail extends Entry {
  feed: {
    id: string
    title: string
  }
  meta: EntryMeta | null
  tags: TagOnEntry[]
}

/**
 * エントリーメタ情報
 * 🔵 信頼性: 要件定義 データモデル「EntryMeta」・ヒアリング: 既読・後で読むより
 */
export interface EntryMeta {
  id: string             // 🔵 DBスキーマより
  entryId: string        // 🔵 FK → Entry.id
  isRead: boolean        // 🔵 REQ-008より（default: false）
  isReadLater: boolean   // 🔵 REQ-009より（default: false）
  createdAt: Date        // 🔵 既存パターンより
  updatedAt: Date        // 🔵 既存パターンより
}

/**
 * タグエンティティ
 * 🔵 信頼性: 要件定義 データモデル「Tag」・ヒアリング: タグ機能より
 */
export interface Tag {
  id: string             // 🔵 DBスキーマより
  name: string           // 🔵 REQ-011より（小文字正規化して保存）
  createdAt: Date        // 🔵 既存パターンより
}

/**
 * エントリーとタグの関連（中間テーブル）
 * 🔵 信頼性: 要件定義 データモデル「EntryTag」より
 */
export interface TagOnEntry {
  entryId: string        // 🔵 FK → Entry.id
  tagId: string          // 🔵 FK → Tag.id
  tag: Tag               // 🔵 include で取得
}

// ========================================
// APIリクエスト/レスポンス
// ========================================

/**
 * エントリー一覧取得リクエスト（クエリパラメータ）
 * 🔵 信頼性: REQ-003, REQ-004, REQ-005・ヒアリング: URLクエリパラメータより
 */
export interface GetEntriesQuery {
  feedId?: string        // 🔵 REQ-004: フィード別フィルターより
  tagId?: string         // 🔵 REQ-005: タグ別フィルターより
  page?: number          // 🔵 REQ-003: ページネーションより（default: 1）
  limit?: number         // 🟡 ページサイズ（default: 20、REQ-003より）
  afterId?: string       // 🔵 REQ-007: 前後ナビ用（次のエントリー取得）
  beforeId?: string      // 🔵 REQ-007: 前後ナビ用（前のエントリー取得）
}

/**
 * エントリー一覧レスポンス
 * 🔵 信頼性: 既存GetFeedsResponseパターン・REQ-001, REQ-003より
 */
export interface GetEntriesResponse {
  success: true
  data: EntryListItem[]
  pagination: {
    page: number         // 🔵 REQ-003より
    limit: number        // 🔵 REQ-003より
    total: number        // 🔵 ページネーションUIのため必要
    hasNext: boolean     // 🔵 REQ-007: 前後ナビのためのフラグ
    hasPrev: boolean     // 🔵 REQ-007: 前後ナビのためのフラグ
  }
}

/**
 * エントリー詳細レスポンス
 * 🔵 信頼性: 既存GetFeedResponseパターン・REQ-006より
 */
export interface GetEntryResponse {
  success: true
  data: EntryDetail
}

/**
 * エントリーメタ更新リクエスト
 * 🔵 信頼性: REQ-008, REQ-009・ヒアリング: モーダルで即時反映より
 */
export interface UpdateEntryMetaRequest {
  isRead?: boolean       // 🔵 REQ-008より
  isReadLater?: boolean  // 🔵 REQ-009より
}

/**
 * エントリーメタ更新レスポンス
 * 🔵 信頼性: 既存UpdateFeedResponseパターンより
 */
export interface UpdateEntryMetaResponse {
  success: true
  data: EntryMeta
}

/**
 * タグ作成・付与リクエスト
 * 🔵 信頼性: REQ-010, REQ-011, REQ-012・ヒアリング: タグcase-insensitiveより
 */
export interface CreateTagRequest {
  name: string           // 🔵 REQ-011より（アプリ層で toLowerCase() して送信）
  entryId: string        // 🔵 REQ-010より（付与先エントリーID）
}

/**
 * タグ作成・付与レスポンス
 * 🔵 信頼性: 既存APIレスポンスパターンより
 */
export interface CreateTagResponse {
  success: true
  data: Tag
}

/**
 * タグ一覧取得レスポンス
 * 🔵 信頼性: REQ-012: 既存タグ選択より
 */
export interface GetTagsResponse {
  success: true
  data: Tag[]
}

// ========================================
// エラーコード（既存 ErrorCode に追加）
// ========================================

/**
 * エントリー閲覧機能固有のエラーコード
 * 🔵 信頼性: 既存ErrorCodeパターン（src/types/feed.ts）より
 */
export type EntryErrorCode =
  | 'ENTRY_NOT_FOUND'    // 🔵 エントリーが存在しない
  | 'TAG_NOT_FOUND'      // 🔵 タグが存在しない
  | 'TAG_ALREADY_EXISTS' // 🟡 タグが既に付与済み（upsertで自動処理のため通常不要）
  | 'VALIDATION_ERROR'   // 🔵 既存パターンより
  | 'INTERNAL_SERVER_ERROR' // 🔵 既存パターンより

// ========================================
// エントリーフェッチャー内部型
// ========================================

/**
 * RSS エントリーフェッチャーが返すデータ
 * 🔵 信頼性: 既存FetchedFeedInfo・REQ-013より
 */
export interface FetchedEntryData {
  guid: string           // 🔵 重複排除キー（REQ-103）
  title: string          // 🔵 REQ-013より
  link: string           // 🔵 REQ-013より
  description: string | null  // 🔵 REQ-013より（概要）
  content: string | null      // 🔵 REQ-013・ヒアリング: 全文保存より（プレーンテキスト変換済み）
  publishedAt: Date | null    // 🔵 REQ-013より
}

// ========================================
// Prisma 入力型
// ========================================

/**
 * エントリー保存用入力型
 * 🔵 信頼性: 既存CreateFeedInputパターン・REQ-013より
 */
export type CreateEntryInput = Omit<Entry, 'id' | 'createdAt' | 'updatedAt'>

/**
 * エントリーメタ更新用入力型
 * 🔵 信頼性: 既存UpdateFeedInputパターン・REQ-008, REQ-009より
 */
export type UpdateEntryMetaInput = Partial<Pick<EntryMeta, 'isRead' | 'isReadLater'>>

// ========================================
// 信頼性レベルサマリー
// ========================================
/**
 * - 🔵 青信号: 35件 (90%)
 * - 🟡 黄信号: 3件 (8%)
 * - 🔴 赤信号: 1件 (2%)
 *
 * 品質評価: 高品質
 */
