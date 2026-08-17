/**
 * Entry（フィードから取り込んだ記事）のエンティティ定義。
 *
 * コアドメインの型なので、機能モジュール（src/features/）の型を参照しない。
 * タグ関連の型も Prisma 生成型から直接導出し、tag-management 側の型に依存させない。
 */

import {
  Entry as EntryModel,
  Feed as FeedModel,
  EntryMeta as EntryMetaModel,
  Tag as TagModel,
  EntryTag as EntryTagModel,
} from '@/generated/prisma/client'

// ========================================
// エンティティ
// ========================================

export type Entry = EntryModel

/** 記事に添えて表示する最小限のフィード情報 */
type EntryFeed = Pick<FeedModel, 'id' | 'title'>

/** 記事ごとの既読 / あとで読む状態。Entry と 1:1 */
export type EntryMeta = EntryMetaModel

/** Entry と Tag の関連（中間テーブル） */
export type TagOnEntry = EntryTagModel & {
  tag: TagModel
}

/** エントリー一覧表示用（軽量版） */
export interface EntryListItem
  extends Pick<Entry, 'id' | 'title' | 'link' | 'imageUrl' | 'publishedAt' | 'createdAt'> {
  feed: EntryFeed
  meta: EntryMeta | null
}

/** 記事モーダル用（詳細） */
export interface EntryDetail extends Entry {
  feed: EntryFeed
  meta: EntryMeta | null
  tags: TagOnEntry[]
}

// ========================================
// 一覧の絞り込み・ページング
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

/** 一覧取得の全パラメータ（絞り込み + 位置） */
export type GetEntriesQuery = EntryListQuery & EntryPageParams

// ========================================
// RSS 取り込み
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
// 永続化の入力型
// ========================================

export type CreateEntryInput = Omit<Entry, 'id' | 'createdAt' | 'updatedAt'>

export type UpdateEntryMetaInput = Partial<Pick<EntryMeta, 'isRead' | 'isReadLater'>>
