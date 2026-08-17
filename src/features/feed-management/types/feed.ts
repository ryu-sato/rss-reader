/**
 * フィード管理機能の API リクエスト/レスポンスとフォーム状態の型定義。
 *
 * エンティティそのものはコアドメイン（@/domain/feed/feed）が持つ。
 */

import type { ErrorCode } from '@/domain/shared/errors'
import type { Feed, FeedListItem } from '@/domain/feed/feed'

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
// フォーム状態
// ========================================

export interface FeedFormState {
  isSubmitting: boolean
  error: string | null
  success: boolean
}
