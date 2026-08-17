/**
 * エントリー閲覧機能の API レスポンス型定義。
 *
 * エンティティと一覧クエリの型はコアドメイン（@/domain/entry/entry）が持つ。
 */

import type { EntryListItem, EntryDetail } from '@/domain/entry/entry'

export interface GetEntriesResponse {
  success: true
  data: EntryListItem[]
  pagination: {
    page: number
    limit: number
    total: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface GetEntryResponse {
  success: true
  data: EntryDetail
}

export type EntryErrorCode =
  | 'ENTRY_NOT_FOUND'
  | 'TAG_NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_SERVER_ERROR'
