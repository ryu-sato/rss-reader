import type { EntryListQuery, EntryPageParams, SortOrder } from '@/features/entry-viewing/types/entry'

/**
 * 記事一覧クエリのシリアライズ／パース（UI コアロジック層）。
 *
 * 一覧を出す画面（`/`, `/read-later`, `/preferred/all`, `/preferred/[preferenceId]`）と
 * 追加読み込み、`/api/entries` は、すべてここを通して EntryListQuery をやり取りする。
 * 条件ごとに `if (x) params.set(...)` を書き並べると 1 つ書き忘れたときにその条件だけが
 * 静かに欠落するため、シリアライズはキーを列挙せず値の形だけで判断する。
 */

export const ENTRIES_ENDPOINT = '/api/entries'

/** 記事一覧 API に渡すクエリ文字列を組み立てる（クライアント側の唯一のシリアライザ） */
export function buildEntriesSearchParams(
  query: EntryListQuery,
  pageParams: EntryPageParams = {}
): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries({ ...query, ...pageParams })) {
    // false / undefined / 空文字は「条件なし」を意味するので送らない
    if (value === undefined || value === null || value === false || value === '') continue
    params.set(key, String(value))
  }
  return params
}

export function buildEntriesRequestUrl(query: EntryListQuery, pageParams: EntryPageParams = {}): string {
  return `${ENTRIES_ENDPOINT}?${buildEntriesSearchParams(query, pageParams).toString()}`
}

/** URL の sortOrder を解釈する。既定は新しい順（desc） */
export function parseSortOrder(value: string | null | undefined): SortOrder {
  return value === 'asc' ? 'asc' : 'desc'
}

/** 記事一覧 API のクエリ文字列を EntryListQuery に戻す（サーバ側の唯一のパーサ） */
export function parseEntryListQuery(searchParams: URLSearchParams): EntryListQuery {
  return {
    feedId: parseString(searchParams, 'feedId'),
    tagId: parseString(searchParams, 'tagId'),
    search: parseString(searchParams, 'search'),
    isReadLater: parseBoolean(searchParams, 'isReadLater'),
    isUnread: parseBoolean(searchParams, 'isUnread'),
    userPreferenceId: parseString(searchParams, 'userPreferenceId'),
    isAnyPreferred: parseBoolean(searchParams, 'isAnyPreferred'),
    sortOrder: parseSortOrder(searchParams.get('sortOrder')),
    scoreThreshold: parseNumber(searchParams, 'scoreThreshold'),
  }
}

/** 記事一覧 API のページ位置パラメータを取り出す */
export function parseEntryPageParams(searchParams: URLSearchParams): EntryPageParams {
  return {
    page: parseNumber(searchParams, 'page'),
    limit: parseNumber(searchParams, 'limit'),
    afterId: parseString(searchParams, 'afterId'),
    beforeId: parseString(searchParams, 'beforeId'),
  }
}

function parseString(searchParams: URLSearchParams, key: string): string | undefined {
  return searchParams.get(key) || undefined
}

function parseBoolean(searchParams: URLSearchParams, key: string): boolean | undefined {
  return searchParams.get(key) === 'true' ? true : undefined
}

// NaN を渡すと Prisma のフィルタが壊れるため、数値として読めない値は「指定なし」に倒す
function parseNumber(searchParams: URLSearchParams, key: string): number | undefined {
  const raw = searchParams.get(key)
  if (raw === null || raw === '') return undefined
  const value = Number(raw)
  return Number.isFinite(value) ? value : undefined
}
