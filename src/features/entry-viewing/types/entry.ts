/**
 * RSSエントリー閲覧 型定義
 */

// ========================================
// エンティティ定義
// ========================================
import {
  Entry as EntryModel,
  Feed as FeedModel,
  EntryMeta as EntryMetaModel,
  Tag as TagModel,
  EntryTag as EntryTagModel,
} from '@/generated/prisma/client'

export type Entry = EntryModel

type Feed = Pick<FeedModel, 'id' | 'title'>;

/** エントリー一覧表示用（軽量版） */
export interface EntryListItem extends Pick<Entry, 'id' | 'title' | 'link' | 'imageUrl' | 'publishedAt' | 'createdAt'> {
  feed: Feed
  meta: EntryMeta | null
}

/** エントリーモーダル用（詳細） */
export interface EntryDetail extends Entry {
  feed: Feed
  meta: EntryMeta | null
  tags: TagOnEntry[]
}

export type EntryMeta = EntryMetaModel;

export type Tag = TagModel;

/** タグとその使用回数（付与されているエントリー数） */
export type TagWithCount = Tag & { entryCount: number }

/** エントリーとタグの関連（中間テーブル） */
export type TagOnEntry = EntryTagModel & {
  tag: Tag
}

// ========================================
// APIリクエスト/レスポンス
// ========================================

export type SortOrder = 'asc' | 'desc'

/**
 * 記事一覧の絞り込み条件。
 *
 * 初回取得（サーバコンポーネント）・追加読み込み（EntryCardGrid）・`/api/entries` の
 * 3 者がこの 1 つの記述子だけを受け渡す。条件を個別の prop に分解して渡すと、
 * 渡し忘れた条件だけが追加読み込みで欠落する（例: sortOrder の渡し忘れで、
 * 古い順の一覧なのに追加分だけ新しい順で取得され、既出の記事しか返らず停止する）。
 */
export interface EntryListQuery {
  feedId?: string
  tagId?: string
  search?: string
  isReadLater?: boolean
  isUnread?: boolean
  userPreferenceId?: string
  isAnyPreferred?: boolean
  sortOrder?: SortOrder
  scoreThreshold?: number
}

/** 記事一覧のどの位置を取るか（オフセット指定 or カーソル指定） */
export interface EntryPageParams {
  page?: number
  limit?: number
  afterId?: string
  beforeId?: string
}

/** エントリー一覧取得リクエスト（クエリパラメータ） */
export type GetEntriesQuery = EntryListQuery & EntryPageParams

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
  data: TagWithCount[]
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
