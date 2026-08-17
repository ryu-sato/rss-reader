/**
 * Feed（購読対象の RSS/Atom フィード）のエンティティ定義。
 *
 * コアドメインの型なので、機能モジュール（src/features/）の型を参照しない。
 * 画面やAPIのリクエスト/レスポンス形状は features/feed-management/types/feed.ts に置く。
 */

// ========================================
// エンティティ
// ========================================

/** 購読中のフィード。同一性は url が決める（url は一意） */
export interface Feed {
  id: string
  url: string
  title: string
  description: string | null
  faviconUrl: string | null
  memo: string | null
  createdAt: Date
  updatedAt: Date
  lastFetchedAt: Date | null
}

/** フィード一覧表示用（未読件数と最新記事日時を含む） */
export interface FeedListItem {
  id: string
  title: string
  url: string
  faviconUrl: string | null
  unreadCount: number
  createdAt: Date
  updatedAt: Date
  lastPublishedAt: Date | null
}

// ========================================
// 永続化の入力型
// ========================================

export type CreateFeedInput = Omit<Feed, 'id' | 'createdAt' | 'updatedAt'>

export type UpdateFeedInput = Partial<
  Pick<Feed, 'title' | 'description' | 'memo' | 'lastFetchedAt'>
>

// ========================================
// RSS 取り込み
// ========================================

/** RSS/Atom のフィードヘッダから読み取ったメタデータ */
export interface FetchedFeedInfo {
  title: string
  description: string | null
  faviconUrl: string | null
  lastFetchedAt: Date
}

export interface SSRFValidationResult {
  isAllowed: boolean
  reason?: string
}
