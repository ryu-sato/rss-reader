/**
 * RSSエントリー閲覧 型定義
 *
 * 関連設計: docs/design/rss-entry-view/interfaces.ts
 * 既存型定義: src/types/feed.ts（Feed, ErrorResponse等）
 */

// ========================================
// エンティティ定義
// ========================================

export interface Entry {
  id: string
  feedId: string
  guid: string
  title: string
  link: string
  description: string | null
  content: string | null
  imageUrl: string | null
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/** エントリー一覧表示用（軽量版） */
export interface EntryListItem {
  id: string
  title: string
  link: string
  imageUrl: string | null
  publishedAt: Date | null
  createdAt: Date
  feed: {
    id: string
    title: string
  }
  meta: EntryMeta | null
  tags: TagOnEntry[]
}

/** エントリーモーダル用（詳細） */
export interface EntryDetail extends Entry {
  feed: {
    id: string
    title: string
  }
  meta: EntryMeta | null
  tags: TagOnEntry[]
}

export interface EntryMeta {
  id: string
  entryId: string
  isRead: boolean
  isReadLater: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Tag {
  id: string
  name: string
  createdAt: Date
}

/** エントリーとタグの関連（中間テーブル） */
export interface TagOnEntry {
  entryId: string
  tagId: string
  tag: Tag
}

// ========================================
// APIリクエスト/レスポンス
// ========================================

/** エントリー一覧取得リクエスト（クエリパラメータ） */
export interface GetEntriesQuery {
  feedId?: string
  tagId?: string
  page?: number
  limit?: number
  afterId?: string
  beforeId?: string
  isReadLater?: boolean
  isUnread?: boolean
}

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

export interface UpdateEntryMetaRequest {
  isRead?: boolean
  isReadLater?: boolean
}

export interface UpdateEntryMetaResponse {
  success: true
  data: EntryMeta
}

export interface CreateTagRequest {
  name: string
  entryId: string
}

export interface CreateTagResponse {
  success: true
  data: Tag
}

export interface GetTagsResponse {
  success: true
  data: Tag[]
}

// ========================================
// エラーコード
// ========================================

export type EntryErrorCode =
  | 'ENTRY_NOT_FOUND'
  | 'TAG_NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_SERVER_ERROR'

// ========================================
// フェッチャー内部型
// ========================================

/** RSS エントリーフェッチャーが返すデータ */
export interface FetchedEntryData {
  guid: string
  title: string
  link: string
  description: string | null
  content: string | null
  imageUrl: string | null
  publishedAt: Date | null
}

// ========================================
// Prisma 入力型
// ========================================

export type CreateEntryInput = Omit<Entry, 'id' | 'createdAt' | 'updatedAt'>

export type UpdateEntryMetaInput = Partial<Pick<EntryMeta, 'isRead' | 'isReadLater'>>
