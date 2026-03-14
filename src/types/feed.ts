/**
 * RSSシードの登録 型定義
 */

// ========================================
// エンティティ定義
// ========================================

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

export interface FeedListItem {
  id: string
  title: string
  url: string
  faviconUrl: string | null
  createdAt: Date
  updatedAt: Date
}

// ========================================
// APIリクエスト/レスポンス
// ========================================

export interface CreateFeedRequest {
  url: string
}

export interface UpdateFeedRequest {
  title?: string
  description?: string | null
  memo?: string | null
}

export interface CreateFeedResponse {
  success: true
  data: Feed
}

export interface GetFeedsResponse {
  success: true
  data: FeedListItem[]
}

export interface GetFeedResponse {
  success: true
  data: Feed
}

export interface UpdateFeedResponse {
  success: true
  data: Feed
}

export interface DeleteFeedResponse {
  success: true
}

export interface ErrorResponse {
  success: false
  error: {
    code: ErrorCode
    message: string
  }
}

// ========================================
// エラーコード
// ========================================

export type ErrorCode =
  | 'FEED_ALREADY_EXISTS'
  | 'FEED_NOT_FOUND'
  | 'INVALID_URL_FORMAT'
  | 'URL_NOT_ALLOWED'
  | 'FEED_FETCH_FAILED'
  | 'INVALID_FEED_FORMAT'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_SERVER_ERROR'

// ========================================
// フォーム状態
// ========================================

export interface FeedFormState {
  isSubmitting: boolean
  error: string | null
  success: boolean
}

// ========================================
// RSSフェッチャー内部型
// ========================================

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

// ========================================
// Prisma関連の入力型
// ========================================

export type CreateFeedInput = Omit<Feed, 'id' | 'createdAt' | 'updatedAt'>

export type UpdateFeedInput = Partial<
  Pick<Feed, 'title' | 'description' | 'memo' | 'lastFetchedAt'>
>
